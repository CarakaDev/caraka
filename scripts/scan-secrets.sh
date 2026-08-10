#!/usr/bin/env bash
# Refuses to let anything credential-shaped reach a public repository.
#
# Scans what git actually tracks, not the working tree: an ignored .env is fine,
# a committed one is not. Runs first in `npm run verify`, and as the first step
# of the `verify` job in CI.
set -uo pipefail
cd "$(dirname "$0")/.."

# Files that must never be tracked at all, whatever they contain. Anchored on a
# path segment rather than the repository root, because `site/` has its own
# `.env` and that is the one `site/.env.example` tells a contributor to create.
BANNED_FILES='(^|/)(\.env(\..*)?|\.npmrc|\.dev\.vars(\..*)?)$|\.(pem|key|p12)$'

# Files allowed to contain pattern matches, because the pattern is the point:
# the example env files, the standard that documents the rule, this script, and
# the two suites that prove the scrubber redacts a credential — which they can
# only do by holding literals shaped like one.
ALLOWLIST='(^|/)\.env\.example$|^(standards/ears\.md|scripts/scan-secrets\.sh|test/(unit|e2e)\.test\.ts)$'

PATTERNS=(
  'gh[pousr]_[A-Za-z0-9]{16,}'                            # GitHub token
  'sk-[A-Za-z0-9_-]{20,}'                                 # OpenAI-style key
  'AKIA[0-9A-Z]{16}'                                      # AWS access key id
  'titen_sk_[A-Za-z0-9_-]{16,}'                           # Titen API key
  'BEGIN (RSA|OPENSSH|EC|PGP) PRIVATE KEY'
  '[0-9]{8,10}:AA[A-Za-z0-9_-]{33}'                       # Telegram bot token
  '(api[_-]?key|secret|passwd|password|token)[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"']{12,}'
  # The unquoted half of the same leak: what a person pastes into a scratch
  # file or a shell while debugging. Kept to SCREAMING_CASE with no space
  # around the `=`, because the lowercase form without quotes is how ordinary
  # code assigns a variable (`const token = options.token`), not how a value
  # gets written down.
  '(^|[[:space:]]|export )[A-Z][A-Z0-9_]*(KEY|SECRET|TOKEN|PASSWORD|PASSWD)=[^[:space:]"'"'"']{12,}'
)

fail=0
tracked=$(git ls-files)
scannable=$(printf '%s\n' "$tracked" | grep -Ev "$ALLOWLIST")

while IFS= read -r f; do
  [ -z "$f" ] && continue
  printf '%s' "$f" | grep -qE '(^|/)\.env\.example$' && continue
  if printf '%s' "$f" | grep -qE "$BANNED_FILES"; then
    echo "TRACKED SECRET FILE: $f"
    fail=1
  fi
done <<< "$tracked"

for p in "${PATTERNS[@]}"; do
  hits=$(printf '%s\n' "$scannable" | tr '\n' '\0' | xargs -0 -r git grep -nIE "$p" -- 2>/dev/null)
  if [ -n "$hits" ]; then
    echo "PATTERN /$p/:"
    echo "$hits"
    fail=1
  fi
done

# The Cloudflare account is passed through the environment, never committed.
acct=$(git grep -nE '"?account_id"?[[:space:]]*[:=]' -- '*.jsonc' '*.toml' '*.json' 2>/dev/null)
if [ -n "$acct" ]; then
  echo "wrangler config carries an account_id — pass CLOUDFLARE_ACCOUNT_ID instead:"
  echo "$acct"
  fail=1
fi

if [ $fail -eq 0 ]; then
  echo "clean: $(printf '%s\n' "$tracked" | grep -c .) tracked files, no credentials"
fi
exit $fail
