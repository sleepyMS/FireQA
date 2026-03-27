.PHONY: dev stop

dev:
	tmux kill-session -t fireqa 2>/dev/null; bash scripts/dev.sh --new && tmux a -t fireqa

stop:
	tmux kill-session -t fireqa 2>/dev/null
