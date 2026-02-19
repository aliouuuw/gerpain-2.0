-- Performance indexes for hot query paths

-- delivery_runs: queries always filter by org + bakery + date
CREATE INDEX IF NOT EXISTS idx_delivery_runs_org_bakery_date
  ON delivery_runs (organization_id, bakery_id, date);

-- employees: delivery run auto-creation filters by org + bakery + role + status, orders by sort_order + hire_date
CREATE INDEX IF NOT EXISTS idx_employees_org_bakery_role_status
  ON employees (organization_id, bakery_id, role, status, sort_order, hire_date);

-- employee_products: frequently joined by employee_id with isActive filter
CREATE INDEX IF NOT EXISTS idx_employee_products_employee_active
  ON employee_products (employee_id, is_active);

-- employee_locations: primary location lookup per employee
CREATE INDEX IF NOT EXISTS idx_employee_locations_employee_primary
  ON employee_locations (employee_id, is_primary);
