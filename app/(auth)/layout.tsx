"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const { data, isPending } = useSession();

  useEffect(() => {
    if (!isPending && data?.user) {
      router.replace("/dashboard");
    }
  }, [isPending, data, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-500">Chargement…</p>
      </div>
    );
  }

  if (data?.user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      {children}
    </div>
  );
}
