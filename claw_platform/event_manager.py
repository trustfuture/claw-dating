"""Event Manager - Manages multiple concurrent dating events."""

from __future__ import annotations

import uuid
from typing import Optional

from claw_platform.models import EventState, EventPhase


class EventManager:
    def __init__(self):
        self.events: dict[str, EventState] = {}

    def create_event(self, name: str = "") -> EventState:
        event_id = uuid.uuid4().hex[:8]
        event = EventState(
            event_id=event_id,
            name=name or f"Event {event_id}",
        )
        self.events[event_id] = event
        return event

    def get_event(self, event_id: str) -> Optional[EventState]:
        return self.events.get(event_id)

    def get_or_create_default(self) -> EventState:
        if "default" not in self.events:
            self.events["default"] = EventState(event_id="default", name="Main Event")
        return self.events["default"]

    def list_events(self) -> list[EventState]:
        return list(self.events.values())

    def reset_event(self, event_id: str) -> Optional[EventState]:
        """Reset an event to registration phase."""
        event = self.events.get(event_id)
        if event:
            event.phase = EventPhase.REGISTRATION
            event.pairings = []
            event.dates = []
            event.mutual_matches = []
            event.current_round = 0
            event.total_rounds = 0
        return event

    def delete_event(self, event_id: str) -> bool:
        if event_id in self.events and event_id != "default":
            del self.events[event_id]
            return True
        return False


event_manager = EventManager()
