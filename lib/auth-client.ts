"use client";

import { useEffect, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_DISABLED"
  | "SERVER_ERROR"
  | "NETWORK_ERROR";

export class AuthError extends Error {
  code: AuthErrorCode;

  constructor(code: AuthErrorCode) {
    super(code);
    this.code = code;
  }
}

async function apiFetch(input: string, init?: RequestInit) {
  try {
    const res = await fetch(`${API_BASE_URL}${input}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      ...init,
    });

    return res;
  } catch {
    throw new AuthError("NETWORK_ERROR");
  }
}

export async function signInWithEmail(email: string, password: string) {
  const res = await apiFetch("/api/v1/auth/signin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (res.ok) {
    return;
  }

  let code: AuthErrorCode = "SERVER_ERROR";

  try {
    const data = await res.json();
    const backendCode = data?.error?.code ?? data?.code;

    if (res.status === 401) {
      code = "INVALID_CREDENTIALS";
    } else if (res.status === 403 || backendCode === "ACCOUNT_DISABLED") {
      code = "ACCOUNT_DISABLED";
    }
  } catch {
    // Ignore JSON parsing issues and fall back to SERVER_ERROR
  }

  throw new AuthError(code);
}

export async function signOut() {
  await apiFetch("/api/v1/auth/signout", {
    method: "POST",
  });
}

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
}

async function fetchSession(): Promise<SessionUser | null> {
  const res = await apiFetch("/api/v1/auth/profile");

  if (res.status === 401) {
    return null;
  }

  if (!res.ok) {
    throw new Error("SESSION_FETCH_FAILED");
  }

  const json = await res.json();

  if (!json?.success || !json?.data?.user) {
    return null;
  }

  return json.data.user as SessionUser;
}

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsPending(true);
        const u = await fetchSession();
        if (!cancelled) {
          setUser(u);
        }
      } catch (err) {
        if (!cancelled) {
          setError("SESSION_FETCH_FAILED");
        }
      } finally {
        if (!cancelled) {
          setIsPending(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data: user ? { user } : null, isPending, error } as const;
}
