import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const fixedSecretPatterns: Array<[RegExp, string]> = [
  [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    "[REDACTED]",
  ],
  [/\b\d{6,12}:[A-Za-z0-9_-]{30,}\b/g, "[REDACTED]"],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[REDACTED]"],
  [/\b(?:sk-ant-|sk-proj-|ghp_|github_pat_|xox[baprs]-|AKIA)[A-Za-z0-9_-]{12,}\b/g, "[REDACTED]"],
  [
    /\b([A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|API_KEY|PRIVATE_KEY))\s*=\s*([^\s]+)/g,
    "$1=[REDACTED]",
  ],
];

export function createScrubber(secrets: string[] = []) {
  const exact = secrets.filter((secret) => secret.length >= 8);
  return (input: unknown) => {
    let value: string;
    try {
      value = typeof input === "string" ? input : (JSON.stringify(input) ?? String(input));
    } catch {
      value = String(input);
    }
    for (const secret of exact) value = value.split(secret).join("[REDACTED]");
    for (const [pattern, replacement] of fixedSecretPatterns)
      value = value.replace(pattern, replacement);
    return value;
  };
}

function signature(key: Buffer, prefix: string, id: string, decision: "allow" | "reject") {
  return createHmac("sha256", key)
    .update(`${prefix}.${id}.${decision}`)
    .digest("base64url")
    .slice(0, 16);
}

// `c` signs approvals, `t` a trust window, `g` a group joining the chat allowlist.
// The prefix is inside the HMAC, so a callback signed for one purpose cannot be
// replayed as another.
export type CallbackPurpose = "c" | "t" | "g";

export function approvalCallbacks(key: Buffer, prefix: CallbackPurpose = "c") {
  const id = randomBytes(9).toString("base64url");
  return {
    id,
    allow: `${prefix}:${id}:a:${signature(key, prefix, id, "allow")}`,
    reject: `${prefix}:${id}:r:${signature(key, prefix, id, "reject")}`,
  };
}

export function verifyApprovalCallback(
  key: Buffer,
  callback: string,
  prefix: CallbackPurpose = "c",
) {
  const match = new RegExp(`^${prefix}:([A-Za-z0-9_-]{12}):(a|r):([A-Za-z0-9_-]{16})$`).exec(
    callback,
  );
  if (!match) return null;
  const [, id, action, supplied] = match;
  if (!id || !action || !supplied) return null;
  const decision = action === "a" ? "allow" : "reject";
  const expected = signature(key, prefix, id, decision);
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return { id, decision } as const;
}

export function callbackPurpose(callback: string): CallbackPurpose | null {
  const head = callback.slice(0, 2);
  return head === "c:" || head === "t:" || head === "g:" ? (head[0] as CallbackPurpose) : null;
}

// A trust window is bounded by the clock, and the bound is the same number
// whether the terminal or a signed callback opened it.
export const trustLimitMinutes = 60;

export function parseDuration(input: string | undefined) {
  const match = /^(\d{1,4})\s*(m|min|menit|h|jam|hour|hours)?$/i.exec(input?.trim() ?? "");
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  const unit = match[2]?.toLowerCase() ?? "m";
  const minutes = unit.startsWith("h") || unit === "jam" ? value * 60 : value;
  return minutes > 0 ? minutes : null;
}

// Mode ids that hand the decision to the agent. Caraka never selects one, and
// never selects an option that outlives the single request it answers. The
// terminal path in `cli.ts` is the only place `bypassPermissions` is written,
// and it writes it to the database, not to a permission response.
const cedingOptionIds = new Set(["bypassPermissions", "acceptEdits", "auto", "dontAsk"]);

/** True for an option id that would leave standing permission behind. */
export function cedesPermission(optionId: string) {
  return cedingOptionIds.has(optionId);
}

/**
 * The last thing a permission response passes through. A response that would
 * cede standing permission is replaced by `reject_once`, whether the option came
 * from a button, a timer, or a trust window.
 */
export function guardPermission<
  Request extends { options: Array<{ optionId: string; kind?: string }> },
  Response extends { outcome: { outcome: string; optionId?: string } },
>(request: Request, response: Response): Response {
  const { outcome } = response;
  if (outcome.outcome !== "selected" || !outcome.optionId) return response;
  const chosen = request.options.find((option) => option.optionId === outcome.optionId);
  if (!cedesPermission(outcome.optionId) && chosen?.kind !== "allow_always") return response;
  const reject = request.options.find((option) => option.kind === "reject_once");
  return (
    reject
      ? { outcome: { outcome: "selected", optionId: reject.optionId } }
      : { outcome: { outcome: "cancelled" } }
  ) as Response;
}

// `docs/security.md` §5. These keep their buttons inside a trust window.
const highRiskPatterns = [
  /\bgit\s+push\b[^\n]*--force/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\brm\s+-[a-z]*[rf]/i,
  /\brmdir\b/i,
  /\b(?:prisma|drizzle-kit|alembic|knex|rails|sequelize)\b[^\n]*\bmigrat/i,
  /\bterraform\s+(?:apply|destroy)\b/i,
  /\bkubectl\s+(?:apply|delete)\b/i,
  /\b(?:vercel|wrangler|netlify|fly|heroku)\b[^\n]*\bdeploy\b/i,
  /\|\s*(?:sudo\s+)?(?:ba)?sh\b/,
  /\b(?:curl|wget)\b/i,
];

const highRiskPaths = [
  /(^|\/)\.(?:ssh|aws|config)(\/|$)/,
  /\.env(\.|$)/,
  /\.pem$/,
  /(^|\/)id_[^/]*$/,
];

/**
 * True when the request must keep its buttons even inside a trust window. It
 * reads the command string and the paths, so a tool call that carries neither
 * is judged ordinary — the list is a floor under the trust window, not a
 * complete model of danger.
 */
export function isHighRisk(request: {
  toolCall?: {
    kind?: string | null;
    rawInput?: unknown;
    locations?: Array<{ path?: string | null }> | null;
  };
}): boolean {
  const call = request.toolCall;
  const raw = call?.rawInput;
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const command = typeof input.command === "string" ? input.command : "";
  if (command && highRiskPatterns.some((pattern) => pattern.test(command))) return true;
  const paths = [
    ...(call?.locations?.map((item) => item.path) ?? []),
    ...["path", "file_path", "notebook_path"].map((key) =>
      typeof input[key] === "string" ? input[key] : undefined,
    ),
  ].filter((value): value is string => typeof value === "string");
  return paths.some((path) => highRiskPaths.some((pattern) => pattern.test(path)));
}
