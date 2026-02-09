# User Management System Plan

## Overview

This document outlines the implementation plan for a comprehensive user management system that enables admins to create users, manage organizations, and control permissions across a multi-tenant architecture.

## Current State Analysis

### ✅ What's Already Implemented
- **Authentication System**: Complete Lucia-based auth with email verification
- **RBAC Foundation**: Role-based access control with predefined roles (admin, moderator, user)
- **Database Schema**: Users, roles, user_roles, audit logs tables
- **Permission System**: Granular permissions (create_user, manage_roles, etc.)
- **Admin Infrastructure**: Admin middleware and placeholder routes

### ❌ What's Missing
- **Organizations**: Multi-tenancy support
- **Admin User CRUD**: APIs for admins to manage users
- **Role Assignment**: Admin APIs to assign/remove user roles
- **User Listing**: Paginated user management interfaces
- **Organization Scoping**: Permissions scoped to organizations

---

## 1. Organization Multi-Tenancy Design

### Database Schema Changes

#### New Tables

```sql
-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
  description TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Organization members table
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP DEFAULT NOW(),
  joined_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(organization_id, user_id)
);

-- Organization invitations
CREATE TABLE organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Schema Updates

```sql
-- Add organization_id to existing tables where needed
ALTER TABLE users ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE audit_logs ADD COLUMN organization_id UUID REFERENCES organizations(id);
```

### Organization Types & Interfaces

```typescript
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ownerId?: string;
  settings: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  roleId?: string;
  invitedBy?: string;
  invitedAt: Date;
  joinedAt?: Date;
  isActive: boolean;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  roleId?: string;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
}
```

---

## 2. Admin User Management APIs

### API Endpoints Design

#### Organization Management
```
POST   /api/v1/admin/organizations          # Create organization
GET    /api/v1/admin/organizations          # List organizations (paginated)
GET    /api/v1/admin/organizations/:id      # Get organization details
PUT    /api/v1/admin/organizations/:id      # Update organization
DELETE /api/v1/admin/organizations/:id      # Delete organization
```

#### User Management
```
POST   /api/v1/admin/users                   # Create user (admin)
GET    /api/v1/admin/users                   # List users (paginated, filtered)
GET    /api/v1/admin/users/:id               # Get user details
PUT    /api/v1/admin/users/:id               # Update user
DELETE /api/v1/admin/users/:id               # Delete user (soft delete)
POST   /api/v1/admin/users/:id/roles         # Assign role to user
DELETE /api/v1/admin/users/:id/roles/:roleId # Remove role from user
```

#### Organization Member Management
```
GET    /api/v1/admin/organizations/:id/members           # List org members
POST   /api/v1/admin/organizations/:id/invitations       # Invite user to org
DELETE /api/v1/admin/organizations/:id/members/:userId   # Remove member
PUT    /api/v1/admin/organizations/:id/members/:userId   # Update member role
```

### Request/Response Schemas

#### Create User (Admin)
```typescript
// Request
{
  email: string;
  password?: string; // Optional - can send invite instead
  name?: string;
  organizationId?: string;
  roles?: string[]; // Role IDs to assign
  sendInvite?: boolean; // Send email invitation
}

// Response
{
  success: true;
  data: {
    user: User;
    invitationSent?: boolean;
    tempPassword?: string; // If no password provided
  }
}
```

#### List Users (Admin)
```typescript
// Request (query params)
{
  page?: number;
  limit?: number;
  organizationId?: string;
  role?: string;
  email?: string;
  isActive?: boolean;
  sortBy?: 'created_at' | 'email' | 'name';
  sortOrder?: 'asc' | 'desc';
}

// Response
{
  success: true;
  data: {
    users: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }
  }
}
```

---

## 3. Enhanced RBAC System

### Organization-Scoped Permissions

```typescript
export class RBACService {
  // Existing permissions...
  static readonly PERMISSIONS = {
    // Organization management
    CREATE_ORGANIZATION: "create_organization",
    READ_ORGANIZATION: "read_organization",
    UPDATE_ORGANIZATION: "update_organization",
    DELETE_ORGANIZATION: "delete_organization",

    // Organization member management
    MANAGE_ORG_MEMBERS: "manage_org_members",
    INVITE_ORG_MEMBERS: "invite_org_members",

    // Cross-organization permissions (super admin only)
    MANAGE_ALL_ORGANIZATIONS: "manage_all_organizations",
    MANAGE_ALL_USERS: "manage_all_users",

    // ... existing permissions
  };

  // Organization-scoped permission checking
  static async hasOrgPermission(
    userId: string,
    permission: Permission,
    organizationId?: string
  ): Promise<boolean> {
    // Check if user has global permission
    if (await this.hasPermission(userId, permission)) {
      return true;
    }

    // Check organization-specific permissions
    if (organizationId) {
      return this.hasOrgSpecificPermission(userId, permission, organizationId);
    }

    return false;
  }
}
```

### Role Hierarchy Updates

```typescript
export type RoleName = "super_admin" | "org_admin" | "moderator" | "user";

export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  super_admin: [
    // All permissions including cross-organization
    ...Object.values(PERMISSIONS)
  ],
  org_admin: [
    // Organization-specific permissions
    PERMISSIONS.READ_ORGANIZATION,
    PERMISSIONS.UPDATE_ORGANIZATION,
    PERMISSIONS.MANAGE_ORG_MEMBERS,
    PERMISSIONS.INVITE_ORG_MEMBERS,
    // User management within org
    PERMISSIONS.READ_USER,
    PERMISSIONS.UPDATE_USER,
    PERMISSIONS.ASSIGN_ROLES,
  ],
  moderator: [
    PERMISSIONS.READ_USER,
    PERMISSIONS.UPDATE_USER,
    PERMISSIONS.VIEW_AUDIT_LOGS,
  ],
  user: [
    PERMISSIONS.READ_USER,
    PERMISSIONS.UPDATE_USER,
    PERMISSIONS.MANAGE_API_KEYS,
  ],
};
```

---

## 4. Implementation Steps

### Phase 1: Database & Core Services
1. **Create database migrations** for organization tables
2. **Update schema files** with new tables and relations
3. **Implement OrganizationService** with CRUD operations
4. **Update RBACService** for organization scoping
5. **Add organization middleware** for request context

### Phase 2: Admin APIs
1. **Organization CRUD endpoints**
2. **User management endpoints** (create, list, update, delete)
3. **Role assignment endpoints**
4. **Member management endpoints**
5. **Invitation system**

### Phase 3: Frontend Integration
1. **Admin dashboard routes** and components
2. **User management UI** with tables and forms
3. **Organization management UI**
4. **Role assignment interfaces**

### Phase 4: Security & Testing
1. **Input validation** and sanitization
2. **Audit logging** for all admin actions
3. **Rate limiting** on admin endpoints
4. **Comprehensive tests** (unit, integration, e2e)
5. **Security audit** and penetration testing

---

## 5. Security Considerations

### Authorization Checks
- **Global vs Organization-scoped**: Super admins can manage everything, org admins only their org
- **Resource ownership**: Users can only manage resources they own or have permission for
- **Hierarchical permissions**: Higher roles inherit lower role permissions

### Data Protection
- **Soft deletes**: Users and organizations marked as deleted, not hard deleted
- **Audit trails**: All admin actions logged with user, timestamp, and details
- **Data isolation**: Organization data properly isolated by org_id

### API Security
- **Rate limiting**: Admin endpoints rate limited to prevent abuse
- **Request validation**: Strict input validation on all admin endpoints
- **CSRF protection**: Admin forms protected against CSRF
- **Session security**: Admin sessions have shorter timeouts

### Email & Communication
- **Secure invitations**: Time-limited tokens for organization invites
- **Email verification**: All new users verified via email
- **Notification system**: Users notified of role changes, org invites, etc.

---

## 6. Testing Strategy

### Unit Tests
- **Service methods**: OrganizationService, UserService, RBACService
- **Middleware**: Organization context, permission checks
- **Utilities**: Validation, pagination helpers

### Integration Tests
- **API endpoints**: Full request/response cycles
- **Database operations**: CRUD operations with proper constraints
- **Email sending**: Invitation and notification emails

### End-to-End Tests
- **Admin workflows**: Create org → invite users → assign roles → manage permissions
- **User journeys**: Accept invites, role changes, organization switching
- **Security scenarios**: Permission denied, unauthorized access attempts

### Test Data Strategy
- **Factories**: Test data factories for users, organizations, roles
- **Seed data**: Consistent test database state
- **Cleanup**: Proper test isolation and cleanup

---

## 7. Migration Strategy

### Database Migration
1. **Backup existing data**
2. **Run organization schema migrations**
3. **Create default organization** for existing users
4. **Migrate existing roles** to new hierarchy
5. **Update audit logs** with organization context

### Application Migration
1. **Deploy new code** with feature flags
2. **Gradual rollout**: Enable features for specific organizations first
3. **Data migration scripts**: Move existing data to new structure
4. **Backward compatibility**: Support both old and new APIs during transition

### User Migration
1. **Communication**: Notify users of new features
2. **Training**: Admin training for new management tools
3. **Support**: Help desk ready for migration questions
4. **Rollback plan**: Ability to revert if issues arise

---

## 8. Success Metrics

### Functional Metrics
- **Admin efficiency**: Time to create/manage users reduced by X%
- **User onboarding**: Time from invite to active user reduced
- **Error rates**: Admin action error rates below Y%

### Security Metrics
- **Unauthorized access**: Attempts blocked
- **Audit coverage**: Percentage of actions audited
- **Data breaches**: Zero tolerance

### Performance Metrics
- **API response times**: Admin endpoints under Z ms
- **Database query performance**: Optimized for large user bases
- **Scalability**: Support for X organizations, Y users per org

---

## 9. Future Enhancements

### Advanced Features
- **SSO Integration**: SAML/OAuth for enterprise customers
- **User Groups**: Nested permission groups within organizations
- **Bulk Operations**: Import/export users, bulk role assignments
- **Advanced Reporting**: User activity, permission usage analytics
- **API Rate Limiting**: Per-organization rate limits
- **Custom Roles**: Organization-specific custom roles and permissions

### Scalability Improvements
- **Read Replicas**: Separate read/write databases
- **Caching**: Redis caching for permissions and user data
- **Queue System**: Background processing for bulk operations
- **Multi-region**: Global deployment with data locality

This plan provides a comprehensive roadmap for implementing full user management capabilities. The phased approach ensures stability while gradually adding powerful admin features.
