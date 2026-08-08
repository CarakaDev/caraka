import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, isAbsolute, join, resolve } from "node:path";
import { parse, stringify } from "yaml";
import { z } from "zod";
import type { Language } from "./i18n.js";

const TITEN_ENDPOINT = "http://127.0.0.1:7717";

// One entry per repository the gateway serves (`docs/erd.md` workspace table).
// `driver` forces a route and `agent` names the preset new sessions start on;
// both are written only by hand. A policy `mode` field is deliberately absent:
// a config key that promises a safety gate belongs here only once the gate
// exists in the run path.
const workspaceEntry = z.object({
  slug: z.string().min(1),
  path: z.string().refine(isAbsolute, "workspaces[].path must be absolute"),
  driver: z.enum(["acp", "cli"]).optional(),
  agent: z.string().min(1).optional(),
});

// Two lists per channel, two decisions: a message is served only when its
// container is on one and its sender on the other. The ids inside are the
// channel's own, so they are never compared across channels.
const allowlists = {
  allowFrom: z.array(z.string()).min(1),
  // A v0.1 file has neither the key nor a group, and its DM chat id is the
  // operator's own id.
  allowChats: z.array(z.string()).default([]),
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
  .refine((config) => Boolean(config.telegram ?? config.discord), {
    message: "No channel is configured. Add a telegram: or discord: block to config.yaml.",
    path: ["telegram"],
  });

export type CarakaConfig = z.infer<typeof configSchema>;
export type Workspace = z.infer<typeof workspaceEntry>;

/** What core needs from a channel's config block, keyed by the channel's id. */
export type ChannelBlock = { allowFrom: string[]; allowChats: string[]; threads: boolean };

/**
 * The one place the channel names are written down. Core reads this map and
 * keys everything by the id it finds, so no comparison against a channel name
 * survives past `src/config.ts` (hard rule 1).
 */
export function channelBlocks(config: CarakaConfig): Record<string, ChannelBlock> {
  const { telegram, discord } = config;
  return {
    ...(telegram
      ? {
          telegram: {
            allowFrom: telegram.allowFrom,
            allowChats: telegram.allowChats,
            threads: telegram.topics,
          },
        }
      : {}),
    ...(discord
      ? {
          discord: {
            allowFrom: discord.allowFrom,
            allowChats: discord.allowChats,
            threads: discord.threads,
          },
        }
      : {}),
  };
}

// The one reading of the two workspace fields: `workspaces[]` when the operator
// wrote it, otherwise the singular `workspace` lifted into a one-element list —
// `name` becomes the slug, and the file on disk is never rewritten.
export function workspaces(config: CarakaConfig): [Workspace, ...Workspace[]] {
  const [first, ...rest] = config.workspaces ?? [];
  if (first) return [first, ...rest];
  const { name, path, driver } = config.workspace;
  return [{ slug: name, path, ...(driver ? { driver } : {}) }];
}

export function carakaPaths(root = process.env.CARAKA_HOME ?? join(homedir(), ".caraka")) {
  const base = resolve(root);
  return {
    root: base,
    config: join(base, "config.yaml"),
    // `token` keeps its name: renaming it to `telegramToken` touches four call
    // sites and changes nothing.
    token: join(base, "secrets", "telegram.token"),
    discordToken: join(base, "secrets", "discord.token"),
    approvalKey: join(base, "secrets", "approval.key"),
    database: join(base, "caraka.db"),
    pid: join(base, "caraka.pid"),
  };
}

export async function atomicSecret(path: string, value: string) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, value, { mode: 0o600 });
  await chmod(temporary, 0o600);
  await rename(temporary, path);
}

export async function saveConfig(config: CarakaConfig, token: string, discordToken?: string) {
  const paths = carakaPaths();
  await mkdir(join(paths.root, "secrets"), { recursive: true, mode: 0o700 });
  await chmod(paths.root, 0o700);
  await chmod(join(paths.root, "secrets"), 0o700);
  if (token) await atomicSecret(paths.token, `${token.trim()}\n`);
  if (discordToken) await atomicSecret(paths.discordToken, `${discordToken.trim()}\n`);
  try {
    await stat(paths.approvalKey);
  } catch {
    await atomicSecret(paths.approvalKey, randomBytes(32).toString("base64url"));
  }
  const temporary = `${paths.config}.${process.pid}.tmp`;
  await writeFile(temporary, stringify(config), { mode: 0o600 });
  await chmod(temporary, 0o600);
  await rename(temporary, paths.config);
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
  const approvalKey = Buffer.from((await readFile(paths.approvalKey, "utf8")).trim(), "base64url");
  if ((config.telegram && !token) || (config.discord && !discordToken) || approvalKey.length < 32)
    throw new Error("Caraka secrets are incomplete. Run `caraka init` again.");
  return { config, token, discordToken, approvalKey, paths };
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
    telegram: { botUsername, allowFrom: [principal], allowChats: [principal], topics },
    agent: { adapter: "claude-agent-acp", adapterVersion: "0.63.0" },
    memory: { provider: memory, endpoint: TITEN_ENDPOINT },
  };
}

export async function addAllowedChat(config: CarakaConfig, channel: string, chatId: string) {
  const block = channel === "discord" ? config.discord : config.telegram;
  if (!block || block.allowChats.includes(chatId)) return config;
  const next: CarakaConfig = {
    ...config,
    [channel]: { ...block, allowChats: [...block.allowChats, chatId] },
  };
  const paths = carakaPaths();
  const temporary = `${paths.config}.${process.pid}.tmp`;
  await writeFile(temporary, stringify(next), { mode: 0o600 });
  await chmod(temporary, 0o600);
  await rename(temporary, paths.config);
  return next;
}
