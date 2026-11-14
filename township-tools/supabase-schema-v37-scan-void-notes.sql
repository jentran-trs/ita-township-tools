-- v37: record who removed a check-in/out time, and why.
--
-- cert_attendance_scans is append-only: removing a time only sets voided_at.
-- These columns keep the reason and the admin alongside it, so every change
-- to someone's attendance has a note (manual entries already have
-- entered_by + note from v33).
--
-- SAFETY: additive, nullable columns. Re-running is safe.

ALTER TABLE cert_attendance_scans ADD COLUMN IF NOT EXISTS voided_by TEXT;
ALTER TABLE cert_attendance_scans ADD COLUMN IF NOT EXISTS void_note TEXT;
