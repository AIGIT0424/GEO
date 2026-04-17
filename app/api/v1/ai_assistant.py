from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.ai_assistant import ChatRequest, ChatResponse
from app.services.ai import claude_client

router = APIRouter(prefix="/assistant", tags=["ai-assistant"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
) -> ChatResponse:
    raw_messages = [{"role": m.role, "content": m.content} for m in payload.messages]
    result = await claude_client.chat(raw_messages, context=payload.context)
    return ChatResponse(**result)
