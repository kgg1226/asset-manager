import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_ID"
  | "NOT_FOUND"
  | "REQUIRED_FIELD"
  | "INVALID_PASSWORD"
  | "INVALID_INPUT"
  | "DUPLICATE"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INVALID_ID: 400,
  NOT_FOUND: 404,
  REQUIRED_FIELD: 400,
  INVALID_PASSWORD: 400,
  INVALID_INPUT: 400,
  DUPLICATE: 409,
  INTERNAL_ERROR: 500,
};

const DEFAULT_MESSAGES: Record<ApiErrorCode, string> = {
  UNAUTHORIZED: "인증이 필요합니다.",
  FORBIDDEN: "권한이 없습니다.",
  INVALID_ID: "유효하지 않은 ID입니다.",
  NOT_FOUND: "리소스를 찾을 수 없습니다.",
  REQUIRED_FIELD: "필수 항목이 누락되었습니다.",
  INVALID_PASSWORD: "비밀번호 형식이 올바르지 않습니다.",
  INVALID_INPUT: "입력 값이 올바르지 않습니다.",
  DUPLICATE: "이미 존재하는 항목입니다.",
  INTERNAL_ERROR: "서버 오류가 발생했습니다.",
};

interface ApiErrorOptions {
  message?: string;
  status?: number;
}

export function apiError(code: ApiErrorCode, options?: ApiErrorOptions): NextResponse {
  return NextResponse.json(
    { code, error: options?.message ?? DEFAULT_MESSAGES[code] },
    { status: options?.status ?? STATUS_BY_CODE[code] },
  );
}
