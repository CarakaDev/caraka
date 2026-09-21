# Web API

The web channel serves this API on `web.origin`. The server accepts only the
configured `Host`. Each state-changing request must send an exact `Origin`.
The server ignores all `Forwarded` and `X-Forwarded-*` headers.

`POST /api/pair` accepts `{ "code": string, "name": string }`. It needs the
exact origin. A valid five-minute code works once. The response is 200 with
`{ "device": { "id": string, "name": string } }` and an HttpOnly,
SameSite=Strict `caraka_device` cookie. The terminal command prints the code in
the URL fragment only: `caraka web pair` prints `ORIGIN/#pair=CODE`.

All other `/api/` routes need that cookie. A missing, invalid, or revoked cookie
gets `401 { "error": "authentication" }`.

- `GET /health` returns `{ "ok": true }`. It does not authenticate.
- `GET /api/state` returns `{ device, workspaces, rooms, messages, connection,
push }`. `rooms` contains `{ id, workspace, createdAt }`. `messages` contains
  `{ id, roomId, role, text, buttons, createdAt }`. `buttons` contains opaque
  `{ id, text, data }` records. Treat `data` as the opaque button id.
- `POST /api/messages` accepts `{ clientId, roomId?, workspace?, text, files? }`.
  Omit `roomId` to make a room for a registered workspace. It returns 202 for a
  new task, or 200 for a replay, with `{ roomId, replay }`. A `clientId` runs at
  most once.
- `POST /api/callback` accepts `{ messageId, buttonId }`. It returns 202 only
  while that opaque button is live. It returns 409 after use or restart.
- `POST /api/stop` accepts `{ roomId }` and returns 202 for a recorded room.
- `POST /api/files?name=NAME` accepts raw bytes up to 20 MiB and returns
  `{ id, name }`. `GET /api/files/ID` requires the device cookie.
- `GET /api/events` is SSE. It sends `ready`, then `invalidate`; reload state
  after every `invalidate` event.
- `POST /api/logout` revokes the current device. `GET /api/devices` lists active
  devices. `DELETE /api/devices/ID` revokes an active device.
- `GET /api/push/key`, `POST /api/push`, and `DELETE /api/push` return 503 until
  Task 3 configures Web Push.

The server serves only `/`, `/app.js`, `/app.css`, `/manifest.webmanifest`,
`/sw.js`, and `/icon.svg`. Until Task 2 adds these assets, each allowed asset
returns 503 with a helpful JSON error. Other asset paths return 404.
