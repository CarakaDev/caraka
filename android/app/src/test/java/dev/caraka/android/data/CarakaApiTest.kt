package dev.caraka.android.data

import kotlinx.coroutines.runBlocking
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import java.io.ByteArrayInputStream
import java.io.File

class CarakaApiTest {
    private lateinit var server: MockWebServer
    private lateinit var origin: String
    private lateinit var store: MemorySessionStore
    private lateinit var session: ClientSession
    private var signedOut = 0
    private lateinit var api: CarakaApi

    @Before fun setUp() {
        server = MockWebServer()
        server.start()
        origin = server.url("/").toString().trimEnd('/')
        store = MemorySessionStore()
        session = ClientSession(store)
        signedOut = 0
        api = CarakaApi(session, buildHttpClient(session), onSignedOut = { signedOut++ }, retryDelayMillis = 1)
    }

    @After fun tearDown() {
        server.close()
    }

    private fun paired() {
        session.save(origin, "tok123")
    }

    private fun json(code: Int, body: String) =
        MockResponse.Builder().code(code).addHeader("content-type", "application/json").body(body).build()

    @Test fun pairSendsExactOriginAndStoresCookie(): Unit = runBlocking {
        server.enqueue(
            MockResponse.Builder().code(200)
                .addHeader("set-cookie", "caraka_device=secretvalue; Path=/; HttpOnly; SameSite=Strict")
                .body("""{"device":{"id":"d1","name":"Pixel"}}""").build(),
        )
        val device = api.pair(origin, "CODE1234", "Pixel")
        val req = server.takeRequest()
        assertEquals("POST", req.method)
        assertEquals("/api/pair", req.url.encodedPath)
        assertEquals(origin, req.headers["Origin"])
        assertTrue(req.body!!.utf8().contains("\"code\":\"CODE1234\""))
        assertEquals("d1", device.id)
        assertEquals(origin, store.origin())
        assertEquals("secretvalue", store.cookie())
    }

    @Test fun pairRejectedKeepsStoreEmpty(): Unit = runBlocking {
        server.enqueue(json(401, """{"error":"pairing"}"""))
        try {
            api.pair(origin, "bad", "Pixel")
            fail()
        } catch (e: ApiException) {
            assertEquals(401, e.status)
        }
        assertNull(store.cookie())
        assertEquals(0, signedOut)
    }

    @Test fun getSendsCookieButNoOrigin(): Unit = runBlocking {
        paired()
        server.enqueue(json(200, """{"device":{"id":"d1","name":"Pixel"},"language":"id","rooms":[],"messages":[],"workspaces":[]}"""))
        val state = api.state()
        val req = server.takeRequest()
        assertEquals("caraka_device=tok123", req.headers["Cookie"])
        assertNull(req.headers["Origin"])
        assertEquals("id", state.language)
    }

    @Test fun stateReadsRoomsMessagesAndUnknownFields(): Unit = runBlocking {
        paired()
        server.enqueue(
            json(
                200,
                """{"device":{"id":"d","name":"n"},"language":"en","extra":1,
                "workspaces":[{"slug":"caraka","path":"/p","agent":"claude"}],
                "rooms":[{"id":"r1","workspace":"caraka","createdAt":5,"sessionId":null,"title":null,"state":"running","agent":null}],
                "messages":[{"id":"m1","roomId":"r1","role":"assistant","text":"hi",
                  "buttons":[{"id":"b","text":"Allow","data":"b"}],
                  "attachments":[{"id":"f","name":"a.png","mime":"image/png"}],"createdAt":9}],
                "connection":{"state":"connected","origin":"x"},"push":{"available":false,"message":"m"}}""",
            ),
        )
        val s = api.state()
        assertEquals("running", s.rooms.single().state)
        assertNull(s.rooms.single().title)
        assertEquals("Allow", s.messages.single().buttons.single().text)
        assertEquals("image/png", s.messages.single().attachments.single().mime)
    }

    @Test fun postsCarryExactOriginAndCookie(): Unit = runBlocking {
        paired()
        server.enqueue(json(202, "{}"))
        api.stop("r1")
        val req = server.takeRequest()
        assertEquals(origin, req.headers["Origin"])
        assertEquals("caraka_device=tok123", req.headers["Cookie"])
        assertEquals("""{"roomId":"r1"}""", req.body!!.utf8())
    }

    @Test fun unauthorizedClearsSessionAndSignalsOnce(): Unit = runBlocking {
        paired()
        server.enqueue(json(401, """{"error":"authentication"}"""))
        try {
            api.state()
            fail()
        } catch (e: ApiException) {
            assertEquals(401, e.status)
        }
        assertEquals(1, signedOut)
        assertNull(store.cookie())
        assertNull(store.origin())
        assertFalse(session.isPaired)
    }

    @Test fun callbackConflictSurfacesAs409(): Unit = runBlocking {
        paired()
        server.enqueue(json(409, "{}"))
        try {
            api.callback("m1", "b1")
            fail()
        } catch (e: ApiException) {
            assertEquals(409, e.status)
        }
        val req = server.takeRequest()
        assertEquals("""{"messageId":"m1","buttonId":"b1"}""", req.body!!.utf8())
        assertEquals(0, signedOut)
    }

    @Test fun callbackAcceptedIs202(): Unit = runBlocking {
        paired()
        server.enqueue(json(202, "{}"))
        api.callback("m1", "b1")
        assertEquals("/api/callback", server.takeRequest().url.encodedPath)
    }

    @Test fun messageRetryKeepsSameClientId(): Unit = runBlocking {
        paired()
        server.enqueue(MockResponse.Builder().onResponseStart(mockwebserver3.SocketEffect.CloseSocket()).build())
        server.enqueue(json(202, """{"roomId":"r9","replay":false}"""))
        val result = api.sendMessage(OutgoingMessage(clientId = "cid-1", text = "hello", workspace = "caraka"))
        assertEquals("r9", result.roomId)
        val first = server.takeRequest().body!!.utf8()
        val second = server.takeRequest().body!!.utf8()
        assertTrue(first.contains("\"clientId\":\"cid-1\""))
        assertTrue(second.contains("\"clientId\":\"cid-1\""))
        assertTrue(second.contains("\"workspace\":\"caraka\""))
        assertFalse(second.contains("roomId"))
    }

    @Test fun messageToExistingRoomSendsRoomIdAndFiles(): Unit = runBlocking {
        paired()
        server.enqueue(json(200, """{"roomId":"r1","replay":true}"""))
        val result = api.sendMessage(OutgoingMessage("c", "t", roomId = "r1", files = listOf("f1", "f2")))
        assertTrue(result.replay)
        val body = server.takeRequest().body!!.utf8()
        assertTrue(body.contains("\"roomId\":\"r1\""))
        assertTrue(body.contains("\"files\":[\"f1\",\"f2\"]"))
    }

    @Test fun uploadOverTwentyMiBIsRefusedBeforeSending(): Unit = runBlocking {
        paired()
        val big = FileSource("big.bin", "application/octet-stream", MAX_UPLOAD_BYTES + 1) { ByteArrayInputStream(ByteArray(0)) }
        try {
            api.upload(big)
            fail()
        } catch (_: FileTooLargeException) {
        }
        assertEquals(0, server.requestCount)
    }

    @Test fun uploadSendsRawBytesWithNameAndMime(): Unit = runBlocking {
        paired()
        server.enqueue(json(201, """{"id":"abc","name":"note.md"}"""))
        val bytes = "# hi".toByteArray()
        val r = api.upload(FileSource("note.md", "text/markdown", bytes.size.toLong()) { ByteArrayInputStream(bytes) })
        assertEquals("abc", r.id)
        val req = server.takeRequest()
        assertEquals("/api/files", req.url.encodedPath)
        assertEquals("note.md", req.url.queryParameter("name"))
        assertEquals("text/markdown", req.headers["Content-Type"]!!.substringBefore(';'))
        assertEquals(origin, req.headers["Origin"])
        assertEquals("# hi", req.body!!.utf8())
    }

    @Test fun uploadWithUnknownSizeStopsAtLimit(): Unit = runBlocking {
        paired()
        val endless = object : java.io.InputStream() {
            override fun read() = 1
            override fun read(b: ByteArray, off: Int, len: Int): Int = len
        }
        try {
            api.upload(FileSource("x.bin", "application/octet-stream", -1) { endless })
            fail()
        } catch (_: FileTooLargeException) {
        } catch (_: java.io.IOException) {
            // The server connection may fail while the body stops. Both end the upload.
        }
    }

    @Test fun downloadUsesFileRouteWithCookie(): Unit = runBlocking {
        paired()
        server.enqueue(MockResponse.Builder().code(200).body("PNGDATA").build())
        val dir = java.nio.file.Files.createTempDirectory("dl").toFile()
        val target = File(dir, "a.png")
        api.download("fid 1", target)
        assertEquals("PNGDATA", target.readText())
        val req = server.takeRequest()
        assertEquals("/api/files/fid%201", req.url.encodedPath)
        assertEquals("caraka_device=tok123", req.headers["Cookie"])
        assertFalse(File(dir, "a.png.part").exists())
        dir.deleteRecursively()
    }

    @Test fun cookieIsNotSentToAnotherHost(): Unit = runBlocking {
        paired()
        val other = MockWebServer()
        other.start()
        // Same IP, other port: a different origin.
        val request = okhttp3.Request.Builder().url(other.url("/x")).build()
        val client = buildHttpClient(session)
        server.enqueue(json(200, "{}"))
        other.enqueue(MockResponse.Builder().code(200).build())
        client.newCall(request).execute().close()
        assertNull(other.takeRequest().headers["Cookie"])
        other.close()
    }

    @Test fun devicesAndRevoke(): Unit = runBlocking {
        paired()
        server.enqueue(json(200, """{"devices":[{"id":"a","name":"Pixel","createdAt":1},{"id":"b","name":"Laptop","createdAt":2}]}"""))
        server.enqueue(json(200, "{}"))
        assertEquals(2, api.devices().size)
        api.revoke("b")
        server.takeRequest()
        val req = server.takeRequest()
        assertEquals("DELETE", req.method)
        assertEquals("/api/devices/b", req.url.encodedPath)
        assertEquals(origin, req.headers["Origin"])
    }

    @Test fun logoutPostsToLogout(): Unit = runBlocking {
        paired()
        server.enqueue(json(200, "{}"))
        api.logout()
        val req = server.takeRequest()
        assertEquals("/api/logout", req.url.encodedPath)
        assertEquals(origin, req.headers["Origin"])
    }

    @Test fun sseReadsReadyThenInvalidate(): Unit = runBlocking {
        paired()
        server.enqueue(
            MockResponse.Builder().code(200).addHeader("content-type", "text/event-stream")
                .body("event: ready\ndata: {}\n\nevent: invalidate\ndata: {}\n\n").build(),
        )
        val seen = mutableListOf<SseEvent>()
        try {
            api.events().collect { seen += it }
        } catch (_: Exception) {
        }
        assertEquals(listOf(SseEvent.Ready, SseEvent.Invalidate), seen)
        assertEquals("caraka_device=tok123", server.takeRequest().headers["Cookie"])
    }

    @Test fun sse401SignsOut(): Unit = runBlocking {
        paired()
        server.enqueue(json(401, """{"error":"authentication"}"""))
        try {
            api.events().collect { }
        } catch (_: Exception) {
        }
        assertEquals(1, signedOut)
        assertFalse(session.isPaired)
    }

    @Test fun safeNameKeepsFileNamesPlain() {
        assertEquals("a_b.png", safeName("a b.png"))
        assertEquals("file", safeName(""))
    }
}
