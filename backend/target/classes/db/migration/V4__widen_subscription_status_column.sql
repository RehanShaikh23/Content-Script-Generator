-- ============================================================
-- Migration: Widen subscription_status column to fit CANCELLATION_SCHEDULED
-- The original VARCHAR(20) was too narrow for the 23-char status value.
-- ============================================================

ALTER TABLE users
  ALTER COLUMN subscription_status TYPE VARCHAR(30);
