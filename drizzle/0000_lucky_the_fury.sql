CREATE TYPE "public"."department_name" AS ENUM('super_admin', 'onboarding', 'sales', 'support', 'billing_accounts', 'compliance');--> statement-breakpoint
CREATE TYPE "public"."department_privilege" AS ENUM('full_access', 'manage_departments', 'manage_practices', 'manage_doctors', 'create_remove_users', 'access_audit_trails', 'add_practices', 'add_doctors', 'verify_doctor_details', 'approve_numbers', 'invite_users', 'manage_demo_bookings', 'view_adoption_funnel', 'communicate_potential_users', 'access_analytics', 'help_technical_issues', 'reset_doctor_access', 'monitor_sessions', 'manage_subscriptions', 'view_update_billing', 'send_invoices', 'verify_credentials', 'approve_hpcsa_bhf', 'manage_document_verification');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('doctor', 'admin');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" text PRIMARY KEY NOT NULL,
	"department_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" "department_name" NOT NULL,
	"privileges" "department_privilege"[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"id" text PRIMARY KEY NOT NULL,
	"practice_id" text NOT NULL,
	"specialty" text NOT NULL,
	"bio" text,
	"qualifications" text,
	"hpcsa" text,
	"experience" integer,
	"languages" text,
	"telehealth" text,
	"status" text DEFAULT 'pending',
	"profile_pic_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" "user_role" NOT NULL,
	"phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"password_hash" text NOT NULL,
	"last_logged_in_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "practices" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"city" text,
	"province" text,
	"zip" text,
	"country" text,
	"phone" text NOT NULL,
	"practice_contact" text,
	"practice_number" text NOT NULL,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_permissions" (
	"admin_id" text NOT NULL,
	"permission_id" text NOT NULL,
	CONSTRAINT "admin_permissions_admin_id_permission_id_pk" PRIMARY KEY("admin_id","permission_id")
);
--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_permissions" ADD CONSTRAINT "admin_permissions_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_permissions" ADD CONSTRAINT "admin_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE no action ON UPDATE no action;