import { apiClient } from "../api-client";

export type CollectionStatus = "pending" | "submitted" | "validated" | "rejected";

export interface CashCollection {
  id: string;
  employeeId: string;
  employeeName: string;
  routeLabel: string;
  date: string;
  locationId: string;
  expectedAmount: number;
  actualAmount: number | null;
  cashAmount: number;
  cardAmount: number;
  mobileAmount: number;
  variance: number | null;
  status: CollectionStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionsParams {
  date: string;
  locationId?: string;
  status?: CollectionStatus;
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

export async function getCashCollections(
  params: CollectionsParams
): Promise<CashCollection[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("date", params.date);
  if (params.locationId) searchParams.set("locationId", params.locationId);
  if (params.status) searchParams.set("status", params.status);

  return apiClient<CashCollection[]>(`/api/v1/cash-collections?${searchParams.toString()}`);
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
