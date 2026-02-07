-- Report Drafts table - stores saved versions of reports linked to projects
CREATE TABLE IF NOT EXISTS report_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES report_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Draft',
  data JSONB NOT NULL,  -- Full report data (logo, themeColors, sections)
  created_by TEXT,  -- Clerk User ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by project
CREATE INDEX IF NOT EXISTS idx_report_drafts_project_id ON report_drafts(project_id);

-- Only keep the most recent draft per project (optional - uncomment if you want only one draft per project)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_report_drafts_project_unique ON report_drafts(project_id);

-- RLS Policies (if using RLS)
-- ALTER TABLE report_drafts ENABLE ROW LEVEL SECURITY;
