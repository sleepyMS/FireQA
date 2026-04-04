import { NextRequest, NextResponse } from "next/server";
import { ZodSchema } from "zod";
import { ApiError } from "./api-error";
import { ApiErrorCode } from "./api-error-codes";
import { getCurrentUser, type AuthUser } from "@/lib/auth/get-current-user";
import { hasRole } from "@/lib/auth/require-role";
import {
  createLogger,
  generateRequestId,
  REQUEST_ID_HEADER,
} from "@/lib/logger";

type HandlerContext<
  TRequest,
  TQuery,
  TUser extends AuthUser | null,
> = {
  request: NextRequest;
  user: TUser;
  body: TRequest;
  query: TQuery;
  params: Record<string, string>;
};

export type ApiHandlerFunction<
  TRequest = unknown,
  TQuery = Record<string, string | string[]>,
  TResponse = unknown,
> = (ctx: HandlerContext<TRequest, TQuery, AuthUser>) => Promise<TResponse | NextResponse>;

export type UnauthApiHandlerFunction<
  TRequest = unknown,
  TQuery = Record<string, string | string[]>,
  TResponse = unknown,
> = (ctx: HandlerContext<TRequest, TQuery, AuthUser | null>) => Promise<TResponse | NextResponse>;

export type ApiHandlerOptions<
  TRequest = unknown,
  TQuery = Record<string, string | string[]>,
> = {
  requireAuth?: boolean;
  minRole?: string;
  bodySchema?: ZodSchema<TRequest>;
  querySchema?: ZodSchema<TQuery>;
  successStatus?: number;
};

// Overload: requireAuth omitted or true → user: AuthUser (non-null guaranteed)
export function withApiHandler<
  TRequest = unknown,
  TQuery = Record<string, string | string[]>,
  TResponse = unknown,
>(
  handler: ApiHandlerFunction<TRequest, TQuery, TResponse>,
  options?: ApiHandlerOptions<TRequest, TQuery> & { requireAuth?: true },
): (request: NextRequest, segmentData?: { params?: Promise<Record<string, string>> }) => Promise<NextResponse>;

// Overload: requireAuth: false → user: AuthUser | null
export function withApiHandler<
  TRequest = unknown,
  TQuery = Record<string, string | string[]>,
  TResponse = unknown,
>(
  handler: UnauthApiHandlerFunction<TRequest, TQuery, TResponse>,
  options: ApiHandlerOptions<TRequest, TQuery> & { requireAuth: false },
): (request: NextRequest, segmentData?: { params?: Promise<Record<string, string>> }) => Promise<NextResponse>;

export function withApiHandler<
  TRequest = unknown,
  TQuery = Record<string, string | string[]>,
  TResponse = unknown,
>(
  handler: ApiHandlerFunction<TRequest, TQuery, TResponse> | UnauthApiHandlerFunction<TRequest, TQuery, TResponse>,
  options: ApiHandlerOptions<TRequest, TQuery> = {},
) {
  const { requireAuth = true, minRole, bodySchema, querySchema, successStatus = 200 } =
    options;

  return async (
    request: NextRequest,
    segmentData?: { params?: Promise<Record<string, string>> },
  ) => {
    const requestId =
      request.headers.get(REQUEST_ID_HEADER) ?? generateRequestId();
    const logger = createLogger({
      module: "api",
      defaultContext: { requestId, url: request.url, method: request.method },
    });

    try {
      // 1. 인증
      const user = await getCurrentUser(request);
      if (requireAuth && !user) {
        throw ApiError.unauthorized();
      }

      // 2. 권한
      if (minRole && user) {
        if (!hasRole(user.role, minRole)) {
          throw ApiError.forbidden(`최소 권한: ${minRole}`);
        }
      }

      // 3. 바디 파싱 & 검증
      let body = {} as TRequest;
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

      // 4. 쿼리 파라미터 검증
      const rawQuery = Object.fromEntries(
        request.nextUrl.searchParams.entries(),
      );
      let query: TQuery;
      if (querySchema) {
        const result = querySchema.safeParse(rawQuery);
        if (!result.success) {
          throw ApiError.fromZodError(result.error);
        }
        query = result.data;
      } else {
        query = rawQuery as TQuery;
      }

      // 5. 경로 파라미터 (Next.js 16: params는 Promise)
      const params = segmentData?.params ? await segmentData.params : {};

      // 6. 핸들러 실행
      const result = await (handler as UnauthApiHandlerFunction<TRequest, TQuery, TResponse>)({ request, user, body, query, params });

      // NextResponse를 직접 반환한 경우 requestId 헤더만 추가
      if (result instanceof NextResponse) {
        result.headers.set(REQUEST_ID_HEADER, requestId);
        return result;
      }

      return NextResponse.json(result, {
        status: successStatus,
        headers: { [REQUEST_ID_HEADER]: requestId },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        return handleApiError(err, request, requestId, logger);
      }

      if (err instanceof Error) {
        logger.error("Unhandled error", { error: err });
      }

      const internalError = ApiError.internalError(
        err instanceof Error ? err : undefined,
        { url: request.url },
      );
      return handleApiError(internalError, request, requestId, logger);
    }
  };
}

function handleApiError(
  error: ApiError,
  request: NextRequest,
  requestId: string,
  logger: ReturnType<typeof createLogger>,
): NextResponse {
  const statusCode = error.statusCode;

  if (statusCode >= 500) {
    logger.error("Server error", {
      code: error.code,
      detail: error.message,
      cause: error.cause?.message,
      context: error.context,
    });
  } else if (statusCode >= 400) {
    logger.debug("Client error", {
      code: error.code,
      detail: error.message,
    });
  }

  return NextResponse.json(error.toJSON(), {
    status: statusCode,
    headers: {
      "X-Error-Code": error.code,
      [REQUEST_ID_HEADER]: requestId,
    },
  });
}
