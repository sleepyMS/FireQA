# FireQA 기술 개선 분석 리포트

**작성일**: 2026-04-04  
**분석 범위**: 코드 구조, 아키텍처, 성능, 보안, 테스트, 데이터베이스, 의존성 관리

---

## 1. API 라우트 패턴 일관성

### 현재 상태
- 74개의 API 라우트가 비교적 일관된 구조를 따름
- 모든 라우트에서 `getCurrentUser()` 호출로 인증 체크
- 에러 응답 형식이 대체로 일관적 (`{ error: string }`)
- 각 라우트 최상단에서 try-catch로 감싸는 패턴 사용

**근거 파일**:
- `src/app/api/projects/route.ts` (프로젝트 조회/생성)
- `src/app/api/diagrams/route.ts` (다이어그램 생성)
- `src/app/api/comments/route.ts` (댓글 조회/생성)

### 문제점

#### 1.1 일관되지 않은 에러 처리 세부 사항
```typescript
// 프로젝트 라우트 (projects/route.ts:91)
catch (error) {
  console.error("프로젝트 목록 조회 오류:", error);
  return NextResponse.json({ error: "목록 조회에 실패했습니다." }, { status: 500 });
}

// 댓글 라우트 (comments/route.ts:193)
catch (error) {
  console.error("코멘트 생성 오류:", error);
  return NextResponse.json({ error: "코멘트 생성에 실패했습니다." }, { status: 500 });
}
```
- 모든 에러를 `status: 500`으로 반환 (사용자 입력 오류도 동일)
- 구체적인 에러 원인을 클라이언트에게 전달하지 않음
- 개발자는 서버 로그를 봐야만 원인 파악 가능

#### 1.2 요청 본문 파싱 미검증
```typescript
// comments/route.ts:78-85
const body = await request.json() as {
  jobId?: string;
  body?: string;
  targetItemId?: string;
  parentId?: string;
};

const { jobId, body: commentBody, ... } = body;
// 이후 null/undefined 검증만 수행
```
- `request.json()` 실패 시 예외처리 없음 (catch 문에서 처리)
- 타입 단언(`as`) 사용으로 실제 타입 보장 안 됨
- 값 범위 검증이 미흡함 (예: `commentBody` 길이는 체크하지만 다른 필드는 미검증)

#### 1.3 응답 형식 불일치
```typescript
// projects/route.ts:78-89: 프로젝트 목록
return NextResponse.json({
  projects: items.map(...),
  nextCursor,
});

// comments/route.ts:37-64: 댓글 목록
return NextResponse.json({
  comments: comments.map(...),
});

// notifications/route.ts:32-42: 알림 목록
return NextResponse.json({
  notifications: notifications.map(...),
  unreadCount,
});
```
- 페이지네이션 정보 포함 여부가 일관되지 않음
- 메타데이터 필드명이 불일치 (`nextCursor` vs `unreadCount`)

### 개선 제안

1. **공통 에러 처리 미들웨어 도입**
   ```typescript
   // src/lib/api/error-handler.ts
   interface ApiError {
     code: string; // 'INVALID_INPUT' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'INTERNAL_ERROR'
     message: string;
     details?: Record<string, string>;
   }
   
   export function createErrorResponse(code: string, status: number, details?: object) {
     return NextResponse.json({ error: { code, ...details } }, { status });
   }
   ```

2. **요청 검증 라이브러리 도입** (Zod 사용)
   ```typescript
   import { z } from 'zod';
   
   const createCommentSchema = z.object({
     jobId: z.string().cuid(),
     body: z.string().trim().min(1).max(10000),
     targetItemId: z.string().optional(),
     parentId: z.string().optional(),
   });
   
   // 라우트 핸들러
   const validated = await createCommentSchema.parseAsync(body).catch(err =>
     createErrorResponse('INVALID_INPUT', 400, { details: err.flatten() })
   );
   ```

3. **일관된 응답 형식 정의**
   ```typescript
   interface ApiListResponse<T> {
     data: T[];
     pagination: {
       total?: number;
       cursor?: string;
       hasMore: boolean;
     };
   }
   ```

### 우선순위: **높음**
- 영향: 74개 라우트 모두
- 효과: 클라이언트 에러 처리 개선, 개발자 디버깅 시간 단축

---

## 2. 코드 중복

### 현재 상태
- 93개 항목이 `getCurrentUser()` 호출 (모든 라우트)
- 204개 항목이 `request.json()` 또는 `request.formData()` 호출
- 87개 항목에서 `try-catch` 패턴 사용
- 개별 라우트에서 반복되는 인증/인가 로직

### 문제점

#### 2.1 조직 권한 검증의 중복
```typescript
// projects/route.ts:46-62 (프로젝트 목록)
const where = {
  organizationId: user.organizationId,
  ...
};

// comments/route.ts:112 (댓글 생성)
if (!job || job.project.organizationId !== user.organizationId) {
  return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
}

// tasks/route.ts (에이전트 작업 조회)
// 동일한 패턴 반복
```
- 조직 권한 검증이 매번 직접 구현됨
- 검증 실패 시 에러 메시지 불일치 (`"작업을 찾을 수 없습니다"` vs 구체적 권한 거부)

#### 2.2 데이터 변환 반복
```typescript
// comments/route.ts:38-49 (댓글 목록)
comments: comments.map((c) => ({
  id: c.id,
  authorId: c.authorId,
  body: c.body,
  ...
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString(),
}))

// notifications/route.ts:33-40 (알림 목록)
notifications: notifications.map((n) => ({
  id: n.id,
  type: n.type,
  ...
  createdAt: n.createdAt.toISOString(),
}))
```
- `toISOString()` 변환이 모든 라우트에서 반복
- 날짜 필드명/형식 불일치 가능성

#### 2.3 레이트 제한 및 플랜 제한 로직
```typescript
// projects/route.ts:112-122 (프로젝트 생성)
const [plan, projectCount] = await Promise.all([
  getOrgPlan(user.organizationId),
  prisma.project.count({ where: { ... } }),
]);
const limits = getPlanLimits(plan);
if (limits.projectsMax !== Infinity && projectCount >= limits.projectsMax) {
  return NextResponse.json({ error: "..." }, { status: 403 });
}

// diagrams/route.ts:44-50 (다이어그램 생성)
const { limited, resetAt } = await checkRateLimit(user.organizationId);
if (limited) {
  return NextResponse.json({ error: "..." }, { status: 429 });
}
```
- 각 생성 API마다 다른 제한 방식 사용
- 프로젝트/다이어그램/테스트케이스 생성의 제한 로직이 별도

### 개선 제안

1. **권한 검증 헬퍼 함수 통일**
   ```typescript
   // src/lib/api/auth-helpers.ts
   export async function verifyOrgAccess(
     userId: string,
     organizationId: string,
     requiredRole?: UserRole
   ): Promise<AuthError | AuthUser> {
     // 통일된 검증 로직
   }
   
   export async function verifyResourceOwnership(
     resourceId: string,
     organizationId: string,
     resourceType: 'project' | 'job' | 'comment'
   ): Promise<ResourceError | Resource> {
     // 리소스 권한 검증
   }
   ```

2. **응답 변환기 자동화** (TypeScript 제네릭)
   ```typescript
   // src/lib/api/response-mapper.ts
   export function mapToResponse<T extends { createdAt: Date; updatedAt?: Date }>(
     items: T[],
     pick?: (keyof T)[]
   ): object[] {
     return items.map(item => {
       const base = pick ? pick.reduce((acc, key) => ({ ...acc, [key]: item[key] }), {}) : item;
       return {
         ...base,
         createdAt: item.createdAt.toISOString(),
         ...(item.updatedAt && { updatedAt: item.updatedAt.toISOString() }),
       };
     });
   }
   ```

3. **제한 정책 추상화**
   ```typescript
   // src/lib/api/limits.ts
   export async function checkLimits(
     organizationId: string,
     operationType: 'project_create' | 'generation' | 'upload'
   ): Promise<LimitCheckResult> {
     const plan = await getOrgPlan(organizationId);
     const limits = getPlanLimits(plan);
     // 통일된 제한 로직
   }
   ```

### 우선순위: **중간**
- 영향: 30+ 라우트
- 효과: 버그 위험 감소, 유지보수 시간 단축

---

## 3. 타입 안전성

### 현재 상태
- TypeScript `strict: true` 설정 활성화 (tsconfig.json)
- 대부분의 함수에 명시적 타입 정의 있음
- Union 타입 (`'active' | 'archived'` 등) 사용

**근거**:
- `tsconfig.json`: `strict: true`
- `src/types/enums.ts`: 열거 타입 정의
- `src/lib/auth/get-current-user.ts`: 상세한 타입 정의

### 문제점

#### 3.1 타입 단언 남용
```typescript
// projects/route.ts:21
const statusParam = (searchParams.get("status") || "active") as string;

// comments/route.ts:78
const body = await request.json() as {
  jobId?: string;
  body?: string;
  targetItemId?: string;
  parentId?: string;
};

// billing/credits/purchase/route.ts:22
const { packageId } = body as { packageId?: string };

// agent/tasks/next/route.ts:22
const tasks = await prisma.$queryRaw<Array<{...}>> `...`
```
- `as` 타입 단언이 검증 없이 사용됨
- 런타임 시 예상과 다른 타입이 들어올 경우 오류 발생
- 특히 API 입력은 신뢰할 수 없음

#### 3.2 `any` 타입 회피
```typescript
// JSON.parse 결과가 암묵적 any
const existingLog = task.outputLog
  ? JSON.parse(task.outputLog)
  : [];

// agent/tasks/[id]/output/route.ts:131
const chunks: AgentOutputChunk[] = current.outputLog
  ? JSON.parse(current.outputLog)
  : [];
```
- JSON 파싱 결과가 타입 정의 없음
- `as` 타입 단언으로 강제 변환

#### 3.3 선택적 필드 처리 불일치
```typescript
// api/create-generation-job.ts:27-44
if (typeof projectInput === "string") {
  // ...
} else {
  // projectInput: { id: string }
  const existing = await prisma.project.findFirst({
    where: { id: projectInput.id, organizationId: auth.organizationId },
  });
}
```
- Union 타입 처리는 좋지만, Discriminated Union 미사용
- 리터럴 타입 스위칭으로 개선 가능

#### 3.4 암묵적 any 파라미터
```typescript
// lib/api/create-generation-job.ts:14-20
export async function createGenerationJob(
  file: File,
  projectInput: string | { id: string }, // Union이지만 명시성 부족
  jobType: JobType,
  auth: { userId: string; organizationId: string } // inline 타입
): Promise<CreateJobResult>
```
- Inline 타입 정의로 재사용성 낮음
- 타입 이름이 없어 IDE 자동완성 미흡

### 개선 제안

1. **Zod 스키마 기반 검증**
   ```typescript
   // src/lib/api/schemas.ts
   import { z } from 'zod';
   
   export const createCommentSchema = z.object({
     jobId: z.string().cuid('Invalid job ID'),
     body: z.string().trim().min(1).max(10000),
     targetItemId: z.string().optional(),
     parentId: z.string().optional().nullable(),
   });
   
   // 라우트에서 사용
   const validated = createCommentSchema.parse(body); // 타입 추론됨
   ```

2. **JSON 파싱 안전성**
   ```typescript
   // src/lib/api/json-parse.ts
   export function safeJsonParse<T>(
     json: string | null,
     schema: z.ZodSchema<T>,
     fallback: T
   ): T {
     if (!json) return fallback;
     try {
       return schema.parse(JSON.parse(json));
     } catch {
       return fallback;
     }
   }
   
   // 사용 예
   const chunks = safeJsonParse(
     task.outputLog,
     z.array(agentOutputChunkSchema),
     []
   );
   ```

3. **명시적 타입 정의**
   ```typescript
   // src/lib/api/types.ts
   export interface GenerationJobInput {
     file: File;
     projectInput: { type: 'new'; name: string } | { type: 'existing'; id: string };
     jobType: JobType;
     auth: { userId: string; organizationId: string };
   }
   
   // Discriminated Union으로 더 타입 안전
   ```

### 우선순위: **높음**
- 영향: 모든 API 라우트 (74개)
- 효과: 런타임 버그 예방, IDE 지원 향상

---

## 4. 에러 처리 전략

### 현재 상태
- 94개 catch 블록에서 `console.error()` 호출
- 모든 예외를 `status: 500`으로 반환
- 구조화된 로깅 없음

### 문제점

#### 4.1 사용자 오류 vs 시스템 오류 미분

```typescript
// comments/route.ts:88-96
const trimmed = commentBody?.trim() ?? "";
if (!trimmed) {
  return NextResponse.json({ error: "내용(body)을 입력해주세요." }, { status: 400 });
}
if (trimmed.length > MAX_BODY_LENGTH) {
  return NextResponse.json({ error: "내용이 너무 깁니다. (최대 10,000자)" }, { status: 400 });
}

// 하지만 이후 모든 DB 오류는
catch (error) {
  console.error("코멘트 생성 오류:", error);
  return NextResponse.json({ error: "코멘트 생성에 실패했습니다." }, { status: 500 });
}
```
- 입력 오류 (400)와 시스템 오류 (500)를 명확히 구분
- 하지만 Database 오류 원인을 숨김

#### 4.2 Prisma 에러 미분화

```typescript
// 모든 라우트에서 동일한 패턴
try {
  const result = await prisma.someModel.findUnique(...);
} catch (error) {
  console.error("작업 조회 오류:", error);
  return NextResponse.json({ error: "작업 조회에 실패했습니다." }, { status: 500 });
}
```
- `NOT_FOUND` vs `UNIQUE_CONSTRAINT_FAILED` vs `DATABASE_CONNECTION_ERROR` 미분화
- Prisma 에러를 구체적으로 처리하지 않음

#### 4.3 비동기 오류 처리 미흡

```typescript
// activity/log-activity.ts:23-34
export function logActivity(params: {...}): void {
  prisma.activityLog.create({...})
    .catch(console.error); // fire-and-forget

  if (WEBHOOK_EVENTS.has(params.action)) {
    deliverWebhooks(...); // 반환값 무시, 에러 미처리
  }
}

// comments/route.ts:151-173 (이메일 알림)
Promise.all([...])
  .then(...)
  .catch((err) => console.error("답글 이메일 발송 오류:", err));
```
- 백그라운드 작업 실패 시 사용자에게 알림 없음
- 로깅만 하고 재시도 없음

#### 4.4 에러 컨텍스트 부족

```typescript
// agent/tasks/[id]/output/route.ts:154-156
catch {
  // polling 에러는 무시 — 다음 interval에서 재시도
}
```
- 에러 무시로 인해 디버깅 불가능
- 연속 실패는 감지 안 됨

### 개선 제안

1. **구조화된 에러 클래스**
   ```typescript
   // src/lib/api/errors.ts
   export class ApiError extends Error {
     constructor(
       public code: string,
       public status: number,
       message: string,
       public details?: Record<string, unknown>
     ) {
       super(message);
     }
   }
   
   export class ValidationError extends ApiError {
     constructor(message: string, details?: object) {
       super('VALIDATION_ERROR', 400, message, details);
     }
   }
   
   export class NotFoundError extends ApiError {
     constructor(message: string) {
       super('NOT_FOUND', 404, message);
     }
   }
   
   export class ConflictError extends ApiError {
     constructor(message: string) {
       super('CONFLICT', 409, message);
     }
   }
   ```

2. **Prisma 에러 처리**
   ```typescript
   // src/lib/api/prisma-error-handler.ts
   import { Prisma } from '@prisma/client';
   
   export function handlePrismaError(error: unknown): ApiError {
     if (error instanceof Prisma.PrismaClientKnownRequestError) {
       switch (error.code) {
         case 'P2002':
           return new ConflictError(`필드 '${error.meta?.target}' 중복`);
         case 'P2025':
           return new NotFoundError('레코드를 찾을 수 없습니다.');
         case 'P2003':
           return new ValidationError('참조하는 레코드가 없습니다.');
         default:
           return new ApiError('DATABASE_ERROR', 500, '데이터베이스 오류');
       }
     }
     return new ApiError('INTERNAL_ERROR', 500, '예기치 않은 오류');
   }
   ```

3. **비동기 작업 추적**
   ```typescript
   // src/lib/api/async-task-queue.ts
   export class AsyncTaskQueue {
     private queue: Array<() => Promise<void>> = [];
     private processing = false;
   
     add(fn: () => Promise<void>) {
       this.queue.push(fn);
       this.process();
     }
   
     private async process() {
       if (this.processing || this.queue.length === 0) return;
       this.processing = true;
       while (this.queue.length > 0) {
         const fn = this.queue.shift()!;
         try {
           await fn();
         } catch (error) {
           console.error('비동기 작업 실패:', error);
           // 재시도 로직 또는 DLQ 추가
         }
       }
       this.processing = false;
     }
   }
   ```

4. **중앙 집중식 에러 처리 미들웨어**
   ```typescript
   // src/lib/api/error-middleware.ts
   export function createSafeHandler<T extends (...args: any[]) => Promise<Response>>(
     handler: T
   ): T {
     return (async (...args: any[]) => {
       try {
         return await handler(...args);
       } catch (error) {
         if (error instanceof ApiError) {
           return NextResponse.json(
             { error: { code: error.code, message: error.message, ...error.details } },
             { status: error.status }
           );
         }
         console.error('Unhandled error:', error);
         return NextResponse.json(
           { error: { code: 'INTERNAL_ERROR', message: '예기치 않은 오류' } },
           { status: 500 }
         );
       }
     }) as T;
   }
   
   // 사용
   export const POST = createSafeHandler(async (request) => { ... });
   ```

### 우선순위: **높음**
- 영향: 74개 라우트, 모니터링 및 디버깅 
- 효과: 개발 생산성 증대, 사용자 경험 개선

---

## 5. 성능 이슈

### 현재 상태
- Prisma 쿼리 최적화 일부 적용
- TTL 캐시 시스템 사용 (5분 TTL)
- SSE 스트리밍 사용

### 문제점

#### 5.1 N+1 쿼리 위험

```typescript
// comments/route.ts:25-35 (댓글 목록)
const comments = await prisma.comment.findMany({
  where: { jobId, organizationId: user.organizationId, parentId: null, deletedAt: null },
  orderBy: { createdAt: "asc" },
  include: {
    replies: {
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
      take: 100,
    },
  },
});
```
- 댓글 본문은 모두 로드하지만, 작성자 정보는 미포함
- 개선: `replies` 관계에서 `include: { author: true }` 추가 필요

```typescript
// notifications/route.ts:21-29 (알림 목록)
const [notifications, unreadCount] = await Promise.all([
  prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20,
    // select/include 없음 — 모든 필드 로드
  }),
  prisma.notification.count({ where: {...} }),
]);
```
- 20개 알림 조회 + 1개 카운트 쿼리 = 2번 WHERE 절 실행
- 개선: `select: { metadata: false }` 등으로 불필요한 필드 제외

#### 5.2 과도한 캐시 의존성

```typescript
// lib/billing/get-org-plan.ts:7-17
const planCache = createTTLCache<string>(5 * 60_000); // 5분 TTL

export async function getOrgPlan(organizationId: string): Promise<string> {
  const cached = planCache.get(organizationId);
  if (cached !== undefined) return cached;
  
  const org = await prisma.organization.findUnique({...});
  const plan = org?.plan ?? "free";
  planCache.set(organizationId, plan);
  return plan;
}
```
- 5분 동안 플랜 변경이 반영되지 않음
- 플랜 다운그레이드 후 5분간 이전 플랜의 한도로 생성 가능
- 개선: 플랜 변경 시 캐시 무효화 필수

```typescript
// lib/rate-limit/check-rate-limit.ts
const rateLimitCache = createTTLCache<number>(5 * 60_000); // 동일하게 5분
```
- 레이트 제한도 5분 동안 캐싱되어 정확도 떨어짐

#### 5.3 SSE 폴링 비효율

```typescript
// agent/tasks/[id]/output/route.ts:112-157
const poll = setInterval(async () => {
  if (writer.closed) {
    clearInterval(poll);
    return;
  }
  
  try {
    const current = await prisma.agentTask.findUnique({...});
    // 1초마다 DB 쿼리 실행
  }
}, 1000);
```
- 1초마다 DB 조회 → 장시간 실행 시 불필요한 부하
- 수백 명의 사용자가 동시에 실행하면 DB에 심각한 영향
- 개선: WebSocket, Webhook, 또는 변경감지 이벤트 시스템

#### 5.4 번들 크기

```typescript
// package.json 의존성
- "openai": "^6.32.0" (300KB+)
- "exceljs": "^4.4.0" (300KB+)
- "pdf-parse": "^1.1.1" (200KB+)
- "mammoth": "^1.12.0" (500KB+)
```
- 문서 파싱 라이브러리들이 클라이언트 번들에 포함되지는 않지만, 서버리스 크기에 영향
- Vercel 최대 배포 크기 제한 확인 필요

#### 5.5 메모리 누수 위험

```typescript
// lib/cache/ttl-cache.ts:28-32
set(key, value) {
  if (cache.size >= maxSize && !cache.has(key)) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, ts: Date.now() });
}
```
- FIFO 방식으로 oldest 항목 제거하지만, 실제로 expired 항목인지 확인 안 함
- maxSize=500으로 고정되어 조직 수가 많으면 문제 가능
- 개선: LRU 캐시 또는 주기적 정리 로직

### 개선 제안

1. **N+1 쿼리 최적화**
   ```typescript
   // comments/route.ts 개선
   const comments = await prisma.comment.findMany({
     where: { jobId, organizationId: user.organizationId, parentId: null, deletedAt: null },
     include: {
       replies: {
         where: { deletedAt: null },
         include: { author: { select: { id: true, name: true, email: true } } }, // 추가
       },
       author: { select: { id: true, name: true, email: true } }, // 추가
     },
   });
   ```

2. **캐시 정책 개선**
   ```typescript
   // src/lib/cache/adaptive-cache.ts
   export class AdaptiveCache<V> {
     private cache = new Map<string, { value: V; timestamp: number }>();
     
     constructor(
       private getTTL: (key: string, value: V) => number
     ) {}
     
     get(key: string): V | undefined {
       const entry = this.cache.get(key);
       if (!entry) return undefined;
       if (Date.now() - entry.timestamp > this.getTTL(key, entry.value)) {
         this.cache.delete(key);
         return undefined;
       }
       return entry.value;
     }
   }
   
   // 사용
   const planCache = new AdaptiveCache((key, plan) => {
     // 'pro' 플랜은 1시간, 'free'는 5분
     return plan === 'free' ? 5 * 60_000 : 60 * 60_000;
   });
   ```

3. **SSE 폴링 대체**
   - 단기: 폴링 간격을 동적으로 조정 (처음 2초, 최대 10초)
   - 중기: Broadcast Channel API 또는 Server-Sent Events 구독 시스템
   - 장기: WebSocket 기반 실시간 업데이트

4. **쿼리 배치 최적화**
   ```typescript
   // src/lib/api/batch-load.ts (DataLoader 패턴)
   export class UserLoader {
     private batch: Set<string> = new Set();
     private promise: Promise<Map<string, User>> | null = null;
     
     async load(userId: string): Promise<User> {
       this.batch.add(userId);
       if (!this.promise) {
         this.promise = (async () => {
           const ids = Array.from(this.batch);
           const users = await prisma.user.findMany({
             where: { id: { in: ids } },
           });
           return new Map(users.map(u => [u.id, u]));
         })();
       }
       const users = await this.promise;
       return users.get(userId)!;
     }
   }
   ```

### 우선순위: **중간**
- 영향: 데이터베이스 부하, 사용자 경험 (폴링 지연)
- 효과: API 응답 시간 20-40% 단축 가능

---

## 6. 보안 취약점

### 현재 상태
- 기본적인 인증/인가 체크 있음
- API 토큰 SHA-256 해싱
- Stripe 웹훅 서명 검증

### 문제점

#### 6.1 입력 검증 부족

```typescript
// comments/route.ts:18-22
const { searchParams } = request.nextUrl;
const jobId = searchParams.get("jobId");

if (!jobId) {
  return NextResponse.json({ error: "jobId가 필요합니다." }, { status: 400 });
}
```
- jobId가 유효한 CUID 형식인지 검증 안 함
- 임의의 문자열 입력 가능

```typescript
// projects/route.ts:26-28
const search = searchParams.get("search") || "";
// 직접 Prisma 쿼리에 사용
...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
```
- `contains` 사용하지만, 매우 긴 문자열 입력으로 성능 저하 가능
- ReDoS 공격 위험은 낮음 (문자열 패턴이 아님)

#### 6.2 JSON.parse 안전성

```typescript
// agent/tasks/[id]/output/route.ts:40-41
const existingLog: AgentOutputChunk[] = task.outputLog
  ? JSON.parse(task.outputLog)
  : [];
```
- 잘못된 JSON 형식 → `SyntaxError` 발생
- 타입 검증 없음 → 예상치 못한 구조 가능

```typescript
// comments/route.ts:99-109
const [job, parentComment] = await Promise.all([
  prisma.generationJob.findUnique({...}),
  parentId ? prisma.comment.findUnique({...}) : Promise.resolve(null),
]);
```
- 병렬 조회지만, 권한 검증 순서 고려 필요

#### 6.3 조직 간 데이터 노출 위험

```typescript
// activity/route.ts (조회 코드 미수집)
// 구체적 코드가 없지만, organizationId 검증 필수
```

예제 분석:
```typescript
// invitations/accept/route.ts:36-41 (좋은 예)
if (invitation.email && user.email !== invitation.email) {
  return NextResponse.json(
    { error: "이 초대는 다른 이메일 주소로 발송되었습니다." },
    { status: 403 }
  );
}
```
- 이메일 검증 좋음
- 하지만 초대가 존재하지 않는 경우와 권한 없는 경우 모두 `400` 상태 반환

```typescript
// organization/transfer/route.ts:29-40 (권한 검증 불완전)
const target = await prisma.organizationMembership.findUnique({...});
if (!target) {
  return NextResponse.json({ error: "대상 멤버를 찾을 수 없습니다." }, { status: 404 });
}
// target이 현재 organizationId에 속하는지 재검증 안 함
```

#### 6.4 환경 변수 노출

```typescript
// billing/credits/purchase/route.ts:39
const origin = request.headers.get("origin") ?? 
               process.env.NEXT_PUBLIC_APP_URL ?? 
               "http://localhost:3000";
```
- `NEXT_PUBLIC_`는 클라이언트에 노출됨 (의도된 설계)
- 민감한 정보는 `NEXT_PUBLIC_` prefix 사용 금지

#### 6.5 CSRF 보호 없음

- POST/PUT/DELETE 요청에 대한 CSRF 토큰 검증 없음
- Next.js 13+에서는 Server Actions가 기본으로 보호하지만, API 라우트는 수동 구현 필요

#### 6.6 Rate Limiting 부족

```typescript
// rate-limit/check-rate-limit.ts
export async function checkRateLimit(organizationId: string) {
  // 조직 단위 제한만 있음
}
```
- 사용자 단위 또는 IP 단위 제한 없음
- DDoS 또는 API 남용에 취약

### 개선 제안

1. **입력 검증 스키마 강화**
   ```typescript
   // src/lib/api/validation-schemas.ts
   export const jobIdSchema = z.string().cuid('Invalid job ID');
   export const searchSchema = z.string().max(200, 'Search too long');
   export const emailSchema = z.string().email().max(255);
   
   // 라우트 사용
   const jobId = jobIdSchema.parse(searchParams.get('jobId'));
   const search = searchSchema.parse(searchParams.get('search') || '');
   ```

2. **안전한 JSON 파싱**
   ```typescript
   // src/lib/api/safe-parse.ts
   export function safeJsonParse<T>(
     input: string | null,
     schema: z.ZodSchema<T>,
     defaultValue: T
   ): T {
     if (!input) return defaultValue;
     try {
       const parsed = JSON.parse(input);
       return schema.parse(parsed);
     } catch (error) {
       console.error('JSON parse error:', error);
       return defaultValue;
     }
   }
   ```

3. **일관된 에러 응답 (Timing Attack 방지)**
   ```typescript
   // 권한 없음과 리소스 없음을 동일하게 처리
   if (!job || job.organizationId !== user.organizationId) {
     return NextResponse.json(
       { error: "Unauthorized" }, // "리소스를 찾을 수 없습니다" 대신
       { status: 404 }
     );
   }
   ```

4. **CSRF 보호**
   ```typescript
   // src/lib/api/csrf-middleware.ts
   export function verifyCsrfToken(request: NextRequest): boolean {
     const token = request.headers.get('x-csrf-token');
     // 서버에서 발급한 토큰과 비교
     return validateToken(token);
   }
   
   // 라우트 사용
   export async function POST(request: NextRequest) {
     if (!verifyCsrfToken(request)) {
       return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
     }
   }
   ```

5. **IP 기반 Rate Limiting**
   ```typescript
   // src/lib/api/ip-rate-limit.ts
   export async function checkIpRateLimit(
     ip: string,
     limit: number = 100,
     windowMs: number = 60_000
   ): Promise<boolean> {
     const key = `ip_${ip}`;
     const count = rateLimitCache.get(key) ?? 0;
     if (count >= limit) return false;
     rateLimitCache.update(key, (n) => n + 1);
     return true;
   }
   ```

### 우선순위: **높음**
- 영향: 모든 API 라우트
- 효과: 보안 침해 예방

---

## 7. 테스트 커버리지

### 현재 상태
- **총 1개** 테스트 파일: `src/types/agent.test.ts`
- Vitest 설정 있음 (package.json)
- 테스트 커버리지 도구 설정: `@vitest/coverage-v8`

```typescript
// src/types/agent.test.ts (전체 파일)
import { describe, it, expect } from 'vitest';
import { parseTaskResult } from '@/lib/agent/parse-task-result';

describe('Agent Task Result Parsing', () => {
  it('should parse valid task result', () => {
    const result = parseTaskResult('{"status":"completed"}');
    expect(result.status).toBe('completed');
  });
});
```

### 문제점

#### 7.1 테스트 범위 극도로 제한됨
- 74개 API 라우트 중 **0개** 테스트됨
- 20+개 라이브러리 함수 중 거의 모두 미테스트됨
- 데이터베이스 마이그레이션/스키마 테스트 없음

#### 7.2 핵심 기능 미커버

```typescript
// 미테스트 영역:
// 1. 인증/인가 (get-current-user.ts - 203줄)
// 2. 결제/크레딧 (credits.ts - 157줄)
// 3. 레이트 제한 (check-rate-limit.ts - 37줄)
// 4. 활동 로깅 (log-activity.ts - 45줄)
// 5. SSE 스트리밍 (create-sse-stream.ts - 95줄)
// 6. 웹훅 전달 (webhooks/deliver.ts)
// 7. 에이전트 통합 (agent/* - 200+줄)
```

#### 7.3 회귀 테스트 부재
- API 변경 후 기존 기능 파괴 감지 불가능
- 리팩토링 시 신뢰도 낮음

#### 7.4 통합 테스트 없음
- 인증 → 프로젝트 생성 → 파일 업로드 → 생성 작업 → 결과 조회 같은 엔드-투-엔드 플로우 미테스트
- 마이크로서비스 간 상호작용 (Fly.io 워커 등) 미테스트

### 개선 제안

1. **API 라우트 테스트 기본 구조**
   ```typescript
   // src/app/api/__tests__/projects.test.ts
   import { describe, it, expect, beforeEach, afterEach } from 'vitest';
   import { createMocks } from 'node-mocks-http';
   import { GET, POST } from '@/app/api/projects/route';
   import { prisma } from '@/lib/db';
   
   describe('POST /api/projects', () => {
     let mockUser: any;
     
     beforeEach(async () => {
       mockUser = await prisma.user.create({...});
     });
     
     afterEach(async () => {
       await prisma.user.delete({...});
     });
     
     it('should create project with valid input', async () => {
       const { req, res } = createMocks({
         method: 'POST',
         body: { name: 'Test Project' },
         headers: { authorization: `Bearer ${mockToken}` },
       });
       
       await POST(req as any);
       expect(res._getStatusCode()).toBe(201);
       const body = JSON.parse(res._getData());
       expect(body.id).toBeDefined();
       expect(body.name).toBe('Test Project');
     });
     
     it('should return 400 for missing project name', async () => {
       const { req, res } = createMocks({
         method: 'POST',
         body: {},
       });
       
       await POST(req as any);
       expect(res._getStatusCode()).toBe(400);
     });
   });
   ```

2. **단위 테스트 (라이브러리 함수)**
   ```typescript
   // src/lib/billing/__tests__/credits.test.ts
   import { describe, it, expect } from 'vitest';
   import { addCredits, deductCredits } from '@/lib/billing/credits';
   import { prisma } from '@/lib/db';
   
   describe('Credits System', () => {
     it('should add credits to organization', async () => {
       const result = await addCredits('org_123', 100, {
         type: 'purchase',
         description: 'Test purchase',
       });
       expect(result.balance).toBe(100);
     });
   });
   ```

3. **통합 테스트 설정**
   ```typescript
   // vitest.config.ts
   import { defineConfig } from 'vitest/config';
   import path from 'path';
   
   export default defineConfig({
     test: {
       environment: 'node',
       setupFiles: ['./src/__tests__/setup.ts'],
       globals: true,
       coverage: {
         provider: 'v8',
         reporter: ['text', 'json', 'html'],
         exclude: [
           'node_modules/',
           'src/__tests__/',
           '**/*.test.ts',
           '**/*.spec.ts',
         ],
       },
     },
     resolve: {
       alias: { '@': path.resolve(__dirname, './src') },
     },
   });
   
   // src/__tests__/setup.ts
   import { beforeAll, afterAll } from 'vitest';
   import { exec } from 'child_process';
   import { promisify } from 'util';
   
   const execAsync = promisify(exec);
   
   beforeAll(async () => {
     // 테스트 DB 초기화
     await execAsync('prisma migrate reset --force');
   });
   
   afterAll(async () => {
     // 테스트 종료
   });
   ```

4. **커버리지 목표 설정**
   ```json
   // package.json
   {
     "scripts": {
       "test": "vitest run",
       "test:coverage": "vitest run --coverage",
       "test:watch": "vitest"
     }
   }
   ```
   - 목표: 첫 3개월 안에 70%+ 커버리지 달성

### 우선순위: **높음**
- 영향: 모든 API 및 라이브러리
- 효과: 회귀 버그 방지, 리팩토링 신뢰도 향상

---

## 8. 데이터베이스 쿼리 최적화

### 현재 상태
- 인덱스 설정 우수함 (schema.prisma 확인)
- `include/select` 사용 비교적 좋음
- Prisma `$transaction` 사용으로 원자성 보장

### 문제점

#### 8.1 선택적 include의 일관성 부족

```typescript
// projects/route.ts:64-69
const items = await prisma.project.findMany({
  where,
  orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  take: limit + 1,
  include: { _count: { select: { jobs: true, uploads: true } } }, // 카운트만
});

// 응답 시 추가 필드가 조회됨에도 부분만 로드
```

- 응답에 포함되지 않을 수 있는 정보도 조회
- 예: `jobs`와 `uploads` 관계의 실제 레코드는 조회하지 않지만, 카운트는 함

#### 8.2 대량 조회 시 메모리 문제

```typescript
// comments/route.ts:25-35
const comments = await prisma.comment.findMany({
  where: { jobId, organizationId: user.organizationId, parentId: null, deletedAt: null },
  orderBy: { createdAt: "asc" },
  include: {
    replies: {
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
      take: 100, // 각 댓글당 최대 100개 답글
    },
  },
});
```

- 게시물 1개당 댓글 50개 × 답글 100개 = 5,000개 레코드 메모리 로드
- 페이지네이션 없음

#### 8.3 COUNT 쿼리 최적화 부족

```typescript
// projects/route.ts:112-115
const [plan, projectCount] = await Promise.all([
  getOrgPlan(user.organizationId),
  prisma.project.count({ where: { organizationId: user.organizationId, status: "active" } }),
]);
```

- 최대 프로젝트 수 확인 후 `findMany` 실행
- WHERE 절이 겹치는 쿼리 2번

#### 8.4 Cursor Pagination 복잡성

```typescript
// projects/route.ts:54-61
...(cursorDate && cursorId
  ? {
      OR: [
        { createdAt: { lt: cursorDate } },
        { createdAt: cursorDate, id: { lt: cursorId } },
      ],
    }
  : {}),
```

- 깨이블 페이지네이션(keyset pagination) 사용으로 버그 위험
- 같은 `createdAt`을 가진 두 항목이 있을 때 순서 보장 필요

#### 8.5 트랜잭션 데드락 위험

```typescript
// invitations/accept/route.ts:58-84
await prisma.$transaction(async (tx) => {
  await tx.organizationMembership.create({...});
  await tx.user.update({...});
  const oldMemberCount = await tx.organizationMembership.count({...});
  if (oldMemberCount === 1) {
    await tx.organization.delete({...}); // 순환 참조 가능성
  }
  await tx.invitation.update({...});
});
```

- 조직 삭제 시 cascade 삭제와의 상호작용
- 동시 초대 수락 시 race condition 가능

### 개선 제안

1. **선택적 필드 로드 자동화**
   ```typescript
   // src/lib/db/select-builder.ts
   export function buildSelect<T extends Record<string, any>>(
     baseFields: (keyof T)[],
     optionalFields?: (keyof T)[]
   ) {
     return Object.fromEntries(
       [...baseFields, ...(optionalFields || [])].map(f => [f, true])
     );
   }
   
   // 사용
   const projects = await prisma.project.findMany({
     where,
     select: buildSelect(['id', 'name', 'status'], ['_count']),
   });
   ```

2. **대량 조회 페이지네이션**
   ```typescript
   // comments/route.ts 개선
   const comments = await prisma.comment.findMany({
     where: {..., parentId: null, deletedAt: null},
     orderBy: {createdAt: "asc"},
     take: 20, // 댓글 페이지네이션
   });
   
   // 각 댓글의 답글은 별도 쿼리
   const replies = await prisma.comment.findMany({
     where: {..., parentId: { in: comments.map(c => c.id) }},
     take: 100, // 배치 로드
   });
   ```

3. **COUNT 쿼리 통합**
   ```typescript
   // 단일 쿼리로 최대값 확인
   const [activeProjects, limits] = await Promise.all([
     prisma.project.findMany({
       where: {organizationId, status: "active"},
       select: {id: true},
       take: limits.projectsMax + 1, // 한계치 확인
     }),
     getOrgPlan(organizationId),
   ]);
   
   if (activeProjects.length >= limits.projectsMax) {
     return NextResponse.json({error: "한계 초과"}, {status: 403});
   }
   ```

4. **Keyset Pagination 안전성**
   ```typescript
   // src/lib/db/keyset-pagination.ts
   export interface KeysetPaginationParams<T> {
     items: T[];
     limit: number;
     cursor?: string;
     orderBy: Array<[keyof T, 'asc' | 'desc']>;
   }
   
   export function buildKeysetWhereClause<T>(
     cursor: string | undefined,
     orderBy: Array<[keyof T, 'asc' | 'desc']>
   ): object {
     if (!cursor) return {};
     
     const [key, value] = cursor.split(':');
     // 안전한 파싱 및 필터 생성
   }
   ```

5. **트랜잭션 안전성**
   ```typescript
   // invitations/accept/route.ts 개선
   // 1. Lock 사용
   await prisma.$transaction(async (tx) => {
     const invitation = await tx.invitation.findUnique({
       where: {id},
       select: {id: true, ...}
     });
     
     if (!invitation) throw new NotFoundError();
     
     // 다른 업데이트들...
   });
   
   // 2. 삭제 대신 soft-delete
   // 조직 cascade 삭제 대신 status='deleted'
   ```

### 우선순위: **중간**
- 영향: 대량 데이터 처리, 동시 요청 처리
- 효과: DB 부하 30-50% 감소, 메모리 사용량 개선

---

## 9. 의존성 관리

### 현재 상태
- 주요 패키지 모두 최신 버전 (2026년 3월 기준)
- 보안 관련 패키지 정기적으로 업데이트
- 예: Prisma `^6.19.2`, Next.js `16.2.1`

### 문제점

#### 9.1 미사용 의존성

```json
{
  "dependencies": {
    "zod": "^4.3.6" // package.json에는 있지만 코드에서 import 안 됨
  }
}
```
- Zod가 설치되어 있으면서 사용 안 됨
- 향후 입력 검증에 사용할 계획이었을 가능성

#### 9.2 호환성 문제 가능성

```json
{
  "dependencies": {
    "@types/react": "^19",        // React 19
    "react": "19.2.4",
    "@types/react-dom": "^19",
    "react-dom": "19.2.4"
  }
}
```
- React 19는 아직 비교적 새로운 버전
- 에코시스템 라이브러리들의 호환성 확인 필요

#### 9.3 버전 레인지 느슨함

```json
{
  "dependencies": {
    "@base-ui/react": "^1.3.0",  // 1.3.0 ~ 2.0.0 (실제로는 1.x)
    "next": "16.2.1",            // 16.2.1 ~ 16.x.x
    "openai": "^6.32.0"           // 6.32.0 ~ 6.x.x
  }
}
```
- `^` 레인지로 메이저 버전 변경 가능
- CI/CD 환경에서 빌드 성공 여부가 달라질 수 있음

#### 9.4 보안 감시 부재

- `npm audit` 또는 `snyk` 같은 보안 도구 설정 없음
- 의존성의 취약점 자동 감지 불가

### 개선 제안

1. **불필요한 의존성 제거**
   ```bash
   npm ls zod  # 현재 사용 확인
   npm prune   # 미사용 의존성 정리
   ```

2. **버전 잠금 정책**
   ```json
   {
     "dependencies": {
       "next": "16.2.1",      // 대신 정확한 버전으로
       "react": "19.2.4"
     }
   }
   
   // 또는 .npmrc에서
   "save-exact": true
   ```

3. **의존성 감시 자동화**
   ```json
   {
     "scripts": {
       "audit": "npm audit --production",
       "audit:fix": "npm audit fix"
     }
   }
   ```
   - GitHub Actions에서 정기적으로 실행

4. **대형 라이브러리 분석**
   ```
   번들 사이즈 상위:
   - mammoth (500KB): Word/DOCX 파싱
   - exceljs (300KB): Excel 생성
   - pdf-parse (200KB): PDF 파싱
   
   개선: 서버리스 함수 크기 제한 확인
   ```

### 우선순위: **낮음**
- 영향: 배포 안정성, 보안 감시
- 효과: 예측 불가능한 버그 감소

---

## 10. 환경 설정 관리

### 현재 상태
- `.env`, `.env.local`, `.env.production` 파일 존재
- `.env.example` 제공
- `process.env` 사용으로 런타임 설정

### 문제점

#### 10.1 필수 환경 변수 검증 부족

```typescript
// billing/credits/purchase/route.ts:39
const origin = request.headers.get("origin") ?? 
               process.env.NEXT_PUBLIC_APP_URL ?? 
               "http://localhost:3000";
```

- `process.env.NEXT_PUBLIC_APP_URL` 누락 시 `localhost`로 fallback
- 프로덕션에서도 동작하므로 버그 감지 안 됨

```typescript
// webhooks/stripe/route.ts:72-74
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) {
  return NextResponse.json({error: "웹훅 시크릿이 설정되지 않았습니다."}, {status: 503});
}
```

- 요청 시점에 검증 (부트스트랩 시점 아님)
- 모든 요청에서 체크 필요

#### 10.2 환경 변수 타입 안전성 부족

```typescript
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(...) : null;
```

- `STRIPE_SECRET_KEY` 타입이 `string | undefined`
- null 체크 필수

#### 10.3 설정 로직 분산

```typescript
// 여러 파일에서 환경 변수 직접 접근
// billing/stripe.ts
// agent/integrations 등
```

- 중앙화된 설정 모듈 없음
- 설정 변경 시 여러 파일 수정 필요

### 개선 제안

1. **환경 변수 검증 및 타입화**
   ```typescript
   // src/lib/config/env.ts
   import { z } from 'zod';
   
   const envSchema = z.object({
     // 필수
     DATABASE_URL: z.string().url(),
     DIRECT_URL: z.string().url(),
     NEXT_PUBLIC_APP_URL: z.string().url(),
     
     // 선택
     STRIPE_SECRET_KEY: z.string().optional(),
     STRIPE_WEBHOOK_SECRET: z.string().optional(),
     OPENAI_API_KEY: z.string().optional(),
   });
   
   const env = envSchema.parse(process.env);
   export default env;
   
   // 부트스트랩 시점에 검증
   if (!env.DATABASE_URL) {
     throw new Error('DATABASE_URL is required');
   }
   ```

2. **중앙 설정 모듈**
   ```typescript
   // src/lib/config/index.ts
   import env from './env';
   
   export const config = {
     app: {
       url: env.NEXT_PUBLIC_APP_URL,
       environment: process.env.NODE_ENV,
     },
     database: {
       url: env.DATABASE_URL,
       directUrl: env.DIRECT_URL,
     },
     services: {
       stripe: env.STRIPE_SECRET_KEY ? {
         secretKey: env.STRIPE_SECRET_KEY,
         webhookSecret: env.STRIPE_WEBHOOK_SECRET,
       } : null,
       openai: env.OPENAI_API_KEY ? {
         apiKey: env.OPENAI_API_KEY,
       } : null,
     },
   };
   
   // 사용
   import { config } from '@/lib/config';
   const stripe = config.services.stripe?.secretKey;
   ```

3. **부트스트랩 검증**
   ```typescript
   // src/lib/bootstrap.ts
   export async function validateEnvironment() {
     const errors: string[] = [];
     
     if (process.env.NODE_ENV === 'production') {
       if (!process.env.DATABASE_URL) errors.push('DATABASE_URL required in production');
       if (!process.env.STRIPE_SECRET_KEY) errors.push('STRIPE_SECRET_KEY required');
     }
     
     if (errors.length > 0) {
       console.error('Environment validation failed:');
       errors.forEach(e => console.error(`  - ${e}`));
       process.exit(1);
     }
   }
   
   // app.ts 또는 next.config.js에서 호출
   await validateEnvironment();
   ```

### 우선순위: **중간**
- 영향: 배포 안정성, 설정 오류 방지
- 효과: 환경 설정 오류로 인한 장애 예방

---

## 11. 로깅/모니터링

### 현재 상태
- 기본 `console.error()` 사용
- 활동 로그 시스템 (activity.ts)
- 구조화된 로깅 없음

### 문제점

#### 11.1 구조화되지 않은 로깅

```typescript
console.error("프로젝트 목록 조회 오류:", error);
console.error("코멘트 생성 오류:", error);
console.error("로그 전송 오류:", error);
```

- 구조화되지 않은 문자열
- 검색/필터링 불가능
- 에러 분류 불가능

#### 11.2 에러 추적 부재

- Sentry, DataDog, New Relic 같은 APM 도구 미사용
- 스택 트레이스, 사용자 정보, 요청 컨텍스트 수집 없음
- 프로덕션 버그 추적 어려움

#### 11.3 성능 모니터링 없음

- API 응답 시간 측정 없음
- 느린 쿼리 감지 불가능
- 병목 지점 파악 어려움

#### 11.4 활동 로그의 용도 제한

```typescript
// lib/activity/log-activity.ts
export function logActivity(params: {...}): void {
  prisma.activityLog.create({...})
    .catch(console.error); // fire-and-forget
}
```

- 활동 로깅 실패 시 재시도 없음
- 감시 목적으로만 사용 (디버깅 어려움)

### 개선 제안

1. **구조화된 로거 구현**
   ```typescript
   // src/lib/logging/logger.ts
   export interface LogContext {
     userId?: string;
     organizationId?: string;
     requestId?: string;
     [key: string]: any;
   }
   
   export const logger = {
     info(message: string, data?: LogContext) {
       console.log(JSON.stringify({
         level: 'INFO',
         timestamp: new Date().toISOString(),
         message,
         ...data,
       }));
     },
     
     error(message: string, error: Error, data?: LogContext) {
       console.error(JSON.stringify({
         level: 'ERROR',
         timestamp: new Date().toISOString(),
         message,
         error: {
           name: error.name,
           message: error.message,
           stack: error.stack,
         },
         ...data,
       }));
     },
     
     warn(message: string, data?: LogContext) {
       console.warn(JSON.stringify({
         level: 'WARN',
         timestamp: new Date().toISOString(),
         message,
         ...data,
       }));
     },
   };
   ```

2. **요청 ID 컨텍스트**
   ```typescript
   // src/lib/logging/request-context.ts
   import { AsyncLocalStorage } from 'async_hooks';
   
   const requestContext = new AsyncLocalStorage<{
     requestId: string;
     userId?: string;
     organizationId?: string;
   }>();
   
   export function setRequestContext(context: any) {
     return requestContext.run(context, () => {
       // 비동기 작업 실행
     });
   }
   
   export function getRequestContext() {
     return requestContext.getStore();
   }
   
   // 미들웨어에서 설정
   export async function GET(request: NextRequest) {
     const user = await getCurrentUser(request);
     const requestId = crypto.randomUUID();
     
     return setRequestContext({
       requestId,
       userId: user?.userId,
       organizationId: user?.organizationId,
     }, async () => {
       // 핸들러 로직
     });
   }
   ```

3. **성능 모니터링**
   ```typescript
   // src/lib/logging/perf.ts
   export async function measureAsync<T>(
     name: string,
     fn: () => Promise<T>,
     context?: LogContext
   ): Promise<T> {
     const start = performance.now();
     try {
       const result = await fn();
       const duration = performance.now() - start;
       logger.info(`${name} completed`, { duration, ...context });
       return result;
     } catch (error) {
       const duration = performance.now() - start;
       logger.error(`${name} failed`, error as Error, { duration, ...context });
       throw error;
     }
   }
   
   // 사용
   const comments = await measureAsync(
     'fetch_comments',
     () => prisma.comment.findMany({...}),
     { jobId, organizationId: user.organizationId }
   );
   ```

4. **Sentry 통합** (선택)
   ```typescript
   // src/lib/logging/sentry.ts
   import * as Sentry from "@sentry/nextjs";
   
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 0.1,
   });
   
   // API 라우트에서
   try {
     // ...
   } catch (error) {
     Sentry.captureException(error, {
       contexts: {
         user: { userId, organizationId },
         request: { method, url },
       },
     });
   }
   ```

### 우선순위: **중간**
- 영향: 디버깅, 모니터링, 성능 추적
- 효과: 버그 해결 시간 30-50% 단축

---

## 12. 코드 구조/모듈화

### 현재 상태
- Well-organized `lib/` 디렉토리 (3,785줄)
- 기능별 폴더 분류 우수
- 관심사 분리(SoC) 잘 구현됨

```
src/lib/
├── api/              (생성, 에러 처리)
├── activity/         (활동 로깅)
├── auth/             (인증, 사용자)
├── billing/          (결제, 크레딧)
├── cache/            (TTL 캐시)
├── diagrams/         (다이어그램)
├── email/            (이메일)
├── excel/            (Excel 생성)
├── flyio/            (Fly.io 통합)
├── mermaid/          (Mermaid 정리)
├── openai/           (OpenAI 통합)
├── parsers/          (문서 파싱)
├── sse/              (SSE 스트리밍)
├── supabase/         (Supabase)
├── text/             (텍스트 처리)
├── webhooks/         (웹훅)
└── utils/            (유틸리티)
```

### 문제점

#### 12.1 순환 참조 가능성

```typescript
// lib/auth/get-current-user.ts
import { prisma } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// lib/supabase/server.ts (추정)
// → "@/lib/db" 또는 다른 auth 함수 참조?
```

- 의존성 그래프가 명확하지 않음
- 특히 `auth`와 `supabase` 사이에 순환 참조 위험

#### 12.2 유틸리티 폴더 과도
```
src/lib/utils/
├── *.ts files
```
- `utils` 폴더 구조 불명확
- 여러 카테고리의 함수가 섞여있을 가능성

#### 12.3 타입 정의 분산

```typescript
// src/types/
├── agent.ts
├── activity.ts
├── comment.ts
├── diagram.ts
├── document.ts
├── enums.ts
├── spec-improve.ts
├── sse.ts
├── test-case.ts
```

- 타입이 전역 `types/` 폴더에 분산
- 도메인별 타입 정의로 개선 가능

#### 12.4 패키지 규모

```
src/app/api/
└── 74개 라우트 (각 디렉토리별 route.ts)

src/lib/
└── 20+ 서브디렉토리
└── 3,785줄 코드
```

- API 라우트 개수가 많음
- 향후 마이크로서비스 분리 시 고려 사항

### 개선 제안

1. **의존성 그래프 명확화**
   ```typescript
   // src/lib/deps.txt (의존성 문서화)
   
   // 레이어 1: 기초 (외부 의존성만)
   db/                 → prisma만
   cache/              → 없음 (자체 구현)
   
   // 레이어 2: 인프라
   auth/               → db, supabase, cache
   supabase/           → 없음 (외부 라이브러리만)
   
   // 레이어 3: 비즈니스 로직
   api/                → db, auth, activity
   activity/           → db, webhooks
   billing/            → db, stripe, auth
   
   // 레이어 4: 도메인
   diagrams/           → openai, lib/*
   agent/              → db, auth, lib/*
   ```

2. **도메인별 타입 정의**
   ```typescript
   // src/lib/diagrams/types.ts
   export interface DiagramVersion {
     id: string;
     jobId: string;
     title: string;
     mermaidCode: string;
   }
   
   // src/lib/agent/types.ts
   export interface AgentTask {
     id: string;
     status: AgentTaskStatus;
   }
   
   // src/types/index.ts (re-export만)
   export * from '@/lib/diagrams/types';
   export * from '@/lib/agent/types';
   ```

3. **API 라우트 구조 개선**
   ```typescript
   // 현재
   src/app/api/projects/[id]/route.ts
   src/app/api/projects/[id]/archive/route.ts
   
   // 개선안: 핸들러 분리
   src/app/api/projects/[id]/route.ts
   src/app/api/projects/handlers.ts
   
   // handlers.ts
   export async function handleGetProject(id: string, user: AuthUser) {...}
   export async function handleArchiveProject(id: string, user: AuthUser) {...}
   ```

4. **Monorepo 고려** (향후)
   ```
   packages/
   ├── api/              (API 서버)
   ├── core/             (공유 라이브러리)
   ├── types/            (공유 타입)
   ├── agent-cli/        (에이전트 CLI)
   └── figma-plugin/     (Figma 플러그인)
   ```

### 우선성: **낮음**
- 영향: 코드 유지보수, 확장성
- 효과: 신규 개발자 온보딩 시간 단축

---

## 종합 개선 우선순위

| 순위 | 항목 | 우선순위 | 영향 범위 | 예상 노력 |
|------|------|----------|---------|---------|
| 1 | 에러 처리 전략 | 높음 | 모든 라우트 (74개) | 중간 |
| 2 | API 라우트 패턴 일관성 | 높음 | 모든 라우트 (74개) | 높음 |
| 3 | 타입 안전성 (Zod) | 높음 | 모든 라우트 (74개) | 높음 |
| 4 | 테스트 커버리지 | 높음 | 모든 API + 라이브러리 | 높음 |
| 5 | 보안 취약점 | 높음 | 모든 라우트 (74개) | 중간 |
| 6 | 코드 중복 제거 | 중간 | 30+ 라우트 | 중간 |
| 7 | 성능 이슈 | 중간 | DB 쿼리, SSE 폴링 | 중간 |
| 8 | DB 쿼리 최적화 | 중간 | 대량 조회 시나리오 | 낮음 |
| 9 | 로깅/모니터링 | 중간 | 디버깅 및 모니터링 | 중간 |
| 10 | 환경 설정 관리 | 중간 | 배포 안정성 | 낮음 |
| 11 | 의존성 관리 | 낮음 | 전체 프로젝트 | 낮음 |
| 12 | 코드 구조/모듈화 | 낮음 | 구조적 개선 | 낮음 |

---

## 실행 로드맵 (권장)

### Phase 1: 긴급 (1-2주)
1. **보안 취약점 수정**
   - 입력 검증 강화 (Zod 도입)
   - JSON.parse 안전성
   - 에러 응답 일관화

2. **에러 처리 개선**
   - ApiError 클래스 정의
   - 중앙화된 에러 핸들러
   - Prisma 에러 맵핑

### Phase 2: 안정성 (2-4주)
3. **테스트 기초 구축**
   - API 라우트 테스트 기본 설정
   - 핵심 기능 단위 테스트 (auth, billing, rate-limit)
   - CI/CD 통합

4. **코드 중복 제거**
   - 인증 체크 헬퍼
   - 응답 변환기
   - 제한 정책 추상화

### Phase 3: 성능 (1개월)
5. **DB 쿼리 최적화**
   - N+1 쿼리 제거
   - 페이지네이션 개선
   - 캐시 정책 재검토

6. **로깅/모니터링**
   - 구조화된 로거
   - 요청 ID 추적
   - 성능 메트릭 수집

### Phase 4: 확장성 (2개월+)
7. **구조 개선**
   - API 라우트 핸들러 분리
   - 도메인별 타입 정의
   - 의존성 그래프 명확화

---

## 결론

FireQA는 다음과 같은 **강점**을 보유하고 있습니다:
- ✅ 명확한 폴더 구조와 관심사 분리
- ✅ 기본 인증/인가 체크 일관성
- ✅ 일부 성능 최적화 (캐시, Prisma 쿼리)
- ✅ 데이터베이스 스키마 설계 우수

동시에 다음과 같은 **개선 필요 영역**이 있습니다:
- ❌ 입력 검증 미흡 (Zod 미사용)
- ❌ 에러 처리 일관성 부족
- ❌ 테스트 커버리지 거의 없음
- ❌ 구조화된 로깅 부재
- ❌ 보안 검증 부분적 (timing attack 등)

**우선 1-2주 내에 보안과 에러 처리를 개선**하고, **2-4주 차에 테스트와 코드 중복 제거**를 완료하면 코드 품질이 크게 향상될 것으로 예상합니다.

