"""A2A-compatible lobster agent server.

Each lobster runs as an independent HTTP server exposing:
- GET /.well-known/agent.json  -> Agent Card (A2A discovery)
- POST /a2a                    -> JSON-RPC endpoint (A2A messaging)
"""

from __future__ import annotations

import argparse
import json
import uuid
import asyncio
from contextlib import asynccontextmanager
from typing import Optional

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
import httpx

from agents.lobster.personalities import get_personality
from agents.lobster.llm_backend import generate_response, generate_response_stream
from common.config import ORCHESTRATOR_URL, LOBSTER_BASE_PORT
from common.models import LobsterProfile


def build_agent_card(personality: dict, port: int) -> dict:
    return {
        "id": personality["id"],
        "name": personality["name"],
        "description": f"{personality['name']} ({personality['name_cn']}) - {personality['personality_type']}. {personality['catchphrase']}",
        "provider": {"name": "Claw Dating", "url": "https://claw-dating.dev"},
        "version": "1.0.0",
        "url": f"http://localhost:{port}/a2a",
        "capabilities": {"streaming": True, "pushNotifications": False},
        "skills": [
            {
                "id": "dating_conversation",
                "name": "Dating Conversation",
                "description": "Engage in a fun, in-character dating conversation",
                "tags": personality["interests"],
            },
            {
                "id": "self_introduction",
                "name": "Self Introduction",
                "description": "Introduce yourself with personality and flair",
            },
        ],
        "metadata": {
            "personality_type": personality["personality_type"],
            "interests": personality["interests"],
            "deal_breakers": personality["deal_breakers"],
            "love_language": personality["love_language"],
            "catchphrase": personality["catchphrase"],
            "avatar_emoji": personality["avatar_emoji"],
            "name_cn": personality["name_cn"],
        },
    }


class LobsterAgent:
    def __init__(self, personality: dict, port: int):
        self.personality = personality
        self.port = port
        self.agent_card = build_agent_card(personality, port)
        self.conversations: dict[str, list[dict]] = {}  # task_id -> history

    async def handle_message(self, task_id: str, message_text: str, context_id: Optional[str] = None) -> str:
        conv_key = context_id or task_id
        if conv_key not in self.conversations:
            self.conversations[conv_key] = []

        history = self.conversations[conv_key]
        history.append({"role": "user", "content": message_text})

        # Detect if this is the first message (opening)
        is_opening = len(history) == 1
        # Extract partner name from message if present
        partner_name = "my date"
        if "partner:" in message_text.lower():
            parts = message_text.split("partner:", 1)
            if len(parts) > 1:
                partner_name = parts[1].split("\n")[0].strip()

        is_rating = "rate your date" in message_text.lower() or "评分" in message_text

        response = await generate_response(
            self.personality, history, partner_name,
            is_opening=is_opening, is_rating=is_rating,
        )
        history.append({"role": "assistant", "content": response})
        return response

    async def handle_message_stream(self, task_id: str, message_text: str, context_id: Optional[str] = None):
        conv_key = context_id or task_id
        if conv_key not in self.conversations:
            self.conversations[conv_key] = []

        history = self.conversations[conv_key]
        history.append({"role": "user", "content": message_text})
        is_opening = len(history) == 1
        partner_name = "my date"
        if "partner:" in message_text.lower():
            parts = message_text.split("partner:", 1)
            if len(parts) > 1:
                partner_name = parts[1].split("\n")[0].strip()

        full_response = ""
        async for token in generate_response_stream(
            self.personality, history, partner_name, is_opening=is_opening
        ):
            full_response += token
            yield token

        history.append({"role": "assistant", "content": full_response})


def create_app(personality_index: int, port: int) -> FastAPI:
    personality = get_personality(personality_index)
    agent = LobsterAgent(personality, port)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Register with orchestrator on startup
        asyncio.create_task(register_with_orchestrator(agent, port))
        yield

    app = FastAPI(title=f"Lobster Agent: {personality['name']}", lifespan=lifespan)

    @app.get("/.well-known/agent.json")
    async def agent_card():
        return JSONResponse(content=agent.agent_card)

    @app.post("/a2a")
    async def a2a_endpoint(request: Request):
        """JSON-RPC 2.0 endpoint for A2A protocol."""
        body = await request.json()
        method = body.get("method", "")
        params = body.get("params", {})
        req_id = body.get("id", 1)

        if method == "tasks/send":
            return await handle_send(agent, params, req_id)
        elif method == "tasks/sendSubscribe":
            return handle_send_subscribe(agent, params, req_id)
        elif method == "tasks/get":
            return jsonrpc_response(req_id, {"status": {"state": "completed"}})
        elif method == "tasks/cancel":
            return jsonrpc_response(req_id, {"status": {"state": "canceled"}})
        else:
            return jsonrpc_error(req_id, -32601, f"Method not found: {method}")

    return app


async def handle_send(agent: LobsterAgent, params: dict, req_id) -> JSONResponse:
    message = params.get("message", {})
    task_id = params.get("taskId", str(uuid.uuid4()))
    context_id = params.get("contextId")

    # Extract text from message parts
    text = ""
    for part in message.get("parts", []):
        if "text" in part:
            text += part["text"]

    if not text:
        text = message.get("text", "Hello!")

    response_text = await agent.handle_message(task_id, text, context_id)

    result = {
        "id": task_id,
        "contextId": context_id or task_id,
        "status": {"state": "completed"},
        "artifacts": [
            {
                "parts": [{"text": response_text}],
            }
        ],
    }
    return jsonrpc_response(req_id, result)


def handle_send_subscribe(agent: LobsterAgent, params: dict, req_id):
    message = params.get("message", {})
    task_id = params.get("taskId", str(uuid.uuid4()))
    context_id = params.get("contextId")

    text = ""
    for part in message.get("parts", []):
        if "text" in part:
            text += part["text"]
    if not text:
        text = message.get("text", "Hello!")

    async def event_stream():
        # Send initial status
        yield f"data: {json.dumps({'jsonrpc': '2.0', 'id': req_id, 'result': {'id': task_id, 'status': {'state': 'working'}}})}\n\n"

        full_text = ""
        async for token in agent.handle_message_stream(task_id, text, context_id):
            full_text += token
            event = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "id": task_id,
                    "status": {"state": "working"},
                    "artifacts": [{"parts": [{"text": full_text}], "append": False}],
                },
            }
            yield f"data: {json.dumps(event)}\n\n"

        # Final completed event
        final = {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "id": task_id,
                "status": {"state": "completed"},
                "artifacts": [{"parts": [{"text": full_text}]}],
            },
        }
        yield f"data: {json.dumps(final)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


async def register_with_orchestrator(agent: LobsterAgent, port: int):
    """Register this lobster agent with the central orchestrator."""
    await asyncio.sleep(1)  # Wait for server to start
    profile = LobsterProfile(
        id=agent.personality["id"],
        name=agent.personality["name"],
        name_cn=agent.personality["name_cn"],
        personality_type=agent.personality["personality_type"],
        catchphrase=agent.personality["catchphrase"],
        interests=agent.personality["interests"],
        deal_breakers=agent.personality["deal_breakers"],
        love_language=agent.personality["love_language"],
        system_prompt="",  # Don't leak system prompt
        avatar_emoji=agent.personality["avatar_emoji"],
        port=port,
        url=f"http://localhost:{port}",
    )
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{ORCHESTRATOR_URL}/api/register",
                json=profile.model_dump(),
                timeout=5,
            )
            if resp.status_code == 200:
                print(f"  Registered {agent.personality['name']} with orchestrator")
            else:
                print(f"  Failed to register: {resp.status_code}")
    except Exception as e:
        print(f"  Could not reach orchestrator: {e}")


def jsonrpc_response(req_id, result) -> JSONResponse:
    return JSONResponse({"jsonrpc": "2.0", "id": req_id, "result": result})


def jsonrpc_error(req_id, code: int, message: str) -> JSONResponse:
    return JSONResponse({"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}})


def main():
    parser = argparse.ArgumentParser(description="Launch a lobster agent")
    parser.add_argument("--index", type=int, required=True, help="Personality index (0-7)")
    parser.add_argument("--port", type=int, default=None, help="Port number")
    args = parser.parse_args()

    port = args.port or (LOBSTER_BASE_PORT + args.index)
    personality = get_personality(args.index)

    print(f"{personality['avatar_emoji']} Starting {personality['name']} on port {port}...")

    app = create_app(args.index, port)
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")


if __name__ == "__main__":
    main()
