#!/usr/bin/env bash
# PreToolUse hook for Bash: block a few dangerous commands defensively.
# Exits non-zero with a reason string to be surfaced to the agent.
set -euo pipefail

payload=$(cat)
cmd=$(printf '%s' "$payload" | python3 -c 'import sys, json; d=json.load(sys.stdin); print(d.get("tool_input", {}).get("command", ""))' 2>/dev/null || true)

case "$cmd" in
  *"rm -rf /"*|*"rm -rf ~"*|*"> /dev/sda"*)
    echo "BLOCKED: destructive command pattern detected" >&2
    exit 2
    ;;
  *"alembic downgrade"*"base"*)
    echo "BLOCKED: full downgrade requires explicit user confirmation" >&2
    exit 2
    ;;
  *"pip install"*"--break-system-packages"*)
    echo "BLOCKED: use a virtualenv or uv instead of --break-system-packages" >&2
    exit 2
    ;;
esac

exit 0
