# Task 3 report — connection setup and Web Push

**Status:** implementation complete. Release, package publication, deployment, and live provider work remain Task 4 or manual operator work.

## Changed files

- `src/web/connect.ts` creates Tailscale and named Cloudflare command plans. It uses structured arguments through an injected runner.
- `src/web/push.ts` creates persistent VAPID material, validates supported HTTPS endpoints, binds subscriptions to devices, bounds sends, and removes 404 or 410 subscriptions.
- `src/web/cli.ts`, `src/web/server.ts`, `src/channels/web.ts`, `src/store/db.ts`, and `src/config.ts` connect the CLI, HTTP routes, device records, notifications, and secrets path.
- `assets/web/sw.js` handles push and same-origin notification clicks.
- `test/web-connect.test.ts`, `test/web.test.ts`, and `test/web-browser/app.spec.ts` cover plans, HTTP routes, subscriptions, revocation, and UI availability.
- `docs/web-guide.md`, `docs/web-guide.en.md`, `docs/web-api.md`, `docs/blueprint.md`, `docs/prd.md`, and `docs/roadmap.md` record supported Web/PWA behavior and remaining manual boundaries.

## Evidence

All commands ran through `ssh -o BatchMode=yes rama-tuf` in `/home/ramaaditya/Project/caraka/.worktrees/web-pwa`.

| Command | Result |
|---|---|
| `node --import tsx --test test/web-connect.test.ts` | 7 passed. It covers read-only plans, provider conflict and login states, Cloudflare DNS safety, health versus anonymous API versus phone status, push endpoint rejection, dead subscriptions, device revocation, and config preservation. |
| `node --import tsx --test test/web.test.ts` | 13 passed. It covers authenticated push key and device-bound subscribe and unsubscribe routes with private endpoint rejection. |
| `npm run web` | 20 passed. The root web command now includes both web test files. |
| `npm run web:browser` | 12 passed. It proves the enabled notification control appears after configured push. |
| `npm run lint` | Passed with zero warnings and zero errors after formatting. |
| `npx tsc -p tsconfig.json --noEmit` | Passed. |
| `npm run build` | Passed. |
| `git diff --check` | Passed. |

The first browser run found the expected stale assertion for unavailable push. The test changed to assert that the configured notification control is enabled. The second browser run passed 12 of 12.

## Manual boundaries

- No Tailscale, Cloudflare, DNS, provider login, service installation, global package installation, personal configuration, deployment, publication, or phone connection changed during this task.
- Default provider commands inspect state only. Only `--apply` can invoke Tailscale Serve, create a named Cloudflare tunnel, write the dedicated Cloudflare ingress configuration, route DNS, or update `web.origin`.
- Cloudflare plans do not use Quick Tunnels or `--overwrite-dns`. Tailscale plans refuse an existing HTTPS proxy route with a different target.
- The connection check uses bounded requests. It reports health and anonymous private API rejection separately. It always marks phone reachability as manual.
- Tests use injected provider runners and local HTTP fixtures. They do not prove a selected provider account, DNS record, installed provider service, or phone can reach the configured origin.

## Concerns

- Cloudflare recommends remotely managed tunnels. Caraka documents its supported named locally managed CLI flow and prints an explicit provider service command for review.
- VAPID subscriptions are restricted to known push service hosts. A browser or provider outside that list needs an explicit product decision before support.
- `npm install` reported three dependency advisories. Task 4 owns the existing lockfile audit refresh. This task did not run an audit fix.
