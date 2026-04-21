#!/usr/bin/env bash
set -euo pipefail

CENTRAL_DIR="/home/eladr/personal-space/playground/claude-command-central"
FEED_PATH="${1:-$PWD/.claude-central/live.jsonl}"

mkdir -p "$(dirname "$FEED_PATH")"
: > "$FEED_PATH"

emit() {
  python3 "$CENTRAL_DIR/command_central.py" emit --feed "$FEED_PATH" "$@"
}

emit --type flow --title "Claude Code Mission" --status running --progress 1 --objective "Execute project task"
emit --type agent --agent orchestrator --phase PROMPT --status active --task "Reading operator request"
sleep 1

emit --type agent --agent planner --phase PLAN --status active --task "Splitting work into implementation and verification"
emit --type flow --status running --progress 20 --message "Plan complete, build starting"
sleep 1

emit --type agent --agent builder --phase BUILD --status active --task "Implementing requested change"
emit --type flow --status running --progress 50 --message "Core implementation in progress"
sleep 1

emit --type agent --agent reviewer --phase REVIEW --status active --task "Reviewing diff and edge cases"
emit --type flow --status running --progress 72 --message "Review started"
sleep 1

emit --type agent --agent qa --phase TEST --status active --task "Running tests and smoke checks"
emit --type flow --status running --progress 90 --message "Verification in progress"
sleep 1

emit --type agent --agent release --phase DEPLOY --status active --task "Preparing release handoff"
emit --type flow --status done --progress 100 --message "Task complete"
