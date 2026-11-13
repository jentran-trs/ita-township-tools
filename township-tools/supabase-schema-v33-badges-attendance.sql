-- v33 (was v31 on the badge branch): Badges + QR check-in/check-out attendance for certificate courses.
--
-- Flow: registrants are imported before the event (AMO Excel export), each
-- gets a random badge_token printed as a QR code on their badge. Door staff
-- scan badges on the Township Tools scanner page (unlocked by a per-event
-- PIN). Every scan is one row in cert_attendance_scans. A registrant
-- "attended" when they have a check-in AND a check-out on every day from
-- course_date through course_end_date (inclusive). Certificates are then
-- issued only to registrants who attended.
--
-- All times are stored as TIMESTAMPTZ and displayed in America/New_York.
-- `scan_date` is the Eastern-time calendar day the scan counts toward.
--
-- RLS is enabled with NO public policies, matching v16: every read and write
-- goes through API routes using the service-role client.

-- SAFETY: everything here is additive (new tables, new nullable / defaulted
-- columns). Existing courses get badge_checkin_enabled = FALSE and existing
-- certificates get hours_override = NULL, so they behave exactly as before.
-- Re-running this file is safe.

-- ───────────────────────────────────────────────────────────────────────
-- 1. Event times + scanner PIN on the course
-- ───────────────────────────────────────────────────────────────────────
-- Badge check-in is opt-in per course; off for every existing course.
ALTER TABLE cert_courses ADD COLUMN IF NOT EXISTS badge_checkin_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE cert_courses ADD COLUMN IF NOT EXISTS event_start_time TIME;
ALTER TABLE cert_courses ADD COLUMN IF NOT EXISTS event_end_time TIME;
-- SHA-256 of the per-event scanner PIN. NULL = scanning disabled.
ALTER TABLE cert_courses ADD COLUMN IF NOT EXISTS scanner_pin_hash TEXT;
-- Bumped whenever the PIN changes so existing scanner sessions are revoked.
ALTER TABLE cert_courses ADD COLUMN IF NOT EXISTS scanner_pin_version INT NOT NULL DEFAULT 0;

-- ───────────────────────────────────────────────────────────────────────
-- 2. cert_registrants — one per person expected (or walked in) per course
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cert_registrants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id        UUID NOT NULL REFERENCES cert_courses(id) ON DELETE CASCADE,
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  email            TEXT NOT NULL,
  title            TEXT,
  township         TEXT,
  county           TEXT,
  -- Random, opaque value encoded in the QR code. Contains no personal data
  -- and is unrelated to the certificate credential_id. Cancelling a lost
  -- badge rotates this token so the old printout stops working.
  badge_token      TEXT NOT NULL UNIQUE,
  is_walk_in       BOOLEAN NOT NULL DEFAULT FALSE,
  -- Partial credit: hours Jen enters per attended day, e.g.
  -- {"2026-11-12": 6, "2026-11-13": 3.5}. NULL = full course hours.
  day_hours        JSONB,
  -- Set once a certificate is issued from attendance.
  certificate_id   UUID REFERENCES certificates(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cert_registrants_course_idx
  ON cert_registrants (course_id, last_name, first_name);
CREATE INDEX IF NOT EXISTS cert_registrants_email_idx
  ON cert_registrants (course_id, email);

CREATE OR REPLACE FUNCTION cert_registrants_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cert_registrants_touch_updated_at ON cert_registrants;
CREATE TRIGGER cert_registrants_touch_updated_at
  BEFORE UPDATE ON cert_registrants
  FOR EACH ROW
  EXECUTE FUNCTION cert_registrants_touch_updated_at();

ALTER TABLE cert_registrants ENABLE ROW LEVEL SECURITY;
-- Covers databases where an earlier draft of this file created the table
-- before day_hours existed.
ALTER TABLE cert_registrants ADD COLUMN IF NOT EXISTS day_hours JSONB;

-- ───────────────────────────────────────────────────────────────────────
-- 3. cert_attendance_scans — append-only log of check-ins and check-outs
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cert_attendance_scans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id        UUID NOT NULL REFERENCES cert_courses(id) ON DELETE CASCADE,
  registrant_id    UUID NOT NULL REFERENCES cert_registrants(id) ON DELETE CASCADE,
  scan_date        DATE NOT NULL,             -- Eastern-time day this counts toward
  direction        TEXT NOT NULL CHECK (direction IN ('in','out')),
  scanned_at       TIMESTAMPTZ NOT NULL,      -- when it happened (phone clock for offline scans)
  received_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source           TEXT NOT NULL DEFAULT 'scan'
                     CHECK (source IN ('scan','name_search','manual')),
  -- Generated on the phone; makes offline re-uploads idempotent.
  client_scan_id   TEXT UNIQUE,
  device_label     TEXT,                      -- e.g. "Front door - Amy"
  entered_by       TEXT,                      -- admin who made a manual entry
  note             TEXT,                      -- reason for a manual entry
  voided_at        TIMESTAMPTZ                -- set when an admin removes a bad scan
);

CREATE INDEX IF NOT EXISTS cert_attendance_scans_course_idx
  ON cert_attendance_scans (course_id, scan_date);
CREATE INDEX IF NOT EXISTS cert_attendance_scans_registrant_idx
  ON cert_attendance_scans (registrant_id, scan_date, direction);

ALTER TABLE cert_attendance_scans ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────────────────
-- 4. Partial credit on certificates
-- ───────────────────────────────────────────────────────────────────────
-- NULL (every existing certificate) = show the course hours, as today.
-- Set only when a partial attendee's certificate is issued from badge
-- attendance with hours entered per day.
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS hours_override NUMERIC(5,1)
  CHECK (hours_override IS NULL OR hours_override >= 0);

-- ───────────────────────────────────────────────────────────────────────
-- 5. Re-create cert_course_summary so c.* picks up the new columns
-- ───────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS cert_course_summary;
CREATE VIEW cert_course_summary
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
       WHERE ce.course_id = c.id) AS last_issued_at,
    COALESCE(
      (SELECT COUNT(*) FROM cert_registrants r WHERE r.course_id = c.id),
      0
    ) AS registrant_count
  FROM cert_courses c;
