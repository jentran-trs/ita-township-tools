-- v30: per-course options for Certificate of Participation courses.
--   participation_statement  wording that replaces the IC 36-6-4-20 statement
--                            (NULL = use the app's default wording)
--   show_sboa                show the SBOA upload QR on participation certs
--                            (training certs always show it)
--   sboa_text                wording above the SBOA QR on participation certs
--                            (NULL = use the app's default wording)

ALTER TABLE cert_courses ADD COLUMN IF NOT EXISTS participation_statement TEXT;
ALTER TABLE cert_courses ADD COLUMN IF NOT EXISTS show_sboa BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE cert_courses ADD COLUMN IF NOT EXISTS sboa_text TEXT;

-- cert_course_summary expands c.* at creation time, so recreate it to pick
-- up the new columns.
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
       WHERE ce.course_id = c.id) AS last_issued_at
  FROM cert_courses c;
