# Claude Multi-Agent Runbook

## Purpose

Run multiple Claude CLI workers in parallel for V0.1 implementation tasks.

## Files

1. Orchestrator script:
   - `scripts/orchestrate_claude_agents.py`
2. Task plan:
   - `agent-plans/v0.1-demo-plan.json`

## Command

```bash
python3 scripts/orchestrate_claude_agents.py \
  --plan agent-plans/v0.1-demo-plan.json \
  --workdir . \
  --max-workers 3 \
  --permission-mode bypassPermissions \
  --timeout-sec 180
```

Optional model override:

```bash
python3 scripts/orchestrate_claude_agents.py \
  --plan agent-plans/v0.1-demo-plan.json \
  --workdir . \
  --max-workers 3 \
  --model sonnet \
  --permission-mode bypassPermissions \
  --timeout-sec 180
```

## Output

Each run creates:

1. `runs/claude-agents-<timestamp>/summary.json`
2. Per-task folder:
   - `stdout.txt`
   - `stderr.txt`
   - `prompt.txt`

## Notes

1. This orchestrator collects outputs; it does not auto-merge code changes.
2. Recommended flow:
   - run parallel workers
   - review outputs
   - apply selected changes in controlled order
