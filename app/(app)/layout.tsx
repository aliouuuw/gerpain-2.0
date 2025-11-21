"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";

export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const { data, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !data?.user) {
      router.replace("/login");
    }
  }, [isPending, data, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-500">Chargement…</p>
      </div>
    );
  }

  if (!data?.user) {
    return null;
  }

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Gerpain ERP</h1>
          <p className="text-xs text-zinc-500">
            Tableau de bord de gestion des boulangeries.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-700">
          <span>{data.user.name ?? data.user.email}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
          >
            Déconnexion
          </button>
        </div>
      </header>
      <main className="px-6 py-6">{children}</main>
    </div>
  );
}
