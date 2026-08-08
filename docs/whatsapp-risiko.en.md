# WhatsApp risk

**Product:** Caraka · **Date:** 8 August 2026 · **Bahasa Indonesia:** [`whatsapp-risiko.md`](whatsapp-risiko.md)
**Supporting research:** `docs/research/channel-chat-indonesia-baileys-telegram-multi-sumber.md` §2
**Who this is for:** anyone weighing the `baileys` provider, before installing anything.

This is the page `caraka start` points at when the config picks `provider: baileys`, and it exists so that you can decide **not** to use it. Caraka cannot stop WhatsApp from blocking your number if you choose an unofficial provider (`security.md` §12). What we can do is explain what you are wagering before you wager it.

---

## Where this stands today

The WhatsApp channel shipped in `0.6.0` on 8 August 2026 with two providers, `baileys` and `cloud-api` (`CHANGELOG.md`). This page covers `baileys` alone; `cloud-api` is Meta's official route and carries none of this class of risk.

What has **not** happened: the 14-day field test that closes Phase 6 (`roadmap.md`). That gate reads 14 days of real use on a separate number with no ban and no manual relink, **or** an honest finding that makes Cloud API the primary recommendation. No live WhatsApp number has ever been linked to this code, so every figure on this page comes from other people's reports; we have nothing of our own to add yet.

---

## What linking a device actually does

Baileys reads the reverse-engineered WhatsApp Web multi-device protocol. You enter a pairing code, and your number gains a new *linked device* that is not the WhatsApp app.

It is free, it takes two minutes, it needs no business verification, and it gives that device **full access to your personal chats**. All of that convenience comes from one fact: the device sits inside your account with the same reach as WhatsApp Web. To Meta it is not an integration; it is a client they did not write, and the consequence lands on the number rather than on Caraka.

Two things to know before you link:

- This route violates WhatsApp's Terms of Service.
- The Baileys maintainers state that they do not support ToS-violating use, and explicitly forbid bulk or automated messaging.

---

## The figures we actually have

There is no official base rate. There are field reports, and the research above collects them:

| Figure | What it says | Its limit |
|---|---|---|
| **68%** | one analysis of 600+ Indian SMB accounts: 68% had at least one ban within 12 months | an outbound-marketing population, not a one-operator bridge |
| **2–8 weeks** | a general estimate before tooling on a reverse-engineered protocol is detected, **if its behaviour trips the detectors** | that "if" is the whole condition |
| the range of reports | a few days to several months without trouble | no reliable pattern behind them |

Both figures come from our research summary dated **7 August 2026**, which lists its third-party sources as a single list and does not say which one measured which. The 68% describes accounts doing business messaging work toward strangers, not one developer replying to himself: it is an upper bound on behaviour we do not perform, not a forecast for behaviour we do. We have no figure for a Caraka-shaped installation, and we will not invent one.

OpenClaw issue #23093 reports something more concrete: repeated session logouts, 401 errors, and bans, mostly after a reconnect or when the bridge sends a reply. Neighbouring issues read "WhatsApp linking stuck at logging in" and "can't link new devices at this time". Reconnecting and sending replies are a bridge's ordinary working day, so those reports land on exactly how Caraka behaves — which is why the reconnect ceiling in the table below is ten times Discord's.

---

## The detection signals, and what Caraka does about each

Four signals are reported, and here is where Caraka stands against them. Four of the five rows below are code that can fail rather than sentences in a document; `test/unit.test.ts` exercises the ceiling, the gap, the first-contact refusal, and the reconnect bound.

| Signal | What is reported | Where Caraka stands |
|---|---|---|
| Reply ratio | below 10% counts as high risk | Caraka only replies. The ratio sits near 100%, and there is no surface for starting a conversation |
| Contact-graph distance | messaging people you have no relationship with | `emit()` in `src/channels/whatsapp.ts` refuses to write to a number that has never written first and is not in `allowFrom`, and writes an audit row |
| Timing | send patterns too regular to be human | a uniform random gap of 1,200–3,500 ms between outbound messages, under a ceiling of 12 per rolling 60 seconds. Excess is queued, never dropped |
| Reconnect | repeated logouts and 401s after reconnecting | backoff of 5 seconds ×2 with full jitter, a 300-second ceiling, and a stop at the sixth attempt. A logged-out or 401 answer is never retried at all |
| Traffic origin | datacenter or VPS IP addresses | **not handled.** Caraka runs on your machine; if that machine is a VPS, the signal is there and nothing inside the program can fix it |

One way out, and only one: every WhatsApp send goes through `emit()`, so no caller can skip any of those three guards.

The same research notes that "anti-ban wrappers" and random delays touch only part of the signals. None of them guarantees anything. Evolution API, WAHA, and Whapi.Cloud are not an answer either: they all run Baileys or whatsmeow underneath, so the ban risk is identical and what differs is who operates the infrastructure. Caraka declines that route for one duller reason on top: an extra process for the same risk (`techstack.md` §5).

---

## Why Caraka's shape sits at the low end

One number. One operator. Replies only ever land in conversations that already exist. Strangers are never contacted. Volume is low, and the reply ratio sits near 100%. The research describes a setup that only reads and replies to existing conversations as carrying far lower risk than sending first-contact messages.

None of that is a guarantee. The four signals above are what people **report**, not a rulebook WhatsApp confirms, and an unpredictable risk does not become predictable because your profile looks good.

---

## What is a gate in code, and what is not

The research names five mandatory mitigations. Four are program behaviour:

1. **`allowFrom` is mandatory.** The config schema uses `.min(1)`, so a `whatsapp:` block with an empty list stops `caraka start` with a message naming the channel (`src/config.ts`).
2. **A hard outbound ceiling and a random gap**, enforced in `emit()`, with the numbers in the table above.
3. **No first-contact messages, ever**, enforced in the same function.
4. **Choosing `baileys` does not take effect until you write `acknowledgeRisk: true`** in the config. Without it start refuses, and the message links to this page (`docs/frd.md` FR-SETUP-06).

The fifth is half-done, and that is worth saying plainly. The research asks for the separate-number warning **during onboarding**; `caraka init whatsapp` is not built, so a `whatsapp:` block is written by hand. What exists instead is a warning printed on every `caraka start` when the `baileys` provider is selected, carrying the separate-number sentence and a link to this page. It is still a warning nobody can skip, but it arrives after the decision is written rather than before it.

---

## Use a separate number

Link a number you can afford to lose.

The rule is as plain as it looks. The device you link gets full access to that number's personal chats, and if a block arrives, that number is what gets blocked. The official route asks for the same thing for a different reason: Cloud API requires a dedicated number that cannot be shared with your personal WhatsApp.

Two more that outlive any release:

- **Do not put a colleague's number in `allowFrom` "just in case".** That list is the only sender gate there is, and every number on it can drive the agent.
- **Groups are unsupported, and that is a decision.** The linked-device protocol names the group itself as the sender, so every member would arrive as one principal and every member would read the approval code on the same card. Caraka refuses group messages in `receive()`; only one-to-one conversations with a number in `allowFrom` get through.

---

## Cloud API: the price, the requirements, and when it is the right answer

Meta's official route removes this class of risk. There are no bans, it communicates over webhooks without WebSocket fragility, Meta supports it, and its features go further (templates, interactive messages, media, read receipts).

What you supply in exchange:

- **Meta Business verification**, which takes several days.
- **Per-message pricing**, roughly $0.005–0.08 depending on country and direction. On **1 July 2025** Meta moved from conversation-based to per-message pricing. Utility templates are free inside the 24-hour window; Marketing and Authentication are always paid. Caraka only replies to conversations that already exist, so it never sends a template.
- **A dedicated number** that cannot be shared with your personal WhatsApp.
- **A webhook endpoint Meta can reach.** The receiver shipped in `0.6.0` and binds `127.0.0.1` by default; any other address needs an explicit flag that prints a warning and writes an audit row before the first connection is accepted. An `X-Hub-Signature-256` signature is mandatory and compared in constant time, loopback included. TLS and public exposure are your reverse proxy's job; Caraka does not provide them and does not claim to (`security.md` §8).

Those prices age. They were recorded in our research dated 7 August 2026, so check Meta's own price list before you budget against them.

Cloud API is the right answer when the number belongs to your business, or when losing it means losing customers, and you accept the verification, the dedicated number, the per-message bill, and one endpoint you have to look after. The same config works for both: `provider` is all that changes, and the only difference core sees is `caps.edit`, because the Cloud API has no edit endpoint and progress there stops at a single ack.

If what you actually want is to drive your coding agent from chat, and a WhatsApp number is no part of that requirement, Telegram has shipped since `0.1.0`: the official Bot API, free, with no ban risk, and long-polling that opens no port.

---

## If the number gets hit

The full runbook is in `docs/troubleshooting.md`, under WhatsApp. In short: stop the gateway, do not reconnect, delete `~/.caraka/secrets/whatsapp/`, and decide whether the next number is worth wagering or it is time to move to `cloud-api`.

---

## What we do not promise

- We cannot stop WhatsApp from blocking your number if you use an unofficial provider (`security.md` §12).
- Account bans from unofficial providers fall outside the scope of our security reports. The risk is documented and accepted, and it is not treated as a product defect (`SECURITY.md`).
- We have no probability figure for your number, and we will not offer one.
- We do not know what happens after a number is hit: the appeal route, how long recovery takes, and whether the number can be used again appear in none of the research we hold.

If, having read this, you conclude that the wager is not worth it for your number, that conclusion is one this page genuinely offers. Telegram does the same work without it.
