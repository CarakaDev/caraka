import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, isAbsolute, join, resolve } from "node:path";
import { parse, stringify } from "yaml";
import { z } from "zod";
import { POLICY_MODES, type PolicyMode } from "./core/security.js";
import type { Language } from "./i18n.js";
// The adapter owns the number, because the adapter is what was run against a
// live Titen. A second copy here is what shipped 7717 to every install.
import { DEFAULT_ENDPOINT as TITEN_ENDPOINT } from "./memory/titen.js";

// One entry per repository the gateway serves (`docs/erd.md` workspace table).
// `driver` forces a route and `agent` names the preset new sessions start on;
// both are written only by hand. A policy `mode` field is deliberately absent
// here: what a conversation may do is a property of the conversation, so the
// gate reads `modes` off the channel block below and never off a workspace.
const workspaceEntry = z.object({
  slug: z.string().min(1),
  path: z.string().refine(isAbsolute, "workspaces[].path must be absolute"),
  driver: z.enum(["acp", "cli"]).optional(),
  agent: z.string().min(1).optional(),
});

// A trusted window has a clock on it (hard rule 3), so it is opened by
// `caraka trust` and never written here, where nothing would close it again.
const configuredMode = z.enum(POLICY_MODES).refine((mode) => mode !== "trusted", {
  message:
    "A trusted window has to expire, so it is opened by `caraka trust <workspace> --for <duration>` and never written into config.yaml. Use assisted here.",
});

// Two lists per channel, two decisions: a message is served only when its
// container is on one and its sender on the other. The ids inside are the
// channel's own, so they are never compared across channels.
const allowlists = {
  allowFrom: z.array(z.string()).min(1),
  // A v0.1 file has neither the key nor a group, and its DM chat id is the
  // operator's own id.
  allowChats: z.array(z.string()).default([]),
  // The opt-in `docs/security.md` §4 control 6 asks for: container id — or, in
  // a private conversation, the principal's own id — to policy mode. An id
  // nobody wrote here keeps the documented default, `assisted` in a private
  // conversation and `read-only` in a room.
  modes: z.record(z.string(), configuredMode).default({}),
};

const configShape = {
  version: z.literal(1),
  // Absent in every v0.1 file on disk. English is the answer when nobody chose.
  language: z.enum(["en", "id"]).optional(),
  workspace: z.object({
    name: z.string().min(1),
    path: z.string().refine(isAbsolute, "workspace.path must be absolute"),
    // Absent means automatic selection: ACP when the preset's adapter resolves,
    // the CLI route otherwise. Written only by hand (`docs/troubleshooting.md`).
    driver: z.enum(["acp", "cli"]).optional(),
  }),
  // Absent in every file the wizard wrote: the singular `workspace` above is
  // then the whole list. Written only by hand, and additive — `version` stays 1.
  workspaces: z.array(workspaceEntry).optional(),
  // Optional since v0.5, when it stopped being the only channel. Every file the
  // wizard ever wrote has it, and the refinement below still refuses a file
  // with no channel at all.
  telegram: z
    .object({
      botUsername: z.string().min(1),
      ...allowlists,
      topics: z.boolean(),
    })
    .optional(),
  // Additive, `version` stays 1 (the `workspaces[]` precedent below). `threads`
  // is the same switch `telegram.topics` is: whether this channel may open a
  // thread per session at all.
  discord: z
    .object({
      appId: z.string().min(1),
      ...allowlists,
      threads: z.boolean().default(true),
    })
    .optional(),
  // Additive as well, and the third channel to use `allowlists`. Two providers
  // sit behind one block because core's behaviour is identical either way apart
  // from `caps.edit` (FR-CHAN-03, `spec/whatsapp-v06.md` §6). No token lives
  // here: `docs/security.md` §7 keeps channel credentials in `secrets/`.
  whatsapp: z
    .object({
      provider: z.enum(["baileys", "cloud-api"]),
      // One list, not two: a WhatsApp group names itself as the sender, so
      // Caraka refuses group messages outright (`src/channels/whatsapp.ts`
      // `receive`) and there is no room for a room allowlist to gate.
      allowFrom: allowlists.allowFrom,
      // Every container here is a private conversation, so these are keyed by
      // the principal.
      modes: allowlists.modes,
      // The number the linked device runs as. AC-8.10: keep it apart from the
      // personal number.
      number: z.string().min(1).optional(),
      // FR-SETUP-06. `baileys` logs in as a linked device on a real account, and
      // the account can be banned for it; the flag is where the operator says so.
      acknowledgeRisk: z.boolean().default(false),
      phoneNumberId: z.string().min(1).optional(),
      // Only the Cloud API listens, and only on loopback unless `caraka start`
      // is given `--bind` (`docs/frd.md` FR-OPS-01).
      webhook: z
        .object({
          port: z.number().int().min(0).max(65535).default(7719),
          path: z.string().startsWith("/").default("/whatsapp"),
        })
        .default({ port: 7719, path: "/whatsapp" }),
    })
    .superRefine((block, ctx) => {
      if (block.provider === "baileys" && !block.acknowledgeRisk)
        ctx.addIssue({
          code: "custom",
          path: ["acknowledgeRisk"],
          message:
            "whatsapp.provider baileys needs acknowledgeRisk: true. The account can be banned for it; https://github.com/CarakaDev/caraka/blob/main/docs/whatsapp-risiko.en.md says what is known about how often.",
        });
      if (block.provider === "cloud-api" && !block.phoneNumberId)
        ctx.addIssue({
          code: "custom",
          path: ["phoneNumberId"],
          message: "whatsapp.provider cloud-api needs phoneNumberId from the Meta app.",
        });
    })
    .optional(),
  agent: z.object({
    adapter: z.literal("claude-agent-acp"),
    adapterVersion: z.literal("0.63.0"),
  }),
  // Absent in every file written before v0.3. Nobody chose a memory provider
  // then, and `local` works with no extra process, so absence reads as `local`.
  memory: z
    .object({
      provider: z.enum(["titen", "local", "none"]).default("local"),
      endpoint: z.string().default(TITEN_ENDPOINT),
    })
    .default({ provider: "local", endpoint: TITEN_ENDPOINT }),
};

// FR-SETUP-05 at the schema: a gateway with no channel has nothing to answer
// on, and finding that out on the first task is finding it out too late.
const configSchema = z
  .object(configShape)
  .refine((config) => Boolean(config.telegram ?? config.discord ?? config.whatsapp), {
    message:
      "No channel is configured. Add a telegram:, discord: or whatsapp: block to config.yaml.",
    path: ["telegram"],
  });

export type CarakaConfig = z.infer<typeof configSchema>;
export type Workspace = z.infer<typeof workspaceEntry>;

/** What core needs from a channel's config block, keyed by the channel's id. */
export type ChannelBlock = {
  allowFrom: string[];
  allowChats: string[];
  threads: boolean;
  modes: Record<string, PolicyMode>;
};

/**
 * The one place the channel names are written down. Core reads this map and
 * keys everything by the id it finds, so no comparison against a channel name
 * survives past `src/config.ts` (hard rule 1).
 */
export function channelBlocks(config: CarakaConfig): Record<string, ChannelBlock> {
  const { telegram, discord, whatsapp } = config;
  const blocks: Record<string, ChannelBlock> = {};
  if (telegram)
    blocks.telegram = {
      allowFrom: telegram.allowFrom,
      allowChats: telegram.allowChats,
      threads: telegram.topics,
      modes: telegram.modes,
    };
  if (discord)
    blocks.discord = {
      allowFrom: discord.allowFrom,
      allowChats: discord.allowChats,
      threads: discord.threads,
      modes: discord.modes,
    };
  // WhatsApp holds no threads on either provider, so every session there runs
  // linear behind the header core already writes. The room list is empty
  // because no room reaches this channel at all.
  if (whatsapp)
    blocks.whatsapp = {
      allowFrom: whatsapp.allowFrom,
      allowChats: [],
      threads: false,
      modes: whatsapp.modes,
    };
  return blocks;
}

// The one reading of the two workspace fields: `workspaces[]` when the operator
// wrote it, otherwise the singular `workspace` lifted into a one-element list —
// `name` becomes the slug, and the file on disk is never rewritten.
export function workspaces(config: CarakaConfig): [Workspace, ...Workspace[]] {
  // `resolve()` where the path becomes a key, and the `isAbsolute` refines above
  // stay because they are what names the field in the error. Node's own
  // documentation calls `isAbsolute` "not safe for mitigating path traversals",
  // and nothing here ever called `resolve`: `isAbsolute('/srv/app/../../etc')` is
  // true, and `/srv/app/` and `/srv/app` were two `policy_grant.workspace` keys,
  // two `workspace:<path>` memory scopes, and one directory.
  const canonical = (entry: Workspace): Workspace => ({ ...entry, path: resolve(entry.path) });
  const [first, ...rest] = config.workspaces ?? [];
  if (first) return [canonical(first), ...rest.map(canonical)];
  const { name, path, driver } = config.workspace;
  return [{ slug: name, path: resolve(path), ...(driver ? { driver } : {}) }];
}

/**
 * The workspace entry a signed card asked for, appended to `config.yaml`. The
 * list it joins is the lifted one: `workspaces()` picks `workspaces[]` and
 * ignores the singular `workspace` entirely, so writing a one-element list to a
 * file the wizard wrote would take the original workspace away. `version` is
 * untouched, the way `workspaces[]` has been additive since v0.4, and
 * `atomicSecret` writes 0600.
 */
export async function addAllowedWorkspace(config: CarakaConfig, entry: Workspace) {
  const next: CarakaConfig = { ...config, workspaces: [...workspaces(config), entry] };
  await atomicSecret(carakaPaths().config, stringify(next));
  return next;
}

export function carakaPaths(root = process.env.CARAKA_HOME ?? join(homedir(), ".caraka")) {
  const base = resolve(root);
  return {
    root: base,
    config: join(base, "config.yaml"),
    // The directory every credential sits in, named here because two commands
    // now need it by name: `saveConfig` creates it and `caraka uninstall`
    // removes it.
    secrets: join(base, "secrets"),
    // Written by `src/discovery.ts`, which computes the same path from `root`.
    // It is listed here because uninstall removes what Caraka created, and a
    // path nobody wrote down is a path uninstall leaves behind.
    discovery: join(base, "discovery.json"),
    // Where a chat attachment lands while a run reads it, one subdirectory per
    // run, at 0700. Not under `secrets/`, which holds credentials, and named
    // here for the same reason `discovery` is: uninstall removes what it can
    // name.
    inbox: join(base, "inbox"),
    // `token` keeps its name: renaming it to `telegramToken` touches four call
    // sites and changes nothing.
    token: join(base, "secrets", "telegram.token"),
    discordToken: join(base, "secrets", "discord.token"),
    // The Baileys auth state is a credential, not session state: whoever holds
    // the directory holds the WhatsApp session of that number
    // (`docs/security.md` §7), so it sits under `secrets/` at 0700.
    whatsappSession: join(base, "secrets", "whatsapp"),
    whatsappToken: join(base, "secrets", "whatsapp.token"),
    whatsappVerify: join(base, "secrets", "whatsapp.verify"),
    // What Meta signs `X-Hub-Signature-256` with. A different secret from the
    // verify token, which only answers the GET handshake.
    whatsappAppSecret: join(base, "secrets", "whatsapp.appsecret"),
    approvalKey: join(base, "secrets", "approval.key"),
    // Titen's own store, pinned here rather than left to `--db`'s default. That
    // default is `titen.db` relative to the working directory, so a `bootstrap`
    // run from one place and a `serve` run from another are two databases: the
    // second is created empty, and every keyed route then answers 401 — which
    // reads exactly like a wrong key. One fixed path means the command Caraka
    // prints and the command Caraka ran cannot disagree.
    titenDb: join(base, "titen.db"),
    // The key `titen bootstrap` prints once and never shows again. It lives under
    // `secrets/`, so `uninstallTargets` already removes it with that directory.
    titenKey: join(base, "secrets", "titen.key"),
    database: join(base, "caraka.db"),
    pid: join(base, "caraka.pid"),
  };
}

/**
 * Write, lock, then move into place. The config file goes out this way too: it
 * is not a credential, but it is written 0600 by the same three lines, and two
 * copies of a rename-into-place is one copy away from a half-written config.
 */
export async function atomicSecret(path: string, value: string) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, value, { mode: 0o600 });
  await chmod(temporary, 0o600);
  await rename(temporary, path);
}

/** The credentials a channel block needs, each written 0600 and never to YAML. */
export type ChannelSecrets = {
  discordToken?: string;
  whatsappToken?: string;
  whatsappVerify?: string;
  whatsappAppSecret?: string;
};

export async function saveConfig(
  config: CarakaConfig,
  token: string,
  secrets: ChannelSecrets = {},
) {
  const paths = carakaPaths();
  await mkdir(paths.secrets, { recursive: true, mode: 0o700 });
  await chmod(paths.root, 0o700);
  await chmod(paths.secrets, 0o700);
  if (token) await atomicSecret(paths.token, `${token.trim()}\n`);
  for (const name of [
    "discordToken",
    "whatsappToken",
    "whatsappVerify",
    "whatsappAppSecret",
  ] as const) {
    const value = secrets[name];
    if (value) await atomicSecret(paths[name], `${value.trim()}\n`);
  }
  try {
    await stat(paths.approvalKey);
  } catch {
    await atomicSecret(paths.approvalKey, randomBytes(32).toString("base64url"));
  }
  await atomicSecret(paths.config, stringify(config));
  return paths;
}

async function channelToken(variable: string, path: string) {
  const fromEnv = process.env[variable];
  return (fromEnv ?? (await readFile(path, "utf8"))).trim();
}

export async function loadConfig() {
  const paths = carakaPaths();
  const config = configSchema.parse(parse(await readFile(paths.config, "utf8")));
  // One token per configured channel, and none for a channel that is not.
  const token = config.telegram ? await channelToken("CARAKA_TELEGRAM_TOKEN", paths.token) : "";
  const discordToken = config.discord
    ? await channelToken("CARAKA_DISCORD_TOKEN", paths.discordToken)
    : "";
  // Baileys carries its own linked-device credential in `secrets/whatsapp/` and
  // needs none of these three. A missing file reads as an empty string here so
  // the sentence below can name what is missing instead of raising ENOENT.
  const cloud = config.whatsapp?.provider === "cloud-api";
  const read = async (variable: string, path: string) =>
    cloud ? channelToken(variable, path).catch(() => "") : "";
  const whatsappToken = await read("CARAKA_WHATSAPP_TOKEN", paths.whatsappToken);
  const whatsappVerify = await read("CARAKA_WHATSAPP_VERIFY_TOKEN", paths.whatsappVerify);
  const whatsappAppSecret = await read("CARAKA_WHATSAPP_APP_SECRET", paths.whatsappAppSecret);
  // The memory key, read the way every channel token above is read: the
  // environment first, the secret file when the environment is silent. `init`
  // writes that file, so nobody has to export anything by hand for the provider
  // it just set up. The variable keeps its `CARAKA_` prefix, and that prefix is
  // what `claudeEnvironment()` strips before any coding agent is spawned.
  const titenKey =
    config.memory.provider === "titen"
      ? await channelToken("CARAKA_TITEN_API_KEY", paths.titenKey).catch(() => "")
      : "";
  const approvalKey = Buffer.from((await readFile(paths.approvalKey, "utf8")).trim(), "base64url");
  if ((config.telegram && !token) || (config.discord && !discordToken) || approvalKey.length < 32)
    throw new Error("Caraka secrets are incomplete. Run `caraka init` again.");
  if (cloud && !(whatsappToken && whatsappVerify && whatsappAppSecret))
    throw new Error(
      "The WhatsApp Cloud API needs an access token, a webhook verify token, and the app secret in ~/.caraka/secrets/ or in CARAKA_WHATSAPP_TOKEN, CARAKA_WHATSAPP_VERIFY_TOKEN and CARAKA_WHATSAPP_APP_SECRET.",
    );
  return {
    config,
    token,
    discordToken,
    whatsappToken,
    whatsappVerify,
    whatsappAppSecret,
    titenKey,
    approvalKey,
    paths,
  };
}

export async function privateFile(path: string) {
  const mode = (await stat(path)).mode & 0o777;
  return process.platform === "win32" || (mode & 0o077) === 0;
}

export function defaultConfig(
  workspace: string,
  botUsername: string,
  principal: string,
  topics: boolean,
  language: Language = "en",
  memory: CarakaConfig["memory"]["provider"] = "local",
): CarakaConfig {
  const path = resolve(workspace);
  return {
    version: 1,
    language,
    workspace: { name: basename(path), path },
    // No mode is written: the shipped file opts nothing in, so the operator's
    // own conversation is `assisted` and anything paired later is `read-only`.
    telegram: { botUsername, allowFrom: [principal], allowChats: [principal], topics, modes: {} },
    agent: { adapter: "claude-agent-acp", adapterVersion: "0.63.0" },
    memory: { provider: memory, endpoint: TITEN_ENDPOINT },
  };
}

export async function addAllowedChat(config: CarakaConfig, channel: string, chatId: string) {
  // WhatsApp is absent on purpose: it has no room list, because no room reaches
  // it (`src/channels/whatsapp.ts` `receive`).
  const block = channel === "discord" ? config.discord : config.telegram;
  if (!block || block.allowChats.includes(chatId)) return config;
  const next: CarakaConfig = {
    ...config,
    [channel]: { ...block, allowChats: [...block.allowChats, chatId] },
  };
  await atomicSecret(carakaPaths().config, stringify(next));
  return next;
}
