# Web API

The web channel serves this API at the exact configured `web.origin`. `web.origin`
is an URL origin only. It cannot contain a path, query, fragment, or trailing
slash. The server accepts only its exact `Host`. Each state-changing request
needs an exact `Origin`. The server ignores `Forwarded` and `X-Forwarded-*`.

`POST /api/pair` accepts `{ "code": string, "name": string }`. It needs the
exact origin. A valid code works once for five minutes. It returns 200 and:

```json
{ "device": { "id": "string", "name": "string" } }
```

The response sets the HttpOnly, SameSite=Strict `caraka_device` cookie. HTTPS
origins add Secure. `caraka web pair` prints the short-lived code in the URL
fragment only: `ORIGIN/#pair=CODE`.

All other `/api/` routes need that cookie. A missing, invalid, or revoked cookie
gets `401 { "error": "authentication" }`.

- `GET /health` returns `{ "ok": true }` only for the configured Host.
- `GET /api/state` returns:

  ```json
  {
    "device": { "id": "string", "name": "string" },
    "language": "en|id",
    "workspaces": [{ "slug": "string", "path": "string", "agent": "string" }],
    "rooms": [
      {
        "id": "string",
        "workspace": "string",
        "createdAt": 0,
        "sessionId": "string|null",
        "title": "string|null",
        "state": "string|null",
        "agent": "string|null"
      }
    ],
    "messages": [
      {
        "id": "string",
        "roomId": "string",
        "role": "user|assistant|system",
        "text": "string",
        "buttons": [{ "id": "string", "text": "string", "data": "string" }],
        "attachments": [{ "id": "string", "name": "string", "mime": "string" }],
        "createdAt": 0
      }
    ],
    "connection": { "state": "connected", "origin": "string" },
    "push": { "available": true }
  }
  ```

  The `language` field contains the configured UI language (`en` or `id`).
  The `agent` field is optional. Each room session comes from the Gateway
  session table. Do not infer title or state in the browser. `buttons[].data`
  is an opaque button id. Download each attachment through its authenticated
  file route.

- `POST /api/messages` accepts `{ clientId, roomId?, workspace?, text, files? }`.
  Omit `roomId` to create a room for a registered workspace. `files` must list
  uploaded file ids. Caraka verifies all ids before it writes the user message.
  It returns `{ roomId, replay }` with 202 for a new task, 200 for a replay,
  404 for an unknown room, workspace, or file, 413 for a body over 256 KiB, and
  429 when the bounded Gateway inbox is full.
- `POST /api/callback` accepts `{ messageId, buttonId }`. It returns 202 only
  while that opaque button is live. It returns 409 after use, expiry, or restart.
  It returns 429 when the Gateway inbox is full and keeps the callback live.
- `POST /api/stop` accepts `{ roomId }`. It returns 202 for a recorded room and
  forwards `/stop` through Gateway. It returns 429 when the Gateway inbox is full.
- `POST /api/files?name=NAME` accepts raw bytes up to 20 MiB. It returns
  `{ id, name }`. `GET /api/files/ID` requires the device cookie.
- `GET /api/events` is SSE. It first sends `ready`, then sends `invalidate`.
  Reload state after each `invalidate`. The server permits at most 20 concurrent
  subscriptions and returns 429 after that limit.
- `POST /api/logout` revokes the current device. `GET /api/devices` lists active
  devices. `DELETE /api/devices/ID` revokes that device.
- GET /api/push/key returns { publicKey: string } to an authenticated device. POST /api/push stores that device subscription. It returns 400 for unsupported or private endpoint hosts. DELETE /api/push removes subscriptions for the current device.
- VAPID material is created once under secrets/ with private permissions. The server sends generic notifications only. It removes subscriptions after a push service returns 404 or 410. A revoked device never receives push.

The server serves `/`, `/app.js`, `/app.css`, `/manifest.webmanifest`, `/sw.js`,
`/icon.svg`, `/icon-192.png`, `/icon-512.png`, `/fonts/public-sans.woff2`, and
`/fonts/jetbrains-mono.woff2`. Font licenses are served at
`/fonts/Public-Sans-LICENSE.txt` and `/fonts/JetBrains-Mono-LICENSE.txt`.
Other asset paths return 404. Missing packaged assets return 503.

The service worker caches only the explicit public app assets. Static fetches
omit credentials. Private API requests never enter Cache Storage. Offline startup
shows the pairing shell without saved messages. A disconnected open session keeps
its visible messages and disables task and permission controls.
