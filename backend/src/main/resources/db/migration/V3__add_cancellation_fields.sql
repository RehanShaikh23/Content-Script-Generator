-- ============================================================
-- Migration: Add subscription cancellation fields to users table
-- ============================================================

-- Add cancellation tracking columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS cancellation_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS access_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(500);
