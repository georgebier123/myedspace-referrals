-- =============================================
-- ADD SLACK NOTIFICATIONS TOGGLE TO CAMPAIGNS
-- Run this in your Supabase SQL Editor
-- =============================================

-- Add slack_notifications column (defaults to true for existing campaigns)
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS slack_notifications BOOLEAN NOT NULL DEFAULT true;
