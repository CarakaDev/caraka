package dev.caraka.android.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class StatusTest {
    @Test fun glyphsMatchStatusTs() {
        assertEquals("◌", SessionStatus.glyph("idle"))
        assertEquals("▸", SessionStatus.glyph("running"))
        assertEquals("⏸", SessionStatus.glyph("awaiting_approval"))
        assertEquals("✓", SessionStatus.glyph("done"))
        assertEquals("✗", SessionStatus.glyph("failed"))
        assertEquals("⊘", SessionStatus.glyph("cancelled"))
    }

    @Test fun coloursMatchStatusTs() {
        assertEquals(0xFF7A848FL, SessionStatus.color("idle"))
        assertEquals(0xFF6FB9F0L, SessionStatus.color("running"))
        assertEquals(0xFFFFD67EL, SessionStatus.color("awaiting_approval"))
        assertEquals(0xFF8EEE98L, SessionStatus.color("done"))
        assertEquals(0xFFFF93B2L, SessionStatus.color("failed"))
        assertEquals(0xFFCB86DBL, SessionStatus.color("cancelled"))
    }

    @Test fun unknownAndNullFallBackToIdle() {
        assertEquals("◌", SessionStatus.glyph(null))
        assertEquals("◌", SessionStatus.glyph("weird"))
        assertEquals(SessionStatus.color("idle"), SessionStatus.color("weird"))
    }

    @Test fun busyStates() {
        assertTrue(SessionStatus.isBusy("running"))
        assertTrue(SessionStatus.isBusy("awaiting_approval"))
        assertFalse(SessionStatus.isBusy("done"))
        assertFalse(SessionStatus.isBusy(null))
    }

    @Test fun backoffGrowsToThirtySeconds() {
        assertEquals(1_000L, Backoff.delayMillis(0))
        assertEquals(2_000L, Backoff.delayMillis(1))
        assertEquals(16_000L, Backoff.delayMillis(4))
        assertEquals(30_000L, Backoff.delayMillis(5))
        assertEquals(30_000L, Backoff.delayMillis(50))
    }
}
