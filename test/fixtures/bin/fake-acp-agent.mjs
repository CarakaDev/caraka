// A stand-in ACP agent for the driver tests, speaking the same newline-delimited
// JSON-RPC the SDK writes. Two environment variables order it about:
//   FAKE_ACP_IMAGE   "1" declares `promptCapabilities.image` at initialize
//   FAKE_ACP_RECORD  append every `session/prompt` params object as a JSON line
//   FAKE_ACP_CHILD   start one child of this process and write its pid here,
//                    which is what a tool call looks like from Caraka's side
// Everything else is answered with an empty result, because the driver under test
// only ever sends initialize, session/new, and session/prompt.
import { spawn } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";

if (process.env.FAKE_ACP_CHILD) {
  // Not detached: it belongs to this process's group, so a signal aimed at this
  // pid alone leaves it running.
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    stdio: "ignore",
  });
  writeFileSync(process.env.FAKE_ACP_CHILD, String(child.pid));
}

const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  for (;;) {
    const cut = buffer.indexOf("\n");
    if (cut < 0) return;
    const line = buffer.slice(0, cut).trim();
    buffer = buffer.slice(cut + 1);
    if (!line) continue;
    let request;
    try {
      request = JSON.parse(line);
    } catch {
      continue;
    }
    if (request.id === undefined) continue;
    let result = {};
    if (request.method === "initialize")
      result = {
        protocolVersion: request.params?.protocolVersion ?? 1,
        agentCapabilities: {
          promptCapabilities: { image: process.env.FAKE_ACP_IMAGE === "1" },
        },
      };
    else if (request.method === "session/new") result = { sessionId: "acp-session-1" };
    else if (request.method === "session/prompt") {
      if (process.env.FAKE_ACP_RECORD)
        appendFileSync(process.env.FAKE_ACP_RECORD, `${JSON.stringify(request.params)}\n`);
      result = { stopReason: "end_turn" };
    }
    send({ jsonrpc: "2.0", id: request.id, result });
  }
});
