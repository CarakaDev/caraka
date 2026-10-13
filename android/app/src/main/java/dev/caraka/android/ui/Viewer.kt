package dev.caraka.android.ui

import android.graphics.Bitmap
import android.graphics.Color as AndroidColor
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import coil3.compose.AsyncImage
import dev.caraka.android.R
import dev.caraka.android.data.Attachment
import dev.caraka.android.ui.theme.Brand
import dev.caraka.android.ui.theme.JetBrainsMono
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.File

enum class AttachmentKind(val badge: String) {
    Image("IMG"), Markdown("MD"), Pdf("PDF"), Audio("AUD"), Video("VID"), Other("FILE")
}

/** AC-5.3: the kind comes from the mime type, with the file name as a fallback for text types. */
fun attachmentKind(att: Attachment): AttachmentKind {
    val mime = att.mime.lowercase().substringBefore(';').trim()
    val name = att.name.lowercase()
    return when {
        mime.startsWith("image/") -> AttachmentKind.Image
        mime == "text/markdown" || mime == "text/x-markdown" ||
            ((mime == "text/plain" || mime == "application/octet-stream") && (name.endsWith(".md") || name.endsWith(".markdown"))) -> AttachmentKind.Markdown
        mime == "application/pdf" -> AttachmentKind.Pdf
        mime.startsWith("audio/") -> AttachmentKind.Audio
        mime.startsWith("video/") -> AttachmentKind.Video
        else -> AttachmentKind.Other
    }
}

private sealed interface Loaded {
    data object Loading : Loaded
    data object Failed : Loaded
    data class Ready(val file: File) : Loaded
}

@Composable
fun ViewerScreen(vm: AppViewModel, att: Attachment) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val loaded by produceState<Loaded>(Loaded.Loading, att.id) {
        value = vm.file(att)?.let { Loaded.Ready(it) } ?: Loaded.Failed
    }
    var saved by remember { mutableStateOf<Boolean?>(null) }
    val saver = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument(att.mime)) { uri: Uri? ->
        val file = (loaded as? Loaded.Ready)?.file
        if (uri != null && file != null) {
            scope.launch {
                saved = withContext(Dispatchers.IO) {
                    try {
                        context.contentResolver.openOutputStream(uri)?.use { out -> file.inputStream().use { it.copyTo(out) } } != null
                        true
                    } catch (_: Exception) {
                        false
                    }
                }
            }
        }
    }
    val kind = attachmentKind(att)

    Column(Modifier.fillMaxSize().background(Brand.Bg).safeDrawingPadding()) {
        Row(Modifier.fillMaxWidth().padding(end = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            CkIconButton(Icons.AutoMirrored.Filled.ArrowBack, t(R.string.back), onClick = { vm.back() })
            Column(Modifier.weight(1f)) {
                Text(att.name, color = Brand.Text, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(att.mime, color = Brand.Dim, fontSize = 11.sp, fontFamily = JetBrainsMono, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            if (loaded is Loaded.Ready && kind != AttachmentKind.Other) {
                Box(Modifier.padding(start = 8.dp)) {
                    CkButton(t(R.string.save), onClick = { saver.launch(att.name) }, primary = false, modifier = Modifier.heightIn(min = 44.dp))
                }
            }
        }
        Box(Modifier.fillMaxWidth().size(1.dp).background(Brand.Line))
        Box(Modifier.weight(1f).fillMaxWidth()) {
            when (val l = loaded) {
                Loaded.Loading -> Text(t(R.string.loading), color = Brand.Muted, modifier = Modifier.align(Alignment.Center))
                Loaded.Failed -> Text(t(R.string.err_open_file), color = ErrorPink, modifier = Modifier.align(Alignment.Center).padding(24.dp))
                is Loaded.Ready -> when (kind) {
                    AttachmentKind.Image -> ZoomImage(l.file, att.name)
                    AttachmentKind.Markdown -> MarkdownViewer(l.file)
                    AttachmentKind.Pdf -> PdfViewer(l.file) { OtherCard(att, l.file) { saver.launch(att.name) } }
                    AttachmentKind.Audio, AttachmentKind.Video -> MediaViewer(l.file, kind == AttachmentKind.Video)
                    AttachmentKind.Other -> OtherCard(att, l.file) { saver.launch(att.name) }
                }
            }
        }
        saved?.let {
            Text(
                if (it) t(R.string.saved) else t(R.string.err_save),
                color = if (it) Brand.Green else ErrorPink,
                fontSize = 13.sp,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
            )
        }
    }
}

private val ErrorPink = androidx.compose.ui.graphics.Color(0xFFFF93B2)

@Composable
private fun ZoomImage(file: File, name: String) {
    var scale by remember { mutableFloatStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }
    Box(
        Modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                detectTransformGestures { _, pan, zoom, _ ->
                    scale = (scale * zoom).coerceIn(1f, 6f)
                    offset = if (scale <= 1f) Offset.Zero else offset + pan
                }
            }
            .pointerInput(Unit) {
                detectTapGestures(onDoubleTap = {
                    if (scale > 1f) {
                        scale = 1f
                        offset = Offset.Zero
                    } else {
                        scale = 2.5f
                    }
                })
            },
    ) {
        AsyncImage(
            model = file,
            contentDescription = name,
            contentScale = ContentScale.Fit,
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer {
                    scaleX = scale
                    scaleY = scale
                    translationX = offset.x
                    translationY = offset.y
                },
        )
    }
}

@Composable
private fun MarkdownViewer(file: File) {
    val text by produceState("", file) {
        value = withContext(Dispatchers.IO) { readHead(file, 2 * 1024 * 1024) }
    }
    var source by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize()) {
        Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            CkButton(t(R.string.md_view), onClick = { source = false }, primary = !source, modifier = Modifier.heightIn(min = 44.dp))
            CkButton(t(R.string.md_source), onClick = { source = true }, primary = source, modifier = Modifier.heightIn(min = 44.dp))
        }
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 8.dp)) {
            if (source) {
                Text(text, color = Brand.Text, fontFamily = JetBrainsMono, fontSize = 13.sp, lineHeight = 19.sp)
            } else {
                MarkdownText(text)
            }
        }
    }
}

@Composable
private fun PdfViewer(file: File, fallback: @Composable () -> Unit) {
    val renderer = remember(file) {
        runCatching { PdfRenderer(ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)) }.getOrNull()
    }
    if (renderer == null) {
        fallback()
        return
    }
    DisposableEffect(renderer) { onDispose { runCatching { renderer.close() } } }
    val mutex = remember { Mutex() }
    BoxWithConstraints(Modifier.fillMaxSize()) {
        val widthPx = with(LocalDensity.current) { (maxWidth - 24.dp).roundToPx() }
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items((0 until renderer.pageCount).toList(), key = { it }) { index ->
                val bitmap by produceState<Bitmap?>(null, index, widthPx) {
                    value = mutex.withLock {
                        withContext(Dispatchers.IO) {
                            runCatching {
                                renderer.openPage(index).use { page ->
                                    val h = (widthPx.toFloat() * page.height / page.width).toInt().coerceAtLeast(1)
                                    Bitmap.createBitmap(widthPx, h, Bitmap.Config.ARGB_8888).also {
                                        it.eraseColor(AndroidColor.WHITE)
                                        page.render(it, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                                    }
                                }
                            }.getOrNull()
                        }
                    }
                }
                val b = bitmap
                if (b != null) {
                    Image(
                        b.asImageBitmap(),
                        contentDescription = t(R.string.pdf_page, index + 1, renderer.pageCount),
                        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(4.dp)),
                        contentScale = ContentScale.FillWidth,
                    )
                } else {
                    Box(Modifier.fillMaxWidth().heightIn(min = 240.dp).background(Brand.Surface), contentAlignment = Alignment.Center) {
                        Text("${index + 1}", color = Brand.Dim)
                    }
                }
            }
        }
    }
}

@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
@Composable
private fun MediaViewer(file: File, video: Boolean) {
    val context = LocalContext.current
    val player = remember(file) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(Uri.fromFile(file)))
            prepare()
        }
    }
    DisposableEffect(player) { onDispose { player.release() } }
    LifecycleEventEffect(Lifecycle.Event.ON_STOP) { player.pause() }
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
            PlayerView(ctx).apply {
                this.player = player
                useController = true
                if (!video) controllerShowTimeoutMs = 0
            }
        },
        update = { it.player = player },
    )
}

@Composable
private fun OtherCard(att: Attachment, file: File, onSave: () -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(Brand.Surface)
                .border(1.dp, Brand.Line, RoundedCornerShape(18.dp))
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(att.name, color = Brand.Text, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
            Text("${att.mime} · ${formatSize(file.length())}", color = Brand.Dim, fontSize = 12.sp, fontFamily = JetBrainsMono)
            Text(t(R.string.save_hint), color = Brand.Muted, fontSize = 14.sp, lineHeight = 20.sp)
            CkButton(t(R.string.save), onClick = onSave, modifier = Modifier.fillMaxWidth())
        }
    }
}

fun formatSize(bytes: Long): String = when {
    bytes >= 1024 * 1024 -> String.format(java.util.Locale.US, "%.1f MiB", bytes / 1048576.0)
    bytes >= 1024 -> String.format(java.util.Locale.US, "%.1f KiB", bytes / 1024.0)
    else -> "$bytes B"
}

/** Reads at most `limit` bytes of a text file. */
private fun readHead(file: File, limit: Int): String {
    val out = java.io.ByteArrayOutputStream()
    file.inputStream().use { input ->
        val buffer = ByteArray(8192)
        var left = limit
        while (left > 0) {
            val n = input.read(buffer, 0, minOf(buffer.size, left))
            if (n < 0) break
            out.write(buffer, 0, n)
            left -= n
        }
    }
    return out.toString(Charsets.UTF_8.name())
}
