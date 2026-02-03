import { apiClient } from "../api-client";

export type LocationType = "bakery" | "shop" | "warehouse";

export interface Location {
  id: string;
  organizationId: string;
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
}

export interface UpdateLocationRequest {
  name?: string;
  type?: LocationType;
  address?: string;
  phone?: string;
  isActive?: boolean;
}

export async function getLocations(): Promise<Location[]> {
  const response = await apiClient<{ success: boolean; data: Location[] }>("/api/v1/locations");
  return response.data;
}

export async function getLocation(id: string): Promise<Location> {
  const response = await apiClient<{ success: boolean; data: Location }>(`/api/v1/locations/${id}`);
  return response.data;
}

export async function createLocation(data: CreateLocationRequest): Promise<Location> {
  const response = await apiClient<{ success: boolean; data: Location }>("/api/v1/locations", {
    method: "POST",
    body: data,
  });
  return response.data;
}

export async function updateLocation(id: string, data: UpdateLocationRequest): Promise<Location> {
  const response = await apiClient<{ success: boolean; data: Location }>(`/api/v1/locations/${id}`, {
    method: "PUT",
    body: data,
  });
  return response.data;
}

export async function deleteLocation(id: string): Promise<void> {
  await apiClient<{ success: boolean; data: { id: string } }>(`/api/v1/locations/${id}`, {
    method: "DELETE",
  });
}
