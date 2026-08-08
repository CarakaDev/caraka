import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const fixedSecretPatterns: Array<[RegExp, string]> = [
  [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    "[REDACTED]",
  ],
  [/\b\d{6,12}:[A-Za-z0-9_-]{30,}\b/g, "[REDACTED]"],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[REDACTED]"],
  // A Discord bot token is three base64url parts joined by dots — the bot's own
  // id, a timestamp, and a signature — and it does not start with `eyJ`, so the
  // JWT pattern above never sees it. Lengths alone are not enough of a shape:
  // `django_rest_framework_ext.models.serializer_helper_functions` fits them,
  // and a scrubber that eats ordinary dotted identifiers corrupts every message
  // and every log line it touches. The first part is base64 of a snowflake, so
  // it always begins with M, N, or O and runs 24 to 26 characters, and the
  // timestamp part is exactly 6.
  [/\b[MNO][A-Za-z0-9_-]{22,25}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{25,}\b/g, "[REDACTED]"],
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

// `spec/whatsapp-v06.md` §7: 4 characters over a 32-symbol alphabet, so 2^20
// codes. `I`, `O`, `0`, and `1` are absent because the code is read off a screen
// and typed back on a phone.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const APPROVAL_CODE_LENGTH = 4;
// `spec/whatsapp-v06.md` §7, spec-set: five wrong codes per session per TTL.
// With five live codes at most, that is 25 chances in 2^20 inside ten minutes.
export const APPROVAL_CODE_ATTEMPTS = 5;
/** What a code-shaped reply looks like. Case is not part of the code. */
export const APPROVAL_CODE_REPLY = new RegExp(
  `^(ok|no)[\\s:]+([${CODE_ALPHABET}${CODE_ALPHABET.toLowerCase()}]{${APPROVAL_CODE_LENGTH}})$`,
  "i",
);

/**
 * The card's short code: random material of its own, not a slice of a MAC. The
 * alphabet has 32 symbols and a byte has 256 values, so the modulo is uniform
 * and rejection sampling would buy nothing.
 */
export function shortCode() {
  return Array.from(
    randomBytes(APPROVAL_CODE_LENGTH),
    (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length],
  ).join("");
}

export function callbackPurpose(callback: string): CallbackPurpose | null {
  const head = callback.slice(0, 2);
  return head === "c:" || head === "t:" || head === "g:" ? (head[0] as CallbackPurpose) : null;
}

/** `docs/security.md` §5 names these three, and nothing names a fourth. */
export const POLICY_MODES = ["read-only", "assisted", "trusted"] as const;
export type PolicyMode = (typeof POLICY_MODES)[number];

/**
 * The mode a run answers to, resolved per (channel, container, principal). The
 * map belongs to one channel, so an id is never read against another channel's.
 * What the config does not name falls to the documented default: `assisted` in
 * a private conversation, `read-only` wherever a room reads along, because a
 * room never gets write or execute without an explicit opt-in (§4, control 6).
 * A principal key answers only in a private conversation — in a room the
 * container's own entry is the opt-in, and nothing else stands in for it.
 */
export function resolvePolicyMode(
  modes: Map<string, PolicyMode> | undefined,
  container: string,
  principal: string,
  isPrivate: boolean,
): PolicyMode {
  const named = modes?.get(container) ?? (isPrivate ? modes?.get(principal) : undefined);
  return named ?? (isPrivate ? "assisted" : "read-only");
}

// The tool kinds that only observe. A request carrying any other kind, none at
// all included, changes something: an unrecognised tool is not evidence that it
// is harmless, so read-only refuses it.
const readingKinds = new Set(["read", "search", "think", "fetch"]);

// The payload fields no read carries. `kind` is a label the agent writes, and
// T1/T2 in `docs/security.md` §2 both end with an agent that writes what suits
// it, so the label clears the gate only when the payload agrees with it.
const writingFields = ["command", "content", "new_string", "old_string", "edits", "patch"];

/** True when `read-only` has to refuse this request outright. */
export function writesOrExecutes(request: {
  toolCall?: { kind?: string | null; rawInput?: unknown };
}) {
  if (!readingKinds.has(request.toolCall?.kind ?? "")) return true;
  const raw = request.toolCall?.rawInput;
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return writingFields.some((field) => {
    const value = input[field];
    return (typeof value === "string" && value !== "") || Array.isArray(value);
  });
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
 * The permission response that selects an option, and the one that cancels when
 * there is no option to select. Ten call sites across the gateway and the guard
 * below wrote the pair out; the answer to "what happens when the agent offered
 * no `reject_once`" is now in one place rather than restated at each of them.
 */
export function chooseOption<Response>(optionId: string | null | undefined): Response {
  return (
    optionId
      ? { outcome: { outcome: "selected", optionId } }
      : { outcome: { outcome: "cancelled" } }
  ) as Response;
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
  return chooseOption<Response>(
    request.options.find((option) => option.kind === "reject_once")?.optionId,
  );
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
