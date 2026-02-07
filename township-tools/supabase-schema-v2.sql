-- Main submissions table
CREATE TABLE report_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'completed')),

  -- Submitter info
  submitter_name TEXT NOT NULL,
  submitter_email TEXT NOT NULL,
  additional_notes TEXT,

  -- Cover section
  organization_name TEXT NOT NULL,
  report_name TEXT NOT NULL,
  tagline TEXT,
  logo_url TEXT,

  -- Opening letter (optional)
  include_opening_letter BOOLEAN DEFAULT FALSE,
  letter_headshot_url TEXT,
  letter_title TEXT,
  letter_subtitle TEXT,
  letter_content TEXT,
  letter_image1_url TEXT,
  letter_image1_caption TEXT,
  letter_image2_url TEXT,
  letter_image2_caption TEXT,

  -- Footer
  department TEXT,
  street_address TEXT NOT NULL,
  city_state_zip TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT
);

-- Content sections (one-to-many with submissions)
CREATE TABLE report_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID REFERENCES report_submissions(id) ON DELETE CASCADE,
  section_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  title TEXT NOT NULL,
  content TEXT,
  chart_link TEXT,
  image_urls TEXT[],
  image_captions TEXT[],

  UNIQUE(submission_id, section_order)
);

-- Stats within sections (one-to-many with sections)
CREATE TABLE report_section_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID REFERENCES report_sections(id) ON DELETE CASCADE,
  stat_order INTEGER NOT NULL,

  label TEXT NOT NULL,
  value TEXT NOT NULL,

  UNIQUE(section_id, stat_order)
);

-- Indexes
CREATE INDEX idx_report_submissions_status ON report_submissions(status);
CREATE INDEX idx_report_submissions_created ON report_submissions(created_at DESC);
CREATE INDEX idx_report_sections_submission ON report_sections(submission_id);
CREATE INDEX idx_report_section_stats_section ON report_section_stats(section_id);

-- Enable Row Level Security
ALTER TABLE report_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_section_stats ENABLE ROW LEVEL SECURITY;

-- Policies for public insert (form submissions)
CREATE POLICY "Anyone can submit" ON report_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can add sections" ON report_sections FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can add stats" ON report_section_stats FOR INSERT WITH CHECK (true);

-- Policies for service role full access (admin operations)
CREATE POLICY "Service role full access submissions" ON report_submissions FOR ALL USING (true);
CREATE POLICY "Service role full access sections" ON report_sections FOR ALL USING (true);
CREATE POLICY "Service role full access stats" ON report_section_stats FOR ALL USING (true);

-- Create storage bucket for report assets
-- Run this in storage settings or:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('report-assets', 'report-assets', true);
