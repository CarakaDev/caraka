## What this changes

<!-- One concern per PR. A PR that fixes a bug and refactors is two PRs. -->

## Why

<!-- Link the issue, or explain the problem. -->

## Checklist

- [ ] One concern only
- [ ] Tests added for anything touching approval, policy, secret scrubbing, or session routing
- [ ] The affected document under `docs/` is updated in this PR
- [ ] Core does not branch on `channel.id` anywhere
- [ ] No new hard-fail path: the feature degrades when a capability is missing
- [ ] `npm test` and `npm run lint` pass

## Complexity budget

<!-- A new feature must either remove something or keep the core under ~8,000 lines. Which is it? -->

Lines added: <!-- n -->  ·  Lines removed: <!-- n -->
