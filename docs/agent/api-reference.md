# FireQA Agent API Reference

Agent 통신에 사용되는 7개 엔드포인트 문서.

모든 요청은 `Authorization: Bearer <token>` 헤더로 인증한다. 토큰은 API Key(`fqa_...`) 또는 OAuth Device Flow로 발급받은 토큰이다. 인증 실패 시 모든 엔드포인트에서 `401`을 반환한다.

서버에서 조직(organization) 단위로 데이터가 격리되어 있으며, 다른 조직의 리소스에 접근하면 `404`를 반환한다.

---

## 1. POST /api/agent/connections

에이전트를 FireQA에 등록한다.

### Request

```
POST /api/agent/connections
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "name": "user@hostname",
  "metadata": {
    "cli": "claude",
    "os": "darwin",
    "version": "0.1.0",
    "nodeVersion": "v20.11.0"
  }
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | string | O | 에이전트 식별 이름 |
| `metadata` | object | X | 환경 정보 (cli, os, version 등) |
| `metadata.version` | string | X | 에이전트 버전. 최소 `0.1.0` 이상 |

### Response

**201 Created**

```json
{
  "id": "clxyz...",
  "name": "user@hostname",
  "status": "online",
  "createdAt": "2026-03-31T10:00:00.000Z"
}
```

### 에러 코드

| 코드 | 설명 |
|------|------|
| 400 | `name`이 비어있거나 누락 |
| 401 | 인증 실패 |
| 426 | 에이전트 버전이 최소 요구 버전(`0.1.0`) 미만. `npm update -g fireqa-agent` 필요 |
| 500 | 서버 내부 오류 |

---

## 2. PUT /api/agent/connections/:id

Heartbeat 전송 및 상태 업데이트. 에이전트가 주기적으로(3초) 호출하여 온라인 상태를 유지한다.

### Request

```
PUT /api/agent/connections/:id
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "metadata": {
    "cli": "claude",
    "os": "darwin",
    "version": "0.1.0"
  }
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `metadata` | object | X | 갱신할 환경 정보 |

### Response

**200 OK**

```json
{
  "status": "online",
  "lastHeartbeat": "2026-03-31T10:01:00.000Z",
  "cancelledTaskIds": ["task_abc"]
}
```

| 필드 | 설명 |
|------|------|
| `status` | 현재 연결 상태 |
| `lastHeartbeat` | heartbeat 갱신 시각 |
| `cancelledTaskIds` | 웹에서 사용자가 취소한 작업 ID 목록. agent는 해당 작업의 CLI 프로세스를 종료해야 함 |

### 에러 코드

| 코드 | 설명 |
|------|------|
| 401 | 인증 실패 |
| 404 | 해당 ID의 에이전트가 없거나 다른 조직 소속 |
| 500 | 서버 내부 오류 |

---

## 3. DELETE /api/agent/connections/:id

에이전트 연결을 해제한다. 상태가 `offline`으로 변경된다. (레코드는 삭제되지 않음)

### Request

```
DELETE /api/agent/connections/:id
Authorization: Bearer <token>
```

Body 없음.

### Response

**200 OK**

```json
{
  "success": true
}
```

### 에러 코드

| 코드 | 설명 |
|------|------|
| 401 | 인증 실패 |
| 404 | 해당 ID의 에이전트가 없거나 다른 조직 소속 |
| 500 | 서버 내부 오류 |

---

## 4. GET /api/agent/tasks/next

다음 대기 중인 작업을 수령한다. PostgreSQL `FOR UPDATE SKIP LOCKED`로 atomic하게 작업을 할당하므로, 여러 agent가 동시에 호출해도 중복 할당이 발생하지 않는다.

### Request

```
GET /api/agent/tasks/next?connectionId=<connectionId>
Authorization: Bearer <token>
```

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `connectionId` | string (query) | O | 에이전트 연결 ID |

### Response

**200 OK** (작업이 있는 경우)

```json
{
  "task": {
    "id": "clxyz...",
    "type": "tc-generate",
    "prompt": "이 기획서를 기반으로 QA TC를 생성해줘",
    "context": {
      "uploadUrls": ["https://fireqa.../uploads/spec.pdf"],
      "templateContent": "...",
      "figmaFileKey": "abc123"
    },
    "mcpTools": ["mcp__figma__*"],
    "sessionId": null,
    "timeoutMs": 300000,
    "projectId": "proj_123"
  }
}
```

**200 OK** (대기 중인 작업이 없는 경우)

```json
{
  "task": null
}
```

### 작업 수령 시 상태 변화

- 해당 작업의 `status`가 `pending` -> `assigned`로 변경
- `connectionId`가 요청한 agent로 설정

### Response 필드 설명

| 필드 | 설명 |
|------|------|
| `id` | 작업 고유 ID |
| `type` | 작업 유형: `tc-generate`, `diagram-generate`, `wireframe-generate`, `improve-spec`, `custom` |
| `prompt` | 조합된 프롬프트 (시스템 역할 + 컨텍스트 + 사용자 지시) |
| `context` | 첨부 파일 URL, 템플릿, Figma 파일 키 등 |
| `mcpTools` | 허용할 MCP 도구 목록 |
| `sessionId` | 이전 세션 ID (세션 연속성용, null이면 새 세션) |
| `timeoutMs` | 작업 타임아웃 (밀리초, 기본 300000 = 5분) |
| `projectId` | 프로젝트 ID (null 가능) |

### 에러 코드

| 코드 | 설명 |
|------|------|
| 400 | `connectionId` 누락 |
| 401 | 인증 실패 |
| 500 | 서버 내부 오류 |

---

## 5. PUT /api/agent/tasks/:id/status

작업 상태를 변경한다. 허용된 전이만 가능하다.

### 허용 전이

| 현재 상태 | 가능한 다음 상태 |
|-----------|-----------------|
| `assigned` | `running`, `failed` |
| `running` | `completed`, `failed`, `timed_out` |

### Request

```
PUT /api/agent/tasks/:id/status
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "status": "running",
  "sessionId": "session_abc",
  "errorMessage": null
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `status` | string | O | 변경할 상태 |
| `sessionId` | string | X | Claude Code 세션 ID (세션 연속성용) |
| `errorMessage` | string | X | 실패 시 에러 메시지 |

### Response

**200 OK**

```json
{
  "status": "running"
}
```

### 상태별 부수 효과

- `running`: `startedAt`이 현재 시각으로 설정
- `completed`, `failed`: `completedAt`이 현재 시각으로 설정

### 에러 코드

| 코드 | 설명 |
|------|------|
| 400 | 허용되지 않는 상태 전이 (예: `pending` -> `completed`) |
| 401 | 인증 실패 |
| 404 | 해당 ID의 작업이 없거나 다른 조직 소속 |
| 500 | 서버 내부 오류 |

---

## 6. POST /api/agent/tasks/:id/output

실시간 로그 청크를 전송한다. agent가 Claude Code의 stdout을 파싱하여 청크 단위로 전송한다.

### Request

```
POST /api/agent/tasks/:id/output
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "chunks": [
    {
      "type": "text",
      "content": "기획서 분석 중...",
      "timestamp": "2026-03-31T10:02:00.000Z"
    },
    {
      "type": "tool_use",
      "content": "Figma MCP 호출",
      "tool": "mcp__figma__create_node",
      "timestamp": "2026-03-31T10:02:05.000Z"
    }
  ]
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `chunks` | AgentOutputChunk[] | O | 로그 청크 배열 (최소 1개) |

#### AgentOutputChunk

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `type` | string | O | `text`, `tool_use`, `tool_result`, `error` |
| `content` | string | O | 로그 내용 |
| `tool` | string | X | 도구 이름 (`tool_use`, `tool_result` 타입 시) |
| `timestamp` | string | O | ISO 8601 타임스탬프 |

### Response

**200 OK**

```json
{
  "received": 2
}
```

### 로그 저장 방식

- 기존 `outputLog`에 새 청크를 append
- 전체 로그가 10MB를 초과하면 최근 100개 청크만 유지

### 에러 코드

| 코드 | 설명 |
|------|------|
| 400 | `chunks`가 비어있거나 배열이 아님 |
| 401 | 인증 실패 |
| 404 | 해당 ID의 작업이 없거나 다른 조직 소속 |
| 500 | 서버 내부 오류 |

---

## 7. POST /api/agent/tasks/:id/result

구조화된 최종 결과를 전송한다. Idempotent: 이미 `completed` 상태인 작업에 재전송하면 무시된다.

### Request

```
POST /api/agent/tasks/:id/result
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "result": {
    "testCases": [
      {
        "id": "TC-001",
        "title": "로그인 성공",
        "precondition": "유효한 계정",
        "steps": ["1. 이메일 입력", "2. 비밀번호 입력", "3. 로그인 클릭"],
        "expected": "대시보드로 이동"
      }
    ],
    "figmaNodesCreated": ["node_1", "node_2"]
  },
  "sessionId": "session_abc"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `result` | object | O | 구조화된 결과 (작업 유형에 따라 구조가 다름) |
| `sessionId` | string | X | Claude Code 세션 ID |

### Response

**200 OK**

```json
{
  "status": "completed"
}
```

### 부수 효과

- `status`가 `completed`로 변경
- `completedAt`이 현재 시각으로 설정
- `result`이 JSON 문자열로 저장
- ActivityLog에 `agent.task_completed` 기록

### 에러 코드

| 코드 | 설명 |
|------|------|
| 401 | 인증 실패 |
| 404 | 해당 ID의 작업이 없거나 다른 조직 소속 |
| 500 | 서버 내부 오류 |

---

## 부록: SSE 로그 구독 (브라우저용)

`GET /api/agent/tasks/:id/output`은 SSE 스트림을 반환한다. agent가 아닌 **브라우저**에서 사용하는 엔드포인트다.

### Request

```
GET /api/agent/tasks/:id/output
Authorization: Bearer <token>  (또는 Supabase 세션 쿠키)
```

### SSE 이벤트

```
data: {"type":"stage","stage":"generating","message":"기획서 분석 중...","progress":0}

data: {"type":"complete","data":null,"tokenUsage":0}
```

- 연결 즉시 기존 로그를 모두 전송
- 이후 1초 간격으로 새 청크를 감지하여 전송
- 작업이 종료 상태가 되면 `complete` 이벤트를 전송하고 스트림을 종료

### 에러 코드

| 코드 | 설명 |
|------|------|
| 401 | 인증 실패 |
| 404 | 해당 ID의 작업이 없거나 다른 조직 소속 |

---

## 소스 코드 위치

| 엔드포인트 | 파일 |
|-----------|------|
| POST /api/agent/connections | `src/app/api/agent/connections/route.ts` |
| GET /api/agent/connections | `src/app/api/agent/connections/route.ts` |
| PUT /api/agent/connections/:id | `src/app/api/agent/connections/[id]/route.ts` |
| DELETE /api/agent/connections/:id | `src/app/api/agent/connections/[id]/route.ts` |
| GET /api/agent/tasks/next | `src/app/api/agent/tasks/next/route.ts` |
| PUT /api/agent/tasks/:id/status | `src/app/api/agent/tasks/[id]/status/route.ts` |
| POST /api/agent/tasks/:id/output | `src/app/api/agent/tasks/[id]/output/route.ts` |
| GET /api/agent/tasks/:id/output (SSE) | `src/app/api/agent/tasks/[id]/output/route.ts` |
| POST /api/agent/tasks/:id/result | `src/app/api/agent/tasks/[id]/result/route.ts` |
