-- v35: hide a course from the public (e.g. test courses).
--
-- Additive only; safe to re-run. A hidden course stays in the admin list
-- (marked "Hidden from public"), but it is left out of the public lookup
-- page's course list, its certificates don't come up in the public lookup,
-- and its verify/QR links show "not found". Nothing is deleted.
ALTER TABLE cert_courses ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;

-- Re-create the summary view so c.* picks up the new column.
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
