"""Amazon OAuth endpoints.

GET  /amazon/oauth/url      → returns the consent-screen URL + a state token
GET  /amazon/oauth/callback → Amazon redirects here after user approval
"""

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models.user import User
from app.services.amazon import oauth as amazon_oauth

router = APIRouter(prefix="/amazon", tags=["amazon-oauth"])

_STATE_TTL = 600  # seconds — expire OAuth state after 10 min


def _redis() -> aioredis.Redis:
    return aioredis.from_url(settings.redis_url, decode_responses=True)


@router.get("/oauth/url")
async def get_oauth_url(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Generate the Amazon LWA consent-screen URL for the current user."""
    state = amazon_oauth.generate_state()

    r = _redis()
    try:
        # Bind state → user_id so callback can look it up
        await r.setex(f"amazon_oauth_state:{state}", _STATE_TTL, str(current_user.id))
    finally:
        await r.aclose()

    return {
        "url": amazon_oauth.build_authorization_url(state),
        "state": state,
    }


@router.get("/oauth/callback")
async def oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Amazon redirects here after the user approves access.

    Exchanges the authorization code for tokens and persists the refresh_token.
    No current_user dependency — Amazon sends the user here directly.
    """
    import uuid

    r = _redis()
    try:
        user_id_str = await r.get(f"amazon_oauth_state:{state}")
        if not user_id_str:
            raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")
        await r.delete(f"amazon_oauth_state:{state}")
    finally:
        await r.aclose()

    try:
        tokens = await amazon_oauth.exchange_code_for_tokens(code)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Amazon token exchange failed: {exc}") from exc

    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=502, detail="Amazon did not return a refresh token")

    user = await db.get(User, uuid.UUID(user_id_str))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.amazon_refresh_token = refresh_token
    await db.flush()

    return {"status": "connected", "user_id": str(user.id)}


@router.delete("/oauth/disconnect")
async def disconnect_amazon(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Remove stored Amazon credentials for the current user."""
    current_user.amazon_refresh_token = None
    await db.flush()
    return {"status": "disconnected"}


@router.get("/oauth/status")
async def oauth_status(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return whether the current user has a connected Amazon account."""
    return {
        "connected": current_user.amazon_refresh_token is not None,
        "marketplace_id": current_user.amazon_marketplace_id,
    }
