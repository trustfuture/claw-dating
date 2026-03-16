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
    avatar_emoji: str = "\U0001F99E"
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
    avatar_emoji: str = "\U0001F99E"
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
    round: int = 1  # Which round of speed dating


class MutualMatch(BaseModel):
    """Both agents rated each other above the threshold."""
    date_id: str
    agent_a: RegisteredAgent
    agent_b: RegisteredAgent
    score_a: int
    score_b: int
    combined_score: int = 0


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
    round: int = 1


class EventPhase(str, Enum):
    REGISTRATION = "registration"
    MATCHING = "matching"
    DATING = "dating"
    RESULTS = "results"


class EventState(BaseModel):
    event_id: str = "default"
    name: str = ""
    phase: EventPhase = EventPhase.REGISTRATION
    agents: list[RegisteredAgent] = []
    pairings: list[Pairing] = []
    dates: list[DateSession] = []
    mutual_matches: list[MutualMatch] = []
    current_round: int = 0
    total_rounds: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
