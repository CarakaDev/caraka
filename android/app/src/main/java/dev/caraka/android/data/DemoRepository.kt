package dev.caraka.android.data

import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.InputStream
import java.util.Locale
import java.util.UUID

/**
 * Sample sessions. It never touches the network and it keeps nothing on disk
 * except sample files in the cache folder. It has no link to CarakaApi.
 */
class DemoRepository(
    private val openAsset: (String) -> InputStream,
    private val cacheDir: File,
) : CarakaRepository {
    private val indonesian = Locale.getDefault().language == "id"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    /** Noon today, so store screenshots show times that match a 12:00 status bar. */
    private val now = java.time.LocalDate.now().atTime(12, 0).atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
    private val minute = 60_000L

    private fun tr(en: String, indo: String) = if (indonesian) indo else en

    private val attachments = listOf(
        Attachment("img", "architecture.png", "image/png"),
        Attachment("md", "release-notes.md", "text/markdown"),
        Attachment("pdf", "test-report.pdf", "application/pdf"),
        Attachment("aud", "standup-voice-note.ogg", "audio/ogg"),
        Attachment("vid", "demo-run.mp4", "video/mp4"),
        Attachment("bin", "build-logs.tar.gz", "application/gzip"),
    )

    private val _ui = MutableStateFlow(initial())
    override val ui: StateFlow<AppUi> = _ui.asStateFlow()

    /** One assistant message in "bridge-mobile" keeps growing, so the caret and typing dots show. */
    private val growingText = tr(
        "The server now listens on port 8787. Next I forward each event as one line and add a test for the reconnect path.",
        "Server kini mendengarkan di port 8787. Berikutnya saya teruskan tiap event sebagai satu baris dan menambah test untuk jalur sambung ulang.",
    )

    private var animation: Job? = null

    init {
        startAnimation()
    }

    private fun startAnimation() {
        animation?.cancel()
        animation = scope.launch {
            val words = growingText.split(' ')
            while (true) {
                for (n in 1..words.size) {
                    val text = words.take(n).joinToString(" ")
                    _ui.update { s ->
                        val has = s.messages.any { it.id == "m10" }
                        s.copy(
                            messages = if (has) s.messages.map { if (it.id == "m10") it.copy(text = text) else it }
                            else s.messages + Message("m10", "r2", "assistant", text, createdAt = now - 19 * minute),
                        )
                    }
                    delay(if (n < 14) 120 else 1_000)
                }
                delay(6_000)
                _ui.update { s -> s.copy(messages = s.messages.filterNot { it.id == "m10" }) }
                delay(3_000)
            }
        }
    }

    private fun initial(): AppUi {
        val rooms = listOf(
            Room("r1", "caraka", now - 5 * minute, "s1", tr("Release 1.6 and changelog", "Rilis 1.6 dan catatan perubahan"), "awaiting_approval", "claude"),
            Room("r2", "bridge-mobile", now - 20 * minute, "s2", tr("Stream output to the phone", "Stream keluaran ke ponsel"), "running", "claude"),
            Room("r3", "titen-dev", now - 26 * 60 * minute, "s3", tr("Docs pages and report", "Halaman docs dan laporan"), "done", "codex"),
            Room("r4", "gc-x-almira", now - 30 * 60 * minute, "s4", tr("Landing page build", "Build landing page"), "failed", "claude"),
            Room("r5", "coret", now - 50 * 60 * minute, "s5", tr("Q4 plan mind map", "Mind map rencana Q4"), "done", "claude"),
        )
        val messages = listOf(
            Message("m1", "r1", "user", tr("Run the tests, then push the release commit.", "Jalankan test, lalu push commit rilis."), createdAt = now - 8 * minute),
            Message("m2", "r1", "assistant", tr("All 42 tests pass. The release commit is ready: `feat(web): add device list`.", "Semua 42 test lulus. Commit rilis siap: `feat(web): add device list`."), createdAt = now - 6 * minute),
            Message(
                "m3", "r1", "assistant",
                tr("Caraka wants to run:\n\n```\ngit push origin main\n```\n\nThis sends 3 commits to GitHub.", "Caraka mau menjalankan:\n\n```\ngit push origin main\n```\n\nIni mengirim 3 commit ke GitHub."),
                buttons = listOf(Button("b1", tr("Allow once", "Izinkan sekali"), "b1"), Button("b2", tr("Deny", "Tolak"), "b2")),
                createdAt = now - 5 * minute,
            ),
            Message("m4", "r2", "user", tr("Add a WebSocket server that streams stream-json to the app.", "Tambahkan server WebSocket yang meneruskan stream-json ke aplikasi."), createdAt = now - 22 * minute),
            Message("m5", "r2", "assistant", tr("I read the bridge folder. The test suite sits in `bridge/test`, so I run it first.\n\n- start the server on port 8787\n- forward each event as one line", "Saya membaca folder bridge. Test ada di `bridge/test`, jadi saya jalankan dulu.\n\n- jalankan server di port 8787\n- teruskan tiap event sebagai satu baris"), createdAt = now - 20 * minute),
            Message("m6", "r3", "user", tr("Send me the release notes, the test report, and any media from the run.", "Kirim catatan rilis, laporan test, dan media dari proses tadi."), createdAt = now - 26 * 60 * minute),
            Message("m7", "r3", "assistant", tr("Done. 3 files changed. The files are attached.", "Selesai. 3 berkas berubah. Berkas terlampir."), attachments = attachments, createdAt = now - 26 * 60 * minute + minute),
            Message("m8", "r4", "assistant", tr("Stopped: the build failed at step 3.", "Berhenti: build gagal di langkah 3."), createdAt = now - 30 * 60 * minute),
            Message("m9", "r5", "assistant", tr("The Q4 plan mind map is ready.", "Mind map rencana Q4 sudah dibuat."), createdAt = now - 50 * 60 * minute),
        )
        return AppUi(
            phase = Phase.Ready,
            language = if (indonesian) "id" else "en",
            device = DeviceInfo("d1", "Pixel 9"),
            origin = "https://vps-rama.tail-net.ts.net",
            workspaces = listOf("caraka", "bridge-mobile", "titen-dev", "coret", "gc-x-almira").map { Workspace(it, "/home/rama/$it", "claude") },
            rooms = rooms,
            messages = messages,
            connectivity = Connectivity.Connected,
            demo = true,
        )
    }

    override suspend fun boot() = Unit
    override fun setForeground(active: Boolean) = Unit

    override suspend fun pair(origin: String, code: String): PairResult {
        enterDemo()
        return PairResult.Success
    }

    override fun enterDemo() {
        _ui.value = initial()
        startAnimation()
    }

    override fun exitDemo() {
        animation?.cancel()
        _ui.value = AppUi(phase = Phase.Unpaired)
    }

    override suspend fun sendMessage(message: OutgoingMessage): MessageResult {
        val roomId = message.roomId ?: "r-" + UUID.randomUUID().toString().take(6)
        val at = System.currentTimeMillis()
        _ui.update { s ->
            val rooms = if (message.roomId == null) {
                listOf(Room(roomId, message.workspace ?: "caraka", at, "s-$roomId", message.text.take(40), "running", "claude")) + s.rooms
            } else s.rooms.map { if (it.id == roomId) it.copy(state = "running") else it }
            s.copy(
                rooms = rooms,
                messages = s.messages + Message(UUID.randomUUID().toString(), roomId, "user", message.text, createdAt = at),
            )
        }
        scope.launch {
            delay(1_800)
            val reply = tr("Noted. I start on this now.", "Siap. Saya mulai mengerjakannya.")
            _ui.update { s ->
                s.copy(
                    rooms = s.rooms.map { if (it.id == roomId) it.copy(state = "done") else it },
                    messages = s.messages + Message(UUID.randomUUID().toString(), roomId, "assistant", reply, createdAt = System.currentTimeMillis()),
                )
            }
        }
        return MessageResult(roomId)
    }

    override suspend fun pressButton(messageId: String, buttonId: String) {
        _ui.update { s ->
            val target = s.messages.firstOrNull { it.id == messageId }
            s.copy(
                messages = s.messages.map { if (it.id == messageId) it.copy(buttons = emptyList()) else it },
                rooms = s.rooms.map { if (it.id == target?.roomId) it.copy(state = "running") else it },
            )
        }
    }

    override suspend fun stopRoom(roomId: String) {
        _ui.update { s -> s.copy(rooms = s.rooms.map { if (it.id == roomId) it.copy(state = "cancelled") else it }) }
    }

    override suspend fun upload(file: FileSource): Attachment = Attachment(UUID.randomUUID().toString().take(8), file.name, file.mime)

    override suspend fun fetchFile(attachment: Attachment): File = withContext(Dispatchers.IO) {
        val dir = File(cacheDir, "demo").apply { mkdirs() }
        val target = File(dir, safeName(attachment.name))
        if (target.isFile && target.length() > 0) return@withContext target
        when (attachment.id) {
            "img" -> copyAsset("demo/diagram.png", target)
            "aud" -> copyAsset("demo/voice.ogg", target)
            "vid" -> copyAsset("demo/clip.mp4", target)
            "md" -> target.writeText(markdownSample())
            "pdf" -> writePdf(target)
            else -> target.writeBytes(ByteArray(2048) { (it * 31).toByte() })
        }
        target
    }

    private fun copyAsset(asset: String, target: File) {
        openAsset(asset).use { input -> target.outputStream().use { input.copyTo(it) } }
    }

    private fun markdownSample(): String = tr(
        "# Release 1.6\n\nThe web app now lists paired devices.\n\n## Changes\n\n- device list with revoke\n- **faster** state reload\n- fix for `editText` growth\n\n```\nnpm run verify\n```\n\n> All checks passed on the build machine.\n",
        "# Rilis 1.6\n\nAplikasi web kini menampilkan daftar perangkat.\n\n## Perubahan\n\n- daftar perangkat dengan cabut akses\n- muat ulang state **lebih cepat**\n- perbaikan untuk pertumbuhan `editText`\n\n```\nnpm run verify\n```\n\n> Semua pemeriksaan lulus di mesin build.\n",
    )

    private fun writePdf(target: File) {
        val doc = PdfDocument()
        val paint = Paint().apply { color = Color.BLACK; textSize = 18f; isAntiAlias = true }
        for (page in 1..3) {
            val p = doc.startPage(PdfDocument.PageInfo.Builder(595, 842, page).create())
            p.canvas.drawText(tr("Test report", "Laporan test") + " - $page/3", 48f, 80f, paint)
            for (line in 0 until 12) p.canvas.drawText("PASS  suite-${page}-${line + 1}", 48f, 130f + line * 28f, paint)
            doc.finishPage(p)
        }
        target.outputStream().use { doc.writeTo(it) }
        doc.close()
    }

    override suspend fun devices(): List<PairedDevice> =
        listOf(PairedDevice("d1", "Pixel 9", now), PairedDevice("d2", "Laptop browser", now - 86_400_000))

    override suspend fun revokeDevice(id: String) = Unit

    override suspend fun logout() = exitDemo()
}
