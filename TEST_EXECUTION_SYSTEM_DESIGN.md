# 테스트 실행/추적 시스템 설계 문서

## 개요

FireQA가 자동 생성한 TC(테스트케이스)의 실행 상태를 추적하는 시스템입니다. 테스트 실행 세션(TestRun)과 개별 TC 결과(TestExecution)를 관리하여 QA 품질 데이터를 수집합니다.

---

## 1. 데이터 모델 (Prisma Schema)

### 1.1 TestRun 모델

특정 GenerationJob의 TC 세트에 대한 하나의 실행 세션입니다.

```prisma
model TestRun {
  id             String   @id @default(cuid())
  generationJobId String
  generationJob  GenerationJob @relation(fields: [generationJobId], references: [id], onDelete: Cascade)
  
  projectId      String
  project        Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  createdById    String
  createdBy      User     @relation("TestRunCreator", fields: [createdById], references: [id], onDelete: SetNull)
  
  // TC 스냅샷: 실행 시점의 TC 데이터 (JSON)
  // { sheets: [], testCases: [] } 형태
  testCasesSnapshot String  // JSON
  
  // 상태: "in_progress" | "completed" | "aborted"
  status         String   @default("in_progress")
  
  startedAt      DateTime @default(now())
  completedAt    DateTime?
  abortedAt      DateTime?
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  executions     TestExecution[]
  
  @@index([organizationId, createdAt(sort: Desc)])
  @@index([projectId, createdAt(sort: Desc)])
  @@index([generationJobId])
  @@index([status])
}
```

**필드 설명**:
- `generationJobId`: 실행 대상 Job의 ID
- `testCasesSnapshot`: 실행 시점의 TC 전체 스냅샷 (JSON 문자열)
  - GenerationJob의 활성 ResultVersion에서 복사
  - 이후 TC 수정 시에도 이전 실행 결과는 일관성 유지
- `status`: TestRun 전체 상태
  - `in_progress`: 아직 실행 중
  - `completed`: 모든 TC 실행 완료
  - `aborted`: 사용자가 중단
- `createdById`: 실행 시작한 사용자

---

### 1.2 TestExecution 모델

TestRun 내 개별 TC의 실행 결과입니다.

```prisma
model TestExecution {
  id             String   @id @default(cuid())
  
  testRunId      String
  testRun        TestRun  @relation(fields: [testRunId], references: [id], onDelete: Cascade)
  
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  // TC 식별자 (snapshot의 tcId 값)
  tcId           String
  
  // 상태: "pending" | "passed" | "failed" | "skipped" | "blocked"
  status         String   @default("pending")
  
  // 사용자가 입력한 메모/실패 원인
  note           String?
  
  // 스크린샷 경로 (Phase 4 이후 지원, 현재는 null)
  screenshotPath String?
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  @@unique([testRunId, tcId]) // 같은 TestRun 내 TC는 중복 불가
  @@index([testRunId, status])
  @@index([organizationId, tcId])
}
```

**필드 설명**:
- `tcId`: TC를 고유하게 식별하는 ID (resultJson에서 추출)
- `status`: TC 실행 상태
  - `pending`: 아직 실행하지 않음
  - `passed`: 성공
  - `failed`: 실패
  - `skipped`: 스킵 (실행하지 않음)
  - `blocked`: 차단됨 (선행 조건 미충족)
- `note`: 실패 원인, 메모 등 텍스트 입력 (최대 500자)
- `screenshotPath`: 스크린샷 저장 경로 (향후 Phase 4에서 구현)

---

### 1.3 기존 모델 확장

**GenerationJob**에 관계 추가:
```prisma
model GenerationJob {
  // ... 기존 필드 ...
  testRuns       TestRun[]  // ← 추가
}
```

**Project**에 관계 추가:
```prisma
model Project {
  // ... 기존 필드 ...
  testRuns       TestRun[]  // ← 추가
}
```

**Organization**에 관계 추가:
```prisma
model Organization {
  // ... 기존 필드 ...
  testRuns       TestRun[]       // ← 추가
  testExecutions TestExecution[] // ← 추가
}
```

**User**에 관계 추가:
```prisma
model User {
  // ... 기존 필드 ...
  testRuns       TestRun[] @relation("TestRunCreator") // ← 추가
}
```

---

## 2. API 엔드포인트

### 2.1 POST /api/test-runs — 새 테스트 실행 시작

**요청**:
```typescript
{
  generationJobId: string  // 대상 Job ID
  // (선택) 향후 부분 실행을 위해 tcIds 추가 가능
}
```

**요청 Zod 스키마**:
```typescript
const createTestRunSchema = z.object({
  generationJobId: z.string().cuid("유효한 Job ID가 필요합니다."),
});
```

**응답** (201):
```typescript
{
  id: string                    // 생성된 TestRun ID
  generationJobId: string
  projectId: string
  status: "in_progress"
  startedAt: ISO8601 timestamp
  totalTestCases: number        // 스냅샷의 TC 총 개수
  testCaseCount: {              // TC 개수 분류
    pending: number
    passed: number
    failed: number
    skipped: number
    blocked: number
  }
}
```

**에러**:
- 401: Unauthorized (인증 필수)
- 404: NOT_FOUND (Job 없음, Job 상태가 completed 아님)
- 403: FORBIDDEN (다른 조직의 Job)

**비즈니스 로직**:
1. 현재 사용자의 조직과 Job의 조직 일치 확인
2. Job의 상태가 `completed`인지 확인
3. Job의 활성 ResultVersion 조회
4. resultJson을 파싱하여 TC 리스트 추출
5. TestRun 생성
6. 각 TC마다 TestExecution 생성 (status: "pending")
7. 로그: `test_run.started` 이벤트 생성

**권한**:
- requireAuth: true
- 같은 조직의 멤버

---

### 2.2 GET /api/test-runs — 테스트 실행 목록 (프로젝트별)

**쿼리 파라미터**:
```typescript
{
  projectId?: string         // 프로젝트 필터 (선택)
  status?: "in_progress" | "completed" | "aborted"
  page?: number              // 페이지 번호 (기본값: 1)
  pageSize?: number          // 페이지당 항목 수 (기본값: 20, 최대: 100)
  sortBy?: "startedAt" | "createdAt" // 정렬 기준 (기본값: startedAt)
  order?: "asc" | "desc"     // 정렬 순서 (기본값: desc)
}
```

**쿼리 Zod 스키마**:
```typescript
const listTestRunsSchema = z.object({
  projectId: z.string().cuid().optional(),
  status: z.enum(["in_progress", "completed", "aborted"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["startedAt", "createdAt"]).default("startedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
```

**응답** (200):
```typescript
{
  testRuns: [
    {
      id: string
      projectId: string
      projectName: string              // 조인하여 포함
      status: "in_progress" | "completed" | "aborted"
      startedAt: ISO8601 timestamp
      completedAt: ISO8601 timestamp | null
      createdBy: {
        id: string
        name: string
        email: string
      }
      testCaseCount: {
        total: number
        pending: number
        passed: number
        failed: number
        skipped: number
        blocked: number
      }
      passRate: number                 // 0~100, (passed / (total - skipped)) * 100
    }
  ]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
}
```

**비즈니스 로직**:
1. 현재 사용자의 organizationId 확인
2. organizationId와 projectId로 필터링
3. status 필터링
4. startedAt 또는 createdAt로 정렬
5. 각 TestRun의 TestExecution들을 GROUP BY status하여 통계 계산

**권한**:
- requireAuth: true
- 같은 조직의 멤버

---

### 2.3 GET /api/test-runs/[id] — 테스트 실행 상세

**경로 파라미터**:
```typescript
{
  id: string  // TestRun ID
}
```

**응답** (200):
```typescript
{
  id: string
  generationJobId: string
  projectId: string
  projectName: string
  status: "in_progress" | "completed" | "aborted"
  startedAt: ISO8601 timestamp
  completedAt: ISO8601 timestamp | null
  createdBy: {
    id: string
    name: string
    email: string
  }
  
  testCaseCount: {
    total: number
    pending: number
    passed: number
    failed: number
    skipped: number
    blocked: number
  }
  passRate: number  // (passed / (total - skipped)) * 100, NaN이면 null로 변환
  
  // 세부 TC 목록 (상태별 정렬)
  executions: [
    {
      id: string
      tcId: string
      tcName: string                   // snapshot에서 추출
      status: "pending" | "passed" | "failed" | "skipped" | "blocked"
      note: string | null
      createdAt: ISO8601 timestamp
      updatedAt: ISO8601 timestamp
    }
  ]
}
```

**에러**:
- 401: Unauthorized
- 404: NOT_FOUND (TestRun 없음)
- 403: FORBIDDEN (다른 조직)

**비즈니스 로직**:
1. TestRun 조회 (organizationId 확인)
2. 관련 TestExecution 모두 조회
3. testCasesSnapshot을 파싱하여 tcName 추출
4. 상태별로 그룹화하여 응답

**권한**:
- requireAuth: true
- 같은 조직의 멤버

---

### 2.4 PATCH /api/test-runs/[id] — 테스트 실행 상태 변경

**경로 파라미터**:
```typescript
{
  id: string  // TestRun ID
}
```

**요청**:
```typescript
{
  status: "completed" | "aborted"  // 상태 변경
}
```

**요청 Zod 스키마**:
```typescript
const updateTestRunSchema = z.object({
  status: z.enum(["completed", "aborted"], {
    errorMap: () => ({ message: "상태는 completed 또는 aborted만 가능합니다." })
  }),
});
```

**응답** (200):
```typescript
{
  id: string
  status: "completed" | "aborted"
  completedAt: ISO8601 timestamp | null
  abortedAt: ISO8601 timestamp | null
}
```

**에러**:
- 401: Unauthorized
- 404: NOT_FOUND
- 403: FORBIDDEN
- 409: CONFLICT (이미 completed 또는 aborted 상태)

**비즈니스 로직**:
1. TestRun 조회 (organizationId 확인)
2. 현재 상태가 "in_progress"인지 확인
3. 상태 업데이트
4. 선택 사항: 모든 pending TestExecution을 skipped로 자동 변경
5. 로그: `test_run.completed` 또는 `test_run.aborted` 이벤트

**권한**:
- requireAuth: true
- 같은 조직의 멤버 (또는 createdBy 사용자만? → 멤버 전체로 단순화)

---

### 2.5 PATCH /api/test-executions/[id] — 개별 TC 실행 결과 업데이트

**경로 파라미터**:
```typescript
{
  id: string  // TestExecution ID
}
```

**요청**:
```typescript
{
  status: "pending" | "passed" | "failed" | "skipped" | "blocked"
  note?: string  // 메모 (최대 500자)
}
```

**요청 Zod 스키마**:
```typescript
const updateTestExecutionSchema = z.object({
  status: z.enum(["pending", "passed", "failed", "skipped", "blocked"]),
  note: z.string().max(500, "메모는 500자 이하여야 합니다.").optional(),
});
```

**응답** (200):
```typescript
{
  id: string
  testRunId: string
  tcId: string
  status: "pending" | "passed" | "failed" | "skipped" | "blocked"
  note: string | null
  updatedAt: ISO8601 timestamp
}
```

**에러**:
- 401: Unauthorized
- 404: NOT_FOUND
- 403: FORBIDDEN (다른 조직)

**비즈니스 로직**:
1. TestExecution 조회 (organizationId 확인)
2. status 업데이트
3. note 저장 (주어진 경우)
4. updatedAt 자동 갱신
5. 로그: `test_execution.updated` 이벤트 (선택 사항)

**권한**:
- requireAuth: true
- 같은 조직의 멤버

---

### 2.6 GET /api/test-runs/[id]/summary — 실행 요약

**경로 파라미터**:
```typescript
{
  id: string  // TestRun ID
}
```

**응답** (200):
```typescript
{
  id: string
  status: "in_progress" | "completed" | "aborted"
  
  summary: {
    total: number
    passed: number
    failed: number
    skipped: number
    blocked: number
    pending: number
    passRate: number  // percentage
    executionRate: number  // (total - pending) / total * 100
  }
  
  // 요약 상태 분포 (UI 차트용)
  statusDistribution: [
    { status: string, count: number, percentage: number }
  ]
}
```

**비즈니스 로직**:
- 같은 API 호출이 여러 번 될 수 있으므로 GET /api/test-runs/[id]에서 통계를 계산하고, 이 엔드포인트는 캐시 버전 제공 가능
- 또는 별도 엔드포인트로 빠른 조회 제공

**권한**:
- requireAuth: true
- 같은 조직의 멤버

---

## 3. UI 구조

### 3.1 테스트 실행 대시보드 페이지

**경로**: `/(dashboard)/[orgSlug]/test-runs/page.tsx`

**컴포넌트 구조**:
```
TestRunsPage
├── Header
│   ├── 제목: "테스트 실행"
│   └── [실행 시작] 버튼 → 모달: JobSelector
├── FilterBar (선택)
│   ├── 프로젝트 필터 (드롭다운)
│   ├── 상태 필터 (체크박스: in_progress, completed, aborted)
│   └── [필터 초기화] 버튼
├── TestRunsTable
│   ├── 컬럼:
│   │   - 프로젝트명
│   │   - 실행 시작 시간
│   │   - 상태 배지
│   │   - TC 통과율 (진행률 바)
│   │   - 생성자
│   │   - 작업 (→ 상세 페이지 링크)
│   └── 정렬 가능 (startedAt, createdAt)
├── Pagination
└── [실행 시작] 모달
    ├── GenerationJob 선택 드롭다운
    │   - 현재 프로젝트의 completed 상태 Job만 표시
    │   - 이름 + 생성 시간 표시
    └── [시작] 버튼
```

**상태 관리**:
- useSWR을 사용하여 GET /api/test-runs 호출
- projectId, status 필터는 URL searchParams 로 관리
- 페이지 번호는 URL searchParams로 관리

**UI 요소**:
- `<Badge>` (상태 표시)
- `<Table>` (목록)
- `<Button>` (작업)
- `<Dialog>` (모달)
- Lucide 아이콘 (Status 아이콘)

**데이터 흐름**:
1. 컴포넌트 마운트 시 GET /api/test-runs 호출
2. 필터/정렬 변경 시 URL 업데이트 → useSWR이 자동 재요청
3. [실행 시작] 버튼 클릭 → 모달 열기
4. 모달에서 Job 선택 후 [시작] → POST /api/test-runs 호출
5. 성공 시 목록 자동 갱신 (revalidate)

---

### 3.2 테스트 실행 상세 페이지

**경로**: `/(dashboard)/[orgSlug]/test-runs/[id]/page.tsx`

**컴포넌트 구조**:
```
TestRunDetailPage
├── Header
│   ├── 제목: "테스트 실행 #ID"
│   ├── 상태 배지
│   ├── 시작 시간 / 완료 시간
│   ├── 생성자
│   └── [상태 변경] 버튼 (in_progress 상태일 때만 표시)
│       → 드롭다운: [완료], [중단]
├── SummaryBar
│   ├── 진행률 바 (pending/passed/failed/skipped 색으로 구분)
│   ├── 통계:
│   │   - 총 TC 수
│   │   - 통과: X개 (녹색)
│   │   - 실패: Y개 (빨강)
│   │   - 스킵: Z개 (회색)
│   │   - 대기: W개 (파랑)
│   └── 통과율: X% (계산: passed / (total - skipped) * 100)
├── TabLayout (선택)
│   ├── Tab: "모두" (모든 TC)
│   ├── Tab: "실패" (failed TC만)
│   ├── Tab: "미실행" (pending TC만)
│   └── Tab: "스킵" (skipped TC만)
├── TestExecutionTable
│   ├── 컬럼:
│   │   - TC ID
│   │   - TC 이름
│   │   - 깊이 분류 (depth1/2/3)
│   │   - 상태 (아이콘 + 배지)
│   │   - 메모 (편집 가능 인라인 필드)
│   │   - 작업 (상태 변경 드롭다운)
│   └── 행 클릭 시 상세 정보 팝오버 (전체 TC 데이터 표시)
├── SearchBar (선택)
│   - TC ID 또는 이름으로 검색
└── [새로고침] 버튼
    - 수동으로 데이터 다시 로드
```

**상태 관리**:
- useSWR을 사용하여 GET /api/test-runs/[id] 호출
- 탭 상태는 로컬 상태
- 검색어는 로컬 상태 (필터링은 UI에서 수행)

**인라인 편집 (메모)**:
- 각 행의 메모 필드는 클릭하면 textarea로 변환
- 외부 클릭 또는 Enter 키로 저장
- PATCH /api/test-executions/[id] 호출
- 성공 시 optimistic update 또는 revalidate

**상태 변경 드롭다운**:
- 클릭 시 상태 선택 드롭다운 표시
- 선택 후 PATCH /api/test-executions/[id] 호출
- 성공 시 테이블 행 업데이트

**UI 요소**:
- `<Card>` (섹션 분리)
- `<Tabs>` (탭 네비게이션)
- `<Table>` 또는 `<DataTable>` (TC 목록)
- `<Select>` (상태 변경 드롭다운)
- `<Input>` (검색)
- `<Textarea>` (메모 인라인 편집)
- `<Progress>` (진행률 바)
- Lucide 아이콘

**데이터 흐름**:
1. [id]로 GET /api/test-runs/[id] 호출
2. TC 목록 렌더링
3. 사용자가 상태 변경 또는 메모 입력
4. PATCH /api/test-executions/[id] 호출
5. optimistic update 또는 revalidate

---

### 3.3 UI 상태 흐름

**TestRun 상태별 UI 표시**:

| 상태 | Header | Summary | Actions |
|------|--------|---------|---------|
| in_progress | "실행 중..." 배지 | 진행 중 | [완료], [중단] 버튼 |
| completed | "완료" 배지 | 최종 결과 | 비활성 |
| aborted | "중단됨" 배지 | 현재 결과 | 비활성 |

**TestExecution 상태 아이콘**:
- `pending`: ⏳ (회색)
- `passed`: ✓ (녹색)
- `failed`: ✗ (빨강)
- `skipped`: ⊘ (회색)
- `blocked`: 🚫 (주황)

**색상 팔레트**:
```
passed: #10b981 (green-500)
failed: #ef4444 (red-500)
skipped: #9ca3af (gray-400)
blocked: #f59e0b (amber-500)
pending: #3b82f6 (blue-500)
```

---

## 4. 비즈니스 로직

### 4.1 테스트 실행 시작

**Flow**:
1. POST /api/test-runs에서 generationJobId 수신
2. Job 상태 확인 (completed 필수)
3. Job의 활성 ResultVersion 조회
4. resultJson 파싱:
   ```typescript
   const result = JSON.parse(resultJson) as TestCaseGenerationResult;
   const allTestCases = result.sheets.flatMap(sheet => sheet.testCases);
   ```
5. TestRun 생성:
   ```prisma
   {
     generationJobId: id,
     projectId: job.projectId,
     organizationId: org.id,
     createdById: user.userId,
     testCasesSnapshot: resultJson,
     status: "in_progress",
   }
   ```
6. 각 TC마다 TestExecution 생성:
   ```prisma
   {
     testRunId: testRun.id,
     organizationId: org.id,
     tcId: tc.tcId,
     status: "pending",
   }
   ```
7. ActivityLog 생성:
   ```
   action: "test_run.started"
   metadata: { testRunId, totalTestCases }
   ```

### 4.2 통과율 계산

**공식**:
```typescript
passRate = (passed / (total - skipped)) * 100

// 예:
// total = 10, passed = 7, failed = 2, skipped = 1, blocked = 0, pending = 0
// passRate = 7 / (10 - 1) * 100 = 77.7%

// edge case: 모두 skipped인 경우
// total = 10, skipped = 10
// passRate = NaN → UI에서 null로 변환하여 "계산 불가" 또는 "-" 표시
```

### 4.3 권한 검증

**모든 엔드포인트에서**:
1. 사용자 인증 확인
2. organizationId 일치 확인:
   ```typescript
   if (testRun.organizationId !== user.organizationId) {
     throw ApiError.forbidden();
   }
   ```

### 4.4 Activity Logging

**기록할 액션** (src/types/enums.ts에 추가):
```typescript
export const ActivityAction = {
  // ... 기존 ...
  TEST_RUN_STARTED: "test_run.started",
  TEST_RUN_COMPLETED: "test_run.completed",
  TEST_RUN_ABORTED: "test_run.aborted",
  TEST_EXECUTION_UPDATED: "test_execution.updated",
};
```

**로그 메타데이터**:
```typescript
{
  action: "test_run.started",
  metadata: {
    testRunId: "...",
    generationJobId: "...",
    totalTestCases: 15,
  }
}
```

---

## 5. Zod 스키마

### 5.1 요청 스키마

**파일**: `src/lib/api/schemas/test-run-schemas.ts`

```typescript
import { z } from "zod";

// TestRun 생성
export const createTestRunSchema = z.object({
  generationJobId: z
    .string()
    .cuid("유효한 Job ID가 필요합니다."),
});

export type CreateTestRunRequest = z.infer<typeof createTestRunSchema>;

// TestRun 상태 업데이트
export const updateTestRunSchema = z.object({
  status: z.enum(["completed", "aborted"], {
    errorMap: () => ({ 
      message: "상태는 completed 또는 aborted만 가능합니다." 
    }),
  }),
});

export type UpdateTestRunRequest = z.infer<typeof updateTestRunSchema>;

// TestExecution 업데이트
export const updateTestExecutionSchema = z.object({
  status: z.enum(["pending", "passed", "failed", "skipped", "blocked"], {
    errorMap: () => ({ 
      message: "유효한 상태가 아닙니다." 
    }),
  }),
  note: z
    .string()
    .max(500, "메모는 500자 이하여야 합니다.")
    .optional()
    .nullable(),
});

export type UpdateTestExecutionRequest = z.infer<typeof updateTestExecutionSchema>;

// 쿼리 파라미터
export const listTestRunsQuerySchema = z.object({
  projectId: z.string().cuid().optional(),
  status: z.enum(["in_progress", "completed", "aborted"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["startedAt", "createdAt"]).default("startedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type ListTestRunsQuery = z.infer<typeof listTestRunsQuerySchema>;
```

### 5.2 응답 스키마

**파일**: `src/lib/api/schemas/test-run-responses.ts`

```typescript
import { z } from "zod";

// TestRun 응답
export const testRunSchema = z.object({
  id: z.string(),
  generationJobId: z.string(),
  projectId: z.string(),
  projectName: z.string(),
  status: z.enum(["in_progress", "completed", "aborted"]),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  createdBy: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
  }),
  testCaseCount: z.object({
    total: z.number(),
    pending: z.number(),
    passed: z.number(),
    failed: z.number(),
    skipped: z.number(),
    blocked: z.number(),
  }),
  passRate: z.number().nullable(), // NaN인 경우 null
});

export type TestRunResponse = z.infer<typeof testRunSchema>;

// TestExecution 응답
export const testExecutionSchema = z.object({
  id: z.string(),
  testRunId: z.string(),
  tcId: z.string(),
  tcName: z.string(),
  status: z.enum(["pending", "passed", "failed", "skipped", "blocked"]),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type TestExecutionResponse = z.infer<typeof testExecutionSchema>;

// TestRun 상세 응답
export const testRunDetailSchema = z.object({
  id: z.string(),
  generationJobId: z.string(),
  projectId: z.string(),
  projectName: z.string(),
  status: z.enum(["in_progress", "completed", "aborted"]),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  createdBy: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
  }),
  testCaseCount: z.object({
    total: z.number(),
    pending: z.number(),
    passed: z.number(),
    failed: z.number(),
    skipped: z.number(),
    blocked: z.number(),
  }),
  passRate: z.number().nullable(),
  executions: z.array(testExecutionSchema),
});

export type TestRunDetailResponse = z.infer<typeof testRunDetailSchema>;

// 목록 응답
export const listTestRunsResponseSchema = z.object({
  testRuns: z.array(testRunSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    totalCount: z.number(),
    totalPages: z.number(),
  }),
});

export type ListTestRunsResponse = z.infer<typeof listTestRunsResponseSchema>;

// 요약 응답
export const testRunSummarySchema = z.object({
  id: z.string(),
  status: z.enum(["in_progress", "completed", "aborted"]),
  summary: z.object({
    total: z.number(),
    passed: z.number(),
    failed: z.number(),
    skipped: z.number(),
    blocked: z.number(),
    pending: z.number(),
    passRate: z.number().nullable(),
    executionRate: z.number(),
  }),
  statusDistribution: z.array(
    z.object({
      status: z.string(),
      count: z.number(),
      percentage: z.number(),
    })
  ),
});

export type TestRunSummaryResponse = z.infer<typeof testRunSummarySchema>;
```

---

## 6. 에러 처리

**API 에러 코드** (src/lib/api/api-error-codes.ts에 추가):

```typescript
export const ApiErrorCode = {
  // ... 기존 ...
  TEST_RUN_NOT_FOUND: "TEST_RUN_NOT_FOUND",
  TEST_EXECUTION_NOT_FOUND: "TEST_EXECUTION_NOT_FOUND",
  INVALID_TEST_RUN_STATE: "INVALID_TEST_RUN_STATE",
  JOB_NOT_COMPLETED: "JOB_NOT_COMPLETED",
} as const;
```

**에러 응답 예시**:
```json
{
  "error": "TEST_RUN_NOT_FOUND",
  "message": "테스트 실행을 찾을 수 없습니다.",
  "context": {
    "testRunId": "..."
  }
}
```

---

## 7. 데이터 구조 예시

### 7.1 TC 스냅샷 (TestRun.testCasesSnapshot)

```json
{
  "sheets": [
    {
      "sheetName": "회원가입",
      "category": "사용자 인증",
      "testCases": [
        {
          "tcId": "TC-001-001",
          "name": "유효한 이메일로 가입",
          "depth1": "회원가입",
          "depth2": "이메일 입력",
          "depth3": "유효한 형식",
          "precondition": "가입 페이지 접근",
          "procedure": "이메일 입력 후 [다음]",
          "expectedResult": "다음 단계로 진행"
        },
        {
          "tcId": "TC-001-002",
          "name": "중복 이메일 입력",
          "depth1": "회원가입",
          "depth2": "이메일 입력",
          "depth3": "중복 처리",
          "precondition": "가입 페이지 접근",
          "procedure": "기존 이메일 입력 후 [다음]",
          "expectedResult": "오류 메시지 표시"
        }
      ]
    }
  ]
}
```

### 7.2 TestRun 응답 예시

```json
{
  "id": "cuid-123",
  "generationJobId": "cuid-456",
  "projectId": "cuid-789",
  "projectName": "모바일 앱",
  "status": "in_progress",
  "startedAt": "2026-04-04T10:00:00Z",
  "completedAt": null,
  "createdBy": {
    "id": "cuid-user",
    "name": "김테스터",
    "email": "tester@example.com"
  },
  "testCaseCount": {
    "total": 15,
    "pending": 8,
    "passed": 5,
    "failed": 2,
    "skipped": 0,
    "blocked": 0
  },
  "passRate": 71.4
}
```

### 7.3 TestExecution 응답 예시

```json
{
  "id": "cuid-exec-1",
  "testRunId": "cuid-123",
  "tcId": "TC-001-001",
  "tcName": "유효한 이메일로 가입",
  "status": "failed",
  "note": "이메일 입력창이 안 보임",
  "createdAt": "2026-04-04T10:00:00Z",
  "updatedAt": "2026-04-04T10:15:00Z"
}
```

---

## 8. 마이그레이션 경로

### 8.1 Prisma 마이그레이션

**파일**: `prisma/migrations/xxx_add_test_runs.sql`

```sql
-- TestRun 테이블
CREATE TABLE "TestRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "generationJobId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdById" TEXT,
  "testCasesSnapshot" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'in_progress',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "abortedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TestRun_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob" ("id") ON DELETE CASCADE,
  CONSTRAINT "TestRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE,
  CONSTRAINT "TestRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE,
  CONSTRAINT "TestRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL
);

-- TestRun 인덱스
CREATE INDEX "TestRun_organizationId_createdAt_idx" ON "TestRun"("organizationId", "createdAt" DESC);
CREATE INDEX "TestRun_projectId_createdAt_idx" ON "TestRun"("projectId", "createdAt" DESC);
CREATE INDEX "TestRun_generationJobId_idx" ON "TestRun"("generationJobId");
CREATE INDEX "TestRun_status_idx" ON "TestRun"("status");

-- TestExecution 테이블
CREATE TABLE "TestExecution" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "testRunId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "tcId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "note" TEXT,
  "screenshotPath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TestExecution_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun" ("id") ON DELETE CASCADE,
  CONSTRAINT "TestExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE,
  CONSTRAINT "TestExecution_testRunId_tcId_key" UNIQUE ("testRunId", "tcId")
);

-- TestExecution 인덱스
CREATE INDEX "TestExecution_testRunId_status_idx" ON "TestExecution"("testRunId", "status");
CREATE INDEX "TestExecution_organizationId_tcId_idx" ON "TestExecution"("organizationId", "tcId");
```

**마이그레이션 실행**:
```bash
npx prisma migrate dev --name add_test_runs
```

---

## 9. 구현 체크리스트

### Phase 1: 데이터 모델 & API
- [ ] Prisma 마이그레이션 실행
- [ ] POST /api/test-runs 구현
- [ ] GET /api/test-runs 구현
- [ ] GET /api/test-runs/[id] 구현
- [ ] PATCH /api/test-runs/[id] 구현
- [ ] PATCH /api/test-executions/[id] 구현
- [ ] GET /api/test-runs/[id]/summary 구현 (선택)

### Phase 2: UI
- [ ] /(dashboard)/[orgSlug]/test-runs/page.tsx 구현
- [ ] /(dashboard)/[orgSlug]/test-runs/[id]/page.tsx 구현
- [ ] 상태 아이콘/배지 컴포넌트
- [ ] 진행률 바 컴포넌트

### Phase 3: 고급 기능
- [ ] 실시간 업데이트 (WebSocket 또는 polling)
- [ ] 스크린샷 업로드 (Phase 4)
- [ ] 일괄 상태 변경 (bulk update)
- [ ] Export to CSV/Excel

---

## 10. 향후 확장 계획

### Phase 4 (마이크로서비스 & 호스티드 워커)
- 스크린샷 업로드 지원
- S3 연동

### Phase 5 (고급 분석)
- TC 성공률 추이 차트
- 실패 패턴 분석
- 팀별 성과 대시보드

### Phase 6 (통합)
- Jira 이슈 연동
- Slack 알림
- 자동화된 TC 실행 (에이전트)

---

## 11. 데이터 정규화 참고사항

**TestExecution에서 TC 정보를 snapshot에서 추출하는 이유**:
- TestCase는 별도 테이블 없음 (JSON으로 저장)
- tcId는 고유 식별자 역할
- tcName, depth1/2/3 등은 필요시 snapshot에서 추출
- 이렇게 하면 TC 수정 후에도 과거 실행 결과와 현재 TC 정의가 일치하지 않아도 추적 가능

**정규화 vs 비정규화 트레이드오프**:
- ✅ 비정규화: 과거 데이터 일관성, 쿼리 성능
- ❌ 비정규화: 데이터 중복, 스토리지 증가
- 현재 설계는 비정규화 선택 (통과, 단순성)

---

## 12. 성능 고려사항

### 인덱싱 전략
- `TestRun`: organizationId, projectId, status로 자주 조회
- `TestExecution`: testRunId, status로 grouping 조회

### 쿼리 최적화
- GET /api/test-runs/[id]는 TestExecution을 GROUP BY status하여 통계 계산
- 대량 TC인 경우 (>1000) 페이지네이션 필수

### 캐싱 (향후)
- 완료된 TestRun은 변경 불가이므로 캐시 가능
- 진행 중인 TestRun은 실시간 업데이트 필요

