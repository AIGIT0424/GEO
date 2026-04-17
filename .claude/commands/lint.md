---
description: Run ruff and mypy on the project and report issues.
---

Run the GEO lint pipeline:

1. `ruff check app/ tests/`
2. `ruff format --check app/ tests/`
3. `mypy app/`

Report findings grouped by tool. If the user asks, offer to fix auto-fixable ruff issues with `ruff check --fix`.
