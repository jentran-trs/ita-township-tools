-- v26: store each township's AMO Organization ID.
--
-- Lets a verified-contact export carry the organization's AMO ID so re-imported
-- individuals are matched to the correct existing organization in AMO instead of
-- creating duplicate organizations. Populated by matching an AMO "Organization
-- Report" export against cv_townships (by organization name, i.e.
-- "<Township> Township, <County> County").

ALTER TABLE cv_townships ADD COLUMN IF NOT EXISTS amo_organization_id TEXT;

CREATE INDEX IF NOT EXISTS cv_townships_amo_organization_id_idx
  ON cv_townships (amo_organization_id);
