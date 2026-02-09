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
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface)]">
        <div className="text-center">
          <div className="mb-4 inline-block size-10 animate-spin rounded-full border-[3px] border-[var(--border)] border-t-[var(--primary)]"></div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Vérification de votre session…
          </p>
        </div>
      </div>
    );
  }

  if (data?.user) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--surface)] p-4">
      {/* Warm artisan background pattern */}
      <div className="absolute inset-0">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/[0.04] via-transparent to-[var(--primary)]/[0.01]" />
        {/* Decorative circles */}
        <div className="absolute -left-32 -top-32 size-96 rounded-full bg-[var(--primary)]/[0.04] blur-3xl" />
        <div className="absolute -bottom-32 -right-32 size-[500px] rounded-full bg-[var(--primary)]/[0.03] blur-3xl" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
