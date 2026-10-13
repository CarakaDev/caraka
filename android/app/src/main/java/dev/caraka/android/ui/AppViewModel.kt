package dev.caraka.android.ui

import android.app.Application
import android.net.Uri
import android.provider.OpenableColumns
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import dev.caraka.android.CarakaApp
import dev.caraka.android.data.ApiException
import dev.caraka.android.data.Attachment
import dev.caraka.android.data.FileSource
import dev.caraka.android.data.FileTooLargeException
import dev.caraka.android.data.MAX_UPLOAD_BYTES
import dev.caraka.android.data.OutgoingMessage
import dev.caraka.android.data.Phase
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File
import java.util.UUID

sealed interface Screen {
    data object Rooms : Screen
    data class Chat(val roomId: String?, val workspace: String?) : Screen
    data class Viewer(val attachment: Attachment) : Screen
    data object Devices : Screen
}

enum class ComposerError { TooLarge, Busy, Failed, PickFailed }

class PendingFile(val name: String, val mime: String, val size: Long, val uri: Uri) {
    var uploaded: Attachment? = null
}

/** One unsent message. It lives in the ViewModel so a rotation does not lose it. */
class Draft {
    var text by mutableStateOf("")
        private set
    val files = mutableStateListOf<PendingFile>()
    var sending by mutableStateOf(false)
    var error by mutableStateOf<ComposerError?>(null)
    var clientId: String? = null

    fun edit(value: String) {
        text = value
        clientId = null
    }

    fun addFile(file: PendingFile) {
        files += file
        clientId = null
    }

    fun removeFile(file: PendingFile) {
        files -= file
        clientId = null
    }

    fun clear() {
        text = ""
        files.clear()
        clientId = null
    }
}

class AppViewModel(app: Application) : AndroidViewModel(app) {
    val repo = (app as CarakaApp).repository
    val ui = repo.ui

    private val _stack = MutableStateFlow<List<Screen>>(listOf(Screen.Rooms))
    val stack: StateFlow<List<Screen>> = _stack.asStateFlow()

    private val _splashDone = MutableStateFlow(false)
    val splashDone: StateFlow<Boolean> = _splashDone.asStateFlow()

    private val drafts = HashMap<String, Draft>()
    val expired = mutableStateListOf<String>()
    val decided = mutableStateListOf<String>()
    var actionError by mutableStateOf<ComposerError?>(null)

    init {
        viewModelScope.launch {
            launch {
                delay((SPLASH_SECONDS * 1000).toLong())
                _splashDone.value = true
            }
            repo.boot()
        }
        viewModelScope.launch {
            ui.collect { state ->
                if (state.phase == Phase.Unpaired) {
                    _stack.value = listOf(Screen.Rooms)
                    drafts.clear()
                    expired.clear()
                    decided.clear()
                }
            }
        }
    }

    fun draft(key: String): Draft = drafts.getOrPut(key) { Draft() }

    fun push(screen: Screen) {
        _stack.value = _stack.value + screen
    }

    fun replaceTop(screen: Screen) {
        _stack.value = _stack.value.dropLast(1) + screen
    }

    /** Pops one screen. Returns false at the root. */
    fun back(): Boolean {
        if (_stack.value.size <= 1) return false
        _stack.value = _stack.value.dropLast(1)
        return true
    }

    fun pick(key: String, uri: Uri) {
        val draft = draft(key)
        val resolver = getApplication<Application>().contentResolver
        try {
            var name = "file"
            var size = -1L
            resolver.query(uri, null, null, null, null)?.use { c ->
                if (c.moveToFirst()) {
                    val n = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    val s = c.getColumnIndex(OpenableColumns.SIZE)
                    if (n >= 0) name = c.getString(n) ?: name
                    if (s >= 0 && !c.isNull(s)) size = c.getLong(s)
                }
            }
            if (size > MAX_UPLOAD_BYTES) {
                draft.error = ComposerError.TooLarge
                return
            }
            draft.error = null
            draft.addFile(PendingFile(name, resolver.getType(uri) ?: "application/octet-stream", size, uri))
        } catch (_: Exception) {
            draft.error = ComposerError.PickFailed
        }
    }

    fun send(key: String, roomId: String?, workspace: String?) {
        val draft = draft(key)
        if (draft.sending) return
        val text = draft.text.trim()
        if (text.isEmpty() && draft.files.isEmpty()) return
        draft.sending = true
        draft.error = null
        val resolver = getApplication<Application>().contentResolver
        viewModelScope.launch {
            try {
                for (file in draft.files.toList()) {
                    if (file.uploaded == null) {
                        file.uploaded = repo.upload(
                            FileSource(file.name, file.mime, file.size) {
                                resolver.openInputStream(file.uri) ?: throw java.io.IOException("open failed")
                            },
                        )
                    }
                }
                val id = draft.clientId ?: UUID.randomUUID().toString().also { draft.clientId = it }
                val result = repo.sendMessage(
                    OutgoingMessage(
                        clientId = id,
                        text = text,
                        roomId = roomId,
                        workspace = if (roomId == null) workspace else null,
                        files = draft.files.mapNotNull { it.uploaded?.id },
                    ),
                )
                draft.clear()
                if (roomId == null) {
                    drafts.remove(key)
                    replaceTop(Screen.Chat(result.roomId, null))
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                draft.error = when {
                    e is FileTooLargeException || e.cause is FileTooLargeException -> ComposerError.TooLarge
                    e is ApiException && e.status == 429 -> ComposerError.Busy
                    else -> ComposerError.Failed
                }
            } finally {
                draft.sending = false
            }
        }
    }

    fun press(messageId: String, buttonId: String) {
        if (messageId in decided || messageId in expired) return
        decided += messageId
        viewModelScope.launch {
            try {
                repo.pressButton(messageId, buttonId)
            } catch (e: CancellationException) {
                throw e
            } catch (e: ApiException) {
                if (e.status == 409) expired += messageId else {
                    decided -= messageId
                    actionError = if (e.status == 429) ComposerError.Busy else ComposerError.Failed
                }
            } catch (_: Exception) {
                decided -= messageId
                actionError = ComposerError.Failed
            }
        }
    }

    fun stop(roomId: String) {
        viewModelScope.launch {
            try {
                repo.stopRoom(roomId)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                actionError = ComposerError.Failed
            }
        }
    }

    fun logout() {
        viewModelScope.launch { repo.logout() }
    }

    suspend fun file(att: Attachment): File? = try {
        repo.fetchFile(att)
    } catch (e: CancellationException) {
        throw e
    } catch (_: Exception) {
        null
    }
}
