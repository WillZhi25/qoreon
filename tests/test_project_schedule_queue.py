import json
import os
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest import mock
from urllib import request as url_request

import server


class TestProjectScheduleQueue(unittest.TestCase):
    def _write_task(
        self,
        root: Path,
        channel: str,
        filename: str,
        *,
        created_at: str = "",
        due: str = "",
    ) -> Path:
        task_dir = root / channel / "任务"
        task_dir.mkdir(parents=True, exist_ok=True)
        path = task_dir / filename
        body = "# 测试任务\n\n- test\n"
        if due:
            body += f"\n截止日期：{due}\n"
        if created_at:
            body = (
                "---\n"
                f"created_at: {created_at}\n"
                "---\n\n"
                + body
            )
        path.write_text(body, encoding="utf-8")
        return path

    def _fake_cfg(self, task_root: Path) -> dict:
        return {
            "projects": [
                {
                    "id": "task_dashboard",
                    "name": "Task Dashboard",
                    "task_root_rel": str(task_root),
                }
            ]
        }

    def test_build_project_schedule_queue_payload_counts_lane(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            base = Path(td)
            task_root = base / "任务规划"
            p1 = self._write_task(
                task_root,
                "主体-总控（合并与验收）",
                "【进行中】【任务】30-1-总控推进.md",
                created_at="2026-04-05T10:00:00+0800",
                due="2026-04-06 18:00",
            )
            p2 = self._write_task(task_root, "子级04-前端体验（task-overview 页面交互）", "【待处理】【任务】30-2-前端改造.md")
            p3 = self._write_task(task_root, "子级08-测试与验收（功能-回归-发布）", "【已完成】【任务】30-3-回归验收.md")

            store = server.RunStore(base / ".runs")
            fake_cfg = self._fake_cfg(task_root)
            with mock.patch("server._resolve_project_task_root", return_value=task_root), mock.patch(
                "server._load_dashboard_cfg_current",
                return_value=fake_cfg,
            ):
                server._save_project_schedule_queue(store, "task_dashboard", [str(p1), str(p2), str(p3)])
                payload = server._build_project_schedule_queue_payload(store, "task_dashboard")

            self.assertEqual(payload["count"], 3)
            self.assertEqual(payload["lane_counts"]["进行中"], 1)
            self.assertEqual(payload["lane_counts"]["待处理"], 1)
            self.assertEqual(payload["lane_counts"]["已完成"], 1)
            self.assertEqual(payload["items"][0]["order_index"], 1)
            self.assertTrue(payload["items"][0]["task_path"])
            self.assertEqual(payload["items"][0]["created_at"], "2026-04-05T10:00:00+0800")
            self.assertEqual(payload["items"][0]["due"], "2026-04-06 18:00")

    def test_collect_auto_inspection_candidates_scheduled_first(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            base = Path(td)
            task_root = base / "任务规划"
            done_task = self._write_task(task_root, "子级08-测试与验收（功能-回归-发布）", "【已完成】【任务】30-4-已完成任务.md")
            pending_task = self._write_task(task_root, "子级04-前端体验（task-overview 页面交互）", "【待处理】【任务】30-5-待处理任务.md")
            todo_task = self._write_task(task_root, "子级02-CCB运行时（server-并发-安全-启动）", "【待开始】【任务】30-6-待开始任务.md")

            store = server.RunStore(base / ".runs")
            fake_cfg = self._fake_cfg(task_root)
            with mock.patch("server._resolve_project_task_root", return_value=task_root), mock.patch(
                "server._load_dashboard_cfg_current",
                return_value=fake_cfg,
            ), mock.patch(
                "server._repo_root",
                return_value=base,
            ):
                server._save_project_schedule_queue(store, "task_dashboard", [str(done_task), str(pending_task)])
                out = server._collect_auto_inspection_candidates(
                    store,
                    "task_dashboard",
                    ["scheduled", "todo"],
                    limit=10,
                )

            cands = out["candidates"]
            summary = out["summary"]
            self.assertEqual(summary["selected_count"], 1)
            self.assertEqual(cands[0]["target_source"], "todo")
            self.assertEqual(cands[0]["task_path"], str(todo_task.relative_to(base)).replace("\\", "/"))

    def test_schedule_queue_payload_keeps_archived_visible_and_fills_active_item(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            base = Path(td)
            task_root = base / "任务规划"
            channel_dir = task_root / "主体-总控（合并与验收）"
            archived_task = self._write_task(
                task_root,
                "主体-总控（合并与验收）",
                "【进行中】【任务】A15-旧首项已归档.md",
            )
            archived_dir = channel_dir / "已完成"
            archived_dir.mkdir(parents=True, exist_ok=True)
            archived_target = archived_dir / archived_task.name
            archived_task.rename(archived_target)
            active_task = self._write_task(
                task_root,
                "子级02-CCB运行时（server-并发-安全-启动）",
                "【待开始】【任务】A15-新的活动首项.md",
            )

            store = server.RunStore(base / ".runs")
            fake_cfg = self._fake_cfg(task_root)
            with mock.patch("server._resolve_project_task_root", return_value=task_root), mock.patch(
                "server._load_dashboard_cfg_current",
                return_value=fake_cfg,
            ), mock.patch(
                "server._repo_root",
                return_value=base,
            ):
                server._save_project_schedule_queue(store, "task_dashboard", [str(archived_task), str(active_task)])
                payload = server._build_project_schedule_queue_payload(store, "task_dashboard")

            self.assertEqual(payload["count"], 2)
            self.assertFalse(payload["archived_only"])
            self.assertTrue(payload["has_active_item"])
            self.assertEqual(
                payload["active_task_path"],
                str(active_task.relative_to(base)).replace("\\", "/"),
            )
            self.assertEqual(payload["active_order_index"], 2)
            self.assertEqual(payload["eligible_active_count"], 1)
            first = payload["items"][0]
            self.assertEqual(first["lane"], "已归档")
            self.assertEqual(first["status_bucket"], "已归档")
            self.assertTrue(first["is_archived"])
            self.assertTrue(first["read_only"])
            self.assertTrue(first["exists"])
            self.assertTrue(str(first["archive_reason"]))
            self.assertEqual(
                first["archived_task_path"],
                str(archived_target.relative_to(base)).replace("\\", "/"),
            )

    def test_collect_auto_inspection_candidates_uses_active_scheduled_item_only(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            base = Path(td)
            task_root = base / "任务规划"
            channel_dir = task_root / "主体-总控（合并与验收）"
            archived_task = self._write_task(
                task_root,
                "主体-总控（合并与验收）",
                "【进行中】【任务】A15-归档旧任务.md",
            )
            archived_dir = channel_dir / "已完成"
            archived_dir.mkdir(parents=True, exist_ok=True)
            archived_task.rename(archived_dir / archived_task.name)
            pending_task = self._write_task(
                task_root,
                "子级04-前端体验（task-overview 页面交互）",
                "【待处理】【任务】A15-待处理但不能顶替活动首项.md",
            )
            todo_task = self._write_task(
                task_root,
                "子级02-CCB运行时（server-并发-安全-启动）",
                "【待开始】【任务】A15-应命中的活动首项.md",
            )
            store = server.RunStore(base / ".runs")
            fake_cfg = self._fake_cfg(task_root)
            with mock.patch("server._resolve_project_task_root", return_value=task_root), mock.patch(
                "server._load_dashboard_cfg_current",
                return_value=fake_cfg,
            ), mock.patch(
                "server._repo_root",
                return_value=base,
            ):
                server._save_project_schedule_queue(
                    store,
                    "task_dashboard",
                    [str(archived_task), str(pending_task), str(todo_task)],
                )
                out = server._collect_auto_inspection_candidates(
                    store,
                    "task_dashboard",
                    ["scheduled", "pending", "todo"],
                    limit=10,
                )

            cands = out["candidates"]
            self.assertEqual(cands[0]["target_source"], "scheduled")
            self.assertEqual(
                cands[0]["task_path"],
                str(todo_task.relative_to(base)).replace("\\", "/"),
            )
            self.assertEqual(cands[1]["target_source"], "pending")
            self.assertEqual(
                cands[1]["task_path"],
                str(pending_task.relative_to(base)).replace("\\", "/"),
            )

    def test_schedule_queue_legacy_short_path_can_be_matched_and_migrated(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            base = Path(td)
            task_root = base / "任务规划"
            task_path = self._write_task(
                task_root,
                "主体-总控（合并与验收）",
                "【进行中】【任务】31-2-排期队列路径兼容修复.md",
            )
            fake_cfg = self._fake_cfg(task_root)
            store = server.RunStore(base / ".runs")

            short_path = "任务规划/主体-总控（合并与验收）/任务/【进行中】【任务】31-2-排期队列路径兼容修复.md"
            with mock.patch("server._resolve_project_task_root", return_value=task_root), mock.patch(
                "server._load_dashboard_cfg_current",
                return_value=fake_cfg,
            ):
                server._save_project_schedule_queue(store, "task_dashboard", [short_path])
                payload = server._build_project_schedule_queue_payload(store, "task_dashboard")
                out = server._collect_auto_inspection_candidates(
                    store,
                    "task_dashboard",
                    ["scheduled"],
                    limit=10,
                )

            self.assertEqual(payload["count"], 1)
            self.assertTrue(payload["items"][0]["exists"])
            self.assertEqual(
                payload["items"][0]["task_path"],
                server._normalize_task_path_identity(str(task_path)),
            )
            self.assertEqual(out["summary"]["selected_count"], 1)
            self.assertEqual(
                out["candidates"][0]["task_path"],
                server._normalize_task_path_identity(str(task_path)),
            )

    def test_collect_candidates_supports_tail_alias_when_path_forms_mismatch(self) -> None:
        store = server.RunStore(Path(tempfile.gettempdir()) / f".runs-{os.getpid()}-alias")
        task_abs = "/tmp/workspace-x/任务规划/子级04-前端体验（task-overview 页面交互）/任务/【进行中】【任务】46-1-别名命中测试.md"
        row = {
            "task_path": task_abs,
            "title": "46-1-别名命中测试",
            "status": "进行中",
            "status_bucket": "进行中",
            "channel_name": "子级04-前端体验（task-overview 页面交互）",
            "updated_at": "2026-03-03T10:00:00+0800",
            "updated_ts": 1.0,
        }
        short_path = "任务规划/子级04-前端体验（task-overview 页面交互）/任务/【进行中】【任务】46-1-别名命中测试.md"
        with mock.patch("server._list_project_task_items", return_value=[row]), mock.patch(
            "server._load_project_schedule_queue",
            return_value={"project_id": "task_dashboard", "task_paths": [short_path], "updated_at": ""},
        ):
            out = server._collect_auto_inspection_candidates(store, "task_dashboard", ["scheduled"], limit=10)

        self.assertEqual(out["summary"]["selected_count"], 1)
        self.assertEqual(out["summary"]["skipped_missing"], 0)
        self.assertGreaterEqual(int(out["summary"].get("alias_hit") or 0), 1)
        self.assertEqual(out["candidates"][0]["task_path"], server._normalize_task_path_identity(task_abs))

    def test_schedule_queue_api_get_and_post_replace(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            base = Path(td)
            task_root = base / "任务规划"
            task_path = self._write_task(
                task_root,
                "主体-总控（合并与验收）",
                "【进行中】【任务】30-7-排期接口测试.md",
            )
            fake_cfg = self._fake_cfg(task_root)

            static_root = base / "static"
            static_root.mkdir(parents=True, exist_ok=True)
            (static_root / "index.html").write_text("ok", encoding="utf-8")

            store = server.RunStore(base / ".runs")
            session_store = server.SessionStore(base_dir=base)
            session_binding_store = server.SessionBindingStore(runs_dir=store.runs_dir)
            project_runtime = server.ProjectSchedulerRuntimeRegistry(store=store)
            task_push_runtime = server.TaskPushRuntimeRegistry(store=store, session_store=session_store)
            task_plan_runtime = server.TaskPlanRuntimeRegistry(
                store=store,
                session_store=session_store,
                task_push_runtime=task_push_runtime,
            )
            assist_runtime = server.AssistRequestRuntimeRegistry(store=store, session_store=session_store)
            self.addCleanup(project_runtime.shutdown)
            self.addCleanup(task_push_runtime.shutdown)

            httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
            httpd.static_root = static_root  # type: ignore[attr-defined]
            httpd.allow_root = static_root  # type: ignore[attr-defined]
            httpd.store = store  # type: ignore[attr-defined]
            httpd.session_store = session_store  # type: ignore[attr-defined]
            httpd.session_binding_store = session_binding_store  # type: ignore[attr-defined]
            httpd.http_log = base / ".run" / "test.http.log"  # type: ignore[attr-defined]
            httpd.project_scheduler_runtime = project_runtime  # type: ignore[attr-defined]
            httpd.task_push_runtime = task_push_runtime  # type: ignore[attr-defined]
            httpd.task_plan_runtime = task_plan_runtime  # type: ignore[attr-defined]
            httpd.assist_request_runtime = assist_runtime  # type: ignore[attr-defined]
            httpd.scheduler = None  # type: ignore[attr-defined]

            t = threading.Thread(target=httpd.serve_forever, daemon=True)
            t.start()
            port = int(httpd.server_address[1])
            base_url = f"http://127.0.0.1:{port}"
            get_url = f"{base_url}/api/projects/task_dashboard/schedule-queue"

            try:
                with mock.patch("server._find_project_cfg", return_value={"id": "task_dashboard"}), mock.patch(
                    "server._resolve_project_task_root",
                    return_value=task_root,
                ), mock.patch("server._load_dashboard_cfg_current", return_value=fake_cfg):
                    with url_request.urlopen(get_url, timeout=5) as resp:
                        payload = json.loads(resp.read().decode("utf-8"))
                    self.assertEqual(payload["count"], 0)

                    req = url_request.Request(
                        get_url,
                        data=json.dumps(
                            {"action": "replace", "task_paths": [str(task_path)]},
                            ensure_ascii=False,
                        ).encode("utf-8"),
                        headers={
                            "Content-Type": "application/json",
                            "X-TaskDashboard-Token": "test-token",
                        },
                        method="POST",
                    )
                    with mock.patch.dict(os.environ, {"TASK_DASHBOARD_TOKEN": "test-token"}, clear=False):
                        with url_request.urlopen(req, timeout=5) as resp:
                            posted = json.loads(resp.read().decode("utf-8"))
                    self.assertTrue(posted["ok"])
                    self.assertEqual(posted["queue"]["count"], 1)

                    with url_request.urlopen(get_url, timeout=5) as resp:
                        payload2 = json.loads(resp.read().decode("utf-8"))
                    self.assertEqual(payload2["count"], 1)
                    self.assertEqual(payload2["items"][0]["task_path"], server._normalize_task_path_identity(str(task_path)))
            finally:
                httpd.shutdown()
                t.join(timeout=2)
                httpd.server_close()

    def test_schedule_queue_api_add_keeps_archived_sample_visible(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            base = Path(td)
            task_root = base / "任务规划"
            active_channel_dir = task_root / "主体-总控（合并与验收）"
            active_task = self._write_task(
                task_root,
                "主体-总控（合并与验收）",
                "【进行中】【任务】A15-活动首项.md",
            )
            archived_src = self._write_task(
                task_root,
                "子级02-CCB运行时（server-并发-安全-启动）",
                "【已完成】【任务】A15-真实归档样本.md",
            )
            archived_dir = task_root / "子级02-CCB运行时（server-并发-安全-启动）" / "已完成"
            archived_dir.mkdir(parents=True, exist_ok=True)
            archived_task = archived_dir / archived_src.name
            archived_src.rename(archived_task)
            fake_cfg = self._fake_cfg(task_root)

            static_root = base / "static"
            static_root.mkdir(parents=True, exist_ok=True)
            (static_root / "index.html").write_text("ok", encoding="utf-8")

            store = server.RunStore(base / ".runs")
            session_store = server.SessionStore(base_dir=base)
            session_binding_store = server.SessionBindingStore(runs_dir=store.runs_dir)
            project_runtime = server.ProjectSchedulerRuntimeRegistry(store=store)
            task_push_runtime = server.TaskPushRuntimeRegistry(store=store, session_store=session_store)
            task_plan_runtime = server.TaskPlanRuntimeRegistry(
                store=store,
                session_store=session_store,
                task_push_runtime=task_push_runtime,
            )
            assist_runtime = server.AssistRequestRuntimeRegistry(store=store, session_store=session_store)
            self.addCleanup(project_runtime.shutdown)
            self.addCleanup(task_push_runtime.shutdown)

            httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
            httpd.static_root = static_root  # type: ignore[attr-defined]
            httpd.allow_root = static_root  # type: ignore[attr-defined]
            httpd.store = store  # type: ignore[attr-defined]
            httpd.session_store = session_store  # type: ignore[attr-defined]
            httpd.session_binding_store = session_binding_store  # type: ignore[attr-defined]
            httpd.http_log = base / ".run" / "test.http.log"  # type: ignore[attr-defined]
            httpd.project_scheduler_runtime = project_runtime  # type: ignore[attr-defined]
            httpd.task_push_runtime = task_push_runtime  # type: ignore[attr-defined]
            httpd.task_plan_runtime = task_plan_runtime  # type: ignore[attr-defined]
            httpd.assist_request_runtime = assist_runtime  # type: ignore[attr-defined]
            httpd.scheduler = None  # type: ignore[attr-defined]

            t = threading.Thread(target=httpd.serve_forever, daemon=True)
            t.start()
            port = int(httpd.server_address[1])
            base_url = f"http://127.0.0.1:{port}"
            url = f"{base_url}/api/projects/task_dashboard/schedule-queue"

            try:
                with mock.patch("server._find_project_cfg", return_value={"id": "task_dashboard"}), mock.patch(
                    "server._resolve_project_task_root",
                    return_value=task_root,
                ), mock.patch("server._load_dashboard_cfg_current", return_value=fake_cfg):
                    with mock.patch.dict(os.environ, {"TASK_DASHBOARD_TOKEN": "test-token"}, clear=False):
                        req_replace = url_request.Request(
                            url,
                            data=json.dumps(
                                {"action": "replace", "task_paths": [str(active_task)]},
                                ensure_ascii=False,
                            ).encode("utf-8"),
                            headers={
                                "Content-Type": "application/json",
                                "X-TaskDashboard-Token": "test-token",
                            },
                            method="POST",
                        )
                        with url_request.urlopen(req_replace, timeout=5) as resp:
                            json.loads(resp.read().decode("utf-8"))

                        req_add = url_request.Request(
                            url,
                            data=json.dumps(
                                {"action": "add", "task_path": str(archived_task)},
                                ensure_ascii=False,
                            ).encode("utf-8"),
                            headers={
                                "Content-Type": "application/json",
                                "X-TaskDashboard-Token": "test-token",
                            },
                            method="POST",
                        )
                        with url_request.urlopen(req_add, timeout=5) as resp:
                            posted = json.loads(resp.read().decode("utf-8"))

                    queue = posted["queue"]
                    self.assertEqual(queue["count"], 2)
                    self.assertEqual(queue["active_task_path"], server._normalize_task_path_identity(str(active_task)))
                    archived = next(
                        row for row in queue["items"]
                        if row["task_path"] == server._normalize_task_path_identity(str(archived_task))
                    )
                    self.assertEqual(archived["activity_state"], "archived")
                    self.assertTrue(archived["is_archived"])
                    self.assertTrue(archived["read_only"])
            finally:
                httpd.shutdown()
                t.join(timeout=2)
                httpd.server_close()


if __name__ == "__main__":
    unittest.main()
