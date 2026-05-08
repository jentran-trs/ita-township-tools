-- Track per-township address review.
-- 'unreviewed' until a reviewer confirms or updates the addresses.

ALTER TABLE cv_townships
  ADD COLUMN IF NOT EXISTS address_status TEXT NOT NULL DEFAULT 'unreviewed'
    CHECK (address_status IN ('unreviewed','confirmed','updated'));

ALTER TABLE cv_townships
  ADD COLUMN IF NOT EXISTS address_reviewed_at TIMESTAMPTZ;

ALTER TABLE cv_townships
  ADD COLUMN IF NOT EXISTS address_reviewed_by_name TEXT;

ALTER TABLE cv_townships
  ADD COLUMN IF NOT EXISTS address_reviewed_by_email TEXT;
