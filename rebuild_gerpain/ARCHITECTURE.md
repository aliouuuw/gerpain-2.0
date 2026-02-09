# System Architecture

This document outlines the architectural design for the rebuilt Gerpain bakery ERP system using Hono, TypeScript, and modern development practices.

## 🏗️ Architecture Overview

### High-Level Architecture

```
┌─────────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js Frontend  │    │   Hono Backend  │    │   PostgreSQL    │
│                     │    │                 │    │                 │
│  - TailwindCSS      │◄──►│  - TypeScript   │◄──►│  - Drizzle ORM  │
│  - App Router       │    │  - Zod          │    │  - Migrations   │
│  - TanStack Query   │    │  - better-auth  │    │  - Indexing     │
└─────────────────────┘    └─────────────────┘    └─────────────────┘
```

### Design Principles

1. **Domain-Driven Design (DDD)**: Business logic organized around domains
2. **Clean Architecture**: Clear separation of concerns
3. **Type Safety**: End-to-end TypeScript with runtime validation
4. **Performance First**: Optimized for high-frequency operations
5. **Scalability**: Horizontal scaling capabilities
6. **Maintainability**: Clear code structure and documentation

## 🎯 Domain Architecture

### Core Domains

```
Bakery ERP System
├── Bakery Chain Management
│   ├── Organization settings
│   ├── Multi-chain operations
│   └── Global configurations
├── Location Management
│   ├── Location types (retail, production, warehouse)
│   ├── Location-specific settings
│   └── Inter-location operations
├── Inventory & Manufacturing
│   ├── Raw materials tracking
│   ├── Recipe management (BOM)
│   ├── Production planning
│   └── Quality control
├── Sales & Deliveries
│   ├── Volume-based sales tracking
│   ├── Delivery operations
│   ├── Return management
│   └── Performance analytics
├── Cash Management
│   ├── Collection procedures
│   ├── Reconciliation processes
│   ├── Variance tracking
│   └── Audit trails
├── HR & Workforce
│   ├── Employee management
│   ├── Mixed compensation models
│   ├── Attendance tracking
│   └── Payroll processing
└── Fleet Management
    ├── Vehicle tracking
    ├── Route optimization
    ├── Maintenance scheduling
    └── Driver management
```

## 🔧 Backend Architecture (Hono)

### Application Structure

```
backend/src/
├── app.ts                      # Main Hono application
├── server.ts                   # Server entry point
├── config/
│   ├── database.ts            # Drizzle configuration
│   ├── environment.ts         # Environment variables
│   ├── cors.ts               # CORS settings
│   └── jwt.ts                # JWT configuration
├── middleware/
│   ├── auth.ts               # Authentication middleware
│   ├── validation.ts         # Request validation
│   ├── error-handler.ts      # Global error handling
│   ├── rate-limiter.ts       # Rate limiting
│   ├── logger.ts             # Request logging
│   └── audit.ts              # Audit trail middleware
├── domains/
│   ├── bakery-chain/
│   │   ├── routes.ts         # Route definitions
│   │   ├── handlers.ts       # Request handlers
│   │   ├── services.ts       # Business logic
│   │   ├── repository.ts     # Data access layer
│   │   ├── schemas.ts        # Zod validation schemas
│   │   ├── types.ts          # TypeScript types
│   │   └── tests/            # Domain-specific tests
│   ├── locations/
│   ├── inventory/
│   ├── manufacturing/
│   ├── sales/
│   ├── cash-management/
│   ├── hr/
│   └── fleet/
├── shared/
│   ├── database/
│   │   ├── client.ts         # Drizzle client
│   │   └── transactions.ts   # Transaction helpers
│   ├── utils/
│   │   ├── date.ts           # Date utilities
│   │   ├── validation.ts     # Common validators
│   │   ├── encryption.ts     # Encryption utilities
│   │   └── formatting.ts     # Data formatting
│   ├── types/
│   │   ├── common.ts         # Common types
│   │   ├── api.ts            # API response types
│   │   └── database.ts       # Database types
│   └── constants/
│       ├── roles.ts          # User roles
│       ├── permissions.ts    # Permissions
│       └── business.ts       # Business constants
└── tests/
    ├── integration/          # Integration tests
    ├── unit/                 # Unit tests
    └── fixtures/             # Test data
```

### Domain Layer Pattern

Each domain follows a consistent pattern:

```typescript
// Domain Structure Example: Sales Domain
domains/sales/
├── routes.ts           # HTTP routes and middleware
├── handlers.ts         # Request/response handling
├── services.ts         # Business logic and orchestration
├── repository.ts       # Data access and queries
├── schemas.ts          # Input/output validation
├── types.ts           # Domain-specific types
├── events.ts          # Domain events
└── tests/
    ├── handlers.test.ts
    ├── services.test.ts
    └── repository.test.ts
```

### Request Flow

```
HTTP Request
    ↓
Middleware Stack
    ↓
Route Handler
    ↓
Input Validation (Zod)
    ↓
Service Layer (Business Logic)
    ↓
Repository Layer (Data Access)
    ↓
Database (Drizzle)
    ↓
Response Formatting
    ↓
HTTP Response
```

## 🎨 Frontend Architecture (Next.js)

### Component Architecture

```
frontend/
├── app/                   # Next.js App Router (routes, layouts, server components)
├── components/
│   ├── ui/                   # Base UI components
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── Table/
│   ├── forms/               # Form components
│   │   ├── SalesForm/
│   │   ├── EmployeeForm/
│   │   └── InventoryForm/
│   ├── charts/              # Data visualization
│   │   ├── SalesChart/
│   │   ├── InventoryChart/
│   │   └── PayrollChart/
│   └── layout/              # Layout components
│       ├── Header/
│       ├── Sidebar/
│       └── Footer/
├── lib/                    # Frontend utilities (API clients, helpers)
├── hooks/
│   ├── useAuth.ts           # Authentication hook
│   ├── useApi.ts            # API interaction hook
│   ├── useLocalStorage.ts   # Local storage hook
│   └── usePermissions.ts    # Permissions hook
├── services/
│   ├── api.ts               # API client configuration
│   ├── auth.ts              # Authentication service
│   └── storage.ts           # Local storage service
├── stores/
│   ├── authStore.ts         # Authentication state
│   ├── userStore.ts         # User preferences
│   └── cacheStore.ts        # Client-side cache
├── utils/
│   ├── formatters.ts        # Data formatting
│   ├── validators.ts        # Client-side validation
│   └── constants.ts         # Application constants
└── types/
    ├── api.ts               # API types
    ├── user.ts              # User types
    └── business.ts          # Business types
```

### State Management Strategy

1. **Server State**: TanStack Query for API data (used in client components that need caching / real-time updates)
2. **Client State**: Zustand for local application state
3. **Form State**: React Hook Form for form management
4. **URL State**: TanStack Router for navigation state

**Note**: For the MVP, all frontend content is in French only. There is no runtime internationalization system yet; i18n will be introduced in a later phase.

## 🗄️ Database Architecture

### Database Design Principles

1. **Normalization**: Proper normalization to reduce redundancy
2. **Performance**: Strategic denormalization for read-heavy operations
3. **Audit Trail**: Complete audit logging for all transactions
4. **Soft Deletes**: Preserve data integrity with soft deletion
5. **Indexing**: Optimized indexes for query performance

### Key Database Patterns

```sql
-- Audit Trail Pattern
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    user_id INTEGER,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Soft Delete Pattern
ALTER TABLE locations ADD COLUMN deleted_at TIMESTAMP NULL;
CREATE INDEX idx_locations_active ON locations (id) WHERE deleted_at IS NULL;

-- Versioning Pattern
CREATE TABLE recipe_versions (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id),
    version INTEGER NOT NULL,
    ingredients JSONB NOT NULL,
    instructions TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(recipe_id, version)
);
```

## 🔐 Security Architecture

### Authentication & Authorization

```
User Request
    ↓
better-auth session / token validation (via Hono)
    ↓
Role-Based Access Control (RBAC)
    ↓
Permission Checking
    ↓
Resource Access
```

### Security Layers

1. **Transport Security**: HTTPS/TLS encryption
2. **Authentication**: better-auth with secure session cookies and optional tokens
3. **Authorization**: Role-based permissions
4. **Input Validation**: Zod schema validation
5. **SQL Injection Prevention**: Drizzle ORM
6. **Rate Limiting**: Request throttling
7. **Audit Logging**: Complete action tracking

### Permission Model

```typescript
// Role-based permissions
interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
  conditions?: {
    locationId?: number;
    departmentId?: number;
    ownerId?: number;
  };
}

// Example roles
const ROLES = {
  ADMIN: {
    permissions: ['*:*'] // All permissions
  },
  MANAGER: {
    permissions: [
      'sales:read,create,update',
      'inventory:read,update',
      'employees:read'
    ]
  },
  CASHIER: {
    permissions: [
      'sales:create,read',
      'cash-collections:create'
    ]
  },
  DELIVERY: {
    permissions: [
      'deliveries:create,read,update',
      'routes:read'
    ]
  }
};
```

## 📊 Performance Architecture

### Caching Strategy

```
Browser Cache
    ↓
CDN Cache (Static Assets)
    ↓
Application Cache (Redis)
    ↓
Database Query Cache
    ↓
Database
```

### Performance Optimizations

1. **Database Level**:
   - Proper indexing strategy
   - Query optimization
   - Connection pooling
   - Read replicas for scaling

2. **Application Level**:
   - Response caching
   - Database query optimization
   - Lazy loading
   - Pagination

3. **Frontend Level**:
   - Code splitting
   - Lazy loading
   - Image optimization
   - Bundle optimization

### Monitoring & Observability

```
Application Metrics
├── Performance Metrics
│   ├── Response times
│   ├── Throughput
│   └── Error rates
├── Business Metrics
│   ├── Sales volume
│   ├── Cash collection rates
│   └── Employee productivity
└── Infrastructure Metrics
    ├── Database performance
    ├── Memory usage
    └── CPU utilization
```

## 🚀 Deployment Architecture

### Environment Strategy

```
Development → Staging → Production
     ↓           ↓         ↓
   Local DB → Test DB → Prod DB
```

### Deployment Options

1. **Traditional Deployment**:
   - Node.js on VPS/Cloud
   - PM2 for process management
   - Nginx reverse proxy

2. **Containerized Deployment**:
   - Docker containers
   - Kubernetes orchestration
   - Auto-scaling capabilities

3. **Serverless Deployment**:
   - Cloudflare Workers
   - Vercel Functions
   - AWS Lambda

### Infrastructure Components

```
Load Balancer
    ↓
Application Servers (Multiple instances)
    ↓
Database Cluster (Primary + Replicas)
    ↓
Cache Layer (Redis)
    ↓
File Storage (S3/CloudFlare R2)
```

## 🔄 Integration Architecture

### External Integrations

1. **Payment Processing**: FedaPay integration
2. **Email Service**: Resend for notifications
3. **SMS Service**: For delivery notifications
4. **Accounting Software**: Export capabilities
5. **Reporting Tools**: Business intelligence integration

### API Design

```typescript
// RESTful API structure
/api/v1/
├── /auth                    # Authentication
├── /bakery-chains          # Chain management
├── /locations              # Location operations
├── /inventory              # Inventory management
├── /manufacturing          # Production operations
├── /sales                  # Sales transactions
├── /deliveries             # Delivery operations
├── /cash-management        # Cash operations
├── /hr                     # Human resources
├── /fleet                  # Fleet management
└── /reports                # Reporting endpoints
```

This architecture provides a solid foundation for building a scalable, maintainable, and high-performance bakery ERP system that addresses the specific needs of your business operations.
