"""A2A Client - Sends messages to external A2A agents via JSON-RPC."""

from __future__ import annotations

import uuid
import json
from typing import Optional

import httpx

from claw_platform.config import A2A_MESSAGE_TIMEOUT, AGENT_CARD_FETCH_TIMEOUT


async def fetch_agent_card(agent_url: str) -> dict:
    """Fetch an agent's Agent Card from /.well-known/agent.json"""
    url = f"{agent_url.rstrip('/')}/.well-known/agent.json"
    async with httpx.AsyncClient(timeout=AGENT_CARD_FETCH_TIMEOUT) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()


async def send_message(
    agent_url: str,
    text: str,
    context_id: Optional[str] = None,
    task_id: Optional[str] = None,
) -> str:
    """Send a message to an A2A agent and return the text response."""
    if task_id is None:
        task_id = str(uuid.uuid4())
    if context_id is None:
        context_id = str(uuid.uuid4())

    a2a_url = f"{agent_url.rstrip('/')}/a2a"
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tasks/send",
        "params": {
            "taskId": task_id,
            "contextId": context_id,
            "message": {
                "role": "user",
                "parts": [{"text": text}],
            },
        },
    }

    async with httpx.AsyncClient(timeout=A2A_MESSAGE_TIMEOUT) as client:
        resp = await client.post(a2a_url, json=payload)
        data = resp.json()

    # Handle JSON-RPC error
    if "error" in data:
        error_msg = data["error"].get("message", "Unknown error")
        raise RuntimeError(f"A2A error from {agent_url}: {error_msg}")

    # Extract text from A2A response artifacts
    result = data.get("result", {})
    artifacts = result.get("artifacts", [])
    if artifacts:
        parts = artifacts[0].get("parts", [])
        if parts:
            return parts[0].get("text", "...")

    # Fallback: try to get from message
    messages = result.get("messages", [])
    if messages:
        parts = messages[-1].get("parts", [])
        if parts:
            return parts[0].get("text", "...")

    return "..."


async def ping_agent(agent_url: str) -> bool:
    """Check if an agent is reachable by fetching its Agent Card."""
    try:
        await fetch_agent_card(agent_url)
        return True
    except Exception:
        return False
