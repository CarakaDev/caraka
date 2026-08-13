// One coding agent = one YAML file in `presets/agents/`. The schema holds
// exactly the fields the loader and the CLI driver read; the wider table in
// `docs/api.md` keeps the future fields, and each one enters here when a
// driver starts reading it. YAML with Zod, never executable config
// (`docs/techstack.md`).

import { statSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { delimiter, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { z } from "zod";
import { translator, type Translate } from "../i18n.js";

const outputFormat = z.enum(["json", "jsonl", "text"]);

export const presetSchema = z
  .object({
    id: z.string().min(1),
    driver: z.enum(["acp", "cli", "mcp"]),
    command: z.string().min(1).optional(),
    args: z.array(z.string()).default([]),
    resumeArgs: z.array(z.string()).optional(),
    input: z.enum(["arg", "stdin"]).default("arg"),
    maxPromptArgChars: z.number().int().positive().optional(),
    output: outputFormat.optional(),
    resumeOutput: outputFormat.optional(),
    sessionIdFields: z.array(z.string()).default([]),
    // The flag that puts an image path in front of a CLI agent, and how more than
    // one of them is arranged. Absent means this route takes no file at all, which
    // is what core answers the sender with. The two words are the ones
    // `docs/research/coding-agents-matriks-integrasi-multi-sumber.md` already
    // recorded, not two new ones.
    imageArg: z.string().min(1).optional(),
    imageMode: z.enum(["repeat", "join"]).default("repeat"),
    env: z.record(z.string(), z.string()).default({}),
    acp: z
      .object({
        command: z.string().min(1),
        args: z.array(z.string()).default([]),
        env: z.record(z.string(), z.string()).default({}),
        // Whether this adapter was seen sending `session/request_permission`
        // on a real run. One adapter class serves every ACP preset, so the
        // claim belongs to the agent, not to the class. Unset means nobody
        // watched, and a read-only run refuses a route nobody watched.
        asksPermission: z.boolean().default(false),
      })
      .strict()
      .optional(),
  })
  .strict();

export type AgentPreset = z.infer<typeof presetSchema>;

const packagePresets = fileURLToPath(new URL("../../presets/agents/", import.meta.url));

// The adapter name `config.ts` pins, so the copy this package ships.
export const lockedAdapter = "claude-agent-acp";
const resolveModule = (specifier: string) => fileURLToPath(import.meta.resolve(specifier));

/**
 * Reads every preset in the directory. A file that fails validation is named
 * with its failing field and skipped; the rest still load (AC-3.2).
 */
export async function loadPresets(directory = packagePresets, t: Translate = translator()) {
  const presets = new Map<string, AgentPreset>();
  const errors: string[] = [];
  let files: string[] = [];
  try {
    files = (await readdir(directory)).filter((name) => /\.ya?ml$/.test(name));
  } catch {
    // A missing directory is zero presets, not a failure.
    return { presets, errors };
  }
  for (const file of files.sort()) {
    try {
      const preset = presetSchema.parse(parse(await readFile(join(directory, file), "utf8")));
      presets.set(preset.id, preset);
    } catch (error) {
      const field =
        error instanceof z.ZodError ? (error.issues[0]?.path.join(".") ?? "") || "root" : "yaml";
      errors.push(t("preset.invalid", { file, field }));
    }
  }
  return { presets, errors };
}

// `existsSync` says yes to a directory too, and a directory is not a command.
const isFile = (file: string) => statSync(file, { throwIfNoEntry: false })?.isFile() === true;

// What `spawn` accepts for the name a preset writes. libuv appends only `.com`
// and `.exe` while walking PATH (`path_search_walk_ext`, `libuv/src/win/process.c`),
// and npm writes three files per bin on Windows — the `.ps1`, the `.cmd`, and a
// `#!/bin/sh` script named like the bin — so a bare name resolves to the sh script
// and spawning it answers `-4058`, UV_ENOENT. The `.cmd` is no way out: Node
// refuses it without `shell` since CVE-2024-27980, and a test sweeps `src/` to
// keep `shell` out.
function spawnable(base: string, platform: string) {
  if (platform !== "win32" || /\.(exe|com)$/i.test(base)) return isFile(base) ? base : null;
  return [`${base}.exe`, `${base}.com`].find(isFile) ?? null;
}

/**
 * Finds a command as an absolute path that can be spawned, or null. The locked
 * adapter is resolved as a module, because what npm writes for it on Windows is
 * a shim nothing can spawn, and a resolver that throws is an adapter nobody
 * installed. Every seam has a default, so the win32 branch is provable here.
 */
export function resolveCommand(
  command: string,
  {
    platform = process.platform,
    path = process.env.PATH ?? "",
    resolve = resolveModule,
  }: { platform?: string; path?: string; resolve?: (specifier: string) => string } = {},
) {
  if (command === lockedAdapter) {
    try {
      const entry = resolve("@agentclientprotocol/claude-agent-acp/dist/index.js");
      return isFile(entry) ? entry : null;
    } catch {
      return null;
    }
  }
  if (isAbsolute(command)) return spawnable(command, platform);
  for (const dir of path.split(delimiter)) {
    const found = dir ? spawnable(join(dir, command), platform) : null;
    if (found) return found;
  }
  return null;
}
