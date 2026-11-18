-- v45: a registrant cancelled (e.g. the day before). Kept on the list, marked
-- cancelled: no badge printed/numbered, not on the kiosk, not a no-show, not
-- flagged as owing at later events. NULL = not cancelled.
ALTER TABLE cert_registrants
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by text,
  ADD COLUMN IF NOT EXISTS cancel_note text;
