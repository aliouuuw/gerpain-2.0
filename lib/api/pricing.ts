import { apiClient } from "@/lib/api-client";

export interface PricingRule {
  id: string;
  organizationId: string;
  productId: string;
  locationId: string;
  unitPrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePricingRuleRequest {
  productId: string;
  locationId: string;
  unitPrice: number;
}

export interface UpdatePricingRuleRequest {
  unitPrice?: number;
  isActive?: boolean;
}

export async function getPricingRules(productId?: string, locationId?: string): Promise<PricingRule[]> {
  const params = new URLSearchParams();
  if (productId) params.append("productId", productId);
  if (locationId) params.append("locationId", locationId);
  const url = `/pricing?${params.toString()}`;
  const response = await apiClient<{ data: PricingRule[] }>(url);
  return response.data;
}

export async function getPricingRule(id: string): Promise<PricingRule> {
  const response = await apiClient<{ data: PricingRule }>(`/pricing/${id}`);
  return response.data;
}

export async function createPricingRule(data: CreatePricingRuleRequest): Promise<PricingRule> {
  const response = await apiClient<{ data: PricingRule }>("/pricing", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function updatePricingRule(id: string, data: UpdatePricingRuleRequest): Promise<PricingRule> {
  const response = await apiClient<{ data: PricingRule }>(`/pricing/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function deletePricingRule(id: string): Promise<void> {
  await apiClient(`/pricing/${id}`, {
    method: "DELETE",
  });
}
