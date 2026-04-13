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

        # First load Hermes Gateway format (has complete messages)
        hermes_sessions = {}
        for file_path in self.sessions_dir.glob("session_*.json"):
            session_id = file_path.stem.replace("session_", "")
            try:
                session_data = await self._parse_hermes_json(file_path)
                hermes_sessions[session_id] = session_data
                async with self._lock:
                    self._cache[session_id] = session_data
            except Exception as e:
                print(f"Error loading Hermes session {session_id}: {e}")

        # Then load Dashboard format (.jsonl) and merge metadata
        for file_path in self.sessions_dir.glob("*.jsonl"):
            session_id = file_path.stem
            try:
                if session_id in hermes_sessions:
                    # Already loaded from Hermes format, just update metadata
                    async with self._lock:
                        cached = self._cache.get(session_id)
                        if cached:
                            jsonl_data = await self._parse_session_file(file_path)
                            cached["info"] = jsonl_data["info"]
                else:
                    # No Hermes format, use JSONL only
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

        tool_messages = []
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

                    # Collect tool messages, parse others
                    if msg.get("role") == "tool":
                        tool_messages.append(msg)
                    elif "role" in msg and msg["role"] in ["user", "assistant", "system"]:
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

        messages = self._attach_tool_results(messages, tool_messages)
        metadata["message_count"] = len(messages)
        return {"info": metadata, "messages": messages}

    async def _parse_hermes_json(self, file_path: Path) -> dict:
        """Parse Hermes Gateway's session_*.json format."""
        import json

        messages = []
        metadata = {
            "id": file_path.stem.replace("session_", ""),  # Remove 'session_' prefix
            "platform": "unknown",
            "chat_id": "",
            "name": None,
            "created_at": datetime.fromtimestamp(file_path.stat().st_ctime),
            "updated_at": datetime.fromtimestamp(file_path.stat().st_mtime),
            "message_count": 0,
            "model": None,
            "token_usage": {"input": 0, "output": 0},
        }

        try:
            async with aiofiles.open(file_path, 'r') as f:
                content = await f.read()
            data = json.loads(content)

            # Extract metadata from Hermes format
            metadata["id"] = data.get("session_id", metadata["id"])
            metadata["platform"] = data.get("platform", "unknown")
            metadata["chat_id"] = f"hermes:{metadata['id']}"
            metadata["model"] = data.get("model")
            metadata["name"] = f"Session {metadata['id'][:8]}"

            # Update timestamps
            if data.get("session_start"):
                metadata["created_at"] = datetime.fromisoformat(data["session_start"].replace("Z", "+00:00"))
            if data.get("last_updated"):
                metadata["updated_at"] = datetime.fromisoformat(data["last_updated"].replace("Z", "+00:00"))

            # Parse messages, collecting tool messages separately
            tool_messages = []
            for msg in data.get("messages", []):
                if msg.get("role") == "tool":
                    tool_messages.append(msg)
                else:
                    parsed_msg = self._parse_message(msg)
                    if parsed_msg:
                        messages.append(parsed_msg)

            # Attach standalone tool results to their parent assistant messages
            messages = self._attach_tool_results(messages, tool_messages)

            metadata["message_count"] = len(messages)

        except Exception as e:
            print(f"Error parsing Hermes JSON {file_path}: {e}")

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

        # Standalone tool result messages are handled separately by _attach_tool_results
        if role == "tool":
            return None

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

    def _attach_tool_results(self, messages: list, tool_messages: Optional[list] = None) -> list:
        """Attach standalone role=tool messages as tool_results on their parent assistant messages."""
        # Build tool_results_map from passed-in tool_messages
        tool_results_map: dict = {}
        if tool_messages:
            for msg in tool_messages:
                if msg.get("tool_call_id"):
                    tool_results_map[msg["tool_call_id"]] = {
                        "id": msg.get("id", ""),
                        "tool_call_id": msg["tool_call_id"],
                        "content": msg.get("content", ""),
                        "timestamp": msg.get("timestamp", ""),
                    }

        # Attach tool results to assistant messages that initiated the calls
        for msg in messages:
            if msg.get("role") == "assistant" and msg.get("tool_calls"):
                attached_results = []
                for tc in msg["tool_calls"]:
                    tc_id = tc.get("id")
                    if tc_id in tool_results_map:
                        tc["result"] = tool_results_map[tc_id]["content"]
                        tc["status"] = "completed"
                        attached_results.append(tool_results_map[tc_id])
                        del tool_results_map[tc_id]
                if attached_results:
                    msg["tool_results"] = attached_results

        return messages

    async def get_sessions(self) -> List[dict]:
        """Get list of all sessions - always re-scan from disk, sorted by newest first."""
        # Always re-scan to catch new sessions created by Hermes Gateway
        await self._load_all_sessions()
        async with self._lock:
            sessions = [data["info"] for data in self._cache.values()]
            # Sort by created_at descending (newest first)
            sessions.sort(key=lambda s: s.get("created_at", ""), reverse=True)
            return sessions

    async def get_session(self, session_id: str) -> Optional[dict]:
        """Get full session details - always read fresh from disk."""
        # Always re-scan to get latest messages from Hermes Gateway
        await self._load_all_sessions()

        # Try Hermes Gateway format first (has complete messages)
        hermes_file = self.sessions_dir / f"session_{session_id}.json"
        if hermes_file.exists():
            session_data = await self._parse_hermes_json(hermes_file)
            # Merge metadata from .jsonl if exists
            jsonl_file = self.sessions_dir / f"{session_id}.jsonl"
            if jsonl_file.exists():
                meta = await self._parse_session_file(jsonl_file)
                session_data["info"] = meta["info"]
            async with self._lock:
                self._cache[session_id] = session_data
            return session_data

        # Fallback to .jsonl format
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
