# Web Caraka Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development. Run each task and its review in order.

**Goal:** Build a web/PWA channel and connection setup for one operator.

**Architecture:** The web adapter implements Channel and serves its own HTTP API.
Gateway owns routing, agent runs, approval, and cancellation. The app uses static
assets from the npm package. Local SQLite holds web messages and device hashes.

**Tech Stack:** Node HTTP, TypeScript, SQLite, plain JavaScript, CSS, Web Push.

**Spec:** `spec/web-pwa.md`

## Global Constraints

- Work only in `/home/ramaaditya/Project/caraka/.worktrees/web-pwa on rama-tuf`.
- Core never branches on `channel.id`.
- The existing dashboard remains read-only.
- Every request that changes state checks its exact Origin.
- Device tokens remain out of URLs, source control, logs, and localStorage.
- Pairing codes expire after five minutes and work once.
- Cookies use HttpOnly and SameSite=Strict; HTTPS cookies also use Secure.
- Public origins require HTTPS. Loopback development can use HTTP.
- No real tunnel, login, global installation, or production service changes occur during development.
- Use the existing Gateway for tasks, permissions, and stop requests.
- Keep one operator. Do not map chat identities to web identities automatically.
- Use Caraka colours and self-hosted fonts. Add no frontend framework.
- English technical sentences follow STE; interface text supports Indonesian and English.
- End every commit with `Co-Authored-By: CADIS <agent@cadis.digital>` after a blank line.
- Preserve unrelated changes in both original checkouts. All implementation runs on rama-tuf.
- Prepare the npm release and site deployment after verification. Request final release approval with the concrete version and evidence.
- Treat rama-tuf only as the development host. Product defaults must work on each user's own machine and account.
- Derive machine labels, workspace paths, agents, and connection details from configuration or runtime data.
- Test setup output for supported operating systems. Explain manual steps where automation is unavailable.

## Shared API

The backend task writes the exact implemented API in `docs/web-api.md`. The UI
task reads that contract before implementation. Changes to it require both tests
and the document to change together. Use these routes:

```text
POST /api/pair                  { code, name } -> cookie
GET  /api/state                 -> device, workspaces, sessions, messages, connection, push
POST /api/messages              { clientId, roomId?, workspace?, text, files? } -> roomId
POST /api/callback              { messageId, buttonId }
POST /api/stop                  { roomId }
POST /api/files?name=<name>      raw bytes -> file id
GET  /api/files/<id>            authenticated attachment
GET  /api/events                SSE invalidation; clients reload state
POST /api/logout
GET  /api/devices
DELETE /api/devices/<id>
GET  /api/push/key
POST /api/push                  subscription
DELETE /api/push
```

Each browser conversation has a server-created room id. The adapter maps it to
`web:<roomId>` and uses the configured owner principal. All incoming containers
are private. The adapter uses linear Channel capability; each room is a separate
session route. Clients can select only rooms recorded by this adapter. Initial
text gets a registered workspace prefix. Subsequent text stays in that room.
Store user and assistant text after scrubbing. Keep live callback payloads in
memory and expose opaque button ids. A restart leaves stale buttons disabled.

### Task 1: Authenticated web channel and CLI initialization

**Files:** Create `src/web/{store,server,auth}.ts`, `src/channels/web.ts`,
`src/web/cli.ts`, `test/web.test.ts`, and `docs/web-api.md`.
Modify `src/config.ts`, `src/cli.ts`, `package.json`, and related catalog entries.

**Interfaces:** Export `WebChannel implements Channel`. Constructor receives
configuration, Store, scrubber, paths, language, and version. Use `start` for the
listener and the update signal for shutdown. Export `webCommand(args)` for local
pairing, device administration, and initialization. `caraka init web` dispatches
to it. `caraka start` starts configured channels, including web alone.

- [x] Write tests for one-time pairing, Origin rejection, revocation, replay,
  room ownership, attachment limits, and a fake-driver run through Gateway.

```ts
assert.equal((await fetch(base + '/api/state')).status, 401);
assert.equal((await post('/api/pair', { code, name: 'Phone' })).status, 200);
assert.equal((await post('/api/pair', { code, name: 'Replay' })).status, 401);
assert.equal((await postFrom('https://other.invalid', '/api/stop', { roomId })).status, 403);
```

- [x] Run `node --import tsx --test test/web.test.ts` and record the expected failure.
- [x] Implement the API, bounded bodies, authenticated files, SSE invalidation,
  device persistence, message idempotency, and Channel methods. Set security
  headers and validate Host against the configured origin. Bound subscriptions
  and request queues. The server ignores forwarded identity and protocol headers.
- [x] Add additive web config with default port 7720, loopback bind, explicit
  public origin, and one stable operator. Add `init web --workspace PATH --agent
  PRESET --language id|en`, preserving existing configuration. Reject workspace
  paths that do not exist. Print pairing codes only in the explicit terminal
  command, never from the daemon. Store code hashes with their expiry.
- [x] Add CLI integration without a core branch on channel identity. Keep the
  init path usable without Telegram. Add web tests to the verification script.
- [x] Run focused tests, lint, typecheck, and existing unit tests. Write the API
  contract and task report, then commit the task.

**AC proof:** AC-1–18 and AC-32 use HTTP tests and fake Gateway tests. AC-8 checks
the stored hash. Existing tests cover signed approval expiry and policy gates;
new tests exercise their route through web.

### Task 2: Responsive Caraka UI and installable PWA

**Files:** Create `assets/web/{index.html,app.js,app.css,manifest.webmanifest,sw.js,icon.svg}`
and icon/font assets. Add browser tests under `test/web-browser/` with a small
test-only fixture. Change asset routing only if the API document requires it.

**Interfaces:** Consume `docs/web-api.md`. Serve all assets on the same origin.
Use fetch credentials and cookie auth. SSE triggers a state reload. Keep only
navigation preferences in browser storage. Render all remote text as text nodes.

- [x] Read the implemented API and write browser flows for pairing, message
  submission, session selection, callback, disconnect recovery, and sign-out.
- [x] Implement the desktop session rail and main conversation. On HP, show one
  panel with a sessions drawer and fixed composer. Use brand colours `#05080C`,
  `#0C1116`, `#171C22`, `#E9EDF2`, `#B2BCC6`, and brand red from `docs/brand.md`.
- [x] Use local Public Sans for UI and JetBrains Mono for code. Include font
  licenses. Keep status text with the glyph. Provide empty, busy, failed,
  disconnected, and approval states. Disable repeated submissions while pending.
- [x] Build device pairing and revocation controls, file upload/download, and
  push opt-in. Make unavailable push clear. Do not render unknown remote HTML.
- [x] Add the manifest and icons. The service worker caches an explicit list of
  public static assets; it never caches `/api/` or authenticated responses.

```js
const STATIC = new Set(['/', '/app.css', '/app.js', '/icon.svg']);
// Only static same-origin GET requests may use the app cache.
if (request.method !== 'GET' || !STATIC.has(url.pathname)) return;
```

- [x] Verify at 390×844 and 1440×900. Exercise keyboard focus and no-motion mode.
  Record screenshots, focused test output, and the task report, then commit.

**AC proof:** AC-9–24 and AC-30–31 use browser flows. A service-worker test checks
that private endpoints are never put into Cache Storage. Browser tests use a
fake coding driver and a disposable Caraka home, never a user's installation.

### Task 3: Connection setup, Web Push, and operator guide

**Files:** Create `src/web/connect.ts`, `src/web/push.ts`, `test/web-connect.test.ts`,
and `docs/web-guide.md`. Update `src/web/cli.ts`, `src/web/server.ts`, package
dependencies, and the API document as required.

**Interfaces:** `caraka web connect tailscale|cloudflare` prints a plan by default.
`--apply` explicitly applies it. `--check` inspects the resulting connection.
Use structured spawn argument arrays; never interpolate tokens into a shell.
Connection configuration changes preserve other fields. Write credentials only
under `secrets/`. The new `web` command is terminal-only.

- [x] Test provider status parsing and command generation with an injected
  process runner. Prove the default invokes no mutating provider commands.
- [x] Implement Tailscale detection, login guidance, Serve HTTPS setup, and
  persistent Serve configuration. Inspect existing Serve routes before applying;
  refuse conflicts and show a specific repair step. Missing binaries produce
  official installation commands appropriate to the detected OS.
- [x] Implement named Cloudflare tunnel setup using the selected hostname and
  explicit account authorization. Reuse existing credentials when present.
  Refuse Quick Tunnel as the persistent configuration. Print the exact service
  installation steps when elevation or a user login is still needed.
- [x] Add a check that requests the public health endpoint and verifies that
  unauthenticated private API requests fail. Keep phone verification a distinct
  result; a server-side fetch does not prove mobile reachability.
- [x] Add Web Push with a maintained package and persistent VAPID keys. Validate
  subscription endpoints against SSRF, bound payloads, and expire dead
  subscriptions. Send generic notifications with no prompt, file path, or token.
  Notify on permission cards and finished results. Push failure cannot fail a run.
- [x] Test setup retries without overwriting existing state, missing login,
  provider failure, revoked push subscriptions, and blocked private endpoints.
- [x] Document setup from a fresh machine and provide a coding-agent prompt.
  Explain login, phone steps, service startup, origin changes, revocation, and
  remaining provider verification. Update blueprint, roadmap, and PRD for the
  accepted product direction. Run focused tests and commit with the task report.

**AC proof:** AC-23–29 use process-runner and HTTP tests. Real provider and phone
checks remain separately marked unless performed on an explicitly selected
installation. Documentation never calls synthetic provider tests live proof.

### Task 4: Integrated verification, npm release, and site deployment

**Files:** Plan evidence, packaged file list, and implementation fixes from review.

- [ ] Run `npm run verify` and record its full output path and result here.
- [ ] Run web browser tests and inspect desktop/mobile screenshots.
- [ ] Run `npm pack --dry-run --json` and confirm all web assets are shipped.
- [ ] Run one real coding-agent turn through the web channel in a disposable
  workspace, then verify the returned answer and session resume.
- [ ] Review the complete diff and repair security or behavior defects.
- [ ] Commit verified changes. Keep spec and plan in flight until publication.
  Present the exact version, branch, package contents, and verification evidence for release approval.
- [ ] Update public installation guidance and release metadata for the shipped web channel.
  Keep the existing marketing design. Verify site changes through its required gates.
- [ ] After release approval, publish npm and deploy the site. Verify registry files, fresh installation, and production pages.
  Record package integrity, deployment version, and any unverified provider or phone checks.

## Evidence

- Baseline: 191 unit tests pass after building the new worktree.
- Original local checkout: two README edits existed before this work and remain there.
- Original remote checkout: its existing modified and untracked files remain outside this worktree.
- Titen resolution: `carakadev/caraka` is not registered. Continue from source;
  do not create a memory project or compile without a resolved project id.

## Host handoff

Rama selected `rama-tuf` before implementation. The worktree is
`/home/ramaaditya/Project/caraka/.worktrees/web-pwa` on that host.
The original remote checkout remains unchanged. The branch retains the inspected
feature base `fe943ac`, including attachment support, and spec commit `a7efad7`.

## Completed task evidence

- Task 1: `346ffca`, `3e5d89d`, and `be073ce`. Independent review approved the final backend changes.
- Task 1 checks: 191 existing unit tests and 12 web HTTP tests passed. Lint, types, and build passed.
- Task 2: `80975d5` and `3fef69d`. Independent review approved the initial-load recovery fix.
- Task 2 checks: 12 browser scenarios passed. They cover Gateway flows, offline recovery, revocation, retries, and logout races.
- Desktop and mobile screenshots were inspected at 1440x900 and 390x844.
- A fresh production-only installation served nine UI assets. Pairing and logout passed; anonymous API requests returned 401.
- A real Codex task and same-session resume passed before final package integration. The final package must repeat this proof.
- Task 2 recorded one minor keyboard-focus issue. Task 4 will preserve session-button focus during SSE refresh.
- Provider changes, physical phone installation, push delivery, and release publication are not yet verified.

## Task 3 verification

Task 3 is complete through `144ed1c`. Both scoped fix reviews closed all Important findings.
The final commands produced these results:

```text
> npm run web
ℹ tests 26
ℹ pass 26
ℹ fail 0
> npm run web:browser
16 passed
> npm run lint
0 warnings, 0 errors
> npm run typecheck
exit 0
> npm run build
exit 0
```

Full outputs are `/tmp/caraka-task3-fix2-{web,browser,lint,typecheck,build}.log` on the development host.
Tests cover provider plans, configuration preservation, bounded push, and device revocation.
No live provider, DNS, service, phone, or OS notification check ran.
Task 4 owns two remaining minor refinements: dismissed permission retry and positive HTTP push-route coverage.

## Task 4 preparation evidence

The release delegate completed the local release tree on 21 September 2026.
Publication and deployment remain controller steps.

```text
> npm run verify
ℹ tests 191 / pass 191 / fail 0
ℹ tests 27 / pass 27 / fail 0
ℹ tests 136 / pass 136 / fail 0
18 passed (web browser)
35 passed (site unit)
> npm --prefix site run check
