-- v32: badge registrant type + event tagline.
--
-- Additive only; safe to re-run. Existing courses/registrants get NULLs and
-- badges fall back to "ATTENDEE" with no tagline.

-- Shown under the event name on badges, e.g. "Ready Today, Resilient Tomorrow".
ALTER TABLE cert_courses ADD COLUMN IF NOT EXISTS badge_tagline TEXT;

-- From the AMO "Registrant Type" column (Attendee, Sponsor, Speaker, ...).
-- Drives the coloured bar at the bottom of the badge.
ALTER TABLE cert_registrants ADD COLUMN IF NOT EXISTS registrant_type TEXT;

-- Organization for people who aren't from a township (e.g. a sponsor's
-- company), from AMO's "Organization" column. Shown where the township goes.
ALTER TABLE cert_registrants ADD COLUMN IF NOT EXISTS organization TEXT;

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
