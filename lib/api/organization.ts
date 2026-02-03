import { apiClient } from "../api-client";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  ownerId: string | null;
  settings: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  role?: {
    id: string;
    name: string;
  };
  membership?: {
    joinedAt: string;
    isActive: boolean;
  };
}

export interface UpdateOrganizationRequest {
  name?: string;
  description?: string;
  settings?: Record<string, any>;
}

export async function getOrganizations(): Promise<Organization[]> {
  const response = await apiClient<{ success: boolean; data: Organization[] }>("/api/v1/auth/organizations");
  return response.data;
}

export async function updateOrganization(id: string, data: UpdateOrganizationRequest): Promise<Organization> {
  const response = await apiClient<{ success: boolean; data: Organization }>(`/api/v1/organizations/${id}`, {
    method: "PUT",
    body: data,
  });
  return response.data;
}
