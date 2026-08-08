/**
 * The read-only dashboard: a `node:http` listener on the loopback address, one
 * SQLite handle opened `readOnly`, and seven pages of tables.
 *
 * Two properties hold it together. The database engine refuses a write, so a
 * route that ever tried one would fail loudly instead of succeeding quietly; and
 * every HTML byte leaves through the outbound scrubber, so a secret that reached
 * a row before the scrubber knew its shape still never reaches a browser.
 *
 * There is no authentication. Reaching the port is the whole gate, and the real
 * boundary is the permission on the database file — written down as a limit in
 * `docs/security.md` §12 rather than left implied. Reaching the port means
 * reaching it as the address it was bound to: see `hostAllowed` below.
 */
import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { isIP } from "node:net";
import { DatabaseSync } from "node:sqlite";
import { translator, type MessageKey, type Translate } from "../i18n.js";
import {
  approvals,
  approvalStatus,
  audit,
  beta,
  grantOpen,
  grants,
  memories,
  runs,
  sessions,
  windowOf,
  windowStart,
} from "./queries.js";
import {
  cell,
  duration,
  escapeHtml,
  notice,
  page,
  panel,
  stamp,
  statusCell,
  table,
} from "./render.js";

/** Loopback, spelled the four ways a person types it. Shared with `doctor`. */
export const LOOPBACK_HOSTS = ["127.0.0.1", "localhost", "[::1]", "::1"];

/**
 * Chosen next to Titen on 127.0.0.1:7717 so the local Caraka services sit side
 * by side, and far below the ephemeral range Linux allocates from (32768 on the
 * machine this was measured on, 8 August 2026).
 */
export const DEFAULT_PORT = 7718;

/**
 * `connect-src 'self'` is here and not in the spec's first draft: htmx swaps a
 * panel over XHR, and `default-src 'none'` blocks that with nothing to fall back
 * to. Same-origin is the whole allowance; no third-party host is reachable from
 * this page under any directive.
 */
export const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; " +
  "base-uri 'none'; form-action 'none'";

/**
 * Whether a request may be answered at all, read from its `Host` header.
 *
 * Binding to loopback keeps other machines out; it does not keep a browser out.
 * A page the operator visits can point its own hostname at 127.0.0.1, and the
 * browser then treats this server as that page's origin and lets it read every
 * panel — DNS rebinding, and the reason `Reaching the port is the whole gate`
 * needs this qualifier. Rebinding needs a *name*, so a name is what is refused:
 * an address literal cannot be rebound, and `localhost` cannot be claimed by
 * anyone. Nothing here depends on the port, which the attacker's page controls
 * no better than the name.
 *
 * A dashboard started with `--bind` off the loopback list skips this: the
 * remote route `docs/security.md` T7 describes reaches it through Tailscale or
 * WireGuard, which is a name, and that operator took the warning the command
 * printed.
 */
export function hostAllowed(host: string | undefined) {
  if (!host) return false;
  const name = host.startsWith("[") ? host.slice(1, host.indexOf("]")) : host.replace(/:\d+$/, "");
  return name === "localhost" || isIP(name) > 0;
}

export type DashboardOptions = {
  dbPath: string;
  scrub: (input: unknown) => string;
  t: Translate;
  version: string;
  memoryProvider: string;
  /** `--bind` named an address off the loopback list. See `hostAllowed`. */
  exposed?: boolean;
};

type Panel = (context: { db: DatabaseSync; url: URL; now: number }, o: DashboardOptions) => string;

/**
 * The column names, read off the catalog rather than listed again here: every
 * `dash.col.` key is a column and nothing else is, so a heading that has no
 * string fails `tsc` the way the long form did.
 */
type ColumnOf<Key> = Key extends `dash.col.${infer Name}` ? Name : never;

/** The header row of a table, with the `dash.col.` prefix written once. */
function heads(o: DashboardOptions, ...names: Array<ColumnOf<MessageKey>>) {
  return names.map((name) => o.t(`dash.col.${name}`));
}

/**
 * Both files ship inside the package, so the page works with no network at all
 * and never contacts an origin the operator did not start. They are the one
 * response the scrubber does not touch: they carry no database content, and a
 * secret-shaped run of characters inside minified JavaScript would be rewritten
 * into a broken script (a unit test pins the bytes against the packaged file).
 */
const ASSETS: Record<string, { name: string; type: string }> = {
  "/assets/htmx.min.js": { name: "htmx.min.js", type: "text/javascript; charset=utf-8" },
  "/assets/dashboard.css": { name: "dashboard.css", type: "text/css; charset=utf-8" },
};

// Read on first request and kept, not read when this module is imported. The
// gateway imports this file through `src/cli.ts`, and an install missing a
// stylesheet must cost one broken page, never the whole command.
const assetCache = new Map<string, Buffer>();

function assetBody(name: string) {
  let body = assetCache.get(name);
  if (!body) {
    body = readFileSync(new URL(`../../assets/dashboard/${name}`, import.meta.url));
    assetCache.set(name, body);
  }
  return body;
}

const panels: Record<string, Panel> = {
  "/": ({ db }, o) =>
    table(
      heads(o, "state", "title", "workspace", "agent", "principal", "updated"),
      sessions(db).map((row) => [
        statusCell(row.state),
        cell(row.title),
        cell(row.workspace),
        cell(row.agent),
        cell(row.principal),
        cell(stamp(row.updatedAt)),
      ]),
      o.t("dash.empty"),
    ),

  "/runs": ({ db }, o) =>
    table(
      heads(o, "status", "session", "agent", "started", "duration"),
      runs(db).map((row) => [
        row.finishTs === null
          ? statusCell("running")
          : `<td class="state">${escapeHtml(row.result ?? "")}</td>`,
        cell(row.sessionId),
        cell(row.agent),
        cell(stamp(row.startTs)),
        cell(row.finishTs === null ? "" : duration(row.finishTs - row.startTs)),
      ]),
      o.t("dash.empty"),
    ) + `<p class="note">${escapeHtml(o.t("dash.runsDerived"))}</p>`,

  "/approvals": ({ db, now }, o) =>
    table(
      heads(o, "status", "id", "principal", "session", "tool", "expires"),
      approvals(db).map((row) => {
        const status = approvalStatus(row, now);
        return [
          `<td class="state">${escapeHtml(o.t(`dash.status.${status}` as MessageKey))}</td>`,
          cell(row.id),
          cell(row.principal),
          cell(row.sessionId),
          cell(row.toolCallId),
          cell(stamp(row.expiresAt)),
        ];
      }),
      o.t("dash.empty"),
    ) + `<p class="note">${escapeHtml(o.t("dash.approvalsReadOnly"))}</p>`,

  "/audit": ({ db, url, now }, o) => {
    const window = windowOf(url.searchParams.get("since"));
    const rows = audit(db, windowStart(window, now));
    return (
      `<p class="note">${escapeHtml(o.t("dash.auditWindow", { window }))}</p>` +
      table(
        heads(o, "time", "action", "result", "principal", "session", "details"),
        rows.map((row) => [
          cell(stamp(row.ts)),
          cell(row.action),
          cell(row.result),
          cell(row.principal ?? ""),
          cell(row.sessionId ?? ""),
          cell(row.details),
        ]),
        o.t("dash.empty"),
      )
    );
  },

  "/policy": ({ db, now }, o) =>
    table(
      heads(o, "status", "workspace", "mode", "grantedBy", "created", "expires"),
      grants(db).map((row) => [
        `<td class="state">${escapeHtml(o.t(grantOpen(row, now) ? "dash.status.open" : "dash.status.closed"))}</td>`,
        cell(row.workspace),
        cell(row.agentMode ? `${row.mode} · ${row.agentMode}` : row.mode),
        cell(row.grantedBy),
        cell(stamp(row.createdAt)),
        cell(row.expiresAt === null ? "" : stamp(row.expiresAt)),
      ]),
      o.t("dash.empty"),
    ),

  "/memory": ({ db }, o) =>
    o.memoryProvider === "local"
      ? table(
          heads(o, "scope", "kind", "text", "id", "created"),
          memories(db).map((row) => [
            cell(row.scope),
            cell(row.kind),
            cell(row.text),
            cell(row.id),
            cell(stamp(row.createdAt)),
          ]),
          o.t("dash.empty"),
        )
      : `<p class="empty">${escapeHtml(o.t("dash.memoryElsewhere", { provider: o.memoryProvider }))}</p>`,

  "/beta": ({ db }, o) => {
    const numbers = beta(db);
    const setup =
      numbers.setupSeconds === null
        ? o.t("dash.beta.setupUnknown")
        : o.t("dash.beta.setupValue", { seconds: numbers.setupSeconds });
    const activation = o.t(numbers.activated ? "dash.beta.yes" : "dash.beta.no");
    // The share line is opt-in on sharing, never on counting: both numbers are
    // above this element and stay there whether it is opened or not. It carries
    // the version, the two numbers, and nothing that names this machine.
    const share = `caraka ${o.version} setup=${numbers.setupSeconds ?? "unknown"}s activation=${numbers.activated ? "yes" : "no"}`;
    return (
      `<dl class="beta">` +
      `<dt>${escapeHtml(o.t("dash.beta.setup"))}</dt><dd>${escapeHtml(setup)}</dd>` +
      `<dt>${escapeHtml(o.t("dash.beta.activation"))}</dt><dd>${escapeHtml(activation)}</dd></dl>` +
      `<p class="note">${escapeHtml(o.t("dash.beta.proxy"))}</p>` +
      `<details><summary>${escapeHtml(o.t("dash.beta.share"))}</summary>` +
      `<p class="note">${escapeHtml(o.t("dash.beta.shareNote"))}</p>` +
      `<pre>${escapeHtml(share)}</pre></details>`
    );
  },
};

/** Every path the router answers with a panel, in navigation order. */
export const PANEL_PATHS = Object.keys(panels);

function sendHtml(
  o: DashboardOptions,
  req: IncomingMessage,
  res: ServerResponse,
  status: number,
  html: string,
) {
  const body = Buffer.from(o.scrub(html), "utf8");
  res.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "content-length": body.byteLength,
    "content-security-policy": CSP,
    "x-content-type-options": "nosniff",
  });
  res.end(req.method === "HEAD" ? undefined : body);
}

function sendPlain(
  o: DashboardOptions,
  res: ServerResponse,
  status: number,
  key: MessageKey,
  headers: Record<string, string> = {},
) {
  const body = Buffer.from(o.scrub(o.t(key)), "utf8");
  res.writeHead(status, {
    ...headers,
    "content-type": "text/plain; charset=utf-8",
    "content-length": body.byteLength,
    "x-content-type-options": "nosniff",
  });
  res.end(body);
}

function handle(o: DashboardOptions, db: DatabaseSync, req: IncomingMessage, res: ServerResponse) {
  // Both gates come before the router and before any query. The host is refused
  // first: a page that reached this port under its own name is asking for the
  // panels as its own origin, and no method it asks with changes that.
  if (!o.exposed && !hostAllowed(req.headers.host)) {
    sendPlain(o, res, 403, "dash.forbiddenHost");
    return;
  }
  // Nothing this server owns can be mutated, and a request that asks to is
  // refused without the database being touched at all.
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendPlain(o, res, 405, "dash.methodNotAllowed", { allow: "GET, HEAD" });
    return;
  }
  const url = new URL(req.url ?? "/", "http://dashboard.invalid");
  const file = ASSETS[url.pathname];
  if (file) {
    let body: Buffer;
    try {
      body = assetBody(file.name);
    } catch {
      sendHtml(o, req, res, 500, notice(o.t, "dash.error"));
      return;
    }
    res.writeHead(200, {
      "content-type": file.type,
      "content-length": body.byteLength,
      "x-content-type-options": "nosniff",
    });
    res.end(req.method === "HEAD" ? undefined : body);
    return;
  }
  const render = panels[url.pathname];
  if (!render) {
    sendHtml(o, req, res, 404, notice(o.t, "dash.notFound"));
    return;
  }
  try {
    const now = Date.now();
    const body = panel(o.t, url.pathname, render({ db, url, now }, o), now);
    // htmx asks for the panel alone; a browser without it, and the first load of
    // every tab, asks for the document that contains it.
    const fragment = req.headers["hx-request"] === "true";
    sendHtml(o, req, res, 200, fragment ? body : page(o.t, url.pathname, body));
  } catch {
    sendHtml(o, req, res, 500, notice(o.t, "dash.error"));
  }
}

/**
 * A listener over a database handle the engine will not let anyone write. The
 * handle closes with the server, so a caller that closes one has closed both.
 */
export function createDashboard(o: DashboardOptions) {
  const db = new DatabaseSync(o.dbPath, { readOnly: true });
  const server = createServer((req, res) => handle(o, db, req, res));
  server.once("close", () => db.close());
  return server;
}

export type Bind = { host: string; port: number; exposed: boolean };

/**
 * Where to listen, read from the arguments and nothing else. Without `--bind`
 * the host is the literal `127.0.0.1`: `localhost` resolves through the name
 * service, which can answer `::1` or whatever a `hosts` entry says, and a
 * mandatory control that depends on name resolution is not a control.
 */
export function resolveBind(args: string[], t: Translate = translator()): Bind {
  const read = (flag: string) => {
    const index = args.indexOf(flag);
    if (index < 0) return undefined;
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--"))
      throw new Error(t("cli.dashboardFlagArg", { flag }));
    return value;
  };
  const bind = read("--bind");
  const raw = read("--port");
  const port = raw === undefined ? DEFAULT_PORT : Number(raw);
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error(t("cli.dashboardPortInvalid", { port: raw ?? "" }));
  return {
    host: bind ?? "127.0.0.1",
    port,
    exposed: bind !== undefined && !LOOPBACK_HOSTS.includes(bind),
  };
}
