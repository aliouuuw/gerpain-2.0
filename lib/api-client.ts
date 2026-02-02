"use client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

// TODO: This should come from auth context/session after login
// For now, we'll read from localStorage or use a default for testing
function getOrganizationId(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("organizationId");
  }
  return null;
}

export function setOrganizationId(orgId: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("organizationId", orgId);
  }
}

export interface ApiClientOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiClient<T>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const { method, headers, body, signal } = options;
  const organizationId = getOrganizationId();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: method ?? "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(organizationId ? { "X-Organization-ID": organizationId } : {}),
      ...(headers ?? {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export { API_BASE_URL };
