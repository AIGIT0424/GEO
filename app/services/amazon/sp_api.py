"""Amazon Selling Partner API client."""
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings


class SPAPIClient:
    """Thin wrapper around Amazon SP-API REST endpoints.

    Handles LWA token refresh and request signing via SigV4.
    """

    LWA_URL = "https://api.amazon.com/auth/o2/token"
    SP_API_BASE = "https://sellingpartnerapi-na.amazon.com"

    def __init__(
        self,
        refresh_token: str | None = None,
        marketplace_id: str | None = None,
    ) -> None:
        self.refresh_token = refresh_token or settings.amazon_refresh_token
        self.marketplace_id = marketplace_id or settings.amazon_marketplace_id
        self._access_token: str | None = None

    async def _get_access_token(self) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self.LWA_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": self.refresh_token,
                    "client_id": settings.amazon_lwa_app_id,
                    "client_secret": settings.amazon_lwa_client_secret,
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
            "x-amz-access-token": self._access_token,
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient() as client:
            resp = await client.request(
                method, f"{self.SP_API_BASE}{path}", headers=headers, **kwargs
            )
            if resp.status_code == 403:
                await self._get_access_token()
                headers["x-amz-access-token"] = self._access_token
                resp = await client.request(
                    method, f"{self.SP_API_BASE}{path}", headers=headers, **kwargs
                )
            resp.raise_for_status()
            return resp.json()

    async def get_catalog_item(self, asin: str) -> dict:
        return await self._request(
            "GET",
            f"/catalog/2022-04-01/items/{asin}",
            params={"marketplaceIds": self.marketplace_id, "includedData": "summaries,attributes"},
        )

    async def search_catalog_items(self, keywords: str, page_size: int = 20) -> dict:
        return await self._request(
            "GET",
            "/catalog/2022-04-01/items",
            params={
                "keywords": keywords,
                "marketplaceIds": self.marketplace_id,
                "pageSize": page_size,
                "includedData": "summaries",
            },
        )

    async def get_competitive_pricing(self, asin: str) -> dict:
        return await self._request(
            "GET",
            f"/products/pricing/v0/competitivePrice",
            params={"Asin": asin, "MarketplaceId": self.marketplace_id, "ItemType": "Asin"},
        )
