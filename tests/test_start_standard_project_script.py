import io
import json
import runpy
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = REPO_ROOT / "scripts" / "start_standard_project.py"


class StartStandardProjectScriptTests(unittest.TestCase):
    def test_outputs_agent_startup_summary(self) -> None:
        fake_result = {
            "ok": True,
            "agent_activation_state": "deferred_to_local_ai",
            "startup_batches": [
                {
                    "project_id": "standard_project",
                    "session_count": 6,
                }
            ],
            "activation": {
                "counts": {
                    "sessions": 4,
                }
            },
        }

        with patch(
            "task_dashboard.public_install.install_public_bundle",
            return_value=fake_result,
        ):
            with patch.object(sys, "argv", [str(SCRIPT_PATH), "--with-agents"]):
                with patch("sys.stdout", new=io.StringIO()) as stdout:
                    with self.assertRaises(SystemExit) as exc:
                        runpy.run_path(str(SCRIPT_PATH), run_name="__main__")

        self.assertEqual(exc.exception.code, 0)
        payload = json.loads(stdout.getvalue())
        self.assertEqual(payload["agent_startup_mode"], "deferred_to_local_ai")
        self.assertEqual(payload["agent_startup_summary"]["target_sessions"], 6)
        self.assertEqual(payload["agent_startup_summary"]["created_sessions"], 4)
        self.assertEqual(payload["agent_startup_summary"]["missing_sessions"], 2)


if __name__ == "__main__":
    unittest.main()
