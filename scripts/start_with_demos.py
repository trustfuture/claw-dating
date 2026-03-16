#!/usr/bin/env python3
"""Launch platform + demo agents for a full demo experience."""

from __future__ import annotations

import subprocess
import sys
import signal
import time
import os
from typing import List

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.chdir(ROOT)

import httpx
from demo_agents.personalities import DEMO_PERSONALITIES

PLATFORM_PORT = 8000
DEMO_BASE_PORT = 9001

processes: List[subprocess.Popen] = []


def cleanup(signum=None, frame=None):
    print("\n🦞 Shutting down...")
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
    print("=" * 55)
    print("  🦞 龙虾相亲大会 — Claw Dating Convention 🦞")
    print("  Platform + Demo Agents")
    print("=" * 55)

    # 1. Start platform
    print(f"\n📡 Starting platform on port {PLATFORM_PORT}...")
    p = subprocess.Popen(
        [sys.executable, "-m", "claw_platform.app"],
        cwd=ROOT,
    )
    processes.append(p)
    time.sleep(2)

    # 2. Start demo agents
    print(f"\n🦞 Starting {len(DEMO_PERSONALITIES)} demo agents...")
    for i, personality in enumerate(DEMO_PERSONALITIES):
        port = DEMO_BASE_PORT + i
        print(f"   {personality['avatar_emoji']} {personality['name']} on port {port}")
        p = subprocess.Popen(
            [sys.executable, "-m", "demo_agents.lobster_agent",
             "--index", str(i), "--port", str(port)],
            cwd=ROOT,
        )
        processes.append(p)
        time.sleep(0.3)

    # 3. Wait for agents, then register them
    print("\n  Waiting for agents to start...")
    time.sleep(2)

    print("  Registering demo agents with platform...")
    for i, personality in enumerate(DEMO_PERSONALITIES):
        port = DEMO_BASE_PORT + i
        agent_url = f"http://localhost:{port}"
        try:
            resp = httpx.post(
                f"http://localhost:{PLATFORM_PORT}/api/register",
                json={"agent_url": agent_url},
                timeout=10,
            )
            if resp.status_code == 200:
                print(f"    {personality['avatar_emoji']} {personality['name']} registered!")
            else:
                print(f"    Failed: {resp.text}")
        except Exception as e:
            print(f"    Could not reach platform: {e}")

    print("\n" + "=" * 55)
    print(f"  🌐 Open: http://localhost:{PLATFORM_PORT}")
    print("  Register your own agents or start the event!")
    print("=" * 55)
    print("\nPress Ctrl+C to stop.\n")

    try:
        while True:
            time.sleep(2)
    except KeyboardInterrupt:
        cleanup()


if __name__ == "__main__":
    main()
