-- v18: capture WHY a certificate was revoked + WHEN. The reason is admin-only
-- (never returned by the public verify endpoint) so it can include internal
-- notes ("attendee didn't actually complete", "wrong recipient", etc.) without
-- leaking PII or fault attribution to outside viewers.

ALTER TABLE certificates ADD COLUMN IF NOT EXISTS revoke_reason TEXT;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
