-- v15: track when a contact has been pushed into AMO so the superadmin
-- doesn't re-sync the same entries. Any subsequent edit to the contact's
-- data clears these flags (handled in application code) so the contact
-- reappears in the "not synced" filter.

ALTER TABLE cv_contacts ADD COLUMN IF NOT EXISTS amo_updated_at TIMESTAMPTZ;
ALTER TABLE cv_contacts ADD COLUMN IF NOT EXISTS amo_updated_by TEXT;

CREATE INDEX IF NOT EXISTS idx_cv_contacts_amo_updated_at
  ON cv_contacts(amo_updated_at);
