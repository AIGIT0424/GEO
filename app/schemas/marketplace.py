import uuid

from pydantic import BaseModel


class MarketplaceInfo(BaseModel):
    marketplace_id: str
    name: str
    region: str
    currency: str
    locale: str


class UserMarketplaceCreate(BaseModel):
    marketplace_id: str
    is_default: bool = False


class UserMarketplaceRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    marketplace_id: str
    name: str
    region: str
    currency: str
    is_default: bool


class UserMarketplaceSetDefault(BaseModel):
    marketplace_id: str
