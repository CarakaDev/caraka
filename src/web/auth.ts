import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const DEVICE_COOKIE = "caraka_device";
export const PAIR_TTL_MS = 5 * 60_000;

export function token() {
  return randomBytes(32).toString("base64url");
}

export function code() {
  return randomBytes(9).toString("base64url");
}

export function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function same(value: string, expectedHash: string) {
  const actual = Buffer.from(hash(value), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function cookie(value: string, secure: boolean) {
  return `${DEVICE_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`;
}

export function cookieValue(header: string | undefined) {
  return header
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${DEVICE_COOKIE}=`))
    ?.slice(DEVICE_COOKIE.length + 1);
}
