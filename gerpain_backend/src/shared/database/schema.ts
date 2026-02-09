import { pgTable, text, timestamp, uuid, boolean, integer, numeric, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Roles table for RBAC
export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(), // "admin", "user", "moderator"
  description: text("description"),
  permissions: text("permissions"), // JSON array of permissions
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User roles table (many-to-many relationship)
export const userRoles = pgTable("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  roleId: uuid("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  assignedBy: uuid("assigned_by").references(() => users.id), // who assigned this role
});

// Users table for authentication
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  hashedPassword: text("hashed_password"),
  name: text("name"),
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpiresAt: timestamp("email_verification_expires_at"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiresAt: timestamp("password_reset_expires_at"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Sessions table for Lucia auth
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "date"
  }).notNull(),
});

// OAuth accounts table
export const oauthAccounts = pgTable("oauth_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // "google", "github", etc.
  providerUserId: text("provider_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// API keys table for programmatic access
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Health check logs table
export const healthCheckLogs = pgTable("health_check_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: text("status").notNull(), // "healthy", "degraded", "unhealthy"
  responseTime: integer("response_time"), // in milliseconds
  details: text("details"), // JSON string with additional info
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Organizations table for multi-tenancy
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // URL-friendly identifier
  description: text("description"),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  settings: text("settings").default("{}"), // JSON string for org settings
  tier: text("tier").default("base").notNull(), // "base", "mid", "high" - for bakery limits
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Bakeries table - primary operational units (production centers)
export const bakeries = pgTable("bakeries", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull(), // Short code for display
  address: text("address"),
  phone: text("phone"),
  settings: text("settings").default("{}"), // JSON for bakery-specific settings
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Organization members table (many-to-many with roles)
export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  roleId: uuid("role_id").references(() => roles.id, { onDelete: "cascade" }),
  invitedBy: uuid("invited_by").references(() => users.id),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  joinedAt: timestamp("joined_at"),
  isActive: boolean("is_active").default(true),
});

// Organization invitations
export const organizationInvitations = pgTable("organization_invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  roleId: uuid("role_id").references(() => roles.id, { onDelete: "cascade" }),
  invitedBy: uuid("invited_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit log table for tracking auth events
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id), // nullable for anonymous actions
  organizationId: uuid("organization_id").references(() => organizations.id), // organization context
  action: text("action").notNull(), // "login", "logout", "password_reset", "email_verification", etc.
  resource: text("resource").notNull(), // "user", "session", "api_key", "organization", etc.
  resourceId: text("resource_id"), // ID of the affected resource
  details: text("details"), // JSON string with additional details
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =====================================================
// DOMAIN ENTITIES (Gerpain-specific)
// =====================================================

// Locations table (shop, warehouse) - associated with a bakery
export const locations = pgTable("locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  bakeryId: uuid("bakery_id")
    .notNull()
    .references(() => bakeries.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // "shop", "warehouse" (no longer "bakery")
  address: text("address"),
  phone: text("phone"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Categories table for product organization
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"), // hex color code for UI
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Products table (bakery items) - can be org-wide or bakery-specific
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  bakeryId: uuid("bakery_id").references(() => bakeries.id, { onDelete: "cascade" }), // null = org-wide product
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  unitPrice: integer("unit_price").notNull(), // price in XOF (no decimals)
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Employees table (separate from users - employees may not have login)
export const employees = pgTable("employees", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  bakeryId: uuid("bakery_id")
    .notNull()
    .references(() => bakeries.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // optional link to user account
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role").notNull(), // "delivery", "cashier", "manager", "baker"
  status: text("status").notNull().default("active"), // "active", "inactive"
  commissionRate: integer("commission_rate").default(0), // percentage (0-100)
  baseSalary: integer("base_salary").default(0), // monthly base salary in FCFA
  hireDate: date("hire_date"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Employee-Location assignments (many-to-many)
export const employeeLocations = pgTable("employee_locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  isPrimary: boolean("is_primary").default(false),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

// Employee-Product assignments with per-product commission
export const employeeProducts = pgTable("employee_products", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  commissionPerUnit: integer("commission_per_unit").notNull().default(0), // FCFA per unit sold
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Delivery Runs table
export const deliveryRuns = pgTable("delivery_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  bakeryId: uuid("bakery_id")
    .notNull()
    .references(() => bakeries.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  status: text("status").notNull().default("draft"), // "draft", "in_progress", "validated"
  notes: text("notes"),
  validatedAt: timestamp("validated_at"),
  validatedBy: uuid("validated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Delivery Items table
export const deliveryItems = pgTable("delivery_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .notNull()
    .references(() => deliveryRuns.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  period: text("period").notNull(), // "Matin", "Après-midi", "Soir"
  quantityEntrusted: integer("quantity_entrusted").notNull().default(0),
  quantityReturned: integer("quantity_returned").notNull().default(0),
  unitPrice: integer("unit_price").notNull(), // snapshot of price at time of delivery
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Cash Collections table
export const cashCollections = pgTable("cash_collections", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  bakeryId: uuid("bakery_id")
    .notNull()
    .references(() => bakeries.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  deliveryRunId: uuid("delivery_run_id").references(() => deliveryRuns.id, { onDelete: "set null" }), // FK to source delivery
  date: date("date").notNull(),
  expectedAmount: integer("expected_amount").notNull(), // calculated from delivery runs
  actualAmount: integer("actual_amount"), // total collected
  cashAmount: integer("cash_amount").default(0),
  cardAmount: integer("card_amount").default(0),
  mobileAmount: integer("mobile_amount").default(0),
  variance: integer("variance"), // actualAmount - expectedAmount
  status: text("status").notNull().default("pending"), // "pending", "submitted", "validated", "rejected"
  isSettled: boolean("is_settled").default(false).notNull(), // payroll settlement flag
  period: text("period"), // flexible payroll period label like 'Jan-2026', 'Week-3'
  notes: text("notes"),
  submittedAt: timestamp("submitted_at"),
  validatedAt: timestamp("validated_at"),
  validatedBy: uuid("validated_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Pricing Rules table (location-specific pricing overrides)
export const pricingRules = pgTable("pricing_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  unitPrice: integer("unit_price").notNull(), // override price in XOF
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Inventory items table (stock levels per product per location)
export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  currentQuantity: integer("current_quantity").notNull().default(0),
  reservedQuantity: integer("reserved_quantity").notNull().default(0),
  reorderPoint: integer("reorder_point").default(0), // minimum threshold for alerts
  maxStockLevel: integer("max_stock_level"), // maximum desired stock
  lastCountedAt: timestamp("last_counted_at"),
  lastCountedQuantity: integer("last_counted_quantity"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =====================================================
// DOMAIN RELATIONS
// =====================================================

export const locationsRelations = relations(locations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [locations.organizationId],
    references: [organizations.id],
  }),
  bakery: one(bakeries, {
    fields: [locations.bakeryId],
    references: [bakeries.id],
  }),
  employeeLocations: many(employeeLocations),
  deliveryRuns: many(deliveryRuns),
  cashCollections: many(cashCollections),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [products.organizationId],
    references: [organizations.id],
  }),
  bakery: one(bakeries, {
    fields: [products.bakeryId],
    references: [bakeries.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  deliveryItems: many(deliveryItems),
  employeeProducts: many(employeeProducts),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [categories.organizationId],
    references: [organizations.id],
  }),
  products: many(products),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [employees.organizationId],
    references: [organizations.id],
  }),
  bakery: one(bakeries, {
    fields: [employees.bakeryId],
    references: [bakeries.id],
  }),
  user: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
  employeeLocations: many(employeeLocations),
  employeeProducts: many(employeeProducts),
  deliveryRuns: many(deliveryRuns),
  cashCollections: many(cashCollections),
}));

export const employeeLocationsRelations = relations(employeeLocations, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeLocations.employeeId],
    references: [employees.id],
  }),
  location: one(locations, {
    fields: [employeeLocations.locationId],
    references: [locations.id],
  }),
}));

export const employeeProductsRelations = relations(employeeProducts, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeProducts.employeeId],
    references: [employees.id],
  }),
  product: one(products, {
    fields: [employeeProducts.productId],
    references: [products.id],
  }),
}));

export const deliveryRunsRelations = relations(deliveryRuns, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [deliveryRuns.organizationId],
    references: [organizations.id],
  }),
  bakery: one(bakeries, {
    fields: [deliveryRuns.bakeryId],
    references: [bakeries.id],
  }),
  employee: one(employees, {
    fields: [deliveryRuns.employeeId],
    references: [employees.id],
  }),
  location: one(locations, {
    fields: [deliveryRuns.locationId],
    references: [locations.id],
  }),
  validatedByUser: one(users, {
    fields: [deliveryRuns.validatedBy],
    references: [users.id],
  }),
  items: many(deliveryItems),
  cashCollections: many(cashCollections),
}));

export const deliveryItemsRelations = relations(deliveryItems, ({ one }) => ({
  run: one(deliveryRuns, {
    fields: [deliveryItems.runId],
    references: [deliveryRuns.id],
  }),
  product: one(products, {
    fields: [deliveryItems.productId],
    references: [products.id],
  }),
}));

export const cashCollectionsRelations = relations(cashCollections, ({ one }) => ({
  organization: one(organizations, {
    fields: [cashCollections.organizationId],
    references: [organizations.id],
  }),
  bakery: one(bakeries, {
    fields: [cashCollections.bakeryId],
    references: [bakeries.id],
  }),
  employee: one(employees, {
    fields: [cashCollections.employeeId],
    references: [employees.id],
  }),
  location: one(locations, {
    fields: [cashCollections.locationId],
    references: [locations.id],
  }),
  deliveryRun: one(deliveryRuns, {
    fields: [cashCollections.deliveryRunId],
    references: [deliveryRuns.id],
  }),
  validatedByUser: one(users, {
    fields: [cashCollections.validatedBy],
    references: [users.id],
  }),
}));

export const pricingRulesRelations = relations(pricingRules, ({ one }) => ({
  organization: one(organizations, {
    fields: [pricingRules.organizationId],
    references: [organizations.id],
  }),
  product: one(products, {
    fields: [pricingRules.productId],
    references: [products.id],
  }),
  location: one(locations, {
    fields: [pricingRules.locationId],
    references: [locations.id],
  }),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one }) => ({
  organization: one(organizations, {
    fields: [inventoryItems.organizationId],
    references: [organizations.id],
  }),
  location: one(locations, {
    fields: [inventoryItems.locationId],
    references: [locations.id],
  }),
  product: one(products, {
    fields: [inventoryItems.productId],
    references: [products.id],
  }),
}));

// =====================================================
// ORIGINAL RELATIONS
// =====================================================

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  oauthAccounts: many(oauthAccounts),
  apiKeys: many(apiKeys),
  userRoles: many(userRoles),
  auditLogs: many(auditLogs),
  ownedOrganizations: many(organizations), // Organizations where user is owner
  organizationMemberships: many(organizationMembers), // Organization memberships
  sentInvitations: many(organizationInvitations), // Invitations sent by user
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  organizationMembers: many(organizationMembers), // Members with this role in orgs
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, {
    fields: [organizations.ownerId],
    references: [users.id],
  }),
  members: many(organizationMembers),
  invitations: many(organizationInvitations),
  bakeries: many(bakeries),
}));

// Add bakeries relations after organizationsRelations
export const bakeriesRelations = relations(bakeries, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [bakeries.organizationId],
    references: [organizations.id],
  }),
  locations: many(locations),
  employees: many(employees),
  products: many(products),
  deliveryRuns: many(deliveryRuns),
  cashCollections: many(cashCollections),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [organizationMembers.roleId],
    references: [roles.id],
  }),
  invitedBy: one(users, {
    fields: [organizationMembers.invitedBy],
    references: [users.id],
  }),
}));

export const organizationInvitationsRelations = relations(organizationInvitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationInvitations.organizationId],
    references: [organizations.id],
  }),
  role: one(roles, {
    fields: [organizationInvitations.roleId],
    references: [roles.id],
  }),
  invitedBy: one(users, {
    fields: [organizationInvitations.invitedBy],
    references: [users.id],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
  assignedBy: one(users, {
    fields: [userRoles.assignedBy],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, {
    fields: [oauthAccounts.userId],
    references: [users.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = z.object({
  email: z.string().email(),
  hashedPassword: z.string().optional(),
  name: z.string().min(1).max(255).optional(),
  emailVerified: z.boolean().optional(),
  emailVerificationToken: z.string().optional(),
  emailVerificationExpiresAt: z.date().optional(),
  passwordResetToken: z.string().optional(),
  passwordResetExpiresAt: z.date().optional(),
  lastLoginAt: z.date().optional(),
});

export const insertRoleSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  permissions: z.string().optional(), // JSON string
});

export const insertUserRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  assignedBy: z.string().uuid().optional(),
});

export const insertApiKeySchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1).max(255),
  key: z.string(),
});

export const insertAuditLogSchema = z.object({
  userId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  action: z.string().min(1),
  resource: z.string().min(1),
  resourceId: z.string().optional(),
  details: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export const insertOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  settings: z.string().optional(), // JSON string
  isActive: z.boolean().optional(),
});

export const insertOrganizationMemberSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  roleId: z.string().uuid().optional(),
  invitedBy: z.string().uuid().optional(),
  joinedAt: z.date().optional(),
  isActive: z.boolean().optional(),
});

export const insertOrganizationInvitationSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email(),
  roleId: z.string().uuid().optional(),
  invitedBy: z.string().uuid(),
  token: z.string().min(1),
  expiresAt: z.date(),
  acceptedAt: z.date().optional(),
});

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type OAuthAccount = typeof oauthAccounts.$inferSelect;
export type NewOAuthAccount = typeof oauthAccounts.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;
export type OrganizationInvitation = typeof organizationInvitations.$inferSelect;
export type NewOrganizationInvitation = typeof organizationInvitations.$inferInsert;

// =====================================================
// DOMAIN ZOD SCHEMAS
// =====================================================

export const insertLocationSchema = z.object({
  organizationId: z.string().uuid(),
  bakeryId: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: z.enum(["shop", "warehouse"]), // "bakery" removed
  address: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const insertBakerySchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  address: z.string().optional(),
  phone: z.string().optional(),
  settings: z.string().optional(), // JSON string
  isActive: z.boolean().optional(),
});

export const insertProductSchema = z.object({
  organizationId: z.string().uuid(),
  bakeryId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  unitPrice: z.number().int().positive(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const insertCategorySchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().optional(),
});

export const insertEmployeeSchema = z.object({
  organizationId: z.string().uuid(),
  bakeryId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(["delivery", "cashier", "manager", "baker"]),
  status: z.enum(["active", "inactive"]).optional(),
  commissionRate: z.number().int().min(0).max(100).optional(),
  baseSalary: z.number().int().min(0).optional(),
  hireDate: z.string().optional(), // date string
  photoUrl: z.string().url().optional(),
});

export const insertDeliveryRunSchema = z.object({
  organizationId: z.string().uuid(),
  bakeryId: z.string().uuid(),
  employeeId: z.string().uuid(),
  locationId: z.string().uuid(),
  date: z.string(), // date string
  status: z.enum(["draft", "in_progress", "validated"]).optional(),
  notes: z.string().optional(),
});

export const insertDeliveryItemSchema = z.object({
  runId: z.string().uuid(),
  productId: z.string().uuid(),
  period: z.enum(["Matin", "Après-midi", "Soir"]),
  quantityEntrusted: z.number().int().min(0),
  quantityReturned: z.number().int().min(0).optional(),
  unitPrice: z.number().int().positive(),
});

export const insertCashCollectionSchema = z.object({
  organizationId: z.string().uuid(),
  bakeryId: z.string().uuid(),
  employeeId: z.string().uuid(),
  locationId: z.string().uuid(),
  deliveryRunId: z.string().uuid().optional(),
  date: z.string(), // date string
  expectedAmount: z.number().int().min(0),
  actualAmount: z.number().int().min(0).optional(),
  cashAmount: z.number().int().min(0).optional(),
  cardAmount: z.number().int().min(0).optional(),
  mobileAmount: z.number().int().min(0).optional(),
  status: z.enum(["pending", "submitted", "validated", "rejected"]).optional(),
  isSettled: z.boolean().optional(),
  period: z.string().optional(),
  notes: z.string().optional(),
});

export const insertPricingRuleSchema = z.object({
  organizationId: z.string().uuid(),
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  unitPrice: z.number().int().positive(),
  isActive: z.boolean().optional(),
});

export const insertEmployeeProductSchema = z.object({
  employeeId: z.string().uuid(),
  productId: z.string().uuid(),
  commissionPerUnit: z.number().int().min(0).default(0),
  isActive: z.boolean().optional(),
});

export const insertInventoryItemSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  productId: z.string().uuid(),
  currentQuantity: z.number().int().min(0).default(0),
  reservedQuantity: z.number().int().min(0).default(0),
  reorderPoint: z.number().int().min(0).optional(),
  maxStockLevel: z.number().int().min(0).optional(),
});

// =====================================================
// DOMAIN TYPES
// =====================================================

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type EmployeeLocation = typeof employeeLocations.$inferSelect;
export type NewEmployeeLocation = typeof employeeLocations.$inferInsert;
export type DeliveryRun = typeof deliveryRuns.$inferSelect;
export type NewDeliveryRun = typeof deliveryRuns.$inferInsert;
export type DeliveryItem = typeof deliveryItems.$inferSelect;
export type NewDeliveryItem = typeof deliveryItems.$inferInsert;
export type CashCollection = typeof cashCollections.$inferSelect;
export type NewCashCollection = typeof cashCollections.$inferInsert;

export type EmployeeProduct = typeof employeeProducts.$inferSelect;
export type NewEmployeeProduct = typeof employeeProducts.$inferInsert;

// Pricing Rule types
export type PricingRule = typeof pricingRules.$inferSelect;
export type NewPricingRule = typeof pricingRules.$inferInsert;

// Inventory Item types
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;

// Bakery types
export type Bakery = typeof bakeries.$inferSelect;
export type NewBakery = typeof bakeries.$inferInsert;
