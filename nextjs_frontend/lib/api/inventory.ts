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
  const url = `/api/v1/inventory/stock?${params.toString()}`;
  return apiClient<InventoryResponse>(url);
}

export async function getInventoryItem(id: string): Promise<InventoryItem> {
  return apiClient<InventoryItem>(`/api/v1/inventory/stock/${id}`);
}

export async function createInventoryItem(data: CreateInventoryItemRequest): Promise<InventoryItem> {
  return apiClient<InventoryItem>("/api/v1/inventory/stock", {
    method: "POST",
    body: data,
  });
}

export async function updateInventoryItem(id: string, data: UpdateInventoryItemRequest): Promise<InventoryItem> {
  return apiClient<InventoryItem>(`/api/v1/inventory/stock/${id}`, {
    method: "PUT",
    body: data,
  });
}

export async function adjustStock(id: string, data: AdjustStockRequest): Promise<InventoryItem> {
  return apiClient<InventoryItem>(`/api/v1/inventory/stock/${id}/adjust`, {
    method: "POST",
    body: data,
  });
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await apiClient(`/api/v1/inventory/stock/${id}`, {
    method: "DELETE",
  });
}
