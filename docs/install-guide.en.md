# Caraka installation guide

**Date:** 7 August 2026 · **Bahasa Indonesia:** [`install-guide.md`](install-guide.md)
**Scope of this guide:** private Telegram → Claude Code, one operator, one workspace. Discord, WhatsApp, the other six presets, and `workspaces[]` all ship in v1.0, but each one is written by hand into `config.yaml`; the `init` wizard sets up only the path above.

## Prerequisites

Caraka uses software that is already on your machine:

| Requirement | Check | Fix |
|---|---|---|
| Node.js 22+ | `node --version` | install Node LTS from [nodejs.org](https://nodejs.org) |
| Git | `git --version` | install Git for your operating system |
| Claude Code | `claude --version` | `npm install --global @anthropic-ai/claude-code` |
| Claude login | `claude auth status` | `claude auth login` |
| Telegram bot | token from BotFather | open [@BotFather](https://t.me/BotFather), then run `/newbot` |

Docker, a cloud account, a domain, a webhook, and an open port are not needed.

## The fastest route: let the coding agent install it

If Codex or Claude is already running on the machine that holds the repository,
paste this prompt into it. It checks the prerequisites, installs what is
missing, then hands the token part back to you.

```text
Install Caraka for the repository in my current working directory.

Read https://github.com/CarakaDev/caraka first. Verify Node.js 22 or newer,
Git, Claude Code, and `claude auth status`. Fix only missing prerequisites that
can be installed without changing my repository. Then run `npx caraka doctor`
if Caraka is already configured.

For Telegram pairing, never ask me to paste, reveal, or repeat the bot token in
chat, command output, logs, or a committed file. Tell me to create a bot with
@BotFather, then hand me this exact command to run myself in a local terminal:

  npx caraka init --workspace "$PWD"

Wait while I enter the token privately and approve the Telegram deep link.
After I confirm init is complete, run `npx caraka doctor`, explain any failed
check, and start it with `npx caraka start`. Do not enable a webhook, open a
port, install a service, or modify Claude's model/provider configuration.
```

**The token is still typed in your own terminal and never enters the agent's
conversation.** The wizard hides the input and writes the token straight to
`~/.caraka/secrets/telegram.token`. Chat transcripts, tool logs, and terminal
history can be kept by the coding agent's client, so moving the token through
chat throws that protection away. The prompt above forbids it outright.

This prompt and the full reasoning behind it are in
[the installation prompt for a coding agent](install-with-ai.md).

## The manual route

Everything the prompt above does can be done by hand. Go into the repository
you want Claude to work on, then run:

```bash
cd /path/to/repository
npx caraka init
```

Another workspace can be named explicitly:

```bash
npx caraka init --workspace /path/to/repository
```

The wizard runs this sequence:

1. Checks Node.js, Git, Claude Code, the login status, and the workspace directory.
2. Asks for the BotFather token without showing it in the terminal.
3. Validates the token with `getMe` and turns off any old webhook so long-polling can be used.
4. Shows the pairing deep link once. Press **Start** in Telegram.
5. Asks you to confirm the Telegram identity in the terminal before writing the allowlist.

The token is written only after pairing is approved. Where they live:

```text
~/.caraka/config.yaml
~/.caraka/secrets/telegram.token
~/.caraka/secrets/approval.key
~/.caraka/caraka.db
```

The secrets directory uses mode `0700`; the config, the token, and the key use `0600`. The token is not in `config.yaml`.

## Verification

```bash
npx caraka doctor
```

`doctor` only reads state. It checks the Node version, Git, Claude Code, the Claude login, the config, the workspace, the mode on the secret files, the allowlist, and the token through Telegram. The output carries no token and no Claude account data.

A failed check names the next action. `doctor` exits with code `1` when something is wrong.

## Run the gateway

```bash
npx caraka start
```

Leave the process alive in the terminal. Caraka uses long-polling and opens no network listener. Stop it with `Ctrl-C`, or from another terminal:

```bash
npx caraka status
npx caraka stop
```

`start` writes its PID to `~/.caraka/caraka.pid` with mode `0600` and removes it on stop. Running `start` a second time while the first is still alive quits with exit code `78` and never begins a second poller.

In Telegram:

```text
/new [title] start a new session, title optional
/status      see the state of the session
/stop        cancel the running task
/commands    the commands Claude reports
/usage       the last usage Claude reported
/yolo 30m    offer a timed trust window
/lock        close the trust window at once
/help        show help
```

Anything that is not a command goes to Claude as it is. If the bot's topic mode is on in BotFather, a new session gets a topic. Failing to create the topic does not stop the gateway; replies carry the header `[workspace · #id]`.

## Approval

When the ACP adapter asks for tool permission, Caraka shows an **Allow once** and a **Reject** button. The callback holds a random ID and an HMAC, is bound to the operator and the session, lasts ten minutes, and then cannot be used again.

Caraka does not accept a word like `yes`, `allow`, or `approve` as an approval. A message like that is still treated as an ordinary prompt.

`/yolo <duration>` offers a window in which ordinary actions run without a card. The command itself changes nothing; what opens the window is its confirmation button, and that button is verified like any other approval. While the window is open, high-risk actions still raise a card, every action still enters the audit, and `/lock` closes it at once. The window closes by itself when it expires and when the gateway restarts.

Claude's `bypassPermissions` mode is a different thing, and it can only be turned on from the terminal:

```bash
npx caraka trust /path/to/repository --bypass --for 30m
```

While that window is open Claude stops asking Caraka for permission, so Caraka sees none of the decisions and cannot audit them. Only the window itself is recorded. Without `--bypass`, the same command opens Caraka's trust window, which still sees every request.

## Global installation

Pick this if you would rather not write `npx` every time:

```bash
npm install --global caraka
caraka init
caraka doctor
caraka start
```

Both routes use the same config in `~/.caraka`.

## Common problems

| Symptom | What to do |
|---|---|
| `npx: command not found` | install Node.js 22 or newer |
| Claude not found | install Claude Code and open a new terminal |
| Claude not logged in | run `claude auth login` |
| Token rejected | create or re-copy the whole token from BotFather |
| Pairing timed out | run `npx caraka init` again, then press Start within five minutes |
| The bot is silent | make sure `npx caraka start` is still alive and `doctor` is green |
| Telegram reports a conflict | stop the other bot process using the same token |
| No topic appears | turn on topic mode in BotFather or use linear mode |
| Claude cannot resume an old session | Caraka creates a replacement ACP session on its own |

See [troubleshooting.md](troubleshooting.md) for other diagnoses.

## Removal

Stop the gateway. If you installed it globally:

```bash
npm uninstall --global caraka
```

Using it through `npx` creates no global installation. The config and the audit are deliberately not deleted for you. Once you are sure that data is not needed, remove the `~/.caraka` directory yourself. Removing the package never touches your repository or your Claude configuration.

## The limits of this release

Not yet available: several operators, attachments, and the MCP inbox. Shipped but never verified live: Discord, WhatsApp, and the six presets other than Claude Code — every check on them answers a fake transport or a preset file that has never been run here. Memory has been there since v0.3: the `local` provider works with nothing installed, and Titen is offered during `init`. Those limits are written down so that installing does not promise a roadmap feature as a feature you already have.

**Background service.** This release installs no service, and Caraka will never install one by itself. The package has no `postinstall` hook and Caraka's output never contains the word `sudo`. What it has is `caraka service --print systemd|launchd|schtasks`, which **prints** the unit to stdout for you to install yourself, then prints the manual steps.

The launchd and schtasks templates ship marked **untested**; neither can be run on the developer's machine. On macOS the honest answer is start at login, not at boot: a per-user agent in `~/Library/LaunchAgents` is loaded when the user logs in and stops at logout. `loginctl enable-linger` on Linux is a separate opt-in step, because that is where the risk profile changes.

**If you put a Telegram group on the allowlist.** One thing cannot be engineered away, so it is stated here and repeated during pairing:

> Putting a group on the allowlist means choosing to show that work to its members: approval cards, file paths, diffs, and command output will be readable by every member of the group.

What stays closed is the decision. An approval button is only valid from an account on the allowlist, so other members of the group can read the card without being able to decide it. If something is too sensitive for the members of a group to see, it does not belong in a group.
