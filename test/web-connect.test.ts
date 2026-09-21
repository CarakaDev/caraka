import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import test from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveConfig, type CarakaConfig } from "../src/config.js";
import { connect } from "../src/web/connect.js";
import { PushService, validSubscription } from "../src/web/push.js";
import { Store } from "../src/store/db.js";
import { createScrubber } from "../src/core/security.js";
import { webCommand } from "../src/web/cli.js";

async function configuredHome() {
  const home = await mkdtemp(join(tmpdir(), "caraka-web-connect-"));
  const prior = process.env.CARAKA_HOME;
  process.env.CARAKA_HOME = home;
  const config: CarakaConfig = {
    version: 1,
    workspace: { name: "demo", path: home },
    agent: { adapter: "claude-agent-acp", adapterVersion: "0.63.0" },
    memory: { provider: "none", endpoint: "http://127.0.0.1:8787" },
    web: { host: "127.0.0.1", port: 7720, origin: "http://127.0.0.1:7720", owner: "test" },
  };
  await saveConfig(config, "");
  return { home, prior };
}

test("web connect tailscale prints a read-only plan by default", async (t) => {
  const { home, prior } = await configuredHome();
  t.after(async () => {
    process.env.CARAKA_HOME = prior;
    await rm(home, { recursive: true, force: true });
  });
  const before = await readFile(join(home, "config.yaml"), "utf8");
  const calls: Array<[string, string[]]> = [];
  const lines: string[] = [];
  const original = console.log;
  console.log = (line: string) => lines.push(line);
  try {
    await webCommand(["connect", "tailscale"], {
      runner: async (command, args) => {
        calls.push([command, args]);
        if (args[0] === "status")
          return {
            code: 0,
            stdout: JSON.stringify({
              BackendState: "Running",
              Self: { DNSName: "device.example.ts.net." },
            }),
            stderr: "",
          };
        return { code: 0, stdout: JSON.stringify({ Web: {} }), stderr: "" };
      },
    });
  } finally {
    console.log = original;
  }
  assert.match(lines.join("\n"), /tailscale serve --bg --https=443/);
  assert.equal(calls.length, 2);
  assert.deepEqual(
    calls.map(([, args]) => args),
    [
      ["status", "--json"],
      ["serve", "status", "--json"],
    ],
  );
  assert.equal(await readFile(join(home, "config.yaml"), "utf8"), before);
});

test("web connect checks health and private API separately from phone verification", async (t) => {
  const { home, prior } = await configuredHome();
  t.after(async () => {
    process.env.CARAKA_HOME = prior;
    await rm(home, { recursive: true, force: true });
  });
  const lines: string[] = [];
  const original = console.log;
  console.log = (line: string) => lines.push(line);
  try {
    await webCommand(["connect", "tailscale", "--check"], {
      request: async (url) =>
        new Response("", { status: String(url).endsWith("/health") ? 200 : 401 }),
    });
  } finally {
    console.log = original;
  }
  assert.match(lines.join("\n"), /Health: passed/);
  assert.match(lines.join("\n"), /Private API rejection: passed/);
  assert.match(lines.join("\n"), /Phone verification: manual/);
});

test("cloudflare keeps the default plan read-only and never overwrites DNS", async (t) => {
  const { home, prior } = await configuredHome();
  t.after(async () => {
    process.env.CARAKA_HOME = prior;
    await rm(home, { recursive: true, force: true });
  });
  const config = (await import("../src/config.js")).parseConfig(
    await readFile(join(home, "config.yaml"), "utf8"),
  );
  const calls: Array<[string, string[]]> = [];
  const runner = async (command: string, args: string[]) => {
    calls.push([command, args]);
    if (args[1] === "list") return { code: 0, stdout: "[]", stderr: "" };
    if (args[1] === "create")
      return { code: 0, stdout: JSON.stringify({ id: "tunnel-id" }), stderr: "" };
    return { code: 0, stdout: "", stderr: "" };
  };
  await connect({
    provider: "cloudflare",
    config,
    root: home,
    hostname: "caraka.example.test",
    apply: false,
    runner,
  });
  assert.deepEqual(calls, [["cloudflared", ["tunnel", "list", "--output", "json"]]]);
  await assert.rejects(stat(join(home, "secrets", "cloudflared")));
  const saved: string[] = [];
  await connect({
    provider: "cloudflare",
    config,
    root: home,
    hostname: "caraka.example.test",
    apply: true,
    runner,
    saveOrigin: async (origin) => void saved.push(origin),
  });
  assert.equal(
    calls.some(([, args]) => args.includes("--overwrite-dns")),
    false,
  );
  assert.deepEqual(saved, ["https://caraka.example.test"]);
  assert.match(
    await readFile(join(home, "secrets", "cloudflared", "caraka-web.yml"), "utf8"),
    /http_status:404/,
  );
});

test("push subscriptions reject private endpoints and expire after revocation", async (t) => {
  const home = await mkdtemp(join(tmpdir(), "caraka-web-push-"));
  const store = new Store(join(home, "caraka.db"), createScrubber([]));
  t.after(async () => {
    store.close();
    await rm(home, { recursive: true, force: true });
  });
  store.db
    .prepare(
      "INSERT INTO web_devices(id,name,token_hash,created_at,revoked_at) VALUES(?,?,?,?,NULL)",
    )
    .run("device", "Phone", "hash", Date.now());
  const sent: string[] = [];
  const push = new PushService({
    store,
    keyPath: join(home, "secrets", "vapid.json"),
    origin: "https://caraka.example.test",
    generate: () => ({ publicKey: "public", privateKey: "private" }),
    send: async (_subscription, payload) => {
      sent.push(payload);
      throw { statusCode: 410 };
    },
  });
  await push.start();
  assert.equal(
    validSubscription({ endpoint: "https://127.0.0.1/push", keys: { p256dh: "p", auth: "a" } }),
    false,
  );
  assert.equal(
    push.subscribe("device", {
      endpoint: "https://fcm.googleapis.com/fcm/send/example",
      keys: { p256dh: "p", auth: "a" },
    }),
    true,
  );
  await push.notify();
  assert.equal(sent.length, 1);
  assert.equal(
    push.subscribe("device", {
      endpoint: "https://fcm.googleapis.com/fcm/send/revoked",
      keys: { p256dh: "p", auth: "a" },
    }),
    true,
  );
  store.db.prepare("UPDATE web_devices SET revoked_at = ? WHERE id = ?").run(Date.now(), "device");
  await push.notify();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].includes("example"), false);
  assert.equal(
    Number(store.db.prepare("SELECT count(*) AS total FROM web_push_subscriptions").get()!.total),
    1,
  );
});

test("provider plans refuse a conflicting Serve route and give portable install guidance", async (t) => {
  const { home, prior } = await configuredHome();
  t.after(async () => {
    process.env.CARAKA_HOME = prior;
    await rm(home, { recursive: true, force: true });
  });
  const config = (await import("../src/config.js")).parseConfig(
    await readFile(join(home, "config.yaml"), "utf8"),
  );
  const calls: string[][] = [];
  await assert.rejects(
    connect({
      provider: "tailscale",
      config,
      root: home,
      apply: true,
      runner: async (_command, args) => {
        calls.push(args);
        return args[0] === "status"
          ? {
              code: 0,
              stdout: JSON.stringify({
                BackendState: "Running",
                Self: { DNSName: "device.example.ts.net." },
              }),
              stderr: "",
            }
          : {
              code: 0,
              stdout: JSON.stringify({ Web: { route: { Proxy: "http://127.0.0.1:9999" } } }),
              stderr: "",
            };
      },
    }),
    /already owns an HTTPS route/,
  );
  assert.equal(
    calls.some((args) => args.includes("--bg")),
    false,
  );
  const { providerInstall, shellPath } = await import("../src/web/connect.js");
  assert.match(providerInstall("tailscale", "darwin"), /brew/);
  assert.match(providerInstall("tailscale", "win32"), /winget/);
  assert.match(providerInstall("cloudflare", "darwin"), /brew/);
  assert.match(providerInstall("cloudflare", "win32"), /winget/);
  const { linuxInstall } = await import("../src/web/connect.js");
  assert.match(linuxInstall("tailscale", "ubuntu"), /Debian or Ubuntu/);
  assert.match(linuxInstall("tailscale", "fedora"), /Fedora or RHEL/);
  assert.match(linuxInstall("cloudflare", "ubuntu"), /cloudflare-main.gpg/);
  assert.match(linuxInstall("cloudflare", "fedora"), /cloudflared.repo/);
  assert.match(shellPath("/tmp/operator space", "linux"), /^.*$/);
  const apostrophe = String.fromCharCode(39);
  assert.equal(
    shellPath("/tmp/operator" + apostrophe + "s path", "linux").includes(
      apostrophe + '"' + apostrophe,
    ),
    true,
  );
  assert.equal(shellPath("C:\\operator $()'s space", "win32"), "'C:\\operator $()''s space'");
});

test("tailscale plan reports a missing login without applying Serve", async (t) => {
  const { home, prior } = await configuredHome();
  t.after(async () => {
    process.env.CARAKA_HOME = prior;
    await rm(home, { recursive: true, force: true });
  });
  const config = (await import("../src/config.js")).parseConfig(
    await readFile(join(home, "config.yaml"), "utf8"),
  );
  const calls: string[][] = [];
  const plan = await connect({
    provider: "tailscale",
    config,
    root: home,
    apply: true,
    runner: async (_command, args) => {
      calls.push(args);
      return { code: 0, stdout: JSON.stringify({ BackendState: "NeedsLogin" }), stderr: "" };
    },
  });
  assert.match(plan.lines.join("\n"), /tailscale login/);
  assert.equal(
    calls.some((args) => args.includes("--bg")),
    false,
  );
});

test("tailscale apply preserves existing Caraka configuration fields", async (t) => {
  const { home, prior } = await configuredHome();
  t.after(async () => {
    process.env.CARAKA_HOME = prior;
    await rm(home, { recursive: true, force: true });
  });
  const original = console.log;
  console.log = () => undefined;
  try {
    await webCommand(["connect", "tailscale", "--apply"], {
      runner: async (_command, args) =>
        args[0] === "status"
          ? {
              code: 0,
              stdout: JSON.stringify({
                BackendState: "Running",
                Self: { DNSName: "device.example.ts.net." },
              }),
              stderr: "",
            }
          : { code: 0, stdout: JSON.stringify({ Web: {} }), stderr: "" },
    });
  } finally {
    console.log = original;
  }
  const saved = (await import("../src/config.js")).parseConfig(
    await readFile(join(home, "config.yaml"), "utf8"),
  );
  assert.equal(saved.workspace.path, home);
  assert.equal(saved.memory.provider, "none");
  assert.equal(saved.web?.owner, "test");
  assert.equal(saved.web?.origin, "https://device.example.ts.net");
});

test("provider plans neutralize inherited DNS force, preserve configuration, and reject unsafe Serve state", async (t) => {
  const { home, prior } = await configuredHome();
  t.after(async () => {
    process.env.CARAKA_HOME = prior;
    await rm(home, { recursive: true, force: true });
  });
  const config = (await import("../src/config.js")).parseConfig(
    await readFile(join(home, "config.yaml"), "utf8"),
  );
  const calls: Array<{ args: string[]; env?: NodeJS.ProcessEnv }> = [];
  let created = false;
  const runner = async (
    _command: string,
    args: string[],
    options?: { env?: NodeJS.ProcessEnv },
  ) => {
    calls.push({ args, env: options?.env });
    if (args[1] === "list")
      return {
        code: 0,
        stdout: created ? JSON.stringify([{ id: "new-id", name: "caraka-web" }]) : "[]",
        stderr: "",
      };
    if (args[1] === "create") {
      created = true;
      return { code: 0, stdout: JSON.stringify({ id: "new-id" }), stderr: "" };
    }
    return { code: 0, stdout: "", stderr: "" };
  };
  await connect({
    provider: "cloudflare",
    config,
    root: home,
    hostname: "caraka.example.test",
    apply: true,
    runner,
  });
  assert.equal(
    calls.every((call) => call.env?.TUNNEL_FORCE_PROVISIONING_DNS === "false"),
    true,
  );
  const ingress = join(home, "secrets", "cloudflared", "caraka-web.yml");
  await (
    await import("node:fs/promises")
  ).writeFile(
    join(home, "secrets", "cloudflared", "caraka-web.json"),
    JSON.stringify({ TunnelID: "new-id" }),
  );
  const before = await readFile(ingress, "utf8");
  await connect({
    provider: "cloudflare",
    config,
    root: home,
    hostname: "caraka.example.test",
    apply: true,
    runner,
  });
  assert.equal(await readFile(ingress, "utf8"), before);
  await assert.rejects(
    connect({
      provider: "cloudflare",
      config,
      root: home,
      hostname: "other.example.test",
      apply: true,
      runner,
    }),
    /configuration already exists/,
  );
  const { tailscaleConflict } = await import("../src/web/connect.js");
  assert.equal(
    tailscaleConflict({ Web: { route: { Path: "/old" } } }, "http://127.0.0.1:7720"),
    true,
  );
  assert.equal(
    tailscaleConflict({ Web: { route: { Text: "old" } } }, "http://127.0.0.1:7720"),
    true,
  );
  assert.equal(tailscaleConflict(undefined, "http://127.0.0.1:7720"), true);
});

test("cloudflare reuses an explicit validated credential path", async (t) => {
  const { home, prior } = await configuredHome();
  t.after(async () => {
    process.env.CARAKA_HOME = prior;
    await rm(home, { recursive: true, force: true });
  });
  const credentials = join(home, "operator credential.json");
  const { writeFile } = await import("node:fs/promises");
  await writeFile(credentials, JSON.stringify({ TunnelID: "existing-id" }));
  const config = (await import("../src/config.js")).parseConfig(
    await readFile(join(home, "config.yaml"), "utf8"),
  );
  await connect({
    provider: "cloudflare",
    config,
    root: home,
    hostname: "caraka.example.test",
    tunnel: "operator-tunnel",
    credentials,
    apply: true,
    runner: async (_command, args) =>
      args[1] === "list"
        ? {
            code: 0,
            stdout: JSON.stringify([{ id: "existing-id", name: "operator-tunnel" }]),
            stderr: "",
          }
        : { code: 0, stdout: "", stderr: "" },
  });
  assert.match(
    await readFile(join(home, "secrets", "cloudflared", "operator-tunnel.yml"), "utf8"),
    /operator credential.json/,
  );
});

test("push limits storage, coalesces work, and rechecks revoked devices", async (t) => {
  const home = await mkdtemp(join(tmpdir(), "caraka-web-push-limit-"));
  const store = new Store(join(home, "caraka.db"), createScrubber([]));
  t.after(async () => {
    store.close();
    await rm(home, { recursive: true, force: true });
  });
  for (const id of ["first", "second", "third"])
    store.db
      .prepare(
        "INSERT INTO web_devices(id,name,token_hash,created_at,revoked_at) VALUES(?,?,?,?,NULL)",
      )
      .run(id, id, id, Date.now());
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const sent: string[] = [];
  const push = new PushService({
    store,
    keyPath: join(home, "secrets", "vapid.json"),
    origin: "https://caraka.example.test",
    generate: () => ({ publicKey: "public", privateKey: "private" }),
    send: async (subscription) => {
      sent.push(subscription.endpoint);
      if (subscription.endpoint.endsWith("/first")) await held;
    },
  });
  await push.start();
  const subscription = (suffix: string) => ({
    endpoint: `https://fcm.googleapis.com/fcm/send/${suffix}`,
    keys: { p256dh: "p", auth: "a" },
  });
  assert.equal(push.subscribe("first", subscription("first")), true);
  assert.equal(push.subscribe("second", subscription("second")), true);
  assert.equal(push.subscribe("third", subscription("third")), true);
  assert.equal(push.subscribe("first", subscription("extra-one")), true);
  assert.equal(push.subscribe("first", subscription("extra-two")), true);
  assert.equal(push.subscribe("first", subscription("overflow")), false);
  assert.equal(
    push.subscribe("first", {
      ...subscription("x"),
      endpoint: "https://fcm.googleapis.com/" + "x".repeat(2_049),
    }),
    false,
  );
  const delivery = push.notify();
  await new Promise((resolve) => setTimeout(resolve, 5));
  store.db.prepare("UPDATE web_devices SET revoked_at = ? WHERE id = ?").run(Date.now(), "second");
  void push.notify();
  release();
  await delivery;
  assert.equal(
    sent.some((endpoint) => endpoint.endsWith("/second")),
    false,
  );
  assert.equal(sent.filter((endpoint) => endpoint.endsWith("/first")).length, 1);
});

test("push requires an HTTPS VAPID subject before it advertises availability", async (t) => {
  const home = await mkdtemp(join(tmpdir(), "caraka-web-push-vapid-"));
  const store = new Store(join(home, "caraka.db"), createScrubber([]));
  t.after(async () => {
    store.close();
    await rm(home, { recursive: true, force: true });
  });
  const push = new PushService({
    store,
    keyPath: join(home, "secrets", "vapid.json"),
    origin: "http://127.0.0.1:7720",
    generate: () => ({ publicKey: "public", privateKey: "private" }),
  });
  await push.start();
  assert.deepEqual(push.state(), {
    available: false,
    message: "Web Push needs an HTTPS web origin.",
  });
  const { validVapidSubject } = await import("../src/web/push.js");
  assert.equal(validVapidSubject("http://127.0.0.1:7720"), false);
  assert.equal(validVapidSubject("https://caraka.example.test"), true);
});
