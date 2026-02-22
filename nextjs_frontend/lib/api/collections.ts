import { apiClient } from "../api-client";

export type CollectionStatus = "pending" | "submitted" | "validated" | "rejected";

export interface CashCollection {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  routeLabel: string;
  date: string;
  locationId: string;
  deliveryRunId: string | null;
  expectedAmount: number;
  actualAmount: number | null;
  cashAmount: number;
  cardAmount: number;
  mobileAmount: number;
  variance: number | null;
  status: CollectionStatus;
  rejectionReason?: string | null;
  isSettled: boolean;
  period: string | null;
  source: "Livraison" | "Boutique";
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionsParams {
  date?: string;
  startDate?: string;
  endDate?: string;
  locationId?: string;
  employeeId?: string;
  status?: CollectionStatus;
  isSettled?: boolean;
}

export interface CreateCashCollectionRequest {
  employeeId: string;
  date: string;
  locationId: string;
  expectedAmount: number;
}

export interface UpdateCashCollectionRequest {
  actualAmount?: number;
  cashAmount?: number;
  cardAmount?: number;
  mobileAmount?: number;
  notes?: string;
  status?: CollectionStatus;
}

export interface CollectionAggregates {
  totalExpected: number;
  totalCollected: number;
  outstandingBalance: number;
  collectionRate: number;
  count: number;
}

export interface SettlePeriodResponse {
  settledCount: number;
  settledIds: string[];
}

export interface EmployeeOverview {
  employeeId: string;
  employeeName: string;
  role: string;
  roleLabel: string;
  tournées: number;
  totalExpected: number;
  totalCollected: number;
  solde: number;
  unsettledCount: number;
}

export interface OverviewParams {
  startDate?: string;
  endDate?: string;
  role?: string;
  isSettled?: boolean;
}

export async function getCashCollections(
  params: CollectionsParams = {}
): Promise<CashCollection[]> {
  const searchParams = new URLSearchParams();
  if (params.date) searchParams.set("date", params.date);
  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);
  if (params.locationId) searchParams.set("locationId", params.locationId);
  if (params.employeeId) searchParams.set("employeeId", params.employeeId);
  if (params.status) searchParams.set("status", params.status);
  if (params.isSettled !== undefined) searchParams.set("isSettled", String(params.isSettled));

  const queryString = searchParams.toString();
  return apiClient<CashCollection[]>(`/api/v1/cash-collections${queryString ? `?${queryString}` : ""}`);
}

export async function getCashCollection(id: string): Promise<CashCollection> {
  return apiClient<CashCollection>(`/api/v1/cash-collections/${id}`);
}

export async function createCashCollection(
  data: CreateCashCollectionRequest
): Promise<CashCollection> {
  return apiClient<CashCollection>("/api/v1/cash-collections", {
    method: "POST",
    body: data,
  });
}

export async function updateCashCollection(
  id: string,
  data: UpdateCashCollectionRequest
): Promise<CashCollection> {
  return apiClient<CashCollection>(`/api/v1/cash-collections/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function submitCashCollection(id: string): Promise<CashCollection> {
  return apiClient<CashCollection>(`/api/v1/cash-collections/${id}/submit`, {
    method: "POST",
  });
}

export async function validateCashCollection(id: string): Promise<CashCollection> {
  return apiClient<CashCollection>(`/api/v1/cash-collections/${id}/validate`, {
    method: "POST",
  });
}

export async function rejectCashCollection(
  id: string,
  reason: string
): Promise<CashCollection> {
  return apiClient<CashCollection>(`/api/v1/cash-collections/${id}/reject`, {
    method: "POST",
    body: { reason },
  });
}

export async function reopenCashCollection(id: string): Promise<CashCollection> {
  return apiClient<CashCollection>(`/api/v1/cash-collections/${id}/reopen`, {
    method: "POST",
  });
}

export async function getCollectionAggregates(
  params: Omit<CollectionsParams, "status" | "locationId" | "isSettled"> = {}
): Promise<CollectionAggregates> {
  const searchParams = new URLSearchParams();
  if (params.employeeId) searchParams.set("employeeId", params.employeeId);
  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);

  const queryString = searchParams.toString();
  const response = await apiClient<{ data: CollectionAggregates }>(
    `/api/v1/cash-collections/aggregates${queryString ? `?${queryString}` : ""}`
  );
  return response.data;
}

export async function settleCollectionsPeriod(
  params: Omit<CollectionsParams, "status" | "locationId" | "isSettled"> = {}
): Promise<SettlePeriodResponse> {
  const searchParams = new URLSearchParams();
  if (params.employeeId) searchParams.set("employeeId", params.employeeId);
  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);

  const queryString = searchParams.toString();
  const response = await apiClient<{ data: SettlePeriodResponse }>(
    `/api/v1/cash-collections/settle${queryString ? `?${queryString}` : ""}`,
    {
      method: "POST",
    }
  );
  return response.data;
}

export async function getCashCollectionsOverview(
  params: OverviewParams = {}
): Promise<EmployeeOverview[]> {
  const searchParams = new URLSearchParams();
  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);
  if (params.role) searchParams.set("role", params.role);
  if (params.isSettled !== undefined) searchParams.set("isSettled", String(params.isSettled));

  const queryString = searchParams.toString();
  const response = await apiClient<{ data: EmployeeOverview[] }>(
    `/api/v1/cash-collections/overview${queryString ? `?${queryString}` : ""}`
  );
  return response.data;
}
