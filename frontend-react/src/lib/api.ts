/**
 * EdVidura Central Typed API Client
 * Connects React SPA to FastAPI App API (/api/v1/app) with Bearer token injection.
 */
import { getBearerToken, setBearerToken } from "@/components/shell/RoleContext";

export interface AppApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface AppEnvelope<T> {
  ok: boolean;
  data: T | null;
  error: AppApiErrorPayload | null;
  meta?: Record<string, unknown>;
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: string = "error",
    statusCode: number = 400,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  timeoutMs?: number;
}

/**
 * Core fetch wrapper with timeout, token injection, and AppEnvelope unwrap.
 */
export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, timeoutMs = 15000, headers: customHeaders, ...rest } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const signal = options.signal
    ? (anySignal([options.signal, controller.signal]) as AbortSignal)
    : controller.signal;

  const token = getBearerToken();
  const headers = new Headers(customHeaders);

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let serializedBody: BodyInit | undefined = undefined;
  if (body !== undefined) {
    if (body instanceof FormData || typeof body === "string" || body instanceof Blob) {
      serializedBody = body;
    } else {
      headers.set("Content-Type", "application/json");
      serializedBody = JSON.stringify(body);
    }
  }

  try {
    const url = endpoint.startsWith("http")
      ? endpoint
      : endpoint.startsWith("/")
        ? endpoint
        : `/${endpoint}`;
    const reqInit: RequestInit = {
      credentials: "same-origin",
      ...rest,
      headers,
      signal,
    };
    if (serializedBody !== undefined) {
      reqInit.body = serializedBody;
    }

    const response = await fetch(url, reqInit);

    clearTimeout(timeoutId);

    // Handle session expiry on 401
    if (response.status === 401) {
      setBearerToken(null);
      let errorPayload: AppApiErrorPayload = {
        code: "auth_required",
        message: "Session expired or unauthorized",
      };
      try {
        const json = await response.json();
        if (json.error) errorPayload = json.error;
      } catch {
        // use fallback
      }
      throw new ApiError(errorPayload.message, errorPayload.code, 401, errorPayload.details);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      if (!response.ok) {
        const text = await response.text();
        throw new ApiError(text || `HTTP ${response.status}`, "http_error", response.status);
      }
      return (await response.text()) as unknown as T;
    }

    const json = (await response.json()) as AppEnvelope<T> | Record<string, unknown>;

    const hasOk = typeof json === "object" && json !== null && "ok" in json;
    const isOk = hasOk ? Boolean((json as AppEnvelope<T>).ok) : response.ok;

    if (!response.ok || !isOk) {
      const err = (json as AppEnvelope<T>).error || {
        code: "request_failed",
        message: `HTTP ${response.status}`,
      };
      throw new ApiError(err.message, err.code, response.status, err.details);
    }

    if (typeof json === "object" && json !== null && "data" in json) {
      return (json as AppEnvelope<T>).data as T;
    }
    return json as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) {
      throw err;
    }
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request timed out or cancelled", "abort_error", 408);
    }
    const message = err instanceof Error ? err.message : "Network error";
    throw new ApiError(message, "network_error", 0);
  }
}

/**
 * Polyfill-safe signal combiner
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return signal;
    }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

export const api = {
  get: <T>(url: string, opts?: RequestOptions) => apiRequest<T>(url, { ...opts, method: "GET" }),
  post: <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    apiRequest<T>(url, { ...opts, method: "POST", body }),
  put: <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    apiRequest<T>(url, { ...opts, method: "PUT", body }),
  patch: <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    apiRequest<T>(url, { ...opts, method: "PATCH", body }),
  delete: <T>(url: string, opts?: RequestOptions) =>
    apiRequest<T>(url, { ...opts, method: "DELETE" }),
};
