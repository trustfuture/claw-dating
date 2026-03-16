from __future__ import annotations

import os
from dotenv import load_dotenv

load_dotenv()

PLATFORM_PORT = 8000
PLATFORM_HOST = os.getenv("PLATFORM_HOST", "0.0.0.0")

# LLM for matchmaker (platform's own - only service needing LLM)
PLATFORM_LLM_API_KEY = os.getenv("PLATFORM_LLM_API_KEY", os.getenv("OPENAI_API_KEY", ""))
PLATFORM_LLM_MODEL = os.getenv("PLATFORM_LLM_MODEL", "gpt-4o-mini")

DATE_TURNS = 5  # Each agent speaks 5 times = 10 messages total
AGENT_CARD_FETCH_TIMEOUT = 10  # seconds
A2A_MESSAGE_TIMEOUT = 30  # seconds
