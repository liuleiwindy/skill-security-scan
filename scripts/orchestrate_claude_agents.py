#!/usr/bin/env python3
"""
Run multiple Claude CLI workers in parallel from a JSON task plan.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import datetime as dt
import json
import subprocess
import textwrap
from pathlib import Path
from typing import Any


def _to_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return str(value)


def _load_plan(plan_path: Path) -> dict[str, Any]:
    with plan_path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if "tasks" not in data or not isinstance(data["tasks"], list):
        raise ValueError("Invalid plan: expected top-level 'tasks' array.")
    return data


def _task_prompt(task: dict[str, Any]) -> str:
    role = task.get("role", "worker")
    task_id = task.get("id", "unknown-task")
    objective = task.get("objective", "")
    constraints = task.get("constraints", [])
    output_format = task.get("output_format", [])
    file_scope = task.get("file_scope", [])

    return textwrap.dedent(
        f"""
        You are Claude running as role: {role}.
        Task ID: {task_id}

        Objective:
        {objective}

        File scope (must stay within these paths if provided):
        {json.dumps(file_scope, ensure_ascii=False)}

        Constraints:
        {json.dumps(constraints, ensure_ascii=False)}

        Output format requirements:
        {json.dumps(output_format, ensure_ascii=False)}
        """
    ).strip()


def _run_task(
    *,
    task: dict[str, Any],
    workdir: Path,
    run_dir: Path,
    model: str | None,
    permission_mode: str | None,
    timeout_sec: int,
) -> dict[str, Any]:
    task_id = task.get("id", "unknown-task")
    prompt = _task_prompt(task)

    cmd = ["claude", "-p", prompt]
    if model:
        cmd.extend(["--model", model])
    if permission_mode:
        cmd.extend(["--permission-mode", permission_mode])

    try:
        proc = subprocess.run(
            cmd,
            cwd=str(workdir),
            text=True,
            capture_output=True,
            timeout=timeout_sec,
        )
    except subprocess.TimeoutExpired as exc:
        task_dir = run_dir / task_id
        task_dir.mkdir(parents=True, exist_ok=True)
        (task_dir / "stdout.txt").write_text(_to_text(exc.stdout), encoding="utf-8")
        (task_dir / "stderr.txt").write_text(
            _to_text(exc.stderr) + f"\n[orchestrator] timeout after {timeout_sec}s\n",
            encoding="utf-8",
        )
        (task_dir / "prompt.txt").write_text(prompt, encoding="utf-8")
        return {
            "task_id": task_id,
            "returncode": 124,
            "stdout_file": str(task_dir / "stdout.txt"),
            "stderr_file": str(task_dir / "stderr.txt"),
            "prompt_file": str(task_dir / "prompt.txt"),
        }

    task_dir = run_dir / task_id
    task_dir.mkdir(parents=True, exist_ok=True)
    (task_dir / "stdout.txt").write_text(proc.stdout, encoding="utf-8")
    (task_dir / "stderr.txt").write_text(proc.stderr, encoding="utf-8")
    (task_dir / "prompt.txt").write_text(prompt, encoding="utf-8")

    return {
        "task_id": task_id,
        "returncode": proc.returncode,
        "stdout_file": str(task_dir / "stdout.txt"),
        "stderr_file": str(task_dir / "stderr.txt"),
        "prompt_file": str(task_dir / "prompt.txt"),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Parallel Claude agent orchestrator")
    parser.add_argument("--plan", required=True, help="Path to JSON plan")
    parser.add_argument("--workdir", required=True, help="Working directory for Claude tasks")
    parser.add_argument("--max-workers", type=int, default=3, help="Parallel workers")
    parser.add_argument("--model", default=None, help="Optional Claude model alias")
    parser.add_argument(
        "--permission-mode",
        default="bypassPermissions",
        help="Claude permission mode (default: bypassPermissions)",
    )
    parser.add_argument(
        "--timeout-sec",
        type=int,
        default=180,
        help="Per-task timeout in seconds",
    )
    args = parser.parse_args()

    plan_path = Path(args.plan).resolve()
    workdir = Path(args.workdir).resolve()
    plan = _load_plan(plan_path)

    ts = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir = workdir / "runs" / f"claude-agents-{ts}"
    run_dir.mkdir(parents=True, exist_ok=True)

    tasks = plan["tasks"]
    results: list[dict[str, Any]] = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.max_workers) as pool:
        futures = [
            pool.submit(
                _run_task,
                task=task,
                workdir=workdir,
                run_dir=run_dir,
                model=args.model,
                permission_mode=args.permission_mode,
                timeout_sec=args.timeout_sec,
            )
            for task in tasks
        ]
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())

    summary = {
        "plan": str(plan_path),
        "workdir": str(workdir),
        "run_dir": str(run_dir),
        "task_count": len(tasks),
        "results": sorted(results, key=lambda x: x["task_id"]),
    }
    summary_path = run_dir / "summary.json"
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    failed = [r for r in summary["results"] if r["returncode"] != 0]
    print(f"Run completed. Summary: {summary_path}")
    print(f"Tasks total={len(tasks)} failed={len(failed)}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
