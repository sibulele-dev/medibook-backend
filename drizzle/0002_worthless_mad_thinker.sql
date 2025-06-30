CREATE TABLE "practices" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"address" text,
	"specialization" text DEFAULT 'General Practice',
	"description" text,
	"status" text DEFAULT 'active',
	"website" text,
	"operating_hours" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "practices_email_unique" UNIQUE("email")
);
