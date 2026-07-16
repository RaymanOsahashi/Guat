// src/api/apiClient.ts
//
// Thin, typed wrapper around fetch(). Point it at your backend once here,
// then call apiGet/apiPost/etc. from anywhere in the app.
//
// Assumes a Vite project, so the base URL comes from import.meta.env.
// - Create a `.env.local` file in your project root with:
//     VITE_API_BASE_URL=http://localhost:3000
// - If you're on Create React App instead, swap the line below for:
//     const BASE_URL = process.env.REACT_APP_API_BASE_URL ?? "http://localhost:3000";
// - If you're on Next.js, use process.env.NEXT_PUBLIC_API_BASE_URL instead.

const BASE_URL: string =
  (import.meta as any).env?.VITE_API_BASE_URL ?? "https://guat-backend-849661066664.us-central1.run.app";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  headers?: Record<string, string>;
  /** e.g. a bearer token, if your API needs auth */
  token?: string;
}

async function request<TResponse>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  options?: RequestOptions
): Promise<TResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  if (options?.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Try to parse JSON either way, since error bodies are often JSON too.
  const text = await res.text();
  const data = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data as TResponse;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text; // not JSON, just return raw text
  }
}

export const apiGet = <T>(path: string, options?: RequestOptions) =>
  request<T>("GET", path, undefined, options);

export const apiPost = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  request<T>("POST", path, body, options);

export const apiPut = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  request<T>("PUT", path, body, options);

export const apiPatch = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  request<T>("PATCH", path, body, options);

export const apiDelete = <T>(path: string, options?: RequestOptions) =>
  request<T>("DELETE", path, undefined, options);
