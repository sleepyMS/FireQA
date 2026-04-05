# FireQA 프로젝트 구조 및 설정 분석

**분석 날짜**: 2026-04-04  
**분석 대상**: FireQA 프로젝트  
**분석 범위**: 프로젝트 구조, 기술 스택, 빌드/배포 설정, 환경 구성

---

## 1. 프로젝트 개요

**프로젝트명**: FireQA  
**버전**: 0.1.0  
**프로젝트 타입**: 개인(Private)  
**메인 프레임워크**: Next.js 16.2.1, React 19.2.4  
**런타임**: Node.js 22 (worker), Node.js (main app)

---

## 2. 디렉토리 구조

### 최상위 디렉토리 구조

```
fireqa/
├── src/                          # 메인 Next.js 앱 소스 코드
├── agent/                        # FireQA Agent CLI 패키지
├── figma-plugin/                 # Figma 플러그인 코드
├── worker/                       # Fly.io Hosted Worker (Docker 기반)
├── prisma/                       # Prisma ORM 스키마 및 마이그레이션
├── docs/                         # 문서 (에이전트, 슈퍼파워)
├── public/                       # 정적 자산
├── scripts/                      # 유틸리티 스크립트
├── uploads/                      # 사용자 업로드 파일 저장소
├── .vercel/                      # Vercel 배포 설정
├── .claude/                      # Claude Code 설정 (로컬)
├── .superpowers/                 # 슈퍼파워 기능 관련
├── .worktrees/                   # Git 워크트리 관련
├── package.json                  # 메인 프로젝트 의존성
├── tsconfig.json                 # TypeScript 설정
├── next.config.ts                # Next.js 설정
├── postcss.config.mjs            # PostCSS 설정
├── eslint.config.mjs             # ESLint 설정
├── components.json               # shadcn UI 설정
├── prisma.config.ts              # Prisma 설정
├── vercel.json                   # Vercel 크론 작업 설정
├── .env.example                  # 환경변수 템플릿
├── .env.local                    # 로컬 환경변수
├── .env.production               # 프로덕션 환경변수
└── README.md                     # 프로젝트 README
```

### src/ 디렉토리 구조 (Next.js 13+ App Router)

```
src/
├── app/                          # Next.js App Router 디렉토리
│   ├── (auth)/                   # 인증 관련 페이지 그룹
│   │   ├── login/
│   │   ├── signup/
│   │   ├── onboarding/
│   │   ├── invite/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   ├── auth/callback/
│   │   ├── auth/device/
│   │   └── layout.tsx
│   ├── (dashboard)/              # 대시보드 페이지 그룹
│   │   ├── [orgSlug]/            # 조직별 동적 경로
│   │   │   ├── dashboard/        # 메인 대시보드
│   │   │   ├── projects/         # 프로젝트 관리
│   │   │   ├── generate/         # QA/테스트 케이스 생성
│   │   │   ├── diagrams/         # 다이어그램 관리
│   │   │   ├── wireframes/       # 와이어프레임 관리
│   │   │   ├── improve/          # 스펙 개선
│   │   │   ├── templates/        # QA 템플릿 관리
│   │   │   ├── agent/            # 에이전트 대시보드
│   │   │   │   ├── guide/
│   │   │   │   └── tasks/
│   │   │   ├── activity/         # 활동 로그
│   │   │   ├── analytics/        # 분석 대시보드
│   │   │   ├── settings/         # 조직 설정
│   │   │   ├── guide/            # 사용자 가이드
│   │   │   └── history/          # 생성 이력
│   │   └── layout.tsx
│   ├── api/                      # API 라우트 (백엔드)
│   │   ├── agent/                # 에이전트 관련 API
│   │   │   ├── connections/      # 에이전트 연결
│   │   │   ├── tasks/            # 에이전트 작업
│   │   │   ├── dashboard/
│   │   │   └── status/
│   │   ├── generate/             # QA/테스트 케이스 생성 API
│   │   ├── diagrams/             # 다이어그램 API
│   │   ├── wireframes/           # 와이어프레임 API
│   │   ├── improve-diagram/      # 다이어그램 개선 API
│   │   ├── fix-mermaid/          # Mermaid 수정 API
│   │   ├── improve/              # 스펙 개선 API
│   │   ├── export/               # 내보내기 API (Excel, JSON, Markdown)
│   │   ├── projects/             # 프로젝트 관리 API
│   │   ├── tasks/                # 작업 관리 API
│   │   ├── uploads/              # 파일 업로드 API
│   │   ├── auth/                 # 인증 관련 API
│   │   ├── user/                 # 사용자 API
│   │   ├── organization/         # 조직 관리 API
│   │   ├── invitations/          # 초대 관리 API
│   │   ├── billing/              # 결제 API
│   │   │   ├── checkout/
│   │   │   ├── credits/
│   │   │   ├── portal/
│   │   │   └── usage/
│   │   ├── settings/             # 설정 API
│   │   │   ├── anthropic-key/
│   │   │   └── api-keys/
│   │   ├── comments/             # 댓글/피드백 API
│   │   ├── notifications/        # 알림 API
│   │   ├── cron/                 # 정기 작업
│   │   │   ├── agent-health/
│   │   │   ├── worker-health/
│   │   │   └── credit-reset/
│   │   ├── webhook-endpoints/    # 웹훅 관리 API
│   │   ├── webhooks/             # 웹훅 수신 (Stripe 등)
│   │   ├── admin/                # 관리자 API
│   │   │   └── workers/
│   │   ├── activity/             # 활동 로그 API
│   │   ├── analytics/            # 분석 데이터 API
│   │   ├── search/               # 검색 API
│   │   ├── versions/             # 버전 관리 API
│   │   └── diagram-versions/     # 다이어그램 버전 API
│   ├── layout.tsx                # 루트 레이아웃
│   ├── page.tsx                  # 루트 페이지
│   └── favicon.ico
├── components/                   # React 컴포넌트
│   ├── ui/                       # shadcn UI 컴포넌트
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── tabs.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── textarea.tsx
│   │   ├── progress.tsx
│   │   ├── separator.tsx
│   │   ├── scroll-area.tsx
│   │   ├── sheet.tsx
│   │   ├── tooltip.tsx
│   │   └── sonner.tsx            # Toast 알림
│   ├── diagrams/
│   │   └── mermaid-preview.tsx   # Mermaid 다이어그램 미리보기
│   ├── test-cases/               # 테스트 케이스 관련 컴포넌트
│   │   └── test-case-results.tsx
│   ├── wireframes/               # 와이어프레임 관련 컴포넌트
│   │   └── wireframe-results.tsx
│   ├── versions/                 # 버전 관리 컴포넌트
│   │   └── version-bar.tsx
│   ├── projects/                 # 프로젝트 관련 컴포넌트
│   │   └── project-header.tsx
│   ├── job-status-display.tsx    # 작업 상태 표시
│   └── generation-error.tsx      # 생성 오류 표시
├── lib/                          # 유틸리티 함수 및 헬퍼
│   ├── db.ts                     # 데이터베이스 클라이언트
│   ├── utils.ts                  # 일반 유틸리티
│   ├── supabase/                 # Supabase 관련
│   │   ├── server.ts
│   │   ├── client.ts
│   │   └── middleware.ts
│   ├── openai/                   # OpenAI 통합
│   │   ├── client.ts
│   │   ├── prompts/              # 시스템 프롬프트
│   │   │   ├── test-case-system.ts
│   │   │   ├── diagram-system.ts
│   │   │   ├── wireframe-system.ts
│   │   │   ├── spec-improve-system.ts
│   │   │   └── spec-exemplar.ts
│   │   └── schemas/              # 출력 스키마 (Zod)
│   │       ├── test-case.ts
│   │       ├── diagram.ts
│   │       ├── diagram-with-nodes.ts
│   │       ├── wireframe.ts
│   │       └── spec-improve.ts
│   ├── parsers/                  # 문서 파서
│   │   ├── index.ts
│   │   ├── pdf-parser.ts         # PDF 파싱
│   │   ├── docx-parser.ts        # Word 문서 파싱
│   │   └── xlsx-parser.ts        # Excel 파싱
│   ├── excel/                    # Excel 관련
│   │   ├── builder.ts            # Excel 파일 생성
│   │   └── styles.ts             # 스타일 정의
│   ├── sse/                      # Server-Sent Events
│   │   ├── create-sse-stream.ts
│   │   ├── parse-sse-client.ts
│   │   ├── stream-openai.ts
│   │   └── stream-openai-chunked-tc.ts
│   ├── text/                     # 텍스트 처리
│   │   └── split-document.ts
│   ├── mermaid/                  # Mermaid 다이어그램
│   │   └── sanitize.ts
│   ├── api/                      # API 유틸리티
│   │   └── error-response.ts
│   ├── auth/                     # 인증 유틸리티
│   │   └── require-role.ts
│   └── projects/                 # 프로젝트 관련 유틸리티
│       └── get-org-project.ts
├── hooks/                        # React 커스텀 훅
│   ├── use-sse.ts                # Server-Sent Events 훅
│   └── use-sse-inline.ts
├── actions/                      # Server Actions
├── types/                        # TypeScript 타입 정의
│   ├── test-case.ts
│   ├── diagram.ts
│   ├── document.ts
│   ├── comment.ts
│   ├── spec-improve.ts
│   └── sse.ts
├── generated/                    # 자동 생성된 파일
│   └── prisma/                   # Prisma 생성 타입 및 클라이언트
│       ├── client.ts
│       ├── browser.ts
│       ├── enums.ts
│       └── models/
└── app/
    └── globals.css               # 전역 스타일
```

### agent/ 디렉토리 구조 (독립 패키지)

```
agent/
├── src/
│   ├── cli.ts                    # CLI 진입점
│   ├── auth/                     # 인증 처리
│   ├── config/                   # 설정 관리
│   ├── runner/                   # 작업 실행 엔진
│   │   ├── task-runner.ts
│   │   └── output-handler.ts
│   └── reporter/                 # 결과 리포팅
├── dist/                         # 빌드 출력
├── package.json
├── tsconfig.json
└── .tsx 파일들
```

### figma-plugin/ 디렉토리 구조 (독립 패키지)

```
figma-plugin/
├── src/
│   ├── main.ts                   # 플러그인 메인 로직
│   └── ui.html                   # UI 마크업
├── dist/                         # 빌드 출력
├── build.mjs                     # 빌드 스크립트
├── manifest.json                 # Figma 플러그인 매니페스트
├── package.json
└── tsconfig.json
```

### worker/ 디렉토리 구조

```
worker/
├── Dockerfile                    # Docker 이미지 정의
├── fly.toml                      # Fly.io 설정
└── scripts/                      # 유틸리티 스크립트
```

### prisma/ 디렉토리 구조

```
prisma/
├── schema.prisma                 # 데이터베이스 스키마
├── migrations/                   # 마이그레이션 파일들
│   ├── 20260322153609_init/
│   ├── 20260323142135_add_auth_models/
│   ├── 20260327152939_add_invitation_model/
│   ├── 20260328000000_multi_org/
│   ├── 20260328031933_add_project_soft_delete/
│   ├── 20260328032215_drop_redundant_project_org_idx/
│   ├── 20260328034929_add_result_version/
│   ├── 20260328040256_add_activity_log/
│   ├── 20260328042021_add_comment/
│   ├── 20260328043307_add_notification/
│   ├── 20260328060000_add_subscription/
│   ├── 20260328070000_add_webhook_endpoint/
│   ├── 20260328143706_add_generation_job_indexes/
│   ├── 20260330152300_add_agent_models/
│   └── 20260331143820_add_hosted_worker_models/
├── migration_lock.toml
└── dev.db (로컬 개발 DB)
```

---

## 3. 기술 스택 분석

### 프론트엔드

| 카테고리 | 기술 | 버전 |
|---------|------|------|
| **프레임워크** | Next.js | 16.2.1 |
| **UI 라이브러리** | React | 19.2.4 |
| **UI 컴포넌트** | shadcn/ui | 4.1.0 |
| **스타일링** | Tailwind CSS | 4.0.0 |
| **아이콘** | Lucide React | 0.577.0 |
| **토스트/알림** | Sonner | 2.0.7 |
| **테마** | next-themes | 0.4.6 |
| **마크다운** | react-markdown | 9.1.0 |
| **마크다운 플러그인** | remark-gfm | 4.0.1 |
| **유틸리티** | clsx | 2.1.1 |
| **유틸리티** | tailwind-merge | 3.5.0 |
| **애니메이션** | tw-animate-css | 1.4.0 |
| **클래스 기반 변형** | class-variance-authority | 0.7.1 |

### 백엔드 & 데이터

| 카테고리 | 기술 | 버전 |
|---------|------|------|
| **ORM** | Prisma | 6.19.2 |
| **데이터베이스** | PostgreSQL (Supabase) | - |
| **인증** | Supabase Auth | - |
| **Supabase SDK** | @supabase/ssr | 0.9.0 |
| **Supabase JS** | @supabase/supabase-js | 2.100.0 |
| **AI/LLM** | OpenAI | 6.32.0 |
| **결제** | Stripe | 21.0.1 |

### 문서 처리

| 카테고리 | 기술 | 버전 |
|---------|------|------|
| **PDF 파싱** | pdf-parse | 1.1.1 |
| **Word 문서** | mammoth | 1.12.0 |
| **Excel** | exceljs | 4.4.0 |

### 개발 도구 & 테스트

| 카테고리 | 기술 | 버전 |
|---------|------|------|
| **언어** | TypeScript | 5.x |
| **타입 지정** | @types/node | 20.x |
| **린팅** | ESLint | 9.x |
| **ESLint Config** | eslint-config-next | 16.2.1 |
| **테스트** | Vitest | 4.1.2 |
| **테스트 커버리지** | @vitest/coverage-v8 | 4.1.2 |
| **스타일 처리** | Tailwind CSS PostCSS | 4.x |
| **검증** | Zod | 4.3.6 |
| **HTTP 클라이언트** | SWR | 2.4.1 |

### Agent 패키지 전용

| 기술 | 버전 |
|------|------|
| Commander.js | 13.0.0 |
| tsx | 4.0.0 |

### Figma 플러그인 전용

| 기술 | 버전 |
|------|------|
| @figma/plugin-typings | 1.104.0 |
| esbuild | 0.24.0 |
| Dagre | 0.8.5 |
| Elkjs | 0.11.1 |

---

## 4. 빌드 및 배포 설정

### 4.1 Next.js 설정 (next.config.ts)

```typescript
// 보안 헤더 설정
- X-Frame-Options: DENY (클릭재킹 방지)
- X-Content-Type-Options: nosniff (MIME 스니핑 방지)
- Referrer-Policy: strict-origin-when-cross-origin
- Strict-Transport-Security: max-age=31536000 (HSTS)

// 최적화
- serverExternalPackages: ["pdf-parse", "exceljs"]
- optimizePackageImports: ["lucide-react"]
```

**특징**:
- 보안 헤더를 모든 경로에 적용
- 외부 서버 패키지 지정 (SSR 호환성)
- 트리 쉐이킹 최적화

### 4.2 TypeScript 설정 (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".next/**/*.ts"],
  "exclude": ["node_modules", "figma-plugin"]
}
```

**특징**:
- 경로 별칭: `@/*` → `./src/*`
- Next.js 플러그인 포함
- figma-plugin 제외

### 4.3 PostCSS 설정 (postcss.config.mjs)

```javascript
// Tailwind CSS 4 사용
@tailwindcss/postcss 플러그인
```

### 4.4 ESLint 설정 (eslint.config.mjs)

```javascript
// Next.js 기본 설정 + TypeScript 확장
- Core Web Vitals
- TypeScript 지원
// 생성된 파일 제외:
- .next/
- figma-plugin/dist/
```

### 4.5 Vercel 배포 설정 (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/cron/agent-health",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/worker-health",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/credit-reset",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

**크론 작업**:
- 에이전트 상태 확인: 매 분마다
- 워커 상태 확인: 매 분마다
- 크레딧 초기화: 매월 1일 자정

### 4.6 Prisma 설정 (prisma.config.ts)

```typescript
{
  "schema": "prisma/schema.prisma",
  "migrations": {
    "path": "prisma/migrations"
  },
  "datasource": {
    "url": env("DIRECT_URL")  // 직접 연결 사용
  }
}
```

### 4.7 Fly.io Worker 설정 (worker/fly.toml)

```toml
app = "fireqa-workers"
primary_region = "nrt"  # 도쿄 리전

[build]
  dockerfile = "Dockerfile"

[deploy]
  strategy = "immediate"
```

**특징**:
- Machines API로 관리 (HTTP 포트 없음)
- 아웃바운드 HTTP만 사용 (FireQA API 호출)

### 4.8 Worker Dockerfile

```dockerfile
FROM node:22-slim

# Claude Code CLI 설치
RUN npm install -g @anthropic-ai/claude-code

# Figma MCP 사전 설정
RUN claude mcp add figma -- npx -y @anthropic-ai/claude-code-figma-mcp || true

# fireqa-agent 복사 및 빌드
COPY agent/ /app/agent/
WORKDIR /app/agent
RUN npm ci --omit=dev && npm run build

ENV FIREQA_MODE=hosted
CMD ["node", "dist/cli.js", "start"]
```

**특징**:
- Node.js 22 기반
- Claude Code CLI 번들
- 최소 의존성 설치 (`--omit=dev`)
- 호스팅 모드로 에이전트 실행

---

## 5. 환경 설정

### 5.1 환경변수 (.env.example)

**Supabase 인증**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**데이터베이스**
```
DATABASE_URL=postgresql://...  # PgBouncer 연결 풀링
DIRECT_URL=postgresql://...    # 직접 마이그레이션용 연결
```

**OpenAI**
```
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-5-mini
```

**애플리케이션**
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
```

**프로덕션 환경** (.env.production):
- Vercel에 배포된 환경변수
- 민감한 정보 포함 (파일로 확인 불가)

**로컬 환경** (.env.local):
- 개발 환경 설정 (파일로 확인 불가)

---

## 6. 프로젝트 메타데이터

### package.json

```json
{
  "name": "fireqa",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",           # 개발 서버 (http://localhost:3000)
    "build": "prisma generate && next build",
    "start": "next start",        # 프로덕션 서버
    "lint": "eslint",
    "test": "vitest run",         # 한 번 테스트 실행
    "test:watch": "vitest",       # 감시 모드
    "test:coverage": "vitest run --coverage"
  }
}
```

### Agent 패키지 (agent/package.json)

```json
{
  "name": "fireqa-agent",
  "version": "0.1.0",
  "description": "FireQA Agent CLI — connect your AI CLI to FireQA",
  "type": "module",
  "bin": {
    "fireqa-agent": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.ts",
    "test": "vitest run"
  }
}
```

**특징**:
- CLI 실행 파일로 설치 가능
- 단일 의존성 (commander.js)

### Figma 플러그인 (figma-plugin/package.json)

```json
{
  "name": "fireqa-figjam-plugin",
  "version": "0.1.0",
  "scripts": {
    "dev": "FIREQA_SERVER_URL=http://localhost:3000 node build.mjs --watch",
    "build": "node build.mjs",
    "build:prod": "FIREQA_SERVER_URL=https://fire-qa.vercel.app node build.mjs"
  }
}
```

**특징**:
- 환경 기반 빌드 (개발/프로덕션)
- esbuild로 번들링

---

## 7. 모노레포 여부

**결론: 모노레포 구조 (수동 관리)**

### 구성

| 패키지 | 경로 | 독립성 | 용도 |
|-------|------|-------|------|
| **메인 앱** | `/` | 높음 | Next.js 웹 애플리케이션 |
| **Agent CLI** | `agent/` | 높음 | 독립 npm 패키지 |
| **Figma 플러그인** | `figma-plugin/` | 높음 | 독립 빌드 시스템 |
| **Worker** | `worker/` | 중간 | Docker 이미지 (agent 포함) |

### 관리 방식

- **워크스페이스**: npm 워크스페이스 미사용
- **의존성 관리**: 각 패키지별 독립적 (agent는 메인과 무관)
- **빌드 순서**: 메인 앱 → agent 빌드 → worker Dockerfile에서 복사

### Worker의 특수성

```dockerfile
COPY agent/ /app/agent/
# Agent를 포함하여 Docker 이미지 빌드
```

worker는 agent를 포함하여 배포되므로 긴밀하게 연결됨.

---

## 8. 테스트 설정

### 프레임워크: Vitest

```json
{
  "devDependencies": {
    "vitest": "^4.1.2",
    "@vitest/coverage-v8": "^4.1.2"
  }
}
```

### 스크립트

```bash
npm run test              # 단일 실행
npm run test:watch       # 감시 모드 (HMR)
npm run test:coverage    # 커버리지 리포트 생성
```

### 설정

- **Vite 기반**: Next.js와 호환 가능
- **Coverage 도구**: v8 엔진
- **src/generated/ 포함**: Prisma 생성 타입도 테스트 대상

---

## 9. 주요 설정 파일 목록

| 파일명 | 역할 | 형식 | 범위 |
|-------|------|------|------|
| **tsconfig.json** | TypeScript 컴파일러 설정 | JSON | 전체 프로젝트 |
| **next.config.ts** | Next.js 빌드/런타임 설정 | TypeScript | 메인 앱만 |
| **prisma.config.ts** | Prisma ORM 설정 | TypeScript | 데이터베이스 |
| **postcss.config.mjs** | CSS 후처리 설정 | JavaScript | Tailwind CSS |
| **eslint.config.mjs** | 코드 린팅 규칙 | JavaScript | 전체 (figma-plugin 제외) |
| **components.json** | shadcn UI 설정 | JSON | 컴포넌트 별칭 |
| **vercel.json** | Vercel 배포 설정 | JSON | 크론 작업 |
| **fly.toml** | Fly.io 배포 설정 | TOML | Worker 배포 |
| **worker/Dockerfile** | Docker 이미지 정의 | Dockerfile | Worker 빌드 |
| **agent/tsconfig.json** | Agent CLI TypeScript 설정 | JSON | Agent 패키지 |
| **figma-plugin/tsconfig.json** | Figma 플러그인 TS 설정 | JSON | Figma 패키지 |
| **.env.example** | 환경변수 템플릿 | Shell | 문서용 |
| **.env.local** | 로컬 개발 환경변수 | Shell | 개발 환경 |
| **.env.production** | 프로덕션 환경변수 | Shell | 프로덕션 |

---

## 10. 데이터베이스 및 Prisma 스키마

### 데이터베이스 제공자
- **주 데이터베이스**: PostgreSQL (Supabase 호스팅)
- **연결 풀링**: PgBouncer (DATABASE_URL)
- **직접 연결**: 마이그레이션용 (DIRECT_URL)

### Prisma 클라이언트
- **생성 위치**: `src/generated/prisma/`
- **자동 생성**: `npm run build` 실행 시
- **타입**: TypeScript 타입 & Zod 스키마

### 주요 데이터 모델 (스키마에서 발견)

**인증 & 멀티테넌시**:
- Organization (조직)
- User (사용자)
- OrganizationMembership (조직 멤버십)
- Invitation (초대)
- Subscription (구독)

**비즈니스 로직** (마이그레이션 기록):
- Project (프로젝트)
- Upload (문서 업로드)
- GenerationJob (생성 작업)
- ResultVersion (테스트 케이스 버전)
- DiagramVersion (다이어그램 버전)
- QATemplate (QA 템플릿)
- Comment (댓글/피드백)
- Notification (알림)

**웹훅 & 통합**:
- WebhookEndpoint (웹훅 엔드포인트)

**에이전트 시스템** (Phase 4):
- AgentConnection (에이전트 연결)
- AgentTask (에이전트 작업)
- HostedWorker (호스팅 워커 - Fly.io Machines)

**결제 & 크레딧**:
- CreditBalance (크레딧 잔액)
- CreditTransaction (크레딧 거래)
- CreditPackage (크레딧 패키지)

**API 관리**:
- ApiToken (API 토큰)
- UserApiKey (사용자 API 키)

**활동 로그**:
- ActivityLog (활동 기록)

### 마이그레이션 히스토리
- **초기 설정** (20260322): 기본 모델
- **인증** (20260323): 사용자, 인증 모델
- **멀티테넌시** (20260328): 조직, 멤버십
- **피드백 & 버전** (20260328): 댓글, 알림, 버전 관리
- **구독 & 결제** (20260328): Stripe 통합
- **에이전트** (20260330): 에이전트 연결, 작업
- **호스팅 워커** (20260331): Fly.io Machines 지원

---

## 11. 배포 및 인프라

### 메인 애플리케이션
- **플랫폼**: Vercel
- **브랜치**: main
- **자동 배포**: Git 푸시 시

### Worker/에이전트
- **플랫폼**: Fly.io
- **배포 방식**: Docker 이미지 기반 Machines
- **리전**: 도쿄 (nrt)
- **스케일링**: Machines API (수동/자동)

### 데이터베이스
- **호스팅**: Supabase (PostgreSQL)
- **백업**: Supabase 관리
- **위치**: 아시아-태평양

### 크론 작업 (Vercel)
```
1. /api/cron/agent-health       - 매 분마다 에이전트 상태 확인
2. /api/cron/worker-health      - 매 분마다 워커 상태 확인
3. /api/cron/credit-reset       - 매월 1일 크레딧 초기화
```

---

## 12. 문서 및 가이드

### docs/ 디렉토리

```
docs/
├── agent/         # 에이전트 관련 문서
└── superpowers/   # 슈퍼파워 기능 문서
```

### 소스 코드 내 문서화
- README.md: 기본 Next.js 템플릿 (미커스터마이징)
- AGENTS.md: 프로젝트 특화 지침
- 각 디렉토리별 가이드 페이지 (`/guide` 라우트)

---

## 13. 특수 기능 및 통합

### 13.1 인증
- **제공자**: Supabase Auth
- **방식**: OAuth, 이메일/비밀번호
- **Device Flow**: `/api/auth/device` (CLI 인증용)

### 13.2 결제 & 크레딧 시스템
- **결제 게이트웨이**: Stripe
- **크레딧 모델**: 크레딧 기반 비용 청구
- **API**: `/api/billing/*`

### 13.3 문서 처리
- **지원 형식**: PDF, Word (DOCX), Excel (XLSX)
- **파서**: pdf-parse, mammoth, exceljs
- **업로드**: `/api/upload`, `/api/uploads/`

### 13.4 AI 생성
- **프로바이더**: OpenAI
- **모델**: gpt-5-mini (설정 파일에서 확인 가능)
- **스트리밍**: SSE 기반 실시간 생성

### 13.5 다이어그램/시각화
- **형식**: Mermaid
- **최적화**: elkjs, dagre (레이아웃)
- **플러그인**: Figma 플러그인으로 내보내기 가능

### 13.6 에이전트 시스템 (Phase 4)
- **CLI**: fireqa-agent (독립 npm 패키지)
- **호스팅**: Fly.io Machines
- **통신**: REST API + 폴링
- **상태 관리**: 데이터베이스 기반

### 13.7 웹훅
- **Stripe**: 결제 이벤트 처리
- **사용자 정의**: 조직별 웹훅 엔드포인트

---

## 14. 설정 및 구조 특징 정리

### 강점
1. **명확한 계층 분리**: UI, API, 비즈니스 로직 분리
2. **타입 안전성**: TypeScript + Zod 스키마
3. **마이크로서비스 친화적**: Agent, Worker 독립 패키지
4. **보안 강화**: 보안 헤더, OAuth 인증
5. **확장성**: 에이전트, 웹훅, API 키 지원

### 배포 성숙도
- 프로덕션 레디: Vercel 자동 배포
- 인프라 최적화: PgBouncer, Machines API
- 모니터링: 크론 작업으로 헬스 체크
- 환경 분리: .env.local, .env.production

### 개발 경험
- HMR 지원: `npm run dev`
- 테스트 체계: Vitest
- 린팅: ESLint 자동 확인
- 문서화: 페이지 기반 가이드

---

## 결론

FireQA는 **엔터프라이즈급 SaaS 애플리케이션**으로 설계된 프로젝트입니다.

**핵심 구성**:
- Next.js 기반 풀스택 웹 애플리케이션
- Supabase PostgreSQL 데이터베이스
- Vercel 호스팅 + Fly.io 워커 시스템
- OpenAI 통합 AI 생성 기능
- Stripe 결제 시스템

**아키텍처 패턴**:
- 모노레포 (수동 관리)
- API 중심 설계
- 에이전트/워커 분리
- 멀티테넌시 조직 구조

**배포 전략**:
- 메인앱: Vercel (엣지 런타임)
- 백그라운드 작업: Fly.io (컨테이너)
- 데이터베이스: Supabase (관리형)

이러한 구조는 높은 확장성과 운영 효율성을 제공합니다.

---

**분석 완료**
