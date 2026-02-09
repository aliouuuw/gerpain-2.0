-- ============================================================
-- GERPAIN: Neon-to-Neon Data Migration (Essential Data Only)
-- ============================================================
-- Migrates: Admin, Store, Shop, Employee, BreadType
-- Skips:    Deliveries, CashCollections, PaySlips, Stock
--
-- Run this in the NEW database's Neon SQL Editor.
-- Run each step one at a time, in order.
--
-- BEFORE RUNNING:
-- 1. Replace the dblink connection string placeholders with
--    your old Neon DB credentials.
-- 2. Drizzle migrations must already be applied on the new DB.
-- ============================================================

-- ============================================================
-- STEP 0: Enable dblink + create mapping tables
-- ============================================================

CREATE EXTENSION IF NOT EXISTS dblink;

CREATE TABLE IF NOT EXISTS _migration_admin_map (
  old_id INT PRIMARY KEY,
  new_user_id UUID NOT NULL,
  new_org_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS _migration_store_map (
  old_id INT PRIMARY KEY,
  new_bakery_id UUID NOT NULL,
  new_org_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS _migration_shop_map (
  old_id INT PRIMARY KEY,
  new_location_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS _migration_employee_map (
  old_id INT PRIMARY KEY,
  new_employee_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS _migration_breadtype_map (
  old_id INT PRIMARY KEY,
  new_product_id UUID NOT NULL
);

-- ============================================================
-- STEP 1: Admin → users + organizations
-- ============================================================
-- Each Admin becomes a user (owner) and an organization.
-- Users will need to set a password via reset flow on first login.

DO $$
DECLARE
  r RECORD;
  v_user_id UUID;
  v_org_id UUID;
  v_slug TEXT;
BEGIN
  FOR r IN
    SELECT * FROM dblink(
      'dbname=dev host=ep-curly-glitter-a2kzat2a-pooler.eu-central-1.aws.neon.tech user=dev_owner password=xxxxxxxxx sslmode=require channel_binding=require',
      'SELECT id, name, email, "bakeryChain", "phoneNumber", "address", "createdAt" FROM "Admin"'
    ) AS t(id INT, name TEXT, email TEXT, bakery_chain TEXT, phone TEXT, address TEXT, created_at TIMESTAMP)
  LOOP
    -- Skip if already migrated
    IF EXISTS (SELECT 1 FROM _migration_admin_map WHERE old_id = r.id) THEN
      CONTINUE;
    END IF;

    v_user_id := gen_random_uuid();
    v_org_id := gen_random_uuid();
    v_slug := lower(regexp_replace(r.bakery_chain, '[^a-zA-Z0-9]+', '-', 'g'));

    -- Create user
    INSERT INTO users (id, email, name, email_verified, created_at, updated_at)
    VALUES (v_user_id, r.email, r.name, true, COALESCE(r.created_at, now()), now())
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_user_id;

    -- Create organization
    INSERT INTO organizations (id, name, slug, owner_id, tier, is_active, created_at, updated_at)
    VALUES (v_org_id, r.bakery_chain, v_slug, v_user_id, 'base', true, COALESCE(r.created_at, now()), now())
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_org_id;

    -- Also make the user an org member (admin role)
    INSERT INTO organization_members (id, organization_id, user_id, invited_at, joined_at, is_active)
    VALUES (gen_random_uuid(), v_org_id, v_user_id, now(), now(), true)
    ON CONFLICT DO NOTHING;

    -- Save mapping
    INSERT INTO _migration_admin_map (old_id, new_user_id, new_org_id)
    VALUES (r.id, v_user_id, v_org_id)
    ON CONFLICT (old_id) DO NOTHING;
  END LOOP;
END $$;

-- Verify:
SELECT * FROM _migration_admin_map;


-- ============================================================
-- STEP 2: Store → bakeries
-- ============================================================
-- Each Store becomes a bakery under the admin's organization.

DO $$
DECLARE
  r RECORD;
  v_bakery_id UUID;
  v_org_id UUID;
  v_code TEXT;
BEGIN
  FOR r IN
    SELECT * FROM dblink(
      'dbname=dev host=ep-curly-glitter-a2kzat2a-pooler.eu-central-1.aws.neon.tech user=dev_owner password=xxxxxxxxx sslmode=require channel_binding=require',
      'SELECT id, name, "adminId", "createdAt" FROM "Store"'
    ) AS t(id INT, name TEXT, admin_id INT, created_at TIMESTAMP)
  LOOP
    IF EXISTS (SELECT 1 FROM _migration_store_map WHERE old_id = r.id) THEN
      CONTINUE;
    END IF;

    -- Look up the org from admin mapping
    SELECT new_org_id INTO v_org_id FROM _migration_admin_map WHERE old_id = r.admin_id;
    IF v_org_id IS NULL THEN
      RAISE NOTICE 'Skipping Store % — no admin mapping for adminId %', r.id, r.admin_id;
      CONTINUE;
    END IF;

    v_bakery_id := gen_random_uuid();
    v_code := upper(left(regexp_replace(r.name, '[^a-zA-Z0-9]', '', 'g'), 4));

    INSERT INTO bakeries (id, organization_id, name, code, is_active, created_at, updated_at)
    VALUES (v_bakery_id, v_org_id, r.name, v_code, true, COALESCE(r.created_at, now()), now());

    INSERT INTO _migration_store_map (old_id, new_bakery_id, new_org_id)
    VALUES (r.id, v_bakery_id, v_org_id)
    ON CONFLICT (old_id) DO NOTHING;
  END LOOP;
END $$;

-- Verify:
SELECT * FROM _migration_store_map;


-- ============================================================
-- STEP 3: Shop → locations (type = 'shop')
-- ============================================================

DO $$
DECLARE
  r RECORD;
  v_location_id UUID;
  v_bakery_id UUID;
  v_org_id UUID;
BEGIN
  FOR r IN
    SELECT * FROM dblink(
      'dbname=dev host=ep-curly-glitter-a2kzat2a-pooler.eu-central-1.aws.neon.tech user=dev_owner password=xxxxxxxxx sslmode=require channel_binding=require',
      'SELECT id, name, "storeId", "cashierId", "createdAt" FROM "Shop"'
    ) AS t(id INT, name TEXT, store_id INT, cashier_id INT, created_at TIMESTAMP)
  LOOP
    IF EXISTS (SELECT 1 FROM _migration_shop_map WHERE old_id = r.id) THEN
      CONTINUE;
    END IF;

    SELECT new_bakery_id, new_org_id INTO v_bakery_id, v_org_id
    FROM _migration_store_map WHERE old_id = r.store_id;

    IF v_bakery_id IS NULL THEN
      RAISE NOTICE 'Skipping Shop % — no store mapping for storeId %', r.id, r.store_id;
      CONTINUE;
    END IF;

    v_location_id := gen_random_uuid();

    INSERT INTO locations (id, organization_id, bakery_id, name, type, is_active, created_at, updated_at)
    VALUES (v_location_id, v_org_id, v_bakery_id, r.name, 'shop', true, COALESCE(r.created_at, now()), now());

    INSERT INTO _migration_shop_map (old_id, new_location_id)
    VALUES (r.id, v_location_id)
    ON CONFLICT (old_id) DO NOTHING;
  END LOOP;
END $$;

-- Also create a default "Bakery" location for each store (for delivery guys who deliver from the bakery itself)
DO $$
DECLARE
  r RECORD;
  v_loc_id UUID;
BEGIN
  FOR r IN SELECT * FROM _migration_store_map
  LOOP
    -- Check if a warehouse/bakery location already exists
    IF NOT EXISTS (
      SELECT 1 FROM locations WHERE bakery_id = r.new_bakery_id AND type = 'warehouse'
    ) THEN
      v_loc_id := gen_random_uuid();
      INSERT INTO locations (id, organization_id, bakery_id, name, type, is_active, created_at, updated_at)
      SELECT v_loc_id, r.new_org_id, r.new_bakery_id,
             b.name || ' - Dépôt', 'warehouse', true, now(), now()
      FROM bakeries b WHERE b.id = r.new_bakery_id;
    END IF;
  END LOOP;
END $$;

-- Verify:
SELECT * FROM _migration_shop_map;
SELECT id, name, type, bakery_id FROM locations;


-- ============================================================
-- STEP 4: Employee → employees + employee_locations
-- ============================================================
-- Role mapping: LIVREUR→delivery, CAISSIER→cashier,
--               OUT_MANAGER/IN_MANAGER→manager, BASIC→baker

DO $$
DECLARE
  r RECORD;
  v_emp_id UUID;
  v_bakery_id UUID;
  v_org_id UUID;
  v_new_role TEXT;
  v_first TEXT;
  v_last TEXT;
  v_parts TEXT[];
  v_location_id UUID;
BEGIN
  FOR r IN
    SELECT * FROM dblink(
      'dbname=dev host=ep-curly-glitter-a2kzat2a-pooler.eu-central-1.aws.neon.tech user=dev_owner password=xxxxxxxxx sslmode=require channel_binding=require',
      'SELECT id, name, email, "phoneNumber", address, "adminId", role, "storeId", "shopId",
              salary, "unitPrice", commission, "isActive", "createdAt"
       FROM "Employee"'
    ) AS t(
      id INT, name TEXT, email TEXT, phone TEXT, address TEXT,
      admin_id INT, role TEXT, store_id INT, shop_id INT,
      salary DOUBLE PRECISION, unit_price DOUBLE PRECISION, commission DOUBLE PRECISION,
      is_active BOOLEAN, created_at TIMESTAMP
    )
  LOOP
    IF EXISTS (SELECT 1 FROM _migration_employee_map WHERE old_id = r.id) THEN
      CONTINUE;
    END IF;

    -- Look up bakery/org
    SELECT new_bakery_id, new_org_id INTO v_bakery_id, v_org_id
    FROM _migration_store_map WHERE old_id = r.store_id;

    IF v_bakery_id IS NULL THEN
      -- Fallback: try admin mapping
      SELECT new_org_id INTO v_org_id FROM _migration_admin_map WHERE old_id = r.admin_id;
      -- Get first bakery in that org
      SELECT id INTO v_bakery_id FROM bakeries WHERE organization_id = v_org_id LIMIT 1;
    END IF;

    IF v_bakery_id IS NULL OR v_org_id IS NULL THEN
      RAISE NOTICE 'Skipping Employee % — no mapping found', r.id;
      CONTINUE;
    END IF;

    -- Map role
    v_new_role := CASE r.role
      WHEN 'LIVREUR' THEN 'delivery'
      WHEN 'CAISSIER' THEN 'cashier'
      WHEN 'OUT_MANAGER' THEN 'manager'
      WHEN 'IN_MANAGER' THEN 'manager'
      WHEN 'BASIC' THEN 'baker'
      ELSE 'baker'
    END;

    -- Split name into first/last (split on first space)
    v_parts := string_to_array(COALESCE(r.name, 'Unknown'), ' ');
    v_first := v_parts[1];
    v_last := CASE
      WHEN array_length(v_parts, 1) > 1
      THEN array_to_string(v_parts[2:], ' ')
      ELSE ''
    END;

    v_emp_id := gen_random_uuid();

    INSERT INTO employees (
      id, organization_id, bakery_id, first_name, last_name,
      email, phone, role, status, commission_rate, base_salary,
      created_at, updated_at
    ) VALUES (
      v_emp_id, v_org_id, v_bakery_id, v_first, v_last,
      r.email, r.phone, v_new_role,
      CASE WHEN r.is_active THEN 'active' ELSE 'inactive' END,
      COALESCE(r.commission::INT, 0),
      COALESCE(r.salary::INT, 0),
      COALESCE(r.created_at, now()), now()
    );

    -- Save mapping
    INSERT INTO _migration_employee_map (old_id, new_employee_id)
    VALUES (r.id, v_emp_id)
    ON CONFLICT (old_id) DO NOTHING;

    -- Create employee_locations entry
    -- If employee had a shopId, link to that shop's location
    IF r.shop_id IS NOT NULL THEN
      SELECT new_location_id INTO v_location_id FROM _migration_shop_map WHERE old_id = r.shop_id;
      IF v_location_id IS NOT NULL THEN
        INSERT INTO employee_locations (id, employee_id, location_id, is_primary, assigned_at)
        VALUES (gen_random_uuid(), v_emp_id, v_location_id, true, now());
      END IF;
    ELSE
      -- Delivery guys: assign to the warehouse location of their bakery
      SELECT id INTO v_location_id FROM locations
      WHERE bakery_id = v_bakery_id AND type = 'warehouse' LIMIT 1;
      IF v_location_id IS NOT NULL THEN
        INSERT INTO employee_locations (id, employee_id, location_id, is_primary, assigned_at)
        VALUES (gen_random_uuid(), v_emp_id, v_location_id, true, now());
      END IF;
    END IF;
  END LOOP;
END $$;

-- Verify:
SELECT * FROM _migration_employee_map;
SELECT id, first_name, last_name, role, status FROM employees;


-- ============================================================
-- STEP 5: BreadType → products
-- ============================================================
-- Deduplication: if the same bread name exists across shops in the
-- same org, create one product and use pricing_rules for overrides.

DO $$
DECLARE
  r RECORD;
  v_product_id UUID;
  v_bakery_id UUID;
  v_org_id UUID;
  v_location_id UUID;
  v_existing_product_id UUID;
BEGIN
  FOR r IN
    SELECT * FROM dblink(
      'dbname=dev host=ep-curly-glitter-a2kzat2a-pooler.eu-central-1.aws.neon.tech user=dev_owner password=xxxxxxxxx sslmode=require channel_binding=require',
      'SELECT bt.id, bt.type, bt."unitPrice", bt."shopId",
              s."storeId"
       FROM "BreadType" bt
       JOIN "Shop" s ON s.id = bt."shopId"'
    ) AS t(id INT, type_name TEXT, unit_price DOUBLE PRECISION, shop_id INT, store_id INT)
  LOOP
    IF EXISTS (SELECT 1 FROM _migration_breadtype_map WHERE old_id = r.id) THEN
      CONTINUE;
    END IF;

    SELECT new_bakery_id, new_org_id INTO v_bakery_id, v_org_id
    FROM _migration_store_map WHERE old_id = r.store_id;

    IF v_bakery_id IS NULL THEN
      RAISE NOTICE 'Skipping BreadType % — no store mapping', r.id;
      CONTINUE;
    END IF;

    -- Check if product with same name already exists in this org
    SELECT id INTO v_existing_product_id
    FROM products
    WHERE organization_id = v_org_id AND name = r.type_name
    LIMIT 1;

    IF v_existing_product_id IS NOT NULL THEN
      -- Product exists — map to it, and create a pricing rule for this location
      v_product_id := v_existing_product_id;

      SELECT new_location_id INTO v_location_id FROM _migration_shop_map WHERE old_id = r.shop_id;
      IF v_location_id IS NOT NULL AND r.unit_price::INT != (SELECT unit_price FROM products WHERE id = v_product_id) THEN
        INSERT INTO pricing_rules (id, organization_id, product_id, location_id, unit_price, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), v_org_id, v_product_id, v_location_id, r.unit_price::INT, true, now(), now())
        ON CONFLICT DO NOTHING;
      END IF;
    ELSE
      -- Create new product
      v_product_id := gen_random_uuid();
      INSERT INTO products (id, organization_id, bakery_id, name, unit_price, is_active, created_at, updated_at)
      VALUES (v_product_id, v_org_id, v_bakery_id, r.type_name, r.unit_price::INT, true, now(), now());
    END IF;

    INSERT INTO _migration_breadtype_map (old_id, new_product_id)
    VALUES (r.id, v_product_id)
    ON CONFLICT (old_id) DO NOTHING;
  END LOOP;
END $$;

-- Verify:
SELECT * FROM _migration_breadtype_map;
SELECT id, name, unit_price FROM products;


-- ============================================================
-- STEP 6: Verify all counts
-- ============================================================

SELECT 'admins/users' AS entity, count(*) FROM _migration_admin_map
UNION ALL
SELECT 'stores/bakeries', count(*) FROM _migration_store_map
UNION ALL
SELECT 'shops/locations', count(*) FROM _migration_shop_map
UNION ALL
SELECT 'employees', count(*) FROM _migration_employee_map
UNION ALL
SELECT 'bread_types/products', count(*) FROM _migration_breadtype_map;

-- Also verify actual table counts:
SELECT 'users' AS table_name, count(*) FROM users
UNION ALL
SELECT 'organizations', count(*) FROM organizations
UNION ALL
SELECT 'bakeries', count(*) FROM bakeries
UNION ALL
SELECT 'locations', count(*) FROM locations
UNION ALL
SELECT 'employees', count(*) FROM employees
UNION ALL
SELECT 'employee_locations', count(*) FROM employee_locations
UNION ALL
SELECT 'products', count(*) FROM products;


-- ============================================================
-- CLEANUP (run after verifying everything is correct)
-- ============================================================
-- DROP TABLE IF EXISTS _migration_admin_map;
-- DROP TABLE IF EXISTS _migration_store_map;
-- DROP TABLE IF EXISTS _migration_shop_map;
-- DROP TABLE IF EXISTS _migration_employee_map;
-- DROP TABLE IF EXISTS _migration_breadtype_map;
