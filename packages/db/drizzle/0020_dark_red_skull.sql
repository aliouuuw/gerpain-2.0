CREATE TABLE "salary_bonuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"bakery_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reason" text,
	"due_period" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"payroll_run_id" uuid,
	"paid_at" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payroll_run_lines" ADD COLUMN "bonus_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_run_lines" ADD COLUMN "collection_deduction" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "salary_bonuses" ADD CONSTRAINT "salary_bonuses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_bonuses" ADD CONSTRAINT "salary_bonuses_bakery_id_bakeries_id_fk" FOREIGN KEY ("bakery_id") REFERENCES "public"."bakeries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_bonuses" ADD CONSTRAINT "salary_bonuses_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_bonuses" ADD CONSTRAINT "salary_bonuses_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_bonuses" ADD CONSTRAINT "salary_bonuses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;