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
  const url = `/api/v1/pricing?${params.toString()}`;
  return apiClient<PricingRule[]>(url);
}

export async function getPricingRule(id: string): Promise<PricingRule> {
  return apiClient<PricingRule>(`/api/v1/pricing/${id}`);
}

export async function createPricingRule(data: CreatePricingRuleRequest): Promise<PricingRule> {
  return apiClient<PricingRule>("/api/v1/pricing", {
    method: "POST",
    body: data,
  });
}

export async function updatePricingRule(id: string, data: UpdatePricingRuleRequest): Promise<PricingRule> {
  return apiClient<PricingRule>(`/api/v1/pricing/${id}`, {
    method: "PUT",
    body: data,
  });
}

export async function deletePricingRule(id: string): Promise<void> {
  await apiClient(`/api/v1/pricing/${id}`, {
    method: "DELETE",
  });
}
