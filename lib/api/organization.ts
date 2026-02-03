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
  return apiClient<Organization[]>("/api/v1/auth/organizations");
}

export async function updateOrganization(id: string, data: UpdateOrganizationRequest): Promise<Organization> {
  return apiClient<Organization>(`/api/v1/organizations/${id}`, {
    method: "PUT",
    body: data,
  });
}
