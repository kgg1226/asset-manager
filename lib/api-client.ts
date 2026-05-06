import type { ApiErrorCode } from "./api-errors";
import type { TranslationDict } from "./i18n/types";

const CODE_TO_KEY: Record<ApiErrorCode, keyof TranslationDict["errors"]> = {
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  INVALID_ID: "invalidId",
  NOT_FOUND: "notFound",
  REQUIRED_FIELD: "requiredField",
  INVALID_PASSWORD: "invalidPassword",
  INVALID_INPUT: "invalidInput",
  DUPLICATE: "duplicate",
  INTERNAL_ERROR: "internalError",
};

export function getApiErrorMessage(data: unknown, t: TranslationDict): string {
  if (!data || typeof data !== "object") return "";
  const obj = data as { code?: string; error?: string };
  if (obj.code && obj.code in CODE_TO_KEY) {
    const key = CODE_TO_KEY[obj.code as ApiErrorCode];
    const msg = t.errors?.[key];
    if (msg) return msg;
  }
  return obj.error ?? "";
}
