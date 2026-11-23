#!/usr/bin/env sh
# Shared leak guard for this public repository.
#
# Blocks client-identifying terms from ever being committed or pushed.
# The denylist lives OUTSIDE the repository on purpose: committing it would
# publish the very names it protects. Default location:
#   ${XDG_CONFIG_HOME:-$HOME/.config}/hugo-adv/denylist
# One extended regex per line, case-insensitive, lines starting with # ignored.

DENYLIST="${HUGO_ADV_DENYLIST:-${XDG_CONFIG_HOME:-$HOME/.config}/hugo-adv/denylist}"

load_patterns() {
  if [ ! -f "$DENYLIST" ]; then
    echo "guard: denylist not found at $DENYLIST (skipping client-term check)" >&2
    return 1
  fi
  PATTERNS=$(mktemp)
  grep -vE '^[[:space:]]*(#|$)' "$DENYLIST" > "$PATTERNS"
  return 0
}

# Reads text on stdin, fails if any pattern matches. $1 describes the source.
check_stream() {
  hits=$(mktemp)
  if grep -inE -f "$PATTERNS" > "$hits" 2>/dev/null; then
    echo "guard: blocked, client-identifying term found in $1:" >&2
    sed 's/^/  /' "$hits" >&2
    rm -f "$hits" "$PATTERNS"
    exit 1
  fi
  rm -f "$hits"
}

run_gitleaks() {
  if command -v gitleaks >/dev/null 2>&1; then
    gitleaks "$@" --no-banner --redact || {
      echo "guard: gitleaks found a possible secret" >&2
      exit 1
    }
  else
    echo "guard: gitleaks not installed, secret scan skipped" >&2
  fi
}
