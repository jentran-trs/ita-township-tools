-- v24: store each contact's AMO Individual ID.
--
-- Lets a verified-contact export carry the AMO ID so it can be re-imported into
-- AMO and matched to the existing record (instead of creating duplicates).
-- Populated by matching an AMO "Individual Report" export against cv_contacts
-- (by email, then name + organization).

ALTER TABLE cv_contacts ADD COLUMN IF NOT EXISTS amo_individual_id TEXT;

CREATE INDEX IF NOT EXISTS cv_contacts_amo_individual_id_idx
  ON cv_contacts (amo_individual_id);
