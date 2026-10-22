-- =============================================================================
-- Tiketix: All-in-One Booking & Ticketing Event System
-- Pure PostgreSQL Database Initialization Script
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if re-initializing (in reverse dependency order)
DROP TABLE IF EXISTS "tickets" CASCADE;
DROP TABLE IF EXISTS "payment_transactions" CASCADE;
DROP TABLE IF EXISTS "booking_items" CASCADE;
DROP TABLE IF EXISTS "bookings" CASCADE;
DROP TABLE IF EXISTS "ticket_tiers" CASCADE;
DROP TABLE IF EXISTS "events" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- Drop Enums if exist
DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "EventStatus" CASCADE;
DROP TYPE IF EXISTS "BookingStatus" CASCADE;
DROP TYPE IF EXISTS "PaymentStatus" CASCADE;
DROP TYPE IF EXISTS "TicketStatus" CASCADE;

-- Create Enums
CREATE TYPE "UserRole" AS ENUM ('ORGANIZER', 'ATTENDEE', 'ADMIN');
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SETTLEMENT', 'EXPIRED', 'FAILED');
CREATE TYPE "TicketStatus" AS ENUM ('ACTIVE', 'CHECKED_IN', 'CANCELLED');

-- 1. Users Table
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ATTENDEE',
    "phone_number" VARCHAR(30),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_email_key" UNIQUE ("email")
);

-- 2. Events Table
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organizer_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "venue_name" VARCHAR(255) NOT NULL,
    "venue_address" TEXT,
    "poster_url" VARCHAR(500),
    "banner_url" VARCHAR(500),
    "event_date" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6),
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "events_slug_key" UNIQUE ("slug"),
    CONSTRAINT "events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 3. Ticket Tiers Table
-- Includes CHECK constraint: available_quota >= 0
CREATE TABLE "ticket_tiers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "event_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "total_quota" INTEGER NOT NULL,
    "available_quota" INTEGER NOT NULL,
    "start_sale_date" TIMESTAMPTZ(6),
    "end_sale_date" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_tiers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ticket_tiers_available_quota_check" CHECK ("available_quota" >= 0),
    CONSTRAINT "ticket_tiers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 4. Bookings Table
CREATE TABLE "bookings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "booking_code" VARCHAR(50) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bookings_booking_code_key" UNIQUE ("booking_code"),
    CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bookings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 5. Booking Items Table
CREATE TABLE "booking_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "booking_id" UUID NOT NULL,
    "ticket_tier_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "booking_items_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "booking_items_ticket_tier_id_fkey" FOREIGN KEY ("ticket_tier_id") REFERENCES "ticket_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 6. Payment Transactions Table
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "booking_id" UUID NOT NULL,
    "transaction_code" VARCHAR(100) NOT NULL,
    "payment_gateway" VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMPTZ(6),
    "payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payment_transactions_transaction_code_key" UNIQUE ("transaction_code"),
    CONSTRAINT "payment_transactions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 7. Tickets Table
CREATE TABLE "tickets" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "booking_id" UUID NOT NULL,
    "booking_item_id" UUID NOT NULL,
    "ticket_tier_id" UUID NOT NULL,
    "ticket_code" VARCHAR(50) NOT NULL,
    "qr_hash" VARCHAR(255) NOT NULL,
    "attendee_name" VARCHAR(255) NOT NULL,
    "attendee_email" VARCHAR(255) NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'ACTIVE',
    "checked_in_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tickets_ticket_code_key" UNIQUE ("ticket_code"),
    CONSTRAINT "tickets_qr_hash_key" UNIQUE ("qr_hash"),
    CONSTRAINT "tickets_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tickets_booking_item_id_fkey" FOREIGN KEY ("booking_item_id") REFERENCES "booking_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tickets_ticket_tier_id_fkey" FOREIGN KEY ("ticket_tier_id") REFERENCES "ticket_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Foreign Key Indexes
CREATE INDEX "idx_events_organizer_id" ON "events"("organizer_id");
CREATE INDEX "idx_ticket_tiers_event_id" ON "ticket_tiers"("event_id");
CREATE INDEX "idx_bookings_user_id" ON "bookings"("user_id");
CREATE INDEX "idx_bookings_event_id" ON "bookings"("event_id");
CREATE INDEX "idx_booking_items_booking_id" ON "booking_items"("booking_id");
CREATE INDEX "idx_booking_items_ticket_tier_id" ON "booking_items"("ticket_tier_id");
CREATE INDEX "idx_payment_transactions_booking_id" ON "payment_transactions"("booking_id");
CREATE INDEX "idx_tickets_booking_id" ON "tickets"("booking_id");
CREATE INDEX "idx_tickets_booking_item_id" ON "tickets"("booking_item_id");
CREATE INDEX "idx_tickets_ticket_tier_id" ON "tickets"("ticket_tier_id");

-- Specific Required Indexes
CREATE INDEX "idx_events_slug" ON "events"("slug");
CREATE INDEX "idx_bookings_booking_code" ON "bookings"("booking_code");
CREATE INDEX "idx_tickets_qr_hash" ON "tickets"("qr_hash");
