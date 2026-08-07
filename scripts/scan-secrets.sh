#!/usr/bin/env bash
# Refuses to let anything credential-shaped reach a public repository.
#
# Scans what git actually tracks, not the working tree: an ignored .env is fine,
# a committed one is not. Runs before every push, and in the verification gate.
set -uo pipefail
cd "$(dirname "$0")/.."

# Files that must never be tracked at all, whatever they contain.
BANNED_FILES='^(\.env(\..*)?|.*\.pem|.*\.key|.*\.p12|\.npmrc|\.dev\.vars(\..*)?)$'

# Files allowed to contain pattern matches, because the pattern is the point:
# the example env file, the standard that documents the rule, and this script.
ALLOWLIST='^(\.env\.example|standards/ears\.md|scripts/scan-secrets\.sh)$'

PATTERNS=(
  'gh[pousr]_[A-Za-z0-9]{16,}'                            # GitHub token
  'sk-[A-Za-z0-9_-]{20,}'                                 # OpenAI-style key
  'AKIA[0-9A-Z]{16}'                                      # AWS access key id
  'BEGIN (RSA|OPENSSH|EC|PGP) PRIVATE KEY'
  '[0-9]{8,10}:AA[A-Za-z0-9_-]{33}'                       # Telegram bot token
  '(api[_-]?key|secret|passwd|password|token)[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"']{12,}'
)

fail=0
tracked=$(git ls-files)
scannable=$(printf '%s\n' "$tracked" | grep -Ev "$ALLOWLIST")

while IFS= read -r f; do
  [ -z "$f" ] && continue
  [ "$f" = ".env.example" ] && continue
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
