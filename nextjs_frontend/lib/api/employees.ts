import { apiClient } from "../api-client";

export type EmployeeRole = "delivery" | "cashier" | "manager" | "baker";
export type EmployeeStatus = "active" | "inactive";

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: EmployeeRole;
  status: EmployeeStatus;
  sortOrder: number | null;
  locations: string[];
  commissionRate: number | null;
  baseSalary: number | null;
  hireDate: string | null;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeesParams {
  locationId?: string;
  role?: EmployeeRole;
  status?: EmployeeStatus;
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: EmployeeRole;
  status?: EmployeeStatus;
  sortOrder?: number;
  locations?: string[];
  commissionRate?: number;
  baseSalary?: number;
  hireDate?: string;
}

export interface UpdateEmployeeRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: EmployeeRole;
  status?: EmployeeStatus;
  sortOrder?: number;
  locations?: string[];
  commissionRate?: number;
  baseSalary?: number;
  hireDate?: string;
}

export interface EmployeeProduct {
  id: string;
  employeeId: string;
  productId: string;
  commissionPerUnit: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeProductInput {
  productId: string;
  commissionPerUnit: number;
  isActive: boolean;
}

export interface EmployeePerformance {
  employeeId: string;
  period: string;
  totalDeliveries: number;
  totalSales: number;
  totalCollected: number;
  averageVariance: number;
  onTimeRate: number;
}

export interface PerformanceParams {
  startDate: string;
  endDate: string;
}

export async function getEmployees(
  params: EmployeesParams = {}
): Promise<Employee[]> {
  const searchParams = new URLSearchParams();
  if (params.locationId) searchParams.set("locationId", params.locationId);
  if (params.role) searchParams.set("role", params.role);
  if (params.status) searchParams.set("status", params.status);

  const query = searchParams.toString();
  return apiClient<Employee[]>(`/api/v1/employees${query ? `?${query}` : ""}`);
}

export async function getEmployee(id: string): Promise<Employee> {
  return apiClient<Employee>(`/api/v1/employees/${id}`);
}

export async function createEmployee(
  data: CreateEmployeeRequest
): Promise<Employee> {
  return apiClient<Employee>("/api/v1/employees", {
    method: "POST",
    body: data,
  });
}

export async function updateEmployee(
  id: string,
  data: UpdateEmployeeRequest
): Promise<Employee> {
  return apiClient<Employee>(`/api/v1/employees/${id}`, {
    method: "PUT",
    body: data,
  });
}

export async function deactivateEmployee(id: string): Promise<Employee> {
  return apiClient<Employee>(`/api/v1/employees/${id}/deactivate`, {
    method: "POST",
  });
}

export async function reactivateEmployee(id: string): Promise<Employee> {
  return apiClient<Employee>(`/api/v1/employees/${id}/reactivate`, {
    method: "POST",
  });
}

export async function getEmployeePerformance(
  id: string,
  params: PerformanceParams
): Promise<EmployeePerformance> {
  const searchParams = new URLSearchParams();
  searchParams.set("startDate", params.startDate);
  searchParams.set("endDate", params.endDate);

  return apiClient<EmployeePerformance>(
    `/api/v1/employees/${id}/performance?${searchParams.toString()}`
  );
}

export async function getEmployeeProducts(id: string): Promise<EmployeeProduct[]> {
  return apiClient<EmployeeProduct[]>(`/api/v1/employees/${id}/products`);
}

export async function updateEmployeeProducts(
  id: string,
  products: EmployeeProductInput[]
): Promise<EmployeeProduct[]> {
  return apiClient<EmployeeProduct[]>(`/api/v1/employees/${id}/products`, {
    method: "PUT",
    body: { products },
  });
}

export async function reorderEmployees(
  order: { id: string; sortOrder: number }[]
): Promise<void> {
  await apiClient<void>("/api/v1/employees/reorder", {
    method: "PUT",
    body: { order },
  });
}
