-- Migration: Add categories table and category_id to products
CREATE TABLE IF NOT EXISTS "categories" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "description" text,
    "color" text,
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add category_id to products table
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "category_id" uuid REFERENCES "categories"("id") ON DELETE SET NULL;

-- Drop the old category text column (commented out for safety - run manually if needed)
-- ALTER TABLE "products" DROP COLUMN IF EXISTS "category";
