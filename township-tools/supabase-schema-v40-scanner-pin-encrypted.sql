-- v40: keep the event PIN recoverable for the superadmin.
--
-- scanner_pin_hash (v33) is one-way, so a forgotten PIN could only be
-- replaced. scanner_pin_enc holds the same PIN encrypted (AES-256-GCM, key
-- from the server secret) so the course page can show it to the superadmin.
-- Unlocking still checks scanner_pin_hash. PINs set before v40 stay unknown
-- until the PIN is entered again.
--
-- SAFETY: additive, nullable column. Re-running is safe.

ALTER TABLE cert_courses ADD COLUMN IF NOT EXISTS scanner_pin_enc TEXT;
