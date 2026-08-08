/**
 * The glyph and the tone each session state carries. Both maps live here so the
 * topic renamer in `Gateway` and the dashboard cannot drift apart, and so hard
 * rule 7 has one place to be checked: colour is never the only signal, and the
 * glyph is what survives a stylesheet that never loaded.
 *
 * The five decided states come from the semantic table in `docs/brand.md`, which
 * adopted Telegram's six `icon_color` values so a topic list and a dashboard row
 * read as the same product. Telegram's sixth value `#FB6F5F` is deliberately
 * absent: it sits ΔE 9,9 from the brand red, and a reader cannot tell "brand"
 * from "failed" at that distance.
 *
 * `idle` has no row in that table. Its glyph is the one the product already
 * prints in chat (`src/i18n.ts`), and its tone is n-500, the metadata tone from
 * the neutral ramp in the same document.
 */
export const STATE_GLYPH: Record<string, string> = {
  idle: "◌",
  running: "▸",
  awaiting_approval: "⏸",
  done: "✓",
  failed: "✗",
  cancelled: "⊘",
};

export const STATE_COLOR: Record<string, string> = {
  idle: "#7A848F",
  running: "#6FB9F0",
  awaiting_approval: "#FFD67E",
  done: "#8EEE98",
  failed: "#FF93B2",
  cancelled: "#CB86DB",
};
