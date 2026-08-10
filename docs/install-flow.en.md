# Installation flow v0.1

**Date:** 7 August 2026 · **Bahasa Indonesia:** [`install-flow.md`](install-flow.md)
**Command:** `npx caraka init [--workspace PATH]`

## Wizard contract

- Find out for itself whatever can be found out: runtime version, workspace, the Git binary, the Claude binary, and login status.
- The token must not appear on screen, in the YAML config, in a log, in chat, or in an error message.
- Every failure names the next action, without a stack trace.
- A new pairing is written after the user presses Start and confirms the identity in the terminal.
- Running `init` again replaces the config once the new pairing succeeds; a failure before that point writes no new token.

## Sequence

### 1. Local checks

```text
Node.js 22+  → required
Git          → required
Claude Code  → required
Claude login → required
workspace    → absolute directory
```

The fixes it prints:

```text
Git was not found. Install Git, then run init again.
Claude Code was not found. Install Claude Code, then run init again.
Claude Code is not logged in. Run `claude auth login`, then run init again.
```

The wizard does not install system dependencies and does not change Claude's configuration.

### 2. Telegram token

The terminal prompt uses raw mode so the characters are not printed:

```text
Bot token from @BotFather (not shown):
```

`CARAKA_TELEGRAM_TOKEN` can be used by controlled automation. Its value still goes to the secret file, not to the YAML.

Caraka calls `getMe`. A rejected token is not stored. Once it is valid, `deleteWebhook` is called with `drop_pending_updates=false`, because the runtime uses long-polling.

### 3. Pairing

The wizard generates a random code and prints:

```text
https://t.me/<bot>?start=pair_<code>
```

It waits five minutes for a private chat update. Other updates are ignored. Once the payload matches:

```text
Allow @user (ID 123…) to send tasks? Type yes:
```

Only the literal answer `yes` saves the config. The Telegram ID is stored as a string so it does not lose precision.

### 4. Storage

```text
~/.caraka/                         0700
├── config.yaml                    0600
├── caraka.db
└── secrets/                       0700
    ├── telegram.token             0600
    └── approval.key               0600
```

Config and secret writes go to a temporary file and then a rename. The approval key is made from 32 random bytes and is not replaced if one already exists.

### 5. Summary

The wizard prints the bot, the workspace, topic or linear mode, the security model, and the command:

```bash
npx caraka start
```

The token is never printed again.

## Doctor

`npx caraka doctor` is read-only. It does not repair permissions, migrate the config, delete a webhook, or start Claude. Its only network check is `getMe`.

## The coding agent route

Codex or Claude may run the local checks. The token must not be asked for through the conversation. The safe route that holds on every client is:

1. The agent checks the prerequisites.
2. The user runs `npx caraka init --workspace "$PWD"` in a local terminal.
3. The user enters the token and finishes pairing.
4. The agent carries on with `npx caraka doctor` and `npx caraka start`.

The paste-ready prompt is in [install-with-ai.en.md](install-with-ai.en.md).

## Exit and shutdown

`SIGINT` or `SIGTERM` stops polling, cancels pending ACP permissions, sends a cancel for active sessions, closes the Claude adapter, removes the PID file, then closes SQLite. `caraka stop` sends that signal from another terminal. Caraka never installs a service; `caraka service --print` prints a unit for the operator to install themselves.
