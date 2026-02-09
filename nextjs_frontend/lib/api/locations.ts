import { apiClient } from "../api-client";

export type LocationType = "shop" | "warehouse";

export interface Location {
  id: string;
  organizationId: string;
  bakeryId: string;
  name: string;
  type: LocationType;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLocationRequest {
  name: string;
  type: LocationType;
  address?: string;
  phone?: string;
  bakeryId: string;
}

export interface UpdateLocationRequest {
  name?: string;
  type?: LocationType;
  address?: string;
  phone?: string;
  isActive?: boolean;
}

export async function getLocations(): Promise<Location[]> {
  return apiClient<Location[]>("/api/v1/locations");
}

export async function getLocation(id: string): Promise<Location> {
  return apiClient<Location>(`/api/v1/locations/${id}`);
}

export async function createLocation(data: CreateLocationRequest): Promise<Location> {
  return apiClient<Location>("/api/v1/locations", {
    method: "POST",
    body: data,
  });
}

export async function updateLocation(id: string, data: UpdateLocationRequest): Promise<Location> {
  return apiClient<Location>(`/api/v1/locations/${id}`, {
    method: "PUT",
    body: data,
  });
}

export async function deleteLocation(id: string): Promise<void> {
  await apiClient<{ id: string }>(`/api/v1/locations/${id}`, {
    method: "DELETE",
  });
}
