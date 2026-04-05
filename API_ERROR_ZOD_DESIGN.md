# FireQA API 에러 처리 + Zod 검증 시스템 설계

**작성일**: 2026-04-04  
**상태**: 설계 (구현 대기)  
**범위**: 74개 API 라우트의 표준화된 에러 처리 및 입력 검증

---

## 0. 현황 분석

### 0.1 기존 패턴의 문제점

#### (1) 상태 코드 미분화
```typescript
// 모든 예외가 500으로 반환됨
return NextResponse.json({ error: "목록 조회에 실패했습니다." }, { status: 500 });
```
- 클라이언트가 재시도 가능한 오류 vs 사용자 입력 오류를 구분 불가
- 에러 로깅이 모두 같은 심각도로 처리됨

#### (2) 입력 검증 부재
```typescript
const body = await request.json();
const { name, description } = body as { name?: string; description?: string };
// ← 타입 단언만으로 검증 없음
```

#### (3) 인증/권한 체크 중복
```typescript
// 모든 라우트에서 반복
const user = await getCurrentUser(request);
if (!user) {
  return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
}
```

#### (4) 응답 형식 불일치
```typescript
// 라우트마다 다른 형식
{ error: "message" }                      // projects/route.ts
{ error: "message", detail: "info" }      // error-response.ts
{ task: null }                            // agent/tasks/next/route.ts
```

---

## 1. ApiError 클래스 설계

### 1.1 에러 코드 열거형

```typescript
// src/lib/api/api-error-codes.ts

export const ApiErrorCode = {
  // 인증 & 권한 (4xx)
  UNAUTHORIZED: "UNAUTHORIZED",              // 401: 인증 필요
  FORBIDDEN: "FORBIDDEN",                    // 403: 권한 부족
  INVALID_TOKEN: "INVALID_TOKEN",            // 401: 토큰 유효하지 않음
  TOKEN_EXPIRED: "TOKEN_EXPIRED",            // 401: 토큰 만료
  
  // 검증 오류 (422)
  VALIDATION_ERROR: "VALIDATION_ERROR",      // 422: 입력 검증 실패
  INVALID_REQUEST: "INVALID_REQUEST",        // 400: 요청 형식 오류
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD", // 400
  INVALID_PARAMETER: "INVALID_PARAMETER",    // 400: 쿼리/경로 파라미터
  
  // 비즈니스 로직 오류 (4xx)
  NOT_FOUND: "NOT_FOUND",                    // 404: 리소스 없음
  CONFLICT: "CONFLICT",                      // 409: 리소스 중복/상태 충돌
  GONE: "GONE",                              // 410: 리소스 삭제됨
  UNPROCESSABLE: "UNPROCESSABLE",            // 422: 처리 불가 (비즈니스 제약)
  RATE_LIMITED: "RATE_LIMITED",              // 429: 요청 한도 초과
  INSUFFICIENT_CREDITS: "INSUFFICIENT_CREDITS", // 402: 크레딧 부족
  PLAN_LIMIT_EXCEEDED: "PLAN_LIMIT_EXCEEDED", // 403: 플랜 한도 도달
  RESOURCE_LOCKED: "RESOURCE_LOCKED",        // 423: 리소스 잠김
  
  // 의존성 오류 (5xx)
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE", // 503: 외부 서비스 오류
  PAYMENT_PROVIDER_ERROR: "PAYMENT_PROVIDER_ERROR", // 503: Stripe/결제 오류
  DATABASE_ERROR: "DATABASE_ERROR",          // 500: DB 오류
  
  // 일반 오류 (5xx)
  INTERNAL_ERROR: "INTERNAL_ERROR",          // 500: 서버 오류 (상세 정보 로깅됨)
} as const;

export type ApiErrorCode = typeof ApiErrorCode[keyof typeof ApiErrorCode];
```

### 1.2 ApiError 클래스

```typescript
// src/lib/api/api-error.ts

import { ApiErrorCode } from "./api-error-codes";
import { ZodError } from "zod";

export type ApiErrorOptions = {
  code: ApiErrorCode;
  message: string;              // 사용자 친화적 메시지
  detail?: string;              // 기술적 상세 (개발 시에만 노출)
  context?: Record<string, any>; // 추가 메타데이터 (로깅용)
  cause?: Error;                // 원본 에러 (스택 트레이스)
};

const ERROR_STATUS_MAP: Record<ApiErrorCode, number> = {
  [ApiErrorCode.UNAUTHORIZED]: 401,
  [ApiErrorCode.INVALID_TOKEN]: 401,
  [ApiErrorCode.TOKEN_EXPIRED]: 401,
  [ApiErrorCode.FORBIDDEN]: 403,
  [ApiErrorCode.PLAN_LIMIT_EXCEEDED]: 403,
  
  [ApiErrorCode.INVALID_REQUEST]: 400,
  [ApiErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ApiErrorCode.INVALID_PARAMETER]: 400,
  
  [ApiErrorCode.VALIDATION_ERROR]: 422,
  [ApiErrorCode.UNPROCESSABLE]: 422,
  
  [ApiErrorCode.NOT_FOUND]: 404,
  [ApiErrorCode.GONE]: 410,
  
  [ApiErrorCode.CONFLICT]: 409,
  [ApiErrorCode.RESOURCE_LOCKED]: 423,
  
  [ApiErrorCode.INSUFFICIENT_CREDITS]: 402,
  
  [ApiErrorCode.RATE_LIMITED]: 429,
  
  [ApiErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ApiErrorCode.PAYMENT_PROVIDER_ERROR]: 503,
  
  [ApiErrorCode.DATABASE_ERROR]: 500,
  [ApiErrorCode.INTERNAL_ERROR]: 500,
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly statusCode: number;
  readonly detail?: string;
  readonly context: Record<string, any>;
  readonly cause?: Error;

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = "ApiError";
    this.code = options.code;
    this.statusCode = ERROR_STATUS_MAP[options.code];
    this.detail = options.detail;
    this.context = options.context || {};
    this.cause = options.cause;
  }

  /**
   * 자주 사용되는 에러의 정적 팩토리 메서드
   */
  static unauthorized(detail?: string): ApiError {
    return new ApiError({
      code: ApiErrorCode.UNAUTHORIZED,
      message: "인증이 필요합니다.",
      detail,
    });
  }

  static forbidden(detail?: string): ApiError {
    return new ApiError({
      code: ApiErrorCode.FORBIDDEN,
      message: "이 작업을 수행할 권한이 없습니다.",
      detail,
    });
  }

  static notFound(resource: string, detail?: string): ApiError {
    return new ApiError({
      code: ApiErrorCode.NOT_FOUND,
      message: `${resource}를 찾을 수 없습니다.`,
      detail,
    });
  }

  static validationError(message: string, context?: Record<string, any>): ApiError {
    return new ApiError({
      code: ApiErrorCode.VALIDATION_ERROR,
      message,
      context,
    });
  }

  static conflict(resource: string, detail?: string): ApiError {
    return new ApiError({
      code: ApiErrorCode.CONFLICT,
      message: `${resource}가 이미 존재하거나 상태가 맞지 않습니다.`,
      detail,
    });
  }

  static rateLimited(resetAt?: Date): ApiError {
    const msg = resetAt ? `요청 한도를 초과했습니다. ${resetAt.toISOString()} 이후 다시 시도하세요.` : "요청 한도를 초과했습니다.";
    return new ApiError({
      code: ApiErrorCode.RATE_LIMITED,
      message: msg,
      context: resetAt ? { resetAt } : {},
    });
  }

  static insufficientCredits(required: number, available: number): ApiError {
    return new ApiError({
      code: ApiErrorCode.INSUFFICIENT_CREDITS,
      message: `크레딧이 부족합니다. (필요: ${required}, 보유: ${available})`,
      context: { required, available },
    });
  }

  static planLimitExceeded(resource: string, limit: number): ApiError {
    return new ApiError({
      code: ApiErrorCode.PLAN_LIMIT_EXCEEDED,
      message: `${resource} 한도(${limit}개)에 도달했습니다. 플랜을 업그레이드하세요.`,
      context: { resource, limit },
    });
  }

  static internalError(cause?: Error, context?: Record<string, any>): ApiError {
    return new ApiError({
      code: ApiErrorCode.INTERNAL_ERROR,
      message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      detail: cause?.message,
      context,
      cause,
    });
  }

  static fromZodError(zodError: ZodError): ApiError {
    const fieldErrors = zodError.flatten().fieldErrors;
    const firstError = Object.entries(fieldErrors)[0];
    const field = firstError?.[0];
    const messages = firstError?.[1] || [];
    
    return new ApiError({
      code: ApiErrorCode.VALIDATION_ERROR,
      message: "입력 검증 실패",
      context: {
        field,
        errors: fieldErrors,
      },
    });
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      // detail은 개발 환경에서만 포함 (프로덕션에서는 제거)
      ...(process.env.NODE_ENV === "development" && this.detail && { detail: this.detail }),
      ...(Object.keys(this.context).length > 0 && { context: this.context }),
    };
  }
}
```

---

## 2. withApiHandler 래퍼 함수 설계

### 2.1 핸들러 타입 정의

```typescript
// src/lib/api/with-api-handler.ts

import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "./api-error";
import { ApiErrorCode } from "./api-error-codes";
import { AuthUser } from "@/lib/auth/get-current-user";
import { ZodSchema } from "zod";

/**
 * API 핸들러 함수의 타입
 * 
 * withApiHandler는 이 타입의 핸들러를 입력받아서:
 * 1. 공통 전처리 (인증, 입력 검증)
 * 2. 사용자 로직 실행
 * 3. 공통 후처리 (에러 처리, 응답 표준화)
 * 을 수행한다.
 */
export type ApiHandlerFunction<
  TRequest = unknown,
  TResponse = unknown,
> = (params: {
  request: NextRequest;
  user: AuthUser | null;      // requireAuth=true인 경우 항상 AuthUser
  body: TRequest;             // POST/PUT/PATCH에서 검증된 body
  query: Record<string, string | string[]>; // 쿼리 파라미터
  params: Record<string, string>; // 동적 라우트 파라미터 (수동 주입)
}) => Promise<TResponse | ApiError>;

export type ApiHandlerOptions<TRequest = unknown> = {
  // 인증 & 권한
  requireAuth?: boolean;                    // false: 인증 없이도 접근 가능
  requireOrganization?: boolean;            // 기본값: true (requireAuth=true인 경우)
  minRole?: string;                         // "admin", "owner" 등 최소 권한 지정
  
  // 입력 검증
  bodySchema?: ZodSchema;                   // POST/PUT/PATCH 바디 검증
  querySchema?: ZodSchema;                  // 쿼리 파라미터 검증
  paramsSchema?: ZodSchema;                 // 동적 경로 파라미터 검증 (route.ts 외부 주입)
  
  // 기타
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  skipContentType?: boolean;                // multipart/form-data 등 특수 형식
};

export type ApiResponse<T = any> = {
  statusCode: number;
  body: T;
  headers?: Record<string, string>;
};
```

### 2.2 withApiHandler 구현

```typescript
// src/lib/api/with-api-handler.ts (계속)

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { requireRole, hasRole } from "@/lib/auth/require-role";
import { logActivity } from "@/lib/activity/log-activity";
import { ActivityAction } from "@/types/enums";

/**
 * API 라우트 핸들러를 래핑하여 공통 처리를 제공한다:
 * - 인증 확인
 * - 권한 검증
 * - 입력 검증 (Zod)
 * - 에러 처리
 * - 응답 표준화
 * - 로깅
 * 
 * 사용 예시:
 * ```typescript
 * const handler = withApiHandler(
 *   async ({ user, body }) => {
 *     // user는 항상 AuthUser (requireAuth: true라서)
 *     const project = await prisma.project.create(...);
 *     return { id: project.id, name: project.name }; // 자동으로 200 + JSON 응답
 *   },
 *   {
 *     requireAuth: true,
 *     method: "POST",
 *     bodySchema: createProjectSchema,
 *   }
 * );
 * 
 * export const POST = handler;
 * ```
 */
export function withApiHandler<TRequest = unknown, TResponse = unknown>(
  handler: ApiHandlerFunction<TRequest, TResponse>,
  options: ApiHandlerOptions<TRequest> = {}
) {
  const {
    requireAuth = true,
    requireOrganization = true,
    minRole,
    bodySchema,
    querySchema,
    paramsSchema,
    skipContentType = false,
  } = options;

  return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
    try {
      // ─────────────────────────────────────────
      // 1. 인증 확인
      // ─────────────────────────────────────────
      let user = await getCurrentUser(request);

      if (requireAuth && !user) {
        throw ApiError.unauthorized();
      }

      // ─────────────────────────────────────────
      // 2. 권한 검증
      // ─────────────────────────────────────────
      if (minRole && user) {
        const hasPermission = hasRole(user.role, minRole);
        if (!hasPermission) {
          throw ApiError.forbidden(`최소 권한: ${minRole}`);
        }
      }

      // ─────────────────────────────────────────
      // 3. 요청 바디 파싱 & 검증
      // ─────────────────────────────────────────
      let body: TRequest = {} as TRequest;

      if (bodySchema) {
        try {
          const json = await request.json();
          const result = bodySchema.safeParse(json);
          
          if (!result.success) {
            throw ApiError.fromZodError(result.error);
          }
          
          body = result.data as TRequest;
        } catch (err) {
          if (err instanceof ApiError) throw err;
          if (err instanceof SyntaxError) {
            throw new ApiError({
              code: ApiErrorCode.INVALID_REQUEST,
              message: "요청 바디가 유효한 JSON이 아닙니다.",
            });
          }
          throw err;
        }
      }

      // ─────────────────────────────────────────
      // 4. 쿼리 파라미터 검증
      // ─────────────────────────────────────────
      let query: Record<string, string | string[]> = {};
      
      if (querySchema) {
        const queryObj = Object.fromEntries(request.nextUrl.searchParams.entries());
        const result = querySchema.safeParse(queryObj);
        
        if (!result.success) {
          throw ApiError.fromZodError(result.error);
        }
        
        query = result.data;
      } else {
        // 스키마 없어도 searchParams 제공
        query = Object.fromEntries(request.nextUrl.searchParams.entries());
      }

      // ─────────────────────────────────────────
      // 5. 경로 파라미터 검증 (선택)
      // ─────────────────────────────────────────
      let params: Record<string, string> = context?.params || {};
      
      if (paramsSchema) {
        const result = paramsSchema.safeParse(params);
        if (!result.success) {
          throw ApiError.fromZodError(result.error);
        }
        params = result.data;
      }

      // ─────────────────────────────────────────
      // 6. 핸들러 실행
      // ─────────────────────────────────────────
      const result = await handler({
        request,
        user,
        body,
        query,
        params,
      });

      // 핸들러가 ApiError를 반환하는 경우 (에러 처리 내부에서)
      if (result instanceof ApiError) {
        return handleApiError(result, request);
      }

      // ─────────────────────────────────────────
      // 7. 성공 응답 반환
      // ─────────────────────────────────────────
      return NextResponse.json(result, { status: 200 });

    } catch (err) {
      // ─────────────────────────────────────────
      // 8. 에러 처리
      // ─────────────────────────────────────────
      if (err instanceof ApiError) {
        return handleApiError(err, request);
      }

      // 예상 밖의 에러
      if (err instanceof Error) {
        console.error("[API Unhandled Error]", {
          message: err.message,
          stack: err.stack,
          url: request.url,
        });
      }

      // 항상 500 에러로 응답 (클라이언트에게 상세 정보 노출 금지)
      const internalError = ApiError.internalError(
        err instanceof Error ? err : undefined,
        { url: request.url }
      );
      return handleApiError(internalError, request);
    }
  };
}

function handleApiError(error: ApiError, request: NextRequest): NextResponse {
  const statusCode = error.statusCode;
  const isDev = process.env.NODE_ENV === "development";

  // 500 에러는 별도로 로깅 (팀에서 모니터링)
  if (statusCode >= 500) {
    console.error("[API Server Error]", {
      code: error.code,
      message: error.message,
      url: request.url,
      timestamp: new Date().toISOString(),
      cause: error.cause?.message,
      context: error.context,
    });
  }

  // 4xx는 디버깅 로그만 (클라이언트 오류)
  if (statusCode >= 400 && statusCode < 500 && isDev) {
    console.debug("[API Client Error]", {
      code: error.code,
      message: error.message,
      url: request.url,
    });
  }

  return NextResponse.json(
    error.toJSON(),
    {
      status: statusCode,
      headers: {
        "X-Error-Code": error.code,
      },
    }
  );
}
```

---

## 3. Zod 스키마 구조

### 3.1 디렉토리 구조

```
src/lib/api/schemas/
├── common.ts              # 공통 스키마 (pagination, org, etc.)
├── projects.ts            # 프로젝트 관련
├── comments.ts            # 댓글 관련
├── generation.ts          # 생성 작업 관련
├── billing.ts             # 결제/크레딧 관련
├── agent-tasks.ts         # 에이전트 작업 관련
├── organization.ts        # 조직 관련
└── invitations.ts         # 초대 관련
```

### 3.2 공통 스키마 (예시)

```typescript
// src/lib/api/schemas/common.ts

import { z } from "zod";

// ─── 기본 타입 ───
export const cuidSchema = z.string().cuid();
export const emailSchema = z.string().email("유효한 이메일을 입력해주세요.");
export const urlSchema = z.string().url("유효한 URL을 입력해주세요.");
export const isoDateSchema = z.string().datetime();

// ─── 페이지네이션 ───
export const cursorPaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
});

export const offsetPaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

// ─── 조직 & 권한 ───
export const organizationIdSchema = z.object({
  organizationId: cuidSchema,
});

export const requiredRoleSchema = z.object({
  minRole: z.enum(["member", "admin", "owner"]).optional(),
});

// ─── 소프트 삭제 상태 ───
export const statusSchema = z.enum(["active", "archived", "deleted"]).optional();
```

### 3.3 도메인별 스키마 (예시)

```typescript
// src/lib/api/schemas/projects.ts

import { z } from "zod";

// GET /api/projects
export const getProjectsSchema = z.object({
  status: z.enum(["active", "archived", "deleted"]).optional().default("active"),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
});

export type GetProjectsQuery = z.infer<typeof getProjectsSchema>;

// POST /api/projects
export const createProjectSchema = z.object({
  name: z.string().min(1, "프로젝트 이름은 필수입니다.").max(255),
  description: z.string().max(1000).optional().nullable(),
});

export type CreateProjectBody = z.infer<typeof createProjectSchema>;

// PUT /api/projects/[id]
export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(["active", "archived"]).optional(),
});

export type UpdateProjectBody = z.infer<typeof updateProjectSchema>;

// DELETE /api/projects/[id]
export const deleteProjectParamsSchema = z.object({
  id: z.string().cuid(),
});

export type DeleteProjectParams = z.infer<typeof deleteProjectParamsSchema>;
```

---

## 4. 표준 응답 형식

### 4.1 성공 응답

```typescript
// 단일 리소스
{
  "id": "cuid",
  "name": "string",
  // ... 데이터
  "createdAt": "2026-04-04T00:00:00Z"
}

// 리스트 (커서 페이지네이션)
{
  "items": [
    { "id": "cuid", ... },
    // ...
  ],
  "nextCursor": "2026-04-04T00:00:00Z_cuid" | null
}

// 리스트 (오프셋 페이지네이션)
{
  "items": [...],
  "total": 42,
  "offset": 20,
  "limit": 20
}

// 페이지네이션이 없는 리스트
{
  "items": [...] | "projects": [...]
}

// 상태 업데이트
{
  "success": true,
  "message": "프로젝트가 보관되었습니다."
}
```

### 4.2 에러 응답

```typescript
// 기본 형식
{
  "error": "ERROR_CODE",
  "message": "사용자 친화적 메시지",
  // 개발 환경에서만:
  "detail": "기술적 상세 정보",
  // 필요시:
  "context": {
    "field": "name",
    "errors": { "name": ["too short"] },
    // 또는
    "resetAt": "2026-04-04T00:15:00Z",
    "required": 100,
    "available": 50
  }
}

// 예시 1: 검증 실패
HTTP/1.1 422 Unprocessable Entity

{
  "error": "VALIDATION_ERROR",
  "message": "입력 검증 실패",
  "context": {
    "field": "name",
    "errors": {
      "name": ["프로젝트 이름은 필수입니다."]
    }
  }
}

// 예시 2: 인증 필요
HTTP/1.1 401 Unauthorized

{
  "error": "UNAUTHORIZED",
  "message": "인증이 필요합니다."
}

// 예시 3: 크레딧 부족
HTTP/1.1 402 Payment Required

{
  "error": "INSUFFICIENT_CREDITS",
  "message": "크레딧이 부족합니다. (필요: 100, 보유: 50)",
  "context": {
    "required": 100,
    "available": 50
  }
}

// 예시 4: 서버 에러
HTTP/1.1 500 Internal Server Error

{
  "error": "INTERNAL_ERROR",
  "message": "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
}
```

---

## 5. SSE 스트리밍 라우트의 특수 처리

SSE 라우트 (`/api/generate`, `/api/diagrams` 등)는 상단에서 응답을 시작하므로 일반적인 `withApiHandler` 래핑이 불가능.  
대신 **명시적 처리**:

### 5.1 SSE 핸들러 패턴

```typescript
// src/app/api/generate/route.ts (Before)
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const projectId = formData.get("projectId") as string | null;

  if (!file || (!projectId && !projectName)) {
    return NextResponse.json(
      { error: "파일과 프로젝트 이름이 필요합니다." },
      { status: 400 }
    );
  }
  // ...
}

// ─────────────────────────────────────────────────────

// After: withSseHandler 래퍼 (옵션)
import { withSseHandler, type SseHandlerFunction } from "@/lib/api/with-sse-handler";

const handler: SseHandlerFunction<{ file: File; projectId?: string }> = async ({
  user,
  body: { file, projectId },
  writer,
}) => {
  if (!user) throw ApiError.unauthorized();

  writer.send({ type: "stage", stage: "parsing", progress: 10 });

  const { jobId } = await createGenerationJob(file, projectId, {
    userId: user.userId,
    organizationId: user.organizationId,
  });

  try {
    const result = await generateTestCases(file);
    writer.send({ type: "complete", data: result });
  } catch (err) {
    writer.send({ type: "error", message: err.message });
  }

  writer.close();
};

export const POST = withSseHandler(handler, {
  requireAuth: true,
  bodySchema: generateRequestSchema,
});
```

### 5.2 withSseHandler 구현 스케치

```typescript
// src/lib/api/with-sse-handler.ts

export type SseWriter = {
  send(data: Record<string, any>): void;
  close(): void;
};

export type SseHandlerFunction<TRequest = unknown> = (params: {
  request: NextRequest;
  user: AuthUser | null;
  body: TRequest;
  writer: SseWriter;
}) => Promise<void>;

export function withSseHandler<TRequest = unknown>(
  handler: SseHandlerFunction<TRequest>,
  options: { requireAuth?: boolean; bodySchema?: ZodSchema }
) {
  return async (request: NextRequest) => {
    try {
      const user = await getCurrentUser(request);
      if (options.requireAuth && !user) {
        return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
      }

      const body = options.bodySchema
        ? options.bodySchema.parse(await request.json())
        : {};

      return createSSEStream(async (writer) => {
        await handler({ request, user, body, writer });
      }, request.signal);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(err.toJSON(), { status: err.statusCode });
      }
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "서버 오류" },
        { status: 500 }
      );
    }
  };
}
```

---

## 6. 에러 페이지 설계

### 6.1 루트 레이아웃 에러 페이지

```typescript
// src/app/error.tsx (루트 에러 바운더리)
// 🔴 레이아웃 크래시, Next.js 시스템 에러

"use client";

import { AlertCircle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-red-100 px-4">
      <div className="text-center">
        <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
        <h1 className="text-3xl font-bold mb-2 text-gray-900">오류가 발생했습니다</h1>
        <p className="text-lg text-gray-600 mb-6 max-w-md">
          서비스 이용 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
        </p>
        
        {process.env.NODE_ENV === "development" && (
          <details className="mb-6 p-4 bg-red-100 rounded text-left">
            <summary className="cursor-pointer font-mono text-sm">상세 정보</summary>
            <pre className="mt-2 text-xs overflow-auto">{error.message}</pre>
          </details>
        )}

        <div className="flex gap-4 justify-center">
          <Button onClick={reset} size="lg" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </Button>
          <Link href="/">
            <Button variant="outline" size="lg" className="gap-2">
              <Home className="h-4 w-4" />
              홈으로
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### 6.2 대시보드 그룹 에러 페이지

```typescript
// src/app/(dashboard)/error.tsx
// 🟡 대시보드 내부 에러 (대시보드 레이아웃 유지)

"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
      <h2 className="mb-2 text-xl font-semibold">페이지를 로드할 수 없습니다</h2>
      <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
        {error.message || "알 수 없는 오류가 발생했습니다."}
      </p>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  );
}
```

### 6.3 Not Found 페이지

```typescript
// src/app/not-found.tsx
// 404 페이지

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <h2 className="text-2xl font-semibold mb-4">페이지를 찾을 수 없습니다</h2>
      <p className="mb-8 text-gray-600">요청하신 페이지가 존재하지 않습니다.</p>
      <Link href="/">
        <Button>홈으로 돌아가기</Button>
      </Link>
    </div>
  );
}
```

### 6.4 API 에러 응답 시뮬레이션

```typescript
// 프론트엔드에서 API 에러 처리 (useSWR 등에서)

const { data, error } = useSWR("/api/projects", fetcher);

if (error) {
  const apiError = error.response?.data;
  
  switch (apiError?.error) {
    case "VALIDATION_ERROR":
      return <ValidationErrorDialog errors={apiError.context.errors} />;
    
    case "UNAUTHORIZED":
      return <RedirectToLogin />;
    
    case "INSUFFICIENT_CREDITS":
      return (
        <CreditAlert
          required={apiError.context.required}
          available={apiError.context.available}
        />
      );
    
    case "RATE_LIMITED":
      return (
        <RateLimitAlert resetAt={new Date(apiError.context.resetAt)} />
      );
    
    default:
      return <ErrorFallback error={apiError?.message} />;
  }
}
```

---

## 7. 적용 우선순위 & 마이그레이션 전략

### 7.1 Phase 1: 인프라 구축 (Week 1)
**목표**: 기본 도구 및 유틸 완성

1. `ApiError` 클래스 & 에러 코드 정의
2. `withApiHandler` 래퍼 구현
3. `withSseHandler` 스케치
4. 공통 Zod 스키마 정의
5. 에러 페이지 업데이트

### 7.2 Phase 2: Core API 마이그레이션 (Week 2)
**목표**: 가장 사용빈도 높은 라우트 적용

우선순위 순서:

| 우선 | 라우트 | 이유 | 복잡도 |
|:----:|--------|------|:------:|
| 1 | `projects/route.ts` | 기본 CRUD, 모든 API의 모델 | ⭐ |
| 2 | `comments/route.ts` | 관계 데이터, 비즈니스 로직 | ⭐⭐ |
| 3 | `tasks/route.ts` | 크레딧/권한 검증 | ⭐⭐ |
| 4 | `organizations/route.ts` | 조직 권한 | ⭐⭐ |
| 5 | `agent/tasks/[id]/status/route.ts` | 동적 경로 | ⭐ |
| 6 | `billing/usage/route.ts` | 단순 조회 | ⭐ |

**Phase 2 완료 후**: 6개 라우트로 전체 패턴 검증 완료

### 7.3 Phase 3: 나머지 라우트 마이그레이션 (Week 3)
**목표**: 모든 API 라우트에 적용

- 생성 라우트 그룹 (generate, diagrams, wireframes)
- 결제 라우트 (billing/*)
- 에이전트 라우트 (agent/*)
- 기타 라우트들

### 7.4 Before/After 마이그레이션 예시

#### Before: 프로젝트 생성

```typescript
// src/app/api/projects/route.ts
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body as { name?: string; description?: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: "프로젝트 이름은 필수입니다." }, { status: 400 });
    }

    const [plan, projectCount] = await Promise.all([
      getOrgPlan(user.organizationId),
      prisma.project.count({ where: { organizationId: user.organizationId, status: "active" } }),
    ]);
    const limits = getPlanLimits(plan);
    if (limits.projectsMax !== Infinity && projectCount >= limits.projectsMax) {
      return NextResponse.json(
        { error: `${PLAN_LABEL[plan] ?? plan} 플랜의 프로젝트 한도(${limits.projectsMax}개)에 도달했습니다. 플랜을 업그레이드하세요.` },
        { status: 403 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        organizationId: user.organizationId,
        createdById: user.userId,
      },
    });

    logActivity({ organizationId: user.organizationId, actorId: user.userId, action: ActivityAction.PROJECT_CREATED, projectId: project.id, metadata: { name: project.name } });

    return NextResponse.json(
      {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        createdAt: project.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("프로젝트 생성 오류:", error);
    return NextResponse.json({ error: "프로젝트 생성에 실패했습니다." }, { status: 500 });
  }
}
```

#### After: 프로젝트 생성 (withApiHandler 적용)

```typescript
// src/app/api/projects/route.ts
import { withApiHandler } from "@/lib/api/with-api-handler";
import { createProjectSchema } from "@/lib/api/schemas/projects";
import { getOrgPlan } from "@/lib/billing/get-org-plan";
import { getPlanLimits } from "@/lib/billing/plan-limits";
import { ApiError } from "@/lib/api/api-error";
import { logActivity } from "@/lib/activity/log-activity";
import { ActivityAction } from "@/types/enums";

export const POST = withApiHandler(
  async ({ user, body }) => {
    // user는 항상 AuthUser (requireAuth: true이므로)
    // body는 이미 검증됨

    const [plan, projectCount] = await Promise.all([
      getOrgPlan(user.organizationId),
      prisma.project.count({ where: { organizationId: user.organizationId, status: "active" } }),
    ]);

    const limits = getPlanLimits(plan);
    if (limits.projectsMax !== Infinity && projectCount >= limits.projectsMax) {
      throw ApiError.planLimitExceeded("프로젝트", limits.projectsMax);
    }

    const project = await prisma.project.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        organizationId: user.organizationId,
        createdById: user.userId,
      },
    });

    logActivity({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: ActivityAction.PROJECT_CREATED,
      projectId: project.id,
      metadata: { name: project.name },
    });

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt,
    };
  },
  {
    requireAuth: true,
    method: "POST",
    bodySchema: createProjectSchema,
  }
);
```

**개선 사항**:
- ✅ 인증 체크 자동화 (코드 2줄 → 0줄)
- ✅ 입력 검증 자동화 (수동 if 5줄 → Zod 스키마)
- ✅ 에러 처리 표준화 (상태 코드 자동 결정)
- ✅ 로깅 일관성 (모든 5xx는 자동 로깅)
- ✅ 코드 가독성 향상 (try-catch 제거)

---

## 8. 기존 코드 호환성

### 8.1 점진적 마이그레이션 가능성

`withApiHandler`는 **선택**입니다. 기존 라우트와 새 라우트가 혼재 가능:

```typescript
// 레거시 (그대로 유지)
export async function POST(request: NextRequest) {
  // ...
}

// 신규 (withApiHandler 사용)
export const GET = withApiHandler(
  async ({ user, query }) => {
    // ...
  },
  { requireAuth: true }
);
```

### 8.2 기존 에러 응답 형식과의 호환성

```typescript
// 기존: { error: "message" }
// 신규: { error: "ERROR_CODE", message: "..." }

// 클라이언트가 두 형식 모두 처리
const errorMessage = error.response?.data?.message || error.response?.data?.error;
```

---

## 9. 개발자 가이드

### 9.1 새로운 API 라우트 작성 흐름

1. **스키마 정의**
   ```typescript
   // src/lib/api/schemas/my-feature.ts
   export const createMyResourceSchema = z.object({ ... });
   export type CreateMyResourceBody = z.infer<typeof createMyResourceSchema>;
   ```

2. **핸들러 작성**
   ```typescript
   // src/app/api/my-feature/route.ts
   const handler: ApiHandlerFunction<CreateMyResourceBody> = async ({ user, body }) => {
     // user.organizationId, user.userId는 이미 인증됨
     return { id: "...", ... };
   };
   
   export const POST = withApiHandler(handler, {
     requireAuth: true,
     bodySchema: createMyResourceSchema,
   });
   ```

3. **테스트**
   ```typescript
   // POST with valid body → 200 OK
   // POST with invalid body → 422 Unprocessable Entity
   // GET without auth → 401 Unauthorized
   ```

### 9.2 자주 하는 실수 (피해야 할 것)

```typescript
// ❌ withApiHandler 내부에서 setTimeout 사용
export const POST = withApiHandler(
  async ({ body }) => {
    setTimeout(() => {
      // 응답 반환 후 실행됨 — 클라이언트가 받지 못함
    }, 1000);
    return { success: true };
  }
);

// ✅ SSE 또는 배경 작업 큐 사용
export const POST = withApiHandler(
  async ({ body }) => {
    // fire-and-forget 패턴
    queue.enqueue({ type: "send-email", ... }).catch(() => {});
    return { success: true };
  }
);

// ❌ Zod 스키마에서 비동기 검증
export const userSchema = z.object({
  email: z.string().refine(
    async (email) => {
      const exists = await checkEmailInDatabase(email);
      return !exists;
    },
    "이미 사용 중인 이메일입니다."
  ),
});

// ✅ 핸들러에서 비즈니스 로직 검증
export const POST = withApiHandler(
  async ({ body }) => {
    const exists = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (exists) {
      throw ApiError.conflict("이메일");
    }
    // ...
  }
);
```

---

## 10. 기술 결정 & 트레이드오프

| 결정 | 선택 | 이유 | 트레이드오프 |
|------|------|------|------------|
| 에러 분류 | 세분화 (14개 코드) | 클라이언트 UX 향상 | 스키마 복잡도 증가 |
| 검증 타이밍 | 핸들러 진입 전 (Zod) | 보안 + 성능 | 복잡한 검증은 핸들러에서 처리 |
| 응답 형식 | `{ error: CODE, message, context }` | 국제화 가능, 로깅 추적 용이 | 기존과 다름 (호환성 유지) |
| 스키마 위치 | `src/lib/api/schemas/` | 재사용성 | 더 많은 파일 |
| 페이지네이션 | 커서 (기본) + 오프셋 (옵션) | 성능 + 유연성 | 코드 2배 관리 필요 |
| SSE 처리 | 별도 래퍼 (`withSseHandler`) | 명확성 | 코드 증가 |

---

## 11. 참고: 기존 에러 처리 코드 리팩토링 예시

### 11.1 에러 바운더리 (클라이언트 사이드)

```typescript
// src/app/(dashboard)/error.tsx (이미 구현됨)
export default function DashboardError({ error, reset }) {
  return <ErrorUI {...} />;
}

// → 이미 좋음. 유지.
```

### 11.2 API 에러 처리 훅 (React)

```typescript
// src/lib/hooks/use-api.ts (신규 추가 권장)

import { useCallback } from "react";
import { toast } from "sonner";

type ApiErrorResponse = {
  error: string;
  message: string;
  context?: Record<string, any>;
};

export function useApi() {
  const handleError = useCallback((error: any) => {
    const apiError: ApiErrorResponse = error.response?.data;

    switch (apiError?.error) {
      case "VALIDATION_ERROR":
        toast.error(`검증 실패: ${apiError.message}`);
        break;
      
      case "UNAUTHORIZED":
        toast.error("로그인이 필요합니다.");
        // 로그인 페이지로 이동
        break;
      
      case "FORBIDDEN":
        toast.error("이 작업을 수행할 권한이 없습니다.");
        break;
      
      case "INSUFFICIENT_CREDITS":
        toast.error(apiError.message);
        // 크레딧 충전 모달 열기
        break;
      
      case "RATE_LIMITED":
        toast.error(apiError.message);
        break;
      
      default:
        toast.error(apiError?.message || "오류가 발생했습니다.");
    }
  }, []);

  return { handleError };
}
```

---

## 12. 구현 체크리스트 (Implementer용)

- [ ] ApiError 클래스 작성 및 테스트
- [ ] withApiHandler 래퍼 구현
- [ ] withSseHandler 래퍼 구현
- [ ] 공통 Zod 스키마 작성
- [ ] 에러 페이지 (error.tsx, not-found.tsx) 업데이트
- [ ] Phase 2 라우트 6개 마이그레이션
- [ ] 클라이언트 에러 처리 훅 구현
- [ ] E2E 테스트 작성 (실패 케이스)
- [ ] 문서화 (스키마 변경사항)

---

## 13. 다음 단계

1. **즉시 (오늘)**: 본 설계 검토 및 피드백
2. **Week 1**: Phase 1 인프라 구축 완료
3. **Week 2**: Phase 2 핵심 라우트 마이그레이션
4. **Week 3**: Phase 3 나머지 라우트 + 문서화

---

## 부록: 참고 자료

### 현재 라우트 분석 (총 74개)

**도메인별 분포**:
- Projects: 6개 (route.ts, [id]/route.ts, archive, restore 등)
- Tasks: 8개 (generation jobs 포함)
- Comments: 3개 (route.ts, [id]/route.ts, resolve)
- Billing: 5개 (checkout, portal, usage, credits, purchase)
- Agent: 9개 (connections, tasks, status, dashboard 등)
- Generation: 4개 (generate, diagrams, wireframes, improve)
- Organization: 6개 (route.ts, members, transfer 등)
- Uploads: 3개
- Exports: 4개
- Other: 20개 (invitations, notifications, search, settings, webhooks, cron, admin)

**개선 영향도**:
- 영향도 높음 (모든 라우트): 인증, 에러 처리, 로깅
- 영향도 중간 (POST/PUT): 입력 검증
- 영향도 낮음 (GET only): 페이지네이션 표준화
