---
description: Run the project test suite with coverage.
argument-hint: "[optional pytest path or marker]"
---

Run the GEO test suite.

If the user provided arguments, run: `pytest $ARGUMENTS -v`
Otherwise, run: `pytest -v`

After tests complete:
1. Summarize pass/fail counts and overall coverage.
2. If any tests failed, list them with the first line of each error.
3. Do NOT attempt to "fix" failing tests unless the user explicitly asks.
