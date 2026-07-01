import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { z } from 'zod'

import { users } from './auth'
import { bakeries, organizations } from './org'

export const locations = pgTable('locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  bakeryId: uuid('bakery_id')
    .notNull()
    .references(() => bakeries.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  address: text('address'),
  phone: text('phone'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color'),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  bakeryId: uuid('bakery_id').references(() => bakeries.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  unitPrice: integer('unit_price').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const employees = pgTable('employees', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  bakeryId: uuid('bakery_id')
    .notNull()
    .references(() => bakeries.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  role: text('role').notNull(),
  status: text('status').notNull().default('active'),
  sortOrder: integer('sort_order').default(0),
  baseSalary: integer('base_salary').default(0),
  hireDate: date('hire_date'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const employeeLocations = pgTable('employee_locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id')
    .notNull()
    .references(() => locations.id, { onDelete: 'cascade' }),
  isPrimary: boolean('is_primary').default(false),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
})

export const employeeProducts = pgTable('employee_products', {
  id: uuid('id').defaultRandom().primaryKey(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  commissionPerUnit: integer('commission_per_unit').notNull().default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const salaryAdvanceStatuses = [
  'active',
  'closed',
  'cancelled',
] as const

export type SalaryAdvanceStatus = (typeof salaryAdvanceStatuses)[number]

export const salaryAdvanceInstallmentStatuses = [
  'scheduled',
  'paid',
  'rolled_over',
  'skipped',
] as const

export type SalaryAdvanceInstallmentStatus =
  (typeof salaryAdvanceInstallmentStatuses)[number]

export const salaryAdvanceRepaymentMethods = [
  'payroll_deduction',
  'cash',
] as const

export type SalaryAdvanceRepaymentMethod =
  (typeof salaryAdvanceRepaymentMethods)[number]

export const salaryAdvances = pgTable('salary_advances', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  bakeryId: uuid('bakery_id')
    .notNull()
    .references(() => bakeries.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  totalAmount: integer('total_amount').notNull(),
  installmentCount: integer('installment_count').notNull(),
  status: text('status').notNull().default('active').$type<SalaryAdvanceStatus>(),
  notes: text('notes'),
  grantedAt: timestamp('granted_at').notNull(),
  createdBy: uuid('created_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  cancelledAt: timestamp('cancelled_at'),
  cancelledBy: uuid('cancelled_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const salaryAdvanceInstallments = pgTable(
  'salary_advance_installments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    advanceId: uuid('advance_id')
      .notNull()
      .references(() => salaryAdvances.id, { onDelete: 'cascade' }),
    installmentNumber: integer('installment_number').notNull(),
    amount: integer('amount').notNull(),
    duePeriod: text('due_period'),
    status: text('status')
      .notNull()
      .default('scheduled')
      .$type<SalaryAdvanceInstallmentStatus>(),
    paymentMethod: text('payment_method').$type<SalaryAdvanceRepaymentMethod>(),
    paidAt: timestamp('paid_at'),
    rolledToInstallmentId: uuid('rolled_to_installment_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
)

export const leaveRequests = pgTable('leave_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  bakeryId: uuid('bakery_id')
    .notNull()
    .references(() => bakeries.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  type: text('type').notNull().default('annual'),
  status: text('status').notNull().default('pending'),
  reason: text('reason'),
  reviewedBy: uuid('reviewed_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  reviewedAt: timestamp('reviewed_at'),
  reviewNote: text('review_note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const deliveryRuns = pgTable('delivery_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  bakeryId: uuid('bakery_id')
    .notNull()
    .references(() => bakeries.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id')
    .notNull()
    .references(() => locations.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  status: text('status').notNull().default('draft'),
  notes: text('notes'),
  validatedAt: timestamp('validated_at'),
  validatedBy: uuid('validated_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const deliveryItems = pgTable('delivery_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id')
    .notNull()
    .references(() => deliveryRuns.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  period: text('period').notNull(),
  quantityEntrusted: integer('quantity_entrusted').notNull().default(0),
  quantityReturned: integer('quantity_returned').notNull().default(0),
  unitPrice: integer('unit_price').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const cashCollections = pgTable('cash_collections', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  bakeryId: uuid('bakery_id')
    .notNull()
    .references(() => bakeries.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id')
    .notNull()
    .references(() => locations.id, { onDelete: 'cascade' }),
  deliveryRunId: uuid('delivery_run_id').references(() => deliveryRuns.id, {
    onDelete: 'set null',
  }),
  date: date('date').notNull(),
  expectedAmount: integer('expected_amount').notNull(),
  actualAmount: integer('actual_amount'),
  cashAmount: integer('cash_amount').default(0),
  cardAmount: integer('card_amount').default(0),
  mobileAmount: integer('mobile_amount').default(0),
  variance: integer('variance'),
  status: text('status').notNull().default('pending'),
  isSettled: boolean('is_settled').default(false).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  period: text('period'),
  notes: text('notes'),
  submittedAt: timestamp('submitted_at'),
  validatedAt: timestamp('validated_at'),
  validatedBy: uuid('validated_by').references(() => users.id),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const pricingRules = pgTable('pricing_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id')
    .notNull()
    .references(() => locations.id, { onDelete: 'cascade' }),
  unitPrice: integer('unit_price').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id')
    .notNull()
    .references(() => locations.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  currentQuantity: integer('current_quantity').notNull().default(0),
  reservedQuantity: integer('reserved_quantity').notNull().default(0),
  reorderPoint: integer('reorder_point').default(0),
  maxStockLevel: integer('max_stock_level'),
  lastCountedAt: timestamp('last_counted_at'),
  lastCountedQuantity: integer('last_counted_quantity'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

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
}))

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [categories.organizationId],
    references: [organizations.id],
  }),
  products: many(products),
}))

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
}))

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
  leaveRequests: many(leaveRequests),
  salaryAdvances: many(salaryAdvances),
}))

export const salaryAdvancesRelations = relations(
  salaryAdvances,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [salaryAdvances.organizationId],
      references: [organizations.id],
    }),
    bakery: one(bakeries, {
      fields: [salaryAdvances.bakeryId],
      references: [bakeries.id],
    }),
    employee: one(employees, {
      fields: [salaryAdvances.employeeId],
      references: [employees.id],
    }),
    creator: one(users, {
      fields: [salaryAdvances.createdBy],
      references: [users.id],
    }),
    installments: many(salaryAdvanceInstallments),
  }),
)

export const salaryAdvanceInstallmentsRelations = relations(
  salaryAdvanceInstallments,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [salaryAdvanceInstallments.organizationId],
      references: [organizations.id],
    }),
    advance: one(salaryAdvances, {
      fields: [salaryAdvanceInstallments.advanceId],
      references: [salaryAdvances.id],
    }),
  }),
)

export const employeeLocationsRelations = relations(employeeLocations, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeLocations.employeeId],
    references: [employees.id],
  }),
  location: one(locations, {
    fields: [employeeLocations.locationId],
    references: [locations.id],
  }),
}))

export const employeeProductsRelations = relations(employeeProducts, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeProducts.employeeId],
    references: [employees.id],
  }),
  product: one(products, {
    fields: [employeeProducts.productId],
    references: [products.id],
  }),
}))

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  organization: one(organizations, {
    fields: [leaveRequests.organizationId],
    references: [organizations.id],
  }),
  bakery: one(bakeries, {
    fields: [leaveRequests.bakeryId],
    references: [bakeries.id],
  }),
  employee: one(employees, {
    fields: [leaveRequests.employeeId],
    references: [employees.id],
  }),
  reviewer: one(users, {
    fields: [leaveRequests.reviewedBy],
    references: [users.id],
  }),
}))

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
}))

export const deliveryItemsRelations = relations(deliveryItems, ({ one }) => ({
  run: one(deliveryRuns, {
    fields: [deliveryItems.runId],
    references: [deliveryRuns.id],
  }),
  product: one(products, {
    fields: [deliveryItems.productId],
    references: [products.id],
  }),
}))

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
}))

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
}))

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
}))

export const insertLocationSchema = z.object({
  organizationId: z.string().uuid(),
  bakeryId: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: z.enum(['shop', 'warehouse']),
  address: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const insertProductSchema = z.object({
  organizationId: z.string().uuid(),
  bakeryId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  unitPrice: z.number().int().positive(),
  description: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().optional(),
})

export const insertCategorySchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().optional(),
})

export const insertEmployeeSchema = z.object({
  organizationId: z.string().uuid(),
  bakeryId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(['delivery', 'cashier', 'manager', 'baker']),
  status: z.enum(['active', 'inactive']).optional(),
  baseSalary: z.number().int().min(0).optional(),
  hireDate: z.string().optional(),
  photoUrl: z.string().url().optional(),
})

export const insertDeliveryRunSchema = z.object({
  organizationId: z.string().uuid(),
  bakeryId: z.string().uuid(),
  employeeId: z.string().uuid(),
  locationId: z.string().uuid(),
  date: z.string(),
  status: z.enum(['draft', 'in_progress', 'validated']).optional(),
  notes: z.string().optional(),
})

export const insertDeliveryItemSchema = z.object({
  runId: z.string().uuid(),
  productId: z.string().uuid(),
  period: z.enum(['Matin', 'Après-midi', 'Soir']),
  quantityEntrusted: z.number().int().min(0),
  quantityReturned: z.number().int().min(0).optional(),
  unitPrice: z.number().int().positive(),
})

export const insertCashCollectionSchema = z.object({
  organizationId: z.string().uuid(),
  bakeryId: z.string().uuid(),
  employeeId: z.string().uuid(),
  locationId: z.string().uuid(),
  deliveryRunId: z.string().uuid().optional(),
  date: z.string(),
  expectedAmount: z.number().int().min(0),
  actualAmount: z.number().int().min(0).optional(),
  cashAmount: z.number().int().min(0).optional(),
  cardAmount: z.number().int().min(0).optional(),
  mobileAmount: z.number().int().min(0).optional(),
  status: z.enum(['pending', 'submitted', 'validated', 'rejected']).optional(),
  isSettled: z.boolean().optional(),
  period: z.string().optional(),
  notes: z.string().optional(),
})

export const insertPricingRuleSchema = z.object({
  organizationId: z.string().uuid(),
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  unitPrice: z.number().int().positive(),
  isActive: z.boolean().optional(),
})

export const insertEmployeeProductSchema = z.object({
  employeeId: z.string().uuid(),
  productId: z.string().uuid(),
  commissionPerUnit: z.number().int().min(0).default(0),
  isActive: z.boolean().optional(),
})

export const insertLeaveRequestSchema = z.object({
  organizationId: z.string().uuid(),
  bakeryId: z.string().uuid(),
  employeeId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
  type: z.enum(['annual', 'sick', 'other']).optional(),
  reason: z.string().optional(),
})

export const insertInventoryItemSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  productId: z.string().uuid(),
  currentQuantity: z.number().int().min(0).default(0),
  reservedQuantity: z.number().int().min(0).default(0),
  reorderPoint: z.number().int().min(0).optional(),
  maxStockLevel: z.number().int().min(0).optional(),
})

export type Location = typeof locations.$inferSelect
export type NewLocation = typeof locations.$inferInsert
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
export type Employee = typeof employees.$inferSelect
export type NewEmployee = typeof employees.$inferInsert
export type EmployeeLocation = typeof employeeLocations.$inferSelect
export type NewEmployeeLocation = typeof employeeLocations.$inferInsert
export type DeliveryRun = typeof deliveryRuns.$inferSelect
export type NewDeliveryRun = typeof deliveryRuns.$inferInsert
export type DeliveryItem = typeof deliveryItems.$inferSelect
export type NewDeliveryItem = typeof deliveryItems.$inferInsert
export type CashCollection = typeof cashCollections.$inferSelect
export type NewCashCollection = typeof cashCollections.$inferInsert
export type EmployeeProduct = typeof employeeProducts.$inferSelect
export type NewEmployeeProduct = typeof employeeProducts.$inferInsert
export type LeaveRequest = typeof leaveRequests.$inferSelect
export type NewLeaveRequest = typeof leaveRequests.$inferInsert
export type SalaryAdvance = typeof salaryAdvances.$inferSelect
export type NewSalaryAdvance = typeof salaryAdvances.$inferInsert
export type SalaryAdvanceInstallment =
  typeof salaryAdvanceInstallments.$inferSelect
export type NewSalaryAdvanceInstallment =
  typeof salaryAdvanceInstallments.$inferInsert
export type PricingRule = typeof pricingRules.$inferSelect
export type NewPricingRule = typeof pricingRules.$inferInsert
export type InventoryItem = typeof inventoryItems.$inferSelect
export type NewInventoryItem = typeof inventoryItems.$inferInsert
