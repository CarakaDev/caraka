# Contributing to Caraka

Thanks for looking. Caraka is deliberately small, and keeping it small is the main design work — so the most valuable contribution is often a good argument for *not* adding something.

## Before you write code

Caraka is **pre-alpha**: the specification is complete, the implementation is not. Read [docs/blueprint.md](docs/blueprint.md) and the phase you are working in from [docs/roadmap.md](docs/roadmap.md) first. Open an issue before starting anything substantial, so we do not both build the same thing differently.

## The one rule

> **Does the coding agent already do this?** If yes, we do not build it.

Caraka has no agent loop, no execution tools, no model provider, and no plugin marketplace — on purpose. Every one of those exists in the coding agent already, in a better form. Proposals that add them will be declined, however well implemented.

Two more constraints that shape every review:

- **Complexity budget.** A new feature must either remove something or keep the core under ~8,000 lines.
- **Graceful degradation.** No feature may hard-fail when a capability is missing. Topics unavailable → linear mode. Memory down → reply anyway. ACP absent → CLI driver. Rich message rejected → MarkdownV2.

## Good places to help

- **Agent presets.** Adding support for a new coding agent on the CLI driver is a single YAML file in `presets/agents/` — no core code. This is the highest-value, lowest-friction contribution.
- **Channel adapters.** Implement the `Channel` interface and declare your capabilities honestly. Core must never branch on channel id.
- **Bug reports with `caraka doctor` output.** It is read-only and redacts secrets, so it is safe to paste.
- **Documentation**, in English or Indonesian. Both are first-class; a translation that is half-finished is worse than none.
- **Security review.** See [SECURITY.md](SECURITY.md) — do not open public issues for vulnerabilities.

## Development

```bash
git clone https://github.com/CarakaDev/caraka.git
cd caraka
npm install
npm run dev
```

Node ≥ 22 is required.

```bash
npm test          # unit tests
npm run lint      # oxlint + oxfmt
npm run smoke     # per-agent smoke tests (requires the agents installed)
```

## Pull requests

- One concern per PR. A PR that fixes a bug *and* refactors is two PRs.
- Add a test for anything that touches approval, policy, secret scrubbing, or session routing. These are the paths where a mistake is expensive.
- Update the affected document under `docs/` in the same PR. The specification is not decoration; a change that contradicts it is a change to it.
- Conventional commit prefixes (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`) are appreciated, not enforced.
- AI-assisted contributions are welcome. You are responsible for understanding and standing behind what you submit.

## Code style

- TypeScript, ESM only, no build-time magic
- Inline comments only where the reasoning is genuinely non-obvious
- Dependencies are capped at **25 direct runtime packages**; adding one requires justification in the PR description
- Errors surfaced to users must state the next step. Never a stack trace in chat

## Conduct

Be direct, be kind, assume good faith. Disagreement about design is the point of this file; disrespect is not.

Questions: `halo@caraka.dev`
