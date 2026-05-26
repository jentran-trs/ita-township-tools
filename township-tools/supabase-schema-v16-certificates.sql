-- v16: Certificate generator tool.
--
-- Tables:
--   cert_courses           one row per training course (admin-managed)
--   cert_signatures        per-course signers (1..N, ED + optional extras)
--   cert_default_signature singleton (id=1) org-default ED signature copied
--                          onto cert_signatures at course-create time
--   certificates           one row per attendee per course; carries the
--                          unique credential_id rendered on the PDF
--
-- View: cert_course_summary  — admin course-list page summary. Built with
-- security_invoker = true so PostgREST evaluates RLS against the caller's
-- role (anon, authenticated, service_role), matching the v14 precedent.
--
-- RLS is enabled with NO public policies. The browser never reaches Supabase
-- directly — every read AND write goes through API routes that use the
-- service-role client (which bypasses RLS by design).
--
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

-- ───────────────────────────────────────────────────────────────────────
-- 1. cert_courses
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cert_courses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  hours       NUMERIC(5,1) NOT NULL CHECK (hours >= 0),
  method      TEXT NOT NULL CHECK (method IN ('in_person','online','hybrid')),
  course_date DATE NOT NULL,
  syllabus    TEXT,
  org_name    TEXT NOT NULL DEFAULT 'Indiana Township Association',
  logo_url    TEXT NOT NULL DEFAULT '/certificates/ita-logo.png',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cert_courses_course_date_idx
  ON cert_courses (course_date DESC);

-- updated_at touch trigger
CREATE OR REPLACE FUNCTION cert_courses_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cert_courses_touch_updated_at ON cert_courses;
CREATE TRIGGER cert_courses_touch_updated_at
  BEFORE UPDATE ON cert_courses
  FOR EACH ROW
  EXECUTE FUNCTION cert_courses_touch_updated_at();

ALTER TABLE cert_courses ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────────────────
-- 2. cert_signatures (per-course signers)
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cert_signatures (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id            UUID NOT NULL REFERENCES cert_courses(id) ON DELETE CASCADE,
  signer_name          TEXT NOT NULL,
  signer_title         TEXT NOT NULL,
  signature_image_url  TEXT NOT NULL,
  display_order        INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cert_signatures_course_idx
  ON cert_signatures (course_id, display_order);

ALTER TABLE cert_signatures ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────────────────
-- 3. cert_default_signature (singleton org-default ED signature)
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cert_default_signature (
  id                   INT PRIMARY KEY CHECK (id = 1),
  signer_name          TEXT NOT NULL,
  signer_title         TEXT NOT NULL DEFAULT 'Executive Director',
  signature_image_url  TEXT NOT NULL,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cert_default_signature ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────────────────
-- 4. certificates (one per attendee per course)
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certificates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id       TEXT NOT NULL UNIQUE,
  course_id           UUID NOT NULL REFERENCES cert_courses(id) ON DELETE RESTRICT,
  attendee_first      TEXT NOT NULL,
  attendee_last       TEXT NOT NULL,
  attendee_email      TEXT NOT NULL,
  attendee_township   TEXT,
  attendee_county     TEXT,
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','revoked','reissued')),
  issued_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_downloaded_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS certificates_email_idx
  ON certificates (attendee_email);
CREATE INDEX IF NOT EXISTS certificates_course_idx
  ON certificates (course_id);
CREATE INDEX IF NOT EXISTS certificates_credential_idx
  ON certificates (credential_id);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────────────────
-- 5. cert_course_summary view (active count + last issued, for admin list)
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW cert_course_summary
  WITH (security_invoker = true)
  AS
  SELECT
    c.*,
    COALESCE(
      (SELECT COUNT(*) FROM certificates ce
         WHERE ce.course_id = c.id AND ce.status = 'active'),
      0
    ) AS active_count,
    (SELECT MAX(issued_at) FROM certificates ce
       WHERE ce.course_id = c.id) AS last_issued_at
  FROM cert_courses c;
