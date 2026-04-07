#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import argparse
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from task_dashboard.public_install import install_public_bundle


def _coerce_count(value: object) -> int:
    try:
        return max(0, int(value or 0))
    except Exception:
        return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Recommended install/start entrypoint for the public Qoreon bundle on a new computer."
    )
    parser.add_argument(
        "--with-agents",
        action="store_true",
        help="After the public install is ready, also try to create the default standard_project sessions and run the first-wave training/sample coordination actions.",
    )
    parser.add_argument(
        "--all-channels",
        action="store_true",
        help="When --with-agents is enabled, include all 12 standard_project channels. Default activation only targets the 6 core channels.",
    )
    parser.add_argument(
        "--core-only",
        action="store_true",
        help="Compatibility flag. When --with-agents is enabled, keep activation scoped to the 6 core channels.",
    )
    args = parser.parse_args()
    if args.core_only and args.all_channels:
        parser.error("--core-only and --all-channels cannot be used together")
    activate_agents = bool(args.with_agents)
    include_optional = bool(args.all_channels)

    result = install_public_bundle(
        REPO_ROOT,
        bootstrap_projects=["standard_project"],
        build_pages=True,
        start_server=True,
        port=18770,
        activate_project="standard_project" if activate_agents else "",
        include_optional=include_optional,
        activation_run_samples=activate_agents,
        wait_timeout_s=900.0,
        poll_interval_s=2.0,
    )
    batches = result.get("startup_batches") if isinstance(result.get("startup_batches"), list) else []
    activation = result.get("activation") if isinstance(result.get("activation"), dict) else {}
    activation_counts = activation.get("counts") if isinstance(activation.get("counts"), dict) else {}
    target_session_count = _coerce_count(batches[0].get("session_count") if batches else 0)
    created_session_count = _coerce_count(activation_counts.get("sessions"))
    result["agent_startup_mode"] = (
        str(result.get("agent_activation_state") or "").strip() or ("activated" if activate_agents else "startup_batch_ready")
    )
    result["agent_session_scope"] = "all_channels" if include_optional else "core_channels"
    result["agent_startup_batch"] = batches[0] if batches else {}
    result["agent_startup_summary"] = {
        "requested": activate_agents,
        "scope": result["agent_session_scope"],
        "target_sessions": target_session_count,
        "created_sessions": created_session_count,
        "missing_sessions": max(0, target_session_count - created_session_count),
        "run_sample_actions": activate_agents,
        "state": result["agent_startup_mode"],
    }
    sys.stdout.write(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
