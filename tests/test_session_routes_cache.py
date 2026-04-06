import os
import unittest
from unittest import mock

from task_dashboard.runtime import session_routes


class SessionRoutesCacheTests(unittest.TestCase):
    def setUp(self) -> None:
        session_routes._SESSIONS_PAYLOAD_CACHE.clear()
        session_routes._SESSIONS_PAYLOAD_CACHE_INFLIGHT.clear()
        session_routes._SESSIONS_PAYLOAD_CACHE_INVALIDATED_AT.clear()

    def test_list_sessions_response_reuses_cached_payload(self) -> None:
        payload = {"sessions": [{"id": "session-a", "channel_name": "主体-总控（合并与验收）"}]}
        with mock.patch.object(session_routes, "build_sessions_list_payload", return_value=payload) as build_mock:
            code1, out1 = session_routes.list_sessions_response(
                query_string="project_id=task_dashboard",
                session_store=object(),
                store=object(),
                environment_name="stable",
                worktree_root="/tmp/task-dashboard",
                apply_effective_primary_flags=lambda *_args, **_kwargs: [],
                decorate_sessions_display_fields=lambda rows: rows,
                apply_session_context_rows=lambda rows, **_kwargs: rows,
                apply_session_work_context=lambda row, **_kwargs: row,
                attach_runtime_state_to_sessions=lambda _store, rows, **_kwargs: rows,
                heartbeat_runtime=None,
                load_session_heartbeat_config=lambda _row: {},
                heartbeat_summary_payload=lambda _row: {},
            )
            out1["sessions"][0]["id"] = "mutated"
            code2, out2 = session_routes.list_sessions_response(
                query_string="project_id=task_dashboard",
                session_store=object(),
                store=object(),
                environment_name="stable",
                worktree_root="/tmp/task-dashboard",
                apply_effective_primary_flags=lambda *_args, **_kwargs: [],
                decorate_sessions_display_fields=lambda rows: rows,
                apply_session_context_rows=lambda rows, **_kwargs: rows,
                apply_session_work_context=lambda row, **_kwargs: row,
                attach_runtime_state_to_sessions=lambda _store, rows, **_kwargs: rows,
                heartbeat_runtime=None,
                load_session_heartbeat_config=lambda _row: {},
                heartbeat_summary_payload=lambda _row: {},
            )

        self.assertEqual(code1, 200)
        self.assertEqual(code2, 200)
        self.assertEqual(build_mock.call_count, 1)
        self.assertEqual(out2["sessions"][0]["id"], "session-a")

    def test_list_sessions_response_respects_zero_ttl(self) -> None:
        with mock.patch.dict(os.environ, {"CCB_SESSIONS_LIST_CACHE_TTL_MS": "0"}, clear=False):
            with mock.patch.object(
                session_routes,
                "build_sessions_list_payload",
                side_effect=[
                    {"sessions": [{"id": "session-a"}]},
                    {"sessions": [{"id": "session-b"}]},
                ],
            ) as build_mock:
                _code1, out1 = session_routes.list_sessions_response(
                    query_string="project_id=task_dashboard",
                    session_store=object(),
                    store=object(),
                    environment_name="stable",
                    worktree_root="/tmp/task-dashboard",
                    apply_effective_primary_flags=lambda *_args, **_kwargs: [],
                    decorate_sessions_display_fields=lambda rows: rows,
                    apply_session_context_rows=lambda rows, **_kwargs: rows,
                    apply_session_work_context=lambda row, **_kwargs: row,
                    attach_runtime_state_to_sessions=lambda _store, rows, **_kwargs: rows,
                    heartbeat_runtime=None,
                    load_session_heartbeat_config=lambda _row: {},
                    heartbeat_summary_payload=lambda _row: {},
                )
                _code2, out2 = session_routes.list_sessions_response(
                    query_string="project_id=task_dashboard",
                    session_store=object(),
                    store=object(),
                    environment_name="stable",
                    worktree_root="/tmp/task-dashboard",
                    apply_effective_primary_flags=lambda *_args, **_kwargs: [],
                    decorate_sessions_display_fields=lambda rows: rows,
                    apply_session_context_rows=lambda rows, **_kwargs: rows,
                    apply_session_work_context=lambda row, **_kwargs: row,
                    attach_runtime_state_to_sessions=lambda _store, rows, **_kwargs: rows,
                    heartbeat_runtime=None,
                    load_session_heartbeat_config=lambda _row: {},
                    heartbeat_summary_payload=lambda _row: {},
                )

        self.assertEqual(build_mock.call_count, 2)
        self.assertEqual(out1["sessions"][0]["id"], "session-a")
        self.assertEqual(out2["sessions"][0]["id"], "session-b")

    def test_list_channel_sessions_response_reuses_cached_payload(self) -> None:
        payload = {
            "project_id": "task_dashboard",
            "channel_name": "子级02-CCB运行时（server-并发-安全-启动）",
            "primary_session_id": "session-a",
            "sessions": [{"id": "session-a"}],
            "count": 1,
        }
        with mock.patch.object(session_routes, "build_channel_sessions_payload", return_value=payload) as build_mock:
            code1, out1 = session_routes.list_channel_sessions_response(
                query_string="project_id=task_dashboard&channel_name=子级02-CCB运行时（server-并发-安全-启动）",
                session_store=object(),
                store=object(),
                environment_name="stable",
                worktree_root="/tmp/task-dashboard",
                apply_effective_primary_flags=lambda *_args, **_kwargs: [],
                decorate_sessions_display_fields=lambda rows: rows,
                apply_session_context_rows=lambda rows, **_kwargs: rows,
                apply_session_work_context=lambda row, **_kwargs: row,
                attach_runtime_state_to_sessions=lambda _store, rows, **_kwargs: rows,
                resolve_channel_primary_session_id=lambda *_args, **_kwargs: "session-a",
                heartbeat_runtime=None,
                load_session_heartbeat_config=lambda _row: {},
                heartbeat_summary_payload=lambda _row: {},
            )
            out1["sessions"][0]["id"] = "mutated"
            code2, out2 = session_routes.list_channel_sessions_response(
                query_string="project_id=task_dashboard&channel_name=子级02-CCB运行时（server-并发-安全-启动）",
                session_store=object(),
                store=object(),
                environment_name="stable",
                worktree_root="/tmp/task-dashboard",
                apply_effective_primary_flags=lambda *_args, **_kwargs: [],
                decorate_sessions_display_fields=lambda rows: rows,
                apply_session_context_rows=lambda rows, **_kwargs: rows,
                apply_session_work_context=lambda row, **_kwargs: row,
                attach_runtime_state_to_sessions=lambda _store, rows, **_kwargs: rows,
                resolve_channel_primary_session_id=lambda *_args, **_kwargs: "session-a",
                heartbeat_runtime=None,
                load_session_heartbeat_config=lambda _row: {},
                heartbeat_summary_payload=lambda _row: {},
            )

        self.assertEqual(code1, 200)
        self.assertEqual(code2, 200)
        self.assertEqual(build_mock.call_count, 1)
        self.assertEqual(out2["sessions"][0]["id"], "session-a")

    def test_get_session_detail_response_reuses_cached_payload(self) -> None:
        payload = {"id": "session-a", "task_tracking": {"version": "v1.1"}}

        class _SessionStore:
            def get_session(self, session_id: str):
                if session_id == "session-a":
                    return {"id": session_id, "project_id": "task_dashboard"}
                return None

        with mock.patch.object(session_routes, "build_session_detail_response", return_value=payload) as build_mock:
            code1, out1 = session_routes.get_session_detail_response(
                session_id="session-a",
                session_store=_SessionStore(),
                store=object(),
                environment_name="stable",
                worktree_root="/tmp/task-dashboard",
                heartbeat_runtime=None,
                infer_project_id_for_session=lambda *_args, **_kwargs: "task_dashboard",
                apply_effective_primary_flags=lambda *_args, **_kwargs: [],
                decorate_session_display_fields=lambda row: row,
                build_session_detail_payload=lambda *args, **kwargs: {},
                apply_session_work_context=lambda row, **_kwargs: row,
                build_project_session_runtime_index=lambda *_args, **_kwargs: {},
                build_session_runtime_state_for_row=lambda *_args, **_kwargs: {},
                load_session_heartbeat_config=lambda _row: {},
                heartbeat_summary_payload=lambda _row: {},
            )
            out1["task_tracking"]["version"] = "mutated"
            code2, out2 = session_routes.get_session_detail_response(
                session_id="session-a",
                session_store=_SessionStore(),
                store=object(),
                environment_name="stable",
                worktree_root="/tmp/task-dashboard",
                heartbeat_runtime=None,
                infer_project_id_for_session=lambda *_args, **_kwargs: "task_dashboard",
                apply_effective_primary_flags=lambda *_args, **_kwargs: [],
                decorate_session_display_fields=lambda row: row,
                build_session_detail_payload=lambda *args, **kwargs: {},
                apply_session_work_context=lambda row, **_kwargs: row,
                build_project_session_runtime_index=lambda *_args, **_kwargs: {},
                build_session_runtime_state_for_row=lambda *_args, **_kwargs: {},
                load_session_heartbeat_config=lambda _row: {},
                heartbeat_summary_payload=lambda _row: {},
            )

        self.assertEqual(code1, 200)
        self.assertEqual(code2, 200)
        self.assertEqual(build_mock.call_count, 1)
        self.assertEqual(out2["task_tracking"]["version"], "v1.1")

    def test_build_sessions_list_payload_keeps_task_tracking(self) -> None:
        class _SessionStore:
            def list_sessions(self, project_id: str, channel_name=None, include_deleted: bool = False):
                return [{"id": "session-a", "channel_name": "主体-总控（合并与验收）"}]

        with mock.patch.object(
            session_routes,
            "apply_session_task_tracking_rows",
            side_effect=lambda rows, **_kwargs: [
                {
                    **dict(rows[0]),
                    "task_tracking": {
                        "version": "v1.1",
                        "current_task_ref": {"task_id": "TASK-1", "task_path": "任务/one.md"},
                        "conversation_task_refs": [],
                        "recent_task_actions": [],
                    },
                }
            ],
        ):
            payload = session_routes.build_sessions_list_payload(
                session_store=_SessionStore(),
                store=object(),
                project_id="task_dashboard",
                environment_name="stable",
                worktree_root="/tmp/task-dashboard",
                apply_effective_primary_flags=lambda _store, _project_id, rows: rows,
                decorate_sessions_display_fields=lambda rows: rows,
                apply_session_context_rows=lambda rows, **_kwargs: rows,
                apply_session_work_context=lambda row, **_kwargs: row,
                attach_runtime_state_to_sessions=lambda _store, rows, **_kwargs: [
                    {**dict(rows[0]), "runtime_state": {"display_state": "idle", "updated_at": "2026-04-03T12:00:00+08:00"}}
                ],
                heartbeat_runtime=None,
                load_session_heartbeat_config=lambda _row: {},
                heartbeat_summary_payload=lambda _row: {},
            )

        tracking = payload["sessions"][0]["task_tracking"]
        self.assertEqual(tracking["version"], "v1.1")
        self.assertEqual((tracking.get("current_task_ref") or {}).get("task_id"), "TASK-1")


if __name__ == "__main__":
    unittest.main()
