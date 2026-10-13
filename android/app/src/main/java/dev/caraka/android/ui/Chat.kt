package dev.caraka.android.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.keyframes
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import dev.caraka.android.R
import dev.caraka.android.data.AppUi
import dev.caraka.android.data.Attachment
import dev.caraka.android.data.Connectivity
import dev.caraka.android.data.Message
import dev.caraka.android.data.SessionStatus
import dev.caraka.android.ui.theme.Brand
import dev.caraka.android.ui.theme.JetBrainsMono
import dev.caraka.android.ui.theme.LocalReduceMotion
import dev.caraka.android.ui.theme.PublicSans
import kotlinx.coroutines.delay
import java.util.Locale

@Composable
fun ChatScreen(vm: AppViewModel, ui: AppUi, screen: Screen.Chat, locale: Locale) {
    val key = screen.roomId ?: "new:${screen.workspace}"
    val draft = vm.draft(key)
    val room = ui.rooms.firstOrNull { it.id == screen.roomId }
    val state = room?.state
    val messages = remember(ui.messages, screen.roomId) { ui.messages.filter { it.roomId == screen.roomId } }
    val connected = ui.connectivity == Connectivity.Connected
    val running = state == SessionStatus.RUNNING
    val lastAssistant = messages.lastOrNull { it.role == "assistant" }
    val lastLen = lastAssistant?.text?.length ?: 0

    // AC-4.1 and AC-4.2: typing dots after 1.5 s of silence, a caret while the text grows.
    var growing by remember { mutableStateOf(false) }
    var quiet by remember { mutableStateOf(false) }
    var seenLen by remember { mutableIntStateOf(-1) }
    var seenId by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(lastAssistant?.id, lastLen, running) {
        val grew = seenId == lastAssistant?.id && seenLen >= 0 && lastLen > seenLen
        seenId = lastAssistant?.id
        seenLen = lastLen
        quiet = false
        growing = running && grew
        if (!running) return@LaunchedEffect
        delay(1_500)
        growing = false
        quiet = true
    }
    val typing = running && quiet

    val listState = rememberLazyListState()
    val total = messages.size + if (typing) 1 else 0
    // The list opens at the newest message, also after the viewer closes.
    var opened by remember { mutableStateOf(false) }
    LaunchedEffect(total, lastLen) {
        if (total > 0) {
            val lastVisible = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
            if (!opened) {
                listState.scrollToItem(total - 1, scrollOffset = 1_000_000)
                opened = true
            } else if (lastVisible >= total - 3) {
                // A large offset is clamped to the end, so a tall last message shows its bottom.
                listState.animateScrollToItem(total - 1, scrollOffset = 1_000_000)
            }
        }
    }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetMultipleContents()) { uris ->
        uris.forEach { vm.pick(key, it) }
    }

    LaunchedEffect(vm.actionError) {
        if (vm.actionError != null) {
            delay(4_000)
            vm.actionError = null
        }
    }

    Column(Modifier.fillMaxSize().background(Brand.Bg).safeDrawingPadding()) {
        // Header
        Row(Modifier.fillMaxWidth().padding(end = 12.dp, top = 6.dp, bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            CkIconButton(Icons.AutoMirrored.Filled.ArrowBack, t(R.string.back), onClick = { vm.back() })
            Column(Modifier.weight(1f)) {
                Text(
                    room?.title?.takeIf { it.isNotBlank() } ?: (room?.workspace ?: screen.workspace.orEmpty()),
                    color = Brand.Text,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(top = 4.dp).semantics { liveRegion = LiveRegionMode.Polite },
                ) {
                    if (room != null) {
                        StatusGlyph(state)
                        Text(statusLabel(state), color = statusColor(state), fontSize = 12.sp, fontFamily = JetBrainsMono, modifier = Modifier.padding(start = 6.dp))
                    } else {
                        Text(t(R.string.new_session), color = Brand.Muted, fontSize = 12.sp, fontFamily = JetBrainsMono)
                    }
                }
            }
        }
        Box(Modifier.fillMaxWidth().size(1.dp).background(Brand.Line))

        // Messages
        Box(Modifier.weight(1f).fillMaxWidth()) {
            if (messages.isEmpty() && !typing) {
                Text(
                    if (room == null) t(R.string.new_hint, screen.workspace.orEmpty()) else t(R.string.no_messages),
                    color = Brand.Muted,
                    fontSize = 15.sp,
                    lineHeight = 22.sp,
                    modifier = Modifier.padding(24.dp),
                )
            }
            LazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(18.dp),
            ) {
                items(messages, key = { it.id }) { message ->
                    MessageItem(
                        message = message,
                        caret = growing && message.id == lastAssistant?.id,
                        enabled = connected,
                        decided = message.id in vm.decided,
                        expired = message.id in vm.expired,
                        locale = locale,
                        onPress = { buttonId -> vm.press(message.id, buttonId) },
                        loadFile = { vm.file(it) },
                        onOpen = { vm.push(Screen.Viewer(it)) },
                    )
                }
                if (typing) item(key = "typing") { TypingDots() }
            }
        }

        // Composer
        val errorText = (draft.error ?: vm.actionError)?.let {
            when (it) {
                ComposerError.TooLarge -> t(R.string.err_file_large)
                ComposerError.Busy -> t(R.string.err_busy)
                ComposerError.Failed -> t(R.string.err_failed)
                ComposerError.PickFailed -> t(R.string.err_pick)
            }
        }
        val hint = when {
            draft.sending -> t(R.string.sending) to Brand.Muted
            errorText != null -> errorText to Color(0xFFFF93B2)
            !connected -> t(R.string.offline_hint) to Brand.Gold
            else -> null
        }
        hint?.let { (text, color) ->
            Text(
                text,
                color = color,
                fontSize = 13.sp,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp).semantics { liveRegion = LiveRegionMode.Polite },
            )
        }
        if (draft.files.isNotEmpty()) {
            Row(
                Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                draft.files.forEach { file ->
                    Row(
                        Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(Brand.Surface2)
                            .border(1.dp, Brand.Line, RoundedCornerShape(12.dp))
                            .padding(start = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(file.name, color = Brand.Text, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.widthIn(max = 180.dp))
                        CkIconButton(Icons.Filled.Close, t(R.string.remove_file), onClick = { draft.removeFile(file) }, enabled = !draft.sending)
                    }
                }
            }
        }
        val messageLabel = t(R.string.message)
        val stopLabel = t(R.string.stop)
        val canSend = connected && !draft.sending && (draft.text.isNotBlank() || draft.files.isNotEmpty())
        val showStop = room != null && SessionStatus.isBusy(state) && draft.text.isBlank() && draft.files.isEmpty()
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.Bottom,
        ) {
            CkIconButton(Icons.Filled.Add, t(R.string.attach), onClick = { picker.launch("*/*") }, enabled = connected && !draft.sending)
            val textStyle = TextStyle(color = Brand.Text, fontSize = 16.sp, fontFamily = PublicSans, lineHeight = 22.sp)
            BasicTextField(
                value = draft.text,
                onValueChange = { draft.edit(it) },
                enabled = !draft.sending,
                textStyle = textStyle,
                cursorBrush = SolidColor(Brand.Coral),
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
                maxLines = 6,
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 4.dp)
                    .semantics { contentDescription = messageLabel },
                decorationBox = { inner ->
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .heightIn(min = 48.dp)
                            .clip(RoundedCornerShape(24.dp))
                            .background(Brand.Surface)
                            .border(1.dp, Brand.Line, RoundedCornerShape(24.dp))
                            .padding(horizontal = 16.dp, vertical = 13.dp),
                        contentAlignment = Alignment.CenterStart,
                    ) {
                        if (draft.text.isEmpty()) {
                            Text(
                                if (room == null) t(R.string.placeholder_task) else t(R.string.placeholder_followup),
                                style = textStyle.copy(color = Brand.Dim),
                            )
                        }
                        inner()
                    }
                },
            )
            if (showStop) {
                Box(
                    Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(Brand.Surface2)
                        .border(1.dp, Brand.Red, CircleShape)
                        .clickable(role = Role.Button) { room?.let { vm.stop(it.id) } }
                        .semantics { contentDescription = stopLabel },
                    contentAlignment = Alignment.Center,
                ) {
                    Box(Modifier.size(14.dp).background(Brand.Coral, RoundedCornerShape(3.dp)))
                }
            } else {
                Box(
                    Modifier
                        .size(48.dp)
                        .alpha(if (canSend) 1f else 0.4f)
                        .clip(CircleShape)
                        .background(Brand.Red)
                        .clickable(enabled = canSend, role = Role.Button) { vm.send(key, screen.roomId, screen.workspace) },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.AutoMirrored.Filled.Send, contentDescription = t(R.string.send), tint = Brand.Cream, modifier = Modifier.size(20.dp))
                }
            }
        }
    }
}

@Composable
private fun MessageItem(
    message: Message,
    caret: Boolean,
    enabled: Boolean,
    decided: Boolean,
    expired: Boolean,
    locale: Locale,
    onPress: (String) -> Unit,
    loadFile: suspend (Attachment) -> java.io.File?,
    onOpen: (Attachment) -> Unit,
) {
    when (message.role) {
        "user" -> Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (message.text.isNotBlank() && !(message.attachments.isNotEmpty() && message.text.startsWith("[File:"))) {
                Box(
                    Modifier
                        .widthIn(max = 320.dp)
                        .clip(RoundedCornerShape(18.dp, 18.dp, 4.dp, 18.dp))
                        .background(Brand.Surface2)
                        .border(1.dp, Brand.Line, RoundedCornerShape(18.dp, 18.dp, 4.dp, 18.dp))
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                ) {
                    Text(message.text, color = Brand.Text, fontSize = 15.sp, lineHeight = 22.sp)
                }
            }
            message.attachments.forEach { AttachmentView(it, loadFile, onOpen) }
            Text(formatTime(message.createdAt, locale), color = Brand.Dim, fontSize = 11.sp, fontFamily = JetBrainsMono)
        }
        "system" -> Text(
            message.text,
            color = Brand.Dim,
            fontSize = 12.sp,
            fontFamily = JetBrainsMono,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
        )
        else -> Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            if (message.buttons.isNotEmpty() || expired) {
                PermissionCard(message, enabled && !decided && !expired, expired, onPress)
            } else {
                val showText = !(message.attachments.isNotEmpty() && message.text.startsWith("[File:"))
                if (showText && (message.text.isNotBlank() || caret)) MarkdownText(message.text, caret = caret)
            }
            message.attachments.forEach { AttachmentView(it, loadFile, onOpen) }
            Text(formatTime(message.createdAt, locale), color = Brand.Dim, fontSize = 11.sp, fontFamily = JetBrainsMono)
        }
    }
}

/** AC-3: one button per item. A 409 turns the card into an expired one. */
@Composable
private fun PermissionCard(message: Message, enabled: Boolean, expired: Boolean, onPress: (String) -> Unit) {
    val shape = RoundedCornerShape(16.dp)
    Column(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Brand.Surface)
            .border(1.dp, if (expired) Brand.Line else Brand.Gold.copy(alpha = 0.6f), shape)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(glyphText(SessionStatus.AWAITING_APPROVAL), color = if (expired) Brand.Dim else Brand.Gold, fontSize = 16.sp)
            Text(
                t(R.string.permission_title),
                color = if (expired) Brand.Dim else Brand.Gold,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(start = 8.dp),
            )
        }
        MarkdownText(message.text)
        if (expired) {
            Text(t(R.string.card_expired), color = Brand.Muted, fontSize = 13.sp, lineHeight = 19.sp)
        }
        message.buttons.forEach { button ->
            CkButton(
                button.text,
                onClick = { onPress(button.id) },
                primary = false,
                enabled = enabled,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun AttachmentView(att: Attachment, loadFile: suspend (Attachment) -> java.io.File?, onOpen: (Attachment) -> Unit) {
    val kind = attachmentKind(att)
    if (kind == AttachmentKind.Image) {
        val file by produceState<java.io.File?>(null, att.id) { value = loadFile(att) }
        Box(
            Modifier
                .widthIn(max = 260.dp)
                .heightIn(min = 120.dp, max = 260.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(Brand.Surface)
                .border(1.dp, Brand.Line, RoundedCornerShape(14.dp))
                .clickable(role = Role.Button) { onOpen(att) },
            contentAlignment = Alignment.Center,
        ) {
            file?.let { AsyncImage(it, contentDescription = att.name, contentScale = ContentScale.Fit) }
                ?: Text(att.name, color = Brand.Dim, fontSize = 12.sp, modifier = Modifier.padding(12.dp))
        }
    } else {
        Row(
            Modifier
                .widthIn(max = 320.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(Brand.Surface)
                .border(1.dp, Brand.Line, RoundedCornerShape(14.dp))
                .clickable(role = Role.Button) { onOpen(att) }
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier.size(40.dp).clip(RoundedCornerShape(10.dp)).background(Brand.Surface2),
                contentAlignment = Alignment.Center,
            ) {
                Text(kind.badge, color = Brand.Coral, fontSize = 11.sp, fontFamily = JetBrainsMono, fontWeight = FontWeight.SemiBold)
            }
            Column(Modifier.padding(start = 12.dp)) {
                Text(att.name, color = Brand.Text, fontSize = 14.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(att.mime, color = Brand.Dim, fontSize = 11.sp, fontFamily = JetBrainsMono, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

/** Three dots. With reduced motion they sit still at full strength. */
@Composable
fun TypingDots(modifier: Modifier = Modifier) {
    val reduce = LocalReduceMotion.current
    val transition = rememberInfiniteTransition(label = "typing")
    val label = t(R.string.typing)
    Row(
        modifier
            .padding(vertical = 4.dp)
            .semantics { contentDescription = label; liveRegion = LiveRegionMode.Polite },
        horizontalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        repeat(3) { i ->
            val p by transition.animateFloat(
                initialValue = 0f,
                targetValue = 0f,
                animationSpec = infiniteRepeatable(
                    keyframes {
                        durationMillis = 1200
                        0f at 0
                        1f at 360 using LinearEasing
                        0f at 720
                        0f at 1200
                    },
                    RepeatMode.Restart,
                    StartOffset(i * 160),
                ),
                label = "dot$i",
            )
            Box(
                Modifier
                    .size(8.dp)
                    .graphicsLayer {
                        translationY = if (reduce) 0f else -5.dp.toPx() * p
                        alpha = if (reduce) 1f else 0.35f + 0.65f * p
                    }
                    .background(Brand.Coral, CircleShape),
            )
        }
    }
}
