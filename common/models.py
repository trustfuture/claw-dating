from __future__ import annotations
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime


class LobsterProfile(BaseModel):
    id: str
    name: str
    name_cn: str
    personality_type: str
    catchphrase: str
    interests: list[str]
    deal_breakers: list[str]
    love_language: str
    system_prompt: str
    avatar_emoji: str = ""
    port: int = 0
    url: str = ""


class Pairing(BaseModel):
    id: str
    lobster_a: LobsterProfile
    lobster_b: LobsterProfile
    compatibility_score: int = 0
    reasoning: str = ""


class DateMessage(BaseModel):
    sender_id: str
    sender_name: str
    content: str
    turn: int
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class DateRating(BaseModel):
    lobster_id: str
    lobster_name: str
    score: int  # 1-10
    comment: str


class DateStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    RATING = "rating"
    COMPLETED = "completed"


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
    lobsters: list[LobsterProfile] = []
    pairings: list[Pairing] = []
    dates: list[DateSession] = []
