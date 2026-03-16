#!/usr/bin/env python3
"""Launch demo agents and register them on the platform."""

from __future__ import annotations

import subprocess
import sys
import signal
import time
import os
from typing import List

import httpx

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.chdir(ROOT)

from demo_agents.personalities import DEMO_PERSONALITIES

PLATFORM_URL = os.getenv("PLATFORM_URL", "http://localhost:8000")
DEMO_BASE_PORT = 9001

processes: List[subprocess.Popen] = []


def cleanup(signum=None, frame=None):
    print("\nShutting down demo agents...")
    for p in processes:
        try:
            p.terminate()
        except Exception:
            pass
    for p in processes:
        try:
            p.wait(timeout=3)
        except Exception:
            p.kill()
    sys.exit(0)


signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)


def main():
    print("=" * 50)
    print("  🦞 Launching Demo Lobster Agents")
    print("=" * 50)

    # Start demo agents
    for i, personality in enumerate(DEMO_PERSONALITIES):
        port = DEMO_BASE_PORT + i
        print(f"  {personality['avatar_emoji']} {personality['name']} on port {port}")
        p = subprocess.Popen(
            [sys.executable, "-m", "demo_agents.lobster_agent", "--index", str(i), "--port", str(port)],
            cwd=ROOT,
        )
        processes.append(p)
        time.sleep(0.3)

    # Wait for agents to start
    print("\n  Waiting for agents to start...")
    time.sleep(2)

    # Register with platform
    print(f"\n  Registering with platform at {PLATFORM_URL}...")
    for i, personality in enumerate(DEMO_PERSONALITIES):
        port = DEMO_BASE_PORT + i
        agent_url = f"http://localhost:{port}"
        try:
            resp = httpx.post(
                f"{PLATFORM_URL}/api/register",
                json={"agent_url": agent_url},
                timeout=10,
            )
            if resp.status_code == 200:
                print(f"    {personality['avatar_emoji']} {personality['name']} registered!")
            else:
                print(f"    Failed: {resp.text}")
        except Exception as e:
            print(f"    Could not reach platform: {e}")

    print("\n" + "=" * 50)
    print("  Demo agents running! Press Ctrl+C to stop.")
    print("=" * 50)

    try:
        while True:
            time.sleep(2)
    except KeyboardInterrupt:
        cleanup()


if __name__ == "__main__":
    main()
