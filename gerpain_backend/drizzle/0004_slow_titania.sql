CREATE TABLE IF NOT EXISTS "bakeries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"address" text,
	"phone" text,
	"settings" text DEFAULT '{}',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cash_collections" ADD COLUMN "bakery_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "delivery_runs" ADD COLUMN "bakery_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "bakery_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "bakery_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "tier" text DEFAULT 'base' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "bakery_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bakeries" ADD CONSTRAINT "bakeries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cash_collections" ADD CONSTRAINT "cash_collections_bakery_id_bakeries_id_fk" FOREIGN KEY ("bakery_id") REFERENCES "public"."bakeries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delivery_runs" ADD CONSTRAINT "delivery_runs_bakery_id_bakeries_id_fk" FOREIGN KEY ("bakery_id") REFERENCES "public"."bakeries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employees" ADD CONSTRAINT "employees_bakery_id_bakeries_id_fk" FOREIGN KEY ("bakery_id") REFERENCES "public"."bakeries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "locations" ADD CONSTRAINT "locations_bakery_id_bakeries_id_fk" FOREIGN KEY ("bakery_id") REFERENCES "public"."bakeries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_bakery_id_bakeries_id_fk" FOREIGN KEY ("bakery_id") REFERENCES "public"."bakeries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
