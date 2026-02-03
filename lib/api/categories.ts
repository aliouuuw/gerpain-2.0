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
  const response = await apiClient<{ data: Category[] }>("/categories");
  return response.data;
}

export async function getCategory(id: string): Promise<Category> {
  const response = await apiClient<{ data: Category }>(`/categories/${id}`);
  return response.data;
}

export async function createCategory(data: CreateCategoryRequest): Promise<Category> {
  const response = await apiClient<{ data: Category }>("/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function updateCategory(id: string, data: UpdateCategoryRequest): Promise<Category> {
  const response = await apiClient<{ data: Category }>(`/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient(`/categories/${id}`, {
    method: "DELETE",
  });
}
