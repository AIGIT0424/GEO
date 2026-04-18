"""Amazon LWA OAuth2 authorization flow.

Flow:
  1. GET  /amazon/oauth/url    → redirect user to Amazon consent screen
  2. Amazon redirects back to  /amazon/oauth/callback?code=…&state=…
  3. We exchange the code for tokens and persist the refresh_token on the User.
"""

import secrets
import urllib.parse

import httpx

from app.core.config import settings

_LWA_AUTH_URL = "https://www.amazon.com/ap/oa"
_LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token"

# Scopes required for SP-API + Advertising API access
_SCOPES = "sellingpartnerapi::orders sellingpartnerapi::catalog sellingpartnerapi::reports advertising::campaign_management"


def build_authorization_url(state: str) -> str:
    """Return the Amazon LWA consent-screen URL for this OAuth session."""
    params = {
        "application_id": settings.amazon_lwa_app_id,
        "state": state,
        "redirect_uri": settings.amazon_oauth_redirect_uri,
        "version": "beta",
    }
    return f"{_LWA_AUTH_URL}?{urllib.parse.urlencode(params)}"


def generate_state() -> str:
    return secrets.token_urlsafe(32)


async def exchange_code_for_tokens(code: str) -> dict:
    """Exchange the authorization code returned by Amazon for access + refresh tokens."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            _LWA_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.amazon_oauth_redirect_uri,
                "client_id": settings.amazon_lwa_app_id,
                "client_secret": settings.amazon_lwa_client_secret,
            },
        )
        resp.raise_for_status()
        return resp.json()


async def refresh_access_token(refresh_token: str) -> str:
    """Exchange a refresh token for a fresh access token."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            _LWA_TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": settings.amazon_lwa_app_id,
                "client_secret": settings.amazon_lwa_client_secret,
            },
        )
        resp.raise_for_status()
        return resp.json()["access_token"]
