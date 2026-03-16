import os
from dotenv import load_dotenv

load_dotenv()

ORCHESTRATOR_PORT = 8000
MATCHMAKER_PORT = 8010
LOBSTER_BASE_PORT = 8001  # 8001-8008

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

DATE_TURNS = 5  # Each lobster speaks 5 times = 10 messages total
NUM_LOBSTERS = 8

ORCHESTRATOR_URL = f"http://localhost:{ORCHESTRATOR_PORT}"
