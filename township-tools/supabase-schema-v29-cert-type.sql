-- v29: certificate type per course. 'training' is the original Certificate
-- of Completion (hours, IC 36-6-4-20 statement, SBOA upload block);
-- 'participation' is a Certificate of Participation with all training
-- wording removed. Existing courses stay 'training'.

ALTER TABLE cert_courses ADD COLUMN IF NOT EXISTS cert_type TEXT NOT NULL DEFAULT 'training';

ALTER TABLE cert_courses DROP CONSTRAINT IF EXISTS cert_courses_cert_type_check;
ALTER TABLE cert_courses ADD CONSTRAINT cert_courses_cert_type_check
  CHECK (cert_type IN ('training', 'participation'));

-- cert_course_summary expands c.* at creation time, so recreate it to pick
-- up the new column.
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
