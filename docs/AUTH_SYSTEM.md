# Authentication System Documentation

## Overview

This backend implements a comprehensive authentication system built with Hono, Lucia Auth, and PostgreSQL. It provides secure user management, role-based access control (RBAC), email verification, password reset, and audit logging.

## Architecture

### Core Components

```
src/
├── config/auth.ts          # Lucia configuration
├── middleware/
│   ├── auth.ts            # Session & API key middleware
│   └── rbac.ts            # Role-based access control
├── domains/auth/
│   ├── handlers.ts        # HTTP request handlers
│   ├── services.ts        # Business logic
│   ├── schemas.ts         # Validation schemas
│   └── routes.ts          # Route definitions
├── shared/
│   ├── database/schema.ts # Database tables & types
│   ├── email/             # Email service
│   ├── rbac/              # RBAC service
│   └── audit/             # Audit logging
```

## Database Schema

### Core Tables

- **users**: User accounts with email verification and password reset tokens
- **sessions**: Lucia-managed session storage
- **oauth_accounts**: OAuth provider accounts (infrastructure ready)
- **api_keys**: Programmatic access keys
- **roles**: RBAC roles with permissions
- **user_roles**: Many-to-many user-role relationships
- **audit_logs**: Security event logging

## Authentication Flows

### 1. User Registration (Signup)

```mermaid
graph TD
    A[POST /signup] --> B[Validate input]
    B --> C[Check email uniqueness]
    C --> D[Hash password]
    D --> E[Generate verification token]
    E --> F[Create user & assign role]
    F --> G[Send verification email]
    G --> H[Return session cookie]
```

**Features:**
- Email uniqueness validation
- Password hashing with bcrypt
- Automatic email verification token generation (24h expiry)
- Default role assignment
- Session cookie creation

### 2. Email Verification

```mermaid
graph TD
    A[User clicks email link] --> B[POST /verify-email]
    B --> C[Validate token]
    C --> D{Check expiry}
    D -->|Valid| E[Mark email verified]
    D -->|Expired| F[Return error]
    E --> G[Clear tokens]
    G --> H[Audit log event]
```

**Features:**
- Token validation and expiration
- Single-use tokens
- Audit logging
- Resend verification capability

### 3. Authentication (Signin)

```mermaid
graph TD
    A[POST /signin] --> B[Validate credentials]
    B --> C[Check password hash]
    C --> D{Success?}
    D -->|Yes| E[Create session]
    D -->|No| F[Audit failed login]
    E --> G[Set session cookie]
    E --> H[Update last login]
    E --> I[Audit successful login]
```

**Features:**
- Secure password comparison
- Session management via Lucia
- Last login timestamp tracking
- Comprehensive audit logging

### 4. Password Reset

```mermaid
graph TD
    A[POST /request-reset] --> B[Find user by email]
    B --> C[Generate reset token]
    C --> D[Send reset email]
    D --> E[User clicks link]
    E --> F[POST /reset-password]
    F --> G[Validate token & expiry]
    G --> H[Hash new password]
    H --> I[Update user & clear tokens]
    I --> J[Audit password reset]
```

**Security Features:**
- Token expiry (1 hour)
- Single-use tokens
- No email enumeration (consistent responses)
- Secure password hashing

## Role-Based Access Control (RBAC)

### Default Roles

- **admin**: Full system access
- **moderator**: User management and audit viewing
- **user**: Standard user permissions

### Permission System

```typescript
// Example permissions
CREATE_USER: "create_user"
READ_USER: "read_user"
UPDATE_USER: "update_user"
DELETE_USER: "delete_user"
MANAGE_ROLES: "manage_roles"
VIEW_AUDIT_LOGS: "view_audit_logs"
```

### Middleware Usage

```typescript
// Require authentication
auth.get("/profile", requireAuth, handler)

// Require specific role
auth.get("/admin", requireAdmin, handler)

// Require any role
auth.get("/moderate", requireAnyRole(["admin", "moderator"]), handler)

// Require permission
auth.post("/users", requirePermission("CREATE_USER"), handler)
```

## API Endpoints

### Public Endpoints
```
POST /api/v1/auth/signup
POST /api/v1/auth/signin
POST /api/v1/auth/signout
POST /api/v1/auth/verify-email
POST /api/v1/auth/resend-verification
POST /api/v1/auth/request-password-reset
POST /api/v1/auth/reset-password
```

### Protected Endpoints
```
GET  /api/v1/auth/profile
PUT  /api/v1/auth/profile
PUT  /api/v1/auth/change-password
POST /api/v1/auth/api-keys
DELETE /api/v1/auth/api-keys
```

### Admin Endpoints
```
GET /api/v1/auth/admin/users
```

## Email System

### Configuration
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@yourapp.com
FRONTEND_URL=http://localhost:5173
```

### Email Templates
- **Verification Email**: HTML template with clickable link
- **Password Reset Email**: Secure reset link with expiry notice

## Security Features

### Authentication
- Password hashing with bcrypt (10 rounds)
- Session-based authentication with Lucia
- API key authentication for programmatic access
- Secure cookie handling (HTTPOnly, Secure in production)

### Authorization
- Role-based access control
- Permission-based route protection
- User impersonation prevention

### Audit Logging
- Login/logout events
- Password changes
- Email verification events
- API key operations
- IP address and user agent tracking

### Rate Limiting
- Infrastructure ready for rate limiting
- Failed login attempt tracking
- Email sending limits

## Configuration

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://localhost:5432/base_backend_dev

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@yourapp.com
FRONTEND_URL=http://localhost:5173

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

### Database Setup
```bash
# Generate migration
bun run db:generate

# Run migration
bun run db:migrate

# Seed with admin user
bun run db:seed
```

## Usage Examples

### Client-Side Integration

```javascript
// Signup
const response = await fetch('/api/v1/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Include cookies
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    name: 'John Doe'
  })
});

// Signin
const response = await fetch('/api/v1/auth/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

// Get profile (requires auth)
const response = await fetch('/api/v1/auth/profile', {
  credentials: 'include'
});
```

### API Key Usage

```javascript
// Using API key for programmatic access
const response = await fetch('/api/v1/auth/profile', {
  headers: {
    'Authorization': 'Bearer bk_your_api_key_here'
  }
});
```

## Testing

### Test Accounts (after running seed)
- **Admin**: `admin@example.com` / `admin123`
- **User**: `test@example.com` / `password123`

### Email Testing
When email is not configured, emails are logged to console instead of being sent.

## Security Best Practices

1. **Environment Variables**: Never commit secrets
2. **HTTPS**: Always use HTTPS in production
3. **Rate Limiting**: Implement rate limiting for auth endpoints
4. **Password Policy**: Enforce strong passwords
5. **Session Management**: Configure appropriate session timeouts
6. **Audit Monitoring**: Regularly review audit logs
7. **API Keys**: Rotate API keys regularly
8. **Email Security**: Use SPF/DKIM for email authentication

## Extension Points

### Adding New Roles
1. Add role to `RBACService.ROLE_PERMISSIONS`
2. Create role in database
3. Assign to users via admin interface

### Custom Permissions
1. Add permission to `RBACService.PERMISSIONS`
2. Update role permissions
3. Use `requirePermission()` middleware

### OAuth Integration
1. Configure OAuth providers in environment
2. Implement OAuth handlers
3. Link OAuth accounts to users

### Two-Factor Authentication
1. Add TOTP secret to user schema
2. Implement TOTP verification
3. Update login flow

This authentication system provides enterprise-grade security with flexible RBAC, comprehensive audit logging, and production-ready features.
