CREATE TABLE "salary_advance_installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"advance_id" uuid NOT NULL,
	"installment_number" integer NOT NULL,
	"amount" integer NOT NULL,
	"due_period" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"payment_method" text,
	"paid_at" timestamp,
	"rolled_to_installment_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_advances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"bakery_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"total_amount" integer NOT NULL,
	"installment_count" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"granted_at" timestamp NOT NULL,
	"created_by" uuid,
	"cancelled_at" timestamp,
	"cancelled_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "salary_advance_installments" ADD CONSTRAINT "salary_advance_installments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advance_installments" ADD CONSTRAINT "salary_advance_installments_advance_id_salary_advances_id_fk" FOREIGN KEY ("advance_id") REFERENCES "public"."salary_advances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_bakery_id_bakeries_id_fk" FOREIGN KEY ("bakery_id") REFERENCES "public"."bakeries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;