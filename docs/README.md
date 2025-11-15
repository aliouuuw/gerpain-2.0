# Base Backend Template (Hono + Bun)

A minimal, production-ready backend starter with great DX. Consolidated documentation.

## Overview

- Runtime: Bun
- Framework: Hono
- Language: TypeScript
- Goals: fast start, clear conventions, easy deployment, extensible domains

## Getting Started

### Prerequisites
- Install Bun (see `https://bun.sh`)

### Install & Run
```
bun install
bun run --hot src/index.ts
```
Open `http://localhost:3000`.

## Architecture

```
src/
  index.ts        # App entry (Hono instance)
```
- Minimal core, easy to extend
- Stateless HTTP handlers
- Add domains under `src/` (e.g., `src/domains/users`)
- Use middleware for cross-cutting concerns (auth, logging)

## API Conventions

- Versioning: prefix APIs with `/api/v1`
- Success response:
```
{
  "success": true,
  "data": {}
}
```
- Error response:
```
{
  "success": false,
  "error": { "code": "STRING_CODE", "message": "Human readable message", "details": {} }
}
```
- Pagination: `?page=1&limit=20` with response meta `{ page, limit, total, totalPages }`

## Authentication 

- Lucia for session-based auth
- OAuth providers (Google, GitHub) via Lucia adapters
- API keys for programmatic access
- Add `src/middleware/auth.ts` to protect routes and attach `user` to context

## Database & Migrations

- Recommended: Drizzle ORM + PostgreSQL
- Suggested layout:
```
src/config/database.ts
src/shared/database/
```
- Migrations: `drizzle-kit` with artifacts in `/drizzle`
- Seeding: `src/scripts/seed.ts`

## Development & Deployment

- Local dev:
```
bun install
bun run --hot src/index.ts
```
- Env vars: add `.env` and load via your preferred loader
- Lint/testing: add ESLint/Vitest as needed
- Deploy: Vercel (Hono + Bun) or Docker (Bun base image)

## Endpoints

Use the interactive API reference at `/api/v1/docs` and OpenAPI at `/api/v1/openapi.json`.

### Base URLs

- **Root**: `/` — service info
- **API base**: `/api/v1`
- **Docs**: `/api/v1/docs`
- **OpenAPI JSON**: `/api/v1/openapi.json`
- **Health**: `/health`, `/health/ready`, `/health/live`

### Auth

- `POST /api/v1/auth/signup` — create user
- `POST /api/v1/auth/signin` — sign in (sets session cookie)
- `POST /api/v1/auth/signout` — sign out (clears session)
- `POST /api/v1/auth/verify-email` — verify email (token)
- `POST /api/v1/auth/resend-verification` — resend verification email
- `POST /api/v1/auth/request-password-reset` — request reset email
- `POST /api/v1/auth/reset-password` — reset password (token)
- `GET /api/v1/auth/profile` — get current user profile (protected)
- `PUT /api/v1/auth/profile` — update current user profile (protected)
- `PUT /api/v1/auth/change-password` — change password (protected)
- `POST /api/v1/auth/api-keys` — create API key (protected)
- `DELETE /api/v1/auth/api-keys` — revoke API key (protected)

Notes:
- Protected = requires valid session cookie. API key auth is supported for key validation but admin routes below require a session.

### Admin

All admin routes are under `/api/v1/admin` and require a valid session. Most require global admin; org-scoped endpoints require org admin or specific permissions. Provide organization context via header `X-Organization-ID: <orgId>` when operating on a specific organization.

#### Users

- `POST /api/v1/admin/users` — create user (global admin)
- `GET /api/v1/admin/users` — list users (global admin)
- `GET /api/v1/admin/users/:id` — get user (global admin)
- `PUT /api/v1/admin/users/:id` — update user (global admin)
- `DELETE /api/v1/admin/users/:id` — delete user (global admin)

#### User Roles

- `POST /api/v1/admin/users/:id/roles` — assign role (global admin)
- `DELETE /api/v1/admin/users/:id/roles/:roleId` — remove role (global admin)

#### Organizations

- `POST /api/v1/admin/organizations` — create organization (global admin)
- `GET /api/v1/admin/organizations` — list organizations (global admin)
- `GET /api/v1/admin/organizations/:id` — get organization (org admin)
- `PUT /api/v1/admin/organizations/:id` — update organization (org admin)
- `DELETE /api/v1/admin/organizations/:id` — delete organization (org admin)

#### Organization Members

- `POST /api/v1/admin/organizations/:id/invitations` — invite user (permission: `INVITE_ORG_MEMBERS`)
- `DELETE /api/v1/admin/organizations/:id/members/:userId` — remove member (permission: `MANAGE_ORG_MEMBERS`)

Optional/dev:
- `GET /api/v1/auth/admin/users` — placeholder example admin users endpoint (requires admin)

## Roadmap

- Database layer with Drizzle + Postgres
- Auth service, middleware and session management
- Standard error handler and structured logging
- File uploads (S3) and signed URLs
- Health checks and `/api/v1` scaffold
- Background jobs and queues (Redis/BullMQ)
- Webhooks and notifications module
- OpenAPI generation and SDK publishing
