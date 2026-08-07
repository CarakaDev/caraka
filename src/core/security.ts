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

function signature(key: Buffer, id: string, decision: "allow" | "reject") {
  return createHmac("sha256", key).update(`${id}.${decision}`).digest("base64url").slice(0, 16);
}

export function approvalCallbacks(key: Buffer) {
  const id = randomBytes(9).toString("base64url");
  return {
    id,
    allow: `c:${id}:a:${signature(key, id, "allow")}`,
    reject: `c:${id}:r:${signature(key, id, "reject")}`,
  };
}

export function verifyApprovalCallback(key: Buffer, callback: string) {
  const match = /^c:([A-Za-z0-9_-]{12}):(a|r):([A-Za-z0-9_-]{16})$/.exec(callback);
  if (!match) return null;
  const [, id, action, supplied] = match;
  if (!id || !action || !supplied) return null;
  const decision = action === "a" ? "allow" : "reject";
  const expected = signature(key, id, decision);
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return { id, decision } as const;
}
