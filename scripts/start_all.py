#!/usr/bin/env python3
"""Launch all agents and the orchestrator for the Claw Dating event."""

import subprocess
import sys
import signal
import time
import os

# Ensure project root is in path
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.chdir(ROOT)

from common.config import LOBSTER_BASE_PORT, MATCHMAKER_PORT, ORCHESTRATOR_PORT, NUM_LOBSTERS


processes = []


def cleanup(signum=None, frame=None):
    print("\n🦞 Shutting down all agents...")
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
    print("   Goodbye! 🦞")
    sys.exit(0)


signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)


def main():
    print("=" * 60)
    print("  🦞 龙虾相亲大会 — Claw Dating Convention 🦞")
    print("  Starting all agents...")
    print("=" * 60)

    # 1. Start the orchestrator
    print(f"\n📡 Starting Orchestrator on port {ORCHESTRATOR_PORT}...")
    p = subprocess.Popen(
        [sys.executable, "-m", "orchestrator.app"],
        cwd=ROOT,
    )
    processes.append(p)
    time.sleep(1)

    # 2. Start the matchmaker
    print(f"\n💘 Starting Matchmaker on port {MATCHMAKER_PORT}...")
    p = subprocess.Popen(
        [sys.executable, "-m", "agents.matchmaker.server"],
        cwd=ROOT,
    )
    processes.append(p)
    time.sleep(0.5)

    # 3. Start lobster agents
    print(f"\n🦞 Starting {NUM_LOBSTERS} Lobster Agents...")
    from agents.lobster.personalities import PERSONALITIES

    for i in range(min(NUM_LOBSTERS, len(PERSONALITIES))):
        port = LOBSTER_BASE_PORT + i
        personality = PERSONALITIES[i]
        print(f"   {personality['avatar_emoji']} {personality['name']} on port {port}")
        p = subprocess.Popen(
            [sys.executable, "-m", "agents.lobster.server", "--index", str(i), "--port", str(port)],
            cwd=ROOT,
        )
        processes.append(p)
        time.sleep(0.3)

    print("\n" + "=" * 60)
    print("  All agents are running!")
    print(f"  🌐 Dashboard:  http://localhost:{ORCHESTRATOR_PORT}")
    print(f"  📡 API:        http://localhost:{ORCHESTRATOR_PORT}/api/state")
    print(f"  💘 Matchmaker:  http://localhost:{MATCHMAKER_PORT}/.well-known/agent.json")
    print()
    print("  To start the event:")
    print(f"    curl -X POST http://localhost:{ORCHESTRATOR_PORT}/api/start-event")
    print("=" * 60)
    print("\nPress Ctrl+C to stop all agents.\n")

    # Wait for processes
    try:
        while True:
            for p in processes:
                if p.poll() is not None:
                    print(f"  Warning: Process {p.pid} exited with code {p.returncode}")
            time.sleep(2)
    except KeyboardInterrupt:
        cleanup()


if __name__ == "__main__":
    main()
