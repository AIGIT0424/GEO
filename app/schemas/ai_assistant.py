from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str  # user | assistant
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    context: dict | None = None  # optional product/campaign context


class ChatResponse(BaseModel):
    message: str
    suggestions: list[str] = []
    related_actions: list[str] = []
