import tempfile
import unittest
from pathlib import Path
from unittest import mock

from task_dashboard.runtime import session_views
from task_dashboard.runtime import session_task_tracking


class SessionTaskTrackingCacheTests(unittest.TestCase):
    def setUp(self) -> None:
        session_task_tracking._clear_task_tracking_file_caches()

    def _task_file(self, repo_root: Path) -> Path:
        task_path = (
            repo_root
            / "任务规划"
            / "辅助04-原型设计与Demo可视化（静态数据填充-业务规格确认）"
            / "任务"
            / "【进行中】【任务】20260402-session-detail-cache-smoke.md"
        )
        task_path.parent.mkdir(parents=True, exist_ok=True)
        task_path.write_text("# 任务目标\n- 验证缓存\n", encoding="utf-8")
        return task_path

    def test_load_task_summary_text_reuses_file_cache_across_requests(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            repo_root = Path(td)
            task_file = self._task_file(repo_root)
            session = {"worktree_root": str(repo_root)}
            rel_path = str(task_file.relative_to(repo_root))

            with mock.patch(
                "task_dashboard.runtime.session_task_tracking.safe_read_text",
                return_value="# 任务目标\n- 验证缓存\n",
            ) as read_mock:
                first = session_task_tracking._load_task_summary_text(
                    session=session,
                    project_id="task_dashboard",
                    task_path=rel_path,
                    cache={},
                    resolve_cache={},
                )
                second = session_task_tracking._load_task_summary_text(
                    session=session,
                    project_id="task_dashboard",
                    task_path=rel_path,
                    cache={},
                    resolve_cache={},
                )

        self.assertEqual(first, "验证缓存")
        self.assertEqual(second, "验证缓存")
        self.assertEqual(read_mock.call_count, 1)

    def test_load_task_harness_roles_reuses_file_cache_across_requests(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            repo_root = Path(td)
            task_file = self._task_file(repo_root)
            session = {"worktree_root": str(repo_root)}
            rel_path = str(task_file.relative_to(repo_root))
            harness_roles = {
                "main_owner": {"agent_name": "产品策划-任务派发"},
                "collaborators": [],
                "validators": [],
                "challengers": [],
                "backup_owners": [],
                "management_slot": [],
                "custom_roles": [],
            }

            with mock.patch(
                "task_dashboard.runtime.session_task_tracking.safe_read_text",
                return_value="# 任务目标\n- 验证缓存\n",
            ) as read_mock, mock.patch(
                "task_dashboard.runtime.session_task_tracking.parse_task_harness",
                return_value=harness_roles,
            ) as parse_mock:
                first = session_task_tracking._load_task_harness_roles(
                    session=session,
                    project_id="task_dashboard",
                    task_path=rel_path,
                    cache={},
                    resolve_cache={},
                )
                second = session_task_tracking._load_task_harness_roles(
                    session=session,
                    project_id="task_dashboard",
                    task_path=rel_path,
                    cache={},
                    resolve_cache={},
                )

        self.assertEqual(first.get("main_owner"), {"agent_name": "产品策划-任务派发"})
        self.assertEqual(second.get("main_owner"), {"agent_name": "产品策划-任务派发"})
        self.assertEqual(read_mock.call_count, 1)
        self.assertEqual(parse_mock.call_count, 1)

    def test_load_task_time_meta_reuses_file_cache_with_front_matter_created_at(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            repo_root = Path(td)
            task_file = self._task_file(repo_root)
            session = {"worktree_root": str(repo_root)}
            rel_path = str(task_file.relative_to(repo_root))
            markdown = (
                "---\n"
                "task_id: task_20260405_cache_smoke\n"
                "created_at: 2026-04-05T12:34:00+0800\n"
                "---\n\n"
                "# 测试任务\n\n"
                "截止日期：2026-04-06 18:00\n"
            )
            task_file.write_text(markdown, encoding="utf-8")

            with mock.patch(
                "task_dashboard.runtime.session_task_tracking.safe_read_text",
                return_value=markdown,
            ) as read_mock:
                first = session_task_tracking._load_task_time_meta(
                    session=session,
                    project_id="task_dashboard",
                    task_path=rel_path,
                    cache={},
                    resolve_cache={},
                )
                second = session_task_tracking._load_task_time_meta(
                    session=session,
                    project_id="task_dashboard",
                    task_path=rel_path,
                    cache={},
                    resolve_cache={},
                )

        self.assertEqual(first["created_at"], "2026-04-05T12:34:00+0800")
        self.assertEqual(first["due"], "2026-04-06 18:00")
        self.assertEqual(second, first)
        self.assertEqual(read_mock.call_count, 1)

    def test_build_prefetched_session_run_map_groups_by_related_session_once(self) -> None:
        class _Store:
            def __init__(self) -> None:
                self.calls = 0

            def list_runs(self, **kwargs):
                self.calls += 1
                return [
                    {"id": "run-a", "sessionId": "session-a"},
                    {"id": "run-b", "sessionId": "session-b", "callback_to": {"session_id": "session-a"}},
                    {"id": "run-c", "sessionId": "session-c"},
                ]

        store = _Store()
        grouped = session_task_tracking.build_prefetched_session_run_map(
            store=store,
            project_id="task_dashboard",
            session_ids=["session-a", "session-b"],
            per_session_limit=4,
        )

        self.assertEqual(store.calls, 1)
        self.assertEqual([row["id"] for row in grouped["session-a"]], ["run-a", "run-b"])
        self.assertEqual([row["id"] for row in grouped["session-b"]], ["run-b"])

    def test_apply_session_task_tracking_rows_prefetches_project_runs_once(self) -> None:
        rows = [
            {"id": "session-a", "runtime_state": {"updated_at": "2026-04-06T10:00:00+0800"}},
            {"id": "session-b", "runtime_state": {"updated_at": "2026-04-06T10:01:00+0800"}},
        ]
        prefetched = {
            "session-a": [{"id": "run-a", "sessionId": "session-a"}],
            "session-b": [{"id": "run-b", "sessionId": "session-b"}],
        }
        with mock.patch.object(
            session_views,
            "build_prefetched_session_run_map",
            return_value=prefetched,
        ) as prefetch_mock, mock.patch.object(
            session_views,
            "build_session_task_tracking",
            side_effect=lambda **kwargs: {
                "version": "v1.1",
                "current_task_ref": {"task_path": kwargs["session_id"]},
                "conversation_task_refs": [],
                "recent_task_actions": [],
            },
        ) as tracking_mock:
            out = session_views.apply_session_task_tracking_rows(
                rows,
                project_id="task_dashboard",
                store=object(),
            )

        self.assertEqual(prefetch_mock.call_count, 1)
        self.assertEqual(tracking_mock.call_count, 2)
        self.assertEqual(out[0]["task_tracking"]["current_task_ref"]["task_path"], "session-a")
        self.assertEqual(out[1]["task_tracking"]["current_task_ref"]["task_path"], "session-b")

    def test_build_session_task_tracking_prefers_owner_complete_task_matched_to_session(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            repo_root = Path(td)
            sid = "019d5945-0d1d-78b1-b5c9-8ed813c8ccaa"
            channel_name = "子级04-前端体验（task-overview 页面交互）"
            foreign_task = (
                repo_root
                / "任务规划"
                / "主体-总控（合并与验收）"
                / "任务"
                / "【进行中】【任务】20260404-聊天区业务表达优化方案对照与动态演示定稿.md"
            )
            open_other_task = (
                repo_root
                / "任务规划"
                / "辅助04-原型设计与Demo可视化（静态数据填充-业务规格确认）"
                / "任务"
                / "【进行中】【任务】20260405-Agent维度任务可见性与进程列表任务数量标记编排.md"
            )
            owned_completed_task = (
                repo_root
                / "任务规划"
                / "辅助04-原型设计与Demo可视化（静态数据填充-业务规格确认）"
                / "已完成"
                / "任务"
                / "【已完成】【任务】20260406-会话右侧任务卡统一与当前任务横条实施编排.md"
            )
            foreign_task.parent.mkdir(parents=True, exist_ok=True)
            open_other_task.parent.mkdir(parents=True, exist_ok=True)
            owned_completed_task.parent.mkdir(parents=True, exist_ok=True)
            foreign_task.write_text(
                "---\n"
                "task_id: master_20260404_chat_expression_solution_compare_and_demo\n"
                "created_at: 2026-04-04T15:03:16+0800\n"
                "---\n\n"
                "# 【进行中】【任务】20260404-聊天区业务表达优化方案对照与动态演示定稿\n"
                "## 当前结论\n"
                "- 这是跨通道主线任务。\n",
                encoding="utf-8",
            )
            open_other_task.write_text(
                "---\n"
                "task_id: task_20260405_0035a002\n"
                "created_at: 2026-04-05T00:35:00+0800\n"
                "---\n\n"
                "# 【进行中】【任务】20260405-Agent维度任务可见性与进程列表任务数量标记编排\n\n"
                "## Harness责任位\n"
                "### 主负责位\n"
                "- `产品策划-任务派发`\n",
                encoding="utf-8",
            )
            owned_completed_task.write_text(
                "---\n"
                "task_id: task_20260406_2013a001\n"
                "created_at: 2026-04-06T20:13:00+0800\n"
                "---\n\n"
                "# 【已完成】【任务】20260406-会话右侧任务卡统一与当前任务横条实施编排\n\n"
                "## Harness责任位\n"
                "### 主负责位\n"
                "- `前端页面-规范策划`\n"
                "- session_id：`019d5945-0d1d-78b1-b5c9-8ed813c8ccaa`\n",
                encoding="utf-8",
            )

            session = {
                "id": sid,
                "alias": "前端页面-规范策划",
                "channel_name": channel_name,
                "worktree_root": str(repo_root),
            }
            runs = [
                {
                    "id": "run-foreign",
                    "sessionId": sid,
                    "task_path": str(foreign_task.relative_to(repo_root)).replace("\\", "/"),
                    "createdAt": "2026-04-06T21:00:00+0800",
                    "finishedAt": "2026-04-06T21:01:00+0800",
                    "status": "done",
                    "lastPreview": "跨通道主线有更新。",
                },
                {
                    "id": "run-open-other",
                    "sessionId": sid,
                    "business_refs": [
                        {
                            "type": "任务",
                            "path": str(open_other_task.relative_to(repo_root)).replace("\\", "/"),
                            "task_id": "task_20260405_0035a002",
                        }
                    ],
                    "createdAt": "2026-04-06T21:02:00+0800",
                    "finishedAt": "2026-04-06T21:03:00+0800",
                    "status": "done",
                    "lastPreview": "B/C 主线已继续推进。",
                },
                {
                    "id": "run-owned-completed",
                    "sessionId": sid,
                    "business_refs": [
                        {
                            "type": "任务",
                            "path": str(owned_completed_task.relative_to(repo_root)).replace("\\", "/"),
                            "task_id": "task_20260406_2013a001",
                        }
                    ],
                    "createdAt": "2026-04-06T21:04:00+0800",
                    "finishedAt": "2026-04-06T21:05:00+0800",
                    "status": "done",
                    "lastPreview": "前端已完成当前任务横条实施。",
                },
            ]

            tracking = session_task_tracking.build_session_task_tracking(
                session=session,
                store=object(),
                project_id="task_dashboard",
                session_id=sid,
                runtime_state={"updated_at": "2026-04-06T21:05:00+0800"},
                runs=runs,
            )

        current_ref = tracking.get("current_task_ref") or {}
        self.assertEqual(
            current_ref.get("task_path"),
            str(owned_completed_task.relative_to(repo_root)).replace("\\", "/"),
        )
        self.assertEqual(
            ((current_ref.get("main_owner") or {}).get("agent_name") or ""),
            "前端页面-规范策划",
        )
        self.assertEqual(current_ref.get("task_primary_status"), "已完成")

    def test_resolve_task_reference_prefers_project_source_repo_when_session_worktree_stale(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            base = Path(td)
            stale_repo = base / "stale"
            live_repo = base / "live"
            rel_path = "任务规划/辅助04/任务/【进行中】【任务】20260406-创建时间显示修复.md"
            stale_file = stale_repo / rel_path
            live_file = live_repo / rel_path
            stale_file.parent.mkdir(parents=True, exist_ok=True)
            live_file.parent.mkdir(parents=True, exist_ok=True)
            stale_file.write_text(
                "---\n"
                "task_id: task_20260406_created_at_fix\n"
                "parent_task_id: \n"
                "---\n\n"
                "# stale\n",
                encoding="utf-8",
            )
            live_file.write_text(
                "---\n"
                "task_id: task_20260406_created_at_fix\n"
                "parent_task_id: \n"
                "created_at: 2026-04-06T11:37:11+0800\n"
                "---\n\n"
                "# live\n",
                encoding="utf-8",
            )
            session = {
                "worktree_root": str(stale_repo),
                "channel_name": "辅助04",
                "project_execution_context": {
                    "source": {"workdir": str(live_repo)},
                },
            }

            resolved = session_task_tracking._resolve_task_reference_for_session(
                session=session,
                project_id="task_dashboard",
                task_path=rel_path,
                cache={},
            )

        self.assertEqual(resolved["created_at"], "2026-04-06T11:37:11+0800")
        self.assertEqual(resolved["task_path"], rel_path)

    def test_resolve_task_reference_recovers_prefixed_and_encoded_business_ref_paths(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            repo_root = Path(td)
            rel_path = "任务规划/子级04-前端体验（task-overview 页面交互）/任务/【已完成】【任务】20260326-通道阶段工作总结与存量知识梳理.md"
            task_file = repo_root / rel_path
            task_file.parent.mkdir(parents=True, exist_ok=True)
            task_file.write_text(
                "---\n"
                "task_id: task_20260326_summary\n"
                "parent_task_id: \n"
                "created_at: 2026-03-26T09:00:00+0800\n"
                "---\n\n"
                "# summary\n",
                encoding="utf-8",
            )
            session = {
                "worktree_root": str(repo_root),
                "channel_name": "子级04-前端体验（task-overview 页面交互）",
            }

            resolved = session_task_tracking._resolve_task_reference_for_session(
                session=session,
                project_id="task_dashboard",
                task_path="子级04-前端体验（task-overview%20页面交互）/任务/【已完成】【任务】20260326-通道阶段工作总结与存量知识梳理.md",
                cache={},
            )

        self.assertEqual(resolved["created_at"], "2026-03-26T09:00:00+0800")
        self.assertEqual(resolved["task_path"], rel_path)


if __name__ == "__main__":
    unittest.main()
