from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any


OPEN_SOURCE_SYNC_SOURCE_REL = Path("docs/status-report/open-source-sync-board.json")


def _as_str(value: Any) -> str:
    return "" if value is None else str(value)


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _normalize_rows(rows: Any) -> list[dict[str, Any]]:
    return [_as_dict(row) for row in _as_list(rows) if isinstance(row, dict)]


def _git_stdout(repo_root: Path, *args: str) -> str:
    try:
        proc = subprocess.run(
            ["git", "-C", str(repo_root), *args],
            capture_output=True,
            text=True,
            check=False,
        )
    except Exception:
        return ""
    if proc.returncode != 0:
        return ""
    return _as_str(proc.stdout).strip()


def _git_ref_exists(repo_root: Path, ref: str) -> bool:
    return bool(_git_stdout(repo_root, "rev-parse", "--verify", "--quiet", ref))


def _git_exact_tag(repo_root: Path) -> str:
    return _git_stdout(repo_root, "describe", "--tags", "--exact-match", "HEAD")


def _git_diff_name_count(repo_root: Path, *args: str) -> int:
    output = _git_stdout(repo_root, "diff", "--name-only", *args)
    return len([line for line in output.splitlines() if line.strip()])


def _git_left_right_counts(repo_root: Path, left: str, right: str) -> tuple[int, int]:
    output = _git_stdout(repo_root, "rev-list", "--left-right", "--count", f"{left}...{right}")
    parts = output.split()
    if len(parts) != 2:
        return 0, 0
    try:
        return int(parts[0]), int(parts[1])
    except ValueError:
        return 0, 0


def _build_repo_snapshot(repo_root: Path) -> dict[str, Any]:
    dirty_output = _git_stdout(repo_root, "status", "--short")
    dirty_lines = [line for line in dirty_output.splitlines() if line.strip()]
    return {
        "repo_root": str(repo_root),
        "branch": _git_stdout(repo_root, "branch", "--show-current"),
        "head": _git_stdout(repo_root, "rev-parse", "--short", "HEAD"),
        "remote_origin": _git_stdout(repo_root, "remote", "get-url", "origin"),
        "dirty_count": len(dirty_lines),
        "dirty_preview": dirty_lines[:8],
    }


def _version_tone(*, dirty_count: int = 0, ahead: int = 0, behind: int = 0, exists: bool = True) -> str:
    if not exists:
        return "danger"
    if dirty_count > 0:
        return "danger"
    if ahead > 0 or behind > 0:
        return "warn"
    return "good"


def _format_relation(*, ahead: int, behind: int) -> str:
    if ahead == 0 and behind == 0:
        return "与上一轮冻结一致"
    if ahead > 0 and behind == 0:
        return f"领先冻结批次 {ahead} 个提交"
    if behind > 0 and ahead == 0:
        return f"落后冻结批次 {behind} 个提交"
    return f"与冻结批次双向分叉（领先 {ahead} / 落后 {behind}）"


def _build_release_judgement(*, private_exists: bool, freeze_exists: bool, public_exists: bool, dirty_count: int, ahead: int, behind: int) -> dict[str, Any]:
    if not private_exists or not freeze_exists or not public_exists:
        return {
            "status": "danger",
            "headline": "基础仓位不完整",
            "detail": "至少有一个关键仓位或冻结 ref 缺失，当前不能判断同步状态。",
        }
    if dirty_count > 0:
        return {
            "status": "danger",
            "headline": "不能直接发开源",
            "detail": "私有主仓仍是脏工作树，必须先冻结一个新批次，不能直接把当前状态导出去。",
        }
    if ahead > 0 or behind > 0:
        return {
            "status": "warn",
            "headline": "需要开新一轮同步批次",
            "detail": "私有主仓当前提交与上一轮冻结批次已经不一致，应先创建新的 export-prep，再让公开仓跟进。",
        }
    return {
        "status": "good",
        "headline": "当前可直接进入导出",
        "detail": "私有主仓当前提交与上一轮冻结批次一致，且工作树干净，可以进入公开候选导出。",
    }


def _build_version_board(script_dir: Path, board_source: dict[str, Any]) -> dict[str, Any]:
    source = _as_dict(board_source.get("version_board"))
    private_repo_path = Path(
        _as_str(source.get("private_repo_path")).strip() or script_dir
    )
    if not private_repo_path.is_absolute():
        private_repo_path = (script_dir / private_repo_path).resolve()
    public_repo_path = Path(
        _as_str(source.get("public_repo_path")).strip() or (script_dir / "../qoreon")
    )
    if not public_repo_path.is_absolute():
        public_repo_path = (script_dir / public_repo_path).resolve()

    freeze_ref = _as_str(source.get("freeze_ref")).strip()
    private_exists = private_repo_path.exists()
    public_exists = public_repo_path.exists()
    private_snapshot = _build_repo_snapshot(private_repo_path) if private_exists else {}
    public_snapshot = _build_repo_snapshot(public_repo_path) if public_exists else {}
    freeze_exists = bool(freeze_ref) and private_exists and _git_ref_exists(private_repo_path, freeze_ref)
    freeze_head = _git_stdout(private_repo_path, "rev-parse", "--short", freeze_ref) if freeze_exists else ""
    freeze_only, head_only = _git_left_right_counts(private_repo_path, freeze_ref, "HEAD") if freeze_exists else (0, 0)
    committed_diff_count = _git_diff_name_count(private_repo_path, freeze_ref, "HEAD") if freeze_exists else 0
    worktree_diff_count = _git_diff_name_count(private_repo_path, freeze_ref, "--") if freeze_exists else 0
    private_dirty_count = int(private_snapshot.get("dirty_count") or 0)
    public_dirty_count = int(public_snapshot.get("dirty_count") or 0)
    public_tag = _git_exact_tag(public_repo_path) if public_exists else ""
    relation_text = _format_relation(ahead=head_only, behind=freeze_only)
    judgement = _build_release_judgement(
        private_exists=private_exists,
        freeze_exists=freeze_exists,
        public_exists=public_exists,
        dirty_count=private_dirty_count,
        ahead=head_only,
        behind=freeze_only,
    )

    return {
        "title": _as_str(source.get("title")).strip() or "版本差距看板",
        "subtitle": _as_str(source.get("subtitle")).strip()
        or "把当前真源、上一轮冻结批次和公开候选放到同一屏上看，不再靠口头推断。",
        "decision": judgement,
        "cards": [
            {
                "title": _as_str(source.get("private_label")).strip() or "私有主仓当前",
                "status": _version_tone(dirty_count=private_dirty_count, ahead=head_only, behind=freeze_only, exists=private_exists),
                "headline": _as_str(private_snapshot.get("head")).strip() or "—",
                "kicker": _as_str(private_snapshot.get("branch")).strip() or "未识别分支",
                "facts": [
                    {"label": "仓位", "value": str(private_repo_path)},
                    {"label": "当前关系", "value": relation_text},
                    {"label": "未提交改动", "value": str(private_dirty_count)},
                ],
            },
            {
                "title": _as_str(source.get("freeze_label")).strip() or "上一轮冻结批次",
                "status": _version_tone(exists=freeze_exists, ahead=freeze_only, behind=head_only),
                "headline": freeze_ref or "—",
                "kicker": freeze_head or "未识别",
                "facts": [
                    {"label": "冻结提交", "value": freeze_head or "—"},
                    {"label": "与当前主仓", "value": relation_text},
                    {"label": "提交差异文件", "value": str(committed_diff_count)},
                ],
            },
            {
                "title": _as_str(source.get("public_label")).strip() or "公开仓当前候选",
                "status": _version_tone(dirty_count=public_dirty_count, exists=public_exists),
                "headline": _as_str(public_tag).strip() or _as_str(public_snapshot.get("head")).strip() or "—",
                "kicker": _as_str(public_snapshot.get("branch")).strip() or "未识别分支",
                "facts": [
                    {"label": "仓位", "value": str(public_repo_path)},
                    {"label": "当前提交", "value": _as_str(public_snapshot.get("head")).strip() or "—"},
                    {"label": "工作树状态", "value": "干净" if public_dirty_count == 0 else f"有 {public_dirty_count} 项改动"},
                ],
            },
        ],
        "metrics": [
            {
                "label": "主仓与冻结关系",
                "value": relation_text,
                "status": "good" if head_only == 0 and freeze_only == 0 else "warn",
            },
            {
                "label": "提交层差异文件",
                "value": str(committed_diff_count),
                "status": "good" if committed_diff_count == 0 else "warn",
            },
            {
                "label": "工作树相对冻结差异",
                "value": str(worktree_diff_count),
                "status": "good" if worktree_diff_count == 0 else "danger",
            },
            {
                "label": "当前脏工作树总量",
                "value": str(private_dirty_count),
                "status": "good" if private_dirty_count == 0 else "danger",
            },
            {
                "label": "是否可直接导出",
                "value": "可以" if judgement.get("status") == "good" else "不可以",
                "status": _as_str(judgement.get("status")).strip() or "warn",
            },
        ],
    }


def load_open_source_sync_source(script_dir: Path) -> tuple[Path, dict[str, Any], str]:
    source_path = (script_dir / OPEN_SOURCE_SYNC_SOURCE_REL).resolve()
    if not source_path.exists():
        return source_path, {}, f"missing: {source_path}"
    try:
        payload = json.loads(source_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return source_path, {}, f"invalid_json: {exc}"
    if not isinstance(payload, dict):
        return source_path, {}, "invalid_payload: root must be object"
    return source_path, payload, ""


def _build_repo_targets(script_dir: Path, rows: Any) -> list[dict[str, Any]]:
    targets: list[dict[str, Any]] = []
    for row in _normalize_rows(rows):
        raw_path = _as_str(row.get("path")).strip()
        path = (script_dir / raw_path).resolve() if raw_path and not raw_path.startswith("/") else Path(raw_path or script_dir).resolve()
        exists = path.exists()
        snapshot = _build_repo_snapshot(path) if exists else {}
        targets.append(
            {
                "label": _as_str(row.get("label")).strip() or "仓库",
                "role": _as_str(row.get("role")).strip(),
                "note": _as_str(row.get("note")).strip(),
                "path": str(path),
                "exists": exists,
                "snapshot": snapshot,
            }
        )
    return targets


def build_open_source_sync_page_data(
    script_dir: Path,
    *,
    generated_at: str,
    dashboard: dict[str, Any],
    links: dict[str, Any],
) -> dict[str, Any]:
    source_path, source_payload, source_error = load_open_source_sync_source(script_dir)

    page = _as_dict(source_payload.get("page"))
    hero = _as_dict(source_payload.get("hero"))

    board = {
        "title": _as_str(page.get("title")).strip() or "开源同步与协作排程",
        "subtitle": _as_str(page.get("subtitle")).strip()
        or "把真源、冻结批次、公开差异层和执行协作收敛到同一页。",
        "hero": {
            "kicker": _as_str(hero.get("kicker")).strip() or "Open Source Sync Board",
            "headline": _as_str(hero.get("headline")).strip() or "多仓同步固定工作法",
            "summary": _as_str(hero.get("summary")).strip(),
        },
        "version_board": _build_version_board(script_dir, source_payload),
        "summary_cards": _normalize_rows(source_payload.get("summary_cards")),
        "major_timeline": _normalize_rows(source_payload.get("major_timeline")),
        "repo_targets": _build_repo_targets(script_dir, source_payload.get("repo_targets")),
        "operating_model": _normalize_rows(source_payload.get("operating_model")),
        "execution_phases": _normalize_rows(source_payload.get("execution_phases")),
        "role_matrix": _normalize_rows(source_payload.get("role_matrix")),
        "difference_matrix": _normalize_rows(source_payload.get("difference_matrix")),
        "alignment_rules": [
            str(item).strip() for item in _as_list(source_payload.get("alignment_rules")) if str(item).strip()
        ],
        "current_links": _normalize_rows(source_payload.get("current_links")),
        "next_actions": _normalize_rows(source_payload.get("next_actions")),
        "references": _normalize_rows(source_payload.get("references")),
        "update_rules": [
            str(item).strip() for item in _as_list(source_payload.get("update_rules")) if str(item).strip()
        ],
        "source_file": str(source_path),
        "source_error": source_error,
        "rebuild_command": f"python3 {script_dir / 'build_project_task_dashboard.py'}",
    }

    return {
        "generated_at": generated_at,
        "dashboard": dashboard,
        "links": links,
        "open_source_sync": board,
    }
