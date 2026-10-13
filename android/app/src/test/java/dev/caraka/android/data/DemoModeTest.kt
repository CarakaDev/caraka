package dev.caraka.android.data

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** A real repository that counts every call. Demo mode must keep the count at zero. */
private class CountingRepository : CarakaRepository {
    var calls = 0
    override val ui: StateFlow<AppUi> = MutableStateFlow(AppUi(phase = Phase.Unpaired))
    override suspend fun boot() = Unit
    override fun setForeground(active: Boolean) = Unit
    override suspend fun pair(origin: String, code: String): PairResult { calls++; return PairResult.Success }
    override suspend fun sendMessage(message: OutgoingMessage): MessageResult { calls++; return MessageResult("x") }
    override suspend fun pressButton(messageId: String, buttonId: String) { calls++ }
    override suspend fun stopRoom(roomId: String) { calls++ }
    override suspend fun upload(file: FileSource): Attachment { calls++; return Attachment("a", "a", "a") }
    override suspend fun fetchFile(attachment: Attachment): File { calls++; return File("x") }
    override suspend fun devices(): List<PairedDevice> { calls++; return emptyList() }
    override suspend fun revokeDevice(id: String) { calls++ }
    override suspend fun logout() { calls++ }
    override fun enterDemo() = Unit
    override fun exitDemo() = Unit
}

class DemoModeTest {
    private fun demo() = DemoRepository({ throw java.io.FileNotFoundException(it) }, File(System.getProperty("java.io.tmpdir"), "caraka-demo-test"))

    private fun scope() = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private suspend fun <T> awaitValue(read: () -> T?): T = withTimeout(5_000) {
        var v = read()
        while (v == null) { delay(20); v = read() }
        v
    }

    @Test
    fun demoModeNeverCallsTheRealRepository() = runBlocking {
        val real = CountingRepository()
        val mode = ModeRepository(real, { demo() }, scope())
        val before = real.calls
        mode.enterDemo()
        awaitValue { mode.ui.value.takeIf { it.demo } }
        val room = mode.ui.value.rooms.first().id
        mode.sendMessage(OutgoingMessage("c1", "hello", roomId = room))
        val buttonMessage = mode.ui.value.messages.first { it.buttons.isNotEmpty() }
        mode.pressButton(buttonMessage.id, buttonMessage.buttons.first().id)
        mode.stopRoom(room)
        mode.upload(FileSource("a.txt", "text/plain", 1) { java.io.ByteArrayInputStream(ByteArray(1)) })
        mode.devices()
        mode.revokeDevice("d2")
        assertEquals(before, real.calls)
        mode.logout()
        assertEquals(before, real.calls)
        // The UI flow updates on another thread, so wait for it.
        assertEquals(Phase.Unpaired, awaitValue { mode.ui.value.takeIf { it.phase == Phase.Unpaired && !it.demo } }.phase)
    }

    @Test
    fun sendingAppendsALocalAssistantReply() = runBlocking {
        val repo = demo()
        val room = repo.ui.value.rooms.first().id
        repo.sendMessage(OutgoingMessage("c1", "hello", roomId = room))
        assertTrue(repo.ui.value.messages.any { it.role == "user" && it.text == "hello" })
        val reply = awaitValue {
            repo.ui.value.messages.lastOrNull { it.roomId == room && it.role == "assistant" && it.id != "m10" && it.createdAt > System.currentTimeMillis() - 10_000 }
        }
        assertNotNull(reply)
        repo.exitDemo()
    }

    @Test
    fun approvalResolvesLocally() = runBlocking {
        val repo = demo()
        val m = repo.ui.value.messages.first { it.buttons.isNotEmpty() }
        repo.pressButton(m.id, m.buttons.first().id)
        assertTrue(repo.ui.value.messages.first { it.id == m.id }.buttons.isEmpty())
        repo.exitDemo()
    }
}
