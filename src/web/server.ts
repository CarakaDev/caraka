import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "../store/db.js";
import { DEVICE_COOKIE, cookie, cookieValue, hash, same, token } from "./auth.js";

const BODY_LIMIT = 20 * 1024 * 1024;
export const WEB_SUBSCRIBER_LIMIT = 20;

export function webServerOrigin(
  configuredOrigin: string,
  configuredPort: number,
  listeningPort: number,
) {
  const configured = new URL(configuredOrigin);
  return configuredPort === 0
    ? `${configured.protocol}//${configured.hostname}:${listeningPort}`
    : configured.origin;
}

class BodyTooLarge extends Error {}
type Device = { id: string; name: string; token_hash: string; revoked_at: number | null };
type Hooks = {
  pair(code: string, name: string): { id: string; token: string } | undefined;
  state(device: Device): unknown;
  message(
    device: Device,
    input: {
      clientId: string;
      roomId?: string;
      workspace?: string;
      text: string;
      files?: string[];
    },
  ): Promise<{ roomId: string; replay: boolean }>;
  callback(device: Device, input: { messageId: string; buttonId: string }): boolean | "full";
  stop(device: Device, roomId: string): boolean | "full";
  invalidated(): void;
  pushKey(): string | undefined;
  pushSubscribe(device: Device, input: unknown): boolean;
  pushRemove(device: Device): void;
};

export class WebServer {
  private server = createServer((request, response) => void this.handle(request, response));
  private origin = "";
  private subscribers = new Set<ServerResponse>();
  constructor(
    private readonly input: {
      host: string;
      port: number;
      origin: string;
      root: string;
      store: Store;
      hooks: Hooks;
    },
  ) {}
  get url() {
    return this.origin;
  }
  async start() {
    await mkdir(join(this.input.root, "web-files"), { recursive: true, mode: 0o700 });
    await new Promise<void>((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.input.port, this.input.host, () => resolve());
    });
    const address = this.server.address() as AddressInfo;
    this.origin = webServerOrigin(this.input.origin, this.input.port, address.port);
  }
  async close() {
    for (const response of this.subscribers) response.end();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }
  invalidate() {
    for (const response of this.subscribers) response.write("event: invalidate\ndata: {}\n\n");
  }
  private send(
    response: ServerResponse,
    status: number,
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    response.writeHead(status, {
      "cache-control": "no-store",
      "content-security-policy": "default-src 'self'; base-uri 'none'; frame-ancestors 'none'",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      ...headers,
      ...(body === undefined ? {} : { "content-type": "application/json; charset=utf-8" }),
    });
    response.end(body === undefined ? undefined : JSON.stringify(body));
  }
  private exactHost(request: IncomingMessage) {
    return request.headers.host === new URL(this.origin).host;
  }
  private exactOrigin(request: IncomingMessage) {
    return request.headers.origin === this.origin;
  }
  private device(request: IncomingMessage): Device | undefined {
    const value = cookieValue(request.headers.cookie);
    if (!value) return undefined;
    const row = this.input.store.db
      .prepare("SELECT id, name, token_hash, revoked_at FROM web_devices WHERE token_hash = ?")
      .get(hash(value)) as Device | undefined;
    return row && row.revoked_at === null && same(value, row.token_hash) ? row : undefined;
  }
  private async json(request: IncomingMessage) {
    const raw = await this.body(request, 256 * 1024);
    try {
      return JSON.parse(raw.toString("utf8")) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }
  private body(request: IncomingMessage, limit: number) {
    return new Promise<Buffer>((resolve, reject) => {
      const parts: Buffer[] = [];
      let size = 0;
      let ended = false;
      request.on("data", (part: Buffer) => {
        if (ended) return;
        size += part.length;
        if (size > limit) {
          ended = true;
          request.resume();
          reject(new BodyTooLarge());
          return;
        }
        parts.push(part);
      });
      request.on("end", () => {
        if (!ended) resolve(Buffer.concat(parts));
      });
      request.on("error", reject);
    });
  }
  private authenticated(request: IncomingMessage, response: ServerResponse, changing = false) {
    if (!this.exactHost(request)) {
      this.send(response, 421, { error: "host" });
      return;
    }
    if (changing && !this.exactOrigin(request)) {
      this.send(response, 403, { error: "origin" });
      return;
    }
    const device = this.device(request);
    if (!device) {
      this.send(response, 401, { error: "authentication" });
      return;
    }
    return device;
  }
  private async handle(request: IncomingMessage, response: ServerResponse) {
    try {
      await this.route(request, response);
    } catch (error) {
      if (!response.headersSent)
        this.send(response, error instanceof BodyTooLarge ? 413 : 400, { error: "body" });
    }
  }
  private async route(request: IncomingMessage, response: ServerResponse) {
    const method = request.method ?? "GET";
    const url = new URL(request.url ?? "/", this.origin || this.input.origin);
    if (!this.exactHost(request)) return this.send(response, 421, { error: "host" });
    if (method === "GET" && url.pathname === "/health")
      return this.send(response, 200, { ok: true });
    if (method === "POST" && url.pathname === "/api/pair") {
      if (!this.exactOrigin(request)) return this.send(response, 403, { error: "origin" });
      const body = await this.json(request);
      const value = typeof body?.code === "string" ? body.code : "";
      const name = typeof body?.name === "string" ? body.name.slice(0, 80) : "";
      const paired = name ? this.input.hooks.pair(value, name) : undefined;
      if (!paired) return this.send(response, 401, { error: "pairing" });
      return this.send(
        response,
        200,
        { device: { id: paired.id, name } },
        { "set-cookie": cookie(paired.token, this.origin.startsWith("https:")) },
      );
    }
    if (method === "GET" && url.pathname === "/api/state") {
      const device = this.authenticated(request, response);
      if (!device) return;
      return this.send(response, 200, this.input.hooks.state(device));
    }
    if (method === "GET" && url.pathname === "/api/events") {
      const device = this.authenticated(request, response);
      if (!device) return;
      if (this.subscribers.size >= WEB_SUBSCRIBER_LIMIT)
        return this.send(response, 429, { error: "events busy" });
      response.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-store",
        connection: "keep-alive",
        "x-content-type-options": "nosniff",
      });
      response.write("event: ready\ndata: {}\n\n");
      this.subscribers.add(response);
      request.once("close", () => this.subscribers.delete(response));
      return;
    }
    if (method === "POST" && url.pathname === "/api/messages") {
      const device = this.authenticated(request, response, true);
      if (!device) return;
      const body = await this.json(request);
      if (!body || typeof body.clientId !== "string" || typeof body.text !== "string")
        return this.send(response, 400, { error: "body" });
      try {
        const result = await this.input.hooks.message(device, {
          clientId: body.clientId,
          ...(typeof body.roomId === "string" ? { roomId: body.roomId } : {}),
          ...(typeof body.workspace === "string" ? { workspace: body.workspace } : {}),
          text: body.text.slice(0, 100_000),
          ...(Array.isArray(body.files)
            ? { files: body.files.filter((value): value is string => typeof value === "string") }
            : {}),
        });
        return this.send(response, result.replay ? 200 : 202, {
          roomId: result.roomId,
          replay: result.replay,
        });
      } catch (error) {
        return this.send(
          response,
          error instanceof Error && error.name === "WebQueueFull" ? 429 : 404,
          {
            error:
              error instanceof Error && error.name === "WebQueueFull"
                ? "queue busy"
                : "room, workspace, or file",
          },
        );
      }
    }
    if (method === "POST" && url.pathname === "/api/callback") {
      const device = this.authenticated(request, response, true);
      if (!device) return;
      const body = await this.json(request);
      if (!body || typeof body.messageId !== "string" || typeof body.buttonId !== "string")
        return this.send(response, 400, { error: "body" });
      const result = this.input.hooks.callback(device, {
        messageId: body.messageId,
        buttonId: body.buttonId,
      });
      return this.send(response, result === "full" ? 429 : result ? 202 : 409, {});
    }
    if (method === "POST" && url.pathname === "/api/stop") {
      const device = this.authenticated(request, response, true);
      if (!device) return;
      const body = await this.json(request);
      const result =
        typeof body?.roomId === "string" ? this.input.hooks.stop(device, body.roomId) : false;
      return this.send(response, result === "full" ? 429 : result ? 202 : 404, {});
    }
    if (method === "POST" && url.pathname === "/api/logout") {
      const device = this.authenticated(request, response, true);
      if (!device) return;
      this.input.store.db
        .prepare("UPDATE web_devices SET revoked_at = ? WHERE id = ?")
        .run(Date.now(), device.id);
      this.input.hooks.invalidated();
      return this.send(
        response,
        200,
        {},
        { "set-cookie": `${DEVICE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict` },
      );
    }
    if (method === "GET" && url.pathname === "/api/devices") {
      const device = this.authenticated(request, response);
      if (!device) return;
      const devices = this.input.store.db
        .prepare(
          "SELECT id, name, created_at AS createdAt FROM web_devices WHERE revoked_at IS NULL ORDER BY created_at DESC",
        )
        .all();
      return this.send(response, 200, { devices });
    }
    if (method === "DELETE" && /^\/api\/devices\/[^/]+$/.test(url.pathname)) {
      const device = this.authenticated(request, response, true);
      if (!device) return;
      const id = decodeURIComponent(url.pathname.split("/").pop() ?? "");
      this.input.store.db
        .prepare("UPDATE web_devices SET revoked_at = ? WHERE id = ?")
        .run(Date.now(), id);
      this.input.hooks.invalidated();
      return this.send(response, 200, {});
    }
    if (method === "POST" && url.pathname === "/api/files") {
      const device = this.authenticated(request, response, true);
      if (!device) return;
      try {
        const bytes = await this.body(request, BODY_LIMIT);
        const name = basename(url.searchParams.get("name") ?? "upload");
        const id = token().slice(0, 16);
        const path = join(this.input.root, "web-files", id);
        await writeFile(path, bytes, { mode: 0o600 });
        this.input.store.db
          .prepare("INSERT INTO web_files(id,name,mime,path,created_at) VALUES(?,?,?,?,?)")
          .run(
            id,
            name,
            request.headers["content-type"]?.split(";")[0] ?? "application/octet-stream",
            path,
            Date.now(),
          );
        return this.send(response, 201, { id, name });
      } catch {
        return this.send(response, 413, { error: "file" });
      }
    }
    if (method === "GET" && url.pathname.startsWith("/api/files/")) {
      const device = this.authenticated(request, response);
      if (!device) return;
      const id = decodeURIComponent(url.pathname.slice("/api/files/".length));
      const file = this.input.store.db
        .prepare("SELECT name,mime,path FROM web_files WHERE id = ?")
        .get(id) as { name: string; mime: string; path: string } | undefined;
      if (!file) return this.send(response, 404, { error: "file" });
      const bytes = await readFile(file.path).catch(() => undefined);
      if (!bytes) return this.send(response, 404, { error: "file" });
      response.writeHead(200, {
        "content-type": file.mime,
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      });
      return response.end(bytes);
    }
    if (method === "GET" && url.pathname === "/api/push/key") {
      const device = this.authenticated(request, response, method !== "GET");
      if (!device) return;
      const publicKey = this.input.hooks.pushKey();
      return publicKey
        ? this.send(response, 200, { publicKey })
        : this.send(response, 503, { available: false, message: "Web Push is not configured." });
    }
    if (method === "POST" && url.pathname === "/api/push") {
      const device = this.authenticated(request, response, true);
      if (!device) return;
      if (!this.input.hooks.pushKey())
        return this.send(response, 503, {
          available: false,
          message: "Web Push is not configured.",
        });
      return this.send(
        response,
        this.input.hooks.pushSubscribe(device, await this.json(request)) ? 201 : 400,
        {},
      );
    }
    if (method === "DELETE" && url.pathname === "/api/push") {
      const device = this.authenticated(request, response, true);
      if (!device) return;
      this.input.hooks.pushRemove(device);
      return this.send(response, 200, {});
    }
    const assets = new Map([
      ["/", "index.html"],
      ["/app.js", "app.js"],
      ["/app.css", "app.css"],
      ["/manifest.webmanifest", "manifest.webmanifest"],
      ["/sw.js", "sw.js"],
      ["/icon.svg", "icon.svg"],
      ["/icon-512.png", "icon-512.png"],
      ["/icon-192.png", "icon-192.png"],
      ["/fonts/public-sans.woff2", "fonts/public-sans.woff2"],
      ["/fonts/jetbrains-mono.woff2", "fonts/jetbrains-mono.woff2"],
      ["/fonts/Public-Sans-LICENSE.txt", "fonts/Public-Sans-LICENSE.txt"],
      ["/fonts/JetBrains-Mono-LICENSE.txt", "fonts/JetBrains-Mono-LICENSE.txt"],
    ]);
    const asset = method === "GET" ? assets.get(url.pathname) : undefined;
    if (asset) {
      const path = fileURLToPath(new URL(`../../assets/web/${asset}`, import.meta.url));
      const bytes = await readFile(path).catch(() => undefined);
      if (!bytes) return this.send(response, 503, { error: "Web assets are not installed yet." });
      const type = asset.endsWith(".js")
        ? "text/javascript"
        : asset.endsWith(".css")
          ? "text/css"
          : asset.endsWith(".svg")
            ? "image/svg+xml"
            : asset.endsWith(".webmanifest")
              ? "application/manifest+json"
              : asset.endsWith(".png")
                ? "image/png"
                : asset.endsWith(".woff2")
                  ? "font/woff2"
                  : asset.endsWith(".txt")
                    ? "text/plain"
                    : "text/html";
      response.writeHead(200, {
        "content-type": type.startsWith("text/") ? `${type}; charset=utf-8` : type,
        "content-security-policy":
          "default-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      });
      return response.end(bytes);
    }
    if (method === "GET" && !url.pathname.startsWith("/api/"))
      return this.send(response, 404, { error: "asset" });
    return this.send(response, 404, { error: "route" });
  }
}
