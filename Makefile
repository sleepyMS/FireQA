.PHONY: dev stop

dev:
	tmux kill-server 2>/dev/null; bash scripts/dev.sh --new && tmux a

stop:
	tmux kill-server 2>/dev/null
