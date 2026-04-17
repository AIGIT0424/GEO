#!/usr/bin/env bash
# Stop hook: run a lightweight quality gate when a session ends.
# Non-blocking: informational output only, never fails the session.
set -uo pipefail

if ! command -v ruff >/dev/null 2>&1; then
  exit 0
fi

# Only run on files that changed since HEAD
changed=$(git diff --name-only --diff-filter=ACMR HEAD -- '*.py' 2>/dev/null || true)
if [[ -z "$changed" ]]; then
  exit 0
fi

echo "::quality-gate:: running ruff on changed Python files"
ruff check $changed || true
ruff format --check $changed || true
exit 0
