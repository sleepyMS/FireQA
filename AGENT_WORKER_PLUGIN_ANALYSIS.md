# FireQA 에이전트/워커/플러그인 서브시스템 분석

**분석 날짜:** 2026-04-03  
**범위:** fireqa-agent CLI, Fly.io 호스팅 워커, Figma 플러그인

---

## 1. FireQA Agent CLI (agent/)

### 1.1 개요

**fireqa-agent** — AI CLI (Claude Code)를 FireQA 서버와 연결하는 경량 Agent CLI

```
npm install -g fireqa-agent
fireqa-agent login
fireqa-agent start
```

### 1.2 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    FireQA Server                         │
│  (작업 큐: AgentTask, 연결: AgentConnection)             │
└─────────────────────────────────────────────────────────┘
              ↑ ↓ (API 호출)
┌─────────────────────────────────────────────────────────┐
│              fireqa-agent CLI Process                    │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ TaskPoller (3초 polling)                             │ │
│ │ - heartbeat (10초마다, cancel 감지)                 │ │
│ │ - getNextTask (우선순위로 작업 할당)                │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ CLI Spawner (child_process.spawn)                   │ │
│ │ - claude --print <prompt>                           │ │
│ │ - --resume <sessionId>                              │ │
│ │ - --allowedTools [...mcpTools]                      │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ Output Parser (stream-json format)                  │ │
│ │ - text, tool_use, tool_result, error               │ │
│ │ - sessionId 추출 (연속성)                           │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ API Client (재시도 + 로컬 저장)                      │ │
│ │ - sendOutput (지수 백오프 3회)                      │ │
│ │ - 실패 시 ~/.fireqa/pending/[taskId].json          │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│  Claude AI CLI (claude --print --output-format json)    │
└─────────────────────────────────────────────────────────┘
```

### 1.3 NPM 구조

```json
{
  "name": "fireqa-agent",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "fireqa-agent": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "commander": "^13.0.0"  // CLI 프레임워크
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "tsx": "^4.0.0",
    "vitest": "^3.0.0"
  }
}
```

### 1.4 CLI 명령어

#### `fireqa-agent login [--api-key]`

**기본 (OAuth):**

```
Step 1: Create device code request
  → POST /api/auth/device { action: "create" }
  
Step 2: Display verification URL
  → https://fireqa.app/auth/device?code=<code>&source=agent
  
Step 3: Poll for approval (3초 간격, 최대 5분)
  → GET /api/auth/device?code=<code>
  
Step 4: Save token to ~/.fireqa/config.json
  → { auth: { token: "fqa_..." } }
```

**API Key:**

```
fireqa-agent login --api-key
→ 프롬프트에서 토큰 직접 입력
→ ~/.fireqa/config.json에 저장
```

#### `fireqa-agent config`

현재 설정 표시:

```json
{
  "server": "https://fireqa.vercel.app",
  "cli": "claude",
  "pollingIntervalMs": 3000,
  "maxConcurrentTasks": 1,
  "mode": "self_hosted",
  "auth": { "token": "fqa_abcd..." }
}
```

#### `fireqa-agent config:set <key> <value>`

```
fireqa-agent config:set server https://custom.fireqa.app
fireqa-agent config:set pollingIntervalMs 5000
fireqa-agent config:set maxConcurrentTasks 2
```

**수치 키:** `pollingIntervalMs`, `maxConcurrentTasks`

#### `fireqa-agent start`

에이전트 시작:

1. **등록:** POST /api/agent/connections
   - 메타데이터: CLI, OS, Node 버전, 에이전트 버전
   
2. **작업 폴링:** 반복 실행
   - GET /api/agent/tasks/next?connectionId=<id>
   - 3초 간격 (기본)
   
3. **CLI 실행:** spawnCli
   - 작업의 prompt + context로 Claude 호출
   - stream-json 형식 결과 수집
   
4. **결과 전송:** POST /api/agent/tasks/<id>/result
   - 지수 백오프 (1s, 2s, 4s)
   - 실패 시 로컬 저장
   
5. **하트비트:** 10초마다
   - PUT /api/agent/connections/<id>
   - cancelledTaskIds 수신 시 작업 중단 (SIGTERM)
   
6. **정리:** SIGINT/SIGTERM
   - DELETE /api/agent/connections/<id>
   - process.exit(0)

### 1.5 설정 저장소 (ConfigStore)

**위치:** `~/.fireqa/config.json`

```typescript
type AgentConfig = {
  server: string;           // "https://fireqa.vercel.app"
  auth?: { token: string };
  cli: string;              // "claude"
  pollingIntervalMs: number;
  maxConcurrentTasks: number;
  mode: "self_hosted" | "hosted";
};
```

**설정 우선순위:**

```
환경변수 (FLY 컨테이너) > 파일 (~/.fireqa/config.json) > 기본값
```

**환경변수:**

```
FIREQA_SERVER         → server
FIREQA_TOKEN          → auth.token
FIREQA_CLI            → cli
FIREQA_MODE           → mode
FIREQA_POLLING_INTERVAL → pollingIntervalMs
```

### 1.6 Task Poller (작업 폴링)

**src/runner/task-poller.ts**

```typescript
export async function startAgent(store: ConfigStore): Promise<void> {
  // 1. 토큰 검증
  // 2. CLI 설치 확인
  // 3. 자가 호스팅 vs 호스팅 모드 분기
  // 4. 에이전트 등록
  // 5. 미전송 데이터 재전송
  // 6. 작업 폴링 루프 시작
  // 7. 하트비트 타이머
  // 8. 신호 처리 (cleanup)
}
```

**폴링 루프:**

```
requestNextTask()
  ↓
[task = null?] → sleep(pollingIntervalMs) → retry
  ↓
[task found] → spawnCli(task.prompt, options)
  ↓
[execute] → collect output (stream-json)
  ↓
[sendOutput] → retrySendOutput (3회 재시도)
  ↓
[retry loop]
```

**하트비트:**

```
heartbeat(connectionId)
  ↓ 10초마다
{
  status: "online",
  cancelledTaskIds: ["task1", "task2"]
}
  ↓
[cancelledTaskIds 수신] → running tasks 중단 (SIGTERM → SIGKILL)
```

### 1.7 CLI Spawner (프로세스 실행)

**src/runner/spawner.ts**

```typescript
export async function spawnCli(
  cli: string,          // "claude"
  prompt: string,
  options?: {
    sessionId?: string;
    mcpTools?: string[];
    onChunk?: (chunk) => void;
    signal?: AbortSignal;
    env?: Record<string, string>;
  }
): Promise<SpawnResult>
```

**인자 조합:**

```
claude --print "<prompt>"
       --output-format stream-json
       [--resume "<sessionId>"]
       [--allowedTools "<tool1>" "<tool2>" ...]
```

**스트림 처리:**

```
stdout (stream-json)
  ↓ (line by line)
parseStreamJsonLine()
  ↓
chunks: ParsedChunk[]
  ↓
onChunk() 콜백 (real-time)
```

**신호 처리:**

```
options.signal === AbortSignal
  ↓
SIGTERM (5초 대기)
  ↓ (타임아웃)
SIGKILL (강제 종료)
```

### 1.8 Output Parser (출력 파싱)

**ParsedChunk 타입:**

```typescript
type ParsedChunk = {
  type: "text" | "tool_use" | "tool_result" | "error";
  content: string;
  tool?: string;
  sessionId?: string;  // result 이벤트에서만
};
```

**파싱 규칙:**

```json
// Input (stream-json)
{
  "type": "assistant",
  "subtype": "text",
  "text": "분석 결과..."
}
→ ParsedChunk: { type: "text", content: "분석 결과..." }

{
  "type": "assistant",
  "subtype": "tool_use",
  "tool_name": "figma_mcp"
}
→ ParsedChunk: { type: "tool_use", tool: "figma_mcp", content: "figma_mcp" }

{
  "type": "tool_result",
  "content": "result data"
}
→ ParsedChunk: { type: "tool_result", content: "result data" }

{
  "type": "result",
  "result": "final output",
  "session_id": "sess_123"
}
→ ParsedChunk: { type: "text", content: "final output", sessionId: "sess_123" }
```

### 1.9 API Client (서버 통신)

**src/reporter/api-client.ts**

```typescript
export class ApiClient {
  constructor(config: AgentConfig)
  
  // 연결 관리
  async registerConnection(name, metadata): Promise<{ id }>
  async heartbeat(connectionId): Promise<{ cancelledTaskIds }>
  async disconnect(connectionId): Promise<void>
  
  // 작업 관리
  async getNextTask(connectionId): Promise<AgentTask | null>
  async updateTaskStatus(taskId, status, extra?): Promise<void>
  async sendOutput(taskId, chunks): Promise<void>
  
  // 재전송
  async flushPendingOutputs(): Promise<void>
}
```

**재시도 로직:**

```
sendOutput(taskId, chunks)
  ↓
for attempt in [0, 1, 2, 3]
  → sleep(delays[attempt-1] || 0)
  → POST /api/agent/tasks/<id>/output
  → [success] → return
  → [failure] → continue
  ↓
[all failed]
  → mkdir ~/.fireqa/pending
  → write {taskId, chunks, timestamp}.json
  → throw error
```

**미전송 데이터 복구:**

```
startAgent()
  ↓
flushPendingOutputs()
  → scan ~/.fireqa/pending/
  → retry each file
  → delete on success
```

---

## 2. Fly.io 호스팅 워커 (Hosted Worker)

### 2.1 워커 Docker 구성

**worker/Dockerfile**

```dockerfile
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends git
RUN npm install -g @anthropic-ai/claude-code

# Figma MCP 사전 설정
RUN claude mcp add figma -- npx -y @anthropic-ai/claude-code-figma-mcp || true

COPY agent/ /app/agent/
WORKDIR /app/agent
RUN npm ci --omit=dev && npm run build

ENV FIREQA_MODE=hosted
CMD ["node", "dist/cli.js", "start"]
```

**특징:**

- Node.js 22 슬림 이미지 (Git 포함)
- Claude Code CLI 사전 설치
- Figma MCP 자동 등록
- fireqa-agent 빌드 (프로덕션 의존성만)
- 환경변수로 호스팅 모드 설정

### 2.2 Fly.io Machines API

**src/lib/flyio/client.ts**

```typescript
export class FlyMachinesClient {
  private baseUrl = "https://api.machines.dev/v1";
  private token: string;       // FLY_API_TOKEN
  private appName: string;     // FLY_APP_NAME
  
  async createMachine(config: CreateMachineConfig): Promise<MachineState>
  async startMachine(machineId: string): Promise<void>
  async stopMachine(machineId: string): Promise<void>
  async destroyMachine(machineId: string): Promise<void>
  async getMachine(machineId: string): Promise<MachineState>
  async waitForState(machineId, state, timeout): Promise<void>
}
```

**머신 생성 설정:**

```typescript
{
  region: "nrt",              // 도쿄 (기본)
  cpus: 2,
  memoryMb: 2048,
  env: {                      // 환경변수 주입
    FIREQA_SERVER: "...",
    FIREQA_TOKEN: "...",
    FIREQA_MODE: "hosted",
    ANTHROPIC_API_KEY: "..."
  },
  metadata: {
    task_id: "...",
    created_by: "orchestrator"
  }
}
```

**머신 상태:**

```
"created" → "starting" → "started" → idle
  (작업 할당 시)
"started" → "stopping" → "stopped" → idle
  (작업 완료 후)

"destroying" → "destroyed" (정리)
```

### 2.3 Worker Orchestrator

**src/lib/flyio/orchestrator.ts**

```typescript
export class WorkerOrchestrator {
  async assignWorker(task: {
    id: string;
    organizationId: string;
    useOwnApiKey: boolean;
  }): Promise<{ machineId }>
  
  async handleTaskCompletion(taskId: string): Promise<void>
  async maintenanceLoop(): Promise<void>
}
```

**워커 할당 흐름:**

```
task 수신
  ↓
[useOwnApiKey?]
  ├─ true → userApiKey.encryptedKey 복호화
  └─ false → env.ANTHROPIC_API_KEY 사용
  ↓
[idle worker exists?]
  ├─ yes → 상태 "idle" → "busy", currentTaskId 설정
  │        머신 상태 "stopped" → "started" (필요 시)
  │        실패 → "dead" 마크, 신규 생성
  └─ no → 신규 머신 생성
  ↓
agentTask.flyMachineId 업데이트
  ↓
return { machineId }
```

**워드 풀 관리:**

```
상수:
  WARM_POOL_MIN = 2           // 최소 idle 워커
  WARM_POOL_MAX = 10          // 최대 idle 워커
  IDLE_TIMEOUT_MS = 1800000   // 30분
  HEALTH_CHECK_STALE_MS = 180000 // 3분
```

**유지보수 루프:**

```
maintenanceLoop() (Vercel cron)
  ↓
1. health check (3분 응답 없음 → "dead")
2. IDLE_TIMEOUT 초과 → stopMachine + "idle" 상태
3. warm pool 유지 (min ~ max 사이)
4. 오래된 머신 정리
```

**사용자 API Key 관리:**

```prisma
UserApiKey {
  organizationId: String
  provider: "anthropic"
  encryptedKey: String      // AES-256
  keyPrefix: String         // 앞 8자
}
```

---

## 3. Figma 플러그인 (figma-plugin/)

### 3.1 플러그인 아키텍처

```
┌──────────────────────────────────────────────────────┐
│           Figma Editor (Trusted Context)              │
├──────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────┐   │
│ │  main.ts (figma sandbox)                       │   │
│ │  - 노드/엣지 생성 (dagre 레이아웃)             │   │
│ │  - clientStorage 브로커                        │   │
│ │  - 메시지 라우팅                               │   │
│ └────────────────────────────────────────────────┘   │
│           ↔ postMessage (message passing)             │
│ ┌────────────────────────────────────────────────┐   │
│ │  UI Panel (ui.html + iframe)                   │   │
│ │  - 인증 UI                                     │   │
│ │  - 프로젝트 선택                               │   │
│ │  - 생성 트리거                                 │   │
│ │  - 진행 상황 표시                              │   │
│ └────────────────────────────────────────────────┘   │
│           ↔ fetch (HTTP)                              │
│ ┌──────────────────────────────────────────────┐     │
│ │    FireQA API (CORS enabled)                  │     │
│ └──────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

### 3.2 플러그인 파일 구조

**figma-plugin/package.json**

```json
{
  "name": "fireqa-figma-plugin",
  "figma": {
    "pluginId": "...",
    "name": "FireQA",
    "ui": "src/ui.html",
    "main": "dist/main.js",
    "editorType": ["figma", "figjam"],
    "requiredPermissions": ["currentuser"]
  }
}
```

### 3.3 Main Sandbox (main.ts)

**메시지 핸들러:**

```typescript
figma.ui.onmessage = async (msg) => {
  if (msg.type === "create-diagram")
    → createDiagram(msg.diagram, msg.diagramIndex)
  
  if (msg.type === "create-wireframe")
    → createWireframe(msg.wireframeData)
  
  if (msg.type === "get-storage")
    → figma.clientStorage.getAsync(msg.key)
    → postMessage({ type: "storage-result", value })
  
  if (msg.type === "set-storage")
    → figma.clientStorage.setAsync(msg.key, msg.value)
  
  if (msg.type === "open-browser")
    → figma.openExternal(msg.value)  // Device Auth URL
}
```

**다이어그램 생성:**

```typescript
async function createDiagram(diagram: Diagram, index: number) {
  // 1. 노드 생성 (dagre 레이아웃 계산)
  //    - 타입별 색상: screen, decision, action, start, end
  //    - 크기: 280×100, decision 320×190
  
  // 2. 엣지 생성 (화살표, 레이블)
  
  // 3. 그룹화 (선택사항)
  
  // 4. 파이지 이동 (DIAGRAM_X_OFFSET = 2500px)
  
  // Success → postMessage({ type: "success" })
  // Error → postMessage({ type: "error" })
}
```

**와이어프레임 생성:**

```typescript
async function createWireframe(data: WireframeData) {
  // 1. 화면별 프레임 생성
  // 2. UI 요소 추가 (텍스트, 모양)
  // 3. 계층 구조 설정
  // 4. 상호작용 표기
}
```

**clientStorage 브로커:**

```
UI (iframe): get-storage
  ↓
Main (sandbox): figma.clientStorage.getAsync()
  ↓
postMessage({ type: "storage-result", value })
  ↓
UI: 수신 및 처리
```

⚠️ **이유:** iframe은 Figma API에 직접 접근 불가

### 3.4 UI Panel (ui.html)

**구조:**

```html
<header>
  <h1>🔥 FireQA</h1>
  <user-info>
    <span>로그인 안 됨</span> 또는 <span>name@email.com</span>
  </user-info>
  <button class="disconnect-btn">로그아웃</button>
</header>

<section class="project-selection">
  <select>새 프로젝트 생성 또는 기존 선택</select>
</section>

<section class="generation-options">
  <checkbox>TC 생성</checkbox>
  <checkbox>다이어그램 생성</checkbox>
  <checkbox>와이어프레임 생성</checkbox>
</section>

<section class="progress">
  <progress-bar />
  <status-text />
</section>

<section class="results">
  <list>생성된 아티팩트</list>
</section>
```

**주요 기능:**

1. **Device Auth:**
   - "FireQA에 연결" 버튼
   - Device code 요청 → URL 생성
   - figma.openExternal(url)
   - polling 대기 (3초 간격, 5분 timeout)

2. **프로젝트 선택:**
   - /api/projects (GET) → 기존 프로젝트 목록
   - 또는 새 프로젝트 이름 입력

3. **생성 트리거:**
   - 파일 선택 또는 text input
   - /api/generate / /api/diagrams / /api/wireframes (POST)
   - SSE 스트림 수신 (real-time progress)
   - 완료 시 Figma로 메시지 (postMessage)

4. **Figma 생성:**
   - postMessage({ type: "create-diagram", diagram, diagramIndex })
   - main.ts에서 처리

### 3.5 API Token 관리 (Figma)

**저장소:** clientStorage (Figma 계정별)

```
key: "fireqa:token"
value: "fqa_..."  (또는 JWT)
```

**플로우:**

```
1. 초기 로드
   → get-storage "fireqa:token"
   → [토큰 있음] → API 호출 (Bearer token)
   → [토큰 없음] → Device Auth 플로우

2. Device Auth 승인
   → API: /api/auth/device (status=approved, token 반환)
   → set-storage "fireqa:token"
   → 로그인 상태 표시

3. 로그아웃
   → remove-storage "fireqa:token"
   → UI 초기화
```

---

## 4. 작업 흐름 통합

### 4.1 Self-Hosted 에이전트 흐름

```
사용자 작업 생성 (웹 UI)
  ↓
AgentTask (상태: pending)
  ↓
fireqa-agent start (폴링)
  ↓
GET /api/agent/tasks/next
  ↓
AgentTask (상태: assigned)
  ↓
spawnCli(prompt)
  ↓
claude --print --output-format stream-json
  ↓
parseStreamJsonLine() (실시간)
  ↓
POST /api/agent/tasks/<id>/output (chunks)
  ↓ (재시도: 1s, 2s, 4s)
[실패] → ~/.fireqa/pending/ 저장
  ↓
AgentTask (상태: completed/failed)
  ↓
사용자가 웹 UI에서 결과 확인
```

### 4.2 Hosted 에이전트 흐름 (Fly.io)

```
사용자 AgentTask 생성 (mode: "hosted")
  ↓
Vercel serverless function
  ↓
WorkerOrchestrator.assignWorker()
  ↓
[idle machine?]
  ├─ yes → start machine
  └─ no → create machine (Docker 배포)
  ↓
Machine 시작 → fireqa-agent start (hosted mode)
  ↓
[짧은 polling: 1초]
  ↓
GET /api/agent/tasks/next?connectionId=...
  ↓
[작업 할당]
  ↓
spawnCli + sendOutput (반복)
  ↓
[작업 완료]
  ↓
Machine 상태: idle
  ↓
30분 timeout → stopMachine
  ↓
[다른 작업 있으면 restart]
```

---

## 5. 주요 설계 패턴

### 5.1 Exponential Backoff

**재시도 전략:**

```
Attempt 1: immediately
Attempt 2: 1s + jitter
Attempt 3: 2s + jitter
Attempt 4: 4s + jitter (최대 60s)
Failure: 로컬 저장
```

**Jitter 목적:**

```
여러 워커가 동시 재시도 방지
thundering herd 문제 해결
```

### 5.2 Graceful Degradation

**sendOutput 실패:**

```
재시도 3회 실패
  ↓
로컬 디스크 저장 (~/.fireqa/pending/)
  ↓
다음 에이전트 시작 시
  ↓
flushPendingOutputs() → 재전송 시도
```

**머신 시작 실패:**

```
idle machine start 실패
  ↓
상태: dead
  ↓
새 머신 생성
```

### 5.3 Session Continuity

**세션 ID 추적:**

```
Task 1 결과: { sessionId: "sess_abc" }
  ↓
Task 2 prompt 처리:
  claude --print "<prompt>"
         --resume "sess_abc"
  ↓
Claude가 이전 컨텍스트 유지
```

---

## 6. 환경 변수

### Agent CLI

```
FIREQA_SERVER
FIREQA_TOKEN
FIREQA_CLI
FIREQA_MODE           # "self_hosted" | "hosted"
FIREQA_POLLING_INTERVAL
```

### Hosted Worker (Docker)

```
FIREQA_SERVER
FIREQA_TOKEN
FIREQA_MODE=hosted
ANTHROPIC_API_KEY
```

### Fly.io

```
FLY_API_TOKEN
FLY_APP_NAME
FLY_WORKER_IMAGE      # Docker 이미지 URI
FLY_WORKER_REGION     # "nrt" (기본)
```

### Worker Orchestrator

```
WARM_POOL_MIN         # 2 (기본)
WARM_POOL_MAX         # 10 (기본)
WORKER_IDLE_TIMEOUT_MS # 1800000 (30분)
```

---

## 7. 크론 작업 (Vercel)

### /api/cron/agent-health

**Schedule:** `* * * * *` (매분)

```
AgentConnection (status="offline")
  ↓
[lastHeartbeat > 3분]
  ↓
상태 업데이트
  ↓
로그 기록
```

### /api/cron/worker-health

**Schedule:** `* * * * *` (매분)

```
HostedWorker
  ↓
[health check 3분 이상 미응답]
  ↓
상태: "dead"
  ↓
[warm pool 유지]
  ↓
[idle timeout 초과]
  ↓
stopMachine()
```

### /api/cron/credit-reset

**Schedule:** `0 0 1 * *` (월 1일 자정)

```
CreditBalance
  ↓
monthlyQuota 리셋
  ↓
quotaResetAt = 다음 달 1일
  ↓
CreditTransaction 기록
```

---

## 8. 보안 고려사항

### 8.1 토큰 관리

**API 토큰:**

```
저장: SHA-256 해시
전송: Bearer Authorization 헤더
만료: 설정 가능 (expiresAt)
식별: 앞 8자 (keyPrefix)
```

**Device Auth:**

```
토큰: 1회용, 브라우저 승인 후만 발급
코드: 5분 만료
폴링: 3초 간격 (타임아웃 있음)
```

### 8.2 사용자 API Key

```
Anthropic API Key 암호화 저장 (AES-256)
useOwnApiKey 플래그 → 조직별 키 사용
키 복호화 후 워커에 주입
```

### 8.3 Figma 플러그인

```
CORS 허용 필요 (fireqa.vercel.app)
clientStorage: Figma 계정별 격리
Device Auth: OAuth 대체 보안

⚠️ 평문 토큰 저장 (제한적 위험)
   - Figma 플러그인은 iframe (제한된 환경)
   - 사용자 기기에만 로컬 저장
```

---

## 9. 성능 특성

### Agent CLI

```
Polling interval: 3초 (기본)
Heartbeat: 10초
Output batch: real-time streaming
Memory: ~50MB (idle)
```

### Hosted Worker

```
CPU: 2 cores (shared)
Memory: 2GB
Boot time: ~30초
Idle timeout: 30분
```

### Figma 플러그인

```
Panel size: 400×560px
API 요청: /api/projects, /api/generate, /api/diagrams 등
Polling (device auth): 3초
Figma element limit: 제한 없음 (브라우저 성능 의존)
```

---

## 10. 제한사항 & 개선점

### 현재 제한사항

| 항목 | 제한 | 영향 |
|-----|------|------|
| **maxConcurrentTasks** | 1 (하드코딩?) | 한 번에 1개 작업만 |
| **sessionId** | 수동 전달 | 컨텍스트 연속성 의존 |
| **디스크 저장** | ~/.fireqa/pending/ | 한 기계만 가능 |
| **워커 정리** | 수동 실행? | 유휴 머신 남아있을 수 있음 |
| **Figma 토큰** | 평문 저장 | 이론적 보안 위험 |

### 개선 아이디어

```
1. 병렬 작업 처리
   - maxConcurrentTasks 제대로 구현
   - Map<taskId, AbortController> 확장

2. 더 나은 세션 관리
   - 자동 sessionId 연결
   - 컨텍스트 캐시

3. 분산 임시 저장소
   - Redis/S3 대신 로컬 DB
   - 여러 머신 간 동기화

4. Figma 토큰 보안
   - sessionStorage 사용
   - 재인증 주기 설정

5. 워커 자동 정리
   - 스케일링 정책
   - cost optimization
```

---

## 요약

FireQA의 에이전트 생태계:

✅ **CLI Agent:** 경량, 자동 설치, Device Auth  
✅ **Hosted Worker:** Fly.io 자동 스케일링, Figma MCP 사전 설정  
✅ **Figma 플러그인:** 직접 다이어그램/와이어프레임 생성, Device Auth  
✅ **통합:** 우선순위 큐 + 하트비트 + 그레이스풀 디그레이드  
✅ **보안:** 토큰 해싱, API 키 암호화, CORS 제한  
