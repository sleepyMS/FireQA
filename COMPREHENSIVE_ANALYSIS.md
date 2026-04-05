# FireQA 종합 분석 보고서

**작성 날짜:** 2026-04-03  
**버전:** v0.1.0  
**Git 브랜치:** feat/agent-integration  
**최근 커밋:** 30ef693 - Phase 4 호스팅 워커 — Fly.io Machines + 크레딧 과금 + 웹 UI

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [아키텍처 개요](#3-아키텍처-개요)
4. [핵심 기능](#4-핵심-기능)
5. [시스템 흐름](#5-시스템-흐름)
6. [데이터 모델](#6-데이터-모델)
7. [API 인터페이스](#7-api-인터페이스)
8. [배포 & 인프라](#8-배포--인프라)
9. [보안 & 성능](#9-보안--성능)
10. [개발 지침](#10-개발-지침)

---

## 1. 프로젝트 개요

### 1.1 프로젝트 정의

**FireQA** — AI 기반 문서 분석 및 QA 생성 플랫폼

- **사용자:** PM, QA 엔지니어, 개발자
- **입력:** 기획서 (PDF, Excel, DOCX)
- **출력:** 테스트 케이스, 다이어그램, 와이어프레임
- **핵심:** OpenAI API + 실시간 스트리밍 + 협업 + 자동화

### 1.2 주요 특징

| 특징 | 설명 |
|-----|------|
| **자동 생성** | 기획서 분석 → AI가 TC, 다이어그램, 와이어프레임 자동 생성 |
| **실시간 스트리밍** | SSE로 생성 진행도 실시간 전송 |
| **협업 기능** | 댓글, 활동 로그, 알림, 버전 관리 |
| **멀티테넌시** | 조직별 격리, 역할 기반 접근 제어 |
| **결제 & 크레딧** | Stripe 구독 + 조직별 크레딧 시스템 |
| **자동화** | Self-hosted 에이전트 + Hosted Fly.io 워커 |
| **플러그인** | Figma 플러그인으로 직접 다이어그램 생성 |

---

## 2. 기술 스택

### 2.1 프론트엔드

| 레이어 | 기술 | 버전 |
|-------|------|------|
| **Framework** | Next.js | 16.2.1 |
| **언어** | TypeScript | 5 |
| **React** | React | 19.2.4 |
| **CSS** | Tailwind CSS 4 + PostCSS | 4 / 4 |
| **UI 컴포넌트** | Base UI React, shadcn | 1.3.0 / 4.1.0 |
| **아이콘** | Lucide React | 0.577.0 |
| **알림** | Sonner | 2.0.7 |
| **테마** | next-themes | 0.4.6 |
| **데이터 페칭** | SWR | 2.4.1 |

### 2.2 백엔드

| 레이어 | 기술 | 버전 |
|-------|------|------|
| **런타임** | Node.js | 22 |
| **프레임워크** | Next.js API Routes | 16.2.1 |
| **언어** | TypeScript | 5 |
| **ORM** | Prisma | 6.19.2 |
| **데이터베이스** | PostgreSQL | 15+ |

### 2.3 AI & 외부 서비스

| 서비스 | 라이브러리 | 용도 |
|-------|---------|------|
| **LLM** | OpenAI SDK | 테스트 케이스, 다이어그램, 와이어프레임 생성 |
| **인증** | Supabase Auth | OAuth, 세션 관리 |
| **결제** | Stripe | 구독, 체크아웃, 고객 포털 |
| **이메일** | Brevo (구 Sendinblue) | 초대, 댓글 회신 알림 |
| **호스팅 워커** | Fly.io Machines API | 자동 스케일링 워커 |

### 2.4 문서 처리

| 형식 | 라이브러리 | 버전 |
|-----|---------|------|
| **PDF** | pdf-parse | 1.1.1 |
| **Excel** | ExcelJS | 4.4.0 |
| **Word** | Mammoth | 1.12.0 |
| **Markdown** | react-markdown + remark-gfm | 9.1.0 / 4.0.1 |

### 2.5 에이전트 & 자동화

| 컴포넌트 | 기술 | 버전 |
|---------|------|------|
| **Agent CLI** | Commander | 13.0.0 |
| **AI CLI** | Claude Code | - |
| **MCP** | Figma MCP | - |
| **테스트** | Vitest | 4.1.2 |
| **린팅** | ESLint | 9 |

### 2.6 기타

| 항목 | 라이브러리 | 용도 |
|-----|---------|------|
| **Schema 검증** | Zod | 4.3.6 |
| **클래스 분류** | class-variance-authority | 0.7.1 |
| **유틸** | clsx, tailwind-merge | 2.1.1 / 3.5.0 |
| **다이어그램** | Dagre (Figma) | 레이아웃 계산 |

---

## 3. 아키텍처 개요

### 3.1 고수준 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                      브라우저 (사용자 UI)                         │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐  │
│  │ 웹 애플리케이션  │  │ Figma 플러그인   │  │ Desktop CLI │  │
│  │ (Next.js 클라이언트) │  │ (iframe UI)      │  │ (Device Auth)│  │
│  └──────────────────┘  └──────────────────┘  └─────────────┘  │
└────────────┬──────────────────┬──────────────────┬──────────────┘
             │                  │                  │
             └──────────────────┼──────────────────┘
                         (HTTPS/SSE)
                          │
┌─────────────────────────┴──────────────────────────────────────┐
│              Vercel Edge + Serverless Functions                │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │             Next.js API Routes                         │   │
│  │                                                        │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐   │   │
│  │  │  Generate   │ │   Version   │ │  Webhooks &  │   │   │
│  │  │  (SSE)      │ │   Control   │ │  Activity    │   │   │
│  │  └─────────────┘ └─────────────┘ └──────────────┘   │   │
│  │                                                        │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐   │   │
│  │  │  Auth       │ │  Billing    │ │  Comments &  │   │   │
│  │  │  (Supabase) │ │  (Stripe)   │ │  Collab      │   │   │
│  │  └─────────────┘ └─────────────┘ └──────────────┘   │   │
│  │                                                        │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐   │   │
│  │  │  Agent Task │ │  Cron Jobs  │ │  Fly.io      │   │   │
│  │  │  Queue      │ │  (Health,   │ │  Orchestrator│   │   │
│  │  │             │ │   Credit)   │ │              │   │   │
│  │  └─────────────┘ └─────────────┘ └──────────────┘   │   │
│  └────────────────────────────────────────────────────────┘   │
│                         │                                      │
└─────────────────────────┼──────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   ┌─────────┐      ┌─────────┐      ┌──────────┐
   │PostgreSQL│      │Supabase │      │ Stripe   │
   │ (Prisma) │      │ (Auth)  │      │ (API)    │
   └─────────┘      └─────────┘      └──────────┘
        │
        │ SQL
        ▼
   ┌─────────────────────────────────┐
   │   Prisma Client (생성, 버전,   │
   │   협업, 크레딧, 에이전트, etc)   │
   └─────────────────────────────────┘

        ┌─────────────────────────────────────────┐
        │        외부 서비스                       │
        ├─────────────────────────────────────────┤
        │ OpenAI API (생성 엔진)                  │
        │ Fly.io (호스팅 워커)                    │
        │ Brevo (이메일)                         │
        └─────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   에이전트 생태계                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                │
│ ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│ │Self-Hosted   │  │Hosted Worker │  │FireQA Agent         │   │
│ │Agent CLI     │  │(Fly.io)      │  │Task Queue           │   │
│ │              │  │              │  │                     │   │
│ │┌───────────┐ │  │┌──────────┐  │  │AgentConnection      │   │
│ ││Config     │ │  ││Docker    │  │  │AgentTask            │   │
│ │├───────────┤ │  │├──────────┤  │  │ - Status            │   │
│ ││Auth       │ │  ││Node 22   │  │  │ - Priority          │   │
│ │├───────────┤ │  │├──────────┤  │  │ - MCP Tools         │   │
│ ││Polling    │ │  ││Claude    │  │  │ - Timeout           │   │
│ │├───────────┤ │  │├──────────┤  │  │ - Credits           │   │
│ ││CLI        │ │  ││Figma MCP │  │  │                     │   │
│ ││Spawner    │ │  ││(sidecar) │  │  │WorkerOrchestrator   │   │
│ │├───────────┤ │  │└──────────┘  │  │ - Pool management   │   │
│ ││Output     │ │  │              │  │ - Health check      │   │
│ ││Parser     │ │  │              │  │ - Auto-scaling      │   │
│ │├───────────┤ │  │              │  │                     │   │
│ ││API        │ │  │              │  │                     │   │
│ ││Client     │ │  │              │  │                     │   │
│ │└───────────┘ │  │              │  │                     │   │
│ └──────────────┘  └──────────────┘  └─────────────────────┘   │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 요청 흐름 (생성 작업)

```
사용자 (웹 UI)
  │
  ├─ 파일 선택 + 프로젝트 선택
  │
  └─ POST /api/generate (FormData)
       │
       ├─ 인증 확인 (Supabase)
       ├─ 레이트 리밋 검사
       │
       ├─ createGenerationJob()
       │  ├─ 파일 파싱 (PDF/Excel/DOCX)
       │  ├─ 프로젝트 검증/생성
       │  └─ Upload + GenerationJob DB 저장
       │
       └─ createSSEStream()
          │
          ├─ Response 즉시 반환 (SSE 헤더)
          │
          └─ 비동기 처리:
             │
             ├─ writer.send({ type: "stage", stage: PARSING })
             │
             ├─ splitDocument() (청크 처리)
             │
             └─ streamOpenAIWithSchema()
                │
                ├─ OpenAI API 호출 (stream + json_schema)
                │
                ├─ writer.send({ type: "progress", charsReceived })
                │  (500ms 스로틀)
                │
                ├─ 토큰 누적 + 파싱
                │
                ├─ completeJob()
                │  └─ GenerationJob 결과 저장
                │
                ├─ logActivity() + deliverWebhooks()
                │
                └─ writer.send({ type: "complete", data, tokenUsage })

사용자 클라이언트
  │
  ├─ SSE 수신 (실시간)
  └─ 진행 상황 UI 업데이트
```

---

## 4. 핵심 기능

### 4.1 생성 엔진 (Generation Engine)

**입력:** 문서 (PDF/Excel/DOCX)  
**처리:** OpenAI + 프롬프트 엔지니어링  
**출력:** 구조화된 JSON (schema 검증)

```
테스트 케이스:
├─ 시트별 분류
├─ 필드: tcId, name, depth1-3, precondition, procedure, expectedResult
└─ 템플릿 지원 (제약조건 + 요구사항)

다이어그램:
├─ 형식: Mermaid
├─ 노드 + 엣지 + 제목
└─ Figma 직접 생성 가능

와이어프레임:
├─ 화면별 레이아웃
└─ UI 요소 + 상호작용
```

### 4.2 협업 기능 (Collaboration)

```
댓글:
├─ 스레드 구조 (parentId)
├─ 소프트 삭제 (감사 추적)
├─ 자동 알림 + 이메일
└─ 해결 표기

활동 로그:
├─ 조직별 감시 추적
├─ 웹훅 연동
└─ 분석용 데이터

알림:
├─ 댓글 회신
├─ 생성 완료
└─ 멤버 초대
```

### 4.3 버전 관리 (Version Control)

```
결과 버전 (ResultVersion):
├─ 초기 생성 (v1)
├─ AI 개선 (ai-improve)
├─ 수동 편집 (manual-edit)
└─ 변경 추적 (changeSummary, instruction)

다이어그램 버전 (DiagramVersion):
├─ Mermaid 코드 버전
├─ 노드/엣지 JSON
└─ 확정 여부 (isConfirmed)
```

### 4.4 결제 & 크레딧 (Billing)

```
구독:
├─ Stripe 연동
├─ 요금제: free/pro/enterprise
└─ 월별 갱신

크레딧:
├─ 작업별 차감 (task_debit)
├─ 월별 리셋 (monthly_reset)
├─ 초과 구매 (purchase)
└─ 환불 (refund)

가격 정책:
├─ 작업 유형별 크레딧 비용
└─ 청크 수에 따른 추가 비용
```

### 4.5 자동화 (Automation)

```
Self-Hosted 에이전트:
├─ CLI 기반 (fireqa-agent)
├─ 사용자 기기에서 실행
└─ Device Auth (5분 유효)

Hosted 워커:
├─ Fly.io Machines
├─ Docker 기반
├─ 자동 스케일링 (warm pool)
└─ 사용자 API Key 지원
```

---

## 5. 시스템 흐름

### 5.1 전체 시스템 흐름

```
[사용자 가입]
  ├─ OAuth (Supabase)
  └─ 조직 자동 생성

[프로젝트 생성]
  ├─ Project + Upload 생성
  └─ 역할 관리 (owner/admin/member)

[문서 업로드]
  ├─ 파일 파싱
  └─ Upload 저장 (metadata)

[생성 작업]
  ├─ GenerationJob 생성 (status: processing)
  ├─ OpenAI 스트리밍
  ├─ 결과 저장
  └─ 웹훅 전달

[협업]
  ├─ 댓글 작성 → 알림 + 이메일
  └─ 활동 로그 기록

[버전 관리]
  ├─ 초기 결과 → v1 (initial)
  ├─ 사용자 편집 → v2 (manual-edit)
  └─ AI 개선 → v3 (ai-improve)

[내보내기]
  ├─ Excel (시트별 TC)
  ├─ JSON (전체 결과)
  ├─ Markdown (문서화)
  └─ Mermaid (코드)

[결제]
  ├─ 신용카드 결제 (Stripe)
  ├─ 크레딧 처리
  └─ 월별 리셋

[에이전트]
  ├─ 작업 큐 (AgentTask)
  ├─ 에이전트 연결 (AgentConnection)
  └─ 작업 할당 + 실행
```

### 5.2 데이터 플로우 (Entity Relationships)

```
Organization (테넌트)
  │
  ├─ User (멤버)
  │   └─ OrganizationMembership (역할)
  │
  ├─ Project (프로젝트)
  │   ├─ Upload (파일)
  │   │   └─ GenerationJob (작업)
  │   │       ├─ ResultVersion (결과 버전)
  │   │       └─ DiagramVersion (다이어그램 버전)
  │   └─ Comment (댓글)
  │
  ├─ Subscription (구독)
  ├─ CreditBalance (크레딧 잔액)
  ├─ CreditTransaction (거래)
  │
  ├─ AgentConnection (에이전트)
  ├─ AgentTask (작업)
  │
  ├─ WebhookEndpoint (웹훅)
  ├─ Invitation (초대)
  └─ UserApiKey (API 키)
```

---

## 6. 데이터 모델

### 6.1 핵심 엔티티 (15개)

**인증 & 멀티테넌시:**
- Organization, User, OrganizationMembership, Invitation, ApiToken, DeviceAuth, UserApiKey

**비즈니스:**
- Project, Upload, GenerationJob, DiagramVersion, ResultVersion, QATemplate

**협업:**
- Comment, ActivityLog, Notification, WebhookEndpoint

**결제 & 에이전트:**
- Subscription, CreditBalance, CreditTransaction, CreditPackage
- AgentConnection, AgentTask, HostedWorker

### 6.2 DB 스키마 특징

```
Soft Delete:
├─ Project (status: active/archived/deleted)
└─ Comment (deletedAt: DateTime?)

Version Control:
├─ ResultVersion (version: Int, isActive: Boolean)
└─ DiagramVersion (version: Int, isConfirmed: Boolean)

JSON Storage:
├─ GenerationJob.config (설정)
├─ GenerationJob.result (결과)
├─ AgentTask.context (컨텍스트)
├─ AgentTask.mcpTools (MCP 도구)
└─ CreditTransaction.metadata

Indexing:
├─ 조직별 (organizationId)
├─ 시간순 (createdAt DESC)
├─ 상태 필터 (status)
└─ 사용자별 (userId)
```

---

## 7. API 인터페이스

### 7.1 REST API 엔드포인트 (50+)

**생성 & 결과:**
```
POST   /api/generate                    테스트 케이스 생성 (SSE)
POST   /api/diagrams                    다이어그램 생성 (SSE)
POST   /api/wireframes                  와이어프레임 생성 (SSE)
POST   /api/improve                     기획서 개선 (SSE)
POST   /api/improve-diagram             다이어그램 개선 (SSE)
PATCH  /api/diagrams/update             다이어그램 수정
PATCH  /api/wireframes/update           와이어프레임 수정
```

**버전 & 결과:**
```
GET    /api/versions?jobId=xxx          버전 목록
POST   /api/versions                    버전 생성
GET    /api/versions/[id]/activate      버전 활성화
GET    /api/diagram-versions?jobId=xxx  다이어그램 버전
```

**협업:**
```
GET    /api/comments?jobId=xxx          댓글 조회
POST   /api/comments                    댓글 작성
PATCH  /api/comments/[id]               댓글 수정
DELETE /api/comments/[id]               댓글 삭제
PATCH  /api/comments/[id]/resolve       댓글 해결
```

**프로젝트 & 조직:**
```
GET    /api/projects                    프로젝트 목록
POST   /api/projects                    프로젝트 생성
PATCH  /api/projects/[id]               프로젝트 수정
POST   /api/projects/[id]/archive       보관
POST   /api/projects/[id]/restore       복원

GET    /api/organization                조직 정보
POST   /api/organization                조직 생성
GET    /api/organization/members        멤버 목록
POST   /api/organization/members        멤버 초대
PATCH  /api/organization/transfer       소유권 이전
```

**내보내기:**
```
GET    /api/export/excel?jobId=xxx      Excel 다운로드
GET    /api/export/json?jobId=xxx       JSON 다운로드
GET    /api/export/markdown?jobId=xxx   Markdown 다운로드
GET    /api/export/mermaid?jobId=xxx    Mermaid 다운로드
```

**에이전트:**
```
GET    /api/agent/tasks/next            다음 작업 수령
PUT    /api/agent/tasks/[id]/status     상태 업데이트
POST   /api/agent/tasks/[id]/result     결과 제출

GET    /api/agent/connections           연결 목록
POST   /api/agent/connections           등록
PUT    /api/agent/connections/[id]      하트비트
DELETE /api/agent/connections/[id]      종료
```

**결제:**
```
POST   /api/billing/checkout            Stripe 세션
GET    /api/billing/portal              고객 포털
GET    /api/billing/usage               사용량
```

**기타:**
```
GET    /api/activity                    활동 로그
GET    /api/analytics                   분석
GET    /api/search                      검색
POST   /api/webhook-endpoints           웹훅 설정
```

### 7.2 SSE 이벤트

```
{ type: "stage", stage: "PARSING", message: "...", progress: 10 }
{ type: "job_created", jobId: "..." }
{ type: "progress", charsReceived: 1234 }
{ type: "complete", data: {...}, tokenUsage: 500 }
{ type: "error", message: "..." }
```

---

## 8. 배포 & 인프라

### 8.1 호스팅 구성

| 컴포넌트 | 호스팅 | 실행 방식 |
|---------|-------|---------|
| **웹 앱** | Vercel | Serverless Functions + Edge |
| **API** | Vercel | Next.js API Routes |
| **DB** | PostgreSQL (Managed) | Prisma ORM |
| **인증** | Supabase | OAuth + 세션 |
| **에이전트** | Self-hosted 또는 Fly.io | Node.js CLI |
| **워커** | Fly.io Machines | Docker (auto-scale) |
| **크론** | Vercel | Cron Jobs |

### 8.2 환경 변수

**필수:**
```
DATABASE_URL              PostgreSQL 연결
DIRECT_URL                Prisma 직접 연결
SUPABASE_URL              Supabase 프로젝트 URL
SUPABASE_ANON_KEY          공개 API 키
ANTHROPIC_API_KEY         Claude API 키
OPENAI_API_KEY            OpenAI API 키
OPENAI_MODEL              모델 (기본: gpt-5-mini)
```

**결제:**
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRO_MONTHLY_PRICE_ID
STRIPE_PRO_YEARLY_PRICE_ID
```

**Fly.io:**
```
FLY_API_TOKEN
FLY_APP_NAME
FLY_WORKER_IMAGE
FLY_WORKER_REGION
```

**이메일:**
```
BREVO_API_KEY
BREVO_SENDER_EMAIL
```

### 8.3 배포 파이프라인

```
Git push to main
  ↓
GitHub Actions (선택)
  ├─ 테스트 실행
  └─ 린팅 검사
  ↓
Vercel (자동 배포)
  ├─ Build: npm run build
  │  └─ prisma generate && next build
  ├─ Deploy to CDN/Edge
  └─ 즉시 라이브
```

---

## 9. 보안 & 성능

### 9.1 보안 조치

| 계층 | 조치 |
|-----|------|
| **네트워크** | HTTPS 강제, HSTS (1년), STS preload |
| **인증** | OAuth (Supabase), API 토큰 (SHA-256 해시) |
| **API** | Rate limiting (조직별 시간당), CORS 제한 |
| **데이터** | 사용자 API Key (AES-256 암호화) |
| **웹훅** | HMAC-SHA256 서명 |
| **헤더** | X-Frame-Options (DENY), X-Content-Type-Options (nosniff) |

### 9.2 성능 최적화

```
데이터베이스:
├─ 인덱스 (조직/사용자/시간순)
└─ 병렬 쿼리 (Promise.all)

캐싱:
├─ 사용자 데이터 (TTL 60초)
├─ 레이트 리밋 (TTL 캐시)
└─ 클라이언트 (SWR, 자동 갱신)

스트리밍:
├─ OpenAI 응답 스트리밍
├─ SSE 실시간 전송
└─ 하트비트 (15초, 프록시 타임아웃 방지)

번들:
├─ lucide-react 최적화
└─ pdf-parse, exceljs 서버외부

수평 확장:
├─ Vercel (자동)
├─ Fly.io warm pool (2~10 워커)
└─ PostgreSQL replicas (선택)
```

---

## 10. 개발 지침

### 10.1 로컬 개발

```bash
# 설치
npm install

# 환경 설정
cp .env.example .env.local
# 필수: DATABASE_URL, SUPABASE_URL, ANTHROPIC_API_KEY 등

# 데이터베이스
npx prisma migrate dev

# 개발 서버
npm run dev

# 또는
make dev  # tmux로 개발 환경 시작
```

### 10.2 테스트

```bash
npm run test        # 단회 실행
npm run test:watch  # 감시 모드
npm run test:coverage  # 커버리지

# 테스트 위치
src/lib/**/*.test.ts
agent/src/**/*.test.ts
```

### 10.3 빌드 & 배포

```bash
# 빌드
npm run build  # prisma generate + next build

# 로컬 테스트
npm start

# 배포
git push origin feat/branch
# Vercel이 자동으로 배포
```

### 10.4 코드 스타일

```
- TypeScript (strict mode)
- ESLint + Prettier (Next.js config)
- 경로 별칭: @/* (src/*)
- 파일 네이밍: kebab-case (파일), PascalCase (컴포넌트)
- 함수: camelCase
- DB 모델: PascalCase
```

### 10.5 커밋 메시지

```
영문 또는 한글, 명령형:
feat: 새 기능 추가
fix: 버그 수정
refactor: 코드 정리
docs: 문서화
test: 테스트 추가
perf: 성능 개선

예:
feat: SSE 스트리밍 에러 처리 개선
fix: 레이트 리미팅 캐시 TTL 버그
docs: README 업데이트
```

---

## 11. 주요 마일스톤

| 버전 | 날짜 | 기능 |
|-----|------|------|
| v0.1.0 | 2026-04-03 | MVP (문서 생성, 협업, 결제) |
| Phase 4 | 2026-03-31 | Hosted 워커, Fly.io, 크레딧 |
| Phase 3 | 2026-03-28 | 에이전트 완성도 (CLI, 웹 UI) |
| Phase 2 | 2026-03-22 | 초기 구조 (생성, 버전, DB) |

---

## 12. 알려진 제한사항 & 개선 로드맵

### 알려진 제한사항

```
1. 파일 저장: DB만 저장, S3 미구현
2. 병렬 작업: maxConcurrentTasks = 1 (하드코딩)
3. 토큰 관리: Figma에 평문 저장
4. 세션 연속성: 수동 sessionId 전달
5. 워커 정리: 자동 정리 미흡
```

### 개선 로드맵

```
Near-term:
├─ S3 파일 저장소
├─ 병렬 작업 처리
└─ Figma 토큰 보안 강화

Mid-term:
├─ 자동 세션 관리
├─ 분산 캐시 (Redis)
└─ 워커 자동 스케일링 정책

Long-term:
├─ 추가 LLM 지원 (Claude, Gemini)
├─ 커스텀 모델 파인튜닝
└─ 팀 협업 (실시간 co-editing)
```

---

## 13. 연락 & 지원

### 문서

- **프로젝트 구조:** `PROJECT_ANALYSIS.md`
- **비즈니스 로직:** `BUSINESS_LOGIC_ANALYSIS.md`
- **에이전트/워커:** `AGENT_WORKER_PLUGIN_ANALYSIS.md`

### 코드 가이드

- **Next.js:** `AGENTS.md` (주의: breaking changes)
- **Prisma:** `prisma/schema.prisma`
- **환경:** `.env.example`

---

## 요약

**FireQA**는 OpenAI + Next.js + Prisma로 구축된 **AI 기반 QA 자동화 플랫폼**입니다.

✅ **기술:** Modern Stack (Next.js 16, React 19, TypeScript, Prisma, PostgreSQL)  
✅ **AI:** OpenAI API + 실시간 스트리밍 + 프롬프트 엔지니어링  
✅ **협업:** 댓글, 버전 관리, 활동 로그, 웹훅  
✅ **자동화:** Self-hosted 에이전트 + Hosted Fly.io 워커 + Figma 플러그인  
✅ **확장성:** 멀티테넌시, 역할 기반 접근, 크레딧 시스템  
✅ **프로덕션:** Vercel + PostgreSQL + Supabase + Stripe

**핵심 가치:**
- 수동 테스트 케이스 작성 시간 단축 (AI 자동 생성)
- 기획서 분석 품질 향상 (다각형 체크: TC, 다이어그램, 와이어프레임)
- 팀 협업 강화 (댓글, 버전 관리, 활동 추적)
- 종량제 결제 (공정한 가격, 사용량 기반)
