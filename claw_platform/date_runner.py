"""Date Runner - Orchestrates date conversations between paired agents.

Supports two agent modes:
- A2A agents: sends messages via JSON-RPC to their endpoint
- Polling agents: enqueues messages for them to poll and respond
"""

from __future__ import annotations

import uuid

from claw_platform.models import (
    Pairing, DateSession, DateMessage, DateRating, DateStatus,
    RegisteredAgent, PendingMessage,
)
from claw_platform.config import DATE_TURNS
from claw_platform.a2a_client import send_message
from claw_platform.event_bus import event_bus


async def run_date(pairing: Pairing) -> DateSession:
    """Run a full date conversation between two agents."""
    from claw_platform.registry import registry

    date_session = DateSession(
        id=str(uuid.uuid4()),
        pairing=pairing,
        status=DateStatus.IN_PROGRESS,
    )

    a = pairing.agent_a
    b = pairing.agent_b

    await event_bus.broadcast("date_start", {
        "date_id": date_session.id,
        "agent_a": a.dict(),
        "agent_b": b.dict(),
    })

    context_a = str(uuid.uuid4())
    context_b = str(uuid.uuid4())

    try:
        # Opening: Agent A introduces themselves
        a_response = await _send_to_agent(
            registry, a,
            f"Partner: {b.name}\n"
            f"You're at the 龙虾相亲大会 (Lobster Dating Convention). "
            f"You've been matched with {b.name}. Say hello and introduce yourself!",
            context_a, date_session.id,
        )
        msg = DateMessage(sender_id=a.id, sender_name=a.name, content=a_response, turn=1)
        date_session.messages.append(msg)
        await event_bus.broadcast("date_message", {"date_id": date_session.id, **msg.dict()})

        # Agent B responds
        b_response = await _send_to_agent(
            registry, b,
            f"Partner: {a.name}\n"
            f"You're at the 龙虾相亲大会. {a.name} says: \"{a_response}\"",
            context_b, date_session.id,
        )
        msg = DateMessage(sender_id=b.id, sender_name=b.name, content=b_response, turn=2)
        date_session.messages.append(msg)
        await event_bus.broadcast("date_message", {"date_id": date_session.id, **msg.dict()})

        # Continue conversation
        last_a, last_b = a_response, b_response
        for turn in range(3, DATE_TURNS * 2 + 1):
            if turn % 2 == 1:
                last_a = await _send_to_agent(
                    registry, a,
                    f"Partner: {b.name}\n{b.name} says: \"{last_b}\"",
                    context_a, date_session.id,
                )
                msg = DateMessage(sender_id=a.id, sender_name=a.name, content=last_a, turn=turn)
            else:
                last_b = await _send_to_agent(
                    registry, b,
                    f"Partner: {a.name}\n{a.name} says: \"{last_a}\"",
                    context_b, date_session.id,
                )
                msg = DateMessage(sender_id=b.id, sender_name=b.name, content=last_b, turn=turn)

            date_session.messages.append(msg)
            await event_bus.broadcast("date_message", {"date_id": date_session.id, **msg.dict()})

        # Rating phase
        date_session.status = DateStatus.RATING
        await event_bus.broadcast("date_rating_start", {"date_id": date_session.id})

        a_rating_text = await _send_to_agent(
            registry, a,
            f"Partner: {b.name}\n"
            f"The date is over! Rate your date with {b.name} on a scale of 1-10.\n"
            f"Format: SCORE: [number]\nCOMMENT: [your comment]",
            context_a, date_session.id, is_rating=True,
        )
        date_session.ratings.append(_parse_rating(a.id, a.name, a_rating_text))

        b_rating_text = await _send_to_agent(
            registry, b,
            f"Partner: {a.name}\n"
            f"The date is over! Rate your date with {a.name} on a scale of 1-10.\n"
            f"Format: SCORE: [number]\nCOMMENT: [your comment]",
            context_b, date_session.id, is_rating=True,
        )
        date_session.ratings.append(_parse_rating(b.id, b.name, b_rating_text))

        date_session.status = DateStatus.COMPLETED

    except Exception as e:
        print(f"  Date error ({a.name} x {b.name}): {e}")
        date_session.status = DateStatus.FAILED
        await event_bus.broadcast("date_error", {
            "date_id": date_session.id, "error": str(e),
        })

    await event_bus.broadcast("date_complete", {
        "date_id": date_session.id,
        "status": date_session.status.value,
        "ratings": [r.dict() for r in date_session.ratings],
    })

    return date_session


async def _send_to_agent(
    registry, agent: RegisteredAgent, text: str,
    context_id: str, date_id: str, is_rating: bool = False,
) -> str:
    """Send a message to an agent via A2A or polling queue."""

    if agent.mode == "a2a" and agent.agent_url:
        # Direct A2A call
        return await send_message(agent.agent_url, text, context_id=context_id)
    else:
        # Polling mode: enqueue message and wait for response
        message_id = str(uuid.uuid4())
        partner_name = ""
        if "Partner:" in text:
            partner_name = text.split("Partner:", 1)[1].split("\n")[0].strip()

        pending = PendingMessage(
            message_id=message_id,
            date_id=date_id,
            partner_name=partner_name,
            prompt=text,
            is_rating=is_rating,
        )
        registry.enqueue_message(agent.id, pending)

        # Wait for the polling agent to respond (120s timeout for polling)
        response = await registry.wait_for_response(message_id, timeout=120)
        if response is None:
            return f"({agent.name} didn't respond in time)"
        return response


def _parse_rating(agent_id: str, agent_name: str, text: str) -> DateRating:
    score = 7
    comment = text
    for line in text.split("\n"):
        line_lower = line.lower().strip()
        if line_lower.startswith("score:"):
            try:
                score = int(line_lower.replace("score:", "").strip().split("/")[0].strip())
                score = max(1, min(10, score))
            except ValueError:
                pass
        elif line_lower.startswith("comment:"):
            comment = line.split(":", 1)[1].strip()
    return DateRating(agent_id=agent_id, agent_name=agent_name, score=score, comment=comment)
