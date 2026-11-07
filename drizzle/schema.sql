-- ============================================================================
-- Complete PostgreSQL Schema for Pastor
-- Clean, zero-extension schema for cPanel / Shared Hosting PostgreSQL
-- ============================================================================

-- Fallback for gen_random_uuid() ONLY if running an older PostgreSQL (< 13)
-- (PostgreSQL 13+ already includes gen_random_uuid() in core with no extension required)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'gen_random_uuid') THEN
        EXECUTE 'CREATE OR REPLACE FUNCTION gen_random_uuid() RETURNS uuid AS $f$ SELECT md5(random()::text || clock_timestamp()::text)::uuid $f$ LANGUAGE sql';
    END IF;
END $$;

-- 1. better-auth: user
CREATE TABLE IF NOT EXISTS "user" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "email" text NOT NULL,
    "email_verified" boolean DEFAULT false NOT NULL,
    "image" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "user_email_unique" UNIQUE("email")
);

-- 2. better-auth: session
CREATE TABLE IF NOT EXISTS "session" (
    "id" text PRIMARY KEY NOT NULL,
    "expires_at" timestamp NOT NULL,
    "token" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "ip_address" text,
    "user_agent" text,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "session_token_unique" UNIQUE("token")
);

-- 3. better-auth: account
CREATE TABLE IF NOT EXISTS "account" (
    "id" text PRIMARY KEY NOT NULL,
    "account_id" text NOT NULL,
    "provider_id" text NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    "access_token" text,
    "refresh_token" text,
    "id_token" text,
    "access_token_expires_at" timestamp,
    "refresh_token_expires_at" timestamp,
    "scope" text,
    "password" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 4. better-auth: verification
CREATE TABLE IF NOT EXISTS "verification" (
    "id" text PRIMARY KEY NOT NULL,
    "identifier" text NOT NULL,
    "value" text NOT NULL,
    "expires_at" timestamp NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 5. app: profiles
CREATE TABLE IF NOT EXISTS "profiles" (
    "user_id" text PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    "username" varchar(30) NOT NULL,
    "display_name" varchar(60) NOT NULL,
    "bio" varchar(160),
    "avatar_url" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "profiles_username_unique" UNIQUE("username")
);

-- 6. app: links
CREATE TABLE IF NOT EXISTS "links" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    "title" varchar(80) NOT NULL,
    "url" text NOT NULL,
    "position" integer NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "clicks" integer DEFAULT 0 NOT NULL,
    "short_slug" varchar(12),
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- 7. app: short_links
CREATE TABLE IF NOT EXISTS "short_links" (
    "slug" varchar(12) PRIMARY KEY NOT NULL,
    "target_url" text NOT NULL,
    "user_id" text REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    "owner_ip" varchar(64),
    "clicks" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- 8. app: companies
CREATE TABLE IF NOT EXISTS "companies" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    "name" varchar(80) NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- 9. app: card_fields
CREATE TABLE IF NOT EXISTS "card_fields" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    "label" varchar(40) NOT NULL,
    "type" varchar(24) NOT NULL,
    "icon" varchar(16),
    "position" integer NOT NULL
);

-- 10. app: cards
CREATE TABLE IF NOT EXISTS "cards" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    "public_id" varchar(16) NOT NULL,
    "full_name" varchar(80) NOT NULL,
    "title" varchar(80),
    "values" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "position" integer NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "cards_public_id_unique" UNIQUE("public_id")
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS "links_user_idx" ON "links" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "companies_user_idx" ON "companies" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "card_fields_company_idx" ON "card_fields" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "cards_company_idx" ON "cards" USING btree ("company_id");

-- ============================================================================
-- Drizzle Migrations Tracking Table
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS "drizzle";

CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
);

INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
SELECT '0000_init', 1783016478214
WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '0000_init');

INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
SELECT '0001_vcards', 1783331510382
WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '0001_vcards');
