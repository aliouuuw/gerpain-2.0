"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getDashboardSummary,
  type DashboardParams,
} from "@/lib/api/dashboard";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: (params: DashboardParams) => [...dashboardKeys.all, "summary", params] as const,
};

export function useDashboardSummary(params: DashboardParams = {}) {
  return useQuery({
    queryKey: dashboardKeys.summary(params),
    queryFn: () => getDashboardSummary(params),
    staleTime: 30 * 1000, // 30 seconds - dashboard data changes frequently
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}
