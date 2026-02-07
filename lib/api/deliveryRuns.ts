import { apiClient } from "../api-client";

export interface DeliveryRun {
  id: string;
  organizationId: string;
  bakeryId: string;
  employeeId: string;
  employeeName: string;
  routeLabel: string;
  locationId: string;
  date: string;
  status: "draft" | "in_progress" | "validated";
  notes: string;
  validatedAt: string | null;
  validatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  items: DeliveryItem[];
}

export interface DeliveryItem {
  id: string;
  runId: string;
  productId: string;
  productName: string;
  period: "Matin" | "Après-midi" | "Soir";
  quantityEntrusted: number;
  quantityReturned: number;
  unitPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryRunsParams {
  date?: string;
  employeeId?: string;
  locationId?: string;
}

export async function getDeliveryRuns(params: DeliveryRunsParams = {}): Promise<DeliveryRun[]> {
  const searchParams = new URLSearchParams();
  if (params.date) searchParams.set("date", params.date);
  if (params.employeeId) searchParams.set("employeeId", params.employeeId);
  if (params.locationId) searchParams.set("locationId", params.locationId);

  const query = searchParams.toString();
  return apiClient<DeliveryRun[]>(`/api/v1/delivery-runs/runs${query ? `?${query}` : ""}`);
}

export async function getDeliveryRun(id: string): Promise<DeliveryRun> {
  return apiClient<DeliveryRun>(`/api/v1/delivery-runs/runs/${id}`);
}

export async function createDeliveryRun(data: {
  employeeId: string;
  locationId: string;
  date: string;
  notes?: string;
}): Promise<DeliveryRun> {
  return apiClient<DeliveryRun>("/api/v1/delivery-runs/runs", {
    method: "POST",
    body: data,
  });
}

export async function updateDeliveryRun(
  id: string,
  data: {
    status?: "draft" | "in_progress" | "validated";
    notes?: string;
  }
): Promise<DeliveryRun> {
  return apiClient<DeliveryRun>(`/api/v1/delivery-runs/runs/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function validateDeliveryRun(id: string): Promise<DeliveryRun> {
  return apiClient<DeliveryRun>(`/api/v1/delivery-runs/runs/${id}/validate`, {
    method: "POST",
  });
}

export async function updateDeliveryItem(
  id: string,
  data: {
    quantityEntrusted?: number;
    quantityReturned?: number;
    unitPrice?: number;
  }
): Promise<DeliveryItem> {
  return apiClient<DeliveryItem>(`/api/v1/delivery-items/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteDeliveryItem(id: string): Promise<{ id: string }> {
  return apiClient<{ id: string }>(`/api/v1/delivery-items/${id}`, {
    method: "DELETE",
  });
}
