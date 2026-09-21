import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { platform } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { CarakaConfig } from "../config.js";

const runFile = promisify(execFile);
export type Provider = "tailscale" | "cloudflare";
export type ProcessResult = { code: number; stdout: string; stderr: string };
export type ProcessRunOptions = { env?: NodeJS.ProcessEnv };
export type ProcessRunner = (
  command: string,
  args: string[],
  options?: ProcessRunOptions,
) => Promise<ProcessResult>;
export type ConnectionCheck = {
  health: "passed" | "failed";
  privateApi: "passed" | "failed";
  phone: "manual";
};

export const systemRunner: ProcessRunner = async (command, args, options) => {
  try {
    const result = await runFile(command, args, {
      encoding: "utf8",
      timeout: 15_000,
      ...(options?.env ? { env: options.env } : {}),
    });
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

export function linuxInstall(provider: Provider, distribution = "") {
  const distro = distribution.toLowerCase();
  const deb = /debian|ubuntu|linuxmint/.test(distro);
  const rpm = /fedora|rhel|centos|rocky|alma/.test(distro);
  if (provider === "tailscale") {
    if (deb)
      return "Install Tailscale for Debian or Ubuntu: curl -fsSL https://tailscale.com/install.sh | sh";
    if (rpm)
      return "Install Tailscale for Fedora or RHEL: curl -fsSL https://tailscale.com/install.sh | sh";
    return "Install Tailscale for your Linux distribution: https://tailscale.com/docs/install/linux";
  }
  if (deb)
    return "Install cloudflared for Debian or Ubuntu: use cloudflare-main.gpg and the any main APT repository at https://pkg.cloudflare.com/index.html";
  if (rpm)
    return "Install cloudflared for Fedora or RHEL: use cloudflared.repo at https://pkg.cloudflare.com/index.html";
  return "Install cloudflared for your Linux distribution: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/";
}

export function providerInstall(provider: Provider, os = platform(), distribution = "") {
  if (provider === "tailscale") {
    if (os === "darwin") return "Install Tailscale: brew install --cask tailscale";
    if (os === "win32") return "Install Tailscale: winget install Tailscale.Tailscale";
    return linuxInstall(provider, distribution);
  }
  if (os === "darwin") return "Install cloudflared: brew install cloudflared";
  if (os === "win32") return "Install cloudflared: winget install Cloudflare.cloudflared";
  return linuxInstall(provider, distribution);
}

async function providerInstallForHost(provider: Provider, os = platform()) {
  if (os !== "linux") return providerInstall(provider, os);
  const release = await readFile("/etc/os-release", "utf8").catch(() => "");
  const distribution = /^ID=(.*)$/m.exec(release)?.[1]?.replaceAll('"', "") ?? "";
  return providerInstall(provider, os, distribution);
}

export function shellPath(value: string, os: NodeJS.Platform) {
  if (os === "win32") return "'" + value.replaceAll("'", "''") + "'";
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

function occupiedHandler(value: unknown, target: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return true;
  const handler = value as Record<string, unknown>;
  const fields = Object.keys(handler);
  if (fields.length !== 1 || fields[0] !== "Proxy") return true;
  return handler.Proxy !== target;
}

function occupiedWeb(value: unknown, target: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return true;
  for (const entry of Object.values(value as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return true;
    const route = entry as Record<string, unknown>;
    if ("Handlers" in route) {
      if (Object.keys(route).length !== 1 || !route.Handlers || typeof route.Handlers !== "object")
        return true;
      for (const handler of Object.values(route.Handlers as Record<string, unknown>))
        if (occupiedHandler(handler, target)) return true;
      continue;
    }
    if (occupiedHandler(route, target)) return true;
  }
  return false;
}

export function tailscaleConflict(status: Record<string, unknown> | undefined, target: string) {
  if (!status || Array.isArray(status)) return true;
  const known = new Set(["Web", "TCP", "AllowFunnel"]);
  if (Object.keys(status).some((key) => !known.has(key))) return true;
  if (status.Web !== undefined && occupiedWeb(status.Web, target)) return true;
  const tcp = status.TCP;
  if (tcp !== undefined && (!tcp || typeof tcp !== "object" || Array.isArray(tcp))) return true;
  const tcp443 =
    tcp && typeof tcp === "object" ? (tcp as Record<string, unknown>)["443"] : undefined;
  if (tcp443 !== undefined) {
    if (!tcp443 || typeof tcp443 !== "object" || Array.isArray(tcp443)) return true;
    const fields = Object.keys(tcp443 as Record<string, unknown>);
    if (
      fields.length !== 1 ||
      fields[0] !== "HTTPS" ||
      (tcp443 as Record<string, unknown>).HTTPS !== true
    )
      return true;
  }
  return false;
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

async function fileText(path: string) {
  return readFile(path, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
}

function cloudflareEnvironment() {
  return { ...process.env, TUNNEL_FORCE_PROVISIONING_DNS: "false" };
}

export type ConnectInput = {
  provider: Provider;
  config: CarakaConfig;
  root: string;
  apply: boolean;
  hostname?: string;
  tunnel?: string;
  credentials?: string;
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
          await providerInstallForHost("tailscale", input.os),
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
    if (tailscaleConflict(json(serve.stdout), target))
      throw new Error(
        "Tailscale Serve already owns an HTTPS route or has invalid state. Inspect it with `tailscale serve status --json`; repair that route before using Caraka.",
      );
    const origin = `https://${dnsName}`;
    const lines = [
      `Plan: tailscale serve --bg --https=443 ${target}`,
      `Web origin: ${origin}`,
      input.apply
        ? "Applying the Tailscale Serve route. Restart Caraka after the origin changes."
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
  const cloudflared = { env: cloudflareEnvironment() };
  const listed = await runner("cloudflared", ["tunnel", "list", "--output", "json"], cloudflared);
  if (listed.code !== 0)
    return {
      lines: [
        await providerInstallForHost("cloudflare", input.os),
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
  const storedCredentials = join(input.root, "secrets", "cloudflared", `${name}.json`);
  if (!id && input.credentials)
    throw new Error("--credentials can only reuse an existing named tunnel.");
  const credentials = id && input.credentials ? input.credentials : storedCredentials;
  const config = join(input.root, "secrets", "cloudflared", `${name}.yml`);
  const desiredConfig = (tunnelId: string) =>
    [
      `tunnel: ${tunnelId}`,
      `credentials-file: ${credentials}`,
      "ingress:",
      `  - hostname: ${host}`,
      `    service: ${tailscaleTarget(port)}`,
      "  - service: http_status:404",
      "",
    ].join("\n");
  const lines = [
    "Cloudflare recommends remotely managed tunnels. Caraka supports the named local-management CLI flow.",
    id ? `Reuse named tunnel: ${name}` : `Create named tunnel: ${name}`,
    `Route ${host} without --overwrite-dns.`,
    `Run: cloudflared --config ${shellPath(config, input.os ?? platform())} tunnel run ${id ?? name}`,
    cloudflaredServiceStep(config, input.os ?? platform()),
    input.apply
      ? "Applying the named tunnel plan. Restart Caraka after the origin changes."
      : "Run again with --apply to create the named tunnel and DNS route.",
  ];
  if (!input.apply) return { lines, origin };
  const currentConfig = await fileText(config);
  if (currentConfig !== undefined && (!id || currentConfig !== desiredConfig(id)))
    throw new Error(
      "Caraka ingress configuration already exists and differs from this plan. Inspect it and use a new tunnel name.",
    );
  await mkdir(join(input.root, "secrets", "cloudflared"), { recursive: true, mode: 0o700 });
  if (!id) {
    const created = await runner(
      "cloudflared",
      ["tunnel", "create", "--output", "json", "--credentials-file", credentials, name],
      cloudflared,
    );
    if (created.code !== 0)
      throw new Error(
        "cloudflared tunnel create failed. Complete cloudflared login and try again.",
      );
    id = json(created.stdout)?.id as string | undefined;
    if (!id) throw new Error("cloudflared did not return a named tunnel id.");
  } else {
    const rawCredentials = await fileText(credentials);
    const credential = rawCredentials ? json(rawCredentials) : undefined;
    if (credential?.TunnelID !== id)
      throw new Error(
        "Named tunnel credentials are unavailable. Provide --credentials PATH to the existing tunnel credential file, or use a new --tunnel name.",
      );
  }
  const wanted = desiredConfig(id);
  if (currentConfig === undefined) await writeFile(config, wanted, { mode: 0o600 });
  const routed = await runner("cloudflared", ["tunnel", "route", "dns", id, host], cloudflared);
  if (routed.code !== 0)
    throw new Error(
      "cloudflared DNS route failed. Inspect the existing DNS record and do not overwrite it.",
    );
  await input.saveOrigin?.(origin);
  return { lines, origin };
}
