// The driver contract, named from the surface the gateway actually uses —
// proved sufficient by the two fakes in `test/e2e.test.ts` — not from the
// aspirational interface in `docs/design.md`. Drivers import this file; core
// never imports a driver (`AGENTS.md`: channels → core ← drivers).

/** A slash command the agent says it answers to. */
export type AgentCommand = { name: string; description: string };

/**
 * One item of agent output. ACP defines five — text, image, audio,
 * resource_link, resource — and the same union is used in both directions, so
 * this is the shape `imageBlock` in the ACP driver already builds going out.
 * Only the two core can do something with are named; the rest arrive as a bare
 * `type` and are answered by the sentence that names them.
 */
export type AgentContent =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string; uri?: string | null }
  | { type: string };

/**
 * The update shapes core reads. A driver may emit more kinds on the wire; the
 * gateway reads these five and lets the rest pass unread.
 *
 * `tool_call` carries `content` and `tool_call_update` exists at all because
 * that is where an image is most often born: an agent that draws a chart does
 * it inside a tool and hands the bytes back as tool output. Declaring only
 * `{toolCallId, title}` meant the block was gone before any reader could see
 * it, which is a second, quieter loss than the one in `agent_message_chunk`.
 */
export type ToolCallContent = { type: "content"; content: AgentContent } | { type: string };

export type AgentUpdate = {
  sessionId: string;
  update:
    | { sessionUpdate: "agent_message_chunk"; content: AgentContent }
    | { sessionUpdate: "available_commands_update"; availableCommands: AgentCommand[] }
    | {
        sessionUpdate: "usage_update";
        used: number;
        size: number;
        cost?: { amount: number | string; currency: string } | null;
      }
    | {
        sessionUpdate: "tool_call";
        toolCallId: string;
        title: string;
        content?: ToolCallContent[] | null;
      }
    | {
        sessionUpdate: "tool_call_update";
        toolCallId: string;
        title?: string | null;
        content?: ToolCallContent[] | null;
      };
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

/**
 * The agent a run falls back to when neither the session nor its workspace names
 * one. It lives here rather than in `cli.ts` because core has to be able to say
 * it out loud: the sentence a person reads while a task runs names the agent
 * doing the work, and `""` is not a name.
 */
export const DEFAULT_AGENT = "claude-code";

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

  /**
   * Whether this route can put a file in front of the agent. Left unset means it
   * cannot, and core answers the sender with one sentence rather than downloading
   * bytes nothing will read (AC-2.4).
   */
  readonly acceptsFiles?: boolean;

  start(): Promise<void>;
  /** Returns the agent-side session id, loading `existing` when it still resolves. */
  session(existing: string | null, cwd: string): Promise<string>;
  prompt(
    sessionId: string,
    prompt: string,
    route: DriverRoute,
    files?: string[],
  ): Promise<{ stopReason: string }>;
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
