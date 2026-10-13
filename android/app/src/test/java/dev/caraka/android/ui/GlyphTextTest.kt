package dev.caraka.android.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class GlyphTextTest {
    @Test fun everyGlyphUsesTextPresentation() {
        listOf("idle", "running", "awaiting_approval", "done", "failed", "cancelled", null).forEach {
            assertTrue(glyphText(it).endsWith("︎"))
        }
    }

    @Test fun pauseGlyphKeepsItsBaseCharacter() {
        assertEquals("⏸︎", glyphText("awaiting_approval"))
    }
}
