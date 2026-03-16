"""Agent Registry - Manages registration of external A2A agents and polling agents."""

from __future__ import annotations

import uuid
import secrets
from typing import Optional
from collections import defaultdict

from claw_platform.models import (
    RegisteredAgent, ProfileData, PendingMessage,
)
from claw_platform.a2a_client import fetch_agent_card, ping_agent
from claw_platform.event_bus import event_bus


class AgentRegistry:
    def __init__(self):
        self.agents: dict[str, RegisteredAgent] = {}
        # For polling-based agents: pending messages and response futures
        self.pending_messages: dict[str, list[PendingMessage]] = defaultdict(list)
        self.responses: dict[str, str] = {}  # message_id -> response text
        self._response_events: dict[str, object] = {}  # message_id -> asyncio.Event

    # ── A2A Registration (agent has own server) ────────────

    async def register_a2a(self, agent_url: str) -> RegisteredAgent:
        """Register an external agent by fetching its Agent Card."""
        agent_url = agent_url.rstrip("/")

        for agent in self.agents.values():
            if agent.agent_url == agent_url:
                return agent

        try:
            card = await fetch_agent_card(agent_url)
        except Exception as e:
            raise ValueError(
                f"Could not fetch Agent Card from {agent_url}/.well-known/agent.json — "
                f"Make sure your A2A agent is running and accessible. Error: {e}"
            )

        agent = self._parse_agent_card(agent_url, card)
        agent.mode = "a2a"
        self.agents[agent.id] = agent

        print(f"  {agent.avatar_emoji} Registered (A2A): {agent.name} ({agent.agent_url})")
        await event_bus.broadcast("registration", agent.dict())
        return agent

    # ── Profile Registration (polling-based, e.g., OpenClaw SKILL.md) ──

    async def register_with_profile(
        self, name: str, profile: ProfileData, callback_url: Optional[str] = None
    ) -> RegisteredAgent:
        """Register a polling-based agent with a profile (no A2A server needed)."""
        agent_id = f"agent-{uuid.uuid4().hex[:8]}"
        token = secrets.token_hex(24)

        agent = RegisteredAgent(
            id=agent_id,
            agent_url=callback_url or "",
            agent_card={},
            name=name,
            description=f"{name} - {profile.personality_type}. {profile.catchphrase}",
            avatar_emoji=profile.avatar_emoji,
            personality_type=profile.personality_type,
            interests=profile.interests,
            catchphrase=profile.catchphrase,
            love_language=profile.love_language,
            name_cn=profile.name_cn,
            mode="polling" if not callback_url else "a2a",
            agent_token=token,
        )
        self.agents[agent.id] = agent

        print(f"  {agent.avatar_emoji} Registered (polling): {agent.name}")
        await event_bus.broadcast("registration", agent.dict())
        return agent

    # ── Polling message queue ──────────────────────────────

    def enqueue_message(self, agent_id: str, message: PendingMessage):
        """Add a message to a polling agent's queue."""
        self.pending_messages[agent_id].append(message)

    def get_pending_messages(self, agent_id: str) -> list[PendingMessage]:
        """Get pending messages (does NOT clear — messages removed on response)."""
        return list(self.pending_messages.get(agent_id, []))

    def submit_response(self, message_id: str, response_text: str):
        """Submit a response and remove the message from queue."""
        import asyncio
        # Remove from pending queue
        for agent_id, msgs in self.pending_messages.items():
            self.pending_messages[agent_id] = [m for m in msgs if m.message_id != message_id]
        # Set response
        self.responses[message_id] = response_text
        event = self._response_events.get(message_id)
        if event and isinstance(event, asyncio.Event):
            event.set()

    async def wait_for_response(self, message_id: str, timeout: float = 60) -> Optional[str]:
        """Wait for a polling agent to respond."""
        import asyncio
        event = asyncio.Event()
        self._response_events[message_id] = event

        try:
            await asyncio.wait_for(event.wait(), timeout=timeout)
            return self.responses.pop(message_id, None)
        except asyncio.TimeoutError:
            return None
        finally:
            self._response_events.pop(message_id, None)

    # ── Shared helpers ─────────────────────────────────────

    def _parse_agent_card(self, agent_url: str, card: dict) -> RegisteredAgent:
        agent_id = card.get("id", str(uuid.uuid4()))
        metadata = card.get("metadata", {})
        interests = metadata.get("interests", [])
        if not interests:
            for skill in card.get("skills", []):
                interests.extend(skill.get("tags", []))
        return RegisteredAgent(
            id=agent_id,
            agent_url=agent_url,
            agent_card=card,
            name=card.get("name", "Unknown Agent"),
            description=card.get("description", ""),
            avatar_emoji=metadata.get("avatar_emoji", "🦞"),
            personality_type=metadata.get("personality_type", ""),
            interests=interests,
            catchphrase=metadata.get("catchphrase", ""),
            love_language=metadata.get("love_language", ""),
            name_cn=metadata.get("name_cn", ""),
        )

    async def unregister(self, agent_id: str) -> bool:
        if agent_id in self.agents:
            self.agents.pop(agent_id)
            await event_bus.broadcast("unregistration", {"id": agent_id})
            return True
        return False

    async def ping(self, agent_id: str) -> bool:
        agent = self.agents.get(agent_id)
        if not agent:
            return False
        if agent.mode == "polling":
            return True  # Polling agents are considered online
        online = await ping_agent(agent.agent_url)
        agent.status = "online" if online else "offline"
        await event_bus.broadcast("agent_status", {"id": agent_id, "status": agent.status})
        return online

    def verify_token(self, agent_id: str, token: str) -> bool:
        agent = self.agents.get(agent_id)
        return agent is not None and agent.agent_token == token

    def get_all(self) -> list[RegisteredAgent]:
        return list(self.agents.values())

    def get(self, agent_id: str) -> Optional[RegisteredAgent]:
        return self.agents.get(agent_id)

    def count(self) -> int:
        return len(self.agents)


registry = AgentRegistry()
