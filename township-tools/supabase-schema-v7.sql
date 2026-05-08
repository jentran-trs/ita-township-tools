-- Contact Verification (CV) tool schema
-- Run after v1-v6 migrations.

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS cv_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cv_counties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES cv_regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (region_id, slug)
);

CREATE TABLE IF NOT EXISTS cv_townships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES cv_counties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  street_address TEXT,
  mailing_address TEXT,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','completed')),
  completed_at TIMESTAMPTZ,
  completed_by_name TEXT,
  completed_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (county_id, slug)
);

CREATE TABLE IF NOT EXISTS cv_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  township_id UUID NOT NULL REFERENCES cv_townships(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  email TEXT,
  phone TEXT,
  email_status TEXT,
  review_status TEXT NOT NULL DEFAULT 'unreviewed'
    CHECK (review_status IN ('unreviewed','no_change','updated','newly_added')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by_name TEXT,
  reviewed_by_email TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cv_reviewer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_name TEXT,
  reviewer_email TEXT,
  ip TEXT,
  user_agent TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cv_audit_log (
  id BIGSERIAL PRIMARY KEY,
  township_id UUID REFERENCES cv_townships(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES cv_contacts(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  before JSONB,
  after JSONB,
  session_id UUID REFERENCES cv_reviewer_sessions(id) ON DELETE SET NULL,
  reviewer_name TEXT,
  reviewer_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_cv_counties_region ON cv_counties(region_id);
CREATE INDEX IF NOT EXISTS idx_cv_townships_county ON cv_townships(county_id);
CREATE INDEX IF NOT EXISTS idx_cv_contacts_township ON cv_contacts(township_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cv_contacts_township_email_lower
  ON cv_contacts(township_id, lower(email));
CREATE INDEX IF NOT EXISTS idx_cv_audit_township ON cv_audit_log(township_id, created_at DESC);

-- ============================================================
-- View: completion stats
-- ============================================================

CREATE OR REPLACE VIEW cv_completion_stats AS
WITH per_township AS (
  SELECT
    t.id AS township_id,
    t.county_id,
    t.name AS township_name,
    t.status,
    COUNT(c.id) FILTER (WHERE c.deleted_at IS NULL) AS contact_total,
    COUNT(c.id) FILTER (WHERE c.deleted_at IS NULL AND c.review_status <> 'unreviewed') AS contact_reviewed
  FROM cv_townships t
  LEFT JOIN cv_contacts c ON c.township_id = t.id
  GROUP BY t.id
)
SELECT
  r.id AS region_id,
  r.name AS region_name,
  r.slug AS region_slug,
  c.id AS county_id,
  c.name AS county_name,
  c.slug AS county_slug,
  pt.township_id,
  pt.township_name,
  pt.status AS township_status,
  pt.contact_total,
  pt.contact_reviewed
FROM per_township pt
JOIN cv_townships t ON t.id = pt.township_id
JOIN cv_counties c ON c.id = t.county_id
JOIN cv_regions r ON r.id = c.region_id;

-- ============================================================
-- Triggers: updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION cv_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cv_townships_updated_at ON cv_townships;
CREATE TRIGGER cv_townships_updated_at
  BEFORE UPDATE ON cv_townships
  FOR EACH ROW EXECUTE FUNCTION cv_set_updated_at();

DROP TRIGGER IF EXISTS cv_contacts_updated_at ON cv_contacts;
CREATE TRIGGER cv_contacts_updated_at
  BEFORE UPDATE ON cv_contacts
  FOR EACH ROW EXECUTE FUNCTION cv_set_updated_at();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE cv_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_counties ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_townships ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_reviewer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_audit_log ENABLE ROW LEVEL SECURITY;

-- anon (and authenticated) can read the tree + contacts so the public page can render.
DROP POLICY IF EXISTS cv_regions_read ON cv_regions;
CREATE POLICY cv_regions_read ON cv_regions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS cv_counties_read ON cv_counties;
CREATE POLICY cv_counties_read ON cv_counties FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS cv_townships_read ON cv_townships;
CREATE POLICY cv_townships_read ON cv_townships FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS cv_contacts_read ON cv_contacts;
CREATE POLICY cv_contacts_read ON cv_contacts FOR SELECT TO anon, authenticated USING (deleted_at IS NULL);

-- All writes happen through API routes using the service role, which bypasses RLS.
-- No write policies for anon/authenticated.

-- Audit log + sessions: no anon/authenticated access at all (service role only).
