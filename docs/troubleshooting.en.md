# Troubleshooting

**Bahasa Indonesia:** [`troubleshooting.md`](troubleshooting.md)

Symptom, cause, fix. For a first installation see `install-guide.md`.

The first step is always the same:

```bash
caraka doctor
```

Its output is read-only, deterministic, and every secret is redacted. Safe to paste into an issue.

---

## Installation

**`command not found: npx`**
Node.js is not installed. `install-guide.md` §3.

**`Unsupported engine` on `npx caraka`**
Node is too old. It needs 22 or newer. Check `node --version`.

**`EACCES` on `npm i -g`**
npm is installing into a system directory. Do not use `sudo`. Move the npm prefix into your home:
```bash
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

**The install script stops without a message**
Run it with `--dry-run` to see the plan, or read it first: `curl -fsSL https://caraka.dev/install.sh | less`.

---

## Coding agent

**`No coding agent found`**
None is installed, none is on `PATH`, or the one on `PATH` cannot be started from here. Install one (`install-guide.md` §4), then run `caraka doctor` to confirm it is detected.

**The agent was installed with `npm -g` but is not detected on native Windows**
npm writes three files per bin on Windows: `agent.ps1`, `agent.cmd`, and a `#!/bin/sh` script named exactly like the bin. `CreateProcessW` tries only `.com` and `.exe`, so the bare name ends as `-4058` (UV_ENOENT), and the `.cmd` is refused by Node with `EINVAL` since CVE-2024-27980. Caraka does not run it through a shell: the chat message goes in as an argument, and a batch argument cannot be escaped with certainty. Two ways out: install the agent as an `.exe` through its own Windows installer, or run Caraka under WSL2 (`docs/frd.md` NFR-06). `caraka doctor` does not print a green row for the shim.

**The agent is detected but every run fails instantly**
It is not authenticated. Run `claude login`, `codex login`, or `gemini` depending on the agent.

**`incompatible ACP version`**
The ACP adapter is older than what is supported. Update the agent, or force the CLI route in the config:
```yaml
workspaces:
  - slug: toko-api
    path: /absolute/path/to/toko-api
    driver: cli
```

**The agent works in a terminal but not through Caraka**
Usually `PATH` differs when it runs as a background service. Write the absolute path in the agent preset, or start the gateway from the same shell.

**A run stops at 30 minutes**
That is the default timeout. Raise it if the task genuinely warrants it:
```yaml
runner:
  timeoutMinutes: 60
```

---

## Telegram

**The bot replies to nothing**
In order: have you pressed Start? Is the bot not blocked? Is your number or id in `allowFrom`? Does the whitelist in @BotFather not shut your account out? `caraka doctor` checks all four.

**`token rejected (401)`**
The token was copied in part. Copy the whole thing again from BotFather, including the digits before the colon.

**A topic is never created**
In a supergroup, forum mode is off or the bot lacks `can_manage_topics`. The method fails silently, so Caraka detects it once at startup and then uses linear mode. Turn Topics on in the group settings, then run `caraka doctor` again. The `--fix` flag is **specified, not in v0.2**.

**A long message is cut off inside a code block**
A bug. Report it with the output of `caraka doctor` and the length of the message. A code block must never be cut.

**The formatting is a mess, raw marks show up**
`sendRichMessage` failed and the MarkdownV2 fallback escaped it wrongly. Report it along with the original text.

**Repeated `429 Too Many Requests`**
Too many status updates. Raise the throttle:
```yaml
channels:
  telegram:
    editThrottleMs: 2500
```

---

## WhatsApp

Read `docs/whatsapp-risiko.md` first if you use the `baileys` provider. This section is about fixing, not about deciding.

**Relinking the device**
Caraka does not draw a QR. Baileys' `qr` payload is raw material for an image and there is no renderer in this package, so what gets printed is the eight-character pairing code. While the device is not yet linked, `caraka start` prints that code to the terminal:

```
This device is not linked yet. On the phone, open WhatsApp →
Linked devices → Link with phone number, and type:
<eight characters>
```

The code is short-lived. If it expires before you can type it, stop Caraka and start it again for a new one. If what gets printed is a request for `number` instead, the `whatsapp:` block does not have that key yet:

```yaml
whatsapp:
  provider: baileys
  number: "628…"        # the linked number, separate from your personal one
  acknowledgeRisk: true
  allowFrom: ["628…"]
```

Relinking from scratch means throwing the old session away:

```bash
caraka stop
rm -rf ~/.caraka/secrets/whatsapp/
caraka start
```

**`WhatsApp logged this device out`**
Caraka stops and does **not** reconnect, and that is on purpose: reconnecting over and over after a logout is the pattern reported to burn accounts. Do not automate the retry. Relink through the steps above, and if the logout happens repeatedly within days, that is a finding — move to `cloud-api`.

**Constant disconnects, or `WhatsApp did not come back after 6 attempts`**
The backoff is 5 seconds doubled with jitter, capped at 300 seconds, and it stops at the sixth attempt; about five minutes. After that Caraka writes one audit line and tells you through another configured channel. In order:

1. Check this machine's network first — a disconnect on our side reads the same as a disconnect on WhatsApp's side.
2. Check that the phone is still online and that the linked device is still listed under WhatsApp → Linked devices.
3. If the device is gone from that list, this is a logout, not a network problem. Follow the entry above.
4. Do not run Caraka over and over in a shell loop. What is left after the sixth attempt is a decision, not a seventh attempt.

**A reply is not sent, the log mentions first contact**
Caraka never writes first to a number that has not written to it. Send one message from that number, or put it in `allowFrom`. This is not a bug to be loosened: it is one of the four ban mitigations that exist as code.

**Messages from a group do not arrive**
They will not, by design. A group message names the group itself as the sender, so every member would arrive as a single principal and every member would read the approval code on the same card. Only one-to-one conversations work.

**The approval card appears with no buttons**
Correct, WhatsApp has no callback buttons. Reply `ok <code>` or `no <code>` with the code on the card. Five wrong codes from one sender close the code route for that session until the question is decided or expires.

**Meta never calls the Cloud API webhook**
The receiver binds to `127.0.0.1` by default, so Meta cannot reach it without your own reverse proxy in front. What has to match: the path in the `whatsapp.webhook` block is the same one registered in the Meta app, the verify token is identical, and the app secret Meta uses to sign `X-Hub-Signature-256` is in `~/.caraka/secrets/whatsapp.appsecret`. An invalid signature is answered 403 with no body, including on a loopback bind.

**The number got banned**
Stop the gateway, do not reconnect, and delete `~/.caraka/secrets/whatsapp/`. We have no appeal route to recommend and will not invent one. There are only two decisions left: another number you can afford to lose, or `cloud-api`, which works on the same config by changing `provider` and filling in `phoneNumberId`.

**Rotating credentials**
Baileys auth state: stop Caraka, delete `~/.caraka/secrets/whatsapp/`, relink. The Cloud API access token, verify token, and app secret: reissue them in the Meta app, then rewrite the files in `~/.caraka/secrets/` — `whatsapp.token`, `whatsapp.verify`, `whatsapp.appsecret`, all mode 0600 — or supply them through `CARAKA_WHATSAPP_TOKEN`, `CARAKA_WHATSAPP_VERIFY_TOKEN`, and `CARAKA_WHATSAPP_APP_SECRET`. Not one of them may go into `config.yaml`. `caraka doctor` checks the modes.

---

## Approval

**The button was pressed and nothing happened**
The nonce has expired, the default TTL is 10 minutes. An expired card rejects automatically. Ask the agent to try again.

**An approval card appears for a read operation**
A bug. `read-only` and `assisted` mode must not ask permission to read.

**Opening a trust window**
From chat, `/yolo <duration>` shows a card with a confirmation; the button opens the window, not the text. From the terminal:
```bash
caraka trust toko-api --for 60m
```
Both must carry a duration, at most 60 minutes, and both close by themselves when they expire and when the gateway restarts. `/lock` closes it at once.

**Claude's `bypassPermissions` mode cannot be turned on from chat**
That is how it is, and it will not change. Only `caraka trust <workspace> --bypass --for <duration>` from the terminal. While that window is open Claude stops asking Caraka for permission, so Caraka does not see the decisions and does not audit them; only the window itself is recorded.

**Risky actions still ask permission in `trusted` mode**
Also how it is. Force-push, `rm -rf`, database migrations, and deploys always ask for confirmation.

---

## Memory

**`memory_degraded` in the log**
`recall` went past 500 ms and was skipped. Replies keep working. Check that Titen is alive: `curl 127.0.0.1:8787/healthz`. The `/health` path answers 404, and port 7717, which this line named through v1.1.2, was never one Titen served.

**Titen answers and memory is still empty**
`/healthz` needs no key; every other route answers `401 UNAUTHENTICATED` without one. Take the key `titen bootstrap` prints and export it as `CARAKA_TITEN_API_KEY` in the environment that runs Caraka — not `TITEN_API_KEY`, because the `CARAKA_` prefix is what keeps the key from being inherited by a spawned coding agent. `caraka doctor` probes a credentialed route, so a missing key shows as a failing row with the command on it.

**Titen unreachable**
Run `titen serve`. If you are not using it, change the provider:
```yaml
memory:
  provider: local   # or none
```

**A workspace's memory looks empty after an upgrade**
The memory scope is `workspace:<path>`, and since v1.3 that path is canonicalised through `resolve()`. An installation whose `config.yaml` says `path: /srv/app/` or `path: /srv/app/../app` therefore changes key once, and the old rows stay under the old spelling. One `UPDATE` moves them:
```sql
UPDATE memory_local SET scope = 'workspace:/srv/app' WHERE scope = 'workspace:/srv/app/';
```
Run `caraka stop` first, then `sqlite3 ~/.caraka/caraka.db` with the old spelling `SELECT DISTINCT scope FROM memory_local` reports.

**The agent remembers something wrong**
Trace it before deleting: `/memori` to look, then the claim id can be traced back to the evidence it came from. `/lupakan <id>` if it really is wrong.

---

## Gateway

**The port is already taken**
Caraka picks the next free port by itself. If you want it fixed, set `gateway.port`.

**Sessions disappear after a restart**
Sessions persist in SQLite. If they are gone, the database is unreadable. Check `~/.caraka/caraka.db` and its file permissions.

**A run is marked `interrupted`**
The gateway stopped while the run was going. Changes that were already approved are still saved. Start a new session with `/new`.

**Two runs fighting over the same file**
This must not happen: one active run per workspace is held by a unique partial index. If it happens, that is a serious bug. Report it with the audit log.

---

## Reporting

Include three things:

```bash
caraka doctor          # already redacted, safe to paste
caraka --version
caraka audit --since 1h
```

Plus the operating system, the coding agent and its version, and the exact steps to reproduce the symptom.

Security vulnerabilities do not go through public issues. Send them to `security@caraka.dev`, see `SECURITY.md`.
