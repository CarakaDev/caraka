# Security Policy

Caraka connects untrusted input (chat messages) to code execution on a developer's machine. We take reports seriously and we would rather hear about a problem early than read about it later.

## Reporting a vulnerability

**Email `security@caraka.dev`.** Do not open a public issue for security problems.

Please include:

- What you found and why it matters
- Steps to reproduce, ideally minimal
- Version, operating system, channel, and coding agent involved
- Whether you have disclosed it anywhere else

**Our commitment:** acknowledgement within **72 hours**, an assessment within 7 days, and credit in the release notes unless you prefer otherwise. We will keep you updated while we work, and we will tell you honestly if we decide something is not a vulnerability.

You may also use GitHub's [private vulnerability reporting](https://github.com/CarakaDev/caraka/security/advisories/new) if you prefer.

## Scope

**In scope**

- Bypassing the approval flow — anything that lets an action run without an explicit human decision
- Escaping the allowlist or the pairing mechanism
- Forging, replaying, or reusing an approval callback or its nonce
- Prompt injection that leads to execution without approval
- Secret leakage through outbound messages, logs, memory, or audit entries
- Privilege escalation between policy modes, especially anything reaching `trusted` from chat
- Gateway exposure beyond `127.0.0.1` without explicit opt-in
- Reading or writing outside a configured workspace

**Out of scope**

- Anything the operator explicitly approved. Caraka asks; it does not second-guess a human decision
- Vulnerabilities in the coding agent itself — report those to that project
- Vulnerabilities in Telegram, Discord, WhatsApp, or their libraries — report upstream
- WhatsApp account bans from using unofficial providers. This risk is documented and accepted, not a defect
- Social engineering of the operator
- Missing hardening that is documented as a deliberate trade-off

## Security model in brief

The full threat model lives in [docs/security.md](docs/security.md). The short version:

- Everything arriving from a chat is **untrusted input**. Message text can never change policy, approve an action, or raise a privilege
- Approvals are signed, single-use, TTL-bound callbacks. The payload lives server-side; only an id and an HMAC travel over the wire
- `trusted` mode can only be granted from a local terminal and **must** expire
- Caraka adds no execution surface of its own. Sandboxing, permissions, and diff review are inherited from the coding agent
- Model API keys are never requested, stored, or transmitted by Caraka

## Supported versions

Caraka is **pre-alpha**. Until `1.0.0`, only the latest published version receives security fixes.

## Disclosure

We aim to publish an advisory once a fix is available, or within 90 days of the report, whichever comes first. If a report is being actively exploited we will move faster and say so.
