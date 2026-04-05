import { ApiErrorCode } from "./api-error-codes";
import { ZodError } from "zod";

export type ApiErrorOptions = {
  code: ApiErrorCode;
  message: string;
  detail?: string;
  context?: Record<string, unknown>;
  cause?: Error;
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
  readonly context: Record<string, unknown>;
  override readonly cause?: Error;

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = "ApiError";
    this.code = options.code;
    this.statusCode = ERROR_STATUS_MAP[options.code];
    this.detail = options.detail;
    this.context = options.context || {};
    this.cause = options.cause;
  }

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

  static validationError(
    message: string,
    context?: Record<string, unknown>,
  ): ApiError {
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
    const message = resetAt
      ? `요청 한도를 초과했습니다. ${resetAt.toISOString()} 이후 다시 시도하세요.`
      : "요청 한도를 초과했습니다.";
    return new ApiError({
      code: ApiErrorCode.RATE_LIMITED,
      message,
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

  static internalError(
    cause?: Error,
    context?: Record<string, unknown>,
  ): ApiError {
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
      ...(process.env.NODE_ENV === "development" &&
        this.detail && { detail: this.detail }),
      ...(Object.keys(this.context).length > 0 && { context: this.context }),
    };
  }
}
