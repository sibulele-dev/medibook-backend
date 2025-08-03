CREATE TABLE "password_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
