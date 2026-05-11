-- ============================================================
-- Migration: Add subscription fields to users table
-- Run this on your Supabase database when it's ACTIVE
-- ============================================================

-- Add subscription tracking columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'NONE';

-- Index for webhook lookups by subscription ID
CREATE INDEX IF NOT EXISTS idx_users_subscription_id 
  ON users (subscription_id) 
  WHERE subscription_id IS NOT NULL;

-- Update existing users to have explicit defaults
UPDATE users 
  SET subscription_tier = 'free', 
      subscription_status = 'NONE'
  WHERE subscription_tier IS NULL 
     OR subscription_status IS NULL;
