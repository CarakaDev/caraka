import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { Telegram } from "./channels/telegram.js";
import { carakaPaths, defaultConfig, loadConfig, privateFile, saveConfig } from "./config.js";
import { Gateway } from "./core/gateway.js";
import { createScrubber } from "./core/security.js";
import { ClaudeAcp } from "./drivers/claude-acp.js";
import { Store } from "./store/db.js";

const VERSION = "0.1.0";

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
          reject(new Error("Instalasi dibatalkan."));
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
    throw new Error("Isi path setelah `--workspace`.");
  return resolve(requested ?? process.cwd());
}

async function init(args: string[]) {
  const workspace = workspaceArg(args);
  if (Number(process.versions.node.split(".")[0]) < 22)
    throw new Error("Node.js 22 atau lebih baru diperlukan.");
  if (command("git", ["--version"]).status !== 0)
    throw new Error("Git tidak ditemukan. Pasang Git, lalu jalankan init lagi.");
  if (command("claude", ["--version"]).status !== 0)
    throw new Error("Claude Code tidak ditemukan. Pasang Claude Code, lalu jalankan init lagi.");
  if (!claudeAuthenticated())
    throw new Error("Claude Code belum login. Jalankan `claude auth login`, lalu ulangi init.");
  if ((await stat(workspace).catch(() => null))?.isDirectory() !== true)
    throw new Error(`Workspace tidak ditemukan: ${workspace}`);

  console.log(`\nꦕꦫꦏ  caraka v${VERSION}\nWorkspace: ${workspace}\nClaude: siap\n`);
  const token =
    process.env.CARAKA_TELEGRAM_TOKEN?.trim() ||
    (await secretQuestion("Token bot dari @BotFather (tidak ditampilkan): "));
  if (!token) throw new Error("Token Telegram kosong.");
  const telegram = new Telegram(token);
  let bot;
  try {
    bot = await telegram.getMe();
  } catch {
    throw new Error("Token Telegram ditolak. Salin token baru dari @BotFather lalu coba lagi.");
  }
  if (!bot.username) throw new Error("Bot Telegram tidak memiliki username.");
  await telegram.deleteWebhook();

  const pairCode = randomBytes(9).toString("base64url");
  console.log(
    `\nBuka tautan ini dan tekan Start:\nhttps://t.me/${bot.username}?start=pair_${pairCode}`,
  );
  console.log("Menunggu pairing selama 5 menit…");
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
    if (controller.signal.aborted)
      throw new Error("Pairing habis waktu. Jalankan `caraka init` lagi.");
    throw new Error("Pairing Telegram gagal. Periksa koneksi lalu coba lagi.");
  } finally {
    clearTimeout(timeout);
  }

  const rl = createInterface({ input: stdin, output: stdout });
  const identity = paired.username ? `@${paired.username}` : paired.first_name;
  const confirmation = await rl.question(
    `Izinkan ${identity} (ID ${paired.id}) mengirim tugas? Ketik ya: `,
  );
  rl.close();
  if (confirmation.trim().toLowerCase() !== "ya")
    throw new Error("Pairing dibatalkan; tidak ada konfigurasi yang disimpan.");

  await telegram.deleteWebhook(true);

  const config = defaultConfig(
    workspace,
    bot.username,
    String(paired.id),
    bot.has_topics_enabled === true,
  );
  const paths = await saveConfig(config, token);
  console.log(`\nSiap. Konfigurasi: ${paths.config}`);
  console.log(`Bot: @${bot.username}`);
  console.log(
    `Topic: ${config.telegram.topics ? "aktif" : "linear (aktifkan topic mode di @BotFather bila diinginkan)"}`,
  );
  console.log("Keamanan: chat pribadi + allowlist + approval sekali pakai");
  console.log("\nMulai dengan:\n  npx caraka start\n");
}

async function doctor() {
  const checks: Array<[string, boolean, string]> = [];
  checks.push(["Node.js", Number(process.versions.node.split(".")[0]) >= 22, process.version]);
  checks.push(["Git", command("git", ["--version"]).status === 0, "jalankan instalasi Git"]);
  checks.push(["Claude Code", command("claude", ["--version"]).status === 0, "pasang Claude Code"]);
  checks.push(["Claude login", claudeAuthenticated(), "jalankan `claude auth login`"]);
  let loaded: Awaited<ReturnType<typeof loadConfig>>;
  try {
    loaded = await loadConfig();
    checks.push(["Config", true, loaded.paths.config]);
  } catch {
    checks.push(["Config", false, `jalankan \`caraka init\` (${carakaPaths().config})`]);
    printChecks(checks);
    process.exitCode = 1;
    return;
  }
  checks.push([
    "Workspace",
    (await stat(loaded.config.workspace.path).catch(() => null))?.isDirectory() === true,
    loaded.config.workspace.path,
  ]);
  checks.push(["Token mode", await privateFile(loaded.paths.token), "harus 0600"]);
  checks.push(["Approval key mode", await privateFile(loaded.paths.approvalKey), "harus 0600"]);
  checks.push(["Allowlist", loaded.config.telegram.allowFrom.length > 0, "jalankan init lagi"]);
  try {
    const me = await new Telegram(loaded.token).getMe();
    checks.push([
      "Telegram",
      me.username === loaded.config.telegram.botUsername,
      `@${me.username ?? "unknown"}`,
    ]);
  } catch {
    checks.push(["Telegram", false, "token atau koneksi bermasalah"]);
  }
  printChecks(checks);
  if (checks.some(([, ok]) => !ok)) process.exitCode = 1;
}

function printChecks(checks: Array<[string, boolean, string]>) {
  console.log("");
  for (const [name, ok, detail] of checks)
    console.log(`${ok ? "✓" : "✗"} ${name}: ${ok ? "siap" : detail}`);
  console.log("");
}

async function start() {
  const loaded = await loadConfig();
  if (loaded.config.telegram.allowFrom.length === 0)
    throw new Error("Allowlist kosong. Jalankan `caraka init` lagi.");
  const scrub = createScrubber([loaded.token, loaded.approvalKey.toString("base64url")]);
  const store = new Store(loaded.paths.database, scrub);
  const gateway = new Gateway(
    loaded.config,
    loaded.approvalKey,
    new Telegram(loaded.token),
    new ClaudeAcp(),
    store,
    scrub,
  );
  console.log(
    `Caraka aktif: @${loaded.config.telegram.botUsername} → Claude (${loaded.config.workspace.path})`,
  );
  const stop = () => void gateway.stop();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    await gateway.run();
  } finally {
    await gateway.stop();
  }
}

function help() {
  console.log(`
ꦕꦫꦏ  caraka v${VERSION}

  caraka init [--workspace PATH]  Pasangkan Telegram dan Claude Code
  caraka doctor                  Periksa instalasi tanpa mengubahnya
  caraka start                   Jalankan gateway long-polling
  caraka --version               Tampilkan versi
`);
}

export async function main(args: string[]) {
  try {
    const [subcommand] = args;
    if (subcommand === "init") await init(args.slice(1));
    else if (subcommand === "doctor") await doctor();
    else if (subcommand === "start") await start();
    else if (subcommand === "--version" || subcommand === "-v") console.log(VERSION);
    else help();
  } catch (error) {
    console.error(
      `\nCaraka berhenti: ${error instanceof Error ? error.message : "kesalahan tidak dikenal"}\n`,
    );
    process.exitCode = 1;
  }
}
