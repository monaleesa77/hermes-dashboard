"""HTTP client for communicating with Hermes API Server."""
import json
import asyncio
import aiohttp
from typing import AsyncGenerator, Dict, Any, Optional
from datetime import datetime

from config_loader import get_config


class HermesClient:
    """Client for Hermes API Server (OpenAI-compatible)."""

    def __init__(self, base_url: str = "http://localhost:8642", api_key: str = "any"):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        self._config = get_config()

    def _default_model(self) -> str:
        return self._config.default_model

    async def chat_completion(
        self,
        messages: list,
        model: Optional[str] = None,
        stream: bool = True,
        session_id: Optional[str] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Send chat completion request with streaming."""
        model = model or self._default_model()

        payload = {
            "model": model,
            "messages": messages,
            "stream": stream,
        }

        # Add session continuity header if provided
        headers = self.headers.copy()
        if session_id:
            headers["X-Hermes-Session-Id"] = session_id

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/v1/chat/completions",
                headers=headers,
                json=payload,
            ) as response:
                if stream:
                    async for line in response.content:
                        line = line.decode('utf-8').strip()
                        if line.startswith('data: '):
                            data = line[6:]
                            if data == '[DONE]':
                                break
                            try:
                                yield json.loads(data)
                            except json.JSONDecodeError:
                                continue
                else:
                    data = await response.json()
                    yield data

    async def send_message(
        self,
        content: str,
        session_id: Optional[str] = None,
        platform: str = "api",
        image: Optional[str] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Send a simple message and get streaming response."""

        messages = []

        # Build message content
        if image:
            message_content = [
                {"type": "text", "text": content},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image}"}}
            ]
        else:
            message_content = content

        messages.append({
            "role": "user",
            "content": message_content
        })

        async for event in self.chat_completion(messages, stream=True, session_id=session_id):
            yield event

    async def get_models(self) -> list:
        """Get list of available models from gateway."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/v1/models",
                    headers=self.headers,
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return data.get("data", [])
                    # 401/404/其他 → 降级：不返回假数据
                    return []
        except Exception:
            return []

    async def health_check(self) -> Dict[str, Any]:
        """Check if Hermes API is healthy."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/health",
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as response:
                    return {
                        "healthy": response.status == 200,
                        "status": response.status,
                    }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
            }

    async def create_run(self, messages: list, model: Optional[str] = None) -> str:
        """Create a new run and return run_id for SSE events."""
        model = model or self._default_model()
        payload = {
            "model": model,
            "messages": messages,
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/v1/runs",
                headers=self.headers,
                json=payload,
            ) as response:
                data = await response.json()
                return data.get("run_id", "")

    async def get_run_events(self, run_id: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Get SSE events for a run."""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.base_url}/v1/runs/{run_id}/events",
                headers=self.headers,
            ) as response:
                async for line in response.content:
                    line = line.decode('utf-8').strip()
                    if line.startswith('data: '):
                        data = line[6:]
                        try:
                            yield json.loads(data)
                        except json.JSONDecodeError:
                            continue
