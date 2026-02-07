-- Assets table: stores metadata about uploaded files
CREATE TABLE assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id TEXT NOT NULL,
  org_name TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  category TEXT DEFAULT 'general',
  description TEXT,
  uploaded_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster org lookups
CREATE INDEX idx_assets_org_id ON assets(org_id);

-- Reports table: stores saved reports
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id TEXT NOT NULL,
  org_name TEXT,
  name TEXT NOT NULL,
  description TEXT,
  data JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster org lookups
CREATE INDEX idx_reports_org_id ON reports(org_id);

-- Enable Row Level Security
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated service role
-- (We'll handle org-level access in our API)
CREATE POLICY "Allow service role full access to assets" ON assets
  FOR ALL USING (true);

CREATE POLICY "Allow service role full access to reports" ON reports
  FOR ALL USING (true);

-- Storage bucket for assets (run this separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true);
