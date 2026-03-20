#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from task_dashboard.public_bootstrap import bootstrap_public_example


def main() -> int:
    parser = argparse.ArgumentParser(description="Bootstrap the public minimal project from seed files.")
    parser.add_argument(
        "--repo-root",
        default=str(REPO_ROOT),
        help="Repository root. Defaults to the current qoreon repo root.",
    )
    args = parser.parse_args()

    repo_root = Path(str(args.repo_root)).expanduser().resolve()
    result = bootstrap_public_example(repo_root)
    sys.stdout.write(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
