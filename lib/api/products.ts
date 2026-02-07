import { apiClient } from "@/lib/api-client";

export interface Product {
  id: string;
  organizationId: string;
  bakeryId?: string;
  categoryId?: string;
  name: string;
  unitPrice: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  unitPrice: number;
  categoryId?: string;
  bakeryId?: string;
  description?: string;
}

export interface UpdateProductRequest {
  name?: string;
  unitPrice?: number;
  categoryId?: string;
  bakeryId?: string;
  description?: string;
  isActive?: boolean;
}

export async function getProducts(categoryId?: string): Promise<Product[]> {
  const url = categoryId ? `/api/v1/products?categoryId=${categoryId}` : "/api/v1/products";
  return apiClient<Product[]>(url);
}

export async function getProduct(id: string): Promise<Product> {
  return apiClient<Product>(`/api/v1/products/${id}`);
}

export async function createProduct(data: CreateProductRequest): Promise<Product> {
  return apiClient<Product>("/api/v1/products", {
    method: "POST",
    body: data,
  });
}

export async function updateProduct(id: string, data: UpdateProductRequest): Promise<Product> {
  return apiClient<Product>(`/api/v1/products/${id}`, {
    method: "PUT",
    body: data,
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await apiClient(`/api/v1/products/${id}`, {
    method: "DELETE",
  });
}
