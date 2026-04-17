# AI Prompt Rules (GEO)

All AI prompts live in `app/services/ai/prompts.py`. Do NOT inline prompts in service code.

## Versioning

- Each prompt template has an implicit version tied to the git commit.
- When changing a production prompt, bump `prompt_version` in `ListingVariant.prompt_version` so we can trace outputs back.

## Structured output

- Always ask for JSON output with a strict schema. Parse with `json.loads()` and validate with a Pydantic schema before using.
- If the model returns malformed JSON, do NOT retry silently — fail loud and surface to the caller.

## Model selection

- Default model: `claude-sonnet-4-6` (see `app/services/ai/claude_client.py:MODEL`).
- Do not hardcode `claude-3-*` or `gpt-4` in new code; route through the client module.

## Safety

- Never include user PII (email, full name) in prompts unless the user has consented.
- Never include raw Amazon credentials or tokens in any prompt.
- Strip newlines / control characters from user-provided strings before concatenating into prompts.
