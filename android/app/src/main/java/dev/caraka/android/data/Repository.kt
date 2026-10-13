package dev.caraka.android.data

import kotlinx.coroutines.flow.StateFlow
import java.io.File

enum class Connectivity { Connecting, Connected, Reconnecting }

enum class Phase { Booting, Unpaired, Ready }

enum class Notice { SignedOut }

data class AppUi(
    val phase: Phase = Phase.Booting,
    val language: String? = null,
    val device: DeviceInfo? = null,
    val origin: String? = null,
    val workspaces: List<Workspace> = emptyList(),
    val rooms: List<Room> = emptyList(),
    val messages: List<Message> = emptyList(),
    val connectivity: Connectivity = Connectivity.Connecting,
    val notice: Notice? = null,
    /** True while the sample data is shown. */
    val demo: Boolean = false,
)

sealed interface PairResult {
    data object Success : PairResult
    data object Insecure : PairResult
    data object Invalid : PairResult
    data object Rejected : PairResult
    data object Unreachable : PairResult
}

/** Everything the screens need. The prod build backs it with the web API, the demo build with sample data. */
interface CarakaRepository {
    val ui: StateFlow<AppUi>

    /** Loads the saved session and the first state. */
    suspend fun boot()

    /** True while the app is in front. The event stream runs only then. */
    fun setForeground(active: Boolean)

    suspend fun pair(origin: String, code: String): PairResult
    suspend fun sendMessage(message: OutgoingMessage): MessageResult
    suspend fun pressButton(messageId: String, buttonId: String)
    suspend fun stopRoom(roomId: String)
    suspend fun upload(file: FileSource): Attachment
    suspend fun fetchFile(attachment: Attachment): File
    suspend fun devices(): List<PairedDevice>
    suspend fun revokeDevice(id: String)

    /** Switches to local sample data. No network call follows. */
    fun enterDemo()

    /** Leaves the sample data and returns to the connect screen. */
    fun exitDemo()

    /** Revokes this device, then wipes every local trace. */
    suspend fun logout()
}
