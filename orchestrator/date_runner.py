"""Date Runner - Orchestrates date conversations between paired lobsters via A2A."""

import json
import uuid
from datetime import datetime

import httpx

from common.models import (
    Pairing, DateSession, DateMessage, DateRating, DateStatus,
)
from common.config import DATE_TURNS
from orchestrator.event_bus import event_bus


async def run_date(pairing: Pairing) -> DateSession:
    """Run a full date conversation between two lobsters via A2A protocol."""

    date_session = DateSession(
        id=str(uuid.uuid4()),
        pairing=pairing,
        status=DateStatus.IN_PROGRESS,
    )

    await event_bus.broadcast("date_start", {
        "date_id": date_session.id,
        "lobster_a": pairing.lobster_a.model_dump(),
        "lobster_b": pairing.lobster_b.model_dump(),
    })

    context_a = str(uuid.uuid4())
    context_b = str(uuid.uuid4())

    a = pairing.lobster_a
    b = pairing.lobster_b

    async with httpx.AsyncClient(timeout=30) as client:
        # Opening: Lobster A introduces themselves
        a_response = await send_a2a_message(
            client, a.url,
            f"Partner: {b.name}\nYou're meeting {b.name} ({b.name_cn}), a {b.personality_type}. Say hello!",
            context_a,
        )
        msg = DateMessage(
            sender_id=a.id, sender_name=a.name,
            content=a_response, turn=1,
        )
        date_session.messages.append(msg)
        await event_bus.broadcast("date_message", {
            "date_id": date_session.id, **msg.model_dump(),
        })

        # Lobster B responds to A's opening
        b_response = await send_a2a_message(
            client, b.url,
            f"Partner: {a.name}\n{a.name} says: \"{a_response}\"",
            context_b,
        )
        msg = DateMessage(
            sender_id=b.id, sender_name=b.name,
            content=b_response, turn=2,
        )
        date_session.messages.append(msg)
        await event_bus.broadcast("date_message", {
            "date_id": date_session.id, **msg.model_dump(),
        })

        # Continue the conversation for remaining turns
        last_a = a_response
        last_b = b_response

        for turn in range(3, DATE_TURNS * 2 + 1):
            if turn % 2 == 1:
                # A's turn
                a_response = await send_a2a_message(
                    client, a.url,
                    f"Partner: {b.name}\n{b.name} says: \"{last_b}\"",
                    context_a,
                )
                last_a = a_response
                msg = DateMessage(
                    sender_id=a.id, sender_name=a.name,
                    content=a_response, turn=turn,
                )
            else:
                # B's turn
                b_response = await send_a2a_message(
                    client, b.url,
                    f"Partner: {a.name}\n{a.name} says: \"{last_a}\"",
                    context_b,
                )
                last_b = b_response
                msg = DateMessage(
                    sender_id=b.id, sender_name=b.name,
                    content=b_response, turn=turn,
                )

            date_session.messages.append(msg)
            await event_bus.broadcast("date_message", {
                "date_id": date_session.id, **msg.model_dump(),
            })

        # Rating phase
        date_session.status = DateStatus.RATING
        await event_bus.broadcast("date_rating_start", {"date_id": date_session.id})

        # Get ratings from both lobsters
        a_rating_text = await send_a2a_message(
            client, a.url,
            f"Partner: {b.name}\nThe date is over. Please rate your date with {b.name} on a scale of 1-10 and explain why. 请评分！",
            context_a,
        )
        a_rating = parse_rating(a.id, a.name, a_rating_text)
        date_session.ratings.append(a_rating)

        b_rating_text = await send_a2a_message(
            client, b.url,
            f"Partner: {a.name}\nThe date is over. Please rate your date with {a.name} on a scale of 1-10 and explain why. 请评分！",
            context_b,
        )
        b_rating = parse_rating(b.id, b.name, b_rating_text)
        date_session.ratings.append(b_rating)

        date_session.status = DateStatus.COMPLETED

        await event_bus.broadcast("date_complete", {
            "date_id": date_session.id,
            "ratings": [r.model_dump() for r in date_session.ratings],
        })

    return date_session


async def send_a2a_message(
    client: httpx.AsyncClient,
    agent_url: str,
    text: str,
    context_id: str,
) -> str:
    """Send a message to a lobster agent via A2A JSON-RPC."""
    task_id = str(uuid.uuid4())

    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tasks/send",
        "params": {
            "taskId": task_id,
            "contextId": context_id,
            "message": {
                "role": "user",
                "parts": [{"text": text}],
            },
        },
    }

    response = await client.post(f"{agent_url}/a2a", json=payload)
    data = response.json()

    # Extract text from A2A response
    result = data.get("result", {})
    artifacts = result.get("artifacts", [])
    if artifacts:
        parts = artifacts[0].get("parts", [])
        if parts:
            return parts[0].get("text", "...")

    return "..."


def parse_rating(lobster_id: str, lobster_name: str, text: str) -> DateRating:
    """Parse a rating response from a lobster."""
    score = 7  # default
    comment = text

    # Try to extract SCORE: N pattern
    for line in text.split("\n"):
        line_lower = line.lower().strip()
        if line_lower.startswith("score:"):
            try:
                score = int(line_lower.replace("score:", "").strip().split("/")[0].strip())
                score = max(1, min(10, score))
            except ValueError:
                pass
        elif line_lower.startswith("comment:"):
            comment = line.replace("comment:", "", 1).replace("COMMENT:", "", 1).strip()

    return DateRating(
        lobster_id=lobster_id,
        lobster_name=lobster_name,
        score=score,
        comment=comment,
    )
