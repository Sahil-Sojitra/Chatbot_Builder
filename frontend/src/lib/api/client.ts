import { clearAuth, setAccessToken } from "@/features/auth/authSlice";
import { getStore } from "@/lib/store";
import type { ApiErrorBody, ApiResult } from "@/types/api";

import { API_BASE_URL } from "./config";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Lowest-level request function: always sends the HttpOnly refresh cookie,
 * never attaches an Authorization header on its own, and never reacts to a
 * 401 by refreshing. Used directly by the refresh call itself (so a refresh
 * can never recursively trigger another refresh) and by public endpoints
 * (login/register) that have no access token yet and shouldn't trigger the
 * refresh-retry behavior on failure.
 */
export async function rawRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let json: ApiResult<T> | undefined;
  try {
    json = (await response.json()) as ApiResult<T>;
  } catch {
    json = undefined;
  }

  if (!json || json.success === false) {
    const body: ApiErrorBody = json?.success === false
      ? json.error
      : { code: "UNKNOWN_ERROR", message: `Request failed with status ${response.status}` };
    throw new ApiRequestError(response.status, body);
  }

  return json.data;
}

/**
 * Deduplicates concurrent refresh attempts: every 401 handler calls this,
 * but only the first call actually issues the network request — the rest
 * await the same in-flight promise. Assigning `refreshPromise` happens
 * synchronously before any `await`, so no race is possible between
 * concurrent callers.
 */
let refreshPromise: Promise<string | null> | null = null;

const performRefresh = (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const { accessToken } = await rawRequest<{ accessToken: string }>(
          "/api/v1/auth/refresh",
          { method: "POST" },
        );
        getStore().dispatch(setAccessToken(accessToken));
        return accessToken;
      } catch {
        getStore().dispatch(clearAuth());
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
};

/**
 * The request function for authenticated calls: attaches the current access
 * token (if any) from Redux, and on a 401 transparently refreshes and
 * retries the original request exactly once. If the refresh itself fails,
 * auth state is cleared and the original 401 error is thrown — the request
 * is never retried in that case.
 */
async function requestWithAuth<T>(
  path: string,
  options: RequestOptions,
  isRetry: boolean,
): Promise<T> {
  const { accessToken } = getStore().getState().auth;

  try {
    return await rawRequest<T>(path, {
      ...options,
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    const shouldRetry =
      !isRetry && error instanceof ApiRequestError && error.status === 401;

    if (!shouldRetry) {
      throw error;
    }

    const newToken = await performRefresh();
    if (!newToken) {
      throw error;
    }

    return requestWithAuth<T>(path, options, true);
  }
}

export function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return requestWithAuth<T>(path, options, false);
}
