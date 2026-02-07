-- Schema v4: Collaborative Contribution System with Resume Capability
-- Run this migration after v3

-- ============================================
-- 1. Add finalization fields to report_projects
-- ============================================
ALTER TABLE report_projects
ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS finalized_by TEXT;

-- ============================================
-- 2. Create contributor_sessions table
-- ============================================
CREATE TABLE IF NOT EXISTS contributor_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Link to project
  project_id UUID REFERENCES report_projects(id) ON DELETE CASCADE NOT NULL,

  -- For anonymous contributors (optional, for future magic link feature)
  email TEXT,

  -- For Clerk members (logged-in users)
  clerk_user_id TEXT,

  -- Magic link tokens (for future implementation)
  magic_token TEXT UNIQUE,
  magic_token_expires_at TIMESTAMP WITH TIME ZONE,

  -- Draft form data stored as JSON
  draft_data JSONB DEFAULT '{}'::jsonb,

  -- Session status
  status TEXT DEFAULT 'drafting' CHECK (status IN ('drafting', 'submitted')),

  -- Link to final submission (when submitted)
  submission_id UUID REFERENCES report_submissions(id) ON DELETE SET NULL,

  -- Unique constraints: one session per contributor per project
  UNIQUE(project_id, email),
  UNIQUE(project_id, clerk_user_id)
);

-- ============================================
-- 3. Add contributor_session_id to report_submissions
-- ============================================
ALTER TABLE report_submissions
ADD COLUMN IF NOT EXISTS contributor_session_id UUID REFERENCES contributor_sessions(id);

-- ============================================
-- 4. Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_contributor_sessions_project
  ON contributor_sessions(project_id);

CREATE INDEX IF NOT EXISTS idx_contributor_sessions_clerk_user
  ON contributor_sessions(clerk_user_id);

CREATE INDEX IF NOT EXISTS idx_contributor_sessions_magic_token
  ON contributor_sessions(magic_token);

CREATE INDEX IF NOT EXISTS idx_report_submissions_contributor_session
  ON report_submissions(contributor_session_id);

CREATE INDEX IF NOT EXISTS idx_report_projects_finalized
  ON report_projects(finalized_at);

-- ============================================
-- 5. Enable RLS on contributor_sessions
-- ============================================
ALTER TABLE contributor_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read sessions (needed for public contribution forms)
CREATE POLICY "Anyone can read contributor sessions" ON contributor_sessions
  FOR SELECT USING (true);

-- Policy: Service role has full access
CREATE POLICY "Service role full access to contributor sessions" ON contributor_sessions
  FOR ALL USING (true);

-- ============================================
-- 6. Function to update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_contributor_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS contributor_sessions_updated_at ON contributor_sessions;
CREATE TRIGGER contributor_sessions_updated_at
  BEFORE UPDATE ON contributor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_contributor_session_updated_at();
