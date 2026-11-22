-- v47: the office reviewed someone in "Needs review" (e.g. left early with a
-- good reason) and accepts their attendance. They count as attended with full
-- credit until the review is undone. Payment is tracked separately.
ALTER TABLE cert_registrants
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS review_note text;
