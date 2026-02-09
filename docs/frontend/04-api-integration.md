# API Integration Layer Specification

## Overview

This document outlines the comprehensive API integration strategy for the Gerpain frontend, including data fetching, mutation handling, error management, and performance optimization. The integration layer provides a clean, typed interface between the frontend and backend services.

---

## Architecture Overview

### Layer Structure
```
┌─────────────────────────────────────────────────────────┐
│ Components (React Components)                            │
├─────────────────────────────────────────────────────────┤
│ Hooks (Custom React Hooks)                               │
├─────────────────────────────────────────────────────────┤
│ API Client (Base HTTP Client)                            │
├─────────────────────────────────────────────────────────┤
│ Services (Domain-Specific API Wrappers)                  │
├─────────────────────────────────────────────────────────┤
│ Backend API (REST Endpoints)                             │
└─────────────────────────────────────────────────────────┘
```

### Key Principles
- **Type Safety**: Full TypeScript coverage
- **Error Handling**: Comprehensive error management
- **Performance**: Optimistic updates and caching
- **Developer Experience**: Intuitive hooks and utilities
- **Maintainability**: Clear separation of concerns

---

## Base API Client

### Enhanced API Client
**File**: `lib/api/client.ts`

```typescript
interface ApiClientConfig {
  baseURL: string
  timeout: number
  retries: number
  retryDelay: number
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, any>
  }
  meta?: {
    pagination?: PaginationMeta
    timestamp: string
  }
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

class ApiClient {
  private config: ApiClientConfig
  private interceptors: {
    request: Array<(config: RequestConfig) => RequestConfig>
    response: Array<(response: Response) => Response | Promise<Response>>
  }

  constructor(config: Partial<ApiClientConfig> = {})
  
  // Core HTTP methods
  get<T>(path: string, params?: Record<string, any>): Promise<ApiResponse<T>>
  post<T>(path: string, data?: any): Promise<ApiResponse<T>>
  put<T>(path: string, data?: any): Promise<ApiResponse<T>>
  patch<T>(path: string, data?: any): Promise<ApiResponse<T>>
  delete<T>(path: string): Promise<ApiResponse<T>>
  
  // Utility methods
  setAuthToken(token: string): void
  clearAuthToken(): void
  addRequestInterceptor(interceptor: (config: RequestConfig) => RequestConfig): void
  addResponseInterceptor(interceptor: (response: Response) => Response): void
}
```

### Features
- **Automatic Retry**: Configurable retry logic with exponential backoff
- **Request Cancellation**: AbortController support for request cancellation
- **Response Caching**: Built-in response caching for GET requests
- **Request/Response Interceptors**: For auth, logging, and error handling
- **Type Safety**: Full TypeScript generics for response types

---

## Domain Services

### Deliveries Service
**File**: `lib/api/deliveries.ts`

```typescript
// Types
interface DeliveryRun {
  id: string
  employeeId: string
  date: string
  locationId: string
  status: 'draft' | 'in_progress' | 'validated'
  notes: string
  items: DeliveryItem[]
  createdAt: string
  updatedAt: string
}

interface DeliveryItem {
  id: string
  runId: string
  productId: string
  quantityOut: number
  quantityReturned: number
  unitPrice: number
  sellingPeriod?: 'Matin' | 'Après-midi' | 'Soir'
  createdAt: string
  updatedAt: string
}

interface CreateDeliveryRunRequest {
  employeeId: string
  date: string
  locationId: string
  notes?: string
}

interface UpdateDeliveryRunRequest {
  status?: DeliveryRun['status']
  notes?: string
}

interface CreateDeliveryItemRequest {
  productId: string
  quantityOut: number
  unitPrice: number
  sellingPeriod?: DeliveryItem['sellingPeriod']
}

interface UpdateDeliveryItemRequest {
  quantityOut?: number
  quantityReturned?: number
  unitPrice?: number
  sellingPeriod?: DeliveryItem['sellingPeriod']
}

// Service Class
class DeliveriesService {
  private apiClient: ApiClient
  
  constructor(apiClient: ApiClient)
  
  // Delivery Runs
  async getDeliveryRuns(params: {
    date: string
    locationId?: string
    employeeId?: string
    status?: DeliveryRun['status']
  }): Promise<DeliveryRun[]>
  
  async getDeliveryRun(id: string): Promise<DeliveryRun>
  
  async createDeliveryRun(data: CreateDeliveryRunRequest): Promise<DeliveryRun>
  
  async updateDeliveryRun(id: string, data: UpdateDeliveryRunRequest): Promise<DeliveryRun>
  
  async validateDeliveryRun(id: string): Promise<DeliveryRun>
  
  async deleteDeliveryRun(id: string): Promise<void>
  
  // Delivery Items
  async createDeliveryItem(runId: string, data: CreateDeliveryItemRequest): Promise<DeliveryItem>
  
  async updateDeliveryItem(id: string, data: UpdateDeliveryItemRequest): Promise<DeliveryItem>
  
  async deleteDeliveryItem(id: string): Promise<void>
  
  // Bulk Operations
  async bulkCreateDeliveryItems(runId: string, items: CreateDeliveryItemRequest[]): Promise<DeliveryItem[]>
  
  async bulkUpdateDeliveryItems(items: Array<{ id: string } & UpdateDeliveryItemRequest>): Promise<DeliveryItem[]>
  
  // Analytics
  async getDeliveryAnalytics(params: {
    startDate: string
    endDate: string
    locationId?: string
    employeeId?: string
  }): Promise<{
    totalRuns: number
    totalRevenue: number
    averageReturnRate: number
    topProducts: Array<{
      productId: string
      productName: string
      totalQuantity: number
      revenue: number
    }>
  }>
}
```

### Cash Collections Service
**File**: `lib/api/collections.ts`

```typescript
// Types
interface CashCollection {
  id: string
  employeeId: string
  date: string
  locationId: string
  expectedAmount: number
  actualAmount: number
  variance: number
  variancePercentage: number
  status: 'pending' | 'submitted' | 'validated' | 'rejected'
  paymentBreakdown: {
    cash: number
    card: number
    mobileMoney: number
    other: number
  }
  notes?: string
  rejectionReason?: string
  submittedAt?: string
  validatedAt?: string
  submittedBy?: string
  validatedBy?: string
  createdAt: string
  updatedAt: string
}

interface CreateCashCollectionRequest {
  employeeId: string
  date: string
  actualAmount: number
  paymentBreakdown: CashCollection['paymentBreakdown']
  notes?: string
}

interface UpdateCashCollectionRequest {
  actualAmount?: number
  paymentBreakdown?: CashCollection['paymentBreakdown']
  notes?: string
}

// Service Class
class CashCollectionsService {
  private apiClient: ApiClient
  
  constructor(apiClient: ApiClient)
  
  async getCashCollections(params: {
    date: string
    locationId?: string
    employeeId?: string
    status?: CashCollection['status']
  }): Promise<CashCollection[]>
  
  async getCashCollection(id: string): Promise<CashCollection>
  
  async createCashCollection(data: CreateCashCollectionRequest): Promise<CashCollection>
  
  async updateCashCollection(id: string, data: UpdateCashCollectionRequest): Promise<CashCollection>
  
  async validateCashCollection(id: string): Promise<CashCollection>
  
  async rejectCashCollection(id: string, reason: string): Promise<CashCollection>
  
  async deleteCashCollection(id: string): Promise<void>
  
  // Bulk Operations
  async bulkValidateCashCollections(ids: string[]): Promise<CashCollection[]>
  
  async bulkRejectCashCollections(requests: Array<{ id: string; reason: string }>): Promise<CashCollection[]>
  
  // Analytics
  async getCollectionsAnalytics(params: {
    startDate: string
    endDate: string
    locationId?: string
  }): Promise<{
    totalExpected: number
    totalCollected: number
    totalVariance: number
    varianceRate: number
    collectionsByStatus: Record<CashCollection['status'], number>
  }>
}
```

### Employees Service
**File**: `lib/api/employees.ts`

```typescript
// Types
interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  photo?: string
  role: EmployeeRole
  status: EmployeeStatus
  locations: EmployeeLocation[]
  compensation: EmployeeCompensation
  hireDate: string
  terminationDate?: string
  createdAt: string
  updatedAt: string
}

interface EmployeeRole {
  id: string
  name: string
  permissions: string[]
  isPrimary: boolean
}

interface EmployeeLocation {
  id: string
  locationId: string
  locationName: string
  isPrimary: boolean
  startDate: string
  endDate?: string
  accessLevel: 'full' | 'limited' | 'readonly'
}

interface EmployeeCompensation {
  payType: 'salary' | 'hourly' | 'commission'
  baseSalary?: number
  hourlyRate?: number
  commissionRate?: number
  payFrequency: 'monthly' | 'biweekly' | 'weekly'
  paymentMethod: 'bank' | 'cash' | 'mobile'
}

interface CreateEmployeeRequest {
  firstName: string
  lastName: string
  email: string
  phone?: string
  roleId: string
  locationIds: string[]
  compensation: Omit<EmployeeCompensation, 'id'>
  hireDate: string
}

interface UpdateEmployeeRequest {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  status?: EmployeeStatus
  compensation?: Partial<EmployeeCompensation>
}

// Service Class
class EmployeesService {
  private apiClient: ApiClient
  
  constructor(apiClient: ApiClient)
  
  async getEmployees(params: {
    locationId?: string
    role?: string
    status?: EmployeeStatus
    search?: string
    page?: number
    limit?: number
  }): Promise<{
    employees: Employee[]
    pagination: PaginationMeta
  }>
  
  async getEmployee(id: string): Promise<Employee>
  
  async createEmployee(data: CreateEmployeeRequest): Promise<Employee>
  
  async updateEmployee(id: string, data: UpdateEmployeeRequest): Promise<Employee>
  
  async deactivateEmployee(id: string): Promise<Employee>
  
  async activateEmployee(id: string): Promise<Employee>
  
  async terminateEmployee(id: string, terminationDate: string, reason: string): Promise<Employee>
  
  // Location Management
  async assignEmployeeToLocations(employeeId: string, locationIds: string[]): Promise<void>
  
  async removeEmployeeFromLocation(employeeId: string, locationId: string): Promise<void>
  
  // Performance Data
  async getEmployeePerformance(employeeId: string, params: {
    startDate: string
    endDate: string
  }): Promise<{
    deliveryRuns: number
    totalRevenue: number
    averageRating: number
    attendanceRate: number
    onTimeRate: number
  }>
}
```

---

## React Query Hooks

### Deliveries Hooks
**File**: `lib/hooks/useDeliveries.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { DeliveriesService } from '@/lib/api/deliveries'

// Query Hooks
export function useDeliveryRuns(params: {
  date: string
  locationId?: string
  employeeId?: string
}) {
  return useQuery({
    queryKey: queryKeys.deliveries.runs(params),
    queryFn: () => deliveriesService.getDeliveryRuns(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  })
}

export function useDeliveryRun(id: string) {
  return useQuery({
    queryKey: queryKeys.deliveries.run(id),
    queryFn: () => deliveriesService.getDeliveryRun(id),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!id,
  })
}

export function useDeliveryAnalytics(params: {
  startDate: string
  endDate: string
  locationId?: string
  employeeId?: string
}) {
  return useQuery({
    queryKey: queryKeys.deliveries.analytics(params),
    queryFn: () => deliveriesService.getDeliveryAnalytics(params),
    staleTime: 15 * 60 * 1000, // 15 minutes
  })
}

// Mutation Hooks
export function useCreateDeliveryRun() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deliveriesService.createDeliveryRun,
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.deliveries.runs() })
      
      // Add new item to cache
      queryClient.setQueryData(
        queryKeys.deliveries.run(data.id),
        data
      )
      
      // Show success toast
      toast.success('Tournée créée avec succès')
    },
    onError: (error) => {
      toast.error('Erreur lors de la création de la tournée')
      console.error('Create delivery run error:', error)
    },
  })
}

export function useUpdateDeliveryRun() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDeliveryRunRequest }) =>
      deliveriesService.updateDeliveryRun(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.deliveries.run(id) })
      
      // Snapshot previous value
      const previousRun = queryClient.getQueryData(queryKeys.deliveries.run(id))
      
      // Optimistically update
      queryClient.setQueryData(queryKeys.deliveries.run(id), (old: DeliveryRun) => ({
        ...old,
        ...data,
        updatedAt: new Date().toISOString(),
      }))
      
      return { previousRun }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(
        queryKeys.deliveries.run(variables.id),
        context?.previousRun
      )
      toast.error('Erreur lors de la mise à jour de la tournée')
    },
    onSettled: (data, error, variables) => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: queryKeys.deliveries.run(variables.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.deliveries.runs() })
    },
  })
}

export function useValidateDeliveryRun() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deliveriesService.validateDeliveryRun,
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deliveries.run(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.deliveries.runs() })
      toast.success('Tournée validée avec succès')
    },
    onError: () => {
      toast.error('Erreur lors de la validation de la tournée')
    },
  })
}

// Delivery Items Mutations
export function useCreateDeliveryItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ runId, data }: { runId: string; data: CreateDeliveryItemRequest }) =>
      deliveriesService.createDeliveryItem(runId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deliveries.run(variables.runId) })
      toast.success('Article ajouté avec succès')
    },
    onError: () => {
      toast.error('Erreur lors de l\'ajout de l\'article')
    },
  })
}

export function useUpdateDeliveryItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDeliveryItemRequest }) =>
      deliveriesService.updateDeliveryItem(id, data),
    onSuccess: (data, variables) => {
      // Find the run ID and invalidate
      queryClient.invalidateQueries({ queryKey: queryKeys.deliveries.runs() })
      toast.success('Article mis à jour avec succès')
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour de l\'article')
    },
  })
}

export function useDeleteDeliveryItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deliveriesService.deleteDeliveryItem,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deliveries.runs() })
      toast.success('Article supprimé avec succès')
    },
    onError: () => {
      toast.error('Erreur lors de la suppression de l\'article')
    },
  })
}
```

### Collections Hooks
**File**: `lib/hooks/useCollections.ts`

```typescript
// Query Hooks
export function useCashCollections(params: {
  date: string
  locationId?: string
  employeeId?: string
  status?: CashCollection['status']
}) {
  return useQuery({
    queryKey: queryKeys.cash.collections(params),
    queryFn: () => collectionsService.getCashCollections(params),
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  })
}

export function useCashCollection(id: string) {
  return useQuery({
    queryKey: queryKeys.cash.collection(id),
    queryFn: () => collectionsService.getCashCollection(id),
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  })
}

// Mutation Hooks
export function useCreateCashCollection() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: collectionsService.createCashCollection,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cash.collections() })
      queryClient.setQueryData(queryKeys.cash.collection(data.id), data)
      toast.success('Collecte enregistrée avec succès')
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'enregistrement de la collecte')
    },
  })
}

export function useValidateCashCollection() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: collectionsService.validateCashCollection,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cash.collections() })
      queryClient.invalidateQueries({ queryKey: queryKeys.cash.collection(id) })
      toast.success('Collecte validée avec succès')
    },
    onError: () => {
      toast.error('Erreur lors de la validation de la collecte')
    },
  })
}

export function useBulkValidateCashCollections() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: collectionsService.bulkValidateCashCollections,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cash.collections() })
      toast.success('Collectes validées avec succès')
    },
    onError: () => {
      toast.error('Erreur lors de la validation des collectes')
    },
  })
}
```

### Employees Hooks
**File**: `lib/hooks/useEmployees.ts`

```typescript
// Query Hooks
export function useEmployees(params: {
  locationId?: string
  role?: string
  status?: EmployeeStatus
  search?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: queryKeys.employees.list(params),
    queryFn: () => employeesService.getEmployees(params),
    staleTime: 5 * 60 * 1000,
    placeholderData: { employees: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0, hasNext: false, hasPrev: false } },
  })
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: queryKeys.employees.employee(id),
    queryFn: () => employeesService.getEmployee(id),
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  })
}

// Mutation Hooks
export function useCreateEmployee() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: employeesService.createEmployee,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.list() })
      toast.success('Employé créé avec succès')
    },
    onError: () => {
      toast.error('Erreur lors de la création de l\'employé')
    },
  })
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeRequest }) =>
      employeesService.updateEmployee(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.employees.employee(id) })
      
      const previousEmployee = queryClient.getQueryData(queryKeys.employees.employee(id))
      
      queryClient.setQueryData(queryKeys.employees.employee(id), (old: Employee) => ({
        ...old,
        ...data,
        updatedAt: new Date().toISOString(),
      }))
      
      return { previousEmployee }
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(
        queryKeys.employees.employee(variables.id),
        context?.previousEmployee
      )
      toast.error('Erreur lors de la mise à jour de l\'employé')
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.employee(variables.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.list() })
    },
  })
}
```

---

## Query Keys Management

### Enhanced Query Keys
**File**: `lib/query-keys.ts`

```typescript
export const queryKeys = {
  deliveries: {
    runs: (params?: { date?: string; locationId?: string; employeeId?: string; status?: string }) =>
      ['deliveries', 'runs', params ?? {}] as const,
    run: (id: string) => ['deliveries', 'runs', id] as const,
    analytics: (params?: { startDate?: string; endDate?: string; locationId?: string; employeeId?: string }) =>
      ['deliveries', 'analytics', params ?? {}] as const,
    items: (runId: string) => ['deliveries', 'runs', runId, 'items'] as const,
  },
  cash: {
    collections: (params?: { date?: string; locationId?: string; employeeId?: string; status?: string }) =>
      ['cash', 'collections', params ?? {}] as const,
    collection: (id: string) => ['cash', 'collections', id] as const,
    analytics: (params?: { startDate?: string; endDate?: string; locationId?: string }) =>
      ['cash', 'analytics', params ?? {}] as const,
    reconciliations: (params?: { date?: string; locationId?: string }) =>
      ['cash', 'reconciliations', params ?? {}] as const,
  },
  employees: {
    list: (params?: { locationId?: string; role?: string; status?: string; search?: string; page?: number; limit?: number }) =>
      ['employees', 'list', params ?? {}] as const,
    employee: (id: string) => ['employees', id] as const,
    performance: (id: string, params?: { startDate?: string; endDate?: string }) =>
      ['employees', id, 'performance', params ?? {}] as const,
  },
  products: {
    list: (params?: { locationId?: string; category?: string }) =>
      ['products', 'list', params ?? {}] as const,
    product: (id: string) => ['products', id] as const,
  },
  locations: {
    list: () => ['locations', 'list'] as const,
    location: (id: string) => ['locations', id] as const,
  },
  dashboard: {
    stats: (params?: { date?: string; locationId?: string }) =>
      ['dashboard', 'stats', params ?? {}] as const,
    activity: (params?: { limit?: number }) =>
      ['dashboard', 'activity', params ?? {}] as const,
    alerts: () => ['dashboard', 'alerts'] as const,
  },
} as const
```

---

## Error Handling Strategy

### Error Types
```typescript
// Base Error Class
class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Specific Error Types
class NetworkError extends ApiError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR')
  }
}

class ValidationError extends ApiError {
  constructor(message: string, public fieldErrors: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', 400, { fieldErrors })
  }
}

class AuthenticationError extends ApiError {
  constructor(message: string) {
    super(message, 'AUTHENTICATION_ERROR', 401)
  }
}

class AuthorizationError extends ApiError {
  constructor(message: string) {
    super(message, 'AUTHORIZATION_ERROR', 403)
  }
}

class NotFoundError extends ApiError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404)
  }
}

class ConflictError extends ApiError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409)
  }
}

class ServerError extends ApiError {
  constructor(message: string) {
    super(message, 'SERVER_ERROR', 500)
  }
}
```

### Error Handling Middleware
```typescript
// Error Handler Hook
export function useErrorHandler() {
  const handleError = useCallback((error: unknown) => {
    if (error instanceof ApiError) {
      switch (error.code) {
        case 'NETWORK_ERROR':
          toast.error('Erreur de connexion. Vérifiez votre internet.')
          break
        case 'VALIDATION_ERROR':
          if (error.details?.fieldErrors) {
            Object.entries(error.details.fieldErrors).forEach(([field, messages]) => {
              toast.error(`${field}: ${messages.join(', ')}`)
            })
          } else {
            toast.error(error.message)
          }
          break
        case 'AUTHENTICATION_ERROR':
          toast.error('Session expirée. Veuillez vous reconnecter.')
          // Redirect to login
          window.location.href = '/login'
          break
        case 'AUTHORIZATION_ERROR':
          toast.error('Vous n\'avez pas les permissions nécessaires.')
          break
        case 'NOT_FOUND':
          toast.error('Ressource non trouvée.')
          break
        case 'CONFLICT':
          toast.error('Conflit de données. Veuillez rafraîchir la page.')
          break
        case 'SERVER_ERROR':
          toast.error('Erreur serveur. Veuillez réessayer plus tard.')
          break
        default:
          toast.error('Une erreur est survenue.')
      }
    } else {
      toast.error('Erreur inattendue. Veuillez contacter le support.')
      console.error('Unexpected error:', error)
    }
  }, [])

  return { handleError }
}

// Error Boundary Component
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const { handleError } = useErrorHandler()
  
  return (
    <ReactQueryErrorBoundary
      onUseErrorBoundary={(error) => {
        handleError(error)
        return error instanceof ApiError && error.statusCode >= 500
      }}
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Une erreur est survenue
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] text-center max-w-md">
            {error instanceof ApiError ? error.message : 'Veuillez réessayer plus tard.'}
          </p>
          <Button onClick={resetErrorBoundary}>
            Réessayer
          </Button>
        </div>
      )}
    >
      {children}
    </ReactQueryErrorBoundary>
  )
}
```

---

## Performance Optimization

### Request Optimization
```typescript
// Request Debouncing
export function useDebouncedQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  debounceMs = 300
) {
  return useQuery({
    queryKey,
    queryFn: debounce(queryFn, debounceMs),
    staleTime: 5 * 60 * 1000,
  })
}

// Request Cancellation
export function useCancellableQuery<T>(
  queryKey: string[],
  queryFn: (signal: AbortSignal) => Promise<T>
) {
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => queryFn(signal),
    staleTime: 5 * 60 * 1000,
  })
}

// Prefetching Strategy
export function usePrefetchOnHover() {
  const queryClient = useQueryClient()
  
  const prefetch = useCallback((queryKey: string[], queryFn: () => Promise<any>) => {
    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 10 * 60 * 1000,
    })
  }, [queryClient])
  
  return { prefetch }
}
```

### Cache Management
```typescript
// Cache Configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        if (error instanceof NetworkError && failureCount < 3) {
          return true
        }
        return false
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
})

// Cache Utilities
export function useCacheUtils() {
  const queryClient = useQueryClient()
  
  const invalidateMultiple = useCallback((queries: string[][]) => {
    queries.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey })
    })
  }, [queryClient])
  
  const clearCache = useCallback((pattern: string[]) => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        return query.queryKey.some(key => 
          pattern.some(pattern => 
            typeof key === 'string' && key.includes(pattern)
          )
        )
      },
    })
  }, [queryClient])
  
  return { invalidateMultiple, clearCache }
}
```

---

## Testing Strategy

### Unit Tests
```typescript
// Service Tests
describe('DeliveriesService', () => {
  let service: DeliveriesService
  let mockApiClient: jest.Mocked<ApiClient>
  
  beforeEach(() => {
    mockApiClient = createMockApiClient()
    service = new DeliveriesService(mockApiClient)
  })
  
  describe('getDeliveryRuns', () => {
    it('should fetch delivery runs for given date', async () => {
      const mockRuns = [createMockDeliveryRun()]
      mockApiClient.get.mockResolvedValue({ success: true, data: mockRuns })
      
      const result = await service.getDeliveryRuns({ date: '2024-01-01' })
      
      expect(result).toEqual(mockRuns)
      expect(mockApiClient.get).toHaveBeenCalledWith('/deliveries/runs', {
        date: '2024-01-01',
      })
    })
    
    it('should handle API errors', async () => {
      mockApiClient.get.mockRejectedValue(new NetworkError('Connection failed'))
      
      await expect(service.getDeliveryRuns({ date: '2024-01-01' }))
        .rejects.toThrow(NetworkError)
    })
  })
})

// Hook Tests
describe('useDeliveryRuns', () => {
  it('should fetch delivery runs on mount', async () => {
    const { result } = renderHook(() => useDeliveryRuns({ date: '2024-01-01' }))
    
    expect(result.current.isLoading).toBe(true)
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toBeDefined()
    })
  })
  
  it('should refetch when date changes', async () => {
    const { result, rerender } = renderHook(
      ({ date }) => useDeliveryRuns({ date }),
      { initialProps: { date: '2024-01-01' } }
    )
    
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    
    rerender({ date: '2024-01-02' })
    
    expect(result.current.isLoading).toBe(true)
  })
})
```

### Integration Tests
```typescript
// API Integration Tests
describe('API Integration', () => {
  it('should handle complete delivery run workflow', async () => {
    // Create delivery run
    const createdRun = await deliveriesService.createDeliveryRun({
      employeeId: 'emp-1',
      date: '2024-01-01',
      locationId: 'loc-1',
    })
    
    // Add items
    const item = await deliveriesService.createDeliveryItem(createdRun.id, {
      productId: 'prod-1',
      quantityOut: 10,
      unitPrice: 1500,
    })
    
    // Update item
    await deliveriesService.updateDeliveryItem(item.id, {
      quantityReturned: 2,
    })
    
    // Validate run
    const validatedRun = await deliveriesService.validateDeliveryRun(createdRun.id)
    
    expect(validatedRun.status).toBe('validated')
  })
})
```

---

## Development Tools

### API Debugging
```typescript
// Request Logger
export function useApiLogger() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Log all API requests
      const originalFetch = window.fetch
      window.fetch = async (...args) => {
        const [url, options] = args
        console.log(`🌐 API Request: ${options?.method || 'GET'} ${url}`)
        
        const start = performance.now()
        const response = await originalFetch(...args)
        const duration = performance.now() - start
        
        console.log(`📡 API Response: ${response.status} (${duration.toFixed(2)}ms)`)
        
        return response
      }
    }
  }, [])
}

// Query DevTools
export function QueryDevTools() {
  if (process.env.NODE_ENV === 'development') {
    return <ReactQueryDevtools initialIsOpen={false} />
  }
  return null
}
```

### Performance Monitoring
```typescript
// Performance Metrics
export function usePerformanceMonitoring() {
  const queryClient = useQueryClient()
  
  useEffect(() => {
    // Monitor query performance
    const unsubscribe = queryClient.getQueryCache().subscribe({
      onError: (error, query) => {
        console.error(`Query Error: ${query.queryKey.join('.')}`, error)
      },
      onSuccess: (data, query) => {
        const duration = Date.now() - query.state.dataUpdatedAt
        if (duration > 5000) {
          console.warn(`Slow Query: ${query.queryKey.join('.')} took ${duration}ms`)
        }
      },
    })
    
    return unsubscribe
  }, [queryClient])
}
```

---

## Migration Strategy

### Phase 1: Foundation
1. Set up enhanced API client
2. Create base service classes
3. Implement error handling
4. Add query keys management

### Phase 2: Core Services
1. Implement DeliveriesService
2. Implement CashCollectionsService
3. Implement EmployeesService
4. Create basic hooks

### Phase 3: Advanced Features
1. Add optimistic updates
2. Implement caching strategies
3. Add performance monitoring
4. Create testing utilities

### Phase 4: Integration
1. Replace mock data with real API calls
2. Add error boundaries
3. Implement loading states
4. Add performance optimizations

---

## Success Metrics

### Performance Metrics
- API response time < 200ms (95th percentile)
- Page load time < 2 seconds
- Cache hit rate > 80%
- Error rate < 1%

### Developer Experience
- TypeScript coverage > 95%
- Test coverage > 80%
- Documentation completeness
- Easy onboarding experience

### User Experience
- Smooth data loading
- Graceful error handling
- Offline functionality
- Real-time updates
