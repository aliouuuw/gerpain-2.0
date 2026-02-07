import { apiClient } from "@/lib/api-client";

export interface Category {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  color?: string;
  sortOrder?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export async function getCategories(): Promise<Category[]> {
  return apiClient<Category[]>("/api/v1/categories");
}

export async function getCategory(id: string): Promise<Category> {
  return apiClient<Category>(`/api/v1/categories/${id}`);
}

export async function createCategory(data: CreateCategoryRequest): Promise<Category> {
  return apiClient<Category>("/api/v1/categories", {
    method: "POST",
    body: data,
  });
}

export async function updateCategory(id: string, data: UpdateCategoryRequest): Promise<Category> {
  return apiClient<Category>(`/api/v1/categories/${id}`, {
    method: "PUT",
    body: data,
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient(`/api/v1/categories/${id}`, {
    method: "DELETE",
  });
}
