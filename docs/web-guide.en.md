# Caraka Web/PWA guide

Caraka Web/PWA pairs one browser with the computer that runs Caraka. Tasks run on that computer. A paired device can create tasks, answer permission cards, and read results.

## Before you start

Install Node.js 22 or later. Install Caraka in your terminal:

    npm install --global caraka

Sign in to the coding agent on the computer. Select one HTTPS connection. Use Tailscale Serve for a private Tailnet. Use a named Cloudflare Tunnel for a hostname you control. Use a phone and browser that support service workers and the Push API.

Do not use a Quick Tunnel. It is for development and does not support the SSE connection used by the web app.

## Configure the web channel

For Codex, run this command from a registered project folder:

    caraka init web --workspace /path/to/project --agent codex --language en

Web init keeps existing workspace routes. Different folders with the same name receive distinct slugs, such as app and app-2. Repeating init for the same path does not add another entry.

For another installed, signed-in agent, use its shipped preset identifier. This command creates loopback web configuration. Do not start Caraka until you apply an HTTPS connection.

## Select a connection

Start with a plan. A plan reads provider state only.

    caraka web connect tailscale
    caraka web connect cloudflare --hostname caraka.example.com --tunnel caraka-web

Sign in to Tailscale when requested. Caraka checks the Serve state. If another handler owns the HTTPS route, inspect it with `tailscale serve status --json`. Repair that route before you apply Caraka.

Sign in to Cloudflare in your terminal. Caraka supports the named local-management CLI flow. Cloudflare usually recommends remotely managed tunnels. Caraka does not overwrite DNS. It does not use `--overwrite-dns`.

Install Tailscale manually on Debian, Ubuntu, Fedora, RHEL, macOS, or Windows. The plan gives a command or a provider link for your platform. Install cloudflared manually. On Debian or Ubuntu, use `cloudflare-main.gpg` and the `any main` APT repository. On Fedora or RHEL, use `cloudflared.repo`. Review the provider instructions before you run them.

Apply only after you read the plan:

    caraka web connect tailscale --apply
    caraka web connect cloudflare --hostname caraka.example.com --tunnel caraka-web --apply

The Cloudflare path stores a new tunnel credential and ingress configuration under `secrets/cloudflared/`. The ingress configuration ends with a 404 response. If you reuse an existing named tunnel, give its credential file explicitly:

    caraka web connect cloudflare --hostname caraka.example.com --tunnel existing-tunnel --credentials /path/to/tunnel.json --apply

The command prints provider service steps. Install a provider service only after you review those steps. Caraka does not install a daemon.

Start Caraka after `--apply` changes the origin:

    caraka start

If Caraka already runs, stop it and start it again. The web server reads the origin at startup. Pair the browser again after you change the origin.

## Check the connection and phone

    caraka web connect tailscale --check

The check requests `GET /health` at the origin. It then checks that an anonymous `GET /api/state` gets 401. The check has a timeout. It rejects redirects.

`Phone verification: manual` is expected. Open the origin on the phone through the selected connection. Run `caraka web pair` on the computer. Enter the five-minute code on the pairing page. A server fetch does not prove that the phone can open the origin.

## Enable notifications

After pairing, open Devices & connection and select Enable notifications. The browser requests permission from that button. Caraka binds the subscription to the authenticated device. It stores VAPID keys only under `secrets/` with private permissions. Notifications require the configured HTTPS origin.

Notifications state only that task activity needs attention. They do not include prompts, workspace names, paths, tokens, or results. A notification click opens the current origin. A push failure does not stop a task or the local UI.

Revoke a device in Devices & connection or run:

    caraka web devices --revoke DEVICE_ID

A revoked device receives no more push messages. Caraka also removes a subscription when the push service returns 404 or 410.

## Coding-agent prompt

Copy this prompt to your coding agent:

    Configure Caraka Web/PWA for this machine. Inspect the existing Caraka config first.
    Show a read-only provider plan before you change provider state.
    Use Tailscale Serve for a private Tailnet, or a named Cloudflare Tunnel for a hostname I control.
    Do not use a Quick Tunnel or overwrite DNS. Apply only after I approve the plan.
    Restart Caraka after an applied origin change. Run the connection check.
    Report health, anonymous API rejection, and phone verification separately.
    Do not install a Caraka service. Do not print secrets.

## Manual boundaries

Provider login, provider service installation, existing DNS records, and phone access use your accounts and network. Automated tests prove command shapes, conflict refusal, HTTP contracts, and subscription handling. Automated tests do not prove that your tunnel or phone works.

See the [Web API contract](web-api.md).
