-- Add clerk_user_id column to report_submissions for better user matching
ALTER TABLE report_submissions ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;

-- Add status column to report_projects if not exists
ALTER TABLE report_projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'collecting_assets';

-- Index for faster lookups by clerk_user_id
CREATE INDEX IF NOT EXISTS idx_report_submissions_clerk_user_id ON report_submissions(clerk_user_id);

-- Update existing "collecting" status to "collecting_assets"
UPDATE report_projects SET status = 'collecting_assets' WHERE status = 'collecting';
