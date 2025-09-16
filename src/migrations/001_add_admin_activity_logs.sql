-- Migration: Add admin activity logs table
-- Description: Creates table for tracking admin activities and actions

CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_action ON admin_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_timestamp ON admin_activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_resource ON admin_activity_logs(resource);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_success ON admin_activity_logs(success);

-- Add foreign key constraint to users table
ALTER TABLE admin_activity_logs 
ADD CONSTRAINT fk_admin_activity_logs_admin_id 
FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE admin_activity_logs IS 'Logs all admin activities and actions for audit purposes';
COMMENT ON COLUMN admin_activity_logs.id IS 'Unique identifier for the activity log entry';
COMMENT ON COLUMN admin_activity_logs.admin_id IS 'ID of the admin who performed the action';
COMMENT ON COLUMN admin_activity_logs.action IS 'Type of action performed (e.g., user_created, user_deleted)';
COMMENT ON COLUMN admin_activity_logs.resource IS 'Type of resource affected (e.g., user, admin, practice)';
COMMENT ON COLUMN admin_activity_logs.resource_id IS 'ID of the specific resource affected';
COMMENT ON COLUMN admin_activity_logs.details IS 'Additional details about the action in JSON format';
COMMENT ON COLUMN admin_activity_logs.ip_address IS 'IP address of the admin when the action was performed';
COMMENT ON COLUMN admin_activity_logs.user_agent IS 'User agent string of the admin when the action was performed';
COMMENT ON COLUMN admin_activity_logs.timestamp IS 'When the action was performed';
COMMENT ON COLUMN admin_activity_logs.success IS 'Whether the action was successful or not';
COMMENT ON COLUMN admin_activity_logs.created_at IS 'When this log entry was created';
