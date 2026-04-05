# FireQA 비즈니스 로직 및 핵심 기능 분석 보고서

## 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [페이지/라우트 구성](#페이지라우트-구성)  
3. [API 라우트 분석](#api-라우트-분석)
4. [핵심 기능 목록](#핵심-기능-목록)
5. [UI 컴포넌트 구조](#ui-컴포넌트-구조)
6. [사용자 흐름](#사용자-흐름)
7. [상태 관리](#상태-관리)
8. [국제화](#국제화)

---

## 프로젝트 개요

### 프로젝트의 목적과 목표

**FireQA**는 AI(OpenAI)를 활용하여 기획 문서(PDF, DOCX, XLSX)로부터 **자동으로 QA 자산(테스트케이스, 다이어그램, 와이어프레임)을 생성**하고 **기획서를 개선**하는 엔터프라이즈급 자동화 플랫폼입니다.

### 해결하려는 문제
- **시간 소모적인 QA**: 기획 문서를 읽고 수동으로 테스트케이스를 작성하는 데 많은 시간 필요
- **설계 자산 부족**: UI/UX 다이어그램, 와이어프레임을 별도로 생성해야 함
- **기획서 품질 일관성**: 기획 문서의 명확성과 완성도가 팀마다 다름
- **협업 효율성**: QA 결과 및 기획 개선에 대한 협업 기능 부족

### 타겟 사용자
- **제품 관리자(PM)**: 기획 문서 작성 및 개선
- **QA 엔지니어**: 테스트케이스 작성 및 관리
- **개발 팀**: 요구사항 및 명세 이해
- **디자이너**: 와이어프레임 및 사용자 플로우 다이어그램 생성

---

## 페이지/라우트 구성

### 주요 페이지 구조

**인증 관련 페이지**: /login, /signup, /onboarding, /forgot-password, /reset-password, /invite, /auth/device

**대시보드 메인**: /[orgSlug]/dashboard - 최근 프로젝트, 작업, 생성 이력 표시

**프로젝트 관리**: /[orgSlug]/projects, /[orgSlug]/projects/[id] - 프로젝트 목록 및 상세 조회

**컨텐츠 생성 (4가지)**:
- `/[orgSlug]/generate[/[jobId]]` - TC 자동 생성
- `/[orgSlug]/diagrams[/[jobId]]` - 다이어그램 생성 (Mermaid)
- `/[orgSlug]/wireframes[/[jobId]]` - 와이어프레임 생성
- `/[orgSlug]/improve[/[jobId]]` - 기획서 개선

**협업 & 관리**: /[orgSlug]/templates, /[orgSlug]/activity, /[orgSlug]/history, /[orgSlug]/settings

**에이전트 시스템**: /[orgSlug]/agent, /[orgSlug]/agent/guide, /[orgSlug]/agent/tasks, /[orgSlug]/agent/tasks/[taskId]

---

## API 라우트 분석

### API 주요 엔드포인트

**인증**: /api/auth/signup, /api/auth/device

**프로젝트 관리**: /api/projects (CRUD), /api/projects/[id]/archive, /api/projects/[id]/restore

**생성 작업**: 
- POST /api/generate (TC 생성, SSE 스트리밍)
- POST /api/diagrams, /api/wireframes, /api/improve (각각 SSE 스트리밍)

**버전 & 업데이트**: /api/versions (CRUD), /api/diagrams/update, /api/wireframes/update

**협업**: /api/comments (CRUD), /api/comments/[id]/resolve

**조직 & 멤버**: /api/organizations, /api/organization (CRUD), /api/organization/members, /api/organization/transfer

**빌링**: /api/billing/checkout, /api/billing/portal, /api/billing/usage, /api/billing/credits

**에이전트 시스템**:
- /api/agent/tasks (CRUD)
- /api/agent/tasks/next (에이전트가 작업 가져오기)
- /api/agent/tasks/[id]/output, /api/agent/tasks/[id]/result
- /api/agent/connections (에이전트 연결 관리)

**설정**: /api/settings/api-keys, /api/settings/anthropic-key

**기타**: /api/notifications, /api/activity, /api/search, /api/upload, /api/export/*

---

## 핵심 기능 목록

### 1. AI 기반 생성 기능 (4가지)

#### TC(테스트케이스) 자동 생성
- 입력: 기획 문서 (PDF, DOCX, XLSX)
- 처리: OpenAI가 자동으로 테스트케이스 작성
- 출력: JSON → Excel, Markdown으로 내보내기
- 특징: 템플릿 기반, 청킹 처리, 토큰 추적

#### 다이어그램 생성
- 출력: Mermaid 코드 (사용자 플로우, 상태 다이어그램, 시퀀스 다이어그램)
- Figma 내보내기 가능
- 버전 관리, Mermaid 자동 정제

#### 와이어프레임 생성
- 출력: 구조화된 와이어프레임 → Figma 프로토타입
- 화면별 컴포넌트 정의, 반응형 레이아웃 고려

#### 기획서 개선
- 누락된 요구사항 보충, 모호한 표현 명확화
- 문법 및 표기 일관성 검토
- 개선된 기획서 (Markdown, PDF)

### 2. 협업 기능

- **댓글 시스템**: 생성된 결과물에 댓글 작성, 댓글 해결 마크, 알림
- **활동 로그**: 생성, 프로젝트 변경, 멤버 관리, 에이전트 작업 등 기록
- **버전 관리**: 다이어그램 및 결과 버전 관리, 버전 비교/복원

### 3. 멀티테넌시 & 조직 관리

- **조직**: 역할 기반 (Owner, Admin, Member)
- **멤버 초대**: 이메일 기반, 초대 토큰으로 인증
- **활성 조직 자동 전환**: /[orgSlug] URL 기반 라우팅

### 4. 빌링 & 크레딧 시스템

- **구독 플랜**: Free, Pro, Enterprise
- **Stripe 통합**: 결제 게이트웨이, 웹훅 처리
- **크레딧 기반 과금**: 작업 타입별 차감 (TC, 다이어그램 등)
- **원자적 차감**: FOR UPDATE 락으로 동시성 안전
- **월간 쿼터**: 월말 자동 초기화

### 5. 에이전트 시스템

- **작업 큐**: /api/agent/tasks/next로 작업 가져오기
- **비동기 처리**: 대규모 문서, 복잡한 생성 작업 처리
- **상태 관리**: pending → running → completed/failed
- **출력 스트리밍**: 실시간 진행 상황 전송
- **헬스 체크**: 에이전트 온/오프라인 추적

### 6. Figma 플러그인 통합

- **다이어그램 내보내기**: Mermaid → FigJam 자동 배치
- **와이어프레임 내보내기**: 구조화된 와이어프레임 → Figma
- **토큰 기반 인증**: /api/user/plugin-token

### 7. 파일 처리 & 내보내기

- **지원 포맷**: PDF (pdf-parse), DOCX (mammoth), XLSX (exceljs)
- **내보내기**: JSON, Excel, Markdown, Mermaid, PDF

---

## UI 컴포넌트 구조

### 계층도

```
UI 기본 컴포넌트 (shadcn/ui)
- button, card, input, dialog, dropdown-menu 등

레이아웃 컴포넌트
- header (상단 네비게이션, 조직 전환, 검색, 알림)
- sidebar (메뉴, 빠른 액션)
- org-switcher, notification-bell, search-dialog

기능별 컴포넌트
- diagrams: mermaid-preview, diagram-results
- comments: comment-form, comment-thread, comment-section
- projects: project-card, recent-projects-panel
- activity: activity-timeline
- agent: task-result-preview
- upload: dropzone
- versions: version-bar
```

---

## 사용자 흐름

### 1. 온보딩
신규 사용자 → 회원가입 → 조직 생성 → 대시보드

### 2. 테스트케이스 생성
/generate 접속 → 프로젝트 선택 → 파일 업로드 → 문서 파싱 → AI 생성 → 결과 표시 → 댓글/내보내기/버전 관리

### 3. 협업
QA 엔지니어 검토 → 댓글 작성 → 알림 전송 → 재생성 → 결과 비교 → 최종 승인

### 4. 에이전트 작업
사용자 프롬프트 입력 → 작업 생성 (pending) → 에이전트 가져감 (running) → 출력 스트리밍 → 완료 → 활동 로그 기록

### 5. 결제
Pro 플랜 선택 → Stripe 체크아웃 → 결제 → Stripe 웹훅 → creditBalance 업데이트 → 월간 크레딧 할당

---

## 상태 관리

### 전역 상태 (React Context API)

1. **LocaleProvider** - 현재 로케일 (ko, en), 쿠키 저장
2. **UserProvider** - 로그인한 사용자 정보
3. **CurrentProjectContext** - 선택된 프로젝트 ID

### 데이터 페칭 (SWR)

- **라이브러리**: swr 2.4.1
- **특징**: 캐싱, 자동 재검증, 백그라운드 동기화, 포커스 시 재검증, 낙관적 업데이트

### 실시간 동기화

- **SSE (Server-Sent Events)**: 생성 작업의 실시간 진행 상황 (stage, progress)
- **Polling**: 에이전트가 /api/agent/tasks/next 주기적 호출

---

## 국제화

### 구조
- **LocaleProvider**: Context로 로케일 및 메시지 제공
- **메시지 파일**: ko.ts (한국어), en.ts (영어), messages.ts (타입 정의)
- **쿠키 저장**: 새로고침 후에도 로케일 유지

### 사용 패턴
```typescript
const { t, locale, setLocale } = useLocale();
```

---

## 결론

FireQA는 **AI 기반 QA 자동화 플랫폼**으로:

1. **멀티테넌시**: 조직별 완전 격리
2. **AI 우선**: OpenAI GPT를 활용한 4가지 생성 기능
3. **확장성**: 에이전트 시스템으로 비동기 작업
4. **협업**: 댓글, 활동 로그, 버전 관리
5. **마네타이제이션**: Stripe 기반 구독 + 크레딧 과금
6. **글로벌**: 다국어 지원 (한국어, 영어)
7. **개발자 친화**: REST API, Figma 플러그인, CLI 에이전트

사용자는 기획 문서만 업로드하면 AI가 자동으로 테스트케이스, 다이어그램, 와이어프레임을 생성하고 기획서를 개선해주므로 QA 업무를 대폭 자동화할 수 있습니다.

---

**분석 완료 날짜**: 2026-04-04
