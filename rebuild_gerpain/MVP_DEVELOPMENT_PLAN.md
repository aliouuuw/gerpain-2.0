# MVP Development Plan

This document outlines the comprehensive MVP development strategy for the Gerpain bakery ERP system, designed for testing with 2 potential bakery chain clients.

## 🎯 MVP Overview

### **Target Clients**
- **Client 1**: Small Chain (2-3 locations) - Focus on basic operations and multi-location management
- **Client 2**: Medium Chain (5-7 locations) - Test scalability and advanced reporting

### **MVP Goals**
- Validate core value proposition with real bakery operations
- Establish product-market fit
- Gather user feedback for future development
- Demonstrate ROI within 3 months

## 🚀 MVP Scope (8-10 weeks)

### **Core Features to Include**

#### **🏢 Multi-Location Management**
- [ ] Bakery chain setup and configuration
- [ ] Location management (retail, production, warehouse)
- [ ] User roles and permissions (Owner, Manager, Employee)
- [ ] Multi-tenant architecture with data isolation

#### **💰 Sales & Revenue Tracking**
- [ ] Volume-based sales transactions
- [ ] Multiple payment methods (cash, card, mobile money)
- [ ] Real-time sales dashboard
- [ ] Sales performance reports by location and employee
- [ ] Transaction history and search

#### **📦 Inventory Management**
- [ ] Product catalog (bread types, pastries, beverages)
- [ ] Real-time stock tracking with automatic updates
- [ ] Low stock alerts and reorder notifications
- [ ] Inventory movement tracking (sales, adjustments, transfers)
- [ ] Stock valuation and cost tracking

#### **💵 Cash Management**
- [ ] Daily cash collection procedures
- [ ] Cash reconciliation with variance tracking
- [ ] Payment method breakdown
- [ ] Cash flow reports and analytics
- [ ] Discrepancy resolution workflow

#### **👥 Employee Management**
- [ ] Employee registration and role assignment
- [ ] Basic attendance tracking (clock in/out)
- [ ] Simple payroll calculation (salary + commission)
- [ ] Employee performance metrics
- [ ] Commission tracking and calculation

#### **📊 Reporting & Analytics**
- [ ] Sales performance by location and employee
- [ ] Inventory turnover and stock status reports
- [ ] Cash collection efficiency metrics
- [ ] Daily, weekly, and monthly summary reports
- [ ] Export functionality (PDF, Excel)

#### **🎨 User Experience**
- [ ] Mobile-first responsive design
- [ ] Offline capability for sales transactions
- [ ] Multi-language support (French/Wolof)
- [ ] Intuitive navigation with minimal training required
- [ ] Dark/light theme support

## 🗄️ MVP Database Schema

### **Core Tables (Simplified)**

```typescript
// Organization Domain
export const bakeryChains = pgTable('bakery_chains', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50 }),
  settings: json('settings').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  bakeryChainId: integer('bakery_chain_id').notNull().references(() => bakeryChains.id),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).unique(),
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Products & Inventory Domain
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  sku: varchar('sku', { length: 100 }).unique(),
  unitOfMeasure: varchar('unit_of_measure', { length: 50 }).notNull(),
  basePrice: decimal('base_price', { precision: 10, scale: 2 }),
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const inventoryItems = pgTable('inventory_items', {
  id: serial('id').primaryKey(),
  locationId: integer('location_id').notNull().references(() => locations.id),
  productId: integer('product_id').notNull().references(() => products.id),
  currentQuantity: decimal('current_quantity', { precision: 10, scale: 2 }).default(0),
  reservedQuantity: decimal('reserved_quantity', { precision: 10, scale: 2 }).default(0),
  reorderPoint: decimal('reorder_point', { precision: 10, scale: 2 }),
  maxStockLevel: decimal('max_stock_level', { precision: 10, scale: 2 }),
  lastCountedAt: timestamp('last_counted_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const inventoryTransactions = pgTable('inventory_transactions', {
  id: serial('id').primaryKey(),
  inventoryItemId: integer('inventory_item_id').notNull().references(() => inventoryItems.id),
  transactionType: varchar('transaction_type', { length: 20 }).notNull(), // 'sale', 'adjustment', 'transfer'
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitCost: decimal('unit_cost', { precision: 10, scale: 4 }),
  referenceType: varchar('reference_type', { length: 50 }), // 'sales_transaction', 'manual_adjustment'
  referenceId: integer('reference_id'),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Sales Domain
export const salesTransactions = pgTable('sales_transactions', {
  id: serial('id').primaryKey(),
  transactionNumber: varchar('transaction_number', { length: 100 }).notNull().unique(),
  locationId: integer('location_id').notNull().references(() => locations.id),
  employeeId: integer('employee_id').notNull().references(() => users.id),
  transactionDate: timestamp('transaction_date').defaultNow(),
  transactionType: varchar('transaction_type', { length: 20 }).default('direct_sale'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).default('cash'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const salesItems = pgTable('sales_items', {
  id: serial('id').primaryKey(),
  salesTransactionId: integer('sales_transaction_id').notNull().references(() => salesTransactions.id),
  productId: integer('product_id').notNull().references(() => products.id),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Cash Management Domain
export const cashCollections = pgTable('cash_collections', {
  id: serial('id').primaryKey(),
  collectionNumber: varchar('collection_number', { length: 100 }).notNull().unique(),
  locationId: integer('location_id').notNull().references(() => locations.id),
  employeeId: integer('employee_id').notNull().references(() => users.id),
  collectionDate: date('collection_date').notNull(),
  expectedAmount: decimal('expected_amount', { precision: 10, scale: 2 }).notNull(),
  actualAmount: decimal('actual_amount', { precision: 10, scale: 2 }),
  variance: decimal('variance', { precision: 10, scale: 2 }),
  paymentMethodBreakdown: json('payment_method_breakdown'),
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'collected', 'reconciled'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Users & HR Domain
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  role: varchar('role', { length: 50 }).notNull(), // 'owner', 'manager', 'employee'
  bakeryChainId: integer('bakery_chain_id').references(() => bakeryChains.id),
  locationId: integer('location_id').references(() => locations.id),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const attendanceRecords = pgTable('attendance_records', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull().references(() => users.id),
  locationId: integer('location_id').notNull().references(() => locations.id),
  date: date('date').notNull(),
  clockIn: timestamp('clock_in'),
  clockOut: timestamp('clock_out'),
  totalHours: decimal('total_hours', { precision: 4, scale: 2 }),
  status: varchar('status', { length: 20 }).default('present'), // 'present', 'absent', 'late'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const payrollItems = pgTable('payroll_items', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull().references(() => users.id),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  baseSalary: decimal('base_salary', { precision: 10, scale: 2 }).default(0),
  commissionAmount: decimal('commission_amount', { precision: 10, scale: 2 }).default(0),
  totalHours: decimal('total_hours', { precision: 6, scale: 2 }).default(0),
  salesVolume: decimal('sales_volume', { precision: 10, scale: 2 }).default(0),
  grossPay: decimal('gross_pay', { precision: 10, scale: 2 }).notNull(),
  netPay: decimal('net_pay', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'paid'
  createdAt: timestamp('created_at').defaultNow(),
});
```

## 📅 Development Timeline

### **Week 1-2: Foundation & Setup**
- [ ] **Project Setup**
  - Initialize Hono backend with TypeScript
  - Setup Drizzle ORM with PostgreSQL
  - Configure React frontend with Vite
  - Setup development environment and tooling

- [ ] **Database & Authentication**
  - Implement MVP database schema
  - Setup database migrations
  - Implement JWT authentication system
  - Create user registration and login flows

- [ ] **Multi-tenant Architecture**
  - Implement bakery chain isolation
  - Setup role-based access control
  - Create location management system

### **Week 3-4: Core Business Operations**
- [ ] **Product & Inventory Management**
  - Product catalog CRUD operations
  - Inventory tracking with real-time updates
  - Stock movement transactions
  - Low stock alerts system

- [ ] **Sales Transaction System**
  - Sales transaction creation and management
  - Sales items tracking
  - Payment method handling
  - Transaction history and search

### **Week 5-6: Cash Management & Employee Features**
- [ ] **Cash Collection System**
  - Daily cash collection procedures
  - Cash reconciliation workflow
  - Variance tracking and reporting
  - Payment method breakdown

- [ ] **Employee Management**
  - Employee registration and role assignment
  - Basic attendance tracking
  - Simple payroll calculation
  - Commission tracking

### **Week 7-8: Reporting & User Experience**
- [ ] **Reporting Dashboard**
  - Sales performance reports
  - Inventory status reports
  - Cash collection analytics
  - Employee performance metrics

- [ ] **Mobile Experience**
  - Responsive design implementation
  - Offline capability for sales
  - Mobile-optimized workflows
  - Performance optimization

### **Week 9-10: Testing & Polish**
- [ ] **Client Testing**
  - Deploy to staging environment
  - Conduct user testing sessions
  - Gather feedback and iterate
  - Performance testing and optimization

- [ ] **Documentation & Training**
  - User manuals and guides
  - Training materials
  - API documentation
  - Deployment guides

## 📊 MVP Success Metrics

### **Business Metrics**
- [ ] **Sales Tracking**: 100% of transactions recorded accurately
- [ ] **Cash Reconciliation**: <5% variance rate across all locations
- [ ] **Inventory Accuracy**: 95%+ stock accuracy vs physical counts
- [ ] **User Adoption**: 80%+ daily active users within first month
- [ ] **Time Savings**: 50% reduction in manual reporting time

### **Technical Metrics**
- [ ] **Performance**: <2s page load times on mobile devices
- [ ] **Uptime**: 99%+ system availability
- [ ] **Mobile Usage**: 70%+ of transactions completed on mobile
- [ ] **Offline Sync**: <30s sync time when connection restored
- [ ] **Error Rate**: <1% transaction failure rate

### **User Experience Metrics**
- [ ] **Training Time**: <2 hours for new users to be productive
- [ ] **User Satisfaction**: 4.5+ rating from client feedback
- [ ] **Support Tickets**: <5 tickets per location per week
- [ ] **Feature Usage**: 90%+ of core features used regularly

## 🧪 Client Testing Strategy

### **Client 1: Small Chain (2-3 locations)**
**Focus Areas:**
- Basic operations validation
- Multi-location management
- Cash collection workflows
- User adoption and training

**Testing Schedule:**
- Week 1: Setup and initial training
- Week 2-3: Daily operations testing
- Week 4: Feedback collection and iteration

### **Client 2: Medium Chain (5-7 locations)**
**Focus Areas:**
- Scalability testing
- Advanced reporting accuracy
- Employee management features
- Performance under load

**Testing Schedule:**
- Week 1: Setup and pilot location testing
- Week 2-3: Full chain rollout
- Week 4: Performance analysis and optimization

### **Feedback Collection Process**
- **Daily**: Usage analytics and error monitoring
- **Weekly**: Manager check-ins and feature feedback
- **Bi-weekly**: User experience interviews
- **Monthly**: Business impact assessment

## 🔮 Future Development (Post-MVP)

### **Phase 3: Manufacturing & Production (Months 4-6)**
- [ ] Recipe management and version control
- [ ] Production planning and scheduling
- [ ] Quality control and batch tracking
- [ ] Cost analysis and profitability reporting

### **Phase 4: Advanced Features (Months 7-9)**
- [ ] Advanced delivery tooling and route optimization (au-delà des flux de livraison et de collecte de base du MVP)
- [ ] Advanced analytics and business intelligence
- [ ] Integration with external systems (accounting, payment processors)
- [ ] Mobile apps for specific roles

### **Phase 5: Scale & Optimization (Months 10-12)**
- [ ] Multi-language support expansion
- [ ] Advanced reporting and dashboards
- [ ] API for third-party integrations
- [ ] Enterprise features and compliance

## 🎯 Key MVP Decisions

### **Included in MVP**
1. **Multi-location support** - Core differentiator
2. **Real-time inventory tracking** - Critical for bakery operations
3. **Cash management** - Essential for financial control
4. **Mobile-first design** - Matches user behavior
5. **Offline capability** - Handles connectivity issues
6. **Basic reporting** - Provides immediate value

### **Excluded from MVP (Future Development)**
1. **Advanced manufacturing features** - Complex, can be added later
2. **Advanced delivery optimization** - Optimisation de tournées, GPS et planification automatique restent pour une phase ultérieure; le MVP couvre les flux de base de livraison et de collecte
3. **Complex payroll** - Basic version sufficient for MVP
4. **Advanced analytics** - Focus on core reporting first
5. **Third-party integrations** - Can be added based on client needs

### **Technical Decisions**
1. **Start with retail locations only** - Simplifies initial scope
2. **Focus on cash transactions** - Most common payment method
3. **Simple user roles** - Owner, Manager, Employee sufficient
4. **Basic inventory tracking** - FIFO/LIFO can be added later
5. **Offline-first architecture** - Critical for reliability

## 📋 MVP Launch Checklist

### **Pre-Launch (Week 9)**
- [ ] All core features implemented and tested
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] User documentation ready
- [ ] Training materials prepared
- [ ] Client environments configured

### **Launch Week (Week 10)**
- [ ] Deploy to production environments
- [ ] Conduct user training sessions
- [ ] Monitor system performance
- [ ] Collect initial feedback
- [ ] Address critical issues immediately

### **Post-Launch (Weeks 11-12)**
- [ ] Daily monitoring and support
- [ ] Weekly feedback sessions
- [ ] Performance optimization
- [ ] Feature refinement based on usage
- [ ] Plan for next development phase

This MVP development plan provides a solid foundation for validating the Gerpain bakery ERP system with real clients while maintaining a focused scope that can be delivered within 8-10 weeks.
