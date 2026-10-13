package dev.caraka.android.data

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import java.io.File

/**
 * Sends every call to the real repository, or to a demo repository after enterDemo().
 * While the demo is active, the real repository receives no call at all.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class ModeRepository(
    private val real: CarakaRepository,
    private val newDemo: () -> CarakaRepository,
    scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Default),
) : CarakaRepository {
    private val active = MutableStateFlow(real)
    private var foreground = false

    override val ui: StateFlow<AppUi> =
        active.flatMapLatest { it.ui }.stateIn(scope, SharingStarted.Eagerly, real.ui.value)

    private val current get() = active.value

    override suspend fun boot() = real.boot()

    override fun setForeground(active: Boolean) {
        foreground = active
        current.setForeground(active)
    }

    @Synchronized
    override fun enterDemo() {
        if (current !== real) return
        real.setForeground(false)
        val demo = newDemo()
        demo.setForeground(foreground)
        active.value = demo
    }

    @Synchronized
    override fun exitDemo() {
        val demo = current
        if (demo === real) return
        demo.exitDemo()
        active.value = real
        real.setForeground(foreground)
    }

    override suspend fun pair(origin: String, code: String) = current.pair(origin, code)
    override suspend fun sendMessage(message: OutgoingMessage) = current.sendMessage(message)
    override suspend fun pressButton(messageId: String, buttonId: String) = current.pressButton(messageId, buttonId)
    override suspend fun stopRoom(roomId: String) = current.stopRoom(roomId)
    override suspend fun upload(file: FileSource) = current.upload(file)
    override suspend fun fetchFile(attachment: Attachment): File = current.fetchFile(attachment)
    override suspend fun devices() = current.devices()
    override suspend fun revokeDevice(id: String) = current.revokeDevice(id)

    /** In demo mode, "disconnect" only leaves the demo. */
    override suspend fun logout() {
        if (current === real) real.logout() else exitDemo()
    }
}
