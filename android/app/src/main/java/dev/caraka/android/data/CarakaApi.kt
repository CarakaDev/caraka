package dev.caraka.android.data

import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Cookie
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.MediaType
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.sse.EventSource
import okhttp3.sse.EventSourceListener
import okhttp3.sse.EventSources
import okio.BufferedSink
import okio.buffer
import okio.sink
import java.io.File
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

const val DEVICE_COOKIE = "caraka_device"
const val MAX_UPLOAD_BYTES: Long = 20L * 1024 * 1024

/** The server answered with a status the call did not accept. */
class ApiException(val status: Int) : Exception("HTTP $status")

/** The file is over the upload limit. Nothing was sent. */
class FileTooLargeException : IOException("File is over the upload limit")

sealed interface SseEvent {
    data object Ready : SseEvent
    data object Invalidate : SseEvent
}

/** Holds the origin and the cookie in memory and mirrors them to the secure store. */
class ClientSession(private val store: SessionStore) {
    @Volatile var origin: String? = null
        private set

    @Volatile var cookie: String? = null
        private set

    fun load() {
        origin = store.origin()
        cookie = store.cookie()
    }

    fun save(origin: String, cookie: String) {
        this.origin = origin
        this.cookie = cookie
        store.save(origin, cookie)
    }

    fun clear() {
        origin = null
        cookie = null
        store.clear()
    }

    val isPaired: Boolean get() = origin != null && cookie != null
}

/** Adds the device cookie and the exact Origin header, for the paired machine only. */
class SessionInterceptor(private val session: ClientSession) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val origin = session.origin
        val base = origin?.toHttpUrlOrNull()
        if (origin == null || base == null || !sameHost(request.url, base)) return chain.proceed(request)
        val builder = request.newBuilder()
        session.cookie?.let { builder.header("Cookie", "$DEVICE_COOKIE=$it") }
        if (request.method != "GET" && request.method != "HEAD" && request.header("Origin") == null) {
            builder.header("Origin", origin)
        }
        return chain.proceed(builder.build())
    }

    private fun sameHost(a: HttpUrl, b: HttpUrl) = a.scheme == b.scheme && a.host == b.host && a.port == b.port
}

object Backoff {
    /** 1 s, 2 s, 4 s ... capped at 30 s. */
    fun delayMillis(attempt: Int): Long = minOf(30_000L, 1_000L shl minOf(attempt.coerceAtLeast(0), 5))
}

fun buildHttpClient(session: ClientSession): OkHttpClient =
    OkHttpClient.Builder()
        .addInterceptor(SessionInterceptor(session))
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .followRedirects(false)
        .build()

private suspend fun Call.await(): Response = suspendCancellableCoroutine { continuation ->
    continuation.invokeOnCancellation { cancel() }
    enqueue(object : Callback {
        override fun onFailure(call: Call, e: IOException) {
            if (continuation.isActive) continuation.resumeWithException(e)
        }

        override fun onResponse(call: Call, response: Response) {
            if (continuation.isActive) continuation.resume(response) else response.close()
        }
    })
}

class CarakaApi(
    private val session: ClientSession,
    private val http: OkHttpClient,
    private val onSignedOut: () -> Unit = {},
    private val retryDelayMillis: Long = 600,
) {
    private val jsonType: MediaType = "application/json; charset=utf-8".toMediaTypeOrNull()!!

    private fun base(): HttpUrl = (session.origin ?: throw ApiException(401)).toHttpUrl()

    private fun url(vararg segments: String): HttpUrl =
        base().newBuilder().apply { segments.forEach { addPathSegments(it) } }.build()

    private fun json(body: kotlinx.serialization.json.JsonObject): RequestBody =
        body.toString().toRequestBody(jsonType)

    private suspend fun <T> exec(request: Request, expect: (Int) -> Boolean = { it in 200..299 }, parse: (Response) -> T): T {
        val response = http.newCall(request).await()
        response.use { r ->
            if (r.code == 401) {
                session.clear()
                onSignedOut()
                throw ApiException(401)
            }
            if (!expect(r.code)) throw ApiException(r.code)
            return parse(r)
        }
    }

    /** Sends the pairing code. On success the cookie and the origin go to the secure store. */
    suspend fun pair(origin: String, code: String, name: String): DeviceInfo {
        val target = "$origin/api/pair".toHttpUrl()
        val body = json(buildJsonObject {
            put("code", code)
            put("name", name)
        })
        val request = Request.Builder().url(target).header("Origin", origin).post(body).build()
        val response = http.newCall(request).await()
        response.use { r ->
            if (r.code != 200) throw ApiException(r.code)
            val cookie = Cookie.parseAll(target, r.headers)
                .firstOrNull { it.name == DEVICE_COOKIE && it.value.isNotEmpty() }
                ?: throw ApiException(0)
            val device = ApiJson.decodeFromString<PairResponse>(r.body.string()).device
            session.save(origin, cookie.value)
            return device
        }
    }

    suspend fun state(): ServerState =
        exec(Request.Builder().url(url("api/state")).get().build()) { ApiJson.decodeFromString<ServerState>(it.body.string()) }

    /** Retries only on network errors, and always with the same clientId. */
    suspend fun sendMessage(message: OutgoingMessage, attempts: Int = 3): MessageResult {
        var last: IOException? = null
        for (i in 0 until attempts) {
            try {
                return postMessage(message)
            } catch (e: IOException) {
                last = e
                if (i < attempts - 1) delay(retryDelayMillis * (i + 1))
            }
        }
        throw last ?: IOException("send failed")
    }

    private suspend fun postMessage(m: OutgoingMessage): MessageResult {
        val body = json(buildJsonObject {
            put("clientId", m.clientId)
            if (m.roomId != null) put("roomId", m.roomId)
            if (m.workspace != null) put("workspace", m.workspace)
            put("text", m.text)
            if (m.files.isNotEmpty()) put("files", JsonArray(m.files.map { JsonPrimitive(it) }))
        })
        val request = Request.Builder().url(url("api/messages")).post(body).build()
        return exec(request, expect = { it == 200 || it == 202 }) { ApiJson.decodeFromString<MessageResult>(it.body.string()) }
    }

    /** Answers a permission card. A 409 means the card is no longer live. */
    suspend fun callback(messageId: String, buttonId: String) {
        val body = json(buildJsonObject {
            put("messageId", messageId)
            put("buttonId", buttonId)
        })
        exec(Request.Builder().url(url("api/callback")).post(body).build(), expect = { it == 202 }) { }
    }

    suspend fun stop(roomId: String) {
        val body = json(buildJsonObject { put("roomId", roomId) })
        exec(Request.Builder().url(url("api/stop")).post(body).build(), expect = { it == 202 }) { }
    }

    /** Uploads one file. Throws [FileTooLargeException] before any byte leaves the phone. */
    suspend fun upload(file: FileSource): UploadResult {
        if (file.size > MAX_UPLOAD_BYTES) throw FileTooLargeException()
        val type = file.mime.toMediaTypeOrNull() ?: "application/octet-stream".toMediaTypeOrNull()
        val body = object : RequestBody() {
            override fun contentType() = type
            override fun contentLength() = file.size
            override fun writeTo(sink: BufferedSink) {
                file.open().use { input ->
                    val buffer = ByteArray(16 * 1024)
                    var total = 0L
                    while (true) {
                        val n = input.read(buffer)
                        if (n < 0) break
                        total += n
                        if (total > MAX_UPLOAD_BYTES) throw FileTooLargeException()
                        sink.write(buffer, 0, n)
                    }
                }
            }
        }
        val target = base().newBuilder().addPathSegments("api/files").addQueryParameter("name", file.name).build()
        return exec(Request.Builder().url(target).post(body).build(), expect = { it == 201 || it == 200 }) {
            ApiJson.decodeFromString<UploadResult>(it.body.string())
        }
    }

    /** Downloads through the authenticated file route. Nothing else fetches attachments. */
    suspend fun download(id: String, target: File) {
        val request = Request.Builder().url(base().newBuilder().addPathSegments("api/files").addPathSegment(id).build()).get().build()
        val part = File(target.parentFile, target.name + ".part")
        try {
            exec(request) { r ->
                part.sink().buffer().use { out -> out.writeAll(r.body.source()) }
            }
            if (!part.renameTo(target)) throw IOException("rename failed")
        } finally {
            part.delete()
        }
    }

    suspend fun devices(): List<PairedDevice> =
        exec(Request.Builder().url(url("api/devices")).get().build()) { ApiJson.decodeFromString<DevicesResponse>(it.body.string()).devices }

    suspend fun revoke(id: String) {
        val target = base().newBuilder().addPathSegments("api/devices").addPathSegment(id).build()
        exec(Request.Builder().url(target).delete().build()) { }
    }

    /** Revokes this device on the server. The caller wipes local data afterwards. */
    suspend fun logout() {
        val request = Request.Builder().url(url("api/logout")).post(json(buildJsonObject { })).build()
        exec(request) { }
    }

    /** One long-lived stream. It ends with an exception when the connection drops. */
    fun events(): Flow<SseEvent> = callbackFlow {
        val origin = session.origin
        if (origin == null) {
            close(ApiException(401))
            return@callbackFlow
        }
        val request = Request.Builder().url("$origin/api/events").header("Accept", "text/event-stream").build()
        val client = http.newBuilder().readTimeout(0, TimeUnit.MILLISECONDS).build()
        val source = EventSources.createFactory(client).newEventSource(request, object : EventSourceListener() {
            override fun onEvent(eventSource: EventSource, id: String?, type: String?, data: String) {
                when (type) {
                    "ready" -> trySend(SseEvent.Ready)
                    "invalidate" -> trySend(SseEvent.Invalidate)
                }
            }

            override fun onClosed(eventSource: EventSource) {
                close(IOException("closed"))
            }

            override fun onFailure(eventSource: EventSource, t: Throwable?, response: Response?) {
                if (response?.code == 401) {
                    session.clear()
                    onSignedOut()
                }
                close(t ?: ApiException(response?.code ?: 0))
            }
        })
        awaitClose { source.cancel() }
    }
}
