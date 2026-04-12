"""Session storage manager for reading Hermes session files."""
import json
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
import aiofiles
import aiosqlite
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler


@dataclass
class SessionMetadata:
    id: str
    platform: str
    chat_id: str
    name: Optional[str]
    created_at: datetime
    updated_at: datetime
    message_count: int
    model: Optional[str]


class SessionStore:
    """Manages Hermes session data from JSONL files."""

    def __init__(self, hermes_home: Path):
        self.hermes_home = Path(hermes_home)
        self.sessions_dir = self.hermes_home / "sessions"
        self.state_db = self.hermes_home / "state.db"
        self._cache: Dict[str, dict] = {}
        self._lock = asyncio.Lock()

    async def initialize(self):
        """Initialize the store and load existing sessions."""
        await self._load_all_sessions()

    async def _load_all_sessions(self):
        """Load all session files into cache."""
        if not self.sessions_dir.exists():
            return

        for file_path in self.sessions_dir.glob("*.jsonl"):
            session_id = file_path.stem
            try:
                session_data = await self._parse_session_file(file_path)
                async with self._lock:
                    self._cache[session_id] = session_data
            except Exception as e:
                print(f"Error loading session {session_id}: {e}")

    async def _parse_session_file(self, file_path: Path) -> dict:
        """Parse a JSONL session file."""
        messages = []
        metadata = {
            "id": file_path.stem,
            "platform": "unknown",
            "chat_id": "",
            "name": None,
            "created_at": datetime.fromtimestamp(file_path.stat().st_ctime),
            "updated_at": datetime.fromtimestamp(file_path.stat().st_mtime),
            "message_count": 0,
            "model": None,
            "token_usage": {"input": 0, "output": 0},
        }

        if not file_path.exists():
            return {"info": metadata, "messages": messages}

        try:
            async with aiofiles.open(file_path, 'r') as f:
                content = await f.read()

            for line in content.strip().split('\n'):
                if not line:
                    continue

                try:
                    msg = json.loads(line)

                    # Extract metadata from session_meta
                    if msg.get("role") == "session_meta":
                        metadata["platform"] = msg.get("platform", "unknown")
                        metadata["chat_id"] = msg.get("chat_id", "")
                        metadata["name"] = msg.get("session_name")
                        metadata["model"] = msg.get("model")
                        continue

                    # Parse regular messages
                    if "role" in msg and msg["role"] in ["user", "assistant", "system", "tool"]:
                        parsed_msg = self._parse_message(msg)
                        if parsed_msg:
                            messages.append(parsed_msg)

                    # Extract token usage
                    if "usage" in msg:
                        usage = msg["usage"]
                        if isinstance(usage, dict):
                            metadata["token_usage"]["input"] += usage.get("input_tokens", 0)
                            metadata["token_usage"]["output"] += usage.get("output_tokens", 0)

                except json.JSONDecodeError:
                    continue

        except Exception as e:
            print(f"Error reading {file_path}: {e}")

        metadata["message_count"] = len(messages)
        return {"info": metadata, "messages": messages}

    def _parse_message(self, msg: dict) -> Optional[dict]:
        """Parse a single message from JSONL format."""
        role = msg.get("role")
        content = ""
        tool_calls = []
        thinking = None
        image_urls = []

        # Extract content
        if isinstance(msg.get("content"), str):
            content = msg["content"]
        elif isinstance(msg.get("content"), list):
            for item in msg["content"]:
                if isinstance(item, dict):
                    if item.get("type") == "text":
                        content += item.get("text", "")
                    elif item.get("type") == "image_url":
                        image_url = item.get("image_url", {}).get("url", "")
                        if image_url:
                            image_urls.append(image_url)

        # Extract thinking/reasoning
        if "thinking" in msg:
            thinking = msg["thinking"]
        elif "reasoning_content" in msg:
            thinking = msg["reasoning_content"]

        # Extract tool calls
        if "tool_calls" in msg:
            for tc in msg["tool_calls"]:
                tool_calls.append({
                    "id": tc.get("id", ""),
                    "name": tc.get("function", {}).get("name", ""),
                    "arguments": json.loads(tc.get("function", {}).get("arguments", "{}")),
                    "result": None,
                    "status": "pending"
                })

        # Extract tool results
        if role == "tool" and "tool_call_id" in msg:
            tool_calls.append({
                "id": msg["tool_call_id"],
                "name": "result",
                "arguments": {},
                "result": content,
                "status": "completed"
            })

        return {
            "id": msg.get("id", ""),
            "role": role,
            "content": content,
            "timestamp": msg.get("timestamp", datetime.now().isoformat()),
            "tool_calls": tool_calls,
            "thinking": thinking,
            "image_urls": image_urls,
            "model": msg.get("model")
        }

    async def get_sessions(self) -> List[dict]:
        """Get list of all sessions."""
        async with self._lock:
            return [data["info"] for data in self._cache.values()]

    async def get_session(self, session_id: str) -> Optional[dict]:
        """Get full session details including messages."""
        # Refresh from file to get latest
        file_path = self.sessions_dir / f"{session_id}.jsonl"
        if file_path.exists():
            session_data = await self._parse_session_file(file_path)
            async with self._lock:
                self._cache[session_id] = session_data
            return session_data

        async with self._lock:
            return self._cache.get(session_id)

    async def create_session(self, platform: str = "api", name: Optional[str] = None) -> dict:
        """Create a new session."""
        from uuid import uuid4

        session_id = f"{datetime.now().strftime('%Y%m%d')}_{uuid4().hex[:8]}"
        timestamp = datetime.now()

        metadata = {
            "id": session_id,
            "platform": platform,
            "chat_id": f"dashboard:{session_id}",
            "name": name or f"Session {session_id[:8]}",
            "created_at": timestamp,
            "updated_at": timestamp,
            "message_count": 0,
            "model": None,
            "token_usage": {"input": 0, "output": 0},
        }

        session_data = {"info": metadata, "messages": []}

        async with self._lock:
            self._cache[session_id] = session_data

        # Write initial session file
        file_path = self.sessions_dir / f"{session_id}.jsonl"
        session_meta = {
            "role": "session_meta",
            "platform": platform,
            "chat_id": metadata["chat_id"],
            "session_name": name,
            "timestamp": timestamp.isoformat()
        }

        async with aiofiles.open(file_path, 'w') as f:
            await f.write(json.dumps(session_meta, default=str) + '\n')

        return session_data

    async def delete_session(self, session_id: str) -> bool:
        """Delete a session."""
        file_path = self.sessions_dir / f"{session_id}.jsonl"

        try:
            if file_path.exists():
                file_path.unlink()
            async with self._lock:
                self._cache.pop(session_id, None)
            return True
        except Exception:
            return False
