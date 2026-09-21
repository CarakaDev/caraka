import { stat, readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { basename, resolve } from "node:path";
import { carakaPaths, loadConfig, parseConfig, saveConfig, type CarakaConfig } from "../config.js";
import { Store } from "../store/db.js";
import { WebChannel } from "../channels/web.js";
import { createScrubber } from "../core/security.js";
import { checkConnection, connect, type ProcessRunner } from "./connect.js";

function value(args: string[], flag: string) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

/** Configure the web adapter without a chat account. It preserves existing blocks. */
export async function webCommand(
  args: string[],
  injected: { runner?: ProcessRunner; request?: typeof fetch } = {},
) {
  if (args[0] === "connect") {
    const provider = args[1];
    if (provider !== "tailscale" && provider !== "cloudflare")
      throw new Error("Use `caraka web connect tailscale|cloudflare [--apply|--check]`.");
    const loaded = await loadConfig();
    if (!loaded.config.web) throw new Error("Web is not configured. Run `caraka init web` first.");
    if (args.includes("--check")) {
      if (args.includes("--apply")) throw new Error("Use --apply or --check, not both.");
      const result = await checkConnection(loaded.config.web.origin, injected.request);
      console.log(`Health: ${result.health}`);
      console.log(`Private API rejection: ${result.privateApi}`);
      console.log(
        "Phone verification: manual. Open the paired origin from the phone and pair it there.",
      );
      return;
    }
    const plan = await connect({
      provider,
      config: loaded.config,
      root: loaded.paths.root,
      apply: args.includes("--apply"),
      ...(value(args, "--hostname") ? { hostname: value(args, "--hostname")! } : {}),
      ...(value(args, "--tunnel") ? { tunnel: value(args, "--tunnel")! } : {}),
      ...(value(args, "--credentials") ? { credentials: value(args, "--credentials")! } : {}),
      ...(injected.runner ? { runner: injected.runner } : {}),
      saveOrigin: async (origin) => {
        await saveConfig({ ...loaded.config, web: { ...loaded.config.web!, origin } }, "");
      },
    });
    for (const line of plan.lines) console.log(line);
    return;
  }
  if (args[0] === "pair") {
    const loaded = await loadConfig();
    if (!loaded.config.web) throw new Error("Web is not configured. Run `caraka init web` first.");
    const store = new Store(loaded.paths.database, createScrubber([]));
    const channel = new WebChannel({
      config: {
        ...loaded.config.web,
        workspaces: loaded.config.workspaces ?? [
          { slug: loaded.config.workspace.name, path: loaded.config.workspace.path },
        ],
      },
      store,
      scrub: createScrubber([]),
      paths: loaded.paths,
      language: loaded.config.language ?? "en",
      version: "cli",
    });
    const pairing = channel.createPairCode();
    store.close();
    console.log(`${loaded.config.web.origin}/#pair=${pairing}`);
    return;
  }
  if (args[0] === "devices") {
    const loaded = await loadConfig();
    const store = new Store(loaded.paths.database, createScrubber([]));
    const revoke = value(args, "--revoke");
    if (revoke)
      store.db
        .prepare("UPDATE web_devices SET revoked_at = ? WHERE id = ?")
        .run(Date.now(), revoke);
    else
      for (const row of store.db
        .prepare(
          "SELECT id, name, created_at AS createdAt FROM web_devices WHERE revoked_at IS NULL ORDER BY created_at DESC",
        )
        .all() as Array<{ id: string; name: string; createdAt: number }>)
        console.log(`${row.id} ${row.name} ${new Date(row.createdAt).toISOString()}`);
    store.close();
    return;
  }
  if (args[0] !== "init")
    throw new Error("Use `caraka init web --workspace PATH --agent PRESET --language id|en`.");
  const workspace = resolve(value(args, "--workspace") ?? process.cwd());
  if ((await stat(workspace).catch(() => undefined))?.isDirectory() !== true)
    throw new Error(`Workspace does not exist: ${workspace}`);
  const language = value(args, "--language");
  if (language !== undefined && language !== "id" && language !== "en")
    throw new Error("--language must be id or en.");
  const agent = value(args, "--agent") ?? "claude-code";
  const paths = carakaPaths();
  let current: CarakaConfig | undefined;
  try {
    current = parseConfig(await readFile(paths.config, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const config: CarakaConfig = current ?? {
    version: 1,
    language: language ?? "en",
    workspace: { name: basename(workspace), path: workspace },
    workspaces: [{ slug: basename(workspace), path: workspace, agent }],
    agent: { adapter: "claude-agent-acp", adapterVersion: "0.63.0" },
    memory: { provider: "local", endpoint: "http://127.0.0.1:8787" },
  };
  const next: CarakaConfig = {
    ...config,
    language: language ?? config.language ?? "en",
    workspaces: config.workspaces ?? [{ slug: basename(workspace), path: workspace, agent }],
    web: config.web ?? {
      host: "127.0.0.1",
      port: 7720,
      origin: "http://127.0.0.1:7720",
      owner: `web-${randomBytes(8).toString("hex")}`,
    },
  };
  await saveConfig(next, "");
  console.log(`Web is configured at ${next.web?.origin}. Run caraka start, then caraka web pair.`);
}
