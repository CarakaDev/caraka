# Web Caraka Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development. Run each task and its review in order.

**Goal:** Build a web/PWA channel and connection setup for one operator.

**Status:** Published as 1.6.0 on 22 September 2026, Asia/Jakarta. Production checks passed.

**Architecture:** The web adapter implements Channel and serves its own HTTP API.
Gateway owns routing, agent runs, approval, and cancellation. The app uses static
assets from the npm package. Local SQLite holds web messages and device hashes.

**Tech Stack:** Node HTTP, TypeScript, SQLite, plain JavaScript, CSS, Web Push.

**Spec:** [spec.md](spec.md)

## Global Constraints

- Work only in `/home/ramaaditya/Project/caraka/.worktrees/web-pwa` on `rama-tuf`.
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

- [x] Run `npm run verify` and record its full output path and result here.
- [x] Run web browser tests and inspect desktop/mobile screenshots.
- [x] Run `npm pack --dry-run --json` and confirm all web assets are shipped.
- [x] Run one real coding-agent turn through the web channel in a disposable
  workspace, then verify the returned answer and session resume.
- [x] Review the complete diff and repair security or behavior defects.
- [x] Commit verified changes. Keep spec and plan in flight until publication.
  Present the exact version, branch, package contents, and verification evidence for release approval.
- [x] Update public installation guidance and release metadata for the shipped web channel.
  Keep the existing marketing design. Verify site changes through its required gates.
- [x] After release approval, publish npm and deploy the site. Verify registry files, fresh installation, and production pages.
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
Found 0 warnings and 0 errors.
ℹ tests 191
ℹ pass 191
ℹ fail 0
ℹ tests 27
ℹ pass 27
ℹ fail 0
ℹ tests 136
ℹ pass 136
ℹ fail 0
18 passed (7.7s)
35 passed (35)
> npm --prefix site run check
Found 0 warnings and 0 errors.
Result (49 files):
- 0 errors
- 0 warnings
- 1 hint
35 passed (35)
> podman run --rm --name caraka-site-release-e2e --security-opt label=disable --shm-size=1g -v /home/ramaaditya/Project/caraka/.worktrees/web-pwa:/work -w /work/site mcr.microsoft.com/playwright:v1.62.1-noble npm run e2e
2 skipped
143 passed (57.3s)
```

The final site check output is `/tmp/caraka-task4-site-check-followup.log`.
The final container output is `/tmp/caraka-task4-site-e2e.log`.
The release checklist remains in flight until controller publication evidence exists.

## Task 4 review fix round 1 evidence

The review corrections remain local. Publication and deployment remain controller steps.

```text
> node --import tsx --test --test-name-pattern='documented Web/PWA setup' test/web.test.ts
ℹ tests 1
ℹ pass 1
ℹ fail 0
> node --import tsx --test --test-name-pattern='every copy of the install prompt' test/unit.test.ts
ℹ tests 1
ℹ pass 1
ℹ fail 0
> npm run lint
Found 0 warnings and 0 errors.
All matched files use the correct format.
No config found, using defaults.
> npm run build
exit 0
> npm --prefix site run check
Found 0 warnings and 0 errors.
Result (49 files):
- 0 errors
- 0 warnings
- 1 hint
35 passed (35)
> podman run --rm --name caraka-site-task4-fix1-e2e-measure --security-opt label=disable --shm-size=1g -v /home/ramaaditya/Project/caraka/.worktrees/web-pwa:/work -w /work/site mcr.microsoft.com/playwright:v1.62.1-noble npm run e2e
2 skipped
143 passed (57.2s)
```

The final-source site check is `/tmp/caraka-task4-fix1-site-check.log`.
The final-source container output is `/tmp/caraka-task4-fix1-site-e2e-measure.log`.
The existing guide hint, formatter configuration notice, and npm update notice are non-blocking output.
No root-wide verification suite was repeated after content-only corrections.

## Task 4 review fix round 2 evidence

This scope corrects the remaining guide boundary, the base64url pairing assertion,
and one baseline comment. It changes no executed site source.

```text
> node --import tsx --test --test-name-pattern='documented Web/PWA setup' test/web.test.ts
ℹ tests 1
ℹ pass 1
ℹ fail 0
> node --import tsx --test --test-name-pattern='every copy of the install prompt' test/unit.test.ts
ℹ tests 1
ℹ pass 1
ℹ fail 0
> npm run lint
Found 0 warnings and 0 errors.
All matched files use the correct format.
No config found, using defaults.
```

The focused pairing result is `/tmp/caraka-task4-fix2-pair-green.log`.
The prompt contract result is `/tmp/caraka-task4-fix2-prompt-contract.log`.
The lint result is `/tmp/caraka-task4-fix2-lint.log`.
The final-source site gate remains `/tmp/caraka-task4-fix1-site-e2e-measure.log`:
143 passed with 2 expected skips. The round changed only a comment in the site tree,
so it did not repeat that container suite.


## Final fix wave — 22 September 2026

- Commit 8f9d036 fixes I1-I3 and M1-M3.
- Root verify passed: 191 unit, 30 Web, 139 E2E, 18 browser, and 35 site tests. Log: /tmp/caraka-final-fix-verify-2.log.
- Site check passed with 0 errors, 0 warnings, and 1 existing hint. Log: /tmp/caraka-final-fix-site-check.log.
- Official Playwright container passed 143 tests with 2 expected skips. Log: /tmp/caraka-final-fix-site-e2e.log.
- src measures 12,901 lines, 4,901 above the 8,000 budget. Version remains 1.6.0. Publication, deployment, package proof, and real-agent proof remain controller work.

## Release blocker correction — 22 September 2026

Base: a6a1999b9222ca4135b3d58bc1a105eec02bc4cd.
The bounded correction covers N1 and N2 from the final scoped review.

1. Add a CLI regression for two folders named app and an occupied suffix.
2. Prove each saved slug selects its own path through Gateway.
3. Check repeated init and the first workspace route (AC-35 and AC-36).
4. Strengthen the leaf regression and observe its fixture failure.
5. Capture the directory before delivery and check replacement execution.
6. Check alpha delivery, beta refusal, marker exclusion, and the final answer (AC-37 and AC-38).
7. Back up the source and bypass the leaf guard for one test.
   Restore the exact source bytes immediately after the test.
8. Run focused tests and the root verification gate on final source.

Keep all earlier accepted fixes. Reuse unchanged site E2E evidence: 143 passed, 2 expected skips.
The source budget stays at 8,000 lines. Record the final count and command output below.

### Correction results

Both regressions failed before their corrections.
The CLI test found a duplicate app slug.
The strengthened leaf test found that the replacement callback had not completed.
The corrected leaf test also failed with the leaf identity predicate bypassed.
That mutation delivered beta.png with 18 replacement bytes.
The source was restored byte for byte, then the leaf test passed.

Logs on rama-tuf:

- /tmp/caraka-release-blocker-red-routing.log
- /tmp/caraka-release-blocker-red-fixture.log
- /tmp/caraka-release-blocker-red-leaf-guard.log
- /tmp/caraka-release-blocker-green-routing.log
- /tmp/caraka-release-blocker-green-outbox.log
- /tmp/caraka-release-blocker-green-restored-leaf.log
- /tmp/caraka-release-blocker-verify.log

Actual command output excerpts follow. Each named log retains full output.

```text
> node --import tsx --test --test-name-pattern='web CLI init assigns distinct|web init adds its workspace|web init rejects' test/web.test.ts
ℹ tests 3
ℹ pass 3
ℹ fail 0
> node --import tsx --test --test-name-pattern='a leaf replaced during delivery|a replaced outbox|a symlink in the outbox' test/e2e.test.ts
ℹ tests 4
ℹ pass 4
ℹ fail 0
> node --import tsx --test --test-name-pattern='a leaf replaced during delivery' test/e2e.test.ts
ℹ tests 1
ℹ pass 1
ℹ fail 0
> npm run verify
clean: 360 tracked files, no credentials
Found 0 warnings and 0 errors.
All matched files use the correct format.
ℹ tests 191
ℹ pass 191
ℹ fail 0
ℹ tests 31
ℹ pass 31
ℹ fail 0
ℹ tests 139
ℹ pass 139
ℹ fail 0
18 passed (8.0s)
35 passed (35)
exit 0
> git diff --check
exit 0
```

The root gate passed once on the final corrected source.
The existing formatter configuration notice remains non-blocking.
The restored gateway has no diff against the base.
Site files have no diff against the base.
The retained site E2E log is /tmp/caraka-final-fix-site-e2e.log:
143 passed with 2 expected skips.

A recursive line count of every file under src gives 12,908 lines.
This is 7 lines above the base and 4,908 above the unchanged 8,000-line budget.
Version remains 1.6.0.
The six earlier fixes remain in place.
Controller review, package proof, publication, and deployment remain pending.


## Release completion

The owner approved npm publication through the standard browser authorization flow.
The exact verified tarball was published as `caraka@1.6.0` with the `latest` tag.
The canonical registry reported publication at `2026-09-21T18:28:04.808Z`.
Registry metadata took time to appear after the publish command completed.
The site npm badge changed only after the canonical registry named 1.6.0.

Package source: `e10b6a06cf5c09f29b272dbbf8ba1dadda25e7d4`.
Site badge commit: `fa4c2a621a747566ebf7e3066dae17b7fd7b0103`.
Package members: 121. The required Web assets, fonts, and licenses are present.
Package integrity: `sha512-CDhLBSKclYBvUj1K5O/l6/gb5dgq4xZ93RLQx5AbeyTiPm6kWuPQjVvZ+tYdX42fZJB1AvnsZhz1WFyseKVtxA==`.
Package SHA-1: `91976a1d738f1777e2bde83332da72133a9e6657`.
Registry integrity and SHA-1 match the tested tarball.
A fresh registry installation passed the installed CLI, asset, authentication, and attachment checks.
The exact local tarball also completed a real agent task and resumed the same session.
The production dependency audit reported zero vulnerabilities.

```text
> npm publish <verified caraka-1.6.0.tgz> --access public
+ caraka@1.6.0
> installed registry package checks
version=1.6.0
unknown_explicit_agent=rejected_before_config_write
health=200; anonymous_api=401; static_assets=9
pair=200; authenticated_state=200
private_attachment=matched; unicode_filename=valid; cache=no-store
logout=200; anonymous_state=401; anonymous_attachment=401
> exact tarball real agent checks
first_turn=done; spaced_workspace=matched
resume=same_session; marker=matched
> npm audit --omit=dev --audit-level=high
vulnerabilities: info=0 low=0 moderate=0 high=0 critical=0
> npm --prefix site run check
0 errors; 0 warnings; 1 existing hint
35 tests passed
> site E2E in the official Playwright container
143 passed (57.2s)
2 expected skips
> npm run scan:secrets
clean: 360 tracked files, no credentials
```

The site browser run used `mcr.microsoft.com/playwright:v1.62.1-noble` through rootless Podman.
The existing generated preview cache was preserved while the container built its own cache.
No system libraries or unrelated services changed.

### Production

The site deployment serves `caraka.dev/*` from `caraka-site`.
Worker version: `3b33b8e1-3f81-4b96-9001-138eeed0619f`, with 100 percent of traffic.
The verified previous version remains `275b5888-abf1-4f90-9448-d065c2ea9258` for rollback.
No rollback was required.

```text
> deployed provider verification
route=caraka.dev/*; worker=caraka-site
version=3b33b8e1-3f81-4b96-9001-138eeed0619f; percentage=100
> production site verification
pages=14; referenced bundled assets=2
web_setup_pages=/docs,/install
missing_page=404
homepage_version=1.6.0
status_version=1.6.0
npm_badge_version=1.6.0
```

The homepage, status page, npm badge board, and install page match the built page text.
The install page contains `caraka init web`; it has no patch-version label.
The deployment changed the opaque route ID.
The zone, route pattern, Worker, and expected deployed version remained correct.
The verification helper now checks these semantic values instead of requiring the previous route ID.

Source CI passed all four jobs on `e10b6a0`:
https://github.com/CarakaDev/caraka/actions/runs/35637887018.
The source and site commits retain the required CADIS trailer.
Both original dirty checkouts remain outside the release worktree.
Verified source bundles are retained beside the tarball.

### Evidence paths

These files remain on the development host:

- `/tmp/caraka-release-package-4_j5w8xk/package-proof.json`
- `/tmp/caraka-installed-proof-720jx2uy/proof.json`
- `/tmp/caraka-release-package-4_j5w8xk/fresh-audit.json`
- `/tmp/caraka-registry-metadata-z8pfukj3/proof.json`
- `/tmp/caraka-registry-proof-uazws83u/proof.json`
- `/tmp/caraka-published-site-check.log`
- `/tmp/caraka-published-site-e2e.log`
- `/tmp/caraka-site-deploy-5lalag9o/proof.json`
- `/tmp/caraka-postdeploy-ys7t33hb/provider.json`
- `/tmp/caraka-site-production-0yzpo2q8/proof.json`
- `/tmp/caraka-release-package-4_j5w8xk/source.bundle`
- `/tmp/caraka-release-package-4_j5w8xk/site-source.bundle`

### Evidence limits

The release remains `unproven` under the existing field gates.
No real Tailscale or Cloudflare Tunnel setup, physical Android installation, or OS push delivery was claimed.
Provider planning, configuration, and failure cases have automated coverage.
A selected user installation must complete the documented provider and phone checks.
Android uses the Web/PWA interface. This release contains no native APK.
The source measure remains 12,908 lines, with 4,908 lines above the unchanged budget.


### GitHub issue state

Issue [#15](https://github.com/CarakaDev/caraka/issues/15) was closed as completed after source and release verification.
Its process-group, cancellation, and disabled terminal-prompt corrections are included in this release.
Issue [#16](https://github.com/CarakaDev/caraka/issues/16) remains open.
The published Codex preset still selects a read-only sandbox for initial and resumed turns.
The Web/PWA release does not implement the policy-dependent sandbox requested by that issue.
