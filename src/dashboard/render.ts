/**
 * Markup, and nothing else. No database handle reaches this file and no value
 * leaves it unescaped, so the whole question "is this string safe in HTML" has
 * one place to be answered.
 */
import { STATE_GLYPH } from "../core/status.js";
import type { MessageKey, Translate } from "../i18n.js";

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ENTITIES[char] ?? char);
}

/** One timestamp format for the whole page: UTC, unambiguous, locale-free. */
export function stamp(ts: unknown) {
  return typeof ts === "number" && Number.isFinite(ts) ? new Date(ts).toISOString() : "";
}

export function duration(ms: number | null) {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return "";
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function cell(value: unknown) {
  return `<td>${escapeHtml(value)}</td>`;
}

/**
 * A status cell carries the glyph as a character, then the state as a word, and
 * only then a colour class. Strip the stylesheet and the row still says which
 * state it is in (`AGENTS.md` hard rule 7). The class comes from the known-state
 * map rather than from the column, so a row written by a future version cannot
 * put an attribute into the markup.
 */
export function statusCell(state: string) {
  const known = Object.hasOwn(STATE_GLYPH, state);
  const glyph = known ? STATE_GLYPH[state] : "·";
  return `<td class="state ${known ? `state-${state}` : "state-unknown"}">${escapeHtml(glyph)} ${escapeHtml(state)}</td>`;
}

export function table(headers: string[], rows: string[][], empty: string) {
  if (rows.length === 0) return `<p class="empty">${escapeHtml(empty)}</p>`;
  const head = headers.map((label) => `<th>${escapeHtml(label)}</th>`).join("");
  const body = rows.map((row) => `<tr>${row.join("")}</tr>`).join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

/** The paths in the navigation, in the order they are shown. */
export const NAV: Array<[string, MessageKey]> = [
  ["/", "dash.nav.sessions"],
  ["/runs", "dash.nav.runs"],
  ["/approvals", "dash.nav.approvals"],
  ["/audit", "dash.nav.audit"],
  ["/policy", "dash.nav.policy"],
  ["/memory", "dash.nav.memory"],
  ["/beta", "dash.nav.beta"],
];

/**
 * The swappable half of the page. The render time sits inside it rather than in
 * the page header, because the panel is what a poll replaces — a clock outside
 * it would keep printing the moment the tab was opened while the rows below it
 * moved on. Without htmx nothing swaps and nothing polls, and the single time
 * printed here is then the age of everything under it.
 */
export function panel(t: Translate, path: string, inner: string, now: number) {
  return (
    `<section id="panel-body" hx-get="${escapeHtml(path)}" hx-trigger="every 10s" hx-swap="outerHTML">` +
    `<p class="stamp">${escapeHtml(t("dash.renderedAt", { time: stamp(now) }))}</p>` +
    `${inner}</section>`
  );
}

/**
 * The whole document. Every navigation anchor carries both an `href` and an
 * `hx-get` to the same path: htmx swaps the panel, and a browser without it
 * follows the link and gets the same panel as a full page.
 */
export function page(t: Translate, path: string, body: string) {
  const nav = NAV.map(
    ([href, key]) =>
      `<a href="${href}" hx-get="${href}" hx-target="#panel" hx-swap="innerHTML"` +
      `${href === path ? ' class="on" aria-current="page"' : ""}>${escapeHtml(t(key))}</a>`,
  ).join("");
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${escapeHtml(t("dash.title"))}</title>` +
    `<link rel="stylesheet" href="/assets/dashboard.css">` +
    `<script src="/assets/htmx.min.js" defer></script></head>` +
    `<body><header><h1>${escapeHtml(t("dash.title"))}</h1>` +
    `<p class="note">${escapeHtml(t("dash.readOnly"))}</p>` +
    `<nav>${nav}</nav></header>` +
    `<main id="panel">${body}</main></body></html>`
  );
}

/** A page that says one thing and says it in a sentence. Never a stack trace. */
export function notice(t: Translate, key: MessageKey) {
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<title>${escapeHtml(t("dash.title"))}</title>` +
    `<link rel="stylesheet" href="/assets/dashboard.css"></head>` +
    `<body><main id="panel"><p class="empty">${escapeHtml(t(key))}</p></main></body></html>`
  );
}
