-- v25 — Contact Verification: per-contact "synced to MailChimp" stamp.
-- Mirrors the AMO sync columns (v-prior) so the superadmin can track which
-- contacts have been pushed to MailChimp. Any future contact-data edit clears
-- the stamp (handled in app/api/verify/contact and the admin contact route).

ALTER TABLE cv_contacts ADD COLUMN IF NOT EXISTS mailchimp_updated_at TIMESTAMPTZ;
ALTER TABLE cv_contacts ADD COLUMN IF NOT EXISTS mailchimp_updated_by TEXT;

CREATE INDEX IF NOT EXISTS idx_cv_contacts_mailchimp_updated_at
  ON cv_contacts (mailchimp_updated_at);
