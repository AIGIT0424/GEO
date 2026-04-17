"""Anthropic Claude client for GEO AI features."""
import json

import anthropic

from app.core.config import settings
from app.services.ai import prompts

_client: anthropic.AsyncAnthropic | None = None


def get_claude_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 4096


async def optimize_listing(
    product_info: dict,
    keywords: list[str],
    language: str = "en",
    tone: str = "professional",
) -> dict:
    client = get_claude_client()
    message = await client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=prompts.LISTING_OPTIMIZATION_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": prompts.LISTING_OPTIMIZATION_USER.format(
                    product_info=json.dumps(product_info, ensure_ascii=False),
                    keywords=", ".join(keywords),
                    language=language,
                    tone=tone,
                ),
            }
        ],
    )
    return json.loads(message.content[0].text)


async def research_keywords(
    seed_keywords: list[str],
    asin: str | None,
    marketplace: str,
) -> list[dict]:
    client = get_claude_client()
    message = await client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=prompts.KEYWORD_RESEARCH_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": prompts.KEYWORD_ANALYSIS_USER.format(
                    seed_keywords=", ".join(seed_keywords),
                    asin=asin or "N/A",
                    marketplace=marketplace,
                ),
            }
        ],
    )
    return json.loads(message.content[0].text)


async def analyze_campaign(
    campaign_data: dict,
    target_acos: float,
    period_days: int,
) -> dict:
    client = get_claude_client()
    message = await client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=prompts.CAMPAIGN_ANALYSIS_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": prompts.CAMPAIGN_ANALYSIS_USER.format(
                    campaign_data=json.dumps(campaign_data),
                    target_acos=target_acos,
                    period_days=period_days,
                ),
            }
        ],
    )
    return json.loads(message.content[0].text)


async def chat(messages: list[dict], context: dict | None = None) -> dict:
    client = get_claude_client()
    system = prompts.CHAT_SYSTEM
    if context:
        system += f"\n\nCurrent context:\n{json.dumps(context, ensure_ascii=False)}"

    response = await client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=system,
        messages=messages,
    )
    return {
        "message": response.content[0].text,
        "suggestions": [],
        "related_actions": [],
    }
