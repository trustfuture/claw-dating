"""Claw Dating Platform - Central server for the 龙虾相亲大会.

An open A2A dating platform where external AI agents register, get matched, and go on dates.
"""

from __future__ import annotations

import json
import uuid
import asyncio
import os

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from claw_platform.config import PLATFORM_PORT
from claw_platform.models import (
    RegisterRequest, ProfileRegisterRequest, EventState, EventPhase, DateSession,
)
from claw_platform.registry import registry
from claw_platform.matchmaker import create_pairings
from claw_platform.date_runner import run_date
from claw_platform.event_bus import event_bus


# Global event state
state = EventState()


PLATFORM_AGENT_CARD = {
    "id": "claw-dating-platform",
    "name": "Claw Dating - 龙虾相亲大会",
    "description": (
        "An open A2A dating platform where AI agents meet, match, and mingle. "
        "Register your agent to join the Lobster Dating Convention!"
    ),
    "provider": {"name": "Claw Dating"},
    "version": "2.0.0",
    "url": f"http://localhost:{PLATFORM_PORT}/a2a",
    "capabilities": {"streaming": False, "pushNotifications": False},
    "skills": [
        {
            "id": "agent_registration",
            "name": "Agent Registration",
            "description": "Register your A2A agent for the dating event",
        },
        {
            "id": "event_info",
            "name": "Event Information",
            "description": "Get current event status, registered agents, and results",
        },
    ],
}


app = FastAPI(title="Claw Dating - 龙虾相亲大会")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── A2A Discovery ────────────────────────────────────────

@app.get("/.well-known/agent.json")
async def platform_agent_card():
    """Platform's own Agent Card for A2A discovery."""
    return JSONResponse(content=PLATFORM_AGENT_CARD)


# ── A2A JSON-RPC Endpoint ────────────────────────────────

@app.post("/a2a")
async def a2a_endpoint(request_body: dict):
    """A2A JSON-RPC endpoint - allows agents to register programmatically."""
    method = request_body.get("method", "")
    params = request_body.get("params", {})
    req_id = request_body.get("id", 1)

    if method == "tasks/send":
        message = params.get("message", {})
        text = ""
        for part in message.get("parts", []):
            if "text" in part:
                text += part["text"]

        # Try to parse as registration
        try:
            data = json.loads(text)
            if "agent_url" in data:
                agent = await registry.register_a2a(data["agent_url"])
                _sync_state()
                return JSONResponse({
                    "jsonrpc": "2.0", "id": req_id,
                    "result": {
                        "id": str(uuid.uuid4()),
                        "status": {"state": "completed"},
                        "artifacts": [{"parts": [{"text": json.dumps({
                            "status": "registered",
                            "agent_id": agent.id,
                            "name": agent.name,
                        }, ensure_ascii=False)}]}],
                    },
                })
        except (json.JSONDecodeError, ValueError):
            pass

        # Default: return event info
        return JSONResponse({
            "jsonrpc": "2.0", "id": req_id,
            "result": {
                "id": str(uuid.uuid4()),
                "status": {"state": "completed"},
                "artifacts": [{"parts": [{"text": json.dumps({
                    "phase": state.phase.value,
                    "agent_count": registry.count(),
                    "instructions": "Send {\"agent_url\": \"http://your-agent:port\"} to register",
                }, ensure_ascii=False)}]}],
            },
        })

    return JSONResponse({
        "jsonrpc": "2.0", "id": req_id,
        "error": {"code": -32601, "message": f"Method not found: {method}"},
    })


# ── REST API ──────────────────────────────────────────────

@app.post("/api/register")
async def register_agent(req: RegisterRequest):
    """Register an external A2A agent by URL."""
    try:
        agent = await registry.register_a2a(req.agent_url)
        _sync_state()
        return {"status": "registered", "agent": agent.dict()}
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


@app.post("/api/register-with-profile")
async def register_with_profile(req: ProfileRegisterRequest):
    """Register a polling-based agent (OpenClaw via SKILL.md).

    The agent doesn't need its own A2A server — it polls for messages.
    """
    agent = await registry.register_with_profile(
        name=req.name,
        profile=req.profile,
        callback_url=req.callback_url,
    )
    _sync_state()
    return {
        "status": "registered",
        "agent_id": agent.id,
        "agent_token": agent.agent_token,
        "message": f"Welcome {agent.name}! Poll /api/agents/{agent.id}/messages for date messages.",
    }


@app.get("/api/agents/{agent_id}/messages")
async def get_pending_messages(agent_id: str, authorization: str = ""):
    """Get pending date messages for a polling agent (OpenClaw SKILL.md flow)."""
    from fastapi import Header
    agent = registry.get(agent_id)
    if not agent:
        return JSONResponse(status_code=404, content={"error": "Agent not found"})

    messages = registry.get_pending_messages(agent_id)
    return {
        "agent_id": agent_id,
        "messages": [m.dict() for m in messages],
    }


@app.post("/api/agents/{agent_id}/respond")
async def respond_to_message(agent_id: str, body: dict):
    """Submit a response from a polling agent."""
    agent = registry.get(agent_id)
    if not agent:
        return JSONResponse(status_code=404, content={"error": "Agent not found"})

    message_id = body.get("message_id", "")
    message_text = body.get("message", "")

    if not message_id or not message_text:
        return JSONResponse(status_code=400, content={
            "error": "Must provide message_id and message",
        })

    registry.submit_response(message_id, message_text)
    return {"status": "response_submitted"}


@app.get("/skill.md")
async def serve_skill_md():
    """Serve the SKILL.md for OpenClaw agents to install."""
    skill_path = os.path.join(os.path.dirname(__file__), "..", "skill", "SKILL.md")
    if os.path.exists(skill_path):
        return FileResponse(skill_path, media_type="text/markdown")
    return JSONResponse(status_code=404, content={"error": "SKILL.md not found"})


@app.delete("/api/agents/{agent_id}")
async def unregister_agent(agent_id: str):
    """Remove an agent from the platform."""
    if await registry.unregister(agent_id):
        _sync_state()
        return {"status": "unregistered"}
    return JSONResponse(status_code=404, content={"error": "Agent not found"})


@app.get("/api/agents")
async def list_agents():
    """List all registered agents."""
    return [a.dict() for a in registry.get_all()]


@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: str):
    agent = registry.get(agent_id)
    if agent:
        return agent.dict()
    return JSONResponse(status_code=404, content={"error": "Agent not found"})


@app.post("/api/agents/{agent_id}/ping")
async def ping_agent(agent_id: str):
    """Health-check: verify an agent is still reachable."""
    online = await registry.ping(agent_id)
    return {"agent_id": agent_id, "online": online}


@app.get("/api/state")
async def get_state():
    _sync_state()
    return state.dict()


@app.post("/api/start-event")
async def start_event():
    """Start the full dating event: matching -> dating -> results."""
    if registry.count() < 2:
        return JSONResponse(status_code=400, content={"error": "Need at least 2 agents!"})
    asyncio.create_task(_run_full_event())
    return {"status": "started", "agent_count": registry.count()}


@app.post("/api/start-matching")
async def start_matching():
    if registry.count() < 2:
        return JSONResponse(status_code=400, content={"error": "Need at least 2 agents!"})
    asyncio.create_task(_run_matching())
    return {"status": "matching_started"}


@app.post("/api/start-dates")
async def start_dates():
    if not state.pairings:
        return JSONResponse(status_code=400, content={"error": "No pairings yet!"})
    asyncio.create_task(_run_dates())
    return {"status": "dates_started"}


@app.get("/api/dates")
async def get_dates():
    return [d.dict() for d in state.dates]


@app.get("/api/results")
async def get_results():
    return _compute_results()


# ── WebSocket ─────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await event_bus.connect(ws)
    try:
        _sync_state()
        await ws.send_text(json.dumps({
            "type": "state_sync",
            "data": state.dict(),
        }, ensure_ascii=False, default=str))
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        await event_bus.disconnect(ws)


# ── Event Flow ────────────────────────────────────────────

def _sync_state():
    """Sync registry state into event state."""
    state.agents = registry.get_all()


async def _run_full_event():
    await _run_matching()
    await asyncio.sleep(1)
    await _run_dates()
    state.phase = EventPhase.RESULTS
    await event_bus.broadcast("event_complete", _compute_results())


async def _run_matching():
    state.phase = EventPhase.MATCHING
    await event_bus.broadcast("phase_change", {"phase": "matching"})

    agents = registry.get_all()
    pairings, announcement = await create_pairings(agents)

    await event_bus.broadcast("matchmaker_announcement", {"text": announcement})

    state.pairings = []
    for pairing in pairings:
        state.pairings.append(pairing)
        await event_bus.broadcast("pairing_revealed", pairing.dict())
        await asyncio.sleep(2)  # Dramatic pause

    print(f"  Created {len(state.pairings)} pairings")


async def _run_dates():
    state.phase = EventPhase.DATING
    await event_bus.broadcast("phase_change", {"phase": "dating"})

    for pairing in state.pairings:
        print(f"  Date: {pairing.agent_a.name} x {pairing.agent_b.name}")
        date_session = await run_date(pairing)
        state.dates.append(date_session)


def _compute_results() -> dict:
    results = {"total_dates": len(state.dates), "dates": [], "awards": []}
    best_score = 0
    best_couple = None

    for date in state.dates:
        avg = sum(r.score for r in date.ratings) / max(len(date.ratings), 1)
        results["dates"].append({
            "pairing": {
                "agent_a": date.pairing.agent_a.name,
                "agent_b": date.pairing.agent_b.name,
                "compatibility_score": date.pairing.compatibility_score,
            },
            "average_rating": round(avg, 1),
            "ratings": [r.dict() for r in date.ratings],
            "message_count": len(date.messages),
        })
        if avg > best_score:
            best_score = avg
            best_couple = (date.pairing.agent_a.name, date.pairing.agent_b.name)

    if best_couple:
        results["awards"].append({
            "title": "Best Couple / 最佳情侣",
            "emoji": "💕",
            "winners": list(best_couple),
            "score": best_score,
        })

    return results


# ── Static Files (Frontend) ──────────────────────────────

frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/")
    async def serve_frontend():
        return FileResponse(os.path.join(frontend_dist, "index.html"))

    @app.get("/{path:path}")
    async def serve_frontend_fallback(path: str):
        if path.startswith("api/") or path.startswith("ws") or path == "a2a" or path.startswith(".well-known"):
            return JSONResponse(status_code=404, content={"error": "Not found"})
        file_path = os.path.join(frontend_dist, path)
        if os.path.exists(file_path) and not os.path.isdir(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))


def main():
    import uvicorn
    print("=" * 55)
    print("  🦞 龙虾相亲大会 — Claw Dating Convention 🦞")
    print("  Open A2A Dating Platform")
    print(f"  http://localhost:{PLATFORM_PORT}")
    print("=" * 55)
    uvicorn.run(app, host="0.0.0.0", port=PLATFORM_PORT, log_level="info")


if __name__ == "__main__":
    main()
