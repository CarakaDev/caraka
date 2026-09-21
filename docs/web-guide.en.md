# Caraka Web/PWA guide

Caraka Web/PWA pairs one browser with the computer that runs Caraka. Tasks still run on that computer. A paired device can create tasks, answer permission cards, and read results.

## Before you start

- Install Node.js 22 or later and sign in to the coding agent on the computer.
- Select one HTTPS connection. Use Tailscale Serve for a private Tailnet. Use a named Cloudflare Tunnel for a hostname you control.
- Use a phone and browser that support service workers and the Push API.

Do not use a Quick Tunnel. A Quick Tunnel is for development. It does not support the SSE connection used by the web app.

## Configure the web channel

Run these commands from a registered project folder:

    caraka init web --workspace /path/to/project --agent codex --language en
    caraka start

The first command creates loopback web configuration. The second command starts the gateway. Neither command installs a background service.

## Select a connection

Start with a plan. A plan reads provider state only. It does not change Caraka or provider configuration.

    caraka web connect tailscale
    caraka web connect cloudflare --hostname caraka.example.com --tunnel caraka-web

Sign in to Tailscale when the plan requests it. Caraka checks the existing Serve configuration. If another target owns the HTTPS route, inspect it with `tailscale serve status --json`. Repair that route before you apply Caraka.

Sign in to Cloudflare in your terminal. Caraka supports the named, locally managed tunnel CLI flow. Cloudflare usually recommends remotely managed tunnels. Caraka does not overwrite DNS. It does not use `--overwrite-dns`.

Apply only after you read the plan:

    caraka web connect tailscale --apply
    caraka web connect cloudflare --hostname caraka.example.com --tunnel caraka-web --apply

The Cloudflare path stores tunnel credentials and one ingress configuration under `secrets/cloudflared/`. The ingress configuration ends with a 404 response. The command prints provider service steps. Install a provider service only after you review those steps. Caraka does not install a daemon.

The origin changes only with `--apply`. Other Caraka configuration fields stay unchanged. Pair the browser again after you change the origin.

## Check the connection and phone

    caraka web connect tailscale --check

The check requests `GET /health` at the origin. It then checks that an anonymous `GET /api/state` gets 401. The check has a timeout. It rejects redirects.

`Phone verification: manual` is an expected result. Open the origin on the phone through the selected connection. Run `caraka web pair` on the computer. Enter the five-minute code on the pairing page. A server fetch does not prove that the phone can open the origin.

## Enable notifications

After pairing, open Devices & connection and select Enable notifications. The browser requests permission from that button. Caraka binds the subscription to the authenticated device. It stores VAPID keys only under `secrets/` with private permissions.

Notifications state only that task activity needs attention. They do not include prompts, workspace names, paths, tokens, or results. A notification click opens the current origin. A push failure does not stop a task or the local UI.

Revoke a device in Devices & connection or run:

    caraka web devices --revoke DEVICE_ID

A revoked device receives no more push messages. Caraka also removes a subscription when the push service returns 404 or 410.

## Coding-agent prompt

Copy this prompt to your coding agent:

    Configure Caraka Web/PWA for this machine. First inspect the existing Caraka config.
    Do not change provider state until you show the output from a read-only plan.
    Use Tailscale Serve for a private tailnet, or a named Cloudflare Tunnel for a hostname I control.
    Do not use a Quick Tunnel or overwrite DNS. Apply only after I approve the plan.
    Start Caraka, run the connection check, and report health, anonymous API rejection, and phone verification separately.
    Do not install a Caraka service. Do not print secrets.

## Manual boundaries

Provider login, provider service installation, existing DNS records, and phone access use your accounts and network. Automated tests prove command shapes, conflict refusal, HTTP contracts, and subscription handling. Automated tests do not prove that your tunnel or phone works.

See the [Web API contract](web-api.md).
