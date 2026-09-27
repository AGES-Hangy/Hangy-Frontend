import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { API_BASE_URL, API_TIMEOUT_MS, endpoints } from '@/constants/api';

export type PasswordResetValidationError = {
  field: string;
  message: string;
};

export type PasswordResetFailure = {
  kind: 'http' | 'network' | 'timeout' | 'cancelled';
  status: number | null;
  detail: string | null;
  retryAfterSeconds: number | null;
  validationErrors: PasswordResetValidationError[];
};

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; failure: PasswordResetFailure };

type VerifyResponse = {
  reset_token: string;
  expires_in: number;
};

let resetToken: string | null = null;
let resetTokenExpiresAt = 0;
const RATE_LIMIT_FALLBACK_SECONDS = 180;
const CANCELLED: ApiResult<never> = {
  ok: false,
  failure: { kind: 'cancelled', status: null, detail: null, retryAfterSeconds: null, validationErrors: [] },
};

export function clearPasswordResetToken() {
  resetToken = null;
  resetTokenExpiresAt = 0;
}

function getRetryAfterSeconds(response: Response): number | null {
  const retryAfter = response.headers.get('Retry-After');
  if (!retryAfter) return null;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);

  const retryAt = Date.parse(retryAfter);
  if (Number.isNaN(retryAt)) return null;

  const remainingSeconds = Math.ceil((retryAt - Date.now()) / 1000);
  return remainingSeconds > 0 ? remainingSeconds : null;
}

async function readErrorBody(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function parseFailure(response: Response, body: unknown): PasswordResetFailure {
  const payload = body && typeof body === 'object' ? body as Record<string, unknown> : null;
  const detailValue = payload?.detail;
  const detail = typeof detailValue === 'string' ? detailValue : null;
  const validationErrors = Array.isArray(detailValue)
    ? detailValue.flatMap((item): PasswordResetValidationError[] => {
        if (!item || typeof item !== 'object') return [];
        const issue = item as { loc?: unknown; msg?: unknown };
        const location = Array.isArray(issue.loc) ? issue.loc : [];
        const field = location.at(-1);
        if (typeof field !== 'string' || typeof issue.msg !== 'string') return [];
        return [{ field, message: issue.msg }];
      })
    : [];

  return {
    kind: 'http',
    status: response.status,
    detail,
    retryAfterSeconds: getRetryAfterSeconds(response),
    validationErrors,
  };
}

export function usePasswordReset() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<PasswordResetFailure | null>(null);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const retryUntil = useRef(0);
  const rateLimitFailure = useRef<PasswordResetFailure | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  useFocusEffect(useCallback(() => {
    setIsLoading(false);
    return () => {
      // Blur also runs when a screen stays mounted underneath the next step.
      const request = activeRequest.current;
      activeRequest.current = null;
      request?.abort();
    };
  }, []));

  useEffect(() => {
    if (retrySeconds === 0) return;
    const timer = setInterval(() => {
      setRetrySeconds(Math.max(0, Math.ceil((retryUntil.current - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [retrySeconds]);

  async function post<T>(path: string, body: object): Promise<ApiResult<T>> {
    if (Date.now() < retryUntil.current && rateLimitFailure.current) {
      return { ok: false, failure: rateLimitFailure.current };
    }
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const isCurrent = () => activeRequest.current === controller;
    setIsLoading(true);
    setError(null);

    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const failure = parseFailure(response, await readErrorBody(response));
        if (!isCurrent()) return CANCELLED;
        if (failure.status === 429) {
          const seconds = failure.retryAfterSeconds ?? RATE_LIMIT_FALLBACK_SECONDS;
          retryUntil.current = Date.now() + seconds * 1000;
          rateLimitFailure.current = failure;
          setRetrySeconds(seconds);
        }
        setError(failure);
        return { ok: false, failure };
      }

      const data = response.status === 202 || response.status === 204
        ? undefined as T
        : await response.json() as T;
      if (!isCurrent()) return CANCELLED;
      return { ok: true, data };
    } catch (caught) {
      if (!isCurrent()) return CANCELLED;
      const isTimeout = caught instanceof Error && caught.name === 'AbortError';
      const failure: PasswordResetFailure = {
        kind: isTimeout ? 'timeout' : 'network',
        status: null,
        detail: null,
        retryAfterSeconds: null,
        validationErrors: [],
      };
      setError(failure);
      return { ok: false, failure };
    } finally {
      clearTimeout(timeout);
      if (isCurrent()) {
        activeRequest.current = null;
        setIsLoading(false);
      }
    }
  }

  async function requestCode(email: string) {
    clearPasswordResetToken();
    return post<void>(endpoints.passwordResetRequest(), { email });
  }

  async function verifyCode(email: string, code: string) {
    clearPasswordResetToken();
    const result = await post<VerifyResponse>(endpoints.passwordResetVerify(), { email, code });
    if (result.ok) {
      resetToken = result.data.reset_token;
      resetTokenExpiresAt = Date.now() + result.data.expires_in * 1000;
    }
    return result;
  }

  async function resetPassword(newPassword: string) {
    if (!resetToken || Date.now() >= resetTokenExpiresAt) {
      clearPasswordResetToken();
      const failure: PasswordResetFailure = {
        kind: 'http',
        status: 401,
        detail: 'Invalid or expired reset token',
        retryAfterSeconds: null,
        validationErrors: [],
      };
      setError(failure);
      return { ok: false as const, failure };
    }

    const result = await post<void>(endpoints.passwordResetConfirm(), {
      reset_token: resetToken,
      new_password: newPassword,
    });

    if (result.ok) {
      clearPasswordResetToken();
    } else if (
      result.failure.status === 401 ||
      (result.failure.status === 400 && result.failure.detail === 'Invalid or expired reset token')
    ) {
      clearPasswordResetToken();
    }

    return result;
  }

  function clearError() {
    setError(null);
  }

  return { requestCode, verifyCode, resetPassword, clearError, isLoading, error, retrySeconds };
}
