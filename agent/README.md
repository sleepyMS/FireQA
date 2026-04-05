# fireqa-agent

FireQA Agent CLI — connect your AI CLI (Claude Code, Codex, Gemini) to FireQA.

## Requirements

- Node.js 18+
- One of: [Claude Code](https://docs.anthropic.com/claude-code), [Codex CLI](https://github.com/openai/codex), or [Gemini CLI](https://github.com/google-gemini/gemini-cli)

## Quick Start

```bash
# 1. Install and log in to your AI CLI (no API key needed)
npm install -g @anthropic-ai/claude-code
claude auth login

# 2. Log in to FireQA
npx fireqa-agent login

# 3. Start the agent
npx fireqa-agent start
```

## Supported CLIs

| CLI | Install | Login | Start |
|-----|---------|-------|-------|
| Claude Code | `npm install -g @anthropic-ai/claude-code` | `claude auth login` | `npx fireqa-agent start` |
| Codex CLI | `npm install -g @openai/codex` | `codex login` | `npx fireqa-agent start --cli-type codex` |
| Gemini CLI | `npm install -g @google/gemini-cli` | `gemini auth` | `npx fireqa-agent start --cli-type gemini` |

## Commands

```bash
fireqa-agent login              # Authenticate with FireQA (opens browser)
fireqa-agent start              # Start agent (default: Claude Code)
fireqa-agent start --cli-type codex    # Start with Codex CLI
fireqa-agent start --cli-type gemini   # Start with Gemini CLI
fireqa-agent config             # Show current configuration
```

## How It Works

The agent polls FireQA for pending tasks, runs them locally using your AI CLI, and reports results back — no API key required. Your own CLI account is used.
