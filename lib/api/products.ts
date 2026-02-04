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
  const url = categoryId ? `/products?categoryId=${categoryId}` : "/products";
  const response = await apiClient<{ data: Product[] }>(url);
  return response.data;
}

export async function getProduct(id: string): Promise<Product> {
  const response = await apiClient<{ data: Product }>(`/products/${id}`);
  return response.data;
}

export async function createProduct(data: CreateProductRequest): Promise<Product> {
  const response = await apiClient<{ data: Product }>("/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function updateProduct(id: string, data: UpdateProductRequest): Promise<Product> {
  const response = await apiClient<{ data: Product }>(`/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function deleteProduct(id: string): Promise<void> {
  await apiClient(`/products/${id}`, {
    method: "DELETE",
  });
}
