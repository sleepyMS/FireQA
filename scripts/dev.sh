#!/usr/bin/env bash
# ============================================================
# FireQA — tmux 개발 환경 실행 스크립트
#
# 레이아웃:
#  Window 0 (server): Next.js dev server :3000
#  Window 1 (claude): Claude Code
#
# 사용법:
#   bash scripts/dev.sh            # 현재 세션의 server 윈도우에서 실행
#   bash scripts/dev.sh --new      # 새 fireqa 세션 생성 후 구성
# ============================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-}"

# ── 타겟 세션/윈도우 결정 ──────────────────────────────────
if [[ "$MODE" == "--new" ]]; then
  SESSION="fireqa"
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "이미 '$SESSION' 세션이 있습니다. tmux attach -t $SESSION"
    exit 1
  fi
  tmux new-session -d -s "$SESSION" -n "server" -x 220 -y 50
  tmux new-window -t "$SESSION" -n "claude"
  tmux send-keys -t "$SESSION:claude" "cd $ROOT_DIR && claude --dangerously-skip-permissions" Enter
  TARGET="$SESSION:server"
else
  # 현재 tmux 세션의 server 윈도우 사용
  CURRENT_SESSION="$(tmux display-message -p '#S')"
  TARGET="$CURRENT_SESSION:server"
  if ! tmux list-windows -t "$CURRENT_SESSION" -F '#{window_name}' | grep -q '^server$'; then
    echo "❌ 'server' 윈도우를 찾을 수 없습니다."
    echo "   --new 옵션으로 새 세션을 만들거나, server 윈도우를 먼저 생성하세요."
    exit 1
  fi
fi

# ── server 윈도우에 명령 전송 ─────────────────────────────
tmux send-keys -t "${TARGET}.0" "cd $ROOT_DIR && npm run dev" Enter

tmux select-window -t "$TARGET"

echo ""
echo "=================================================="
echo "  FireQA 개발 환경 준비 완료"
echo ""
echo "  Window 0  server    http://localhost:3000"
echo "  Window 1  claude    Claude Code"
echo "=================================================="
