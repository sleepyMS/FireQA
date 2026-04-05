# FireQA 프로젝트 구조 & 설정 분석

**분석 날짜:** 2026-04-03  
**프로젝트:** FireQA  
**Git 브랜치:** feat/agent-integration

---

## 1. 기술 스택 요약

### 프레임워크 & 언어
- **Frontend:** Next.js 16.2.1, React 19.2.4, TypeScript 5
- **Backend:** Next.js API Routes (serverless)
- **언어:** TypeScript (strictMode 활성화)

### 데이터베이스 & ORM
- **DB:** PostgreSQL
- **ORM:** Prisma 6.19.2
- **마이그레이션:** Prisma Migrations (17개 마이그레이션 파일)

### 스타일링 & UI
- **CSS Framework:** Tailwind CSS 4 (PostCSS)
- **UI 라이브러리:** 
  - Base UI React 1.3.0
  - shadcn 컴포넌트
  - Lucide React 아이콘
  - Sonner 토스트 알림

### 인증 & 호스팅
- **인증:** Supabase Auth (SSR 지원)
- **배포:** Vercel
- **호스팅 워커:** Fly.io Machines

### AI & 문서 처리
- **LLM API:** OpenAI 6.32.0
- **PDF:** pdf-parse 1.1.1
- **Excel:** ExcelJS 4.4.0
- **Word (DOCX):** Mammoth 1.12.0
- **마크다운:** react-markdown 9.1.0, remark-gfm 4.0.1

### 결제 & 크레딧
- **결제:** Stripe 21.0.1
- **내부 크레딧 시스템:** 차감 기반 과금

### 데이터 페칭 & 상태 관리
- **SWR:** 2.4.1 (클라이언트 데이터 페칭)
- **테마:** next-themes 0.4.6

### 검증 & 유틸
- **스키마 검증:** Zod 4.3.6
- **클래스 분류:** class-variance-authority 0.7.1
- **유틸:** clsx, tailwind-merge

### 테스트
- **프레임워크:** Vitest 4.1.2
- **커버리지:** @vitest/coverage-v8
- **테스트 패턴:** `src/**/*.test.ts`

### 린팅 & 코드 품질
- **ESLint:** 9 (Next.js + TypeScript config)
- **무시 대상:** .next/, figma-plugin/dist/

### 환경 관리
- **ENV:** dotenv 17.3.1
- **설정 파일:** .env, .env.local, .env.production, .env.example

---

## 2. 디렉토리 구조

```
fireqa/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # 인증 페이지 그룹
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   ├── onboarding/
│   │   │   ├── invite/
│   │   │   ├── forgot-password/
│   │   │   ├── reset-password/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/              # 대시보드 페이지 그룹
│   │   │   ├── [orgSlug]/            # 조직별 라우트
│   │   │   │   ├── projects/         # 프로젝트 목록 & 상세
│   │   │   │   ├── generate/[jobId]/ # 생성 결과 페이지
│   │   │   │   ├── diagrams/[jobId]/ # 다이어그램 상세
│   │   │   │   ├── wireframes/[jobId]/ # 와이어프레임
│   │   │   │   ├── improve/[jobId]/  # 개선 페이지
│   │   │   │   ├── dashboard/        # 대시보드
│   │   │   │   ├── settings/         # 조직 설정
│   │   │   │   │   ├── settings-general.tsx
│   │   │   │   │   ├── settings-billing.tsx
│   │   │   │   │   ├── settings-members.tsx
│   │   │   │   │   ├── settings-webhooks.tsx
│   │   │   │   │   └── invite-dialog.tsx
│   │   │   │   ├── guide/            # 에이전트 가이드
│   │   │   │   ├── analytics/        # 분석 대시보드
│   │   │   │   ├── activity/         # 활동 로그
│   │   │   │   ├── history/          # 생성 이력
│   │   │   │   ├── templates/        # QA 템플릿
│   │   │   │   └── layout.tsx
│   │   │   └── loading.tsx, error.tsx
│   │   ├── api/                      # API Routes
│   │   │   ├── auth/                 # 인증 API
│   │   │   │   ├── device/           # 디바이스 인증
│   │   │   │   ├── signup/           # 회원가입
│   │   │   │   └── callback/         # Supabase 콜백
│   │   │   ├── generate/             # 생성 API
│   │   │   ├── diagrams/             # 다이어그램 API
│   │   │   ├── wireframes/           # 와이어프레임 API
│   │   │   ├── improve/              # 개선 API
│   │   │   ├── fix-mermaid/          # Mermaid 수정
│   │   │   ├── improve-diagram/      # 다이어그램 개선
│   │   │   ├── upload/               # 파일 업로드
│   │   │   ├── projects/             # 프로젝트 CRUD
│   │   │   ├── organization/         # 조직 관리
│   │   │   ├── invitations/          # 초대 관리
│   │   │   ├── comments/             # 댓글 API
│   │   │   ├── notifications/        # 알림 API
│   │   │   ├── export/               # 내보내기 (JSON, Excel, Markdown, Mermaid)
│   │   │   ├── billing/              # 결제 API
│   │   │   ├── webhook-endpoints/    # 웹훅 설정
│   │   │   ├── agent/                # 에이전트 API
│   │   │   │   ├── connections/      # 에이전트 연결 관리
│   │   │   │   └── tasks/            # 에이전트 작업 관리
│   │   │   ├── settings/api-keys/    # API 키 관리
│   │   │   ├── cron/                 # Vercel 크론 작업
│   │   │   ├── analytics/            # 분석 데이터
│   │   │   ├── search/               # 검색
│   │   │   ├── activity/             # 활동 로그
│   │   │   └── ... (기타 API routes)
│   │   ├── globals.css               # 전역 스타일
│   │   ├── layout.tsx                # 루트 레이아웃
│   │   ├── page.tsx                  # 홈페이지
│   │   └── favicon.ico
│   │
│   ├── components/                   # React 컴포넌트
│   │   ├── ui/                       # UI 컴포넌트 라이브러리
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── select.tsx
│   │   │   ├── label.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   └── sonner.tsx
│   │   ├── diagrams/
│   │   │   └── mermaid-preview.tsx
│   │   ├── projects/
│   │   │   └── project-header.tsx
│   │   ├── test-cases/
│   │   │   └── test-case-results.tsx
│   │   ├── versions/
│   │   │   └── version-bar.tsx
│   │   ├── wireframes/
│   │   │   └── wireframe-results.tsx
│   │   ├── job-status-display.tsx
│   │   └── generation-error.tsx
│   │
│   ├── lib/                          # 비즈니스 로직 & 유틸
│   │   ├── api/
│   │   │   ├── error-response.ts     # API 에러 응답 포맷
│   │   │   └── create-generation-job.ts
│   │   ├── auth/
│   │   │   ├── provision-user.ts     # 사용자 프로비저닝
│   │   │   ├── get-current-user.ts
│   │   │   ├── user-provider.tsx     # React Context
│   │   │   └── require-role.ts       # 권한 확인
│   │   ├── parsers/                  # 문서 파서
│   │   │   ├── pdf-parser.ts
│   │   │   ├── xlsx-parser.ts
│   │   │   ├── docx-parser.ts
│   │   │   └── index.ts
│   │   ├── openai/                   # OpenAI 통합
│   │   │   ├── client.ts             # OpenAI 클라이언트
│   │   │   ├── schemas/              # Zod 스키마
│   │   │   │   ├── test-case.ts
│   │   │   │   ├── diagram.ts
│   │   │   │   ├── diagram-with-nodes.ts
│   │   │   │   ├── wireframe.ts
│   │   │   │   └── spec-improve.ts
│   │   │   └── prompts/              # 프롬프트 템플릿
│   │   │       ├── test-case-system.ts
│   │   │       ├── diagram-system.ts
│   │   │       ├── wireframe-system.ts
│   │   │       ├── spec-improve-system.ts
│   │   │       └── spec-exemplar.ts
│   │   ├── excel/
│   │   │   ├── builder.ts            # Excel 파일 생성
│   │   │   └── styles.ts             # Excel 스타일
│   │   ├── mermaid/
│   │   │   └── sanitize.ts           # Mermaid 다이어그램 정제
│   │   ├── sse/                      # Server-Sent Events
│   │   │   ├── create-sse-stream.ts
│   │   │   ├── parse-sse-client.ts
│   │   │   ├── stream-openai.ts
│   │   │   └── stream-openai-chunked-tc.ts
│   │   ├── supabase/
│   │   │   ├── client.ts             # 클라이언트 인스턴스
│   │   │   ├── server.ts             # 서버 인스턴스
│   │   │   └── middleware.ts         # 인증 미들웨어
│   │   ├── db.ts                     # Prisma 인스턴스
│   │   ├── billing/
│   │   │   ├── stripe.ts             # Stripe 통합
│   │   │   ├── plan-limits.ts        # 요금제 제한
│   │   │   ├── credit-pricing.ts     # 크레딧 가격
│   │   │   ├── credits.ts            # 크레딧 관리
│   │   │   └── get-org-plan.ts
│   │   ├── notifications/
│   │   │   └── create-notification.ts
│   │   ├── webhooks/
│   │   │   └── deliver.ts            # 웹훅 전달
│   │   ├── email/
│   │   │   ├── brevo.ts              # 이메일 발송
│   │   │   └── templates/
│   │   │       ├── invitation.ts
│   │   │       └── comment-reply.ts
│   │   ├── i18n/                     # 국제화
│   │   │   ├── messages.ts
│   │   │   ├── ko.ts
│   │   │   ├── en.ts
│   │   │   └── locale-provider.tsx
│   │   ├── text/
│   │   │   └── split-document.ts     # 문서 분할
│   │   ├── agent/                    # 에이전트 관련
│   │   │   ├── prompt-builder.ts     # 프롬프트 구성
│   │   │   └── parse-task-result.ts  # 결과 파싱
│   │   ├── flyio/                    # Fly.io 통합
│   │   │   ├── client.ts
│   │   │   └── orchestrator.ts
│   │   ├── cache/
│   │   │   └── ttl-cache.ts
│   │   ├── rate-limit/
│   │   │   └── check-rate-limit.ts
│   │   ├── crypto/
│   │   │   └── encrypt.ts
│   │   ├── analytics/
│   │   │   └── get-analytics-data.ts
│   │   ├── activity/
│   │   │   └── log-activity.ts
│   │   ├── swr/
│   │   │   ├── fetcher.ts
│   │   │   ├── swr-provider.tsx
│   │   │   └── keys.ts
│   │   ├── utils.ts                  # 범용 유틸
│   │   ├── slug.ts
│   │   ├── avatar-colors.ts
│   │   ├── date/
│   │   │   └── relative-time.ts
│   │   └── projects/
│   │       └── get-org-project.ts
│   │
│   ├── types/                        # TypeScript 타입 정의
│   │   ├── test-case.ts
│   │   ├── diagram.ts
│   │   ├── document.ts
│   │   ├── comment.ts
│   │   ├── sse.ts
│   │   └── spec-improve.ts
│   │
│   ├── hooks/                        # React Hooks
│   │   ├── use-sse.ts
│   │   └── use-sse-inline.ts
│   │
│   ├── generated/                    # Prisma 자동 생성
│   │   └── prisma/
│   │       ├── client.ts
│   │       ├── browser.ts
│   │       ├── enums.ts
│   │       ├── models/
│   │       └── ...
│   │
│   └── lib/current-project-context.tsx  # 현재 프로젝트 Context
│
├── agent/                            # FireQA Agent CLI
│   ├── src/
│   │   ├── cli.ts                   # CLI 엔트리포인트
│   │   ├── config/
│   │   │   └── store.ts             # 설정 저장소
│   │   ├── auth/
│   │   │   ├── api-key.ts           # API 키 인증
│   │   │   └── oauth.ts             # OAuth 흐름
│   │   ├── runner/
│   │   │   ├── spawner.ts           # 프로세스 실행
│   │   │   ├── task-poller.ts       # 작업 폴링
│   │   │   └── output-parser.ts     # 출력 파싱
│   │   └── reporter/
│   │       └── api-client.ts        # API 클라이언트
│   ├── package.json
│   ├── tsconfig.json
│   └── node_modules/
│
├── prisma/                           # Prisma ORM
│   ├── schema.prisma                # 데이터베이스 스키마
│   ├── migrations/                  # DB 마이그레이션 (17개)
│   │   ├── 20260322153609_init/
│   │   ├── 20260323142135_add_auth_models/
│   │   ├── 20260327152939_add_invitation_model/
│   │   ├── 20260328000000_multi_org/
│   │   ├── 20260328031933_add_project_soft_delete/
│   │   ├── 20260328034929_add_result_version/
│   │   ├── 20260328040256_add_activity_log/
│   │   ├── 20260328042021_add_comment/
│   │   ├── 20260328043307_add_notification/
│   │   ├── 20260328060000_add_subscription/
│   │   ├── 20260328070000_add_webhook_endpoint/
│   │   ├── 20260328143706_add_generation_job_indexes/
│   │   ├── 20260330152300_add_agent_models/
│   │   ├── 20260331143820_add_hosted_worker_models/
│   │   ├── migration_lock.toml
│   │   └── dev.db
│   └── dev.db
│
├── worker/                           # Hosted Worker (Fly.io)
│   └── Dockerfile
│
├── figma-plugin/                     # Figma 플러그인
│   └── (구조는 별도 분석 필요)
│
├── docs/                             # 문서
├── scripts/                          # 빌드 스크립트
│   ├── dev.sh
│   └── backfill-org-slugs.ts
├── public/                           # 정적 파일
├── uploads/                          # 업로드 파일 저장 (로컬)
│
├── .claude/                          # Claude Code 설정
├── .github/                          # GitHub Actions
├── .vercel/                          # Vercel 캐시
├── .next/                            # Next.js 빌드 결과
│
├── .env                              # 환경 변수 (로컬)
├── .env.example                      # 환경 변수 예시
├── .env.local                        # 로컬 오버라이드
├── .env.production                   # 프로덕션 설정
│
├── tsconfig.json                     # TypeScript 설정
├── next.config.ts                    # Next.js 설정
├── vitest.config.mts                # Vitest 설정
├── eslint.config.mjs                # ESLint 설정
├── postcss.config.mjs               # PostCSS 설정
├── vercel.json                       # Vercel 배포 설정
├── Makefile                          # 개발 명령어
├── package.json                      # 프로젝트 메타데이터
├── package-lock.json
├── README.md
└── AGENTS.md                         # 에이전트 가이드
```

---

## 3. 프로젝트 설정

### package.json 주요 정보
```json
{
  "name": "fireqa",
  "version": "0.1.0",
  "type": "module",
  "private": true
}
```

### npm 스크립트

| 스크립트 | 용도 |
|--------|------|
| `npm run dev` | Next.js 개발 서버 시작 |
| `npm run build` | Prisma 생성 + Next.js 빌드 |
| `npm run start` | 프로덕션 서버 시작 |
| `npm run lint` | ESLint 실행 |
| `npm run test` | Vitest 단회 실행 |
| `npm run test:watch` | Vitest 감시 모드 |
| `npm run test:coverage` | 커버리지 리포트 생성 |

### next.config.ts

```typescript
// 주요 설정
{
  serverExternalPackages: ["pdf-parse", "exceljs"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  headers: [
    // 보안 헤더
    "X-Frame-Options: DENY",
    "X-Content-Type-Options: nosniff",
    "Referrer-Policy: strict-origin-when-cross-origin",
    "Strict-Transport-Security: max-age=31536000"
  ]
}
```

### tsconfig.json

- **Target:** ES2017
- **Module:** ESNext (bundler 해석)
- **JSX:** react-jsx
- **경로 별칭:** `@/*` → `./src/*`
- **Strict Mode:** 활성화
- **제외:** node_modules, figma-plugin

### vitest.config.mts

- **환경:** Node.js
- **테스트 파일:** `src/**/*.test.ts`
- **커버리지:** v8 프로바이더
- **커버리지 대상:** `src/lib/**/*.ts`
- **리포터:** text, lcov

### eslint.config.mjs

- Base: ESLint 9
- Config: Next.js Core Web Vitals + TypeScript
- 무시: .next/, figma-plugin/dist/

### postcss.config.mjs

- Plugin: @tailwindcss/postcss

### vercel.json

**크론 작업:**
```json
{
  "crons": [
    {
      "path": "/api/cron/agent-health",
      "schedule": "* * * * *"           // 매분
    },
    {
      "path": "/api/cron/worker-health",
      "schedule": "* * * * *"           // 매분
    },
    {
      "path": "/api/cron/credit-reset",
      "schedule": "0 0 1 * *"           // 월 1일 자정
    }
  ]
}
```

### Makefile

```makefile
dev:    # tmux로 개발 환경 시작 (scripts/dev.sh)
stop:   # tmux 세션 종료
```

---

## 4. 데이터베이스 모델 (Prisma Schema)

### 핵심 도메인

#### 인증 & 멀티테넌시
| 모델 | 용도 |
|-----|------|
| **Organization** | 조직 (테넌트) |
| **User** | 사용자 |
| **OrganizationMembership** | 조직 멤버십 (역할: owner, admin, member) |
| **Invitation** | 사용자 초대 (토큰 기반, 만료 시간) |
| **ApiToken** | 플러그인/API 용 토큰 (해시 저장, 앞 8자 식별자) |
| **DeviceAuth** | 디바이스 로그인 (디바이스 코드 방식) |
| **UserApiKey** | 사용자 API 키 (암호화 저장, Anthropic 등) |

#### 비즈니스 모델
| 모델 | 용도 |
|-----|------|
| **Project** | 프로젝트 (소프트 삭제: active/archived/deleted) |
| **Upload** | 업로드된 파일 (PDF, XLSX, DOCX) |
| **GenerationJob** | 생성 작업 (type: test-cases/diagrams/wireframes) |
| **DiagramVersion** | 다이어그램 버전 (Mermaid + 노드/엣지 JSON) |
| **ResultVersion** | 결과 버전 (스냅샷 + 변경 추적) |
| **QATemplate** | QA 템플릿 (조직별 커스텀 설정) |

#### 협업 & 추적
| 모델 | 용도 |
|-----|------|
| **Comment** | 댓글 (job/diagram에 연결, 스레드 구조) |
| **ActivityLog** | 활동 로그 (조직별 감사 추적) |
| **Notification** | 알림 (댓글 회신, 생성 완료 등) |
| **WebhookEndpoint** | 웹훅 (조직별 이벤트 전달) |

#### 결제 & 구독
| 모델 | 용도 |
|-----|------|
| **Subscription** | Stripe 구독 (plan: free/pro/enterprise) |
| **CreditBalance** | 크레딧 잔액 (조직별) |
| **CreditTransaction** | 크레딧 거래 내역 |
| **CreditPackage** | 판매 크레딧 패키지 |

#### 에이전트 & 워커
| 모델 | 용도 |
|-----|------|
| **AgentConnection** | 에이전트 연결 (self_hosted/hosted) |
| **AgentTask** | 에이전트 작업 (생성, 개선, 커스텀) |
| **HostedWorker** | Fly.io 호스팅 워커 (idle/busy/starting) |

### 주요 관계도

```
Organization (1)
├── User (N)
├── OrganizationMembership (N) ← User
├── Project (N)
│   ├── Upload (N)
│   │   └── GenerationJob (N)
│   │       ├── DiagramVersion (N)
│   │       └── ResultVersion (N)
│   └── AgentTask (N)
├── Subscription (1)
├── CreditBalance (1)
├── CreditTransaction (N)
├── WebhookEndpoint (N)
├── AgentConnection (N) ← User
├── AgentTask (N)
├── Invitation (N) ← User
└── UserApiKey (N)
```

---

## 5. 환경 & 배포

### 환경 파일
- **.env** - 로컬 개발 환경 변수
- **.env.local** - 로컬 오버라이드 (git 무시)
- **.env.example** - 예시 파일
- **.env.production** - 프로덕션 설정

### 배포 플랫폼
- **메인:** Vercel (Next.js 호스팅)
  - 크론 작업: agent-health, worker-health, credit-reset
- **워커:** Fly.io (Docker 기반 호스팅 워커)
  - Dockerfile: Node.js 22 slim
  - 선설정: Claude Code CLI, Figma MCP

### Docker (worker/Dockerfile)
```dockerfile
FROM node:22-slim
# Claude Code CLI 설치
# Figma MCP 사전 설정
# fireqa-agent 빌드
ENV FIREQA_MODE=hosted
CMD ["node", "dist/cli.js", "start"]
```

---

## 6. 테스트 설정

### Vitest 설정
- **패턴:** `src/**/*.test.ts`
- **환경:** Node.js
- **커버리지 대상:** `src/lib/**/*.ts`
- **리포터:** text, lcov

### 테스트 파일 위치
```
src/
├── lib/
│   ├── utils/sanitize-filename.test.ts
│   ├── auth/require-role.test.ts
│   ├── auth/provision-user.test.ts
│   ├── agent/prompt-builder.test.ts
│   └── rate-limit/check-rate-limit.test.ts
└── generated/prisma/
    └── ...
```

---

## 7. 주요 기능

### 핵심 기능
1. **문서 분석 & 생성**
   - PDF, Excel, DOCX 파일 파싱
   - OpenAI API를 통한 테스트 케이스/다이어그램/와이어프레임 생성
   - SSE 스트리밍으로 실시간 결과 전달

2. **협업 & 피드백**
   - 댓글 시스템 (스레드 구조)
   - 활동 로그 추적
   - 알림 시스템

3. **버전 관리**
   - 다이어그램 버전 (Mermaid)
   - 결과 버전 (스냅샷)
   - 변경 이력 추적

4. **내보내기**
   - Excel, JSON, Markdown, Mermaid 형식

5. **에이전트 & 자동화**
   - Self-hosted 에이전트 (CLI)
   - Hosted 에이전트 (Fly.io)
   - 커스텀 프롬프트 지원
   - MCP 도구 통합

6. **크레딧 & 결제**
   - Stripe 구독 관리
   - 조직별 크레딧 잔액
   - 월별 리셋

---

## 8. 보안 & 규정

### 보안 헤더 (next.config.ts)
- X-Frame-Options: DENY (클릭재킹 방지)
- X-Content-Type-Options: nosniff (MIME 스니핑 방지)
- Referrer-Policy: strict-origin-when-cross-origin
- Strict-Transport-Security: max-age=31536000 (HSTS)

### 인증
- Supabase Auth (SSR 지원)
- API 토큰 (해시 저장, 앞 8자 식별자)
- 디바이스 로그인 (디바이스 코드 방식)

### 암호화
- 사용자 API 키: 암호화 저장
- 웹훅 시크릿: HMAC-SHA256 서명

---

## 9. 성능 최적화

### Next.js 최적화
- `optimizePackageImports`: lucide-react
- 서버 외부 패키지: pdf-parse, exceljs

### 데이터베이스 인덱스
- `Organization.slug` (고유)
- `Project (organizationId, status)` - 필터링 성능
- `Project (deletedAt)` - 소프트 삭제
- `GenerationJob (userId, createdAt DESC)`
- `GenerationJob (projectId, createdAt DESC)`
- `User (supabaseId)` - 인증
- `Comment (jobId, createdAt DESC)`

### 캐싱
- SWR (클라이언트 데이터 페칭)
- TTL 캐시 (서버)

---

## 10. 마이그레이션 이력

17개의 DB 마이그레이션:

| 날짜 | 제목 |
|-----|------|
| 2026-03-22 | 초기 스키마 |
| 2026-03-23 | 인증 모델 추가 |
| 2026-03-27 | 초대 모델 |
| 2026-03-28 | 멀티 조직 |
| 2026-03-28 | 프로젝트 소프트 삭제 |
| 2026-03-28 | 중복 인덱스 제거 |
| 2026-03-28 | 결과 버전 |
| 2026-03-28 | 활동 로그 |
| 2026-03-28 | 댓글 |
| 2026-03-28 | 알림 |
| 2026-03-28 | 구독 |
| 2026-03-28 | 웹훅 |
| 2026-03-28 | GenerationJob 인덱스 |
| 2026-03-30 | 에이전트 모델 |
| 2026-03-31 | 호스팅 워커 모델 |

---

## 요약

FireQA는 **AI 기반 문서 분석 및 QA 생성 플랫폼**으로, 다음 특징을 갖습니다:

✅ **Modern Stack:** Next.js 16, React 19, TypeScript, Prisma ORM  
✅ **AI 통합:** OpenAI API + 스트리밍 응답  
✅ **문서 처리:** PDF, Excel, DOCX 지원  
✅ **멀티테넌시:** 조직 기반 격리  
✅ **협업:** 댓글, 활동 로그, 알림  
✅ **자동화:** Self-hosted + Hosted 에이전트  
✅ **결제:** Stripe 구독 + 크레딧 시스템  
✅ **확장성:** 웹훅, API 토큰, MCP 도구  
✅ **보안:** Supabase Auth, 암호화, 보안 헤더  
✅ **배포:** Vercel + Fly.io  
