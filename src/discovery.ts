// Auto-discovery (`docs/design.md` §"Penemuan agent", FR-SETUP-02): scan PATH
// for the known agent binaries and cache the result for 24 hours in
// `~/.caraka/discovery.json`. Discovery is an aid, never a gate: a missing or
// corrupt cache reads as no cache and the scan runs again. The ACP Registry
// JSON stays unread until something displays it — data nobody looks at is not
// worth a network call on first run.

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { carakaPaths } from "./config.js";
import { resolveCommand } from "./drivers/preset.js";

// The binaries FR-SETUP-02 (`docs/frd.md`) names.
export const knownBinaries = [
  "claude",
  "codex",
  "gemini",
  "cline",
  "cursor-agent",
  "goose",
  "amp",
] as const;

const CACHE_MAX_AGE_MS = 24 * 60 * 60_000;

export type DiscoveredAgent = { binary: string; path: string; version: string | null };
export type Discovery = { at: number; agents: DiscoveredAgent[] };

/**
 * The one discovery entry point. A cache younger than 24 hours answers as is;
 * `refresh` (doctor's call) ignores its age. Every seam is injectable so the
 * tests never touch the real PATH.
 */
export async function discoverAgents(
  options: {
    refresh?: boolean;
    path?: string;
    platform?: string;
    now?: number;
    cacheFile?: string;
  } = {},
): Promise<Discovery> {
  const now = options.now ?? Date.now();
  const cacheFile = options.cacheFile ?? join(carakaPaths().root, "discovery.json");
  const cached = await readCache(cacheFile);
  if (!options.refresh && cached && now - cached.at < CACHE_MAX_AGE_MS) return cached;
  const found: Discovery = {
    at: now,
    agents: scanPath(options.path ?? process.env.PATH ?? "", options.platform),
  };
  // Best effort: a home directory that cannot be written does not break
  // discovery, it only forgets it between runs.
  try {
    await mkdir(dirname(cacheFile), { recursive: true });
    await writeFile(cacheFile, JSON.stringify(found), { mode: 0o600 });
  } catch {
    // Nothing to do; the next caller rescans.
  }
  return found;
}

async function readCache(cacheFile: string): Promise<Discovery | undefined> {
  try {
    const parsed = JSON.parse(await readFile(cacheFile, "utf8")) as Discovery;
    if (typeof parsed.at !== "number" || !Array.isArray(parsed.agents)) return undefined;
    return { at: parsed.at, agents: parsed.agents };
  } catch {
    return undefined;
  }
}

// Doctor used to print a green row for a path that cannot be started, because
// this walk asked whether a name exists rather than whether it can be spawned —
// the same wrong question the driver route asked, one file away. One resolver
// answers both, so a row here and a spawn there cannot disagree.
function scanPath(pathValue: string, platform: string = process.platform) {
  const agents: DiscoveredAgent[] = [];
  for (const binary of knownBinaries) {
    const path = resolveCommand(binary, { platform, path: pathValue });
    if (path) agents.push({ binary, path, version: probeVersion(path) });
  }
  return agents;
}

// `--version` is a convention, not a contract; a binary that answers something
// else is still a discovered binary, only without a version to show.
function probeVersion(command: string) {
  try {
    const result = spawnSync(command, ["--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5_000,
    });
    if (result.status !== 0) return null;
    return result.stdout.trim().split("\n")[0]?.slice(0, 80) || null;
  } catch {
    return null;
  }
}
