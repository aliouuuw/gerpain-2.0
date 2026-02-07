import { apiClient } from "../api-client";

export type DeliveryStatus = "draft" | "in_progress" | "validated";

export interface DeliveryItem {
  id: string;
  productId: string;
  productName: string;
  period: string;
  quantityEntrusted: number;
  quantityReturned: number;
  quantitySold: number;
  unitPrice: number;
}

export interface DeliveryRun {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  locationId: string;
  locationName: string;
  status: DeliveryStatus;
  notes: string;
  items: DeliveryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryRunsParams {
  date: string;
  locationId?: string;
  employeeId?: string;
}

export interface CreateDeliveryRunRequest {
  employeeId: string;
  date: string;
  locationId: string;
  notes?: string;
}

export interface UpdateDeliveryRunRequest {
  notes?: string;
  status?: DeliveryStatus;
}

export interface CreateDeliveryItemRequest {
  productId: string;
  period: string;
  quantityEntrusted: number;
  quantityReturned?: number;
  unitPrice: number;
}

export interface UpdateDeliveryItemRequest {
  quantityEntrusted?: number;
  quantityReturned?: number;
  unitPrice?: number;
}

export interface ValidateDeliveryRunResponse extends DeliveryRun {
  collection: {
    id: string;
    expectedAmount: number;
  };
}

export async function getDeliveryRuns(
  params: DeliveryRunsParams
): Promise<DeliveryRun[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("date", params.date);
  if (params.locationId) searchParams.set("locationId", params.locationId);
  if (params.employeeId) searchParams.set("employeeId", params.employeeId);

  return apiClient<DeliveryRun[]>(`/api/v1/delivery-runs/runs?${searchParams.toString()}`);
}

export async function getDeliveryRun(id: string): Promise<DeliveryRun> {
  return apiClient<DeliveryRun>(`/api/v1/delivery-runs/runs/${id}`);
}

export async function createDeliveryRun(
  data: CreateDeliveryRunRequest
): Promise<DeliveryRun> {
  return apiClient<DeliveryRun>("/api/v1/delivery-runs/runs", {
    method: "POST",
    body: data,
  });
}

export async function updateDeliveryRun(
  id: string,
  data: UpdateDeliveryRunRequest
): Promise<DeliveryRun> {
  return apiClient<DeliveryRun>(`/api/v1/delivery-runs/runs/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function validateDeliveryRun(id: string): Promise<ValidateDeliveryRunResponse> {
  return apiClient<ValidateDeliveryRunResponse>(`/api/v1/delivery-runs/runs/${id}/validate`, {
    method: "POST",
  });
}

export async function createDeliveryItem(
  runId: string,
  data: CreateDeliveryItemRequest
): Promise<DeliveryItem> {
  return apiClient<DeliveryItem>(`/api/v1/delivery-runs/runs/${runId}/items`, {
    method: "POST",
    body: data,
  });
}

export async function updateDeliveryItem(
  id: string,
  data: UpdateDeliveryItemRequest
): Promise<DeliveryItem> {
  return apiClient<DeliveryItem>(`/api/v1/delivery-items/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteDeliveryItem(id: string): Promise<void> {
  await apiClient<void>(`/api/v1/delivery-items/${id}`, {
    method: "DELETE",
  });
}
