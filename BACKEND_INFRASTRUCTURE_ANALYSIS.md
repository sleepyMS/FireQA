# FireQA 백엔드 인프라 및 데이터 모델 종합 분석 보고서

## 목차
1. [데이터 모델 및 스키마](#1-데이터-모델-및-스키마)
2. [인증 및 인가](#2-인증-및-인가)
3. [외부 서비스 연동](#3-외부-서비스-연동)
4. [에이전트 시스템](#4-에이전트-시스템)
5. [크레딧 및 과금 시스템](#5-크레딧-및-과금-시스템)
6. [워커 및 호스팅 인프라](#6-워커-및-호스팅-인프라)
7. [API 라우트 및 서버 사이드 로직](#7-api-라우트-및-서버-사이드-로직)
8. [보안 패턴](#8-보안-패턴)

---

## 1. 데이터 모델 및 스키마

### 1.1 데이터베이스 개요
- **DBMS**: PostgreSQL (Prisma ORM을 통한 관리)
- **스키마 위치**: `prisma/schema.prisma`
- **DB 클라이언트**: `@prisma/client` (v6.19.2)
- **특징**: 
  - 사용자, 조직, 멀티테넌시 지원
  - 소프트 삭제(soft delete) 패턴 사용
  - 트랜잭션 기반의 원자성 보장 (FOR UPDATE 잠금)

### 1.2 주요 데이터 모델

#### A. 멀티테넌시 및 인증 계층

**Organization (조직)**
- `id`: CUID (기본 키)
- `name`: 조직 이름
- `slug`: URL 친화적 고유 이름
- `plan`: 요금제 ("free" | "pro" | "enterprise")
- `timestamps`: createdAt, updatedAt
- **관계**:
  - `memberships`: 조직 구성원 목록 (OrganizationMembership)
  - `activeUsers`: 활성 사용자 목록 (User)
  - `projects`: 소유 프로젝트들
  - `subscription`: Stripe 구독 정보
  - `creditBalance`, `creditTransactions`: 크레딧 관리
  - `agentConnections`, `agentTasks`: 에이전트 작업 관리
  - `webhookEndpoints`: 웹훅 구성
  - `userApiKeys`: 조직별 API 키 저장소

**User (사용자)**
- `id`: CUID
- `supabaseId`: Supabase Auth ID (고유)
- `email`: 이메일 (고유)
- `name`: 사용자 이름
- `activeOrganizationId`: 현재 활성 조직
- `timestamps`: createdAt, updatedAt
- **관계**:
  - `memberships`: 속한 조직들
  - `projects`: 생성한 프로젝트들
  - `apiTokens`: API 토큰 목록
  - `agentConnections`: 등록한 에이전트 연결

**OrganizationMembership (조직 멤버십)**
- 다대다 관계 (User ↔ Organization)
- `role`: "member" | "owner" | "admin"
- `joinedAt`: 가입 시점
- 복합 고유 제약: (userId, organizationId)

**Invitation (초대)**
- 조직 멤버 초대 관리
- `tokenHash`: 초대 링크의 해시값 (보안)
- `status`: "pending" | "accepted" | "cancelled"
- `expiresAt`: 만료 시간
- `role`: 초대된 역할

**ApiToken (API 토큰)**
- 사용자별 API 인증 토큰
- `tokenHash`: SHA-256 해시로 저장 (평문 보관 금지)
- `keyPrefix`: 식별용 앞 8자 (예: "fqa_a1b2")
- `lastUsedAt`: 마지막 사용 시간
- `expiresAt`: 만료 시간

**DeviceAuth (기기 인증)**
- CLI 로그인 시 기기 코드 기반 인증
- `deviceCode`: 기기별 고유 코드
- `token`: 승인 후 발급되는 API 토큰 (1회 조회 후 삭제)
- `status`: "pending" | "approved" | "expired"

#### B. 비즈니스 모델 계층

**Project (프로젝트)**
- `id`: CUID
- `name`, `description`: 프로젝트 정보
- `organizationId`: 소유 조직
- `createdById`: 생성자 (optional)
- `status`: "active" | "archived" | "deleted" (소프트 삭제)
- `archivedAt`, `deletedAt`: 상태 변경 시간
- **성능 최적화 인덱스**:
  - (organizationId, status): 조직별 프로젝트 상태 필터링
  - deletedAt: 삭제된 프로젝트 조회 및 정리

**Upload (파일 업로드)**
- `id`: CUID
- `projectId`, `organizationId`: 소유 관계
- `fileName`, `fileType`, `fileSize`: 파일 정보
- `storagePath`: 저장소 경로
- `parsedText`: 파싱된 텍스트 (선택사항)
- **사용**: 문서, PDF, Excel 등 소스 파일 관리

**GenerationJob (생성 작업)**
- AI 모델을 통한 생성 작업 관리
- `type`: "test-cases" | "diagrams" | "wireframes"
- `status`: "pending" | "processing" | "completed" | "failed"
- `config`: JSON 형식의 설정
- `result`: JSON 형식의 결과 (완료 시)
- `error`: 오류 메시지
- `tokenUsage`: 토큰 사용량 추적
- **성능 최적화**: 복합 인덱스로 사용자/프로젝트별 시간순 조회 지원

**DiagramVersion (다이어그램 버전)**
- `jobId`: 생성 작업 참조
- `diagramTitle`: 다이어그램 제목
- `mermaidCode`: Mermaid 코드
- `nodesJson`, `edgesJson`: 그래프 구조 (JSON)
- `version`: 버전 번호 (1, 2, 3...)
- `isConfirmed`: 사용자 확정 여부
- `createdById`: 버전 생성자

**ResultVersion (결과 버전)**
- 테스트 케이스 등의 생성 결과 버전 관리
- `resultJson`: 전체 결과의 스냅샷
- `changeType`: "initial" | "ai-improve" | "ai-fix" | "manual-edit" | "revert"
- `isActive`: 현재 활성 버전 표시

#### C. 협업 및 모니터링

**ActivityLog (활동 로그)**
- 감시 및 감사(audit) 목적
- `action`: "{domain}.{verb}" 형식 (예: "generation.completed")
- `metadata`: JSON 형식의 추가 정보
- **특징**: jobId는 FK 없음 (작업 삭제 후에도 기록 유지)

**Comment (댓글 및 스레드)**
- 생성 결과에 대한 댓글 및 협업
- `jobId`, `targetItemId`: 댓글 대상 (FK 없음 - 삭제 시에도 유지)
- `parentId`: 스레드 구조 (대댓글 지원)
- `isResolved`: 해결 여부
- `resolvedById`, `resolvedAt`: 해결자 및 시간
- **특징**: 소프트 삭제로 삭제 기록 유지

**Notification (알림)**
- 사용자 활동 알림
- `type`: "comment.reply" | "generation.completed" | "member.invited"
- `isRead`, `readAt`: 읽음 상태 추적
- 조직-사용자 조합 조회 인덱스

**WebhookEndpoint (웹훅)**
- 외부 시스템 연동을 위한 이벤트 구독
- `url`: 웹훅 대상 URL
- `secret`: HMAC-SHA256 서명 키
- `events`: JSON 배열 (빈 배열이면 모든 이벤트)

**QATemplate (테스트 템플릿)**
- 조직별 또는 글로벌 테스트 케이스 템플릿
- `sheetConfig`, `columnConfig`: Excel 시트 구성 (JSON)
- `constraints`, `requirements`: 제약조건과 요구사항
- `isDefault`: 기본 템플릿 표시

#### D. 에이전트 관련 모델 (상세 내용은 섹션 4 참조)

**AgentConnection**
- 에이전트 연결 상태 추적
- `type`: "self_hosted" | "hosted"
- `status`: "online" | "offline"
- `lastHeartbeat`: 마지막 하트비트 시간

**AgentTask**
- 에이전트 작업 큐
- `type`: "tc-generate" | "diagram-generate" | "wireframe-generate" | "improve-spec" | "custom"
- `status`: "pending" | "assigned" | "running" | "completed" | "failed" | "cancelled" | "timed_out"
- `mode`: "self_hosted" | "hosted"
- `creditsUsed`: 소비한 크레딧
- `flyMachineId`: Fly.io 머신 ID (호스팅된 워커)

---

## 2. 인증 및 인가

### 2.1 인증 시스템 구조

#### A. Supabase 기반 인증
- **Provider**: Supabase (https://supabase.com)
- **서버 클라이언트**: `@supabase/ssr` (v0.9.0)
- **클라이언트**: `@supabase/supabase-js` (v2.100.0)
- **세션 관리**: 쿠키 기반 세션 (자동 갱신)

**주요 특징**:
- OAuth 지원 (Google, GitHub 등)
- 이메일/비밀번호 인증
- MFA(Multi-Factor Authentication) 지원
- 세션 토큰은 쿠키에 저장되어 자동으로 갱신됨

#### B. 세션 미들웨어
- **파일**: `src/lib/supabase/middleware.ts`
- **역할**: 요청마다 세션 유효성 검증 및 자동 갱신
- **구현**:
  ```typescript
  updateSupabaseSession(request: NextRequest)
  // - Supabase 서버 클라이언트 생성
  // - 쿠키 관리 (getAll, setAll)
  // - getUser()로 세션 검증 (서버에서 확인)
  // - 응답 쿠키에 갱신된 세션 반영
  ```

### 2.2 사용자 인증 및 캐싱

#### A. 현재 사용자 조회 (`src/lib/auth/get-current-user.ts`)

**세션 기반 인증 (Cookie)**:
```typescript
getCurrentUser(): Promise<AuthUser | null>
// 1. 기존 Supabase 세션 쿠키에서 supabaseId 추출
// 2. DB에서 User 조회 (supabaseId로)
// 3. 멤버십 정보 포함하여 반환
```

**토큰 기반 인증 (Bearer Token)**:
```typescript
authenticateByToken(token: string): Promise<AuthUser | null>
// 1. 요청 헤더에서 "Bearer <token>" 추출
// 2. 토큰을 SHA-256으로 해싱
// 3. DB에서 ApiToken 조회 (해시값으로)
// 4. 토큰 유효 여부 검증 (만료 시간)
// 5. lastUsedAt 갱신 (5분 이상 경과 시만)
```

**AuthUser 타입**:
```typescript
{
  userId: string;
  organizationId: string;
  email: string;
  name: string | null;
  role: string; // "member" | "admin" | "owner"
}
```

#### B. 사용자 캐싱 전략
- **TTL 캐시**: 60초 (메모리 기반)
- **목적**: DB 조회 감소 및 성능 개선
- **캐시 무효화**:
  - 조직 전환: `updateCachedActiveOrg()`
  - 조직 삭제: `invalidateCachedUser()`
  - 신규 조직 생성: `updateCachedNewOrg()`

#### C. API 토큰 관리
- **저장**: SHA-256 해시로 DB에 저장 (평문 금지)
- **식별**: keyPrefix (앞 8자, 예: "fqa_a1b2")
- **사용 추적**: lastUsedAt 타임스탬프
- **만료**: expiresAt (선택사항)
- **생성**: Figma 플러그인, CLI, API 통합 용

### 2.3 권한 제어

#### A. 역할 기반 접근 제어 (RBAC)
- **역할**: "owner" | "admin" | "member"
- **저장 위치**: OrganizationMembership.role
- **검증**: `src/lib/auth/require-role.ts`

**구현 패턴**:
```typescript
requireRole(role: "owner" | "admin" | "member")
// 현재 사용자의 역할을 확인하고, 필요한 권한이 없으면 401/403 반환
```

#### B. 멀티테넌시 격리
- 모든 쿼리에서 organizationId 필터링
- 사용자는 소속 조직의 데이터만 접근 가능
- 조직 전환: activeOrganizationId 변경으로 구현

---

## 3. 외부 서비스 연동

### 3.1 구글 클라우드 및 AI 서비스

#### A. OpenAI (생성형 AI)
- **라이브러리**: `openai` (v6.32.0)
- **사용 목적**:
  - 테스트 케이스 생성
  - 다이어그램 생성
  - 와이어프레임 생성
  - 사양서 개선
- **구현**:
  - `src/lib/openai/client.ts`: OpenAI 클라이언트 생성
  - `src/lib/openai/schemas/`: Zod 스키마로 응답 구조화
  - `src/lib/openai/prompts/`: 프롬프트 템플릿 및 시스템 메시지

**주요 프롬프트 파일**:
- `test-case-system.ts`: 테스트 케이스 생성 시스템 메시지
- `diagram-system.ts`: 다이어그램 생성 시스템 메시지
- `wireframe-system.ts`: 와이어프레임 생성 시스템 메시지
- `spec-improve-system.ts`: 사양서 개선 시스템 메시지

### 3.2 결제 시스템

#### A. Stripe 통합
- **라이브러리**: `stripe` (v21.0.1)
- **파일**: `src/lib/billing/stripe.ts`
- **기능**:
  - 월간/연간 구독 관리
  - 신용 카드 결제
  - 청구서 관리
  - 웹훅을 통한 이벤트 처리

**Stripe 환경변수**:
```
STRIPE_SECRET_KEY: 시크릿 키
STRIPE_PRO_MONTHLY_PRICE_ID: 월간 가격 ID
STRIPE_PRO_YEARLY_PRICE_ID: 연간 가격 ID
```

**API 라우트**:
- `POST /api/billing/checkout`: 결제 세션 생성
- `GET /api/billing/portal`: 고객 포털 리다이렉트
- `GET /api/billing/usage`: 사용량 조회

#### B. 구독 모델
**Subscription 모델**:
```typescript
{
  organizationId: string (고유);
  stripeCustomerId: string; // Stripe 고객 ID
  stripeSubscriptionId: string; // Stripe 구독 ID
  stripePriceId: string; // 현재 가격 ID
  plan: "free" | "pro" | "enterprise";
  status: "active" | "canceled" | "past_due" | "trialing";
  currentPeriodStart: DateTime;
  currentPeriodEnd: DateTime;
  cancelAtPeriodEnd: boolean;
}
```

### 3.3 저장소 및 파일 처리

#### A. 문서 파싱
- **PDF**: `pdf-parse` (v1.1.1)
- **Excel**: `exceljs` (v4.4.0)
- **Word**: `mammoth` (v1.12.0)
- **파서 구현**: `src/lib/parsers/`
  - `pdf-parser.ts`: PDF 추출
  - `xlsx-parser.ts`: Excel 추출
  - `docx-parser.ts`: Word 추출

#### B. 클라이언트 라이브러리
- **Zod**: 데이터 검증 (v4.3.6)
- **React Markdown**: 마크다운 렌더링
- **Remark GFM**: GitHub Flavored Markdown 지원

### 3.4 이메일 서비스

#### A. Brevo (구 Sendinblue)
- **파일**: `src/lib/email/brevo.ts`
- **목적**: 트랜잭션 이메일 발송 (초대, 알림 등)
- **이메일 템플릿**: `src/lib/email/templates/`
  - `comment-reply.ts`: 댓글 답글 알림

---

## 4. 에이전트 시스템

### 4.1 에이전트 개요

FireQA의 에이전트 시스템은 **분산 작업 처리** 아키텍처로, CLI 기반의 에이전트가 FireQA 서버에서 할당한 작업을 실행하는 구조입니다.

#### A. 에이전트 모드
1. **Self-Hosted (자체 호스팅)**
   - 사용자 로컬 머신에서 실행
   - Claude Code CLI 필요
   - Firebase Auth 또는 API 키 기반 인증

2. **Hosted (호스팅됨)**
   - Fly.io Machines에서 실행
   - 크레딧 기반 과금
   - 자동 스케일링 및 리소스 관리

### 4.2 데이터 모델

#### A. 에이전트 연결 (AgentConnection)
```typescript
{
  id: string;
  organizationId: string;
  userId: string;
  name: string; // 에이전트 식별 이름
  type: "self_hosted" | "hosted";
  status: "online" | "offline";
  lastHeartbeat: DateTime | null;
  metadata: {
    cli?: string; // CLI 버전 (예: "claude-code@2.1.91")
    os?: string; // 운영체제
    version?: string; // 에이전트 버전
  };
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

#### B. 에이전트 작업 (AgentTask)
```typescript
{
  id: string;
  organizationId: string;
  projectId?: string;
  connectionId?: string; // 할당된 에이전트
  createdById: string;
  
  // 작업 정보
  type: "tc-generate" | "diagram-generate" | "wireframe-generate" | "improve-spec" | "custom";
  status: "pending" | "assigned" | "running" | "completed" | "failed" | "cancelled" | "timed_out";
  priority: number; // 0 기본값, 높을수록 우선
  
  // 작업 정의
  prompt: string; // 프롬프트
  context: Record<string, unknown>; // JSON 형식의 컨텍스트
  mcpTools: string[]; // MCP 도구 목록
  
  // 실행 제어
  sessionId?: string; // 세션 ID (Claude Code)
  startedAt?: DateTime;
  completedAt?: DateTime;
  timeoutMs: number; // 기본값: 300,000ms (5분)
  
  // 결과
  result?: string; // JSON 형식의 결과
  outputLog?: string; // 실행 로그
  errorMessage?: string;
  
  // 호스팅 관련
  mode: "self_hosted" | "hosted";
  creditsUsed?: number;
  useOwnApiKey: boolean; // 사용자 API 키 사용 여부
  flyMachineId?: string; // Fly.io 머신 ID
  
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

#### C. 호스팅된 워커 (HostedWorker)
```typescript
{
  id: string;
  flyMachineId: string; // Fly.io 머신 ID (고유)
  flyAppName: string; // Fly.io 앱 이름
  status: "idle" | "busy" | "starting" | "stopping" | "dead";
  currentTaskId?: string; // 현재 처리 중인 작업
  region: string; // 기본값: "nrt" (Tokyo)
  lastHealthCheck?: DateTime;
  startedAt: DateTime;
  stoppedAt?: DateTime;
  metadata: Record<string, unknown>;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### 4.3 에이전트 CLI 아키텍처

#### A. 에이전트 CLI 진입점 (`agent/src/cli.ts`)
```typescript
fireqa-agent login           // Supabase OAuth 또는 API 키로 로그인
fireqa-agent config          // 현재 설정 표시
fireqa-agent config:set      // 설정 변경 (cli, server, pollingIntervalMs 등)
fireqa-agent start           // 에이전트 시작 — 작업 대기 및 실행
```

#### B. 핵심 컴포넌트

**ConfigStore** (`agent/src/config/store.ts`)
- 로컬 설정 파일 관리 (`~/.fireqa/config.json`)
- 저장되는 설정:
  - `auth`: 토큰 정보
  - `server`: FireQA 서버 URL
  - `cli`: Claude Code CLI 명령어
  - `mode`: "self_hosted" | "hosted"
  - `pollingIntervalMs`: 작업 폴링 간격
  - `maxConcurrentTasks`: 동시 처리 작업 수

**ApiClient** (`agent/src/reporter/api-client.ts`)
- FireQA 서버와의 통신
- 주요 메서드:
  - `registerConnection()`: 에이전트 등록
  - `pollNextTask()`: 다음 작업 폴링
  - `submitOutput()`: 작업 출력 제출
  - `heartbeat()`: 하트비트 및 취소 신호 수신
  - `disconnect()`: 에이전트 연결 해제

**TaskPoller** (`agent/src/runner/task-poller.ts`)
- 메인 폴링 루프
- 역할:
  1. 서버에 등록 및 heartbeat 전송
  2. 작업 큐에서 다음 작업 폴링 (FOR UPDATE SKIP LOCKED)
  3. CLI (Claude Code) 실행
  4. 출력 파싱 및 스트리밍
  5. 완료/오류 상태 업데이트
  6. 네트워크 오류 시 exponential backoff

**TaskSpawner** (`agent/src/runner/spawner.ts`)
- Claude Code CLI 프로세스 생성
- 표준 출력/오류 캡처
- 타임아웃 관리

**OutputParser** (`agent/src/runner/output-parser.ts`)
- Claude Code 출력 파싱
- 토큰 제목/내용 분류
- 중간 결과 스트리밍

### 4.4 작업 할당 및 실행 흐름

#### A. 작업 할당 메커니즘
```
1. 에이전트가 /api/agent/tasks/next 엔드포인트 호출
   - connectionId 파라미터 포함
   - Bearer 토큰으로 인증

2. 서버의 원자적 업데이트:
   - SQL: FOR UPDATE SKIP LOCKED (동시성 안전)
   - 조건: status = "pending" AND organizationId = {user.organizationId}
   - 정렬: priority DESC, createdAt ASC (우선순위 큐)
   - 업데이트: status="assigned", connectionId 설정, updatedAt 갱신
   - 반환: 할당된 작업 1개

3. 에이전트가 작업 수신 및 실행 시작
```

**응답 JSON 형식**:
```json
{
  "task": {
    "id": "task_id",
    "type": "tc-generate",
    "prompt": "테스트 케이스 생성...",
    "context": { "uploadUrls": [...], "templateContent": "..." },
    "mcpTools": ["filesystem", "web_search"],
    "sessionId": "session_123",
    "timeoutMs": 300000,
    "projectId": "proj_123"
  }
}
```

또는 대기 중인 작업이 없으면:
```json
{ "task": null }
```

#### B. 하트비트 메커니즘
```
1. 에이전트가 10초마다 /api/agent/status/heartbeat 호출
2. 서버가 응답:
   - 에이전트 연결 상태 갱신 (lastHeartbeat)
   - 취소해야 할 작업 ID 목록 (cancelledTaskIds)
   - 다른 설정 변경 사항

3. 에이전트가 취소 신호 수신 시:
   - 현재 실행 중인 작업의 AbortController 트리거
   - Claude Code 프로세스 중단
```

#### C. 출력 제출
```
1. 에이전트가 작업 실행 중 출력을 수집
2. 중간 결과를 스트리밍 (SSE)
3. 완료 또는 오류 시:
   - /api/agent/tasks/{id}/result 또는 /api/agent/tasks/{id}/status 호출
   - outputLog, result, errorMessage 전송
   - status 업데이트 (completed/failed)

4. 네트워크 실패 시:
   - 로컬 파일에 임시 저장
   - exponential backoff로 재시도
```

### 4.5 Server-Side API 엔드포인트

#### A. 에이전트 연결 관리
**POST /api/agent/connections**
- 에이전트 등록 (self-hosted)
- 요청 본문: { name, metadata: { cli, os, version } }
- 응답: { id, status, lastHeartbeat, ... }

**GET /api/agent/connections**
- 현재 조직의 모든 에이전트 연결 조회

**GET /api/agent/connections/:id**
- 특정 에이전트 연결 상세 조회

**DELETE /api/agent/connections/:id**
- 에이전트 연결 해제

#### B. 작업 관리
**GET /api/agent/tasks/next**
- 다음 작업 폴링 (connectionId 파라미터)
- FOR UPDATE SKIP LOCKED로 동시성 안전 할당

**GET /api/agent/tasks/:id/status**
- 작업 상태 조회

**POST /api/agent/tasks/:id/status**
- 작업 상태 업데이트 (running/completed/failed)

**POST /api/agent/tasks/:id/output**
- 출력 로그 제출 (SSE 스트림)
- 중간 결과도 수집 가능

**GET /api/agent/tasks/:id/result**
- 최종 결과 조회

**POST /api/agent/status/heartbeat**
- 하트비트 및 취소 신호 수신

#### C. 대시보드
**GET /api/agent/dashboard**
- 에이전트 대시보드 데이터
  - 연결된 에이전트 목록
  - 실행 중인 작업 수
  - 최근 작업 목록

### 4.6 Hosted Worker 실행 흐름

1. **사용자 호스팅 작업 요청**: `agentTask.mode = "hosted"` 설정
2. **서버 처리**:
   - 크레딧 확인 및 차감
   - Fly.io Machines API로 새 머신 생성
   - Docker 컨테이너에 fireqa-agent 실행
3. **워커 시작**:
   - Dockerfile에서 Claude Code CLI 설치
   - `fireqa-agent start` 실행 (폴링 모드)
4. **작업 처리**: Self-hosted와 동일한 폴링/실행 흐름
5. **워커 종료**:
   - 작업 완료 후 유휴 상태 유지 (짧은 시간)
   - 비용 절감을 위해 자동 종료

---

## 5. 크레딧 및 과금 시스템

### 5.1 크레딧 기반 과금 구조

#### A. 크레딧 모델
```typescript
// CreditBalance: 조직의 크레딧 잔액
{
  organizationId: string; // 고유
  balance: number; // 현재 잔액
  monthlyQuota: number; // 월간 할당량
  quotaResetAt?: DateTime; // 할당량 리셋 시간
  updatedAt: DateTime;
}

// CreditTransaction: 크레딧 거래 내역
{
  organizationId: string;
  amount: number; // 양수: 충전, 음수: 차감
  type: "plan_grant" | "purchase" | "task_debit" | "refund" | "monthly_reset";
  taskId?: string; // 어떤 작업 때문인지
  description?: string;
  balanceAfter: number; // 거래 후 잔액
  createdAt: DateTime;
}

// CreditPackage: 판매용 크레딧 패키지
{
  id: string;
  name: string; // "Starter" 등
  credits: number; // 포함된 크레딧 수
  priceInCents: number; // 가격 (센트 단위)
  stripePriceId: string; // Stripe 가격 ID (고유)
  isActive: boolean;
  createdAt: DateTime;
}
```

#### B. 크레딧 차감 로직 (`src/lib/billing/credits.ts`)

**atomicDeductCredits**:
```typescript
export async function deductCredits(
  organizationId: string,
  amount: number,
  opts: { type: string; taskId?: string; description?: string }
): Promise<CreditResult>
```

**특징**:
- **원자성**: Prisma 트랜잭션 + FOR UPDATE 잠금
- **동시성 안전**: PostgreSQL의 FOR UPDATE로 race condition 방지
- **실패 처리**: 잔액 부족 시 { success: false, reason: "..." } 반환
- **감사 추적**: CreditTransaction 기록으로 모든 거래 추적

**흐름**:
```
1. FOR UPDATE로 CreditBalance 행 잠금
2. 현재 잔액 조회
3. 잔액 >= 차감액 검증
4. balance -= amount로 업데이트
5. CreditTransaction 레코드 생성
6. 거래 후 잔액 반환
```

#### C. 크레딧 충전 로직

**addCredits**:
```typescript
export async function addCredits(
  organizationId: string,
  amount: number,
  opts: { type: string; description?: string }
): Promise<{ balanceAfter: number }>
```

**특징**:
- **Upsert 패턴**: CreditBalance가 없으면 생성, 있으면 업데이트
- **increment**: balance를 안전하게 증가
- CreditTransaction 기록으로 충전 내역 추적

**사용 사례**:
- 구독 시 plan_grant
- 수동 크레딧 구매 시 purchase
- 월간 할당량 리셋 시 monthly_reset
- 작업 실패 시 refund

### 5.2 요금제 및 크레딧 정책

#### A. 요금제별 정책 (`src/lib/billing/plan-limits.ts`)
```typescript
{
  free: { monthlyQuota: 100, taskCost: 1 },
  pro: { monthlyQuota: 5000, taskCost: 1 },
  enterprise: { monthlyQuota: 무제한, taskCost: custom }
}
```

#### B. 가격 책정 (`src/lib/billing/credit-pricing.ts`)
- 호스팅된 워커 실행 시 크레딧 소비
- 테스트 케이스 생성: X 크레딧
- 다이어그램 생성: Y 크레딧
- 와이어프레임 생성: Z 크레딧

### 5.3 결제 흐름

#### A. Stripe 결제
1. **결제 세션 생성** (`POST /api/billing/checkout`)
   - 선택한 가격/수량 기반 세션 생성
   - Stripe로 리다이렉트

2. **결제 완료** (Stripe 웹훅)
   - `invoice.payment_succeeded` 이벤트 처리
   - CreditBalance 업데이트
   - Subscription 상태 갱신

3. **고객 포털** (`GET /api/billing/portal`)
   - Stripe 고객 포털로 리다이렉트
   - 구독 관리, 결제 방법 변경

---

## 6. 워커 및 호스팅 인프라

### 6.1 Docker 컨테이너화

#### A. Dockerfile 구조 (`worker/Dockerfile`)
```dockerfile
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends git

# 1. Claude Code CLI 설치
RUN npm install -g @anthropic-ai/claude-code

# 2. Figma MCP 사전 설정 (선택사항)
RUN claude mcp add figma -- npx -y @anthropic-ai/claude-code-figma-mcp || true

# 3. fireqa-agent 빌드
COPY agent/ /app/agent/
WORKDIR /app/agent
RUN npm ci --omit=dev && npm run build

# 환경변수 (Fly.io에서 주입)
ENV FIREQA_MODE=hosted

# 실행
CMD ["node", "dist/cli.js", "start"]
```

**특징**:
- Node.js 22 slim 이미지 (경량)
- Claude Code CLI 글로벌 설치
- fireqa-agent 빌드 및 패키징
- 환경변수를 통한 모드 설정

### 6.2 Fly.io 배포

#### A. fly.toml 구성 (`worker/fly.toml`)
```toml
app = "fireqa-workers"
primary_region = "nrt"  # Tokyo

[build]
  dockerfile = "Dockerfile"

[deploy]
  strategy = "immediate"
```

**특징**:
- 앱 이름: "fireqa-workers" (Fly.io 대시보드에서 관리)
- 기본 지역: nrt (Tokyo)
- 즉시 배포 전략
- Machines API로 관리 (서비스/HTTP 포트 불필요)

#### B. Machines API 운영
1. **머신 생성** (사용자 작업 시):
   - Docker 이미지 배포
   - 환경변수 주입:
     - FIREQA_SERVER: FireQA 서버 URL
     - FIREQA_TOKEN: 인증 토큰
     - ANTHROPIC_API_KEY: Claude API 키
   - 리소스 할당

2. **상태 모니터링**:
   - lastHealthCheck로 워커 상태 추적
   - 타임아웃 시 자동 중지

3. **비용 최적화**:
   - 작업 완료 후 자동 종료
   - 유휴 워커 정리 (메인테넌스 작업)

### 6.3 호스팅된 워커 생명주기

```
1. 작업 요청 (mode="hosted")
   ↓
2. 크레딧 확인 및 차감
   ↓
3. Fly.io Machines API로 새 머신 생성
   ↓
4. Docker 컨테이너 시작
   ↓
5. fireqa-agent 실행 및 작업 폴링
   ↓
6. 작업 완료
   ↓
7. 유휴 상태 유지 (재사용 대기)
   ↓
8. 타임아웃 또는 명시적 종료
   ↓
9. 머신 중지/삭제
```

---

## 7. API 라우트 및 서버 사이드 로직

### 7.1 API 라우트 구조

```
src/app/api/
├── agent/                    # 에이전트 시스템
│   ├── connections/          # 연결 관리
│   ├── tasks/                # 작업 관리
│   ├── status/               # 상태 조회
│   └── dashboard/            # 대시보드
├── billing/                  # 결제 및 과금
│   ├── checkout/
│   ├── portal/
│   └── usage/
├── auth/                     # 인증
│   └── device/
├── projects/                 # 프로젝트 관리
├── upload/                   # 파일 업로드
├── diagrams/                 # 다이어그램 API
├── wireframes/               # 와이어프레임 API
├── organization/             # 조직 관리
├── notifications/            # 알림
├── comments/                 # 댓글
├── export/                   # 내보내기
├── webhook-endpoints/        # 웹훅
├── templates/                # 템플릿
├── cron/                     # 크론 작업
└── tasks/                    # 작업 조회
```

### 7.2 주요 엔드포인트

#### A. 프로젝트 관리
```
GET    /api/projects           # 프로젝트 목록
POST   /api/projects           # 프로젝트 생성
GET    /api/projects/:id       # 프로젝트 상세
PATCH  /api/projects/:id       # 프로젝트 수정
POST   /api/projects/:id/archive    # 보관
POST   /api/projects/:id/restore    # 복구
```

#### B. 업로드 및 생성
```
POST   /api/upload             # 파일 업로드
POST   /api/diagrams           # 다이어그램 생성 (AI)
POST   /api/wireframes         # 와이어프레임 생성 (AI)
POST   /api/improve            # 사양서 개선 (AI)
```

#### C. 결과 조회 및 수정
```
GET    /api/diagrams/:jobId    # 다이어그램 조회
POST   /api/diagrams/:jobId/update   # 다이어그램 업데이트
GET    /api/wireframes/:jobId  # 와이어프레임 조회
POST   /api/wireframes/:jobId/update # 와이어프레임 업데이트
```

#### D. 협업
```
POST   /api/comments           # 댓글 작성
GET    /api/comments/:id       # 댓글 조회
POST   /api/comments/:id/resolve    # 댓글 해결
GET    /api/notifications      # 알림 조회
POST   /api/notifications/read # 읽음 표시
```

#### E. 내보내기
```
GET    /api/export/json        # JSON 내보내기
GET    /api/export/excel       # Excel 내보내기
GET    /api/export/markdown    # Markdown 내보내기
GET    /api/export/mermaid     # Mermaid 내보내기
```

### 7.3 SSE (Server-Sent Events) 스트리밍

#### A. 구현 파일
- `src/lib/sse/create-sse-stream.ts`: SSE 스트림 생성
- `src/lib/sse/stream-openai.ts`: OpenAI 응답 스트리밍
- `src/hooks/use-sse.ts`: 클라이언트 훅

#### B. 사용 사례
1. **생성형 AI 결과 스트리밍**
   - 테스트 케이스, 다이어그램 등
   - 토큰 단위로 클라이언트에 전송

2. **에이전트 출력 스트리밍**
   - Claude Code 실행 결과
   - 실시간 진행 상황 표시

### 7.4 서버 액션 및 클라이언트 통신

#### A. SWR (Stale-While-Revalidate)
- 라이브러리: `swr` (v2.4.1)
- 캐싱 전략으로 API 호출 최소화
- 재시도 로직 포함

#### B. 에러 응답 표준화
```typescript
// src/lib/api/error-response.ts
{
  error: string;        // 에러 메시지
  status: number;       // HTTP 상태 코드
  requestId?: string;   // 추적 ID
}
```

---

## 8. 보안 패턴

### 8.1 HTTP 보안 헤더

#### A. next.config.ts에서 설정
```typescript
headers: [
  { key: "X-Frame-Options", value: "DENY" },           // Clickjacking 방지
  { key: "X-Content-Type-Options", value: "nosniff" },  // MIME sniffing 방지
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
]
```

### 8.2 토큰 및 키 관리

#### A. API 토큰 저장
- **저장**: SHA-256 해시로 DB에 저장
- **전송**: Bearer 토큰 형식 (HTTPS 필수)
- **만료**: 선택적 expiresAt 필드
- **식별**: keyPrefix로 토큰 식별 (예: "fqa_a1b2")

#### B. Stripe 키 관리
```typescript
function createStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith("sk-placeholder")) return null;
  return new Stripe(key);
}
```
- 환경변수에서만 로드
- 빌드 시 플레이스홀더로 구조 유지 가능

#### C. 웹훅 서명
```typescript
// WebhookEndpoint.secret
// HMAC-SHA256으로 웹훅 서명
// 외부 서비스에서 전송한 데이터 무결성 검증
```

### 8.3 멀티테넌시 격리

#### A. 조직별 데이터 격리
- 모든 쿼리에 organizationId 필터 추가
- 사용자는 소속 조직의 데이터만 접근
- 권한 검증 미들웨어

#### B. 역할 기반 접근 제어
```typescript
requireRole("admin") // owner | admin | member
```
- 엔드포인트별 권한 검증
- 조직 관리: owner/admin만
- 일반 작업: member도 가능

### 8.4 트랜잭션 기반 안전성

#### A. 크레딧 차감
```typescript
FOR UPDATE  // 행 잠금
tx.$transaction()  // 원자적 처리
```
- Race condition 방지
- 잔액 부족 검증
- 거래 기록 자동화

#### B. 작업 할당
```typescript
FOR UPDATE SKIP LOCKED  // 잠금된 행 건너뛰기
// 동시에 여러 에이전트가 작업을 가져가는 것 방지
```

### 8.5 감사 추적 (Audit Trail)

#### A. ActivityLog
- 모든 중요 작업 기록
- FK 없음: 원본 데이터 삭제 후에도 로그 유지
- 조사 및 규정 준수용

#### B. Comment 소프트 삭제
- deletedAt으로 삭제 기록 유지
- 댓글 스레드 무결성 유지

---

## 9. 성능 최적화

### 9.1 데이터베이스 인덱싱

```
Organization.slug: UNIQUE (빠른 조직 조회)
User.supabaseId: UNIQUE (인증 기반 조회)
OrganizationMembership: (userId, organizationId) UNIQUE (멤버십 확인)
Project: (organizationId, status), deletedAt (조직별 필터링)
GenerationJob: (userId, createdAt DESC), (projectId, createdAt DESC), status
AgentTask: (organizationId, status), (connectionId)
```

### 9.2 캐싱 전략

#### A. 사용자 캐시 (TTL 60초)
```typescript
createTTLCache<CachedUser>(60_000)
```
- 세션 기반 매 요청마다 DB 조회 방지
- 조직 전환 시만 업데이트

#### B. API 토큰 사용량 스로틀
```typescript
// lastUsedAt 갱신: 5분 이상 경과 시만
if (!lastUsed || Date.now() - lastUsed.getTime() > 5 * 60_000) {
  prisma.apiToken.update(...)
}
```

### 9.3 배치 처리

#### A. 이전 실행의 미전송 데이터 재전송
```typescript
await api.flushPendingOutputs()
```
- 네트워크 오류로 인한 데이터 손실 방지
- 로컬 파일에 임시 저장

---

## 10. 보안 권장사항 및 검토 사항

### 10.1 현재 강점
1. ✅ SHA-256 토큰 해싱 (평문 저장 금지)
2. ✅ FOR UPDATE 동시성 제어
3. ✅ HTTPS + HSTS (31536000초 = 1년)
4. ✅ Supabase 기반 강력한 인증
5. ✅ 감사 추적 (ActivityLog, Comment)
6. ✅ RBAC (역할 기반 접근 제어)
7. ✅ 웹훅 HMAC-SHA256 서명

### 10.2 검토 권장사항
1. 🔍 API 비율 제한 (Rate Limiting) 구현 여부 확인
2. 🔍 입력 검증 및 SQL Injection 방지 (Prisma 사용 중)
3. 🔍 Stripe 웹훅 서명 검증 구현
4. 🔍 CORS 정책 검토
5. 🔍 민감한 데이터(API 키) 로깅 제외 확인
6. 🔍 에이전트 간 작업 격리 (다른 조직의 작업 접근 금지)

---

## 11. 운영 고려사항

### 11.1 모니터링
- **에이전트 헬스체크**: `GET /api/cron/agent-health` (정기적 실행)
- **호스팅된 워커 상태**: lastHealthCheck로 추적
- **크레딧 사용량**: CreditTransaction으로 기록

### 11.2 메인테넌스
- 유휴 워커 자동 종료 (Fly.io 비용 절감)
- 미전송 에이전트 출력 정리
- 소프트 삭제된 데이터 물리 삭제 정책

### 11.3 확장성
- PostgreSQL 읽기 복제본으로 쿼리 분산 가능
- 에이전트 폴링 간격 조정 (config.pollingIntervalMs)
- Fly.io Machines로 자동 스케일링

---

## 결론

FireQA의 백엔드 인프라는 다음의 핵심 특징을 가집니다:

1. **멀티테넌시**: 조직 기반의 격리된 데이터 관리
2. **분산 에이전트**: CLI 기반 self-hosted 및 Fly.io 기반 hosted 모드 지원
3. **크레딧 기반 과금**: 원자적 거래 처리로 일관성 보장
4. **실시간 스트리밍**: SSE를 통한 생성형 AI 결과 전달
5. **감사 추적**: 모든 중요 작업 기록으로 규정 준수 지원
6. **보안**: 토큰 해싱, RBAC, 감시 추적, HTTPS 등

이 아키텍처는 확장 가능하고 안전하며, 다양한 사용 사례(개인 개발자부터 엔터프라이즈까지)를 지원합니다.
