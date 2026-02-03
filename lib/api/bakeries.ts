import { apiClient } from "../api-client";

export interface Bakery {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  settings: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBakeryRequest {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  settings?: Record<string, any>;
}

export interface UpdateBakeryRequest {
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  settings?: Record<string, any>;
  isActive?: boolean;
}

export interface BakeryTierStatus {
  allowed: boolean;
  current: number;
  limit: number;
}

export async function getBakeries(): Promise<Bakery[]> {
  return apiClient<Bakery[]>("/api/v1/bakeries");
}

export async function getBakery(id: string): Promise<Bakery> {
  return apiClient<Bakery>(`/api/v1/bakeries/${id}`);
}

export async function getBakeryTierStatus(): Promise<BakeryTierStatus> {
  return apiClient<BakeryTierStatus>("/api/v1/bakeries/tier/status");
}

export async function createBakery(data: CreateBakeryRequest): Promise<Bakery> {
  return apiClient<Bakery>("/api/v1/bakeries", {
    method: "POST",
    body: data,
  });
}

export async function updateBakery(id: string, data: UpdateBakeryRequest): Promise<Bakery> {
  return apiClient<Bakery>(`/api/v1/bakeries/${id}`, {
    method: "PUT",
    body: data,
  });
}

export async function deleteBakery(id: string): Promise<Bakery> {
  return apiClient<Bakery>(`/api/v1/bakeries/${id}`, {
    method: "DELETE",
  });
}
