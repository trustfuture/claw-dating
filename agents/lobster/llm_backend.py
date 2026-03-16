"""LLM backend for generating in-character lobster responses."""

from openai import AsyncOpenAI
from common.config import OPENAI_API_KEY, LLM_MODEL


client = AsyncOpenAI(api_key=OPENAI_API_KEY)


async def generate_response(
    personality: dict,
    conversation_history: list[dict],
    partner_name: str,
    is_opening: bool = False,
    is_rating: bool = False,
) -> str:
    system_prompt = personality["system_prompt"]

    if is_rating:
        system_prompt += (
            "\n\nThe date is now over. You must rate your date on a scale of 1-10 "
            "and give a brief, in-character explanation. "
            "Format: SCORE: [number]\nCOMMENT: [your in-character comment]"
        )
    elif is_opening:
        system_prompt += (
            f"\n\nYou're at a lobster speed-dating event called '龙虾相亲大会' (Lobster Dating Convention). "
            f"You're about to meet {partner_name}. Introduce yourself in character with a fun opening line. "
            f"Be flirty and memorable!"
        )
    else:
        system_prompt += (
            f"\n\nYou're on a date with {partner_name} at the 龙虾相亲大会. "
            f"Continue the conversation, staying in character. Be engaging and fun!"
        )

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(conversation_history)

    response = await client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        max_tokens=200,
        temperature=0.9,
    )
    return response.choices[0].message.content or "..."


async def generate_response_stream(
    personality: dict,
    conversation_history: list[dict],
    partner_name: str,
    is_opening: bool = False,
):
    system_prompt = personality["system_prompt"]
    if is_opening:
        system_prompt += (
            f"\n\nYou're at the 龙虾相亲大会. You're meeting {partner_name}. "
            f"Give a fun, flirty opening line. Be memorable!"
        )
    else:
        system_prompt += (
            f"\n\nYou're on a date with {partner_name}. "
            f"Continue the conversation in character. Be engaging!"
        )

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(conversation_history)

    stream = await client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        max_tokens=200,
        temperature=0.9,
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content
