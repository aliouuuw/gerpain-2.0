import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { z } from 'zod'

import { roles, users } from './auth'

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
  settings: text('settings').default('{}'),
  tier: text('tier').default('base').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const bakeries = pgTable('bakeries', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code').notNull(),
  address: text('address'),
  phone: text('phone'),
  settings: text('settings').default('{}'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const organizationMembers = pgTable('organization_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }),
  invitedBy: uuid('invited_by').references(() => users.id),
  invitedAt: timestamp('invited_at').defaultNow().notNull(),
  joinedAt: timestamp('joined_at'),
  isActive: boolean('is_active').default(true),
})

export const organizationInvitations = pgTable('organization_invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }),
  invitedBy: uuid('invited_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  organizationId: uuid('organization_id').references(() => organizations.id),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  details: text('details'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, {
    fields: [organizations.ownerId],
    references: [users.id],
  }),
  members: many(organizationMembers),
  invitations: many(organizationInvitations),
  bakeries: many(bakeries),
}))

export const bakeriesRelations = relations(bakeries, ({ one }) => ({
  organization: one(organizations, {
    fields: [bakeries.organizationId],
    references: [organizations.id],
  }),
}))

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
}))

export const organizationInvitationsRelations = relations(
  organizationInvitations,
  ({ one }) => ({
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
  }),
)

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
}))

export const insertAuditLogSchema = z.object({
  userId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  action: z.string().min(1),
  resource: z.string().min(1),
  resourceId: z.string().optional(),
  details: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
})

export const insertOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  settings: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const insertOrganizationMemberSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  roleId: z.string().uuid().optional(),
  invitedBy: z.string().uuid().optional(),
  joinedAt: z.date().optional(),
  isActive: z.boolean().optional(),
})

export const insertOrganizationInvitationSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email(),
  roleId: z.string().uuid().optional(),
  invitedBy: z.string().uuid(),
  token: z.string().min(1),
  expiresAt: z.date(),
  acceptedAt: z.date().optional(),
})

export const insertBakerySchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  address: z.string().optional(),
  phone: z.string().optional(),
  settings: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert
export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert
export type OrganizationMember = typeof organizationMembers.$inferSelect
export type NewOrganizationMember = typeof organizationMembers.$inferInsert
export type OrganizationInvitation = typeof organizationInvitations.$inferSelect
export type NewOrganizationInvitation = typeof organizationInvitations.$inferInsert
export type Bakery = typeof bakeries.$inferSelect
export type NewBakery = typeof bakeries.$inferInsert
