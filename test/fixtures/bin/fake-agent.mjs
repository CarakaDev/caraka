// A stand-in coding agent for the CLI driver tests. Everything it does is
// ordered by environment variables, so one script covers every scenario:
//   FAKE_RECORD       append argv, cwd, selected env, and stdin as a JSON line
//   FAKE_STDOUT       print this to stdout
//   FAKE_STDERR       print this to stderr
//   FAKE_EXIT         exit with this status (default 0)
//   FAKE_IGNORE_TERM  ignore SIGTERM and stay alive, so only SIGKILL ends it
//   FAKE_READY        write this file once the SIGTERM handler is installed
//   FAKE_LOST_ROLLOUT when argv names a resume, fail naming the id it was handed
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

let stdin = "";
try {
  stdin = readFileSync(0, "utf8");
} catch {
  stdin = "";
}

if (process.env.FAKE_RECORD) {
  appendFileSync(
    process.env.FAKE_RECORD,
    `${JSON.stringify({
      argv: process.argv.slice(2),
      cwd: process.cwd(),
      // Every CARAKA_* name that survived the spawn, so the test asserts that
      // none arrived instead of naming the tokens one by one and going stale.
      caraka: Object.keys(process.env).filter((key) => key.startsWith("CARAKA_")),
      env: {
        FAKE_EXTRA: process.env.FAKE_EXTRA ?? null,
      },
      stdin,
    })}\n`,
  );
}

if (process.env.FAKE_IGNORE_TERM === "1") {
  process.on("SIGTERM", () => {});
  setInterval(() => {}, 1000);
  if (process.env.FAKE_READY) writeFileSync(process.env.FAKE_READY, "ready");
} else if (process.env.FAKE_LOST_ROLLOUT === "1" && process.argv.includes("resume")) {
  // What codex-cli 0.147.0 answers when the stored rollout is gone from disk.
  const id = process.argv[process.argv.indexOf("resume") + 1] ?? "";
  process.stderr.write(`thread/resume failed: no rollout found for thread id ${id}`);
  process.exit(1);
} else {
  if (process.env.FAKE_STDERR) process.stderr.write(process.env.FAKE_STDERR);
  if (process.env.FAKE_STDOUT) process.stdout.write(process.env.FAKE_STDOUT);
  process.exit(Number(process.env.FAKE_EXIT ?? 0));
}
