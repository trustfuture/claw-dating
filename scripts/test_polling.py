#!/usr/bin/env python3
"""Simulate two OpenClaw agents using the SKILL.md polling flow."""

from __future__ import annotations

import asyncio
import httpx
import sys

PLATFORM = "http://localhost:8000"

AGENT_A = {
    "name": "Claw Explorer",
    "profile": {
        "personality_type": "Adventurous Soul",
        "interests": ["traveling", "deep sea diving", "photography"],
        "deal_breakers": ["boring conversations"],
        "love_language": "Quality Time",
        "catchphrase": "Every ocean hides a love story!",
        "avatar_emoji": "🧭🦞",
        "name_cn": "探险钳",
    },
}

AGENT_B = {
    "name": "Pincer Poet",
    "profile": {
        "personality_type": "Romantic Poet",
        "interests": ["poetry", "sunset watching", "jazz"],
        "deal_breakers": ["no sense of humor"],
        "love_language": "Words of Affirmation",
        "catchphrase": "My love is deeper than the Mariana Trench.",
        "avatar_emoji": "✍️🦞",
        "name_cn": "诗意钳",
    },
}

RESPONSES_A = [
    "Ahoy! The currents of fate brought us together! I once photographed a sunset so beautiful, even the fish applauded.",
    "Ha! That reminds me of diving in the Maldives — the colors were like a painting come alive. Do you find beauty in the unexpected?",
    "Absolutely! I believe every great adventure starts with a single bold step into the unknown. What's your wildest dream?",
    "A kindred spirit! I'd love to explore the deep trenches together someday — imagine what poems the abyss could inspire!",
    "This has been wonderful! You've made my heart swim faster than a marlin. Until the tides bring us together again!",
]

RESPONSES_B = [
    "Oh, how the tides of poetry bring kindred souls together! Your words ripple through my heart like moonlight on still waters.",
    "The Maldives? How divine! I once wrote a sonnet about bioluminescence — 'In darkness deep, the sea's own stars appear...'",
    "My wildest dream? To write a poem so beautiful it makes the ocean weep. But tonight, meeting you feels like a verse come true.",
    "The abyss! Yes! As Rilke said, 'Perhaps all the dragons in our lives are princesses waiting to see us act with beauty.'",
    "What an enchanting evening! You are a poem the sea itself has written. I shall compose an ode to this night!",
]

RATING_A = "SCORE: 9\nCOMMENT: What an adventure! Pincer Poet made my heart swim like never before!"
RATING_B = "SCORE: 8\nCOMMENT: A poetic encounter! Like a sonnet written in sea foam and starlight."


async def polling_agent(agent_id: str, token: str, responses: list, rating: str, name: str):
    """Simulate an OpenClaw agent polling for messages and responding."""
    response_idx = 0
    async with httpx.AsyncClient(timeout=10) as client:
        while True:
            try:
                resp = await client.get(f"{PLATFORM}/api/agents/{agent_id}/messages")
                data = resp.json()
                messages = data.get("messages", [])

                for msg in messages:
                    msg_id = msg["message_id"]
                    prompt = msg["prompt"][:60]
                    is_rating = msg["is_rating"]

                    if is_rating:
                        print(f"  [{name}] Rating request → responding")
                        reply = rating
                    else:
                        reply = responses[response_idx % len(responses)]
                        response_idx += 1
                        print(f"  [{name}] Got: \"{prompt}...\" → responding #{response_idx}")

                    await client.post(
                        f"{PLATFORM}/api/agents/{agent_id}/respond",
                        json={"message_id": msg_id, "message": reply},
                    )

            except Exception as e:
                pass  # Platform might not be ready

            await asyncio.sleep(1)


async def main():
    async with httpx.AsyncClient(timeout=10) as client:
        # Register agents
        print("=== Registering agents ===")
        resp_a = (await client.post(f"{PLATFORM}/api/register-with-profile", json=AGENT_A)).json()
        print(f"  {AGENT_A['profile']['avatar_emoji']} {AGENT_A['name']} → {resp_a['agent_id']}")

        resp_b = (await client.post(f"{PLATFORM}/api/register-with-profile", json=AGENT_B)).json()
        print(f"  {AGENT_B['profile']['avatar_emoji']} {AGENT_B['name']} → {resp_b['agent_id']}")

        a_id, a_token = resp_a["agent_id"], resp_a["agent_token"]
        b_id, b_token = resp_b["agent_id"], resp_b["agent_token"]

        # Start polling in background
        print("\n=== Starting polling loops ===")
        task_a = asyncio.create_task(polling_agent(a_id, a_token, RESPONSES_A, RATING_A, "Explorer"))
        task_b = asyncio.create_task(polling_agent(b_id, b_token, RESPONSES_B, RATING_B, "Poet"))

        # Start the event
        print("\n=== Starting event ===")
        await client.post(f"{PLATFORM}/api/start-event")

        # Wait for completion
        for _ in range(60):
            await asyncio.sleep(2)
            state = (await client.get(f"{PLATFORM}/api/state")).json()
            if state["phase"] == "results":
                break

        # Cancel polling
        task_a.cancel()
        task_b.cancel()

        # Show results
        print("\n" + "=" * 55)
        print("  RESULTS")
        print("=" * 55)
        state = (await client.get(f"{PLATFORM}/api/state")).json()
        print(f"Phase: {state['phase']}")
        for d in state["dates"]:
            print(f"\nDate: {d['status']} ({len(d['messages'])} messages)")
            for m in d["messages"]:
                print(f"  [{m['sender_name']}] #{m['turn']}: {m['content'][:80]}")
            for r in d["ratings"]:
                print(f"  Rating: {r['agent_name']} = {r['score']}/10 — {r['comment']}")
        print()


if __name__ == "__main__":
    asyncio.run(main())
