"""Pydantic models for Hermes Dashboard API."""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class MessageRole(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class ToolCall(BaseModel):
    id: str
    name: str
    arguments: Dict[str, Any]
    result: Optional[Any] = None
    status: str = "pending"  # pending, running, completed, error
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ToolResult(BaseModel):
    id: str
    tool_call_id: str
    content: str
    timestamp: Optional[str] = None


class ChatMessage(BaseModel):
    id: str
    role: MessageRole
    content: str
    timestamp: datetime
    tool_calls: List[ToolCall] = []
    tool_results: List[ToolResult] = []
    thinking: Optional[str] = None
    model: Optional[str] = None


class SessionInfo(BaseModel):
    id: str
    platform: str
    chat_id: str
    name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    is_active: bool = False
    model: Optional[str] = None


class SessionDetail(BaseModel):
    info: SessionInfo
    messages: List[ChatMessage]
    token_usage: Optional[Dict[str, Any]] = None


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    platform: str = "api"
    images: List[str] = []  # base64 encoded images


class StreamEvent(BaseModel):
    type: str  # message_start, content_block_delta, content_block_stop, message_stop, tool_call
    data: Dict[str, Any]


class ModelInfo(BaseModel):
    id: str
    name: str
    provider: str
    context_window: int
    supports_vision: bool = False
    supports_tools: bool = True


class GatewayStatus(BaseModel):
    running: bool
    pid: Optional[int] = None
    platforms: Dict[str, Any] = {}
    uptime_seconds: Optional[int] = None


class CreateSessionRequest(BaseModel):
    platform: str = "api"
    name: Optional[str] = None
