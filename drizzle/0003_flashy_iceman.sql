CREATE TABLE "doctors" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"specialization" text NOT NULL,
	"phone_number" text NOT NULL,
	"practice_id" text NOT NULL,
	"license_number" text,
	"experience" text,
	"bio" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp DEFAULT now() NOT NULL,
	"locked_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "login_attempts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "practice_doctors" (
	"practice_id" text NOT NULL,
	"doctor_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "practices" DROP CONSTRAINT "practices_email_unique";--> statement-breakpoint
ALTER TABLE "practices" ALTER COLUMN "phone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "practices" ALTER COLUMN "address" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_doctors" ADD CONSTRAINT "practice_doctors_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_doctors" ADD CONSTRAINT "practice_doctors_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practices" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "practices" DROP COLUMN "specialization";--> statement-breakpoint
ALTER TABLE "practices" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "practices" DROP COLUMN "website";--> statement-breakpoint
ALTER TABLE "practices" DROP COLUMN "operating_hours";