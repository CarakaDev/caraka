import { execFile } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import { platform } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { CarakaConfig } from "../config.js";

const runFile = promisify(execFile);
export type Provider = "tailscale" | "cloudflare";
export type ProcessResult = { code: number; stdout: string; stderr: string };
export type ProcessRunner = (command: string, args: string[]) => Promise<ProcessResult>;
export type ConnectionCheck = {
  health: "passed" | "failed";
  privateApi: "passed" | "failed";
  phone: "manual";
};

export const systemRunner: ProcessRunner = async (command, args) => {
  try {
    const result = await runFile(command, args, { encoding: "utf8", timeout: 15_000 });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const result = error as { code?: number; stdout?: string; stderr?: string };
    return {
      code: typeof result.code === "number" ? result.code : 127,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  }
};

function json(value: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

function hostname(value: string | undefined) {
  if (!value || !/^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/i.test(value))
    throw new Error("Use --hostname with a DNS hostname you control.");
  return value.toLowerCase();
}

export function providerInstall(provider: Provider, os = platform()) {
  if (provider === "tailscale") {
    if (os === "darwin") return "Install Tailscale: brew install --cask tailscale";
    if (os === "win32") return "Install Tailscale: winget install Tailscale.Tailscale";
    return "Install Tailscale: curl -fsSL https://tailscale.com/install.sh | sh";
  }
  if (os === "darwin") return "Install cloudflared: brew install cloudflared";
  if (os === "win32") return "Install cloudflared: winget install Cloudflare.cloudflared";
  return "Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/";
}

export function shellPath(value: string, os: NodeJS.Platform) {
  if (os === "win32") return '"' + value.replaceAll('"', '""') + '"';
  const quote = String.fromCharCode(39);
  return quote + value.replaceAll(quote, quote + '"' + quote + '"' + quote) + quote;
}

function cloudflaredServiceStep(config: string, os: NodeJS.Platform) {
  const path = shellPath(config, os);
  return os === "win32"
    ? "In an elevated PowerShell, run: cloudflared --config " + path + " service install"
    : "Run with elevation: sudo cloudflared --config " + path + " service install";
}

export function tailscaleTarget(port: number) {
  return `http://127.0.0.1:${port}`;
}

export function tailscaleConflict(status: Record<string, unknown> | undefined, target: string) {
  const web = status?.Web;
  const tcp = status?.TCP;
  const proxies: string[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    const route = value as Record<string, unknown>;
    if (typeof route.Proxy === "string") proxies.push(route.Proxy);
    for (const child of Object.values(route)) visit(child);
  };
  visit(web);
  const tcp443 =
    tcp && typeof tcp === "object" ? (tcp as Record<string, unknown>)["443"] : undefined;
  // A TCP forwarder on 443 competes with HTTPS Serve. The HTTPS marker itself
  // is expected when the Web map owns the port, so it does not reject Caraka.
  const incompatibleTcp =
    tcp443 && typeof tcp443 === "object" && (tcp443 as Record<string, unknown>).HTTPS !== true;
  return Boolean(incompatibleTcp) || proxies.some((proxy) => proxy !== target);
}

export function cloudflareTunnel(output: string, name: string) {
  const rows = JSON.parse(output) as Array<{ id?: unknown; name?: unknown }>;
  const found = rows.find((row) => row.name === name && typeof row.id === "string");
  return found?.id as string | undefined;
}

export async function checkConnection(
  origin: string,
  request: typeof fetch = fetch,
): Promise<ConnectionCheck> {
  const init = { redirect: "error" as const, signal: AbortSignal.timeout(10_000) };
  const health = await request(`${origin}/health`, init)
    .then((response) => response.ok)
    .catch(() => false);
  const privateApi = await request(`${origin}/api/state`, init)
    .then((response) => response.status === 401)
    .catch(() => false);
  return {
    health: health ? "passed" : "failed",
    privateApi: privateApi ? "passed" : "failed",
    phone: "manual",
  };
}

export type ConnectInput = {
  provider: Provider;
  config: CarakaConfig;
  root: string;
  apply: boolean;
  hostname?: string;
  tunnel?: string;
  runner?: ProcessRunner;
  os?: NodeJS.Platform;
  saveOrigin?: (origin: string) => Promise<void>;
};

export type ConnectPlan = { lines: string[]; origin?: string };

export async function connect(input: ConnectInput): Promise<ConnectPlan> {
  const runner = input.runner ?? systemRunner;
  const port = input.config.web?.port ?? 7720;
  if (input.provider === "tailscale") {
    const status = await runner("tailscale", ["status", "--json"]);
    const serve = await runner("tailscale", ["serve", "status", "--json"]);
    if (status.code !== 0 || serve.code !== 0)
      return {
        lines: [
          providerInstall("tailscale", input.os),
          "Log in: tailscale login",
          "Run this command again after login.",
        ],
      };
    const inspected = json(status.stdout);
    if (inspected?.BackendState !== "Running")
      return { lines: ["Log in: tailscale login", "Run this command again after login."] };
    const device = inspected.Self as { DNSName?: unknown } | undefined;
    const dnsName =
      typeof device?.DNSName === "string" ? device.DNSName.replace(/\.$/, "") : undefined;
    if (!dnsName)
      return { lines: ["Log in: tailscale login", "Run this command again after login."] };
    const target = tailscaleTarget(port);
    const existing = json(serve.stdout);
    if (tailscaleConflict(existing, target))
      throw new Error(
        `Tailscale Serve already owns an HTTPS route. Inspect it with \`tailscale serve status --json\`; repair that route before using Caraka.`,
      );
    const origin = `https://${dnsName}`;
    const lines = [
      `Plan: tailscale serve --bg --https=443 ${target}`,
      `Web origin: ${origin}`,
      input.apply
        ? "Applying the Tailscale Serve route."
        : "Run again with --apply to configure Tailscale Serve.",
    ];
    if (input.apply) {
      const applied = await runner("tailscale", ["serve", "--bg", "--https=443", target]);
      if (applied.code !== 0)
        throw new Error("Tailscale Serve failed. Inspect Serve status and repair the route.");
      await input.saveOrigin?.(origin);
    }
    return { lines, origin };
  }
  const host = hostname(input.hostname);
  const name = input.tunnel ?? "caraka-web";
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/i.test(name))
    throw new Error("--tunnel must be a simple tunnel name.");
  const listed = await runner("cloudflared", ["tunnel", "list", "--output", "json"]);
  if (listed.code !== 0)
    return {
      lines: [
        providerInstall("cloudflare", input.os),
        "Log in: cloudflared tunnel login",
        "Run this command again after login.",
      ],
    };
  let id: string | undefined;
  try {
    id = cloudflareTunnel(listed.stdout, name);
  } catch {
    throw new Error("cloudflared returned an invalid tunnel list.");
  }
  const origin = `https://${host}`;
  const credentials = join(input.root, "secrets", "cloudflared", `${name}.json`);
  const config = join(input.root, "secrets", "cloudflared", `${name}.yml`);
  const lines = [
    "Cloudflare recommends remotely managed tunnels. Caraka supports the named local-management CLI flow.",
    id ? `Reuse named tunnel: ${name}` : `Create named tunnel: ${name}`,
    `Route ${host} without --overwrite-dns.`,
    `Run: cloudflared --config ${shellPath(config, input.os ?? platform())} tunnel run ${id ?? name}`,
    cloudflaredServiceStep(config, input.os ?? platform()),
    input.apply
      ? "Applying the named tunnel plan."
      : "Run again with --apply to create the named tunnel and DNS route.",
  ];
  if (!input.apply) return { lines, origin };
  await mkdir(join(input.root, "secrets", "cloudflared"), { recursive: true, mode: 0o700 });
  if (!id) {
    const created = await runner("cloudflared", [
      "tunnel",
      "create",
      "--output",
      "json",
      "--credentials-file",
      credentials,
      name,
    ]);
    if (created.code !== 0)
      throw new Error(
        "cloudflared tunnel create failed. Complete cloudflared login and try again.",
      );
    try {
      id = (json(created.stdout)?.id as string | undefined) ?? undefined;
    } catch {
      id = undefined;
    }
    if (!id) throw new Error("cloudflared did not return a named tunnel id.");
  } else if (
    !(await access(credentials)
      .then(() => true)
      .catch(() => false))
  ) {
    throw new Error(
      "Named tunnel credentials are absent under Caraka secrets. Run cloudflared login, then create the named tunnel again.",
    );
  }
  const routed = await runner("cloudflared", ["tunnel", "route", "dns", id, host]);
  if (routed.code !== 0)
    throw new Error(
      "cloudflared DNS route failed. Inspect the existing DNS record and do not overwrite it.",
    );
  await writeFile(
    config,
    [
      `tunnel: ${id}`,
      `credentials-file: ${credentials}`,
      "ingress:",
      `  - hostname: ${host}`,
      `    service: ${tailscaleTarget(port)}`,
      "  - service: http_status:404",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  await input.saveOrigin?.(origin);
  return { lines, origin };
}
