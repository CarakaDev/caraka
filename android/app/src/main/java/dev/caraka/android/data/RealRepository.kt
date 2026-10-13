package dev.caraka.android.data

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.IOException

class RealRepository(
    store: SessionStore,
    private val filesDir: File,
    private val deviceName: String,
    private val allowCleartextDev: Boolean,
) : CarakaRepository {
    private val session = ClientSession(store)
    private val api = CarakaApi(session, buildHttpClient(session), onSignedOut = { signedOut() })
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val _ui = MutableStateFlow(AppUi())
    override val ui: StateFlow<AppUi> = _ui.asStateFlow()

    private val reload = Channel<Unit>(Channel.CONFLATED)
    private var streamJob: Job? = null
    private var foreground = false

    override suspend fun boot() {
        withContext(Dispatchers.IO) { session.load() }
        if (!session.isPaired) {
            _ui.update { it.copy(phase = Phase.Unpaired) }
            return
        }
        try {
            applyState(api.state())
        } catch (e: CancellationException) {
            throw e
        } catch (_: ApiException) {
            // A 401 already moved the app to the pairing screen.
            if (session.isPaired) enterReady()
        } catch (_: Exception) {
            enterReady()
        }
        syncStream()
    }

    private fun enterReady() {
        _ui.update { it.copy(phase = Phase.Ready, origin = session.origin, connectivity = Connectivity.Reconnecting) }
    }

    private fun applyState(s: ServerState) {
        _ui.update {
            it.copy(
                phase = Phase.Ready,
                language = s.language,
                device = s.device,
                origin = session.origin,
                workspaces = s.workspaces,
                rooms = s.rooms,
                messages = s.messages,
                notice = null,
            )
        }
    }

    private fun signedOut() {
        wipeFiles()
        _ui.value = AppUi(phase = Phase.Unpaired, notice = Notice.SignedOut)
        syncStream()
    }

    private fun wipeFiles() {
        filesDir.deleteRecursively()
    }

    override fun enterDemo() = Unit

    override fun exitDemo() = Unit

    @Synchronized
    override fun setForeground(active: Boolean) {
        foreground = active
        syncStream()
    }

    @Synchronized
    private fun syncStream() {
        val want = foreground && _ui.value.phase == Phase.Ready
        if (want && streamJob?.isActive != true) {
            streamJob = scope.launch { runStream() }
        } else if (!want) {
            streamJob?.cancel()
            streamJob = null
        }
    }

    private suspend fun runStream() {
        val loader = scope.launch {
            for (ignored in reload) {
                try {
                    applyState(api.state())
                } catch (e: CancellationException) {
                    throw e
                } catch (_: Exception) {
                }
                // At most one reload every 250 ms.
                delay(RELOAD_GAP_MS)
            }
        }
        try {
            var attempt = 0
            while (kotlinx.coroutines.currentCoroutineContext().isActive && session.isPaired) {
                _ui.update { it.copy(connectivity = if (attempt == 0) Connectivity.Connecting else Connectivity.Reconnecting) }
                try {
                    api.events().collect { event ->
                        when (event) {
                            SseEvent.Ready -> {
                                attempt = 0
                                _ui.update { it.copy(connectivity = Connectivity.Connected) }
                                reload.trySend(Unit)
                            }
                            SseEvent.Invalidate -> reload.trySend(Unit)
                        }
                    }
                } catch (e: CancellationException) {
                    throw e
                } catch (_: Exception) {
                }
                if (!session.isPaired) break
                _ui.update { it.copy(connectivity = Connectivity.Reconnecting) }
                delay(Backoff.delayMillis(attempt))
                attempt++
            }
        } finally {
            loader.cancel()
        }
    }


    override suspend fun pair(origin: String, code: String): PairResult {
        val checked = when (val c = Origins.check(origin, allowCleartextDev)) {
            is OriginCheck.Ok -> c.origin
            OriginCheck.Insecure -> return PairResult.Insecure
            OriginCheck.Invalid -> return PairResult.Invalid
        }
        if (code.isBlank()) return PairResult.Rejected
        return try {
            api.pair(checked, code.trim(), deviceName)
            try {
                applyState(api.state())
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                enterReady()
            }
            syncStream()
            PairResult.Success
        } catch (e: CancellationException) {
            throw e
        } catch (_: ApiException) {
            PairResult.Rejected
        } catch (_: IOException) {
            PairResult.Unreachable
        }
    }

    override suspend fun sendMessage(message: OutgoingMessage): MessageResult {
        val result = api.sendMessage(message)
        reload.trySend(Unit)
        return result
    }

    override suspend fun pressButton(messageId: String, buttonId: String) {
        api.callback(messageId, buttonId)
        reload.trySend(Unit)
    }

    override suspend fun stopRoom(roomId: String) {
        api.stop(roomId)
    }

    override suspend fun upload(file: FileSource): Attachment {
        val result = api.upload(file)
        return Attachment(result.id, result.name, file.mime)
    }

    override suspend fun fetchFile(attachment: Attachment): File = withContext(Dispatchers.IO) {
        filesDir.mkdirs()
        val target = File(filesDir, "${attachment.id.filter { it.isLetterOrDigit() }}_${safeName(attachment.name)}")
        if (!target.isFile || target.length() == 0L) api.download(attachment.id, target)
        target
    }

    override suspend fun devices(): List<PairedDevice> = api.devices()

    override suspend fun revokeDevice(id: String) {
        api.revoke(id)
    }

    override suspend fun logout() {
        try {
            api.logout()
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
        }
        withContext(Dispatchers.IO) {
            wipeFiles()
            session.clear()
        }
        _ui.value = AppUi(phase = Phase.Unpaired)
        syncStream()
    }

    private companion object {
        const val RELOAD_GAP_MS = 250L
    }
}

fun safeName(name: String): String =
    name.map { if (it.isLetterOrDigit() || it == '.' || it == '-' || it == '_') it else '_' }.joinToString("").take(80).ifEmpty { "file" }
