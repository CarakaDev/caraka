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
};

type Scrubber = ReturnType<typeof createScrubber>;

export class Store {
  readonly db: DatabaseSync;

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
    `);
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
        `INSERT INTO sessions(id, principal, chat_id, thread_id, title, state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        session.id,
        session.principal,
        session.chatId,
        session.threadId,
        this.scrub(session.title),
        session.state,
        now,
        now,
      );
    return session;
  }

  sessionFor(chatId: string, threadId = "") {
    return this.db
      .prepare(
        `SELECT id, principal, chat_id AS chatId, thread_id AS threadId,
                agent_session_id AS agentSessionId, title, state
         FROM sessions WHERE chat_id = ? AND thread_id = ? ORDER BY updated_at DESC LIMIT 1`,
      )
      .get(chatId, threadId) as Session | undefined;
  }

  sessionById(id: string) {
    return this.db
      .prepare(
        `SELECT id, principal, chat_id AS chatId, thread_id AS threadId,
                agent_session_id AS agentSessionId, title, state FROM sessions WHERE id = ?`,
      )
      .get(id) as Session | undefined;
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

  createApproval(approval: Approval) {
    this.db
      .prepare(
        `INSERT INTO approvals(id, principal, session_id, agent_session_id, tool_call_id,
          allow_option_id, reject_option_id, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
      );
  }

  resolveApproval(id: string, principal: string, sessionId: string, decision: "allow" | "reject") {
    const now = Date.now();
    const row = this.db
      .prepare(
        `SELECT id, principal, session_id AS sessionId, agent_session_id AS agentSessionId,
                tool_call_id AS toolCallId, allow_option_id AS allowOptionId,
                reject_option_id AS rejectOptionId, expires_at AS expiresAt
         FROM approvals WHERE id = ?`,
      )
      .get(id) as Approval | undefined;
    if (!row || row.principal !== principal || row.sessionId !== sessionId || row.expiresAt < now)
      return null;
    const changed = this.db
      .prepare("UPDATE approvals SET decision = ?, used_at = ? WHERE id = ? AND decision IS NULL")
      .run(decision, now, id).changes;
    return changed === 1 ? row : null;
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
