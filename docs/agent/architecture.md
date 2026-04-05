# FireQA Agent 아키텍처

## 개요

FireQA Agent는 **Paperclip 패턴** 기반으로 설계되었다. 웹 애플리케이션(컨트롤 플레인)이 작업을 정의하고, 독립된 CLI 에이전트가 실제 AI 실행을 담당한다. 이 구조를 통해 사용자 로컬 환경의 Claude Code, Figma MCP 등 외부 도구를 활용할 수 있다.

---

## 전체 구성요소

### 1. FireQA 웹 (Vercel)

| 역할 | 설명 |
|------|------|
| 컨트롤 플레인 | 작업 생성, 취소, 우선순위 관리 |
| Task Queue API | 작업 등록/조회/상태 관리, Agent 통신 API 7개 제공 |
| Output Store | 실시간 로그 저장 + SSE 스트리밍 |
| 히스토리/버전 | 모든 실행 이력, 결과 저장, 버전 비교 |
| 결과 시각화 | TC 테이블, 다이어그램 미리보기, 로그 뷰어 |
| Auth API | API Key(Bearer) + OAuth Device Flow 인증 |

### 2. fireqa-agent CLI

사용자 로컬 머신 또는 서버에서 실행되는 Node.js CLI 패키지.

- FireQA Task Queue를 주기적으로 폴링 (기본 3초)
- 작업 수령 시 Claude Code를 `child_process.spawn()`으로 실행
- stdout 스트리밍을 파싱하여 FireQA 서버로 실시간 전송
- 완료 후 구조화된 결과를 FireQA API로 리포트

### 3. Claude Code

fireqa-agent가 스폰하는 AI CLI. 실제 TC 생성, 다이어그램 작성 등의 작업을 수행한다.

- `claude -p [prompt] --output-format stream-json` 형태로 실행
- Figma MCP, 기타 사용자 MCP 서버를 통해 외부 도구 활용
- `--resume <sessionId>`로 이전 세션을 이어받아 프로젝트 컨텍스트 유지

```
+------------------------------------------------------+
|  FireQA Web (Vercel)                                  |
|                                                       |
|  [Web Dashboard]  -> 작업 생성, 히스토리, 결과 시각화   |
|  [Task Queue API] -> 작업 등록/조회/상태 관리           |
|  [Output Store]   -> 실시간 로그 + 결과 저장            |
|  [Auth API]       -> API Key / OAuth 토큰 관리         |
+-------------------------+-----------------------------+
                          |  HTTPS (polling)
                          |
+-------------------------v-----------------------------+
|  fireqa-agent  (npx fireqa-agent)                     |
|  사용자 로컬 머신 또는 사용자 서버에서 실행              |
|                                                       |
|  1. FireQA Task Queue 폴링 (3초 간격)                  |
|  2. 작업 수령 시 Claude Code 스폰                      |
|  3. stdout 스트리밍 -> FireQA로 실시간 전송             |
|  4. 완료 후 결과 구조화 -> FireQA API 리포트            |
+-------------------------+-----------------------------+
                          |  child_process.spawn()
                          |
+-------------------------v-----------------------------+
|  claude -p "..." --output-format stream-json          |
|                                                       |
|  MCP Servers:                                         |
|  +-- Figma MCP  (figma.com 또는 로컬)                  |
|  +-- 기타 사용자 MCP                                   |
+-------------------------------------------------------+
```

---

## 데이터 흐름

TC 생성 + Figma 다이어그램을 예시로 한 전체 데이터 흐름:

```
 1. 사용자    -> FireQA Web: "이 기획서로 TC + Figma 다이어그램 생성"
 2. Web       -> DB: AgentTask 생성 (status: pending)
 3. Web       -> 브라우저: SSE로 실시간 진행상황 구독 시작
 4. agent     -> FireQA API: GET /api/agent/tasks/next (polling)
 5. agent     <- FireQA API: 작업 수령 (status: pending -> assigned)
 6. agent     -> FireQA API: PUT /api/agent/tasks/:id/status (status: running)
 7. agent     -> spawn: claude -p [prompt] --output-format stream-json
 8. claude    -> Figma MCP: 다이어그램 생성
 9. agent     -> FireQA API: POST /api/agent/tasks/:id/output (실시간 로그 청크)
10. Web       -> 브라우저: SSE로 실시간 로그 표시
11. agent     -> FireQA API: POST /api/agent/tasks/:id/result (최종 결과)
12. Web       -> 브라우저: 결과 표시
```

### 핵심 설계 원칙

- **Agent -> Server**: HTTP polling + POST (3초 간격). Vercel serverless에서 persistent connection이 제한적이므로 polling 방식을 채택했다.
- **Server -> Browser**: SSE (Server-Sent Events). 기존 FireQA SSE 인프라(`/lib/sse/`)를 재사용한다.
- 각 요청이 독립적이므로 재연결/복원이 자연스럽다.

---

## DB 스키마

### AgentConnection

에이전트 연결 정보를 관리하는 테이블. 하나의 사용자가 여러 에이전트를 등록할 수 있다.

```prisma
model AgentConnection {
  id            String   @id @default(cuid())
  organizationId String
  userId        String
  name          String                          // "내 맥북", "회사 서버" 등
  type          String   @default("self_hosted") // "self_hosted" | "hosted"
  status        String   @default("offline")     // "online" | "offline"
  lastHeartbeat DateTime?
  metadata      String   @default("{}")           // JSON: { cli, os, version }
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  organization  Organization @relation(...)
  user          User         @relation(...)
  tasks         AgentTask[]

  @@index([organizationId])
  @@index([organizationId, status])
}
```

| 필드 | 설명 |
|------|------|
| `name` | 에이전트 식별 이름 (예: `user@hostname`) |
| `type` | `self_hosted` (사용자 로컬) 또는 `hosted` (서버 워커) |
| `status` | `online` / `offline`. heartbeat 30초 이상 없으면 offline 전환 |
| `lastHeartbeat` | 마지막 heartbeat 시각. PUT /api/agent/connections/:id 호출 시 갱신 |
| `metadata` | JSON. CLI 종류, OS, Node.js 버전 등 환경 정보 |

### AgentTask

에이전트가 수행할 작업 단위. 작업 큐 역할을 한다.

```prisma
model AgentTask {
  id             String   @id @default(cuid())
  organizationId String
  projectId      String?
  connectionId   String?             // 할당된 agent (null = 미할당)
  createdById    String

  type           String              // "tc-generate" | "diagram-generate" | "wireframe-generate" | "improve-spec" | "custom"
  status         String   @default("pending")
  priority       Int      @default(0)

  prompt         String              // 사용자 지시 또는 자동 생성 프롬프트
  context        String   @default("{}") // JSON: 첨부 파일 URL, 템플릿, Figma 파일 키 등
  mcpTools       String   @default("[]") // JSON: 허용할 MCP 도구 목록

  sessionId      String?             // Claude Code 세션 ID (resume용)
  startedAt      DateTime?
  completedAt    DateTime?
  timeoutMs      Int      @default(300000)  // 기본 5분

  result         String?             // JSON: 구조화된 최종 결과
  outputLog      String?             // JSON: 실행 로그 (AgentOutputChunk[])
  errorMessage   String?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization     @relation(...)
  project        Project?         @relation(...)
  connection     AgentConnection? @relation(...)
  createdBy      User             @relation(...)

  @@index([organizationId, status])
  @@index([organizationId, createdAt(sort: Desc)])
  @@index([connectionId])
}
```

### Task 상태 전이

```
PENDING -> ASSIGNED -> RUNNING -> COMPLETED
                         |
                       FAILED
                         |
         CANCELLED <- (any)
         TIMED_OUT <- RUNNING
```

| 전이 | 트리거 |
|------|--------|
| `PENDING -> ASSIGNED` | agent가 `GET /api/agent/tasks/next` 호출 시 PostgreSQL `FOR UPDATE SKIP LOCKED`로 atomic하게 전이 |
| `ASSIGNED -> RUNNING` | agent가 CLI spawn 성공 후 `PUT /api/agent/tasks/:id/status` 호출 |
| `RUNNING -> COMPLETED` | agent가 결과 전송 (`POST /api/agent/tasks/:id/result`) |
| `RUNNING -> FAILED` | CLI 비정상 종료, 에러 발생 시 |
| `RUNNING -> TIMED_OUT` | `startedAt + timeoutMs` 초과 시 서버 cron으로 처리 |
| `* -> CANCELLED` | 사용자가 웹에서 취소. 다음 heartbeat에서 agent에 통보 |
| `ASSIGNED` 2분 초과 | `PENDING`으로 복귀하여 다른 agent에 재할당 |

### Race Condition 방지

작업 수령 시 PostgreSQL의 `FOR UPDATE SKIP LOCKED`를 사용하여 여러 agent가 동시에 같은 작업을 수령하는 것을 방지한다:

```sql
UPDATE "AgentTask"
SET status = 'assigned', "connectionId" = $connectionId, "updatedAt" = NOW()
WHERE id = (
  SELECT id FROM "AgentTask"
  WHERE status = 'pending'
    AND "organizationId" = $orgId
  ORDER BY priority DESC, "createdAt" ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
RETURNING *;
```

---

## SSE 로그 스트리밍 아키텍처

agent에서 브라우저까지의 로그 전달은 2단계로 이루어진다:

```
Agent ----HTTP POST----> Server (DB에 저장) ----SSE----> Browser
       /output 엔드포인트                    /output GET
```

### 1단계: Agent -> Server (POST /api/agent/tasks/:id/output)

- agent가 Claude Code의 stdout을 파싱하여 `AgentOutputChunk[]` 형태로 서버에 전송
- 청크 타입: `text`, `tool_use`, `tool_result`, `error`
- 서버는 기존 로그에 append하여 `outputLog` 필드에 JSON으로 저장
- 10MB 초과 시 최근 100개 로그만 유지

### 2단계: Server -> Browser (GET /api/agent/tasks/:id/output, SSE)

- 브라우저가 SSE로 연결하면 기존 로그를 즉시 전송
- 이후 1초 간격으로 DB를 폴링하여 새 청크만 전송
- 작업이 종료 상태(`completed`, `failed`, `cancelled`, `timed_out`)가 되면 `complete` 이벤트 전송 후 스트림 종료
- 클라이언트 연결 끊김 시 자동 정리

---

## 인증

### 이중 인증 체계

| 인증 수단 | 용도 | 전달 방식 |
|-----------|------|-----------|
| API Key | agent 상시 연결용 | `Authorization: Bearer fqa_...` |
| OAuth Device Flow | agent 초기 로그인용 (브라우저 없는 환경) | Device Code polling |
| Supabase Session | 웹 대시보드용 (기존) | Cookie |

### API Key

- `fqa_` prefix로 시작하는 32바이트 hex 키
- SHA-256 해시만 DB에 저장, 원문은 발급 시 한 번만 표시
- 에이전트 요청 시 `Authorization: Bearer <token>` 헤더로 전달
- `getCurrentUser()` 함수가 Bearer 토큰과 Supabase 세션을 모두 처리

### OAuth Device Flow (RFC 8628)

CLI 환경에서 브라우저를 통해 인증하는 방식:

```
1. agent -> POST /api/auth/device         (deviceCode 발급)
2. agent -> 터미널에 URL 표시              (사용자에게 브라우저 열기 안내)
3. 사용자 -> 브라우저에서 승인             (FireQA 로그인 + 코드 확인)
4. agent -> GET /api/auth/device?code=... (polling, 3초 간격, 최대 5분)
5. agent -> 승인 확인 시 토큰 저장         (~/.fireqa/config.json)
```

Device Flow를 채택한 이유: 일반 OAuth redirect는 CLI에서 localhost 서버를 띄워야 하므로 방화벽/포트 문제가 발생한다. Device Flow는 SSH 세션이나 원격 서버 등 어떤 네트워크 환경에서든 동작한다.

### 에이전트 버전 검증

에이전트 등록 시(`POST /api/agent/connections`) 서버가 `metadata.version`을 확인한다. 최소 버전(`0.1.0`) 미만이면 `426 Upgrade Required` 응답과 함께 업그레이드 안내를 반환한다.
