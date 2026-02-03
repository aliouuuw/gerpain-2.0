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

async function ensureOrganizationId(): Promise<string | null> {
  const existing = getOrganizationId();
  if (existing) {
    return existing;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/organizations`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const orgs = data?.data ?? [];
    if (orgs.length > 0) {
      localStorage.setItem("organizationId", orgs[0].id);
      return orgs[0].id;
    }
  } catch {
    return null;
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

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
};

function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  if (typeof value !== "object" || value === null) return false;
  return "success" in value && typeof (value as { success?: unknown }).success === "boolean";
}

function getErrorMessage(value: unknown): string | undefined {
  if (!isApiEnvelope(value)) return undefined;
  return value.error?.message;
}

export async function apiClient<T>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const { method, headers, body, signal } = options;
  const organizationId = await ensureOrganizationId();

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

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    const message = getErrorMessage(json);

    throw new Error(message ?? `API request failed with status ${response.status}`);
  }

  if (isApiEnvelope(json)) {
    if (json.success === false) {
      throw new Error(json.error?.message ?? "API request failed");
    }

    if (json.data !== undefined) {
      return json.data as T;
    } else {
      throw new Error("API response missing data");
    }
  }

  return json as T;
}

export { API_BASE_URL };
