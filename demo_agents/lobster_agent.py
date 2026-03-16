"""Self-contained demo lobster A2A agent.

A standalone A2A-compatible server that can be registered on the Claw Dating platform.
Uses OpenAI for LLM responses. Can also run with mock responses if no API key.
"""
from __future__ import annotations

import argparse
import json
import uuid
import os
from typing import Optional

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

DEMO_LLM_API_KEY = os.getenv("DEMO_LLM_API_KEY", os.getenv("OPENAI_API_KEY", ""))
DEMO_LLM_MODEL = os.getenv("DEMO_LLM_MODEL", os.getenv("LLM_MODEL", "gpt-4o-mini"))


def build_agent_card(personality: dict, port: int) -> dict:
    return {
        "id": personality["id"],
        "name": personality["name"],
        "description": f"{personality['name']} ({personality['name_cn']}) - {personality['personality_type']}. {personality['catchphrase']}",
        "provider": {"name": "Claw Dating Demo"},
        "version": "1.0.0",
        "url": f"http://localhost:{port}/a2a",
        "capabilities": {"streaming": True, "pushNotifications": False},
        "skills": [
            {
                "id": "dating_conversation",
                "name": "Dating Conversation",
                "description": "Engage in a fun, in-character dating conversation",
                "tags": personality["interests"],
            },
        ],
        "metadata": {
            "personality_type": personality["personality_type"],
            "interests": personality["interests"],
            "deal_breakers": personality.get("deal_breakers", []),
            "love_language": personality.get("love_language", ""),
            "catchphrase": personality["catchphrase"],
            "avatar_emoji": personality["avatar_emoji"],
            "name_cn": personality["name_cn"],
        },
    }


class DemoLobsterAgent:
    def __init__(self, personality: dict, port: int):
        self.personality = personality
        self.port = port
        self.agent_card = build_agent_card(personality, port)
        self.conversations: dict[str, list[dict]] = {}

    async def respond(self, task_id: str, text: str, context_id: Optional[str] = None) -> str:
        conv_key = context_id or task_id
        if conv_key not in self.conversations:
            self.conversations[conv_key] = []

        history = self.conversations[conv_key]
        history.append({"role": "user", "content": text})

        is_opening = len(history) == 1
        is_rating = "rate your date" in text.lower() or "评分" in text

        partner_name = "my date"
        if "partner:" in text.lower():
            parts = text.split("Partner:", 1) if "Partner:" in text else text.split("partner:", 1)
            if len(parts) > 1:
                partner_name = parts[1].split("\n")[0].strip()

        response = await self._generate(history, partner_name, is_opening, is_rating)
        history.append({"role": "assistant", "content": response})
        return response

    async def _generate(self, history: list[dict], partner_name: str,
                        is_opening: bool, is_rating: bool) -> str:
        system_prompt = self.personality["system_prompt"]
        if is_rating:
            system_prompt += (
                "\n\nThe date is over. Rate your date 1-10. "
                "Format: SCORE: [number]\nCOMMENT: [in-character comment]"
            )
        elif is_opening:
            system_prompt += f"\n\nYou're at 龙虾相亲大会. Meeting {partner_name}. Give a memorable opening!"
        else:
            system_prompt += f"\n\nYou're on a date with {partner_name}. Stay in character!"

        if DEMO_LLM_API_KEY:
            return await self._llm_generate(system_prompt, history)
        else:
            return self._mock_generate(is_opening, is_rating, partner_name)

    async def _llm_generate(self, system_prompt: str, history: list[dict]) -> str:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=DEMO_LLM_API_KEY)
        messages = [{"role": "system", "content": system_prompt}] + history
        response = await client.chat.completions.create(
            model=DEMO_LLM_MODEL, messages=messages,
            max_tokens=200, temperature=0.9,
        )
        return response.choices[0].message.content or "..."

    def _mock_generate(self, is_opening: bool, is_rating: bool, partner_name: str) -> str:
        """Fallback when no LLM key is available."""
        name = self.personality["name"]
        catchphrase = self.personality["catchphrase"]
        if is_rating:
            return f"SCORE: 8\nCOMMENT: {partner_name} was absolutely delightful! {catchphrase}"
        if is_opening:
            return f"Hello {partner_name}! I'm {name}. {catchphrase}"
        return f"Oh how interesting, {partner_name}! That reminds me... {catchphrase}"


def create_app(personality: dict, port: int) -> FastAPI:
    agent = DemoLobsterAgent(personality, port)
    app = FastAPI(title=f"Demo Agent: {personality['name']}")

    @app.get("/.well-known/agent.json")
    async def agent_card():
        return JSONResponse(content=agent.agent_card)

    @app.post("/a2a")
    async def a2a_endpoint(request: Request):
        body = await request.json()
        method = body.get("method", "")
        params = body.get("params", {})
        req_id = body.get("id", 1)

        if method == "tasks/send":
            message = params.get("message", {})
            task_id = params.get("taskId", str(uuid.uuid4()))
            context_id = params.get("contextId")

            text = ""
            for part in message.get("parts", []):
                if "text" in part:
                    text += part["text"]
            if not text:
                text = "Hello!"

            response_text = await agent.respond(task_id, text, context_id)

            return JSONResponse({
                "jsonrpc": "2.0", "id": req_id,
                "result": {
                    "id": task_id,
                    "contextId": context_id or task_id,
                    "status": {"state": "completed"},
                    "artifacts": [{"parts": [{"text": response_text}]}],
                },
            })

        return JSONResponse({
            "jsonrpc": "2.0", "id": req_id,
            "error": {"code": -32601, "message": f"Method not found: {method}"},
        })

    return app


def main():
    from demo_agents.personalities import DEMO_PERSONALITIES

    parser = argparse.ArgumentParser(description="Launch a demo lobster agent")
    parser.add_argument("--index", type=int, default=0, help="Personality index (0-2)")
    parser.add_argument("--port", type=int, default=9001, help="Port number")
    args = parser.parse_args()

    personality = DEMO_PERSONALITIES[args.index % len(DEMO_PERSONALITIES)]
    print(f"{personality['avatar_emoji']} Starting demo agent: {personality['name']} on port {args.port}")

    app = create_app(personality, args.port)
    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
