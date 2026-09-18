-- Add password reset columns to users table
-- Run this in Supabase SQL Editor

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('reset_token', 'reset_token_expires');
