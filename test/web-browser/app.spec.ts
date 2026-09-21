import { readFile } from "node:fs/promises";
import { test, expect } from "./fixture.js";
import type { Page } from "@playwright/test";
async function pair(page: Page, server: { channel: { url: string; createPairCode(): string } }) {
  await page.goto(server.channel.url + "/#pair=" + server.channel.createPairCode());
  await expect(page).toHaveURL(server.channel.url + "/");
  await page.getByLabel("Device name", { exact: true }).fill("Test browser");
  await page.getByRole("button", { name: "Pair device", exact: true }).click();
  await expect(page.getByLabel("Message", { exact: true })).toBeVisible();
}
async function send(page: Page, text: string) {
  await page.getByLabel("Message", { exact: true }).fill(text);
  await page.getByRole("button", { name: "Send", exact: true }).click();
}
test("pairs, sends, resumes, uploads, decides, stops and signs out through Gateway", async ({
  page,
  server,
}, info) => {
  await pair(page, server);
  await send(page, "Please request permission");
  const card = page.locator(".permission");
  await expect(card).toContainText("Write src/auth/login.ts");
  await page.screenshot({ path: info.outputPath("desktop-permission.png") });
  await card.getByRole("button", { name: /Allow once/ }).click();
  await expect(page.locator("#messages")).toContainText("Decision: allow");
  await send(page, "Request permission again");
  await page
    .locator(".permission")
    .getByRole("button", { name: /Reject/ })
    .click();
  await expect(page.locator("#messages")).toContainText("Decision: reject");
  await page.getByRole("button", { name: /New task/ }).click();
  await page.locator("#files").setInputFiles({
    name: "note.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("attachment contents"),
  });
  await send(page, "Read the attachment");
  await expect(page.locator("#messages")).toContainText("Task complete.");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: /note.txt/ }).click();
  const downloaded = await download;
  expect(downloaded.suggestedFilename()).toBe("note.txt");
  expect(await readFile((await downloaded.path())!, "utf8")).toBe("attachment contents");
  expect(server.prompts.at(-1)).toContain(".caraka-inbox/");
  await page.locator("#sessions button").filter({ hasText: "Please request permission" }).click();
  await expect(page.locator("#messages")).toContainText("Decision: reject");
  await send(page, "wait for stop");
  await expect(page.locator("#room-state")).toContainText("Running");
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect.poll(() => server.cancellations.length).toBe(1);
  await page.getByRole("button", { name: "Devices & connection", exact: true }).first().click();
  await expect(
    page.getByRole("button", { name: "Enable notifications", exact: true }),
  ).toBeDisabled();
  await expect(page.locator("#push-status")).toContainText("not available");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pair device", exact: true })).toBeVisible();
  await expect(page.locator("#messages")).toBeEmpty();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(["caraka.room"]);
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
});
test("mobile drawer, focus, long code and reduced motion", async ({ page, server }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await pair(page, server);
  await send(page, "Please request permission");
  await expect(page.locator(".permission")).toContainText("Write src/auth/login.ts");
  await page.screenshot({ path: info.outputPath("mobile-permission.png") });
  await page
    .locator(".permission")
    .getByRole("button", { name: /Allow once/ })
    .click();
  await send(page, "long code");
  await expect(page.locator("pre").last()).toBeVisible();
  await expect(page.locator("#messages img")).toHaveCount(0);
  await expect(page.locator("#messages")).toContainText("<img src=x onerror=alert(1)>");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Sessions", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Sessions" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Sessions", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Devices & connection", exact: true }).last().click();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Message", { exact: true })).toBeVisible();
});
test("offline shell excludes private data and reconnect preserves an unsent draft", async ({
  page,
  context,
  server,
}) => {
  await pair(page, server);
  await send(page, "Initial task");
  await expect(page.locator("#messages")).toContainText("Task complete.");
  await page.getByLabel("Message", { exact: true }).fill("Unsent private draft");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue("");
  await page.getByLabel("Message", { exact: true }).fill("Unsent private draft");
  await context.setOffline(true);
  await expect(page.locator("#connection")).toContainText("Disconnected");
  await expect(page.getByRole("button", { name: "Send", exact: true })).toBeDisabled();
  await expect(page.locator("#messages")).toContainText("Task complete.");
  await context.setOffline(false);
  await expect(page.locator("#connection")).toContainText("Connected");
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue("Unsent private draft");
  expect(server.prompts).toHaveLength(1);
  const paths = await page.evaluate(async () => {
    const paths = [];
    for (const key of await caches.keys())
      for (const request of await (await caches.open(key)).keys())
        paths.push(new URL(request.url).pathname);
    return paths;
  });
  expect(paths).toContain("/");
  expect(paths.some((path) => path.startsWith("/api/"))).toBe(false);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Pair this device" })).toBeVisible();
  await expect(page.locator("#messages")).toBeEmpty();
});

test("failed uploads keep tasks unsent and an explicit retry uses the same message id", async ({
  page,
  server,
}) => {
  await pair(page, server);
  await page.route("**/api/files?*", (route) => route.fulfill({ status: 503, body: "{}" }));
  await page
    .locator("#files")
    .setInputFiles({ name: "retry.txt", mimeType: "text/plain", buffer: Buffer.from("read me") });
  await send(page, "Retry attachment task");
  await expect(page.locator("#error")).toContainText("request failed");
  expect(server.prompts).toHaveLength(0);
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue("Retry attachment task");
  await page.unroute("**/api/files?*");
  const ids: string[] = [];
  await page.route("**/api/messages", async (route) => {
    ids.push(route.request().postDataJSON().clientId);
    const response = await route.fetch();
    if (ids.length === 1) await route.abort();
    else await route.fulfill({ response });
  });
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator("#error")).toContainText("request failed");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue("");
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
  expect(server.prompts).toHaveLength(1);
});

test("SSE refresh preserves focus, scroll, draft and pending permission controls", async ({
  page,
  server,
}) => {
  await pair(page, server);
  await send(page, "Request permission");
  await expect(page.locator(".permission")).toBeVisible();
  const current = await (await page.request.get(server.channel.url + "/api/state")).json();
  const roomId = current.rooms[0].id;
  for (let i = 0; i < 12; i++)
    await server.channel.sendText(
      "web:" + roomId,
      "Progress message " + i + "\n" + "Status detail. ".repeat(15),
    );
  await expect(page.locator("#messages")).toContainText("Progress message 11");
  await page.getByLabel("Message", { exact: true }).fill("Draft during stream");
  await page.locator("#message-scroll").evaluate((element) => {
    element.scrollTop = 100;
  });
  await server.channel.sendText("web:" + roomId, "New event while reading");
  await expect(page.locator("#messages")).toContainText("New event while reading");
  await expect(page.getByLabel("Message", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue("Draft during stream");
  expect(await page.locator("#message-scroll").evaluate((element) => element.scrollTop)).toBe(100);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let callbacks = 0;
  await page.route("**/api/callback", async (route) => {
    callbacks++;
    await held;
    await route.continue();
  });
  await page
    .locator(".permission")
    .getByRole("button", { name: /Allow once/ })
    .click();
  await server.channel.sendText("web:" + roomId, "Pending decision event");
  await expect(page.locator("#messages")).toContainText("Pending decision event");
  await expect(page.locator(".permission").getByRole("button", { name: /Reject/ })).toBeDisabled();
  expect(callbacks).toBe(1);
  release();
  await expect(page.locator("#messages")).toContainText("Decision: allow");
});

test("SSE refresh keeps focus on the selected session in the desktop rail", async ({
  page,
  server,
}) => {
  await pair(page, server);
  await send(page, "Session focus marker");
  const session = page.locator("#sessions button").filter({ hasText: "Session focus marker" });
  await expect(session).toHaveCount(1);
  await session.focus();
  await expect(session).toBeFocused();
  const current = await (await page.request.get(server.channel.url + "/api/state")).json();
  await server.channel.sendText("web:" + current.rooms[0].id, "SSE refresh keeps session focus");
  await expect(page.locator("#messages")).toContainText("SSE refresh keeps session focus");
  await expect(session).toBeFocused();
});
test("sign out discards delayed state and aborts a pending upload", async ({ page, server }) => {
  await pair(page, server);
  await send(page, "Private transcript");
  await expect(page.locator("#messages")).toContainText("Task complete.");
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let stateHeld = false,
    uploadHeld = false;
  await page.route("**/api/state", async (route) => {
    const response = await route.fetch();
    stateHeld = true;
    await held;
    await route.fulfill({ response }).catch(() => {});
  });
  const current = await (await page.request.get(server.channel.url + "/api/state")).json();
  await server.channel.sendText("web:" + current.rooms[0].id, "Late private state");
  await expect.poll(() => stateHeld).toBe(true);
  await page.route("**/api/files?*", async (route) => {
    uploadHeld = true;
    await held;
    await route
      .fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: "late-file", name: "private.txt" }),
      })
      .catch(() => {});
  });
  await page.locator("#files").setInputFiles({
    name: "private.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("private upload"),
  });
  await send(page, "Unsent private task");
  await expect.poll(() => uploadHeld).toBe(true);
  await expect(page.getByRole("button", { name: "Send", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: /New task/ })).toBeDisabled();
  await page.getByRole("button", { name: "Devices & connection", exact: true }).first().click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  release();
  await expect(page.getByRole("button", { name: "Pair device", exact: true })).toBeVisible();
  await expect(page.locator("#messages")).toBeEmpty();
  await expect(page.locator("#devices")).toBeEmpty();
  await expect(page.locator("#draft")).toHaveValue("");
  expect(server.prompts).toHaveLength(1);
});

test("device revocation clears the private view and configured language takes priority", async ({
  page,
  server,
}) => {
  server.channel.options.language = "id";
  await page.goto(server.channel.url + "/#pair=" + server.channel.createPairCode());
  await page.getByLabel("Device name", { exact: true }).fill("Browser kedua");
  await page.getByRole("button", { name: "Pair device", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tugas baru", exact: true })).toBeVisible();
  await page.getByLabel("Pesan", { exact: true }).fill("Draft rahasia");
  const current = await (await page.request.get(server.channel.url + "/api/state")).json();
  await page.request.delete(server.channel.url + "/api/devices/" + current.device.id, {
    headers: { origin: server.channel.url },
  });
  await expect(page.getByRole("heading", { name: "Hubungkan perangkat ini" })).toBeVisible();
  await expect(page.locator("#draft")).toHaveValue("");
  await expect(page.locator("#messages")).toBeEmpty();
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
});

test("failed sign-out offers an explicit revocation retry", async ({ page, server }) => {
  await pair(page, server);
  await page.route("**/api/logout", (route) => route.abort());
  await page.getByRole("button", { name: "Devices & connection", exact: true }).first().click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.locator("#pair-error")).toContainText("Sign-out could not reach the server");
  await expect(page.getByRole("button", { name: "Retry sign-out", exact: true })).toBeVisible();
  await page.unroute("**/api/logout");
  await page.getByRole("button", { name: "Retry sign-out", exact: true }).click();
  await expect
    .poll(async () => (await page.request.get(server.channel.url + "/api/state")).status())
    .toBe(401);
});

test("settings revokes another device and exposes install and push availability", async ({
  page,
  browser,
  server,
}) => {
  await pair(page, server);
  const other = await browser.newContext();
  try {
    await other.request.post(server.channel.url + "/api/pair", {
      headers: { origin: server.channel.url },
      data: { code: server.channel.createPairCode(), name: "Spare phone" },
    });
    await page.getByRole("button", { name: "Devices & connection", exact: true }).first().click();
    await expect(page.getByRole("dialog")).toContainText("Spare phone");
    await expect(
      page.getByRole("button", { name: "Enable notifications", exact: true }),
    ).toBeDisabled();
    await expect(page.locator("#push-status")).toContainText("not available");
    await expect(page.locator("#install-help")).toContainText("browser menu");
    await page
      .locator("#devices > div")
      .filter({ hasText: "Spare phone" })
      .getByRole("button", { name: "Revoke", exact: true })
      .click();
    await expect(page.locator("#devices")).not.toContainText("Spare phone");
    expect((await other.request.get(server.channel.url + "/api/state")).status()).toBe(401);
    expect((await page.request.get(server.channel.url + "/api/state")).status()).toBe(200);
    const manifest = await (
      await page.request.get(server.channel.url + "/manifest.webmanifest")
    ).json();
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual([
      "192x192",
      "512x512",
    ]);
  } finally {
    await other.close();
  }
});

test("authenticated offline startup recovers on reconnect without sending another task", async ({
  page,
  context,
  server,
}) => {
  await pair(page, server);
  await send(page, "Task before offline startup");
  await expect(page.locator("#messages")).toContainText("Task complete.");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.locator("#messages")).toContainText("Task complete.");
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Pair this device" })).toBeVisible();
  await expect(page.locator("#messages")).toBeEmpty();
  await context.setOffline(false);
  await expect(page.getByLabel("Message", { exact: true })).toBeVisible();
  await expect(page.locator("#messages")).toContainText("Task before offline startup");
  await expect(page.locator("#connection")).toContainText("Connected");
  expect(server.prompts).toHaveLength(1);
});

test("initial transient state failure provides an explicit connection retry", async ({
  page,
  server,
}) => {
  await pair(page, server);
  await send(page, "Task before server failure");
  await expect(page.locator("#messages")).toContainText("Task complete.");
  let requests = 0;
  await page.route("**/api/state", async (route) => {
    requests++;
    if (requests === 1)
      await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
    else await route.continue();
  });
  await page.reload();
  await expect(page.getByRole("button", { name: "Retry connection", exact: true })).toBeVisible();
  await expect(page.locator("#messages")).toBeEmpty();
  expect(requests).toBe(1);
  await page.getByRole("button", { name: "Retry connection", exact: true }).click();
  await expect(page.getByLabel("Message", { exact: true })).toBeVisible();
  await expect(page.locator("#messages")).toContainText("Task before server failure");
  await expect(page.getByRole("button", { name: "Retry connection", exact: true })).toBeHidden();
  expect(server.prompts).toHaveLength(1);
});

test("failed explicit logout never restores the valid cookie on reconnect or history restoration", async ({
  page,
  context,
  server,
}) => {
  await pair(page, server);
  await page.route("**/api/logout", (route) => route.abort());
  await page.getByRole("button", { name: "Devices & connection", exact: true }).first().click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry sign-out", exact: true })).toBeVisible();
  expect((await page.request.get(server.channel.url + "/api/state")).status()).toBe(200);
  const requests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/state") requests.push(request.url());
  });
  await context.setOffline(true);
  await context.setOffline(false);
  await page.evaluate(async () => {
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    await fetch("/health");
  });
  await expect(page.getByRole("heading", { name: "Pair this device" })).toBeVisible();
  await expect(page.locator("#messages")).toBeEmpty();
  expect(requests).toEqual([]);
  await expect(page.getByRole("button", { name: "Retry connection", exact: true })).toBeHidden();
});

test("notification opt-in keeps pending and denied state during an SSE refresh", async ({
  page,
  server,
}) => {
  await page.addInitScript(() => {
    let resolvePermission: ((value: NotificationPermission) => void) | undefined;
    Object.defineProperty(Notification, "requestPermission", {
      configurable: true,
      value: () => new Promise<NotificationPermission>((resolve) => (resolvePermission = resolve)),
    });
    Object.defineProperty(window, "resolvePushPermission", {
      configurable: true,
      value: (value: NotificationPermission) => resolvePermission?.(value),
    });
  });
  await page.route("**/api/state", async (route) => {
    try {
      const response = await route.fetch();
      const state = await response.json();
      state.push = { available: true, publicKey: "AQ" };
      await route.fulfill({ response, json: state });
    } catch {
      await route.abort();
    }
  });
  await pair(page, server);
  await page.getByRole("button", { name: "Devices & connection", exact: true }).first().click();
  const push = page.getByRole("button", { name: "Enable notifications", exact: true });
  await expect(push).toBeEnabled();
  await push.click();
  await expect(push).toBeDisabled();
  const current = await (await page.request.get(server.channel.url + "/api/state")).json();
  await server.channel.sendText("web:" + current.rooms[0].id, "SSE during notification opt-in");
  await expect(push).toBeDisabled();
  await page.evaluate(() =>
    (
      window as Window & { resolvePushPermission(value: NotificationPermission): void }
    ).resolvePushPermission("denied"),
  );
  await expect(page.locator("#push-status")).toContainText("blocked");
  await expect(push).toBeDisabled();
});

test("notification subscription failure keeps a retry action", async ({ page, server }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Notification, "requestPermission", {
      configurable: true,
      value: () => Promise.resolve("granted"),
    });
  });
  await page.route("**/api/state", async (route) => {
    try {
      const response = await route.fetch();
      const state = await response.json();
      state.push = { available: true, publicKey: "AQ" };
      await route.fulfill({ response, json: state });
    } catch {
      await route.abort();
    }
  });
  await page.route("**/api/push/key", (route) =>
    route.fulfill({ status: 200, json: { publicKey: "AQ" } }),
  );
  await pair(page, server);
  await page.getByRole("button", { name: "Devices & connection", exact: true }).first().click();
  const push = page.getByRole("button", { name: "Enable notifications", exact: true });
  await push.click();
  await expect(page.locator("#push-status")).toContainText("could not be enabled");
  await expect(push).toBeEnabled();
  await push.click();
  await expect(push).toBeEnabled();
});

test("dismissed notification permission keeps a retry action", async ({ page, server }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Notification, "requestPermission", {
      configurable: true,
      value: () => Promise.resolve("default"),
    });
  });
  await page.route("**/api/state", async (route) => {
    try {
      const response = await route.fetch();
      const state = await response.json();
      state.push = { available: true, publicKey: "AQ" };
      await route.fulfill({ response, json: state });
    } catch {
      await route.abort();
    }
  });
  await pair(page, server);
  await page.getByRole("button", { name: "Devices & connection", exact: true }).first().click();
  const push = page.getByRole("button", { name: "Enable notifications", exact: true });
  await push.click();
  await expect(page.locator("#push-status")).toContainText("could not be enabled");
  await expect(push).toBeEnabled();
});
test("service worker shows generic activity and focuses the same origin", async ({
  page,
  server,
}) => {
  const source = await (await page.request.get(server.channel.url + "/sw.js")).text();
  const result = await page.evaluate(async (worker) => {
    const handlers: Record<string, (event: any) => void> = {};
    const shown: any[] = [];
    let focused = false;
    const self = {
      location: { origin: "https://caraka.example.test" },
      addEventListener: (name: string, handler: (event: any) => void) => (handlers[name] = handler),
      registration: {
        showNotification: (title: string, options: unknown) => {
          shown.push({ title, options });
          return Promise.resolve();
        },
      },
      clients: {
        matchAll: () =>
          Promise.resolve([
            {
              url: "https://caraka.example.test/room",
              focus: () => {
                focused = true;
                return Promise.resolve();
              },
            },
          ]),
        openWindow: () => Promise.resolve(),
      },
    };
    Function("self", worker)(self);
    let done: Promise<unknown> = Promise.resolve();
    handlers.push({ waitUntil: (promise: Promise<unknown>) => (done = promise) });
    await done;
    handlers.notificationclick({
      notification: { close() {} },
      waitUntil: (promise: Promise<unknown>) => (done = promise),
    });
    await done;
    return { shown, focused };
  }, source);
  expect(result.shown).toEqual([
    {
      title: "Caraka",
      options: {
        body: "Task activity needs your attention.",
        data: { url: "https://caraka.example.test/" },
        tag: "caraka-activity",
      },
    },
  ]);
  expect(result.focused).toBe(true);
});

test("logout resets pending notifications before a new device pairs", async ({ page, server }) => {
  await page.addInitScript(() => {
    let resolvePermission: ((value: NotificationPermission) => void) | undefined;
    Object.defineProperty(Notification, "requestPermission", {
      configurable: true,
      value: () => new Promise<NotificationPermission>((resolve) => (resolvePermission = resolve)),
    });
    Object.defineProperty(window, "resolveOldPushPermission", {
      configurable: true,
      value: (value: NotificationPermission) => resolvePermission?.(value),
    });
  });
  await page.route("**/api/state", async (route) => {
    try {
      const response = await route.fetch();
      const state = await response.json();
      state.push = { available: true, publicKey: "AQ" };
      await route.fulfill({ response, json: state });
    } catch {
      await route.abort();
    }
  });
  await pair(page, server);
  await page.getByRole("button", { name: "Devices & connection", exact: true }).first().click();
  await page.getByRole("button", { name: "Enable notifications", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Enable notifications", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pair device", exact: true })).toBeVisible();
  await page.locator("#pair-code").fill(server.channel.createPairCode());
  await page.getByLabel("Device name", { exact: true }).fill("Re-paired browser");
  await page.getByRole("button", { name: "Pair device", exact: true }).click();
  await expect(page.getByLabel("Message", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Devices & connection", exact: true }).first().click();
  const push = page.getByRole("button", { name: "Enable notifications", exact: true });
  await expect(push).toBeEnabled();
  await page.evaluate(() =>
    (
      window as Window & { resolveOldPushPermission(value: NotificationPermission): void }
    ).resolveOldPushPermission("granted"),
  );
  await expect(push).toBeEnabled();
  await expect(page.locator("#push-status")).toBeEmpty();
});
