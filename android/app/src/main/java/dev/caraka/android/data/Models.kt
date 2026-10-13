package dev.caraka.android.data

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

val ApiJson = Json {
    ignoreUnknownKeys = true
    coerceInputValues = true
    explicitNulls = false
}

@Serializable
data class DeviceInfo(val id: String, val name: String)

@Serializable
data class Workspace(val slug: String, val path: String = "", val agent: String? = null)

@Serializable
data class Room(
    val id: String,
    val workspace: String,
    val createdAt: Long = 0,
    val sessionId: String? = null,
    val title: String? = null,
    val state: String? = null,
    val agent: String? = null,
)

@Serializable
data class Button(val id: String, val text: String, val data: String = "")

@Serializable
data class Attachment(val id: String, val name: String, val mime: String = "application/octet-stream")

@Serializable
data class Message(
    val id: String,
    val roomId: String,
    val role: String,
    val text: String = "",
    val buttons: List<Button> = emptyList(),
    val attachments: List<Attachment> = emptyList(),
    val createdAt: Long = 0,
)

@Serializable
data class ServerState(
    val device: DeviceInfo,
    val language: String = "en",
    val workspaces: List<Workspace> = emptyList(),
    val rooms: List<Room> = emptyList(),
    val messages: List<Message> = emptyList(),
)

@Serializable
data class PairedDevice(val id: String, val name: String, val createdAt: Long = 0)

@Serializable
data class DevicesResponse(val devices: List<PairedDevice> = emptyList())

@Serializable
data class MessageResult(val roomId: String, val replay: Boolean = false)

@Serializable
data class UploadResult(val id: String, val name: String)

@Serializable
data class PairResponse(val device: DeviceInfo)

data class OutgoingMessage(
    val clientId: String,
    val text: String,
    val roomId: String? = null,
    val workspace: String? = null,
    val files: List<String> = emptyList(),
)

/** A file the user picked. `size` is -1 when the provider does not say. */
class FileSource(
    val name: String,
    val mime: String,
    val size: Long,
    val open: () -> java.io.InputStream,
)
