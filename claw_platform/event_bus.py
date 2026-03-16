"""In-memory event bus for broadcasting real-time events to WebSocket clients."""

from __future__ import annotations

import asyncio
import json
from fastapi import WebSocket


class EventBus:
    def __init__(self):
        self.clients: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self.clients.append(ws)

    async def disconnect(self, ws: WebSocket):
        async with self._lock:
            if ws in self.clients:
                self.clients.remove(ws)

    async def broadcast(self, event_type: str, data: dict):
        message = json.dumps({"type": event_type, "data": data}, ensure_ascii=False, default=str)
        async with self._lock:
            dead = []
            for ws in self.clients:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.clients.remove(ws)


event_bus = EventBus()
