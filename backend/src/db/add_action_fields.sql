-- Add action_url and action_text fields to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_text VARCHAR(255);
