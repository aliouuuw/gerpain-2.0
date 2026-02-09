# API Specification

This document outlines the complete API specification for the rebuilt Gerpain bakery ERP system using Hono framework.

## 🎯 API Design Principles

### RESTful Design
- Resource-based URLs
- HTTP methods for actions (GET, POST, PUT, DELETE)
- Consistent response formats
- Proper HTTP status codes

### Performance & Security
- JWT-based authentication
- Request validation with Zod
- Rate limiting
- CORS configuration
- Comprehensive error handling

### Developer Experience
- Clear documentation
- Consistent naming conventions
- Type-safe responses
- OpenAPI/Swagger integration

## 🔗 Base URL Structure

```
Production:  https://api.gerpain.com/v1
Staging:     https://staging-api.gerpain.com/v1
Development: http://localhost:3000/v1
```

## 🔐 Authentication

### JWT Authentication
All protected endpoints require a valid JWT token in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

### Authentication Endpoints

#### POST /auth/login
Login with email and password or request magic link.

**Request Body:**
```typescript
{
  email: string;
  password?: string; // Optional for magic link
  requestMagicLink?: boolean;
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    token: string;
    refreshToken: string;
    user: {
      id: number;
      email: string;
      firstName: string;
      lastName: string;
      roles: Array<{
        id: number;
        name: string;
        bakeryChainId?: number;
        locationId?: number;
      }>;
    };
  };
  message?: string;
}
```

#### POST /auth/verify-magic-link
Verify magic link token.

**Request Body:**
```typescript
{
  token: string;
}
```

#### POST /auth/refresh
Refresh JWT token.

**Request Body:**
```typescript
{
  refreshToken: string;
}
```

#### POST /auth/logout
Logout and invalidate tokens.

## 🏢 Bakery Chain Management

### GET /bakery-chains
Get all bakery chains for the authenticated user.

**Response:**
```typescript
{
  success: boolean;
  data: Array<{
    id: number;
    name: string;
    description?: string;
    headquartersAddress?: string;
    contactEmail?: string;
    contactPhone?: string;
    settings: Record<string, any>;
    createdAt: string;
    updatedAt: string;
  }>;
}
```

### POST /bakery-chains
Create a new bakery chain.

**Request Body:**
```typescript
{
  name: string;
  description?: string;
  headquartersAddress?: string;
  contactEmail?: string;
  contactPhone?: string;
  taxId?: string;
  businessLicense?: string;
  settings?: Record<string, any>;
}
```

### GET /bakery-chains/:id
Get specific bakery chain details.

### PUT /bakery-chains/:id
Update bakery chain information.

### DELETE /bakery-chains/:id
Soft delete a bakery chain.

## 📍 Location Management

### GET /locations
Get all locations with filtering and pagination.

**Query Parameters:**
```typescript
{
  bakeryChainId?: number;
  locationTypeId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    locations: Array<{
      id: number;
      name: string;
      code?: string;
      address: string;
      city?: string;
      region?: string;
      phone?: string;
      email?: string;
      locationType: {
        id: number;
        name: string;
        capabilities: Record<string, any>;
      };
      manager?: {
        id: number;
        firstName: string;
        lastName: string;
      };
      operatingHours?: Record<string, any>;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
```

### POST /locations
Create a new location.

**Request Body:**
```typescript
{
  bakeryChainId: number;
  locationTypeId: number;
  name: string;
  code?: string;
  address: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  managerId?: number;
  operatingHours?: Record<string, any>;
  settings?: Record<string, any>;
}
```

### GET /locations/:id
Get specific location details.

### PUT /locations/:id
Update location information.

### DELETE /locations/:id
Soft delete a location.

### GET /location-types
Get all available location types.

## 👥 Employee Management

### GET /employees
Get employees with filtering and pagination.

**Query Parameters:**
```typescript
{
  locationId?: number;
  departmentId?: number;
  roleId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}
```

### POST /employees
Create a new employee.

**Request Body:**
```typescript
{
  employeeCode?: string;
  bakeryChainId: number;
  locationId?: number;
  departmentId?: number;
  roleId: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string; // ISO date
  hireDate: string; // ISO date
  emergencyContact?: Record<string, any>;
  compensationStructure?: {
    structureType: 'salary' | 'commission' | 'hybrid';
    baseSalary?: number;
    commissionRate?: number;
    commissionType?: 'percentage' | 'fixed_per_unit';
    commissionProducts?: Array<number>;
    effectiveFrom: string; // ISO date
  };
}
```

### GET /employees/:id
Get specific employee details.

### PUT /employees/:id
Update employee information.

### DELETE /employees/:id
Soft delete an employee.

### GET /employee-roles
Get all available employee roles.

### GET /departments
Get departments for a bakery chain.

## 📦 Inventory Management

### GET /inventory/items
Get inventory items with filtering.

**Query Parameters:**
```typescript
{
  locationId?: number;
  itemType?: 'product' | 'raw_material';
  lowStock?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    items: Array<{
      id: number;
      location: {
        id: number;
        name: string;
      };
      itemType: 'product' | 'raw_material';
      item: {
        id: number;
        name: string;
        sku?: string;
        unitOfMeasure: string;
      };
      currentQuantity: number;
      reservedQuantity: number;
      availableQuantity: number;
      reorderPoint?: number;
      maxStockLevel?: number;
      stockStatus: 'LOW_STOCK' | 'MEDIUM_STOCK' | 'GOOD_STOCK';
      lastCountedAt?: string;
      updatedAt: string;
    }>;
    pagination: PaginationInfo;
  };
}
```

### POST /inventory/transactions
Record inventory transaction.

**Request Body:**
```typescript
{
  inventoryItemId: number;
  transactionType: 'purchase' | 'production' | 'sale' | 'transfer' | 'adjustment' | 'waste' | 'return';
  quantity: number;
  unitCost?: number;
  referenceType?: string;
  referenceId?: number;
  batchNumber?: string;
  expiryDate?: string; // ISO date
  notes?: string;
}
```

### GET /inventory/transactions
Get inventory transaction history.

### GET /products
Get all products.

### POST /products
Create a new product.

### GET /raw-materials
Get all raw materials.

### POST /raw-materials
Create a new raw material.

### GET /suppliers
Get all suppliers.

### POST /suppliers
Create a new supplier.

## 🏭 Manufacturing Management

### GET /recipes
Get recipes with filtering.

**Query Parameters:**
```typescript
{
  productId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}
```

### POST /recipes
Create a new recipe.

**Request Body:**
```typescript
{
  productId: number;
  name: string;
  description?: string;
  version?: number;
  yieldQuantity: number;
  yieldUnit: string;
  preparationTime?: number; // minutes
  bakingTime?: number; // minutes
  totalTime?: number; // minutes
  difficultyLevel?: number; // 1-5
  instructions?: string;
  notes?: string;
  ingredients: Array<{
    rawMaterialId: number;
    quantity: number;
    unit: string;
    notes?: string;
    isOptional?: boolean;
  }>;
}
```

### GET /recipes/:id
Get specific recipe details including ingredients.

### PUT /recipes/:id
Update recipe information.

### GET /production-orders
Get production orders with filtering.

### POST /production-orders
Create a new production order.

**Request Body:**
```typescript
{
  orderNumber?: string; // Auto-generated if not provided
  locationId: number;
  recipeId: number;
  plannedQuantity: number;
  plannedStartDate: string; // ISO datetime
  plannedEndDate: string; // ISO datetime
  priority?: number; // 1-5
  assignedTo?: number; // employee ID
  notes?: string;
}
```

### PUT /production-orders/:id/status
Update production order status.

**Request Body:**
```typescript
{
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  actualStartDate?: string; // ISO datetime
  actualEndDate?: string; // ISO datetime
}
```

### GET /production-batches
Get production batches.

### POST /production-batches
Create a production batch.

## 💰 Sales Management

### GET /sales/transactions
Get sales transactions with filtering.

**Query Parameters:**
```typescript
{
  locationId?: number;
  employeeId?: number;
  transactionType?: 'direct_sale' | 'delivery' | 'wholesale';
  startDate?: string; // ISO date
  endDate?: string; // ISO date
  page?: number;
  limit?: number;
}
```

### POST /sales/transactions
Record a new sales transaction.

**Request Body:**
```typescript
{
  locationId: number;
  employeeId: number;
  transactionType?: 'direct_sale' | 'delivery' | 'wholesale';
  paymentMethod?: string;
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
    batchId?: number;
  }>;
  notes?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    id: number;
    transactionNumber: string;
    totalAmount: number;
    items: Array<{
      id: number;
      product: {
        id: number;
        name: string;
      };
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    transactionDate: string;
  };
}
```

### GET /sales/transactions/:id
Get specific sales transaction details.

### GET /deliveries
Get delivery transactions.

### POST /deliveries
Create a new delivery transaction.

**Request Body:**
```typescript
{
  locationId: number;
  deliveryPersonId: number;
  routeId?: number;
  deliveryDate: string; // ISO date
  items: Array<{
    productId: number;
    quantityDelivered: number;
    unitPrice: number;
    batchId?: number;
  }>;
  notes?: string;
}
```

### PUT /deliveries/:id/return
Record delivery returns.

**Request Body:**
```typescript
{
  items: Array<{
    deliveryItemId: number;
    quantityReturned: number;
    reason?: string;
  }>;
  returnTime?: string; // ISO datetime
}
```

### GET /returns
Get return transactions.

### POST /returns
Create a return transaction.

## 💵 Cash Management

### GET /cash-collections
Get cash collections with filtering.

**Query Parameters:**
```typescript
{
  locationId?: number;
  employeeId?: number;
  status?: 'pending' | 'collected' | 'reconciled' | 'disputed';
  startDate?: string; // ISO date
  endDate?: string; // ISO date
  page?: number;
  limit?: number;
}
```

### POST /cash-collections
Submit a cash collection.

**Request Body:**
```typescript
{
  locationId: number;
  employeeId: number;
  collectionPeriodStart: string; // ISO date
  collectionPeriodEnd: string; // ISO date
  expectedAmount: number;
  actualAmount?: number;
  paymentMethodBreakdown?: Record<string, number>;
  notes?: string;
}
```

### PUT /cash-collections/:id/collect
Mark cash collection as collected.

**Request Body:**
```typescript
{
  collectorId: number;
  actualAmount: number;
  collectionDate: string; // ISO datetime
  paymentMethodBreakdown?: Record<string, number>;
  notes?: string;
}
```

### GET /cash-reconciliations
Get cash reconciliations.

### POST /cash-reconciliations
Create a cash reconciliation.

**Request Body:**
```typescript
{
  locationId: number;
  reconciliationPeriodStart: string; // ISO date
  reconciliationPeriodEnd: string; // ISO date
  collectionIds: Array<number>;
  notes?: string;
}
```

### PUT /cash-reconciliations/:id/finalize
Finalize a cash reconciliation.

### GET /cash-variances
Get cash variances.

### POST /cash-variances
Record a cash variance.

## 👔 HR & Payroll Management

### GET /attendance
Get attendance records.

**Query Parameters:**
```typescript
{
  employeeId?: number;
  locationId?: number;
  startDate?: string; // ISO date
  endDate?: string; // ISO date
  status?: 'present' | 'absent' | 'late' | 'half_day' | 'sick' | 'vacation';
  page?: number;
  limit?: number;
}
```

### POST /attendance
Record attendance.

**Request Body:**
```typescript
{
  employeeId: number;
  locationId: number;
  date: string; // ISO date
  clockIn?: string; // ISO datetime
  clockOut?: string; // ISO datetime
  breakDuration?: number; // minutes
  status?: 'present' | 'absent' | 'late' | 'half_day' | 'sick' | 'vacation';
  notes?: string;
}
```

### PUT /attendance/:id
Update attendance record.

### GET /payroll/periods
Get payroll periods.

### POST /payroll/periods
Create a new payroll period.

**Request Body:**
```typescript
{
  bakeryChainId: number;
  periodName: string;
  periodType: 'weekly' | 'bi_weekly' | 'monthly';
  startDate: string; // ISO date
  endDate: string; // ISO date
}
```

### POST /payroll/periods/:id/calculate
Calculate payroll for a period.

### GET /payroll/items
Get payroll items for a period.

### PUT /payroll/items/:id/pay
Mark payroll item as paid.

### GET /employee-adjustments
Get employee adjustments (bonuses, advances, deductions).

### POST /employee-adjustments
Create an employee adjustment.

**Request Body:**
```typescript
{
  employeeId: number;
  adjustmentType: 'bonus' | 'advance' | 'deduction';
  amount: number;
  reason?: string;
  isRecurring?: boolean;
  recurringMonths?: number;
  startMonth?: string; // ISO date (YYYY-MM-01)
  endMonth?: string; // ISO date (YYYY-MM-01)
}
```

## 🚛 Fleet Management

### GET /vehicles
Get vehicles with filtering.

**Query Parameters:**
```typescript
{
  locationId?: number;
  vehicleType?: string;
  status?: 'active' | 'maintenance' | 'retired';
  assignedDriverId?: number;
  page?: number;
  limit?: number;
}
```

### POST /vehicles
Add a new vehicle.

**Request Body:**
```typescript
{
  vehicleNumber: string;
  licensePlate: string;
  vehicleType: string;
  make?: string;
  model?: string;
  year?: number;
  capacityWeight?: number;
  capacityVolume?: number;
  fuelType?: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  assignedDriverId?: number;
  locationId: number;
  purchaseDate?: string; // ISO date
  purchaseCost?: number;
  insuranceExpiry?: string; // ISO date
  registrationExpiry?: string; // ISO date
}
```

### GET /vehicles/:id
Get specific vehicle details.

### PUT /vehicles/:id
Update vehicle information.

### GET /routes
Get delivery routes.

### POST /routes
Create a new route.

### GET /delivery-schedules
Get delivery schedules.

### POST /delivery-schedules
Create a delivery schedule.

### GET /vehicle-maintenance
Get vehicle maintenance records.

### POST /vehicle-maintenance
Schedule vehicle maintenance.

## 📊 Reporting & Analytics

### GET /reports/sales-summary
Get sales summary report.

**Query Parameters:**
```typescript
{
  locationId?: number;
  startDate: string; // ISO date
  endDate: string; // ISO date
  groupBy?: 'day' | 'week' | 'month';
}
```

### GET /reports/employee-performance
Get employee performance report.

### GET /reports/inventory-status
Get inventory status report.

### GET /reports/cash-collection-summary
Get cash collection summary report.

### GET /reports/production-summary
Get production summary report.

## 🔧 System Management

### GET /system/settings
Get system settings.

### PUT /system/settings
Update system settings.

### GET /system/audit-logs
Get audit logs with filtering.

**Query Parameters:**
```typescript
{
  tableName?: string;
  recordId?: number;
  action?: 'INSERT' | 'UPDATE' | 'DELETE';
  userId?: number;
  startDate?: string; // ISO datetime
  endDate?: string; // ISO datetime
  page?: number;
  limit?: number;
}
```

## 📝 Common Response Formats

### Success Response
```typescript
{
  success: true;
  data: any; // Response data
  message?: string; // Optional success message
}
```

### Error Response
```typescript
{
  success: false;
  error: {
    code: string; // Error code
    message: string; // Human-readable error message
    details?: any; // Additional error details
  };
}
```

### Pagination Info
```typescript
{
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

## 🚨 Error Codes

### Authentication Errors
- `AUTH_INVALID_CREDENTIALS`: Invalid email or password
- `AUTH_TOKEN_EXPIRED`: JWT token has expired
- `AUTH_TOKEN_INVALID`: Invalid JWT token
- `AUTH_INSUFFICIENT_PERMISSIONS`: User lacks required permissions

### Validation Errors
- `VALIDATION_FAILED`: Request validation failed
- `REQUIRED_FIELD_MISSING`: Required field is missing
- `INVALID_FORMAT`: Field format is invalid
- `DUPLICATE_VALUE`: Value already exists

### Business Logic Errors
- `INSUFFICIENT_INVENTORY`: Not enough inventory for operation
- `INVALID_OPERATION`: Operation not allowed in current state
- `RESOURCE_NOT_FOUND`: Requested resource not found
- `BUSINESS_RULE_VIOLATION`: Operation violates business rules

### System Errors
- `INTERNAL_SERVER_ERROR`: Unexpected server error
- `DATABASE_ERROR`: Database operation failed
- `EXTERNAL_SERVICE_ERROR`: External service unavailable

## 🔒 Rate Limiting

### Rate Limits
- **Authentication endpoints**: 5 requests per minute per IP
- **General API endpoints**: 100 requests per minute per user
- **Reporting endpoints**: 10 requests per minute per user
- **Bulk operations**: 5 requests per minute per user

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 📋 Request/Response Examples

### Create Sales Transaction
**Request:**
```http
POST /v1/sales/transactions
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "locationId": 1,
  "employeeId": 5,
  "transactionType": "direct_sale",
  "paymentMethod": "cash",
  "items": [
    {
      "productId": 1,
      "quantity": 10,
      "unitPrice": 150
    },
    {
      "productId": 2,
      "quantity": 5,
      "unitPrice": 100
    }
  ],
  "notes": "Regular customer purchase"
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "data": {
    "id": 123,
    "transactionNumber": "TXN-2024-001-123",
    "totalAmount": 2000,
    "items": [
      {
        "id": 456,
        "product": {
          "id": 1,
          "name": "Pain Kilo"
        },
        "quantity": 10,
        "unitPrice": 150,
        "totalPrice": 1500
      },
      {
        "id": 457,
        "product": {
          "id": 2,
          "name": "Pain Moyen"
        },
        "quantity": 5,
        "unitPrice": 100,
        "totalPrice": 500
      }
    ],
    "transactionDate": "2024-01-15T10:30:00Z"
  }
}
```

This API specification provides a comprehensive guide for implementing and consuming the Gerpain bakery ERP API, ensuring consistency, type safety, and excellent developer experience.
