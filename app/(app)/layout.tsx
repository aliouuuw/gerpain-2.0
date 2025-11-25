"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/Sidebar";
import { AppSidebar } from "@/components/ui/navigation/AppSidebar";
import { Breadcrumbs } from "@/components/ui/navigation/Breadcrumbs";

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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="text-center">
          <div className="mb-4 inline-block size-12 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600"></div>
          <p className="text-sm font-medium text-stone-600">Chargement de votre espace…</p>
        </div>
      </div>
    );
  }

  if (!data?.user) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppShell>{children}</AppShell>
    </SidebarProvider>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const { state, isMobile } = useSidebar();
  const isExpanded = state === "expanded" && !isMobile;

  const insetStyle = isExpanded
    ? { marginLeft: "var(--sidebar-width)", width: "calc(100% - var(--sidebar-width))" }
    : { marginLeft: 0, width: "100%" };

  return (
    <>
      <AppSidebar />
      <div
        className="flex min-h-svh flex-col transition-[margin-left] duration-150 ease-in-out"
        style={insetStyle}
      >
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-stone-200 bg-white/80 px-4 backdrop-blur-sm">
          <SidebarTrigger className="-ml-1" />
          <div className="mr-2 h-4 w-px bg-stone-200" />
          <Breadcrumbs />
        </header>
        <main className="page-enter min-h-[calc(100vh-4rem)] bg-gradient-to-br from-stone-50 via-amber-50/30 to-orange-50/20 p-6">
          {children}
        </main>
      </div>
    </>
  );
}
