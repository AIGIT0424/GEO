# Security Rules (GEO)

## Secrets

- All secrets via `app.core.config.settings` (pydantic-settings loads from env / .env).
- **Never** hardcode API keys, tokens, or passwords in source.
- **Never** log full access tokens, refresh tokens, or JWTs. Mask to last 4 chars.
- `.env` is gitignored; `.env.example` is the template.

## User input

- All request bodies are validated by Pydantic schemas. Do not use raw `dict` types.
- All query parameters use `Query()` with explicit bounds for numbers and `pattern=` for strings.
- File uploads: validate content-type and size before reading into memory.

## Database

- Use SQLAlchemy parameters only. **Never** f-string into SQL.
- Every foreign key has `ondelete=` explicitly set.
- Indexes on `user_id`, `asin`, and any column used in WHERE clauses on large tables.

## Auth

- JWT access tokens: 60 min max lifetime.
- Refresh tokens: 30 days, rotated on use.
- Passwords: bcrypt via passlib, cost factor 12.
- Authorization checks always happen at the service boundary, not the view.

## Amazon credentials

- Per-user Amazon refresh tokens stored encrypted at rest (TODO: wrap `User.amazon_refresh_token` with a Fernet column encryptor before production).
- Never include marketplace credentials in error messages returned to the client.
