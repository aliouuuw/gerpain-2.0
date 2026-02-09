# Gerpain Bakery ERP - Rebuild Project

A modern, high-performance bakery chain management system built with Hono, TypeScript, and PostgreSQL.

## 🎯 Project Overview

This is a complete rebuild of the Gerpain bakery management system, designed to address architectural issues and provide a robust, scalable solution for bakery chain operations.

### Key Features

- **Bakery Chain Management**: Multi-location bakery operations
- **Location-Based Operations**: Flexible location management (retail, production, warehouse)
- **Inventory & Manufacturing**: Raw materials tracking, recipe management, production planning
- **Sales & Deliveries**: Volume-focused sales tracking without customer dependency
- **Cash Management**: Flexible collection procedures with reconciliation
- **HR & Payroll**: Mixed compensation models (salary + commission)
- **Fleet Management**: Delivery operations and route optimization

## 🚀 Tech Stack

### Backend
- **Framework**: [Hono](https://hono.dev/) - Ultra-fast web framework
- **Runtime**: Node.js (with Bun/Deno support)
- **Database**: PostgreSQL with Drizzle ORM
- **Language**: TypeScript
- **Validation**: Zod
- **Authentication**: better-auth (Hono integration; session/cookie-based)
- **Testing**: Vitest

### Frontend
- **Framework**: Next.js 16 (App Router, React 19)
- **Styling**: TailwindCSS
- **Data Fetching / Server State**: TanStack Query (for client components that need caching / real-time updates)
- **Routing**: Next.js App Router
- **Forms**: React Hook Form
- **Language**: French-only UI for the MVP (no i18n system yet)

## 📁 Project Structure

```
bakery-erp/
├── backend/                    # Hono API server
│   ├── src/
│   │   ├── app.ts             # Main Hono application
│   │   ├── domains/           # Domain-driven design modules
│   │   ├── middleware/        # Custom middleware
│   │   ├── shared/           # Shared utilities
│   │   └── server.ts         # Server entry point
│   ├── drizzle/              # Database schema and migrations
│   ├── tests/                # Backend tests
│   └── package.json
├── frontend/                  # Next.js application
│   ├── app/                  # App Router (routes, layouts, server components)
│   ├── components/           # Reusable UI components
│   ├── lib/                  # Frontend utilities (API clients, helpers)
│   ├── public/               # Static assets
│   └── package.json
└── docs/                     # Documentation
```

## 🏗️ Architecture Principles

### Domain-Driven Design
The system is organized around business domains:
- **Bakery Chain**: Organization management
- **Locations**: Multi-location operations
- **Inventory**: Raw materials and finished goods
- **Manufacturing**: Production planning and recipes
- **Sales**: Transaction tracking and reporting
- **Cash Management**: Collection and reconciliation
- **HR**: Employee management and payroll
- **Fleet**: Delivery operations

### Performance First
- Ultra-fast API responses with Hono
- Optimized database queries with Drizzle
- Efficient caching strategies
- Minimal bundle sizes

### Type Safety
- End-to-end TypeScript
- Runtime validation with Zod
- Database type safety with Drizzle
- API contract enforcement

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ (or Bun/Deno)
- PostgreSQL 14+
- Git

### Quick Start

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd bakery-erp
   ```

2. **Backend Setup**
   ```bash
   cd backend
   bun install
   cp .env.example .env
   # Configure your database URL in .env
   bunx drizzle-kit migrate
   bunx drizzle-kit seed
   bun run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   bun install
   cp .env.example .env
   # Configure API URL in .env
   bun run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000
   - API Documentation: http://localhost:3000/docs

## 📚 Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Database Design](./DATABASE_DESIGN.md)
- [API Specification](./API_SPECIFICATION.md)
- [Business Requirements](./BUSINESS_REQUIREMENTS.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Migration Plan](./MIGRATION_PLAN.md)
- [Auth – Installation (better-auth)](./better-auth-intsallation.md)
- [Auth – Hono Integration (better-auth)](./better-auth-hono.md)
- [Frontend Backlog](./FRONTEND_BACKLOG.md)
- [Development Activity Log](./DEVELOPMENT_ACTIVITY_LOG.md)

## 🔧 Development

### Available Scripts

**Backend:**
```bash
bun run dev          # Start development server
bun run build        # Build for production
bun run start        # Start production server
bun run test         # Run tests
bun run db:migrate   # Run database migrations
bun run db:seed      # Seed database
```

**Frontend:**
```bash
bun run dev          # Start development server
bun run build        # Build for production
bun run preview      # Preview production build
bun run test         # Run tests
bun run lint         # Lint code
```

## 🚀 Deployment

The application supports multiple deployment options:
- **Traditional**: Node.js on VPS/Cloud
- **Serverless**: Cloudflare Workers, Vercel
- **Edge**: Deno Deploy
- **Container**: Docker with Kubernetes

See [Deployment Guide](./DEPLOYMENT_GUIDE.md) for detailed instructions.

## 🧪 Testing

- **Unit Tests**: Domain logic and utilities
- **Integration Tests**: API endpoints
- **E2E Tests**: Critical user workflows
- **Performance Tests**: Load testing for high-traffic operations

## 📈 Performance Targets

- **API Response Time**: < 100ms for 95% of requests
- **Database Queries**: < 50ms average
- **Frontend Load Time**: < 2s initial load
- **Concurrent Users**: 1000+ simultaneous users

## 🔒 Security

- better-auth-based authentication integrated with Hono (session cookies & tokens)
- Role-based access control
- Input validation and sanitization
- SQL injection prevention
- Rate limiting
- CORS configuration

## 🤝 Contributing

1. Follow the development guidelines in [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
2. Write tests for new features
3. Update documentation as needed
4. Follow TypeScript and ESLint rules

## 📄 License

This project is proprietary software for Gerpain bakery operations.

## 📞 Support

For technical support or questions about the rebuild process, refer to:
- [Troubleshooting Guide](./docs/TROUBLESHOOTING.md)
- [Performance Considerations](./docs/PERFORMANCE_CONSIDERATIONS.md)
- [Security Guidelines](./docs/SECURITY_GUIDELINES.md)
