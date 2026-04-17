#!/usr/bin/env bash
# PostToolUse hook: auto-format edited Python files with ruff.
# Reads the tool call JSON payload from stdin.
set -euo pipefail

payload=$(cat)
file_path=$(printf '%s' "$payload" | python3 -c 'import sys, json; d=json.load(sys.stdin); print(d.get("tool_input", {}).get("file_path", ""))' 2>/dev/null || true)

if [[ -z "$file_path" || "${file_path##*.}" != "py" ]]; then
  exit 0
fi

if command -v ruff >/dev/null 2>&1; then
  ruff format "$file_path" >/dev/null 2>&1 || true
  ruff check --fix --exit-zero "$file_path" >/dev/null 2>&1 || true
fi
