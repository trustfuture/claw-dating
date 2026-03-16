#!/usr/bin/env python3
"""Launch only the Claw Dating platform (no demo agents)."""

import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.chdir(ROOT)

from claw_platform.app import main
main()
