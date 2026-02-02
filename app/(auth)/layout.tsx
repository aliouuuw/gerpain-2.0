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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[var(--accent)] via-[var(--primary)]/10 to-[var(--accent)]">
        <div className="text-center">
          <div className="mb-4 inline-block size-12 animate-spin rounded-full border-4 border-[var(--primary)]/20 border-t-[var(--primary)]"></div>
          <p className="text-sm font-medium text-[var(--muted-foreground)]">
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--accent)] via-[var(--primary)]/10 to-[var(--accent)] p-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 size-64 rounded-full bg-[var(--primary)]/10 blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 size-96 rounded-full bg-[var(--primary)]/10 blur-3xl"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
