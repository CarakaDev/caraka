import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmod, readFile, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { Telegram, TelegramError } from "./channels/telegram.js";
import { carakaPaths, defaultConfig, loadConfig, privateFile, saveConfig } from "./config.js";
import { Gateway } from "./core/gateway.js";
import { createScrubber, parseDuration, trustLimitMinutes } from "./core/security.js";
import { ClaudeAcp } from "./drivers/claude-acp.js";
import { defaultLanguage, translator, type Language, type Translate } from "./i18n.js";
import { isServiceKind, serviceUnit } from "./service.js";
import { Store } from "./store/db.js";

const VERSION = "0.2.1";

let t: Translate = translator(defaultLanguage());

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
  if (command("claude", ["--version"]).status !== 0) throw new Error(t("cli.claudeMissing"));
  if (!claudeAuthenticated()) throw new Error(t("cli.claudeLogin"));
  if ((await stat(workspace).catch(() => null))?.isDirectory() !== true)
    throw new Error(t("cli.workspaceMissing", { path: workspace }));

  console.log(`\nꦕꦫꦏ  caraka v${VERSION}\nWorkspace: ${workspace}\nClaude: ready\n`);

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

  const config = defaultConfig(
    workspace,
    bot.username,
    String(paired.id),
    bot.has_topics_enabled === true,
    language,
  );
  const paths = await saveConfig(config, token);
  console.log(t("cli.ready", { path: paths.config }));
  console.log(`Bot: @${bot.username}`);
  console.log("\n  npx caraka start\n");
}

async function doctor() {
  const checks: Array<[string, boolean, string]> = [];
  checks.push(["Node.js", Number(process.versions.node.split(".")[0]) >= 22, process.version]);
  checks.push(["Git", command("git", ["--version"]).status === 0, "install Git"]);
  checks.push([
    "Claude Code",
    command("claude", ["--version"]).status === 0,
    "install Claude Code",
  ]);
  checks.push(["Claude login", claudeAuthenticated(), "run `claude auth login`"]);
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
  checks.push(["Token mode", await privateFile(loaded.paths.token), "must be 0600"]);
  checks.push(["Approval key mode", await privateFile(loaded.paths.approvalKey), "must be 0600"]);
  checks.push(["Allowlist", loaded.config.telegram.allowFrom.length > 0, "run init again"]);
  try {
    const me = await new Telegram(loaded.token, fetch, undefined, t).getMe();
    checks.push([
      "Telegram",
      me.username === loaded.config.telegram.botUsername,
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
  printChecks(checks);
  if (checks.some(([, ok]) => !ok)) process.exitCode = 1;
}

function printChecks(checks: Array<[string, boolean, string]>) {
  console.log("");
  for (const [name, ok, detail] of checks)
    console.log(`${ok ? "✓" : "✗"} ${name}: ${ok ? "ready" : detail}`);
  console.log("");
}

async function start() {
  const loaded = await loadConfig();
  t = translator(loaded.config.language ?? "en");
  if (loaded.config.telegram.allowFrom.length === 0) throw new Error(t("cli.allowlistEmpty"));
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

  const scrub = createScrubber([loaded.token, loaded.approvalKey.toString("base64url")]);
  const store = new Store(loaded.paths.database, scrub);
  const language = translator(loaded.config.language ?? "en");
  const gateway = new Gateway(
    loaded.config,
    loaded.approvalKey,
    new Telegram(loaded.token, fetch, undefined, language),
    new ClaudeAcp(language),
    store,
    scrub,
    VERSION,
  );
  console.log(
    t("cli.running", {
      bot: loaded.config.telegram.botUsername,
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
  console.log(
    pid === null
      ? t("cli.statusStopped", {
          workspace: loaded.config.workspace.path,
          bot: loaded.config.telegram.botUsername,
        })
      : t("cli.statusRunning", {
          pid,
          workspace: loaded.config.workspace.path,
          bot: loaded.config.telegram.botUsername,
        }),
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
  const scrub = createScrubber([loaded.token, loaded.approvalKey.toString("base64url")]);
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
    else if (subcommand === "start") await start();
    else if (subcommand === "stop") await stopCommand();
    else if (subcommand === "status") await statusCommand();
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
