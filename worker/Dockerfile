FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

# Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Figma MCP 사전 설정
RUN claude mcp add figma -- npx -y @anthropic-ai/claude-code-figma-mcp || true

# fireqa-agent 복사 및 빌드
COPY agent/ /app/agent/
WORKDIR /app/agent
RUN npm ci --omit=dev && npm run build

# 환경변수는 Fly.io Machine 생성 시 주입
# FIREQA_SERVER, FIREQA_TOKEN, FIREQA_MODE=hosted, ANTHROPIC_API_KEY
ENV FIREQA_MODE=hosted

CMD ["node", "dist/cli.js", "start"]
