import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { chmod, readFile, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { Telegram, TelegramError } from "./channels/telegram.js";
import {
  carakaPaths,
  channelBlocks,
  defaultConfig,
  loadConfig,
  privateFile,
  saveConfig,
} from "./config.js";
import type { Channel } from "./core/channel.js";
import type { AgentDriver, DriverFor } from "./core/driver.js";
import { createDashboard, LOOPBACK_HOSTS, resolveBind } from "./dashboard/server.js";
import { Gateway } from "./core/gateway.js";
import { createScrubber, parseDuration, trustLimitMinutes } from "./core/security.js";
import { ClaudeAcp } from "./drivers/claude-acp.js";
import { discoverAgents, type Discovery } from "./discovery.js";
import { CliDriver } from "./drivers/cli.js";
import { loadPresets, resolveCommand, type AgentPreset } from "./drivers/preset.js";
import { defaultLanguage, translator, type Language, type Translate } from "./i18n.js";
import { LocalMemory } from "./memory/local.js";
import { TitenMemory } from "./memory/titen.js";
import { isServiceKind, serviceUnit } from "./service.js";
import { Store } from "./store/db.js";

const VERSION = "0.6.0";
// The preset a session runs until `/switch` names another.
const DEFAULT_AGENT = "claude-code";

let t: Translate = translator(defaultLanguage());

/**
 * The construction seam FR-DRV-07 names: ACP when the preset's adapter
 * resolves, the CLI route when it does not, an error that names the agent and
 * both options otherwise. `workspace.driver` forces one route and never tries
 * the other.
 */
export function buildDriver(
  preset: AgentPreset | undefined,
  forced: "acp" | "cli" | undefined,
  language: Translate,
  scrub: (input: unknown) => string,
): AgentDriver {
  // No preset on disk keeps the pre-preset behaviour: the Claude adapter from
  // the locked dependency.
  if (!preset) return new ClaudeAcp(language);
  const acpCommand = forced === "cli" || !preset.acp ? null : resolveCommand(preset.acp.command);
  if (acpCommand && preset.acp) {
    // A resolved `.bin` shim is a script behind a symlink; spawning it through
    // the running Node keeps working when PATH has no `node` (systemd).
    const real = realpathSync(acpCommand);
    const script = /\.[mc]?js$/.test(real);
    return new ClaudeAcp(language, {
      command: script ? process.execPath : acpCommand,
      args: script ? [real, ...preset.acp.args] : preset.acp.args,
      env: preset.acp.env,
    });
  }
  if (forced === "acp")
    throw new Error(
      t("driver.acpMissing", { agent: preset.id, command: preset.acp?.command ?? "acp" }),
    );
  if (preset.command) return new CliDriver(preset, language, scrub);
  if (forced === "cli") throw new Error(t("driver.cliMissing", { agent: preset.id }));
  throw new Error(t("driver.none", { agent: preset.id }));
}

// The runtime half of FR-DRV-07: an adapter whose command resolves but whose
// initialize fails (broken install, agent not authenticated) falls to the
// preset's CLI route — when it has one and no route was forced (AC-5.2).
async function startDriver(
  preset: AgentPreset | undefined,
  forced: "acp" | "cli" | undefined,
  language: Translate,
  scrub: (input: unknown) => string,
): Promise<AgentDriver> {
  const driver = buildDriver(preset, forced, language, scrub);
  try {
    await driver.start();
  } catch (error) {
    if (forced || !preset?.acp || !preset.command) throw error;
    const cli = new CliDriver(preset, language, scrub);
    await cli.start();
    return cli;
  }
  return driver;
}

/**
 * The production selection seam (plan driver-v04 step 5): one started driver
 * per (preset, forced route) pair, built on first use from the session's agent
 * id — `""` reads as the default. The gateway calls this and never learns
 * which route answered.
 */
export function driverRegistry(
  presets: Map<string, AgentPreset>,
  defaultAgent: string,
  language: Translate,
  scrub: (input: unknown) => string,
): DriverFor {
  const built = new Map<string, Promise<AgentDriver>>();
  return (agent, forced) => {
    const preset = presets.get(agent || defaultAgent);
    const key = `${preset?.id ?? ""}:${forced ?? "auto"}`;
    let ready = built.get(key);
    if (!ready) {
      ready = startDriver(preset, forced, language, scrub);
      built.set(key, ready);
      // A start that failed is not kept; the next task tries again.
      ready.catch(() => built.delete(key));
    }
    return ready;
  };
}

/**
 * Every secret this process loaded, handed to the scrubber as exact strings so
 * redaction never depends on a pattern recognising the shape. A channel token
 * added later is added here, and both commands that build a scrubber get it.
 */
export function startupSecrets(loaded: {
  token: string;
  discordToken?: string;
  whatsappToken?: string;
  whatsappVerify?: string;
  whatsappAppSecret?: string;
  approvalKey: Buffer;
}) {
  return [
    loaded.token,
    loaded.discordToken ?? "",
    loaded.whatsappToken ?? "",
    loaded.whatsappVerify ?? "",
    loaded.whatsappAppSecret ?? "",
    loaded.approvalKey.toString("base64url"),
  ].filter((secret) => secret.length > 0);
}

/**
 * The channel list this config asks for, in the order core reads it: Telegram
 * first, so a route stored before there was a second channel still resolves to
 * the channel that wrote it. The Discord module is behind an `await import`, so
 * a config without a `discord:` block never loads a line of it.
 */
export async function buildChannels(
  loaded: Awaited<ReturnType<typeof loadConfig>>,
  language: Translate,
  store: Store,
  // Where a webhook would bind, resolved from the arguments by `resolveBind` so
  // that `src/channels/` never imports `src/dashboard/` (`AGENTS.md`).
  bind: { host: string; exposed: boolean } = { host: "127.0.0.1", exposed: false },
): Promise<[Channel, ...Channel[]]> {
  const built: Channel[] = [];
  const { telegram, discord, whatsapp } = loaded.config;
  if (telegram) built.push(new Telegram(loaded.token, fetch, undefined, language, telegram.topics));
  if (discord) {
    const { Discord } = await import("./channels/discord.js");
    built.push(
      new Discord({
        token: loaded.discordToken,
        appId: discord.appId,
        threads: discord.threads,
        t: language,
        log: (action, result, details) => store.audit(action, result, details),
      }),
    );
  }
  if (whatsapp) {
    const { WhatsApp } = await import("./channels/whatsapp.js");
    built.push(
      new WhatsApp({
        provider: whatsapp.provider,
        allowFrom: whatsapp.allowFrom,
        ...(whatsapp.number ? { number: whatsapp.number } : {}),
        ...(whatsapp.phoneNumberId ? { phoneNumberId: whatsapp.phoneNumberId } : {}),
        token: loaded.whatsappToken,
        verifyToken: loaded.whatsappVerify,
        appSecret: loaded.whatsappAppSecret,
        sessionDir: loaded.paths.whatsappSession,
        webhook: {
          host: bind.host,
          port: whatsapp.webhook.port,
          path: whatsapp.webhook.path,
          exposed: bind.exposed,
        },
        t: language,
        log: (action, result, details) => store.audit(action, result, details),
      }),
    );
  }
  const [first, ...rest] = built;
  // The schema refuses a config with no channel, so this cannot be empty; the
  // check is what makes that promise readable to the type system.
  if (!first) throw new Error(language("cli.allowlistEmpty", { channel: "—" }));
  return [first, ...rest];
}

function command(command: string, args: string[]) {
  return spawnSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

function claudeAuthenticated() {
  const result = command("claude", ["auth", "status", "--json"]);
  if (result.status !== 0) return false;
  try {
    return JSON.parse(result.stdout).loggedIn === true;
  } catch {
    return false;
  }
}

async function secretQuestion(label: string) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    const rl = createInterface({ input: stdin, output: stdout });
    const answer = await rl.question(label);
    rl.close();
    return answer.trim();
  }
  stdout.write(label);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  return new Promise<string>((resolveAnswer, reject) => {
    let answer = "";
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      resolveAnswer(answer.trim());
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          finish();
          return;
        } else if (char === "\u0003") {
          stdin.setRawMode(false);
          stdin.pause();
          reject(new Error(t("cli.cancelled")));
        } else if (char === "\u007f") answer = answer.slice(0, -1);
        else answer += char;
      }
    };
    stdin.on("data", onData);
  });
}

export function workspaceArg(args: string[]) {
  const index = args.indexOf("--workspace");
  const requested = index >= 0 ? args[index + 1] : undefined;
  if (index >= 0 && (!requested || requested.startsWith("--")))
    throw new Error(t("cli.workspaceArg"));
  return resolve(requested ?? process.cwd());
}

function flagValue(args: string[], flag: string) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

// Accepts y, ya and yes on either catalog. The prompt asks for one keystroke
// because that is what the moment deserves — the decision was already made when
// the operator opened the deep link and read the identity back off this line.
// Anything else, including an empty line, cancels.
export function pairingConfirmed(answer: string) {
  return ["y", "ya", "yes"].includes(answer.trim().toLowerCase());
}

// A flag's value is not a workspace. Without this, `caraka trust --for 30m`
// opens a window on a directory called `30m` and prints that the window is open.
export function trustWorkspace(args: string[]) {
  const positional = args.filter(
    (value, index) => !value.startsWith("--") && !args[index - 1]?.startsWith("--"),
  );
  return resolve(positional[0] ?? process.cwd());
}

export function readPid(text: string) {
  const pid = Number(text.trim());
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

export function processAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function livePid(path: string) {
  const pid = await readFile(path, "utf8")
    .then(readPid)
    .catch(() => null);
  if (pid === null) return null;
  if (processAlive(pid)) return pid;
  await rm(path, { force: true });
  return null;
}

async function init(args: string[]) {
  const workspace = workspaceArg(args);
  if (Number(process.versions.node.split(".")[0]) < 22) throw new Error(t("cli.nodeVersion"));
  if (command("git", ["--version"]).status !== 0) throw new Error(t("cli.gitMissing"));
  // Any one discovered agent is enough; none is the only stop (FR-SETUP-02,
  // `docs/troubleshooting.md` §Coding agent).
  const found = await discoverAgents();
  if (found.agents.length === 0) throw new Error(t("agents.none"));
  if ((await stat(workspace).catch(() => null))?.isDirectory() !== true)
    throw new Error(t("cli.workspaceMissing", { path: workspace }));

  const agentList = found.agents.map((agent) => agent.binary).join(", ");
  console.log(`\nꦕꦫꦏ  caraka v${VERSION}\nWorkspace: ${workspace}\nAgents: ${agentList}\n`);

  // Asked once, written down, never inferred from a message later.
  const fallback = defaultLanguage();
  const rlLanguage = createInterface({ input: stdin, output: stdout });
  const answer = (await rlLanguage.question(t("cli.languagePrompt", { fallback })))
    .trim()
    .toLowerCase();
  rlLanguage.close();
  const language: Language = answer === "id" ? "id" : answer === "en" ? "en" : fallback;
  t = translator(language);

  const token =
    process.env.CARAKA_TELEGRAM_TOKEN?.trim() || (await secretQuestion(t("cli.tokenPrompt")));
  if (!token) throw new Error(t("cli.tokenEmpty"));
  const telegram = new Telegram(token, fetch, undefined, t);
  let bot;
  try {
    bot = await telegram.getMe();
  } catch {
    throw new Error(t("cli.tokenRejected"));
  }
  if (!bot.username) throw new Error(t("cli.botNoUsername"));
  await telegram.deleteWebhook();

  const pairCode = randomBytes(9).toString("base64url");
  console.log(t("cli.pairOpen", { url: `https://t.me/${bot.username}?start=pair_${pairCode}` }));
  console.log(t("cli.pairWaiting"));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5 * 60_000);
  let offset = 0;
  let paired: { id: number; username?: string; first_name: string } | undefined;
  try {
    while (!paired) {
      const updates = await telegram.getUpdates(offset, 20, controller.signal);
      for (const update of updates) {
        offset = Math.max(offset, update.update_id + 1);
        const message = update.message;
        if (
          message?.chat.type === "private" &&
          message.from &&
          message.text === `/start pair_${pairCode}`
        ) {
          paired = message.from;
          break;
        }
      }
    }
  } catch {
    if (controller.signal.aborted) throw new Error(t("cli.pairTimeout"));
    throw new Error(t("cli.pairFailed"));
  } finally {
    clearTimeout(timeout);
  }

  const rl = createInterface({ input: stdin, output: stdout });
  const identity = paired.username ? `@${paired.username}` : paired.first_name;
  const confirmation = await rl.question(t("cli.pairConfirm", { identity, id: paired.id }));
  rl.close();
  if (!pairingConfirmed(confirmation)) throw new Error(t("cli.pairCancelled"));

  await telegram.deleteWebhook(true);

  // The memory step (FR-SETUP-01e): one offer, after pairing and before the
  // config is written. Declining, or an install that does not finish, falls
  // back to `local` and init completes either way.
  const rlMemory = createInterface({ input: stdin, output: stdout });
  const memoryAnswer = await rlMemory.question(t("cli.memoryOffer"));
  rlMemory.close();
  let memoryProvider: "titen" | "local" = "local";
  if (pairingConfirmed(memoryAnswer)) {
    const install = spawnSync("bash", ["-c", "curl -fsSL https://titen.dev/install.sh | bash"], {
      stdio: "inherit",
    });
    if (install.status === 0) memoryProvider = "titen";
    else console.log(t("cli.memoryInstallFailed"));
  }
  console.log(t(memoryProvider === "titen" ? "cli.memoryTiten" : "cli.memoryLocal"));

  const config = defaultConfig(
    workspace,
    bot.username,
    String(paired.id),
    bot.has_topics_enabled === true,
    language,
    memoryProvider,
  );
  const paths = await saveConfig(config, token);
  console.log(t("cli.ready", { path: paths.config }));
  console.log(`Bot: @${bot.username}`);
  console.log("\n  npx caraka start\n");
}

/**
 * The agent rows doctor prints: one per agent discovered, its version in the
 * name, and a Claude login row only when `claude` is among them. An agent that
 * is not installed is optional, so it draws no row and reddens nothing — the
 * only failing row is no agent at all, and it carries the remedy.
 */
export function agentChecks(
  found: Discovery,
  claudeLogin: () => boolean,
  language: Translate,
): Array<[string, boolean, string]> {
  if (found.agents.length === 0) return [["Coding agents", false, language("agents.none")]];
  const rows: Array<[string, boolean, string]> = found.agents.map((agent) => [
    `Agent ${agent.binary}${agent.version ? ` ${agent.version}` : ""}`,
    true,
    agent.path,
  ]);
  if (found.agents.some((agent) => agent.binary === "claude"))
    rows.push(["Claude login", claudeLogin(), "run `claude auth login`"]);
  return rows;
}

async function doctor() {
  const checks: Array<[string, boolean, string]> = [];
  checks.push(["Node.js", Number(process.versions.node.split(".")[0]) >= 22, process.version]);
  checks.push(["Git", command("git", ["--version"]).status === 0, "install Git"]);
  // Doctor is the one caller that refreshes discovery past the cache's age.
  checks.push(...agentChecks(await discoverAgents({ refresh: true }), claudeAuthenticated, t));
  let loaded: Awaited<ReturnType<typeof loadConfig>>;
  try {
    loaded = await loadConfig();
    t = translator(loaded.config.language ?? "en");
    checks.push(["Config", true, loaded.paths.config]);
  } catch {
    checks.push(["Config", false, `run \`caraka init\` (${carakaPaths().config})`]);
    printChecks(checks);
    process.exitCode = 1;
    return;
  }
  checks.push([
    "Workspace",
    (await stat(loaded.config.workspace.path).catch(() => null))?.isDirectory() === true,
    loaded.config.workspace.path,
  ]);
  if (loaded.config.telegram)
    checks.push(["Telegram token mode", await privateFile(loaded.paths.token), "must be 0600"]);
  if (loaded.config.discord)
    checks.push([
      "Discord token mode",
      await privateFile(loaded.paths.discordToken),
      "must be 0600",
    ]);
  // The Baileys auth state is the WhatsApp session itself, so its directory is
  // checked the way a key file is; the Cloud API has three secrets and no
  // directory. A missing path reads as a failing row, not as a thrown doctor.
  // A secret held in the environment instead has no file to check, so the row
  // appears for what is on disk and stays silent about what is not.
  if (loaded.config.whatsapp)
    for (const [name, path, mode] of [
      ["session", loaded.paths.whatsappSession, "0700"],
      ["token", loaded.paths.whatsappToken, "0600"],
      ["verify token", loaded.paths.whatsappVerify, "0600"],
      ["app secret", loaded.paths.whatsappAppSecret, "0600"],
    ] as const)
      if (existsSync(path))
        checks.push([
          `WhatsApp ${name} mode`,
          await privateFile(path),
          `must be ${mode} (${path})`,
        ]);
  checks.push(["Approval key mode", await privateFile(loaded.paths.approvalKey), "must be 0600"]);
  for (const [id, block] of Object.entries(channelBlocks(loaded.config)))
    checks.push([`Allowlist (${id})`, block.allowFrom.length > 0, "run init again"]);
  // A Titen that is configured gets a health probe; any other provider is a
  // choice, not a fault, so its row can never turn the exit code red.
  const memory = loaded.config.memory;
  if (memory.provider === "titen") {
    const healthy = await fetch(new URL("/health", memory.endpoint), {
      signal: AbortSignal.timeout(2000),
    })
      .then((response) => response.ok)
      .catch(() => false);
    checks.push(["Titen memory", healthy, "run `titen serve`"]);
    let loopback = false;
    try {
      loopback = LOOPBACK_HOSTS.includes(new URL(memory.endpoint).hostname);
    } catch {
      loopback = false;
    }
    if (!loopback)
      console.log(
        `Memory endpoint ${memory.endpoint} is not loopback: memory data leaves this machine.`,
      );
  } else {
    checks.push([`Memory (${memory.provider})`, true, ""]);
  }
  const telegram = loaded.config.telegram;
  if (telegram) {
    try {
      const me = await new Telegram(loaded.token, fetch, undefined, t).getMe();
      checks.push([
        "Telegram",
        me.username === telegram.botUsername,
        `@${me.username ?? "unknown"}`,
      ]);
      checks.push([
        "Topics",
        me.has_topics_enabled === true,
        "turn on Threaded Mode for this bot in @BotFather",
      ]);
      checks.push([
        "User-created topics",
        me.allows_users_to_create_topics === true,
        "controlled by “Disallow users to create new threads” in @BotFather",
      ]);
    } catch {
      checks.push(["Telegram", false, "token or connection problem"]);
    }
  }
  // Doctor is where a container that once refused a thread gets another
  // chance: the marker goes, and the next session detects again.
  const store = new Store(loaded.paths.database, createScrubber(startupSecrets(loaded)));
  const cleared = store.clearMeta("threads.");
  store.close();
  checks.push([
    "Thread detection",
    true,
    cleared > 0 ? `${cleared} container(s) will be tried again` : "",
  ]);
  printChecks(checks);
  if (checks.some(([, ok]) => !ok)) process.exitCode = 1;
}

function printChecks(checks: Array<[string, boolean, string]>) {
  console.log("");
  for (const [name, ok, detail] of checks)
    console.log(`${ok ? "✓" : "✗"} ${name}: ${ok ? "ready" : detail}`);
  console.log("");
}

async function start(args: string[] = []) {
  const loaded = await loadConfig();
  t = translator(loaded.config.language ?? "en");
  const blocks = channelBlocks(loaded.config);
  // Printed every run, not once at setup: a linked device can be banned on any
  // of them, and the document behind the link is what says how often that
  // happens (`docs/whatsapp-risiko.md`).
  if (loaded.config.whatsapp?.provider === "baileys") console.log(t("whatsapp.riskNotice"));
  // FR-SETUP-05: a configured channel with an empty sender list is a channel
  // that would serve nobody, and it says which one before anything starts.
  for (const [id, block] of Object.entries(blocks))
    if (block.allowFrom.length === 0) throw new Error(t("cli.allowlistEmpty", { channel: id }));
  const running = await livePid(loaded.paths.pid);
  if (running !== null) {
    // 78 is EX_CONFIG. The printed systemd unit names it in
    // `RestartPreventExitStatus`, so a second poller never restarts into a
    // conflict with the first.
    console.error(t("cli.alreadyRunning", { pid: running }));
    process.exitCode = 78;
    return;
  }
  await writeFile(loaded.paths.pid, `${process.pid}\n`, { mode: 0o600 });
  await chmod(loaded.paths.pid, 0o600);

  const scrub = createScrubber(startupSecrets(loaded));
  const store = new Store(loaded.paths.database, scrub);
  const language = translator(loaded.config.language ?? "en");
  // `none` builds no provider at all; the gateway treats its absence as the
  // provider.
  const memory =
    loaded.config.memory.provider === "titen"
      ? new TitenMemory(scrub, loaded.config.memory.endpoint)
      : loaded.config.memory.provider === "local"
        ? new LocalMemory(store)
        : undefined;
  const presetsFound = await loadPresets(undefined, language);
  for (const problem of presetsFound.errors) console.error(problem);
  const gateway = new Gateway(
    loaded.config,
    loaded.approvalKey,
    await buildChannels(loaded, language, store, resolveBind(args, t)),
    driverRegistry(presetsFound.presets, DEFAULT_AGENT, language, scrub),
    store,
    scrub,
    VERSION,
    undefined,
    memory,
    undefined,
    [...presetsFound.presets.keys()],
  );
  console.log(
    t("cli.running", {
      channels: Object.keys(blocks).join(", "),
      workspace: loaded.config.workspace.path,
    }),
  );
  const stop = () => {
    void gateway.stop();
    void rm(loaded.paths.pid, { force: true });
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    await gateway.run();
  } catch (error) {
    if (error instanceof TelegramError && (error.code === 401 || error.code === 409)) {
      console.error(`\nCaraka: ${error.message}\n`);
      process.exitCode = 78;
      return;
    }
    throw error;
  } finally {
    await gateway.stop();
    await rm(loaded.paths.pid, { force: true });
  }
}

async function stopCommand() {
  const paths = carakaPaths();
  const pid = await livePid(paths.pid);
  if (pid === null) {
    console.log(t("cli.notRunning"));
    return;
  }
  process.kill(pid, "SIGTERM");
  console.log(t("cli.stopSent", { pid }));
}

async function statusCommand() {
  const loaded = await loadConfig();
  t = translator(loaded.config.language ?? "en");
  const pid = await livePid(loaded.paths.pid);
  // Process, PID, workspace, bot. No token, and nothing anyone said in chat.
  const channels = Object.keys(channelBlocks(loaded.config)).join(", ");
  console.log(
    pid === null
      ? t("cli.statusStopped", { workspace: loaded.config.workspace.path, channels })
      : t("cli.statusRunning", { pid, workspace: loaded.config.workspace.path, channels }),
  );
}

/**
 * The only caller of Claude's own `bypassPermissions`. It stays in the terminal
 * not because chat is too weak to authorise it, but because once that mode is
 * on the adapter answers permissions locally and stops sending
 * `session/request_permission` at all — Caraka has nothing left to enforce, and
 * the decision to put its own guard down belongs in front of the machine.
 */
async function trustCommand(args: string[]) {
  const loaded = await loadConfig();
  t = translator(loaded.config.language ?? "en");
  const workspace = trustWorkspace(args);
  const minutes = parseDuration(flagValue(args, "--for"));
  if (!minutes) throw new Error(t("cli.trustUsage"));
  if (minutes > trustLimitMinutes) throw new Error(t("cli.trustTooLong"));
  const bypass = args.includes("--bypass");
  const scrub = createScrubber(startupSecrets(loaded));
  const store = new Store(loaded.paths.database, scrub);
  const expiresAt = Date.now() + minutes * 60_000;
  const id = store.openGrant({
    workspace,
    mode: "trusted",
    grantedBy: "cli",
    principal: null,
    agentMode: bypass ? "bypassPermissions" : null,
    expiresAt,
  });
  store.audit("trust.open", bypass ? "bypass" : "granted", {
    id,
    workspace,
    minutes,
    expiresAt,
    // Nothing inside a bypass window reaches Caraka, so nothing inside it is
    // audited. The window is the record; the actions are not.
    auditedActionsInside: !bypass,
  });
  store.close();
  const until = new Date(expiresAt).toISOString();
  console.log(t(bypass ? "cli.bypassOpened" : "cli.trustOpened", { workspace, until }));
}

/**
 * The dashboard runs as its own process against the same database, which is the
 * point: the run people most want to read is the one that already crashed, and a
 * flag on `start` cannot serve a gateway that is not running. SQLite in WAL mode
 * serves readers across processes, so `caraka start` needs no change at all.
 *
 * The order matters. The one audit line is written through an ordinary handle
 * and that handle is closed again before the read-only one opens, so the
 * dashboard itself never holds anything that could write. The warning for a
 * non-loopback bind is printed before `listen`, so no reader can arrive ahead
 * of it.
 */
export async function dashboardCommand(args: string[]) {
  const loaded = await loadConfig();
  t = translator(loaded.config.language ?? "en");
  const { host, port, exposed } = resolveBind(args, t);
  if (!existsSync(loaded.paths.database))
    throw new Error(t("cli.dashboardNoDatabase", { path: loaded.paths.database }));
  const scrub = createScrubber(startupSecrets(loaded));
  const store = new Store(loaded.paths.database, scrub);
  store.audit("dashboard.start", exposed ? "exposed" : "loopback", { host, port });
  store.close();
  if (exposed) console.log(t("cli.dashboardExposed", { host, port }));
  const server = createDashboard({
    dbPath: loaded.paths.database,
    scrub,
    t,
    version: VERSION,
    memoryProvider: loaded.config.memory.provider,
    exposed,
  });
  await new Promise<void>((listening, failed) => {
    server.once("error", (error: NodeJS.ErrnoException) =>
      failed(error.code === "EADDRINUSE" ? new Error(t("cli.dashboardPortBusy", { port })) : error),
    );
    server.listen(port, host, listening);
  });
  const address = server.address();
  const bound = typeof address === "object" && address !== null ? address.port : port;
  console.log(t("cli.dashboardReady", { url: `http://${host}:${bound}/` }));
  return server;
}

async function serviceCommand(args: string[]) {
  const kind = flagValue(args, "--print");
  if (!isServiceKind(kind)) throw new Error(t("cli.serviceUsage"));
  const loaded = await loadConfig();
  t = translator(loaded.config.language ?? "en");
  const cliPath = fileURLToPath(new URL("../bin/caraka.mjs", import.meta.url));
  for (const path of [loaded.config.workspace.path, cliPath])
    if (!(await stat(path).catch(() => null)))
      throw new Error(t("cli.servicePathMissing", { path }));
  console.log(
    serviceUnit({
      kind,
      execPath: process.execPath,
      cliPath,
      workspace: loaded.config.workspace.path,
    }),
  );
}

function help() {
  console.log(
    t("cli.help", {
      version: VERSION,
      body: `  caraka init [--workspace PATH]         Pair Telegram and Claude Code
  caraka doctor                          Check the installation without changing it
  caraka start                           Run the long-polling gateway
  caraka stop                            Send SIGTERM to the running gateway
  caraka status                          Report whether the gateway is running
  caraka dashboard [--port n]            Read-only dashboard on 127.0.0.1:7718
  caraka trust <workspace> --for 30m     Open a trust window from this terminal
  caraka service --print systemd         Print a unit file; installs nothing
  caraka --version                       Show the version`,
    }),
  );
}

export async function main(args: string[]) {
  try {
    const [subcommand] = args;
    if (subcommand === "init") await init(args.slice(1));
    else if (subcommand === "doctor") await doctor();
    else if (subcommand === "start") await start(args.slice(1));
    else if (subcommand === "stop") await stopCommand();
    else if (subcommand === "status") await statusCommand();
    else if (subcommand === "dashboard") await dashboardCommand(args.slice(1));
    else if (subcommand === "trust") await trustCommand(args.slice(1));
    else if (subcommand === "service") await serviceCommand(args.slice(1));
    else if (subcommand === "--version" || subcommand === "-v") console.log(VERSION);
    else help();
  } catch (error) {
    console.error(
      t("cli.stopped", {
        message: error instanceof Error ? error.message : t("cli.unknownError"),
      }),
    );
    process.exitCode = 1;
  }
}
