"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { SidebarProvider, SidebarTrigger } from "@/components/Sidebar";
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
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface)]">
        <div className="text-center">
          <div className="mb-4 inline-block size-12 animate-spin rounded-full border-4 border-[var(--primary)]/20 border-t-[var(--primary)]"></div>
          <p className="text-sm font-medium text-[var(--muted-foreground)]">Chargement de votre espace…</p>
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
  return (
    <>
      {/* Sidebar with spacer div that pushes content */}
      <AppSidebar />
      
      {/* Main content area - flexes to fill remaining space */}
      <div className="flex min-h-svh flex-1 flex-col overflow-hidden">
        {/* Header - sticky within main content, connects flush with sidebar */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4">
          <SidebarTrigger />
          <div className="h-4 w-px bg-[var(--border)]" />
          <Breadcrumbs />
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-auto bg-[var(--background)] sm:p-6">
          {children}
        </main>
      </div>
    </>
  );
}
