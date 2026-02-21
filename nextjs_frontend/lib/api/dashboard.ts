import { apiClient } from "../api-client";

export interface DashboardStats {
  todayRevenue: number;
  deliveries: {
    total: number;
    validated: number;
    draft: number;
  };
  collections: {
    pending: number;
    submitted: number;
    validated: number;
    totalCollected: number;
    totalExpected: number;
  };
  outstandingBalance: number;
}

export interface DashboardActivity {
  type: "delivery_validated" | "collection";
  label: string;
  time: string;
  status: "success" | "pending" | "info";
}

export interface DashboardAlert {
  label: string;
  severity: "urgent" | "warning" | "info";
}

export interface DashboardSummary {
  date: string;
  stats: DashboardStats;
  recentActivity: DashboardActivity[];
  alerts: DashboardAlert[];
}

export interface DashboardParams {
  date?: string;
}

export async function getDashboardSummary(
  params: DashboardParams = {}
): Promise<DashboardSummary> {
  const searchParams = new URLSearchParams();
  if (params.date) searchParams.set("date", params.date);

  const queryString = searchParams.toString();
  return apiClient<DashboardSummary>(
    `/api/v1/dashboard/summary${queryString ? `?${queryString}` : ""}`
  );
}
