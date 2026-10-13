-- v28: optional end date so a course can span a date range (e.g. a
-- multi-day conference). course_date stays the start date; course_end_date
-- is NULL for single-day courses.

ALTER TABLE cert_courses ADD COLUMN IF NOT EXISTS course_end_date DATE;

ALTER TABLE cert_courses DROP CONSTRAINT IF EXISTS cert_courses_end_after_start;
ALTER TABLE cert_courses ADD CONSTRAINT cert_courses_end_after_start
  CHECK (course_end_date IS NULL OR course_end_date >= course_date);

-- cert_course_summary was built with c.*, which Postgres expands at creation
-- time, so it has to be recreated to pick up the new column.
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
