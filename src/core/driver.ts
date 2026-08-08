// The driver contract, named from the surface the gateway actually uses —
// proved sufficient by the two fakes in `test/e2e.test.ts` — not from the
// aspirational interface in `docs/design.md`. Drivers import this file; core
// never imports a driver (`AGENTS.md`: channels → core ← drivers).

/** A slash command the agent says it answers to. */
export type AgentCommand = { name: string; description: string };

/**
 * The update shapes core reads. A driver may emit more kinds on the wire; the
 * gateway reads these four and lets the rest pass unread.
 */
export type AgentUpdate = {
  sessionId: string;
  update:
    | { sessionUpdate: "agent_message_chunk"; content: { type: string; text: string } }
    | { sessionUpdate: "available_commands_update"; availableCommands: AgentCommand[] }
    | {
        sessionUpdate: "usage_update";
        used: number;
        size: number;
        cost?: { amount: number | string; currency: string } | null;
      }
    | { sessionUpdate: "tool_call"; toolCallId: string; title: string };
};

export type PermissionRequest = {
  sessionId: string;
  toolCall: {
    toolCallId: string;
    title?: string | null;
    kind?: string | null;
    rawInput?: unknown;
    locations?: Array<{ path: string }> | null;
  };
  options: Array<{ optionId: string; name: string; kind: string }>;
};

export type PermissionResponse = {
  outcome: { outcome: "cancelled" } | { outcome: "selected"; optionId: string };
};

/** The per-prompt pair of callbacks the gateway hands a driver. */
export type DriverRoute = {
  update(notification: AgentUpdate): void | Promise<void>;
  permission(request: PermissionRequest): Promise<PermissionResponse>;
};

export interface AgentDriver {
  /**
   * Whether this route hands tool permissions back to core. A route that
   * decides them itself sets it false, and a `read-only` run does not start
   * there: without the seam there is nothing for a policy mode to refuse at.
   */
  readonly asksPermission?: boolean;

  start(): Promise<void>;
  /** Returns the agent-side session id, loading `existing` when it still resolves. */
  session(existing: string | null, cwd: string): Promise<string>;
  prompt(sessionId: string, prompt: string, route: DriverRoute): Promise<{ stopReason: string }>;
  /** A driver without modes resolves without effect (the CLI path). */
  setMode(sessionId: string, modeId: string): Promise<unknown>;
  cancel(sessionId: string): Promise<unknown>;
  stop(): Promise<void>;
}

/**
 * Resolves a started, ready driver for a session's agent preset id (`""` means
 * the default) and a workspace's forced route. Selection lives behind this
 * function on the driver side; the gateway hands over the two ids and never
 * looks at what kind of driver comes back.
 */
export type DriverFor = (agent: string, forced?: "acp" | "cli") => Promise<AgentDriver>;
