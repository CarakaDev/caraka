import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, isAbsolute, join, resolve } from "node:path";
import { parse, stringify } from "yaml";
import { z } from "zod";

const configSchema = z.object({
  version: z.literal(1),
  workspace: z.object({
    name: z.string().min(1),
    path: z.string().refine(isAbsolute, "workspace.path must be absolute"),
  }),
  telegram: z.object({
    botUsername: z.string().min(1),
    allowFrom: z.array(z.string()).min(1),
    topics: z.boolean(),
  }),
  agent: z.object({
    adapter: z.literal("claude-agent-acp"),
    adapterVersion: z.literal("0.63.0"),
  }),
});

export type CarakaConfig = z.infer<typeof configSchema>;

export function carakaPaths(root = process.env.CARAKA_HOME ?? join(homedir(), ".caraka")) {
  const base = resolve(root);
  return {
    root: base,
    config: join(base, "config.yaml"),
    token: join(base, "secrets", "telegram.token"),
    approvalKey: join(base, "secrets", "approval.key"),
    database: join(base, "caraka.db"),
  };
}

async function atomicSecret(path: string, value: string) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, value, { mode: 0o600 });
  await chmod(temporary, 0o600);
  await rename(temporary, path);
}

export async function saveConfig(config: CarakaConfig, token: string) {
  const paths = carakaPaths();
  await mkdir(join(paths.root, "secrets"), { recursive: true, mode: 0o700 });
  await chmod(paths.root, 0o700);
  await chmod(join(paths.root, "secrets"), 0o700);
  await atomicSecret(paths.token, `${token.trim()}\n`);
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

export async function loadConfig() {
  const paths = carakaPaths();
  const config = configSchema.parse(parse(await readFile(paths.config, "utf8")));
  const token = (process.env.CARAKA_TELEGRAM_TOKEN ?? (await readFile(paths.token, "utf8"))).trim();
  const approvalKey = Buffer.from((await readFile(paths.approvalKey, "utf8")).trim(), "base64url");
  if (!token || approvalKey.length < 32)
    throw new Error("Caraka secrets are incomplete. Run `caraka init` again.");
  return { config, token, approvalKey, paths };
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
): CarakaConfig {
  const path = resolve(workspace);
  return {
    version: 1,
    workspace: { name: basename(path), path },
    telegram: { botUsername, allowFrom: [principal], topics },
    agent: { adapter: "claude-agent-acp", adapterVersion: "0.63.0" },
  };
}
