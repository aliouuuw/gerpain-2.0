# Database Design

This document outlines the complete database schema design for the rebuilt Gerpain bakery ERP system, addressing the architectural issues from the previous implementation.

## 🎯 Design Principles

### Core Principles
1. **Domain Separation**: Clear boundaries between business domains
2. **Flexibility**: Support for various business models and operations
3. **Audit Trail**: Complete tracking of all business transactions
4. **Performance**: Optimized for high-frequency operations
5. **Scalability**: Support for multi-location operations
6. **Data Integrity**: Strong referential integrity and constraints

### Key Improvements from Previous Schema
- Separated location management from shop-specific operations
- Flexible employee role and compensation system
- Proper inventory tracking with FIFO/LIFO support
- Enhanced cash management with reconciliation
- Manufacturing and recipe management
- Comprehensive audit logging

## 🏗️ Database Schema Overview

```
Database: gerpain_erp
├── Organization Domain
│   ├── bakery_chains
│   ├── locations
│   └── location_types
├── Inventory Domain
│   ├── products
│   ├── raw_materials
│   ├── inventory_items
│   ├── inventory_transactions
│   └── suppliers
├── Manufacturing Domain
│   ├── recipes
│   ├── recipe_items
│   ├── production_orders
│   ├── production_batches
│   └── production_costs
├── Sales Domain
│   ├── sales_transactions
│   ├── sales_items
│   ├── delivery_transactions
│   ├── delivery_items
│   └── returns
├── Cash Management Domain
│   ├── cash_collections
│   ├── cash_reconciliations
│   ├── cash_variances
│   └── payment_methods
├── HR Domain
│   ├── employees
│   ├── employee_roles
│   ├── departments
│   ├── attendance_records
│   ├── payroll_periods
│   ├── payroll_items
│   └── compensation_structures
├── Fleet Domain
│   ├── vehicles
│   ├── routes
│   ├── delivery_schedules
│   └── vehicle_maintenance
└── System Domain
    ├── users
    ├── sessions
    ├── permissions
    ├── audit_logs
    └── system_settings
```

## 📋 Complete Schema Definition

### Organization Domain

```sql
-- Bakery Chain Management
CREATE TABLE bakery_chains (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    headquarters_address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    tax_id VARCHAR(100),
    business_license VARCHAR(100),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

-- Location Types (retail, production, warehouse, etc.)
CREATE TABLE location_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    capabilities JSONB DEFAULT '{}', -- What this location type can do
    created_at TIMESTAMP DEFAULT NOW()
);

-- Locations (replaces the confusing Store/Shop model)
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    bakery_chain_id INTEGER NOT NULL REFERENCES bakery_chains(id),
    location_type_id INTEGER NOT NULL REFERENCES location_types(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE, -- Location code for easy reference
    address TEXT NOT NULL,
    city VARCHAR(100),
    region VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Senegal',
    phone VARCHAR(50),
    email VARCHAR(255),
    manager_id INTEGER, -- Will reference employees table
    operating_hours JSONB, -- Store operating schedule
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL,
    
    UNIQUE(bakery_chain_id, name)
);
```

### User Management & Authentication

```sql
-- Users (admins, managers, etc.)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    email_verified_at TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

-- User sessions
CREATE TABLE user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Magic link tokens for passwordless login
CREATE TABLE magic_link_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User permissions and roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    role_id INTEGER NOT NULL REFERENCES roles(id),
    bakery_chain_id INTEGER REFERENCES bakery_chains(id),
    location_id INTEGER REFERENCES locations(id),
    granted_at TIMESTAMP DEFAULT NOW(),
    granted_by INTEGER REFERENCES users(id),
    
    UNIQUE(user_id, role_id, bakery_chain_id, location_id)
);
```

### HR & Employee Management

```sql
-- Departments
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    bakery_chain_id INTEGER NOT NULL REFERENCES bakery_chains(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(bakery_chain_id, name)
);

-- Employee roles (more flexible than enum)
CREATE TABLE employee_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    base_permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Employees
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    employee_code VARCHAR(50) UNIQUE,
    user_id INTEGER REFERENCES users(id), -- Link to user account if they have one
    bakery_chain_id INTEGER NOT NULL REFERENCES bakery_chains(id),
    location_id INTEGER REFERENCES locations(id),
    department_id INTEGER REFERENCES departments(id),
    role_id INTEGER NOT NULL REFERENCES employee_roles(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    date_of_birth DATE,
    hire_date DATE NOT NULL,
    termination_date DATE NULL,
    emergency_contact JSONB,
    documents JSONB DEFAULT '{}', -- Store document references
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

-- Add foreign key constraint after employees table is created
ALTER TABLE locations ADD CONSTRAINT fk_locations_manager 
    FOREIGN KEY (manager_id) REFERENCES employees(id);

-- Compensation structures (salary, commission, or both)
CREATE TABLE compensation_structures (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    structure_type VARCHAR(20) NOT NULL CHECK (structure_type IN ('salary', 'commission', 'hybrid')),
    base_salary DECIMAL(10,2) NULL,
    commission_rate DECIMAL(5,4) NULL, -- Percentage as decimal (0.05 = 5%)
    commission_type VARCHAR(20) NULL CHECK (commission_type IN ('percentage', 'fixed_per_unit')),
    commission_products JSONB NULL, -- Specific products for commission
    effective_from DATE NOT NULL,
    effective_to DATE NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure valid compensation structure
    CONSTRAINT valid_salary_structure CHECK (
        (structure_type = 'salary' AND base_salary IS NOT NULL) OR
        (structure_type = 'commission' AND commission_rate IS NOT NULL) OR
        (structure_type = 'hybrid' AND base_salary IS NOT NULL AND commission_rate IS NOT NULL)
    )
);

-- Attendance tracking
CREATE TABLE attendance_records (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    location_id INTEGER NOT NULL REFERENCES locations(id),
    date DATE NOT NULL,
    clock_in TIMESTAMP,
    clock_out TIMESTAMP,
    break_duration INTEGER DEFAULT 0, -- Minutes
    total_hours DECIMAL(4,2),
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'sick', 'vacation')),
    notes TEXT,
    approved_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(employee_id, date)
);
```

### Inventory & Product Management

```sql
-- Product categories
CREATE TABLE product_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id INTEGER REFERENCES product_categories(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Products (finished goods)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES product_categories(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE,
    unit_of_measure VARCHAR(50) NOT NULL,
    base_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    is_perishable BOOLEAN DEFAULT true,
    shelf_life_days INTEGER,
    storage_requirements TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

-- Raw materials
CREATE TABLE raw_materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE,
    unit_of_measure VARCHAR(50) NOT NULL,
    category VARCHAR(100), -- flour, sugar, packaging, etc.
    supplier_id INTEGER, -- Will reference suppliers table
    cost_per_unit DECIMAL(10,4),
    reorder_point DECIMAL(10,2),
    max_stock_level DECIMAL(10,2),
    is_perishable BOOLEAN DEFAULT false,
    shelf_life_days INTEGER,
    storage_requirements TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

-- Suppliers
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    payment_terms VARCHAR(100),
    delivery_terms VARCHAR(100),
    rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

-- Add supplier foreign key
ALTER TABLE raw_materials ADD CONSTRAINT fk_raw_materials_supplier 
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id);

-- Inventory items (location-specific stock)
CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('product', 'raw_material')),
    item_id INTEGER NOT NULL, -- References products.id or raw_materials.id
    current_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    reserved_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    available_quantity DECIMAL(10,2) GENERATED ALWAYS AS (current_quantity - reserved_quantity) STORED,
    reorder_point DECIMAL(10,2),
    max_stock_level DECIMAL(10,2),
    last_counted_at TIMESTAMP,
    last_counted_quantity DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(location_id, item_type, item_id)
);

-- Inventory transactions (all stock movements)
CREATE TABLE inventory_transactions (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'production', 'sale', 'transfer', 'adjustment', 'waste', 'return')),
    quantity DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,4),
    total_cost DECIMAL(10,2),
    reference_type VARCHAR(50), -- 'purchase_order', 'production_batch', 'sales_transaction', etc.
    reference_id INTEGER,
    batch_number VARCHAR(100),
    expiry_date DATE,
    notes TEXT,
    created_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Inventory batches (for FIFO/LIFO tracking)
CREATE TABLE inventory_batches (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
    batch_number VARCHAR(100) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    remaining_quantity DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,4) NOT NULL,
    received_date DATE NOT NULL,
    expiry_date DATE,
    supplier_id INTEGER REFERENCES suppliers(id),
    purchase_order_id INTEGER, -- Reference to purchase order
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(inventory_item_id, batch_number)
);
```

### Manufacturing & Production

```sql
-- Recipes (Bills of Materials)
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    yield_quantity DECIMAL(10,2) NOT NULL, -- How much this recipe produces
    yield_unit VARCHAR(50) NOT NULL,
    preparation_time INTEGER, -- Minutes
    baking_time INTEGER, -- Minutes
    total_time INTEGER, -- Minutes
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
    instructions TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(product_id, version)
);

-- Recipe ingredients
CREATE TABLE recipe_items (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id),
    raw_material_id INTEGER NOT NULL REFERENCES raw_materials(id),
    quantity DECIMAL(10,4) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    notes TEXT,
    is_optional BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Production orders
CREATE TABLE production_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(100) NOT NULL UNIQUE,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    recipe_id INTEGER NOT NULL REFERENCES recipes(id),
    planned_quantity DECIMAL(10,2) NOT NULL,
    planned_start_date TIMESTAMP NOT NULL,
    planned_end_date TIMESTAMP NOT NULL,
    actual_start_date TIMESTAMP,
    actual_end_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    notes TEXT,
    created_by INTEGER REFERENCES employees(id),
    assigned_to INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Production batches (actual production runs)
CREATE TABLE production_batches (
    id SERIAL PRIMARY KEY,
    production_order_id INTEGER NOT NULL REFERENCES production_orders(id),
    batch_number VARCHAR(100) NOT NULL UNIQUE,
    actual_quantity DECIMAL(10,2),
    quality_grade VARCHAR(20) DEFAULT 'A' CHECK (quality_grade IN ('A', 'B', 'C', 'reject')),
    waste_quantity DECIMAL(10,2) DEFAULT 0,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    produced_by INTEGER REFERENCES employees(id),
    quality_checked_by INTEGER REFERENCES employees(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Production costs tracking
CREATE TABLE production_costs (
    id SERIAL PRIMARY KEY,
    production_batch_id INTEGER NOT NULL REFERENCES production_batches(id),
    cost_type VARCHAR(20) NOT NULL CHECK (cost_type IN ('material', 'labor', 'overhead')),
    description VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'XOF',
    recorded_by INTEGER REFERENCES employees(id),
    recorded_at TIMESTAMP DEFAULT NOW()
);
```

### Sales & Delivery Management

```sql
-- Sales transactions (volume-focused, not customer-focused)
CREATE TABLE sales_transactions (
    id SERIAL PRIMARY KEY,
    transaction_number VARCHAR(100) NOT NULL UNIQUE,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    transaction_date TIMESTAMP NOT NULL DEFAULT NOW(),
    transaction_type VARCHAR(20) DEFAULT 'direct_sale' CHECK (transaction_type IN ('direct_sale', 'delivery', 'wholesale')),
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sales items (what was sold)
CREATE TABLE sales_items (
    id SERIAL PRIMARY KEY,
    sales_transaction_id INTEGER NOT NULL REFERENCES sales_transactions(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    batch_id INTEGER REFERENCES inventory_batches(id), -- For tracking which batch was sold
    created_at TIMESTAMP DEFAULT NOW()
);

-- Delivery transactions
CREATE TABLE delivery_transactions (
    id SERIAL PRIMARY KEY,
    delivery_number VARCHAR(100) NOT NULL UNIQUE,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    delivery_person_id INTEGER NOT NULL REFERENCES employees(id),
    route_id INTEGER, -- Will reference routes table
    delivery_date DATE NOT NULL,
    departure_time TIMESTAMP,
    return_time TIMESTAMP,
    total_items_delivered INTEGER DEFAULT 0,
    total_items_returned INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Delivery items
CREATE TABLE delivery_items (
    id SERIAL PRIMARY KEY,
    delivery_transaction_id INTEGER NOT NULL REFERENCES delivery_transactions(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity_delivered DECIMAL(10,2) NOT NULL,
    quantity_returned DECIMAL(10,2) DEFAULT 0,
    quantity_sold DECIMAL(10,2) GENERATED ALWAYS AS (quantity_delivered - quantity_returned) STORED,
    unit_price DECIMAL(10,2) NOT NULL,
    total_revenue DECIMAL(10,2) GENERATED ALWAYS AS ((quantity_delivered - quantity_returned) * unit_price) STORED,
    batch_id INTEGER REFERENCES inventory_batches(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Returns (for both sales and deliveries)
CREATE TABLE returns (
    id SERIAL PRIMARY KEY,
    return_number VARCHAR(100) NOT NULL UNIQUE,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    return_type VARCHAR(20) NOT NULL CHECK (return_type IN ('sale_return', 'delivery_return', 'damaged', 'expired')),
    reference_type VARCHAR(50), -- 'sales_transaction', 'delivery_transaction'
    reference_id INTEGER,
    return_date TIMESTAMP NOT NULL DEFAULT NOW(),
    total_amount DECIMAL(10,2),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
    processed_by INTEGER REFERENCES employees(id),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Return items
CREATE TABLE return_items (
    id SERIAL PRIMARY KEY,
    return_id INTEGER NOT NULL REFERENCES returns(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    condition VARCHAR(20) DEFAULT 'good' CHECK (condition IN ('good', 'damaged', 'expired')),
    action VARCHAR(20) DEFAULT 'restock' CHECK (action IN ('restock', 'dispose', 'discount_sale')),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Cash Management

```sql
-- Payment methods
CREATE TABLE payment_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('cash', 'card', 'mobile_money', 'bank_transfer', 'credit')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Cash collections (flexible collection procedures)
CREATE TABLE cash_collections (
    id SERIAL PRIMARY KEY,
    collection_number VARCHAR(100) NOT NULL UNIQUE,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    employee_id INTEGER NOT NULL REFERENCES employees(id), -- Who submitted the cash
    collector_id INTEGER REFERENCES employees(id), -- Who collected the cash
    collection_period_start DATE NOT NULL,
    collection_period_end DATE NOT NULL,
    expected_amount DECIMAL(10,2) NOT NULL,
    actual_amount DECIMAL(10,2),
    variance DECIMAL(10,2) GENERATED ALWAYS AS (actual_amount - expected_amount) STORED,
    payment_method_breakdown JSONB, -- Breakdown by payment method
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'reconciled', 'disputed')),
    collection_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Cash reconciliations
CREATE TABLE cash_reconciliations (
    id SERIAL PRIMARY KEY,
    reconciliation_number VARCHAR(100) NOT NULL UNIQUE,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    reconciliation_period_start DATE NOT NULL,
    reconciliation_period_end DATE NOT NULL,
    total_expected DECIMAL(10,2) NOT NULL,
    total_collected DECIMAL(10,2) NOT NULL,
    total_variance DECIMAL(10,2) GENERATED ALWAYS AS (total_collected - total_expected) STORED,
    reconciled_by INTEGER NOT NULL REFERENCES employees(id),
    reconciled_at TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'approved')),
    approved_by INTEGER REFERENCES employees(id),
    approved_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Cash variances (detailed tracking of discrepancies)
CREATE TABLE cash_variances (
    id SERIAL PRIMARY KEY,
    cash_collection_id INTEGER REFERENCES cash_collections(id),
    reconciliation_id INTEGER REFERENCES cash_reconciliations(id),
    variance_type VARCHAR(20) NOT NULL CHECK (variance_type IN ('shortage', 'overage', 'damaged_money', 'counterfeit')),
    amount DECIMAL(10,2) NOT NULL,
    explanation TEXT,
    resolution VARCHAR(20) CHECK (resolution IN ('employee_liable', 'business_loss', 'insurance_claim', 'resolved')),
    resolved_by INTEGER REFERENCES employees(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Fleet Management

```sql
-- Vehicles
CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    vehicle_number VARCHAR(100) NOT NULL UNIQUE,
    license_plate VARCHAR(50) NOT NULL UNIQUE,
    vehicle_type VARCHAR(50) NOT NULL, -- motorcycle, van, truck
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    capacity_weight DECIMAL(8,2),
    capacity_volume DECIMAL(8,2),
    fuel_type VARCHAR(20) CHECK (fuel_type IN ('gasoline', 'diesel', 'electric', 'hybrid')),
    assigned_driver_id INTEGER REFERENCES employees(id),
    location_id INTEGER NOT NULL REFERENCES locations(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
    purchase_date DATE,
    purchase_cost DECIMAL(10,2),
    insurance_expiry DATE,
    registration_expiry DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

-- Routes
CREATE TABLE routes (
    id SERIAL PRIMARY KEY,
    route_name VARCHAR(255) NOT NULL,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    description TEXT,
    estimated_duration INTEGER, -- Minutes
    estimated_distance DECIMAL(8,2), -- Kilometers
    route_points JSONB, -- GPS coordinates and stops
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Delivery schedules
CREATE TABLE delivery_schedules (
    id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES routes(id),
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
    driver_id INTEGER NOT NULL REFERENCES employees(id),
    scheduled_date DATE NOT NULL,
    scheduled_start_time TIME NOT NULL,
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Vehicle maintenance
CREATE TABLE vehicle_maintenance (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
    maintenance_type VARCHAR(50) NOT NULL, -- routine, repair, inspection
    description TEXT NOT NULL,
    scheduled_date DATE,
    completed_date DATE,
    cost DECIMAL(10,2),
    service_provider VARCHAR(255),
    odometer_reading INTEGER,
    next_service_date DATE,
    performed_by INTEGER REFERENCES employees(id),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Payroll Management

```sql
-- Payroll periods
CREATE TABLE payroll_periods (
    id SERIAL PRIMARY KEY,
    bakery_chain_id INTEGER NOT NULL REFERENCES bakery_chains(id),
    period_name VARCHAR(100) NOT NULL, -- "January 2024", "Week 1 - 2024"
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('weekly', 'bi_weekly', 'monthly')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'calculated', 'approved', 'paid')),
    calculated_by INTEGER REFERENCES employees(id),
    calculated_at TIMESTAMP,
    approved_by INTEGER REFERENCES employees(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(bakery_chain_id, period_name)
);

-- Payroll items (individual employee payroll for a period)
CREATE TABLE payroll_items (
    id SERIAL PRIMARY KEY,
    payroll_period_id INTEGER NOT NULL REFERENCES payroll_periods(id),
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    base_salary DECIMAL(10,2) DEFAULT 0,
    commission_amount DECIMAL(10,2) DEFAULT 0,
    overtime_amount DECIMAL(10,2) DEFAULT 0,
    bonus_amount DECIMAL(10,2) DEFAULT 0,
    deduction_amount DECIMAL(10,2) DEFAULT 0,
    advance_amount DECIMAL(10,2) DEFAULT 0,
    gross_pay DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    social_security_amount DECIMAL(10,2) DEFAULT 0,
    other_deductions DECIMAL(10,2) DEFAULT 0,
    net_pay DECIMAL(10,2) NOT NULL,
    days_worked INTEGER DEFAULT 0,
    hours_worked DECIMAL(6,2) DEFAULT 0,
    overtime_hours DECIMAL(6,2) DEFAULT 0,
    sales_volume DECIMAL(10,2) DEFAULT 0, -- For commission calculation
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
    payment_date DATE,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(payroll_period_id, employee_id)
);

-- Bonuses and advances
CREATE TABLE employee_adjustments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('bonus', 'advance', 'deduction')),
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurring_months INTEGER DEFAULT 0,
    start_month DATE,
    end_month DATE,
    remaining_months INTEGER DEFAULT 0,
    payroll_item_id INTEGER REFERENCES payroll_items(id), -- When processed
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'cancelled')),
    created_by INTEGER REFERENCES employees(id),
    processed_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);
```

### System & Audit

```sql
-- Audit logs (complete audit trail)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id INTEGER REFERENCES users(id),
    employee_id INTEGER REFERENCES employees(id),
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- System settings
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    bakery_chain_id INTEGER REFERENCES bakery_chains(id),
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_global BOOLEAN DEFAULT false, -- Global settings vs chain-specific
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(bakery_chain_id, setting_key)
);
```

## 🔍 Database Indexes

### Performance Indexes

```sql
-- Primary lookup indexes
CREATE INDEX idx_locations_bakery_chain ON locations(bakery_chain_id);
CREATE INDEX idx_locations_active ON locations(bakery_chain_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_location ON employees(location_id);
CREATE INDEX idx_employees_active ON employees(bakery_chain_id) WHERE is_active = true;

-- Sales and transaction indexes
CREATE INDEX idx_sales_transactions_date ON sales_transactions(transaction_date);
CREATE INDEX idx_sales_transactions_location_date ON sales_transactions(location_id, transaction_date);
CREATE INDEX idx_delivery_transactions_date ON delivery_transactions(delivery_date);
CREATE INDEX idx_delivery_transactions_person_date ON delivery_transactions(delivery_person_id, delivery_date);

-- Inventory indexes
CREATE INDEX idx_inventory_items_location_type ON inventory_items(location_id, item_type);
CREATE INDEX idx_inventory_transactions_item_date ON inventory_transactions(inventory_item_id, created_at);
CREATE INDEX idx_inventory_batches_item_active ON inventory_batches(inventory_item_id) WHERE is_active = true;

-- Cash management indexes
CREATE INDEX idx_cash_collections_location_period ON cash_collections(location_id, collection_period_start, collection_period_end);
CREATE INDEX idx_cash_collections_status ON cash_collections(status);

-- Payroll indexes
CREATE INDEX idx_payroll_items_period_employee ON payroll_items(payroll_period_id, employee_id);
CREATE INDEX idx_attendance_records_employee_date ON attendance_records(employee_id, date);

-- Audit indexes
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, timestamp);
```

## 🔄 Database Triggers

### Audit Trail Triggers

```sql
-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, user_id, timestamp)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), current_setting('app.current_user_id', true)::INTEGER, NOW());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id, timestamp)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), current_setting('app.current_user_id', true)::INTEGER, NOW());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_values, user_id, timestamp)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), current_setting('app.current_user_id', true)::INTEGER, NOW());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_bakery_chains AFTER INSERT OR UPDATE OR DELETE ON bakery_chains FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_locations AFTER INSERT OR UPDATE OR DELETE ON locations FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_employees AFTER INSERT OR UPDATE OR DELETE ON employees FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_sales_transactions AFTER INSERT OR UPDATE OR DELETE ON sales_transactions FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_cash_collections AFTER INSERT OR UPDATE OR DELETE ON cash_collections FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_payroll_items AFTER INSERT OR UPDATE OR DELETE ON payroll_items FOR EACH ROW EXECUTE FUNCTION create_audit_log();
```

### Inventory Update Triggers

```sql
-- Function to update inventory quantities
CREATE OR REPLACE FUNCTION update_inventory_quantities()
RETURNS TRIGGER AS $$
BEGIN
    -- Update current quantity based on transaction type
    IF NEW.transaction_type IN ('purchase', 'production', 'return') THEN
        UPDATE inventory_items 
        SET current_quantity = current_quantity + NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;
    ELSIF NEW.transaction_type IN ('sale', 'waste', 'transfer') THEN
        UPDATE inventory_items 
        SET current_quantity = current_quantity - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;
    ELSIF NEW.transaction_type = 'adjustment' THEN
        UPDATE inventory_items 
        SET current_quantity = NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_on_transaction 
    AFTER INSERT ON inventory_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_inventory_quantities();
```

## 📊 Database Views

### Business Intelligence Views

```sql
-- Sales summary view
CREATE VIEW sales_summary AS
SELECT 
    l.name as location_name,
    DATE_TRUNC('day', st.transaction_date) as sale_date,
    COUNT(st.id) as transaction_count,
    SUM(st.total_amount) as total_revenue,
    AVG(st.total_amount) as average_transaction,
    SUM(si.quantity) as total_items_sold
FROM sales_transactions st
JOIN locations l ON st.location_id = l.id
JOIN sales_items si ON st.id = si.sales_transaction_id
WHERE st.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY l.name, DATE_TRUNC('day', st.transaction_date)
ORDER BY sale_date DESC, location_name;

-- Employee performance view
CREATE VIEW employee_performance AS
SELECT 
    e.id,
    e.first_name || ' ' || e.last_name as employee_name,
    er.name as role_name,
    l.name as location_name,
    COUNT(DISTINCT st.id) as sales_count,
    COALESCE(SUM(st.total_amount), 0) as total_sales,
    COUNT(DISTINCT dt.id) as delivery_count,
    COALESCE(SUM(dt.total_revenue), 0) as delivery_revenue,
    COALESCE(SUM(st.total_amount), 0) + COALESCE(SUM(dt.total_revenue), 0) as total_revenue
FROM employees e
JOIN employee_roles er ON e.role_id = er.id
JOIN locations l ON e.location_id = l.id
LEFT JOIN sales_transactions st ON e.id = st.employee_id 
    AND st.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN delivery_transactions dt ON e.id = dt.delivery_person_id 
    AND dt.delivery_date >= CURRENT_DATE - INTERVAL '30 days'
WHERE e.is_active = true
GROUP BY e.id, e.first_name, e.last_name, er.name, l.name
ORDER BY total_revenue DESC;

-- Inventory status view
CREATE VIEW inventory_status AS
SELECT 
    l.name as location_name,
    CASE 
        WHEN ii.item_type = 'product' THEN p.name
        WHEN ii.item_type = 'raw_material' THEN rm.name
    END as item_name,
    ii.item_type,
    ii.current_quantity,
    ii.reserved_quantity,
    ii.available_quantity,
    ii.reorder_point,
    CASE 
        WHEN ii.available_quantity <= ii.reorder_point THEN 'LOW_STOCK'
        WHEN ii.available_quantity <= (ii.reorder_point * 1.5) THEN 'MEDIUM_STOCK'
        ELSE 'GOOD_STOCK'
    END as stock_status
FROM inventory_items ii
JOIN locations l ON ii.location_id = l.id
LEFT JOIN products p ON ii.item_type = 'product' AND ii.item_id = p.id
LEFT JOIN raw_materials rm ON ii.item_type = 'raw_material' AND ii.item_id = rm.id
WHERE ii.current_quantity > 0
ORDER BY l.name, stock_status, item_name;

-- Cash collection summary view
CREATE VIEW cash_collection_summary AS
SELECT 
    l.name as location_name,
    DATE_TRUNC('month', cc.collection_period_start) as collection_month,
    COUNT(cc.id) as collection_count,
    SUM(cc.expected_amount) as total_expected,
    SUM(cc.actual_amount) as total_collected,
    SUM(cc.variance) as total_variance,
    ROUND((SUM(cc.actual_amount) / NULLIF(SUM(cc.expected_amount), 0) * 100), 2) as collection_rate
FROM cash_collections cc
JOIN locations l ON cc.location_id = l.id
WHERE cc.status IN ('collected', 'reconciled')
GROUP BY l.name, DATE_TRUNC('month', cc.collection_period_start)
ORDER BY collection_month DESC, location_name;
```

## 🔒 Security Policies

### Row Level Security

```sql
-- Enable RLS on sensitive tables
ALTER TABLE bakery_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_collections ENABLE ROW LEVEL SECURITY;

-- Example policies (to be customized based on user roles)
CREATE POLICY bakery_chain_access ON bakery_chains
    FOR ALL TO authenticated_users
    USING (id IN (
        SELECT ur.bakery_chain_id 
        FROM user_roles ur 
        WHERE ur.user_id = current_setting('app.current_user_id')::INTEGER
    ));

CREATE POLICY location_access ON locations
    FOR ALL TO authenticated_users
    USING (bakery_chain_id IN (
        SELECT ur.bakery_chain_id 
        FROM user_roles ur 
        WHERE ur.user_id = current_setting('app.current_user_id')::INTEGER
    ));
```

## 📈 Performance Considerations

### Query Optimization Guidelines

1. **Use appropriate indexes** for frequently queried columns
2. **Partition large tables** by date for better performance
3. **Use materialized views** for complex reporting queries
4. **Implement connection pooling** to manage database connections
5. **Regular VACUUM and ANALYZE** operations for maintenance

### Scaling Strategies

1. **Read Replicas**: For read-heavy operations
2. **Horizontal Partitioning**: For very large tables
3. **Caching Layer**: Redis for frequently accessed data
4. **Connection Pooling**: PgBouncer for connection management

## 🔄 Migration Strategy

### From Current Schema

1. **Data Export**: Export existing data with proper mapping
2. **Schema Migration**: Create new schema in parallel
3. **Data Transformation**: Transform and import data
4. **Validation**: Verify data integrity and completeness
5. **Cutover**: Switch to new system with minimal downtime

### Migration Scripts

```sql
-- Example migration script structure
BEGIN;

-- 1. Create new tables
-- (Execute schema creation scripts)

-- 2. Migrate bakery chains
INSERT INTO bakery_chains (name, description, contact_email, contact_phone)
SELECT DISTINCT bakeryChain, NULL, NULL, NULL
FROM old_admin_table;

-- 3. Migrate locations
INSERT INTO locations (bakery_chain_id, location_type_id, name, address)
SELECT 
    bc.id,
    1, -- Default to retail type
    os.name,
    COALESCE(os.address, 'Address not provided')
FROM old_store_table os
JOIN bakery_chains bc ON bc.name = os.admin_bakery_chain;

-- 4. Continue with other tables...

COMMIT;
```

This database design provides a solid foundation for the rebuilt bakery ERP system, addressing the architectural issues from the previous implementation while providing flexibility for future growth and requirements.
