/**
 * Every read the dashboard makes. Each statement is a literal with bound
 * parameters and a fixed `LIMIT`; no value from a URL is ever concatenated into
 * SQL, and no statement writes.
 *
 * Two of the panels have no table behind them. Run history and the beta numbers
 * are derived from rows the audit log already carries, because a read-only view
 * is not a reason to add a table (`docs/erd.md` still draws `run` and `message`
 * as unbuilt).
 */
import type { DatabaseSync } from "node:sqlite";

const ROW_LIMIT = 200;
const DAY_MS = 24 * 60 * 60_000;

/** The `?since` values the audit panel accepts. Anything else reads as `24h`. */
export const WINDOWS = ["1h", "24h", "7d", "all"] as const;
export type Window = (typeof WINDOWS)[number];

const WINDOW_MS: Record<Window, number | null> = {
  "1h": 60 * 60_000,
  "24h": DAY_MS,
  "7d": 7 * DAY_MS,
  all: null,
};

/**
 * A URL value never reaches a query. It selects one of four constants, and an
 * unrecognised value selects the default rather than being passed along.
 */
export function windowOf(raw: string | null | undefined): Window {
  return WINDOWS.includes(raw as Window) ? (raw as Window) : "24h";
}

export function windowStart(window: Window, now: number) {
  const span = WINDOW_MS[window];
  return span === null ? 0 : now - span;
}

export type SessionRow = {
  id: string;
  state: string;
  title: string;
  workspace: string;
  agent: string;
  principal: string;
  updatedAt: number;
};

export function sessions(db: DatabaseSync) {
  return db
    .prepare(
      `SELECT id, state, title, workspace, agent, principal, updated_at AS updatedAt
       FROM sessions ORDER BY updated_at DESC LIMIT ?`,
    )
    .all(ROW_LIMIT) as SessionRow[];
}

export type ApprovalRow = {
  id: string;
  principal: string;
  sessionId: string;
  toolCallId: string;
  expiresAt: number;
  usedAt: number | null;
  decision: string | null;
};

/** Four states out of three columns, and the clock decides the fourth. */
export function approvalStatus(row: ApprovalRow, now: number) {
  if (row.decision === "allow") return "allowed";
  if (row.decision === "reject") return "rejected";
  return row.expiresAt <= now ? "expired" : "waiting";
}

export function approvals(db: DatabaseSync) {
  return db
    .prepare(
      `SELECT id, principal, session_id AS sessionId, tool_call_id AS toolCallId,
              expires_at AS expiresAt, used_at AS usedAt, decision
       FROM approvals ORDER BY expires_at DESC LIMIT ?`,
    )
    .all(ROW_LIMIT) as ApprovalRow[];
}

export type AuditRow = {
  id: number;
  ts: number;
  action: string;
  principal: string | null;
  sessionId: string | null;
  result: string;
  details: string;
};

export function audit(db: DatabaseSync, since: number) {
  return db
    .prepare(
      `SELECT id, ts, action, principal, session_id AS sessionId, result, details
       FROM audit WHERE ts >= ? ORDER BY ts DESC, id DESC LIMIT ?`,
    )
    .all(since, ROW_LIMIT) as AuditRow[];
}

export type GrantRow = {
  id: string;
  workspace: string;
  mode: string;
  grantedBy: string;
  principal: string | null;
  agentMode: string | null;
  createdAt: number;
  expiresAt: number | null;
  closedAt: number | null;
};

/** The same reading `Store.activeGrant` uses: the row and the clock must agree. */
export function grantOpen(row: GrantRow, now: number) {
  return row.closedAt === null && (row.expiresAt === null || row.expiresAt > now);
}

export function grants(db: DatabaseSync) {
  return db
    .prepare(
      `SELECT id, workspace, mode, granted_by AS grantedBy, principal, agent_mode AS agentMode,
              created_at AS createdAt, expires_at AS expiresAt, closed_at AS closedAt
       FROM policy_grant ORDER BY created_at DESC LIMIT ?`,
    )
    .all(ROW_LIMIT) as GrantRow[];
}

export type MemoryRow = {
  id: string;
  scope: string;
  kind: string;
  text: string;
  createdAt: number;
};

export function memories(db: DatabaseSync) {
  return db
    .prepare(
      `SELECT id, scope, kind, text, created_at AS createdAt
       FROM memory_local ORDER BY created_at DESC LIMIT ?`,
    )
    .all(ROW_LIMIT) as MemoryRow[];
}

export type RunRow = {
  sessionId: string;
  agent: string;
  startTs: number;
  finishTs: number | null;
  result: string | null;
};

function agentOf(details: string) {
  try {
    const parsed: unknown = JSON.parse(details);
    const agent = (parsed as { agent?: unknown }).agent;
    return typeof agent === "string" ? agent : "";
  } catch {
    return "";
  }
}

/**
 * Run history, paired from the audit log. A `run.start` is held open until the
 * next row on the same session closes it; a start with nothing after it is a run
 * the database cannot tell apart from one whose process was killed, so it is
 * reported as still running with no duration rather than guessed at.
 *
 * A later start on the same session is one of those closing rows. It proves the
 * earlier run ended without saying how — the usual cause is a driver that threw
 * between `run.start` and `run.finish` — so the earlier row ends there and reads
 * `interrupted` rather than staying open and claiming to be running.
 *
 * ponytail: the whole audit log is read and paired in memory. The ceiling is a
 * log large enough for that to be felt; a `WHERE ts >=` window is the upgrade,
 * and it costs correctness at the window edge, so it waits for a complaint.
 */
export function runs(db: DatabaseSync) {
  const rows = db
    .prepare(
      `SELECT ts, action, result, session_id AS sessionId, details FROM audit
       WHERE action IN ('run.start', 'run.finish') ORDER BY ts ASC, id ASC`,
    )
    .all() as Array<{
    ts: number;
    action: string;
    result: string;
    sessionId: string | null;
    details: string;
  }>;
  const open = new Map<string, RunRow>();
  const closed: RunRow[] = [];
  for (const row of rows) {
    const key = row.sessionId ?? "";
    if (row.action === "run.start") {
      const previous = open.get(key);
      if (previous) closed.push({ ...previous, finishTs: row.ts, result: "interrupted" });
      open.set(key, {
        sessionId: key,
        agent: agentOf(row.details),
        startTs: row.ts,
        finishTs: null,
        result: null,
      });
      continue;
    }
    const started = open.get(key);
    // A finish with no start before it belongs to a run whose start is older
    // than this log. There is nothing to pair it with, so it draws no row.
    if (!started) continue;
    open.delete(key);
    closed.push({ ...started, finishTs: row.ts, result: row.result });
  }
  return [...closed, ...open.values()]
    .sort((left, right) => right.startTs - left.startTs)
    .slice(0, ROW_LIMIT);
}

export type Beta = {
  firstStart: number | null;
  firstMessage: number | null;
  setupSeconds: number | null;
  activated: boolean;
};

/**
 * The two beta numbers, both derived. Setup time is the gap between the first
 * `gateway.start` and the first message that was accepted; activation is a run
 * that reached `end_turn` inside the first day. A database written before v0.5
 * has no `gateway.start` row at all, and then the setup number is not unknowable
 * later — it is unknown forever, and the panel says so rather than inventing a
 * start.
 */
export function beta(db: DatabaseSync): Beta {
  const earliest = (action: string) =>
    (
      db.prepare("SELECT MIN(ts) AS ts FROM audit WHERE action = ?").get(action) as {
        ts: number | null;
      }
    ).ts;
  const firstStart = earliest("gateway.start");
  const firstMessage = earliest("msg.in");
  const setupSeconds =
    firstStart !== null && firstMessage !== null && firstStart <= firstMessage
      ? Math.round((firstMessage - firstStart) / 1000)
      : null;
  const activated =
    firstStart !== null &&
    db
      .prepare(
        `SELECT 1 FROM audit WHERE action = 'run.finish' AND result = 'end_turn'
         AND ts >= ? AND ts <= ? LIMIT 1`,
      )
      .get(firstStart, firstStart + DAY_MS) !== undefined;
  return { firstStart, firstMessage, setupSeconds, activated };
}
