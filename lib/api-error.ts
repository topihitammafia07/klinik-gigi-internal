interface ApiErrorPayload {
  message?: string;
  errors?: Record<string, string[]>;
  code?: string;
}

interface ApiErrorLike {
  response?: {
    status?: number;
    data?: ApiErrorPayload;
  };
  message?: string;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const candidate = error as ApiErrorLike;
  const payload = candidate?.response?.data;
  const firstValidationError = payload?.errors
    ? Object.values(payload.errors).flat().find(Boolean)
    : undefined;

  return firstValidationError ?? payload?.message ?? candidate?.message ?? fallback;
}

export function getApiErrorCode(error: unknown): string | undefined {
  return (error as ApiErrorLike)?.response?.data?.code;
}
