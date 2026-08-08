// One coding agent = one YAML file in `presets/agents/`. The schema holds
// exactly the fields the loader and the CLI driver read; the wider table in
// `docs/api.md` keeps the future fields, and each one enters here when a
// driver starts reading it. YAML with Zod, never executable config
// (`docs/techstack.md`).

import { existsSync } from "node:fs";
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
    env: z.record(z.string(), z.string()).default({}),
    acp: z
      .object({
        command: z.string().min(1),
        args: z.array(z.string()).default([]),
        env: z.record(z.string(), z.string()).default({}),
      })
      .strict()
      .optional(),
  })
  .strict();

export type AgentPreset = z.infer<typeof presetSchema>;

const packagePresets = fileURLToPath(new URL("../../presets/agents/", import.meta.url));
const packageBin = fileURLToPath(new URL("../../node_modules/.bin/", import.meta.url));

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

/**
 * Finds a command as an absolute path: the package's own `node_modules/.bin`
 * first (where the locked ACP adapter lives), then `PATH`. Null when nowhere.
 */
// ponytail: no PATHEXT handling — a Windows preset names its `.cmd` shim
// explicitly; add the suffix scan if a Windows install ever needs it.
export function resolveCommand(command: string) {
  if (isAbsolute(command)) return existsSync(command) ? command : null;
  const local = join(packageBin, command);
  if (existsSync(local)) return local;
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (dir && existsSync(join(dir, command))) return join(dir, command);
  }
  return null;
}
