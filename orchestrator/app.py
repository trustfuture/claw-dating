"""Central Orchestrator - FastAPI server managing the dating event.

Provides:
- REST API for the frontend
- WebSocket for real-time updates
- Agent registry for lobster discovery
- Event coordination (registration → matching → dating → results)
"""

import json
import uuid
import asyncio

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import httpx

from common.config import MATCHMAKER_PORT, ORCHESTRATOR_PORT
from common.models import (
    LobsterProfile, EventState, EventPhase,
    Pairing, DateSession,
)
from orchestrator.event_bus import event_bus
from orchestrator.date_runner import run_date


# Global state
state = EventState()


app = FastAPI(title="Claw Dating Orchestrator - 龙虾相亲大会")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── REST API ──────────────────────────────────────────────

@app.get("/api/state")
async def get_state():
    """Get full event state."""
    return state.model_dump()


@app.get("/api/lobsters")
async def get_lobsters():
    """Get all registered lobsters."""
    return [l.model_dump() for l in state.lobsters]


@app.post("/api/register")
async def register_lobster(profile: LobsterProfile):
    """Register a lobster agent."""
    # Avoid duplicates
    if any(l.id == profile.id for l in state.lobsters):
        return {"status": "already_registered", "id": profile.id}

    state.lobsters.append(profile)
    print(f"  Registered: {profile.avatar_emoji} {profile.name} ({profile.name_cn})")

    await event_bus.broadcast("registration", profile.model_dump())
    return {"status": "registered", "id": profile.id}


@app.post("/api/start-event")
async def start_event():
    """Start the full dating event: matching → dating → results."""
    if len(state.lobsters) < 2:
        return {"error": "Need at least 2 lobsters to start!"}

    # Run in background so the API responds immediately
    asyncio.create_task(_run_full_event())
    return {"status": "started", "lobster_count": len(state.lobsters)}


@app.post("/api/start-matching")
async def start_matching():
    """Trigger matchmaking phase only."""
    if len(state.lobsters) < 2:
        return {"error": "Need at least 2 lobsters!"}
    asyncio.create_task(_run_matching())
    return {"status": "matching_started"}


@app.post("/api/start-dates")
async def start_dates():
    """Trigger dating phase (requires pairings to exist)."""
    if not state.pairings:
        return {"error": "No pairings yet! Run matching first."}
    asyncio.create_task(_run_dates())
    return {"status": "dates_started"}


@app.get("/api/dates")
async def get_dates():
    """Get all date sessions."""
    return [d.model_dump() for d in state.dates]


@app.get("/api/dates/{date_id}")
async def get_date(date_id: str):
    """Get a specific date session."""
    for d in state.dates:
        if d.id == date_id:
            return d.model_dump()
    return {"error": "Date not found"}


@app.get("/api/results")
async def get_results():
    """Get final results with rankings."""
    if state.phase != EventPhase.RESULTS:
        return {"error": "Event not completed yet"}
    return _compute_results()


# ── WebSocket ─────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await event_bus.connect(ws)
    try:
        # Send current state on connect
        await ws.send_text(json.dumps({
            "type": "state_sync",
            "data": state.model_dump(),
        }, ensure_ascii=False, default=str))

        # Keep connection alive
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        await event_bus.disconnect(ws)


# ── Event Flow ────────────────────────────────────────────

async def _run_full_event():
    """Run the complete event: matching → dating → results."""
    await _run_matching()
    await asyncio.sleep(1)
    await _run_dates()

    state.phase = EventPhase.RESULTS
    results = _compute_results()
    await event_bus.broadcast("event_complete", results)


async def _run_matching():
    """Send all profiles to the matchmaker agent via A2A."""
    state.phase = EventPhase.MATCHING
    await event_bus.broadcast("phase_change", {"phase": "matching"})

    profiles = [
        {
            "id": l.id,
            "name": l.name,
            "name_cn": l.name_cn,
            "personality_type": l.personality_type,
            "interests": l.interests,
            "deal_breakers": l.deal_breakers,
            "love_language": l.love_language,
            "catchphrase": l.catchphrase,
        }
        for l in state.lobsters
    ]

    matchmaker_url = f"http://localhost:{MATCHMAKER_PORT}/a2a"
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tasks/send",
        "params": {
            "taskId": str(uuid.uuid4()),
            "message": {
                "role": "user",
                "parts": [{"text": json.dumps({"profiles": profiles}, ensure_ascii=False)}],
            },
        },
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(matchmaker_url, json=payload)
        data = resp.json()

    # Parse matchmaker response
    result = data.get("result", {})
    artifacts = result.get("artifacts", [])
    if artifacts:
        text = artifacts[0]["parts"][0].get("text", "{}")
        matchmaker_result = json.loads(text)

        announcement = matchmaker_result.get("announcement", "Let the dating begin!")
        await event_bus.broadcast("matchmaker_announcement", {"text": announcement})

        # Build pairings
        lobster_map = {l.id: l for l in state.lobsters}
        for p in matchmaker_result.get("pairings", []):
            a = lobster_map.get(p["lobster_a_id"])
            b = lobster_map.get(p["lobster_b_id"])
            if a and b:
                pairing = Pairing(
                    id=str(uuid.uuid4()),
                    lobster_a=a,
                    lobster_b=b,
                    compatibility_score=p.get("compatibility_score", 50),
                    reasoning=p.get("reasoning", ""),
                )
                state.pairings.append(pairing)
                await event_bus.broadcast("pairing_revealed", pairing.model_dump())
                await asyncio.sleep(2)  # Dramatic pause between reveals

    print(f"  Created {len(state.pairings)} pairings")


async def _run_dates():
    """Run all date conversations sequentially."""
    state.phase = EventPhase.DATING
    await event_bus.broadcast("phase_change", {"phase": "dating"})

    for pairing in state.pairings:
        print(f"  Date: {pairing.lobster_a.name} x {pairing.lobster_b.name}")
        try:
            date_session = await run_date(pairing)
            state.dates.append(date_session)
        except Exception as e:
            print(f"  Date failed: {e}")
            await event_bus.broadcast("date_error", {
                "pairing_id": pairing.id,
                "error": str(e),
            })


def _compute_results() -> dict:
    """Compute final event results and awards."""
    results = {
        "total_dates": len(state.dates),
        "dates": [],
        "awards": [],
    }

    best_score = 0
    best_couple = None

    for date in state.dates:
        avg_rating = sum(r.score for r in date.ratings) / max(len(date.ratings), 1)
        date_result = {
            "pairing": {
                "lobster_a": date.pairing.lobster_a.name,
                "lobster_b": date.pairing.lobster_b.name,
                "compatibility_score": date.pairing.compatibility_score,
            },
            "average_rating": round(avg_rating, 1),
            "ratings": [r.model_dump() for r in date.ratings],
            "message_count": len(date.messages),
        }
        results["dates"].append(date_result)

        if avg_rating > best_score:
            best_score = avg_rating
            best_couple = (date.pairing.lobster_a.name, date.pairing.lobster_b.name)

    if best_couple:
        results["awards"].append({
            "title": "Best Couple",
            "title_cn": "最佳情侣",
            "emoji": "💕",
            "winners": list(best_couple),
            "score": best_score,
        })

    return results


# ── Static Files (Frontend) ──────────────────────────────

import os
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/")
    async def serve_frontend():
        return FileResponse(os.path.join(frontend_dist, "index.html"))

    @app.get("/{path:path}")
    async def serve_frontend_fallback(path: str):
        file_path = os.path.join(frontend_dist, path)
        if os.path.exists(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))


def main():
    import uvicorn
    print("🦞 Starting Claw Dating Orchestrator on port", ORCHESTRATOR_PORT)
    print("   龙虾相亲大会 — Where Lobsters Find Love!")
    uvicorn.run(app, host="0.0.0.0", port=ORCHESTRATOR_PORT, log_level="info")


if __name__ == "__main__":
    main()
