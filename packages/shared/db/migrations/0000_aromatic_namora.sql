CREATE TYPE "public"."color_role" AS ENUM('primary', 'ink', 'paper', 'secondary', 'tint');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('owner', 'admin', 'editor', 'viewer');--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studio_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"domains" text[] DEFAULT '{}'::text[] NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"theme_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "color_themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studio_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"studio_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "membership_role" DEFAULT 'editor' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_studio_id_user_id_pk" PRIMARY KEY("studio_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "studios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studios_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "theme_colors" (
	"theme_id" uuid NOT NULL,
	"role" "color_role" NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"hex" text NOT NULL,
	"purpose" text DEFAULT '' NOT NULL,
	CONSTRAINT "theme_colors_theme_id_role_pk" PRIMARY KEY("theme_id","role"),
	CONSTRAINT "theme_colors_hex_format" CHECK ("theme_colors"."hex" ~ '^#[0-9A-Fa-f]{6}$')
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_theme_id_color_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."color_themes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "color_themes" ADD CONSTRAINT "color_themes_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theme_colors" ADD CONSTRAINT "theme_colors_theme_id_color_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."color_themes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brands_studio_slug_idx" ON "brands" USING btree ("studio_id","slug");--> statement-breakpoint
CREATE INDEX "brands_theme_id_idx" ON "brands" USING btree ("theme_id");--> statement-breakpoint
CREATE UNIQUE INDEX "color_themes_studio_slug_idx" ON "color_themes" USING btree ("studio_id","slug");--> statement-breakpoint
CREATE INDEX "memberships_user_id_idx" ON "memberships" USING btree ("user_id");