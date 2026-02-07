-- Report Projects table - container for collaborative report building
CREATE TABLE report_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Project info
  name TEXT NOT NULL,
  organization_name TEXT NOT NULL,
  description TEXT,
  year TEXT,

  -- Shareable link ID (short, URL-friendly)
  share_id TEXT UNIQUE NOT NULL,

  -- Status
  status TEXT DEFAULT 'collecting' CHECK (status IN ('collecting', 'in_progress', 'completed')),

  -- Owner (Clerk org ID)
  org_id TEXT,
  created_by TEXT,

  -- Settings
  allow_public_submissions BOOLEAN DEFAULT TRUE
);

-- Add project_id to report_submissions
ALTER TABLE report_submissions
ADD COLUMN project_id UUID REFERENCES report_projects(id) ON DELETE SET NULL;

-- Index for project lookups
CREATE INDEX idx_report_projects_share_id ON report_projects(share_id);
CREATE INDEX idx_report_projects_org_id ON report_projects(org_id);
CREATE INDEX idx_report_submissions_project ON report_submissions(project_id);

-- Enable RLS on projects
ALTER TABLE report_projects ENABLE ROW LEVEL SECURITY;

-- Policies for report_projects
CREATE POLICY "Anyone can read projects by share_id" ON report_projects
  FOR SELECT USING (true);

CREATE POLICY "Service role full access to projects" ON report_projects
  FOR ALL USING (true);

-- Function to generate short share IDs
CREATE OR REPLACE FUNCTION generate_share_id() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add content_cards column to report_sections (run if upgrading)
-- ALTER TABLE report_sections ADD COLUMN IF NOT EXISTS content_cards JSONB DEFAULT '[]'::jsonb;
