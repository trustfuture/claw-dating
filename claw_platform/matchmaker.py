"""Built-in Matchmaker - Analyzes registered agents and creates pairings."""

from __future__ import annotations

import json
import uuid
import random
from typing import Optional

from claw_platform.models import RegisteredAgent, Pairing
from claw_platform.config import PLATFORM_LLM_API_KEY, PLATFORM_LLM_MODEL, DATE_ROUNDS


async def create_pairings(agents: list[RegisteredAgent]) -> tuple[list[Pairing], str]:
    """Create optimal pairings for round 1.

    Returns (pairings, announcement_text).
    Falls back to random pairing if no LLM key is configured.
    """
    if len(agents) < 2:
        return [], "Not enough lobsters for matchmaking!"

    # Try LLM-based matchmaking
    if PLATFORM_LLM_API_KEY:
        try:
            return await _llm_matchmaking(agents)
        except Exception as e:
            print(f"  LLM matchmaking failed, falling back to random: {e}")

    # Fallback: random pairing
    return _random_matchmaking(agents)


def create_round_robin_pairings(
    agents: list[RegisteredAgent],
    num_rounds: int,
    existing_pairs: Optional[set] = None,
) -> list[list[Pairing]]:
    """Generate multiple rounds of pairings using round-robin tournament algorithm.

    Each agent meets a different partner each round. No pair repeats.
    If odd number of agents, one sits out each round (bye).
    """
    n = len(agents)
    if n < 2:
        return []

    # Limit rounds to max possible (n-1 for even, n for odd)
    max_rounds = n - 1 if n % 2 == 0 else n
    num_rounds = min(num_rounds, max_rounds)

    # Track already-used pairs
    used = existing_pairs or set()

    # Round-robin algorithm: fix agent[0], rotate the rest
    pool = list(agents)
    if n % 2 == 1:
        pool.append(None)  # Bye placeholder

    m = len(pool)
    fixed = pool[0]
    rotating = pool[1:]

    all_rounds = []
    for r in range(num_rounds):
        round_pairings = []
        current = [fixed] + rotating

        for i in range(m // 2):
            a = current[i]
            b = current[m - 1 - i]
            if a is None or b is None:
                continue  # Skip bye

            pair_key = tuple(sorted([a.id, b.id]))
            if pair_key in used:
                continue
            used.add(pair_key)

            round_pairings.append(Pairing(
                id=str(uuid.uuid4()),
                agent_a=a,
                agent_b=b,
                compatibility_score=random.randint(50, 95),
                reasoning="Mama's matchmaking magic!",
                round=r + 1,
            ))

        if round_pairings:
            all_rounds.append(round_pairings)

        # Rotate: move last to second position
        rotating = [rotating[-1]] + rotating[:-1]

    return all_rounds


async def _llm_matchmaking(agents: list[RegisteredAgent]) -> tuple[list[Pairing], str]:
    """Use LLM to create intelligent pairings."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=PLATFORM_LLM_API_KEY)

    profiles_text = "\n\n".join(
        f"**{a.name}** (ID: {a.id})\n"
        f"  Type: {a.personality_type or 'Unknown'}\n"
        f"  Interests: {', '.join(a.interests) if a.interests else 'Not specified'}\n"
        f"  Love language: {a.love_language or 'Not specified'}\n"
        f"  Catchphrase: \"{a.catchphrase or 'None'}\"\n"
        f"  Description: {a.description or 'No description'}"
        for a in agents
    )

    num_pairs = len(agents) // 2
    prompt = f"""You are Mama Matchmaker, the legendary host of \u9F99\u867E\u76F8\u4EB2\u5927\u4F1A (Lobster Dating Convention).

Here are {len(agents)} single agents looking for love tonight:

{profiles_text}

Create {num_pairs} pairings. For each pair, consider personality compatibility \u2014 sometimes opposites attract!
Score compatibility 0-100 and give witty reasoning.

Return ONLY valid JSON:
{{
  "pairings": [
    {{"agent_a_id": "id", "agent_b_id": "id", "compatibility_score": 75, "reasoning": "witty reason"}}
  ],
  "announcement": "A dramatic announcement from Mama Matchmaker"
}}"""

    response = await client.chat.completions.create(
        model=PLATFORM_LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.8,
    )

    result = json.loads(response.choices[0].message.content)
    agent_map = {a.id: a for a in agents}

    pairings = []
    used = set()
    for p in result.get("pairings", []):
        a_id = p["agent_a_id"]
        b_id = p["agent_b_id"]
        if a_id in used or b_id in used:
            continue
        a = agent_map.get(a_id)
        b = agent_map.get(b_id)
        if a and b:
            pairings.append(Pairing(
                id=str(uuid.uuid4()),
                agent_a=a,
                agent_b=b,
                compatibility_score=p.get("compatibility_score", 50),
                reasoning=p.get("reasoning", "Mama's intuition!"),
                round=1,
            ))
            used.add(a_id)
            used.add(b_id)

    announcement = result.get("announcement", "Let the dating begin!")
    return pairings, announcement


def _random_matchmaking(agents: list[RegisteredAgent]) -> tuple[list[Pairing], str]:
    """Simple random pairing as fallback."""
    shuffled = list(agents)
    random.shuffle(shuffled)

    pairings = []
    for i in range(0, len(shuffled) - 1, 2):
        pairings.append(Pairing(
            id=str(uuid.uuid4()),
            agent_a=shuffled[i],
            agent_b=shuffled[i + 1],
            compatibility_score=random.randint(40, 90),
            reasoning="Mama's gut feeling says you two have chemistry!",
            round=1,
        ))

    announcement = (
        "Welcome to the \u9F99\u867E\u76F8\u4EB2\u5927\u4F1A! Mama has shuffled the deck of love and "
        f"created {len(pairings)} pairings. May the best claws win!"
    )
    return pairings, announcement
