import { apiClient } from "@/lib/api-client";

export interface InventoryItem {
  id: string;
  organizationId: string;
  locationId: string;
  productId: string;
  currentQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderPoint: number;
  maxStockLevel: number | null;
  lastCountedAt: string | null;
  lastCountedQuantity: number | null;
  createdAt: string;
  updatedAt: string;
  status: "normal" | "low" | "critical" | "out";
}

export interface InventorySummary {
  totalItems: number;
  criticalItems: number;
  lowItems: number;
  outOfStock: number;
}

export interface InventoryResponse {
  data: InventoryItem[];
  summary: InventorySummary;
}

export interface CreateInventoryItemRequest {
  organizationId: string;
  locationId: string;
  productId: string;
  currentQuantity: number;
  reservedQuantity?: number;
  reorderPoint?: number;
  maxStockLevel?: number;
}

export interface UpdateInventoryItemRequest {
  currentQuantity?: number;
  reservedQuantity?: number;
  reorderPoint?: number;
  maxStockLevel?: number;
}

export interface AdjustStockRequest {
  adjustment: number;
  reason?: string;
}

export async function getStockLevels(locationId?: string, productId?: string, lowStock?: boolean): Promise<InventoryResponse> {
  const params = new URLSearchParams();
  if (locationId) params.append("locationId", locationId);
  if (productId) params.append("productId", productId);
  if (lowStock) params.append("lowStock", "true");
  const url = `/inventory/stock?${params.toString()}`;
  const response = await apiClient<{ data: InventoryItem[]; summary: InventorySummary }>(url);
  return { data: response.data, summary: response.summary };
}

export async function getInventoryItem(id: string): Promise<InventoryItem> {
  const response = await apiClient<{ data: InventoryItem }>(`/inventory/stock/${id}`);
  return response.data;
}

export async function createInventoryItem(data: CreateInventoryItemRequest): Promise<InventoryItem> {
  const response = await apiClient<{ data: InventoryItem }>("/inventory/stock", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function updateInventoryItem(id: string, data: UpdateInventoryItemRequest): Promise<InventoryItem> {
  const response = await apiClient<{ data: InventoryItem }>(`/inventory/stock/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function adjustStock(id: string, data: AdjustStockRequest): Promise<InventoryItem> {
  const response = await apiClient<{ data: InventoryItem }>(`/inventory/stock/${id}/adjust`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await apiClient(`/inventory/stock/${id}`, {
    method: "DELETE",
  });
}
