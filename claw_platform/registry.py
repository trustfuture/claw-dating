"""Agent Registry - Manages registration of external A2A agents."""

from __future__ import annotations

import uuid
from typing import Optional

from claw_platform.models import RegisteredAgent
from claw_platform.a2a_client import fetch_agent_card, ping_agent
from claw_platform.event_bus import event_bus


class AgentRegistry:
    def __init__(self):
        self.agents: dict[str, RegisteredAgent] = {}

    async def register(self, agent_url: str) -> RegisteredAgent:
        """Register an external agent by fetching its Agent Card."""
        # Normalize URL
        agent_url = agent_url.rstrip("/")

        # Check for duplicate
        for agent in self.agents.values():
            if agent.agent_url == agent_url:
                return agent

        # Fetch Agent Card
        try:
            card = await fetch_agent_card(agent_url)
        except Exception as e:
            raise ValueError(
                f"Could not fetch Agent Card from {agent_url}/.well-known/agent.json — "
                f"Make sure your A2A agent is running and accessible. Error: {e}"
            )

        # Extract profile from Agent Card
        agent = self._parse_agent_card(agent_url, card)
        self.agents[agent.id] = agent

        print(f"  {agent.avatar_emoji} Registered: {agent.name} ({agent.agent_url})")
        await event_bus.broadcast("registration", agent.dict())
        return agent

    def _parse_agent_card(self, agent_url: str, card: dict) -> RegisteredAgent:
        """Parse an A2A Agent Card into a RegisteredAgent."""
        agent_id = card.get("id", str(uuid.uuid4()))
        metadata = card.get("metadata", {})

        # Extract interests from metadata or skills tags
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
            agent = self.agents.pop(agent_id)
            await event_bus.broadcast("unregistration", {"id": agent_id})
            return True
        return False

    async def ping(self, agent_id: str) -> bool:
        agent = self.agents.get(agent_id)
        if not agent:
            return False
        online = await ping_agent(agent.agent_url)
        agent.status = "online" if online else "offline"
        await event_bus.broadcast("agent_status", {"id": agent_id, "status": agent.status})
        return online

    def get_all(self) -> list[RegisteredAgent]:
        return list(self.agents.values())

    def get(self, agent_id: str) -> Optional[RegisteredAgent]:
        return self.agents.get(agent_id)

    def count(self) -> int:
        return len(self.agents)


registry = AgentRegistry()
