"""Amazon Advertising API client."""
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings


class AmazonAdsClient:
    """Client for Amazon Sponsored Products / Brands / Display advertising API."""

    LWA_URL = "https://api.amazon.com/auth/o2/token"
    ADS_API_BASE = "https://advertising-api.amazon.com"

    def __init__(self, profile_id: str | None = None) -> None:
        self.profile_id = profile_id or settings.amazon_ads_profile_id
        self._access_token: str | None = None

    async def _get_access_token(self) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self.LWA_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": settings.amazon_ads_refresh_token,
                    "client_id": settings.amazon_ads_client_id,
                    "client_secret": settings.amazon_ads_client_secret,
                },
            )
            resp.raise_for_status()
            self._access_token = resp.json()["access_token"]
            return self._access_token

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def _request(self, method: str, path: str, **kwargs) -> dict:
        if not self._access_token:
            await self._get_access_token()
        headers = {
            "Amazon-Advertising-API-ClientId": settings.amazon_ads_client_id,
            "Amazon-Advertising-API-Scope": self.profile_id,
            "Authorization": f"Bearer {self._access_token}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient() as client:
            resp = await client.request(
                method, f"{self.ADS_API_BASE}{path}", headers=headers, **kwargs
            )
            resp.raise_for_status()
            return resp.json()

    async def list_campaigns(self, campaign_type: str = "sponsoredProducts") -> list[dict]:
        data = await self._request("GET", f"/v2/{campaign_type}/campaigns")
        return data if isinstance(data, list) else data.get("campaigns", [])

    async def get_campaign_metrics(self, report_request: dict) -> dict:
        return await self._request("POST", "/reporting/reports", json=report_request)

    async def update_keyword_bid(
        self, ad_group_id: str, keyword_id: str, bid: float
    ) -> dict:
        return await self._request(
            "PUT",
            "/v2/keywords",
            json=[{"keywordId": keyword_id, "adGroupId": ad_group_id, "bid": bid}],
        )
