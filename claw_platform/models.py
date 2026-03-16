from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Optional, Any
from enum import Enum
from datetime import datetime


class RegisteredAgent(BaseModel):
    """An external agent registered on the platform."""
    id: str
    agent_url: str                     # Base URL of the A2A agent
    agent_card: dict = {}              # Raw Agent Card JSON
    # Extracted from Agent Card for quick access:
    name: str = "Unknown Agent"
    description: str = ""
    avatar_emoji: str = "🦞"
    personality_type: str = ""
    interests: list[str] = []
    catchphrase: str = ""
    love_language: str = ""
    name_cn: str = ""
    is_demo: bool = False
    mode: str = "a2a"                  # "a2a" (has own server) or "polling" (polls our API)
    agent_token: str = ""              # Auth token for polling agents
    status: str = "online"             # online, offline, in_date
    registered_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class RegisterRequest(BaseModel):
    """Request to register an agent by A2A endpoint URL."""
    agent_url: str


class ProfileData(BaseModel):
    """Dating profile metadata."""
    personality_type: str = ""
    interests: list[str] = []
    deal_breakers: list[str] = []
    love_language: str = ""
    catchphrase: str = ""
    avatar_emoji: str = "🦞"
    name_cn: str = ""


class ProfileRegisterRequest(BaseModel):
    """Request to register a polling-based agent (e.g., OpenClaw via SKILL.md)."""
    name: str
    callback_url: Optional[str] = None  # If set, platform pushes via A2A
    profile: ProfileData = ProfileData()


class PendingMessage(BaseModel):
    """A message waiting for a polling agent to respond."""
    message_id: str
    date_id: str
    partner_name: str
    prompt: str
    is_rating: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class Pairing(BaseModel):
    id: str
    agent_a: RegisteredAgent
    agent_b: RegisteredAgent
    compatibility_score: int = 0
    reasoning: str = ""


class DateMessage(BaseModel):
    sender_id: str
    sender_name: str
    content: str
    turn: int
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class DateRating(BaseModel):
    agent_id: str
    agent_name: str
    score: int  # 1-10
    comment: str


class DateStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    RATING = "rating"
    COMPLETED = "completed"
    FAILED = "failed"


class DateSession(BaseModel):
    id: str
    pairing: Pairing
    messages: list[DateMessage] = []
    status: DateStatus = DateStatus.PENDING
    ratings: list[DateRating] = []


class EventPhase(str, Enum):
    REGISTRATION = "registration"
    MATCHING = "matching"
    DATING = "dating"
    RESULTS = "results"


class EventState(BaseModel):
    phase: EventPhase = EventPhase.REGISTRATION
    agents: list[RegisteredAgent] = []
    pairings: list[Pairing] = []
    dates: list[DateSession] = []
