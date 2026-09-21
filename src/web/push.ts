import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import webpush, { type PushSubscription, type VapidKeys } from "web-push";
import type { Store } from "../store/db.js";

const ENDPOINT_HOSTS = new Set([
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
  "wns.notify.windows.com",
  "wns2.notify.windows.com",
]);
const KEY_LIMIT = 512;
const SEND_TIMEOUT_MS = 10_000;
const PAYLOAD = JSON.stringify({ title: "Caraka", body: "Task activity needs your attention." });

export type StoredSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type PushSender = (
  subscription: PushSubscription,
  payload: string,
  options: { TTL: number; timeout: number; vapidDetails: VapidKeys & { subject: string } },
) => Promise<unknown>;

function validKey(value: unknown) {
  return typeof value === "string" && value.length > 0 && value.length <= KEY_LIMIT;
}

export function validSubscription(input: unknown): input is StoredSubscription {
  if (!input || typeof input !== "object") return false;
  const value = input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (
    typeof value.endpoint !== "string" ||
    !validKey(value.keys?.p256dh) ||
    !validKey(value.keys?.auth)
  )
    return false;
  let endpoint: URL;
  try {
    endpoint = new URL(value.endpoint);
  } catch {
    return false;
  }
  return endpoint.protocol === "https:" && ENDPOINT_HOSTS.has(endpoint.hostname);
}

export class PushService {
  private keys: VapidKeys | undefined;
  private failure = "Web Push is not configured.";
  constructor(
    private readonly input: {
      store: Store;
      keyPath: string;
      origin: string;
      send?: PushSender;
      generate?: () => VapidKeys;
    },
  ) {}
  async start() {
    try {
      await mkdir(dirname(this.input.keyPath), { recursive: true, mode: 0o700 });
      await chmod(dirname(this.input.keyPath), 0o700);
      let keys: VapidKeys | undefined;
      try {
        keys = JSON.parse(await readFile(this.input.keyPath, "utf8")) as VapidKeys;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      keys ??= (this.input.generate ?? webpush.generateVAPIDKeys)();
      if (!validKey(keys.publicKey) || !validKey(keys.privateKey)) throw new Error("VAPID key");
      if (!(await readFile(this.input.keyPath, "utf8").catch(() => ""))) {
        await writeFile(this.input.keyPath, JSON.stringify(keys), { mode: 0o600 });
        await chmod(this.input.keyPath, 0o600);
      }
      this.keys = keys;
      this.failure = "";
    } catch {
      this.keys = undefined;
      this.failure = "Web Push keys could not be loaded.";
    }
  }
  state() {
    return this.keys
      ? { available: true, publicKey: this.keys.publicKey }
      : { available: false, message: this.failure };
  }
  subscribe(deviceId: string, input: unknown) {
    if (!validSubscription(input)) return false;
    const subscription = input as StoredSubscription;
    this.input.store.db
      .prepare(
        `INSERT INTO web_push_subscriptions(device_id,endpoint,p256dh,auth,created_at)
         VALUES(?,?,?,?,?)
         ON CONFLICT(device_id,endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, created_at = excluded.created_at`,
      )
      .run(
        deviceId,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
        Date.now(),
      );
    return true;
  }
  unsubscribe(deviceId: string) {
    this.input.store.db
      .prepare("DELETE FROM web_push_subscriptions WHERE device_id = ?")
      .run(deviceId);
  }
  async notify() {
    if (!this.keys) return;
    const rows = this.input.store.db
      .prepare(
        `SELECT s.device_id AS deviceId,s.endpoint,s.p256dh,s.auth FROM web_push_subscriptions s
         JOIN web_devices d ON d.id = s.device_id WHERE d.revoked_at IS NULL`,
      )
      .all() as Array<{ deviceId: string; endpoint: string; p256dh: string; auth: string }>;
    for (const row of rows) {
      try {
        await (this.input.send ?? webpush.sendNotification)(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          PAYLOAD,
          {
            TTL: 60,
            timeout: SEND_TIMEOUT_MS,
            vapidDetails: { ...this.keys, subject: this.input.origin },
          },
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410)
          this.input.store.db
            .prepare("DELETE FROM web_push_subscriptions WHERE device_id = ? AND endpoint = ?")
            .run(row.deviceId, row.endpoint);
      }
    }
  }
}
