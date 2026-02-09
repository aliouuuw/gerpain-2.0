ALTER TABLE "cash_collections" ADD COLUMN "delivery_run_id" uuid;--> statement-breakpoint
ALTER TABLE "cash_collections" ADD COLUMN "is_settled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cash_collections" ADD COLUMN "period" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cash_collections" ADD CONSTRAINT "cash_collections_delivery_run_id_delivery_runs_id_fk" FOREIGN KEY ("delivery_run_id") REFERENCES "public"."delivery_runs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
