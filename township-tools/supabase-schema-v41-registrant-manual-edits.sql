-- v41: hand edits to a registrant survive the next AMO import.
--
-- edited_at:    set when the superadmin edits name/email/title/type/place.
--               A later AMO import keeps those hand-edited details (it still
--               updates balance/payment).
-- original_key: the AMO match key (email + first + last) from before the
--               first edit, so the import still recognizes the person after
--               a name or email correction instead of adding them again.
--
-- SAFETY: additive, nullable columns. Re-running is safe.

ALTER TABLE cert_registrants ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE cert_registrants ADD COLUMN IF NOT EXISTS original_key TEXT;
