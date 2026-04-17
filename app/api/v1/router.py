from fastapi import APIRouter

from app.api.v1 import (
    advertising,
    ai_assistant,
    auth,
    keywords,
    listings,
    products,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(products.router)
api_router.include_router(keywords.router)
api_router.include_router(listings.router)
api_router.include_router(advertising.router)
api_router.include_router(ai_assistant.router)
