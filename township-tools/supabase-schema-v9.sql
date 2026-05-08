-- v9: track previous email + status when reviewer updates the email,
--     and add 'needs_removal' as a review_status (instead of soft-deleting).

-- Drop and re-add the review_status CHECK to include 'needs_removal'
ALTER TABLE cv_contacts DROP CONSTRAINT IF EXISTS cv_contacts_review_status_check;
ALTER TABLE cv_contacts
  ADD CONSTRAINT cv_contacts_review_status_check
  CHECK (review_status IN ('unreviewed','no_change','updated','newly_added','needs_removal'));

-- Snapshot fields for the email-change history
ALTER TABLE cv_contacts ADD COLUMN IF NOT EXISTS previous_email TEXT;
ALTER TABLE cv_contacts ADD COLUMN IF NOT EXISTS previous_email_status TEXT;

-- Update the completion-stats view so 'needs_removal' counts as reviewed
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
