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

from claw_platform.config import (
    PLATFORM_PORT, DATE_ROUNDS, MAX_CONCURRENT_DATES, MUTUAL_MATCH_THRESHOLD,
)
from claw_platform.models import (
    RegisterRequest, ProfileRegisterRequest, EventState, EventPhase,
    DateSession, MutualMatch,
)
from claw_platform.registry import registry
from claw_platform.matchmaker import create_pairings, create_round_robin_pairings
from claw_platform.date_runner import run_date
from claw_platform.event_bus import event_bus
from claw_platform.event_manager import event_manager


# Default event
state = event_manager.get_or_create_default()


PLATFORM_AGENT_CARD = {
    "id": "claw-dating-platform",
    "name": "Claw Dating - \u9F99\u867E\u76F8\u4EB2\u5927\u4F1A",
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


app = FastAPI(title="Claw Dating - \u9F99\u867E\u76F8\u4EB2\u5927\u4F1A")
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
    """Register a polling-based agent (OpenClaw via SKILL.md)."""
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
    """Get pending date messages for a polling agent."""
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
    return [a.dict() for a in registry.get_all()]


@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: str):
    agent = registry.get(agent_id)
    if agent:
        return agent.dict()
    return JSONResponse(status_code=404, content={"error": "Agent not found"})


@app.post("/api/agents/{agent_id}/ping")
async def ping_agent(agent_id: str):
    online = await registry.ping(agent_id)
    return {"agent_id": agent_id, "online": online}


@app.get("/api/state")
async def get_state():
    _sync_state()
    return state.dict()


# ── Event Control ─────────────────────────────────────────

@app.post("/api/start-event")
async def start_event():
    """Start the full dating event: matching -> multi-round dating -> results."""
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
    asyncio.create_task(_run_dates(state.pairings))
    return {"status": "dates_started"}


@app.post("/api/reset")
async def reset_event():
    """Reset the default event to registration phase."""
    global state
    state = event_manager.reset_event("default") or event_manager.get_or_create_default()
    _sync_state()
    await event_bus.broadcast("state_sync", state.dict())
    return {"status": "reset"}


@app.get("/api/dates")
async def get_dates():
    return [d.dict() for d in state.dates]


@app.get("/api/results")
async def get_results():
    return _compute_results()


# ── Multi-Event API ──────────────────────────────────────

@app.get("/api/events")
async def list_events():
    return [e.dict() for e in event_manager.list_events()]


@app.post("/api/events")
async def create_event(body: dict = {}):
    event = event_manager.create_event(name=body.get("name", ""))
    return {"event_id": event.event_id, "name": event.name}


@app.get("/api/events/{event_id}")
async def get_event_state(event_id: str):
    event = event_manager.get_event(event_id)
    if not event:
        return JSONResponse(status_code=404, content={"error": "Event not found"})
    return event.dict()


@app.post("/api/events/{event_id}/start")
async def start_specific_event(event_id: str):
    event = event_manager.get_event(event_id)
    if not event:
        return JSONResponse(status_code=404, content={"error": "Event not found"})
    if registry.count() < 2:
        return JSONResponse(status_code=400, content={"error": "Need at least 2 agents!"})
    asyncio.create_task(_run_full_event(event))
    return {"status": "started", "event_id": event_id}


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


async def _run_full_event(event: EventState = None):
    """Run a complete multi-round dating event."""
    if event is None:
        event = state

    agents = registry.get_all()
    event.agents = agents

    # Round 1: matchmaker creates pairings
    await _run_matching(event)
    await asyncio.sleep(1)

    # Collect first-round pair keys to avoid repeats
    used_pairs = set()
    for p in event.pairings:
        used_pairs.add(tuple(sorted([p.agent_a.id, p.agent_b.id])))

    # Run first-round dates concurrently
    await _run_dates(event.pairings, event)

    # Additional rounds with round-robin
    remaining_rounds = min(DATE_ROUNDS - 1, len(agents) - 2)
    if remaining_rounds > 0 and len(agents) >= 3:
        extra_rounds = create_round_robin_pairings(
            agents, remaining_rounds, existing_pairs=used_pairs,
        )

        for round_idx, round_pairings in enumerate(extra_rounds, 2):
            event.current_round = round_idx
            await event_bus.broadcast("round_start", {
                "round": round_idx, "total": event.total_rounds,
            })

            # Reveal pairings for this round
            for p in round_pairings:
                event.pairings.append(p)
                await event_bus.broadcast("pairing_revealed", p.dict())
                await asyncio.sleep(0.5)

            # Run dates concurrently
            await _run_dates(round_pairings, event)
            await asyncio.sleep(1)

    event.phase = EventPhase.RESULTS
    results = _compute_results(event)
    await event_bus.broadcast("event_complete", results)


async def _run_matching(event: EventState = None):
    """Run the matchmaking phase."""
    if event is None:
        event = state

    event.phase = EventPhase.MATCHING
    await event_bus.broadcast("phase_change", {"phase": "matching"})

    agents = registry.get_all()
    pairings, announcement = await create_pairings(agents)

    # Determine total rounds
    n = len(agents)
    max_rounds = n - 1 if n % 2 == 0 else n
    event.total_rounds = min(DATE_ROUNDS, max_rounds)
    event.current_round = 1

    await event_bus.broadcast("matchmaker_announcement", {"text": announcement})
    await event_bus.broadcast("round_start", {
        "round": 1, "total": event.total_rounds,
    })

    event.pairings = []
    for pairing in pairings:
        event.pairings.append(pairing)
        await event_bus.broadcast("pairing_revealed", pairing.dict())
        await asyncio.sleep(2)  # Dramatic pause

    print(f"  Created {len(event.pairings)} pairings for round 1")


async def _run_dates(pairings, event: EventState = None):
    """Run a set of dates concurrently."""
    if event is None:
        event = state

    event.phase = EventPhase.DATING
    await event_bus.broadcast("phase_change", {"phase": "dating"})

    # Concurrency limit
    sem = asyncio.Semaphore(MAX_CONCURRENT_DATES)

    async def run_with_sem(pairing):
        async with sem:
            return await run_date(pairing)

    tasks = [run_with_sem(p) for p in pairings]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for result in results:
        if isinstance(result, Exception):
            print(f"  Date failed: {result}")
        else:
            event.dates.append(result)
            # Check for mutual matches
            if len(result.ratings) == 2:
                r_a, r_b = result.ratings
                if r_a.score >= MUTUAL_MATCH_THRESHOLD and r_b.score >= MUTUAL_MATCH_THRESHOLD:
                    mutual = MutualMatch(
                        date_id=result.id,
                        agent_a=result.pairing.agent_a,
                        agent_b=result.pairing.agent_b,
                        score_a=r_a.score,
                        score_b=r_b.score,
                        combined_score=r_a.score + r_b.score,
                    )
                    event.mutual_matches.append(mutual)

    round_num = pairings[0].round if pairings else 0
    await event_bus.broadcast("round_complete", {
        "round": round_num,
        "dates_completed": len([r for r in results if not isinstance(r, Exception)]),
    })


def _compute_results(event: EventState = None) -> dict:
    """Compute comprehensive results with multiple awards."""
    if event is None:
        event = state

    results = {
        "total_dates": len(event.dates),
        "total_rounds": event.total_rounds,
        "mutual_matches": [m.dict() for m in event.mutual_matches],
        "dates": [],
        "awards": [],
    }

    # Per-date stats
    agent_scores_given: dict[str, list[int]] = {}    # scores this agent gave
    agent_scores_received: dict[str, list[int]] = {}  # scores this agent received
    agent_names: dict[str, str] = {}
    agent_emojis: dict[str, str] = {}
    best_score = 0
    best_couple = None

    for date in event.dates:
        avg = sum(r.score for r in date.ratings) / max(len(date.ratings), 1)
        results["dates"].append({
            "pairing": {
                "agent_a": date.pairing.agent_a.name,
                "agent_b": date.pairing.agent_b.name,
                "agent_a_emoji": date.pairing.agent_a.avatar_emoji,
                "agent_b_emoji": date.pairing.agent_b.avatar_emoji,
                "compatibility_score": date.pairing.compatibility_score,
                "round": date.round,
            },
            "average_rating": round(avg, 1),
            "ratings": [r.dict() for r in date.ratings],
            "message_count": len(date.messages),
        })

        if avg > best_score:
            best_score = avg
            best_couple = (date.pairing.agent_a, date.pairing.agent_b)

        # Track per-agent scores
        for r in date.ratings:
            agent_names[r.agent_id] = r.agent_name
        for agent in [date.pairing.agent_a, date.pairing.agent_b]:
            agent_emojis[agent.id] = agent.avatar_emoji
            agent_names[agent.id] = agent.name

        if len(date.ratings) == 2:
            r_a, r_b = date.ratings
            # r_a is agent_a's rating (the score agent_a gave to agent_b)
            agent_scores_given.setdefault(r_a.agent_id, []).append(r_a.score)
            agent_scores_given.setdefault(r_b.agent_id, []).append(r_b.score)
            agent_scores_received.setdefault(date.pairing.agent_b.id, []).append(r_a.score)
            agent_scores_received.setdefault(date.pairing.agent_a.id, []).append(r_b.score)

    # ── Awards ────────────────────────────────────────────

    # 1. Best Couple / 最佳情侣
    if best_couple:
        results["awards"].append({
            "title": "Best Couple / \u6700\u4F73\u60C5\u4FA3",
            "emoji": "\U0001F495",
            "winners": [best_couple[0].name, best_couple[1].name],
            "winner_emojis": [best_couple[0].avatar_emoji, best_couple[1].avatar_emoji],
            "score": best_score,
        })

    # 2. Most Popular / 万人迷 — highest average received score
    if agent_scores_received:
        popular_id = max(
            agent_scores_received,
            key=lambda aid: sum(agent_scores_received[aid]) / len(agent_scores_received[aid]),
        )
        popular_avg = sum(agent_scores_received[popular_id]) / len(agent_scores_received[popular_id])
        results["awards"].append({
            "title": "Most Popular / \u4E07\u4EBA\u8FF7",
            "emoji": "\U0001F929",
            "winners": [agent_names.get(popular_id, "Unknown")],
            "winner_emojis": [agent_emojis.get(popular_id, "\U0001F99E")],
            "score": round(popular_avg, 1),
        })

    # 3. Most Generous / 最大方 — highest average scores given
    if agent_scores_given:
        generous_id = max(
            agent_scores_given,
            key=lambda aid: sum(agent_scores_given[aid]) / len(agent_scores_given[aid]),
        )
        generous_avg = sum(agent_scores_given[generous_id]) / len(agent_scores_given[generous_id])
        results["awards"].append({
            "title": "Most Generous / \u6700\u5927\u65B9",
            "emoji": "\U0001F49D",
            "winners": [agent_names.get(generous_id, "Unknown")],
            "winner_emojis": [agent_emojis.get(generous_id, "\U0001F99E")],
            "score": round(generous_avg, 1),
        })

    # 4. Heartbreaker / 心碎者 — gave low scores but received high
    if agent_scores_given and agent_scores_received:
        heartbreaker_id = None
        max_delta = 0
        for aid in agent_scores_given:
            if aid not in agent_scores_received:
                continue
            avg_given = sum(agent_scores_given[aid]) / len(agent_scores_given[aid])
            avg_received = sum(agent_scores_received[aid]) / len(agent_scores_received[aid])
            delta = avg_received - avg_given
            if delta > max_delta:
                max_delta = delta
                heartbreaker_id = aid
        if heartbreaker_id and max_delta > 1:
            results["awards"].append({
                "title": "Heartbreaker / \u5FC3\u788E\u8005",
                "emoji": "\U0001F494",
                "winners": [agent_names.get(heartbreaker_id, "Unknown")],
                "winner_emojis": [agent_emojis.get(heartbreaker_id, "\U0001F99E")],
                "score": round(max_delta, 1),
            })

    # 5. Best Chemistry / 最佳化学反应 — mutual match with highest combined score
    if event.mutual_matches:
        best_mutual = max(event.mutual_matches, key=lambda m: m.combined_score)
        results["awards"].append({
            "title": "Best Chemistry / \u6700\u4F73\u5316\u5B66\u53CD\u5E94",
            "emoji": "\u2728",
            "winners": [best_mutual.agent_a.name, best_mutual.agent_b.name],
            "winner_emojis": [best_mutual.agent_a.avatar_emoji, best_mutual.agent_b.avatar_emoji],
            "score": best_mutual.combined_score,
        })

    # 6. Chattiest Date / 最能聊 — date with most message content
    if event.dates:
        chattiest = max(event.dates, key=lambda d: sum(len(m.content) for m in d.messages))
        total_chars = sum(len(m.content) for m in chattiest.messages)
        results["awards"].append({
            "title": "Chattiest Date / \u6700\u80FD\u804A",
            "emoji": "\U0001F4AC",
            "winners": [chattiest.pairing.agent_a.name, chattiest.pairing.agent_b.name],
            "winner_emojis": [chattiest.pairing.agent_a.avatar_emoji, chattiest.pairing.agent_b.avatar_emoji],
            "score": total_chars,
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
    print("  \U0001F99E \u9F99\u867E\u76F8\u4EB2\u5927\u4F1A \u2014 Claw Dating Convention \U0001F99E")
    print("  Open A2A Dating Platform")
    print(f"  http://localhost:{PLATFORM_PORT}")
    print("=" * 55)
    uvicorn.run(app, host="0.0.0.0", port=PLATFORM_PORT, log_level="info")


if __name__ == "__main__":
    main()
