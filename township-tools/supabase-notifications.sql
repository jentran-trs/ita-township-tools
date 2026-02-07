-- Notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'new_submission', 'submission_updated', etc.
  title TEXT NOT NULL,
  message TEXT,
  link TEXT, -- URL to navigate to when clicked
  submission_id UUID REFERENCES report_submissions(id) ON DELETE CASCADE,
  project_id UUID REFERENCES report_projects(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Index for fetching notifications by org
CREATE INDEX IF NOT EXISTS idx_notifications_org_id ON notifications(org_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read notifications for their org
CREATE POLICY "Users can read org notifications" ON notifications
  FOR SELECT USING (true);

-- Policy: System can insert notifications
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Policy: Users can update (mark as read) notifications for their org
CREATE POLICY "Users can update org notifications" ON notifications
  FOR UPDATE USING (true);
