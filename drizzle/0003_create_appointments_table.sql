CREATE TABLE "appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_name" text NOT NULL,
	"patient_email" text,
	"patient_phone" text NOT NULL,
	"doctor_id" text NOT NULL,
	"practice_id" text,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"note" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;