import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import type { createScrubber } from "../core/security.js";

export type Session = {
  id: string;
  principal: string;
  chatId: string;
  threadId: string;
  agentSessionId: string | null;
  title: string;
  state: string;
  // The workspace slug and agent preset id. Both TEXT without FK, the same
  // deliberate deviation `policy_grant.workspace` records in `docs/erd.md`.
  // '' on rows from before v0.4 reads as the first configured workspace and
  // the default agent.
  workspace: string;
  agent: string;
};

export type PolicyGrant = {
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

export type Approval = {
  id: string;
  principal: string;
  sessionId: string;
  agentSessionId: string;
  toolCallId: string;
  allowOptionId: string;
  rejectOptionId: string | null;
  expiresAt: number;
  /** The card's short code, `null` on a row written before v0.6. */
  shortCode?: string | null;
};

// `docs/security.md` §9, specified since v0.1 and built here: past five
// undecided approvals a session stops drawing cards. It is also what the short
// code's entropy argument rests on — five live codes out of 2^20 at a time
// (`spec/whatsapp-v06.md` §1).
export const PENDING_APPROVAL_LIMIT = 5;

// How many sessions `/status` reports on a route that holds more than one
// (AC-1.8). A conversation without threads collects a session per task, so the
// answer is bounded here rather than left to grow with the transcript.
export const STATUS_SESSIONS = 5;

type Scrubber = ReturnType<typeof createScrubber>;

export class Store {
  readonly db: DatabaseSync;
  private fts = true;

  constructor(
    path: string,
    private readonly scrub: Scrubber,
  ) {
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        principal TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        thread_id TEXT NOT NULL DEFAULT '',
        agent_session_id TEXT,
        title TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'idle',
        workspace TEXT NOT NULL DEFAULT '',
        agent TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS sessions_route ON sessions(chat_id, thread_id, updated_at DESC);
      CREATE TABLE IF NOT EXISTS approvals (
        id TEXT PRIMARY KEY,
        principal TEXT NOT NULL,
        session_id TEXT NOT NULL REFERENCES sessions(id),
        agent_session_id TEXT NOT NULL,
        tool_call_id TEXT NOT NULL,
        allow_option_id TEXT NOT NULL,
        reject_option_id TEXT,
        expires_at INTEGER NOT NULL,
        decision TEXT CHECK(decision IN ('allow', 'reject')),
        used_at INTEGER
      ) STRICT;
      CREATE TABLE IF NOT EXISTS audit (
        id INTEGER PRIMARY KEY,
        ts INTEGER NOT NULL,
        action TEXT NOT NULL,
        principal TEXT,
        session_id TEXT,
        result TEXT NOT NULL,
        details TEXT NOT NULL
      ) STRICT;
      CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN
        SELECT RAISE(ABORT, 'audit is append-only');
      END;
      CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN
        SELECT RAISE(ABORT, 'audit is append-only');
      END;
      CREATE TABLE IF NOT EXISTS policy_grant (
        id TEXT PRIMARY KEY,
        workspace TEXT NOT NULL,
        mode TEXT NOT NULL CHECK(mode IN ('assisted', 'trusted')),
        granted_by TEXT NOT NULL CHECK(granted_by IN ('config', 'cli', 'chat')),
        principal TEXT,
        agent_mode TEXT,
        created_at INTEGER NOT NULL,
        expires_at INTEGER,
        closed_at INTEGER,
        CHECK(mode <> 'trusted' OR expires_at IS NOT NULL)
      ) STRICT;
      CREATE INDEX IF NOT EXISTS policy_grant_open ON policy_grant(workspace, closed_at, expires_at);
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS memory_local (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        kind TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL
      ) STRICT;
    `);
    // A file from before v0.4 has sessions without the two routing columns.
    // ponytail: two PRAGMA-guarded ALTERs instead of the numbered-migration
    // ledger `docs/techstack.md` promises; build the ledger at the third one.
    const sessionColumns = new Set(
      (this.db.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>).map(
        (column) => column.name,
      ),
    );
    if (!sessionColumns.has("workspace"))
      this.db.exec("ALTER TABLE sessions ADD COLUMN workspace TEXT NOT NULL DEFAULT ''");
    if (!sessionColumns.has("agent"))
      this.db.exec("ALTER TABLE sessions ADD COLUMN agent TEXT NOT NULL DEFAULT ''");
    // A file from before v0.6 has approvals without the card's short code. The
    // partial unique index is what makes AC-3.4 the database's promise rather
    // than the generator's: two undecided rows in one session cannot share a
    // code. SQLite counts NULLs as distinct, so the pre-v0.6 rows never collide.
    const approvalColumns = new Set(
      (this.db.prepare("PRAGMA table_info(approvals)").all() as Array<{ name: string }>).map(
        (column) => column.name,
      ),
    );
    if (!approvalColumns.has("short_code"))
      this.db.exec("ALTER TABLE approvals ADD COLUMN short_code TEXT");
    this.db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS approvals_code ON approvals(session_id, short_code)
       WHERE decision IS NULL`,
    );
    // FTS5 is present in the Node builds this repo targets (measured on Node
    // v24.18.0; a unit test repeats the probe). A build without it keeps the
    // Store usable and drops `memorySearch` to LIKE matching.
    try {
      this.db.exec(
        "CREATE VIRTUAL TABLE IF NOT EXISTS memory_local_fts USING fts5(id UNINDEXED, text);",
      );
    } catch {
      this.fts = false;
    }
  }

  memoryInsert(scope: string, kind: string, text: string) {
    const id = randomBytes(6).toString("hex");
    const clean = this.scrub(text);
    this.db
      .prepare("INSERT INTO memory_local(id, scope, kind, text, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(id, scope, kind, clean, Date.now());
    if (this.fts)
      this.db.prepare("INSERT INTO memory_local_fts(id, text) VALUES (?, ?)").run(id, clean);
    return id;
  }

  memorySearch(scope: string, terms: string[], limit: number) {
    if (terms.length === 0) return this.memoryRecent(scope, limit);
    if (this.fts) {
      const match = terms.map((term) => `"${term.replaceAll('"', '""')}"`).join(" OR ");
      return this.db
        .prepare(
          `SELECT m.id, m.kind, m.text FROM memory_local_fts f
           JOIN memory_local m ON m.id = f.id
           WHERE memory_local_fts MATCH ? AND m.scope = ?
           ORDER BY rank LIMIT ?`,
        )
        .all(match, scope, limit) as Array<{ id: string; kind: string; text: string }>;
    }
    // ponytail: LIKE fallback for a Node build without FTS5 — substring match,
    // newest first, no relevance ranking. The ceiling stands until such a build
    // stops existing.
    const where = terms.map(() => "text LIKE '%' || ? || '%'").join(" OR ");
    return this.db
      .prepare(
        `SELECT id, kind, text FROM memory_local WHERE scope = ? AND (${where})
         ORDER BY created_at DESC LIMIT ?`,
      )
      .all(scope, ...terms, limit) as Array<{ id: string; kind: string; text: string }>;
  }

  memoryRecent(scope: string, limit: number) {
    return this.db
      .prepare(
        "SELECT id, kind, text FROM memory_local WHERE scope = ? ORDER BY created_at DESC LIMIT ?",
      )
      .all(scope, limit) as Array<{ id: string; kind: string; text: string }>;
  }

  memoryDelete(id: string) {
    if (this.fts) this.db.prepare("DELETE FROM memory_local_fts WHERE id = ?").run(id);
    return Number(this.db.prepare("DELETE FROM memory_local WHERE id = ?").run(id).changes);
  }

  // A window is open only while the row says so and the clock agrees. Expiry is
  // read from the row on every check, so a process that never wakes up cannot
  // leave one open.
  openGrant(grant: Omit<PolicyGrant, "id" | "createdAt" | "closedAt">) {
    const id = randomBytes(8).toString("hex");
    this.db
      .prepare(
        `INSERT INTO policy_grant(id, workspace, mode, granted_by, principal, agent_mode, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        grant.workspace,
        grant.mode,
        grant.grantedBy,
        grant.principal,
        grant.agentMode,
        Date.now(),
        grant.expiresAt,
      );
    return id;
  }

  activeGrant(workspace: string, now = Date.now()) {
    return this.db
      .prepare(
        `SELECT id, workspace, mode, granted_by AS grantedBy, principal, agent_mode AS agentMode,
                created_at AS createdAt, expires_at AS expiresAt, closed_at AS closedAt
         FROM policy_grant
         WHERE workspace = ? AND mode = 'trusted' AND closed_at IS NULL AND expires_at > ?
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get(workspace, now) as PolicyGrant | undefined;
  }

  closeGrants(workspace?: string) {
    const now = Date.now();
    return workspace === undefined
      ? this.db.prepare("UPDATE policy_grant SET closed_at = ? WHERE closed_at IS NULL").run(now)
          .changes
      : this.db
          .prepare(
            "UPDATE policy_grant SET closed_at = ? WHERE closed_at IS NULL AND workspace = ?",
          )
          .run(now, workspace).changes;
  }

  meta(key: string) {
    return (
      this.db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as
        | { value: string }
        | undefined
    )?.value;
  }

  setMeta(key: string, value: string) {
    this.db
      .prepare(
        "INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
      )
      .run(key, value, value);
  }

  /** Drop every `meta` row under a prefix, and say how many went. */
  clearMeta(prefix: string) {
    return Number(
      this.db.prepare("DELETE FROM meta WHERE key LIKE ?").run(`${prefix}%`).changes ?? 0,
    );
  }

  createSession(input: Omit<Session, "id" | "agentSessionId" | "state">) {
    const now = Date.now();
    const session: Session = {
      ...input,
      id: randomBytes(6).toString("hex"),
      agentSessionId: null,
      state: "idle",
    };
    this.db
      .prepare(
        `INSERT INTO sessions(id, principal, chat_id, thread_id, title, state, workspace, agent, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        session.id,
        session.principal,
        session.chatId,
        session.threadId,
        this.scrub(session.title),
        session.state,
        session.workspace,
        session.agent,
        now,
        now,
      );
    return session;
  }

  sessionFor(chatId: string, threadId = "") {
    return this.db
      .prepare(
        `SELECT id, principal, chat_id AS chatId, thread_id AS threadId,
                agent_session_id AS agentSessionId, title, state, workspace, agent
         FROM sessions WHERE chat_id = ? AND thread_id = ? ORDER BY updated_at DESC LIMIT 1`,
      )
      .get(chatId, threadId) as Session | undefined;
  }

  /**
   * Every session at one route, newest first. A channel without threads runs
   * all of a conversation's sessions on the same route, so this is what
   * `/status` reports there (AC-1.8); `sessionFor` above is the first row of
   * the same query.
   */
  sessionsFor(chatId: string, threadId = "", limit = STATUS_SESSIONS) {
    return this.db
      .prepare(
        `SELECT id, principal, chat_id AS chatId, thread_id AS threadId,
                agent_session_id AS agentSessionId, title, state, workspace, agent
         FROM sessions WHERE chat_id = ? AND thread_id = ?
         ORDER BY updated_at DESC LIMIT ?`,
      )
      .all(chatId, threadId, limit) as Session[];
  }

  sessionById(id: string) {
    return this.db
      .prepare(
        `SELECT id, principal, chat_id AS chatId, thread_id AS threadId,
                agent_session_id AS agentSessionId, title, state, workspace, agent
         FROM sessions WHERE id = ?`,
      )
      .get(id) as Session | undefined;
  }

  // `/switch`: the next run starts a fresh agent-side session on the new
  // preset, so the old agent session id goes with the old agent.
  setAgent(id: string, agent: string) {
    this.db
      .prepare(
        "UPDATE sessions SET agent = ?, agent_session_id = NULL, updated_at = ? WHERE id = ?",
      )
      .run(agent, Date.now(), id);
  }

  setAgentSession(id: string, agentSessionId: string) {
    this.db
      .prepare("UPDATE sessions SET agent_session_id = ?, updated_at = ? WHERE id = ?")
      .run(agentSessionId, Date.now(), id);
  }

  setState(id: string, state: string) {
    this.db
      .prepare("UPDATE sessions SET state = ?, updated_at = ? WHERE id = ?")
      .run(state, Date.now(), id);
  }

  /** How many approvals this session is still waiting on. */
  pendingApprovals(sessionId: string, now = Date.now()) {
    return (
      this.db
        .prepare(
          "SELECT COUNT(*) AS n FROM approvals WHERE session_id = ? AND decision IS NULL AND expires_at > ?",
        )
        .get(sessionId, now) as { n: number }
    ).n;
  }

  /** False when the session is already at the pending ceiling; no row is written. */
  createApproval(approval: Approval) {
    if (this.pendingApprovals(approval.sessionId) >= PENDING_APPROVAL_LIMIT) return false;
    this.db
      .prepare(
        `INSERT INTO approvals(id, principal, session_id, agent_session_id, tool_call_id,
          allow_option_id, reject_option_id, expires_at, short_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        approval.id,
        approval.principal,
        approval.sessionId,
        approval.agentSessionId,
        approval.toolCallId,
        approval.allowOptionId,
        approval.rejectOptionId,
        approval.expiresAt,
        approval.shortCode ?? null,
      );
    return true;
  }

  private approvalWhere(where: string, ...values: Array<string | number>) {
    return this.db
      .prepare(
        `SELECT id, principal, session_id AS sessionId, agent_session_id AS agentSessionId,
                tool_call_id AS toolCallId, allow_option_id AS allowOptionId,
                reject_option_id AS rejectOptionId, expires_at AS expiresAt,
                short_code AS shortCode
         FROM approvals WHERE ${where}`,
      )
      .get(...values) as Approval | undefined;
  }

  // The single-use write, and the only one there is. Both routes to a decision
  // land here, so neither can be replayed and neither can outlive the TTL.
  private decide(
    row: Approval | undefined,
    principal: string,
    sessionId: string,
    decision: "allow" | "reject",
  ) {
    const now = Date.now();
    if (!row || row.principal !== principal || row.sessionId !== sessionId || row.expiresAt < now)
      return null;
    const changed = this.db
      .prepare("UPDATE approvals SET decision = ?, used_at = ? WHERE id = ? AND decision IS NULL")
      .run(decision, now, row.id).changes;
    return changed === 1 ? row : null;
  }

  resolveApproval(id: string, principal: string, sessionId: string, decision: "allow" | "reject") {
    return this.decide(this.approvalWhere("id = ?", id), principal, sessionId, decision);
  }

  /**
   * The card's short code instead of the signed callback id. Everything past the
   * lookup is the button path: the same binding to `(principal, session)`, the
   * same TTL, the same single-use `UPDATE`.
   */
  resolveApprovalByCode(
    code: string,
    principal: string,
    sessionId: string,
    decision: "allow" | "reject",
  ) {
    return this.decide(
      this.approvalWhere("session_id = ? AND short_code = ? AND decision IS NULL", sessionId, code),
      principal,
      sessionId,
      decision,
    );
  }

  /**
   * Whether this principal was ever shown this code in this session, decided or
   * not. A second `ok A7F3` is a double tap, not a guess, so the attempt counter
   * must not eat it. The principal is part of the question: a stranger who
   * happened to type a spent code learns nothing.
   */
  usedCode(code: string, principal: string, sessionId: string) {
    const row = this.approvalWhere("session_id = ? AND short_code = ?", sessionId, code);
    return row !== undefined && row.principal === principal;
  }

  expireApprovals() {
    return this.db
      .prepare("UPDATE approvals SET decision = 'reject', used_at = ? WHERE decision IS NULL")
      .run(Date.now()).changes;
  }

  expireApproval(id: string) {
    const now = Date.now();
    return this.db
      .prepare(
        "UPDATE approvals SET decision = 'reject', used_at = ? WHERE id = ? AND decision IS NULL AND expires_at <= ?",
      )
      .run(now, id, now).changes;
  }

  audit(
    action: string,
    result: string,
    details: unknown = {},
    principal?: string,
    sessionId?: string,
  ) {
    this.db
      .prepare(
        "INSERT INTO audit(ts, action, principal, session_id, result, details) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(
        Date.now(),
        action,
        principal ?? null,
        sessionId ?? null,
        this.scrub(result),
        this.scrub(details),
      );
  }

  close() {
    this.db.close();
  }
}
