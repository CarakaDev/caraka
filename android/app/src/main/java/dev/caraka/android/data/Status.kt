package dev.caraka.android.data

/** Glyph and colour for each session state. Values mirror src/core/status.ts. */
object SessionStatus {
    const val IDLE = "idle"
    const val RUNNING = "running"
    const val AWAITING_APPROVAL = "awaiting_approval"
    const val DONE = "done"
    const val FAILED = "failed"
    const val CANCELLED = "cancelled"

    val GLYPH: Map<String, String> = mapOf(
        IDLE to "◌",
        RUNNING to "▸",
        AWAITING_APPROVAL to "⏸",
        DONE to "✓",
        FAILED to "✗",
        CANCELLED to "⊘",
    )

    /** ARGB values. */
    val COLOR: Map<String, Long> = mapOf(
        IDLE to 0xFF7A848FL,
        RUNNING to 0xFF6FB9F0L,
        AWAITING_APPROVAL to 0xFFFFD67EL,
        DONE to 0xFF8EEE98L,
        FAILED to 0xFFFF93B2L,
        CANCELLED to 0xFFCB86DBL,
    )

    fun known(state: String?): String = if (state != null && GLYPH.containsKey(state)) state else IDLE
    fun glyph(state: String?): String = GLYPH.getValue(known(state))
    fun color(state: String?): Long = COLOR.getValue(known(state))
    fun isBusy(state: String?): Boolean = state == RUNNING || state == AWAITING_APPROVAL
}
