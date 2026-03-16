"""Matchmaker Agent - Analyzes lobster profiles and creates optimal pairings.

Exposes an A2A-compatible endpoint. Receives all lobster profiles,
uses LLM to evaluate compatibility, and returns pairings.
"""

import json
import uuid
import argparse
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from openai import AsyncOpenAI

from common.config import OPENAI_API_KEY, LLM_MODEL, MATCHMAKER_PORT


client = AsyncOpenAI(api_key=OPENAI_API_KEY)

MATCHMAKER_CARD = {
    "id": "matchmaker-mama",
    "name": "Mama Matchmaker",
    "description": "The legendary underwater matchmaker. Mama knows best — she sees the spark before the lobsters do.",
    "provider": {"name": "Claw Dating", "url": "https://claw-dating.dev"},
    "version": "1.0.0",
    "url": f"http://localhost:{MATCHMAKER_PORT}/a2a",
    "capabilities": {"streaming": False, "pushNotifications": False},
    "skills": [
        {
            "id": "matchmaking",
            "name": "Compatibility Matchmaking",
            "description": "Analyze lobster personalities and create optimal romantic pairings",
            "tags": ["matchmaking", "compatibility", "dating"],
        }
    ],
}


async def create_pairings(profiles: list[dict]) -> dict:
    """Use LLM to create optimal pairings from lobster profiles."""

    profiles_text = "\n\n".join(
        f"**{p['name']}** ({p['name_cn']}) — {p['personality_type']}\n"
        f"  Interests: {', '.join(p['interests'])}\n"
        f"  Deal-breakers: {', '.join(p['deal_breakers'])}\n"
        f"  Love language: {p['love_language']}\n"
        f"  Catchphrase: \"{p['catchphrase']}\""
        for p in profiles
    )

    prompt = f"""You are Mama Matchmaker, a legendary underwater matchmaker hosting the 龙虾相亲大会 (Lobster Dating Convention).

Here are the single lobsters looking for love tonight:

{profiles_text}

Create {len(profiles) // 2} pairings. For each pair:
1. Consider personality compatibility — sometimes opposites attract!
2. Look for interesting dynamics that would make for entertaining dates
3. Score compatibility 0-100
4. Give a witty, in-character reasoning

Return ONLY valid JSON in this format:
{{
  "pairings": [
    {{
      "lobster_a_id": "id-here",
      "lobster_b_id": "id-here",
      "compatibility_score": 75,
      "reasoning": "Your witty matchmaker reasoning"
    }}
  ],
  "announcement": "A dramatic announcement speech from Mama Matchmaker"
}}"""

    response = await client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.8,
    )

    try:
        return json.loads(response.choices[0].message.content)
    except (json.JSONDecodeError, TypeError):
        # Fallback: sequential pairing
        pairings = []
        for i in range(0, len(profiles) - 1, 2):
            pairings.append({
                "lobster_a_id": profiles[i]["id"],
                "lobster_b_id": profiles[i + 1]["id"],
                "compatibility_score": 50,
                "reasoning": "Mama's intuition says give it a try!",
            })
        return {
            "pairings": pairings,
            "announcement": "Mama has made her choices! Let the dates begin!",
        }


def create_app() -> FastAPI:
    app = FastAPI(title="Mama Matchmaker Agent")

    @app.get("/.well-known/agent.json")
    async def agent_card():
        return JSONResponse(content=MATCHMAKER_CARD)

    @app.post("/a2a")
    async def a2a_endpoint(request: Request):
        body = await request.json()
        method = body.get("method", "")
        params = body.get("params", {})
        req_id = body.get("id", 1)

        if method == "tasks/send":
            return await handle_matchmaking(params, req_id)
        elif method == "tasks/get":
            return jsonrpc_response(req_id, {"status": {"state": "completed"}})
        else:
            return jsonrpc_error(req_id, -32601, f"Method not found: {method}")

    return app


async def handle_matchmaking(params: dict, req_id) -> JSONResponse:
    message = params.get("message", {})
    task_id = params.get("taskId", str(uuid.uuid4()))

    # Extract profiles from message parts
    profiles = []
    for part in message.get("parts", []):
        if "text" in part:
            try:
                data = json.loads(part["text"])
                if isinstance(data, list):
                    profiles = data
                elif isinstance(data, dict) and "profiles" in data:
                    profiles = data["profiles"]
            except json.JSONDecodeError:
                pass
        elif "data" in part:
            data = part["data"]
            if isinstance(data, list):
                profiles = data
            elif isinstance(data, dict) and "profiles" in data:
                profiles = data["profiles"]

    if not profiles:
        return jsonrpc_error(req_id, -32602, "No profiles provided")

    pairings_result = await create_pairings(profiles)

    result = {
        "id": task_id,
        "status": {"state": "completed"},
        "artifacts": [
            {
                "parts": [
                    {"text": json.dumps(pairings_result, ensure_ascii=False)},
                ],
            }
        ],
    }
    return jsonrpc_response(req_id, result)


def jsonrpc_response(req_id, result) -> JSONResponse:
    return JSONResponse({"jsonrpc": "2.0", "id": req_id, "result": result})


def jsonrpc_error(req_id, code: int, message: str) -> JSONResponse:
    return JSONResponse({"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}})


def main():
    print("💘 Starting Mama Matchmaker on port", MATCHMAKER_PORT)
    app = create_app()
    uvicorn.run(app, host="0.0.0.0", port=MATCHMAKER_PORT, log_level="warning")


if __name__ == "__main__":
    main()
