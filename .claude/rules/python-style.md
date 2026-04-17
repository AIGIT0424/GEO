# Python Style Rules (GEO)

- **Python 3.11+** syntax throughout. Use `X | Y` union, `list[T]`, `dict[K, V]`.
- **Type hints** on every public function signature, including return types.
- **Docstrings** only where the "why" is not obvious from the name. One-line summary; no rambling.
- **Imports**: absolute imports from `app.*`. Group stdlib / third-party / local. Let `ruff` sort them.
- **String formatting**: f-strings only. No `%`-formatting or `.format()`.
- **Exceptions**: raise specific types (`ValueError`, `HTTPException`). Never `raise Exception(...)`.
- **Constants**: `UPPER_SNAKE_CASE` at module level.
- **Private helpers**: single leading underscore (`_make_token`). No double underscore for name-mangling.
- **Line length**: 100 characters (enforced by ruff).
- **Never** use bare `except:`. Catch specific exceptions.
- **Never** use mutable default arguments.
