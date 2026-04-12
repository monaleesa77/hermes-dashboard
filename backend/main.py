"""Main FastAPI application for Hermes Dashboard Bridge Server."""
import os
import json
import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings

from models import (
    SessionInfo, SessionDetail, ChatRequest, ChatMessage,
    CreateSessionRequest, GatewayStatus, ModelInfo
)
from session_store import SessionStore
from hermes_client import HermesClient


class Settings(BaseSettings):
    bridge_host: str = "0.0.0.0"
    bridge_port: int = 8643
    hermes_api_url: str = "http://localhost:8642"
    hermes_api_key: str = "any"
    hermes_home: str = str(Path.home() / ".hermes")
    cors_origins: str = "http://localhost:3000,https://localhost:3000"
    # HTTPS Configuration
    use_https: bool = False
    ssl_key_file: str = "certs/key.pem"
    ssl_cert_file: str = "certs/cert.pem"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# Global state
session_store: Optional[SessionStore] = None
hermes_client: Optional[HermesClient] = None
active_connections: Dict[str, WebSocket] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global session_store, hermes_client

    # Startup
    print(f"🚀 Initializing Bridge Server...")
    print(f"   Hermes Home: {settings.hermes_home}")
    print(f"   Hermes API: {settings.hermes_api_url}")

    session_store = SessionStore(settings.hermes_home)
    await session_store.initialize()

    hermes_client = HermesClient(
        base_url=settings.hermes_api_url,
        api_key=settings.hermes_api_key,
    )

    # Check Hermes health
    health = await hermes_client.health_check()
    if health.get("healthy"):
        print("   ✅ Hermes API is healthy")
    else:
        print(f"   ⚠️  Hermes API not available: {health.get('error')}")

    print(f"   ✅ Bridge Server ready on http://{settings.bridge_host}:{settings.bridge_port}")

    yield

    # Shutdown
    print("\n🛑 Shutting down Bridge Server...")


app = FastAPI(
    title="Hermes Dashboard Bridge",
    description="Bridge server for Hermes Dashboard",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
origins = settings.cors_origins.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# File Upload
# =============================================================================

import base64
from fastapi import File, UploadFile

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file and return base64 encoded data."""
    try:
        # Read file content
        content = await file.read()

        # Get MIME type
        mime_type = file.content_type or "application/octet-stream"

        # Convert to base64
        base64_data = base64.b64encode(content).decode('utf-8')

        return {
            "success": True,
            "filename": file.filename,
            "mime_type": mime_type,
            "size": len(content),
            "data": f"data:{mime_type};base64,{base64_data}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


# =============================================================================
# REST API Endpoints
# =============================================================================

@app.get("/api/health")
async def health():
    """Health check endpoint."""
    hermes_health = await hermes_client.health_check() if hermes_client else {"healthy": False}
    return {
        "status": "healthy",
        "hermes_connected": hermes_health.get("healthy", False),
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/api/sessions", response_model=List[SessionInfo])
async def list_sessions():
    """List all sessions."""
    sessions = await session_store.get_sessions()
    return [SessionInfo(**s) for s in sessions]


@app.post("/api/sessions", response_model=SessionDetail)
async def create_session(request: CreateSessionRequest):
    """Create a new session."""
    session_data = await session_store.create_session(
        platform=request.platform,
        name=request.name,
    )
    return SessionDetail(
        info=SessionInfo(**session_data["info"]),
        messages=[ChatMessage(**m) for m in session_data["messages"]],
    )


@app.get("/api/sessions/{session_id}", response_model=SessionDetail)
async def get_session(session_id: str):
    """Get session details."""
    session_data = await session_store.get_session(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionDetail(
        info=SessionInfo(**session_data["info"]),
        messages=[ChatMessage(**m) for m in session_data["messages"]],
    )


@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session."""
    success = await session_store.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "deleted", "session_id": session_id}


@app.get("/api/models", response_model=List[ModelInfo])
async def list_models():
    """List available models."""
    models = await hermes_client.get_models() if hermes_client else []
    return [
        ModelInfo(
            id=m.get("id", ""),
            name=m.get("id", "").replace("-", " ").title(),
            provider="hermes",
            context_window=200000,
            supports_vision=True,
            supports_tools=True,
        )
        for m in models
    ]


@app.get("/api/gateway/status", response_model=GatewayStatus)
async def gateway_status():
    """Get Hermes gateway status."""
    health = await hermes_client.health_check() if hermes_client else {"healthy": False}

    # Try to read gateway state file
    gateway_state_path = Path(settings.hermes_home) / "gateway_state.json"
    state_data = {}
    if gateway_state_path.exists():
        try:
            with open(gateway_state_path) as f:
                state_data = json.load(f)
        except Exception:
            pass

    return GatewayStatus(
        running=health.get("healthy", False),
        pid=state_data.get("pid"),
        platforms=state_data.get("platforms", {}),
    )


# =============================================================================
# WebSocket Endpoints
# =============================================================================

@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """WebSocket endpoint for real-time chat."""
    await websocket.accept()
    client_id = str(id(websocket))
    active_connections[client_id] = websocket

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            request = ChatRequest(**data)

            # Process images if provided
            images = data.get('images', [])

            # Send acknowledgment
            await websocket.send_json({
                "type": "message_received",
                "timestamp": datetime.now().isoformat(),
            })

            # Stream response from Hermes
            # Build message content with images if provided
            content = request.message

            # If message is empty but we have images, use a placeholder
            if not content and request.images:
                content = "Analyze this image"

            # Add image references to content if present
            if request.images:
                image_descriptions = []
                for i, img in enumerate(request.images, 1):
                    if img.startswith('data:'):
                        # Extract mime type
                        mime = img.split(';')[0].split(':')[1]
                        image_descriptions.append(f"[Image {i}: {mime}]")
                    else:
                        image_descriptions.append(f"[Image {i}]")
                if image_descriptions:
                    content = f"{content}\n\n{' '.join(image_descriptions)}"

            messages = [{"role": "user", "content": content}]

            async for event in hermes_client.chat_completion(
                messages=messages,
                stream=True,
                session_id=request.session_id,
            ):
                # Parse and forward events
                delta = event.get("choices", [{}])[0].get("delta", {})
                finish_reason = event.get("choices", [{}])[0].get("finish_reason")

                if delta.get("content"):
                    await websocket.send_json({
                        "type": "content_delta",
                        "content": delta["content"],
                    })

                if delta.get("tool_calls"):
                    await websocket.send_json({
                        "type": "tool_call",
                        "tool_calls": delta["tool_calls"],
                    })

                if finish_reason:
                    await websocket.send_json({
                        "type": "message_complete",
                        "finish_reason": finish_reason,
                    })

    except WebSocketDisconnect:
        active_connections.pop(client_id, None)
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "error": str(e),
        })
        active_connections.pop(client_id, None)


if __name__ == "__main__":
    import uvicorn
    from pathlib import Path

    # HTTPS configuration
    ssl_keyfile = None
    ssl_certfile = None

    if settings.use_https:
        cert_dir = Path(__file__).parent / "certs"
        key_file = cert_dir / "key.pem"
        cert_file = cert_dir / "cert.pem"

        if key_file.exists() and cert_file.exists():
            ssl_keyfile = str(key_file)
            ssl_certfile = str(cert_file)
            print(f"🔒 HTTPS enabled")
            print(f"   Key: {ssl_keyfile}")
            print(f"   Cert: {ssl_certfile}")
        else:
            print("⚠️  HTTPS enabled but certificates not found. Run ./generate-ssl.sh first")
            print("   Falling back to HTTP")

    uvicorn.run(
        "main:app",
        host=settings.bridge_host,
        port=settings.bridge_port,
        reload=True,
        ssl_keyfile=ssl_keyfile,
        ssl_certfile=ssl_certfile,
    )
