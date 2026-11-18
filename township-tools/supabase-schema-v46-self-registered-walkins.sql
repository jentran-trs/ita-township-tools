-- v46: walk-ins who register themselves on the check-in tablet ("Register" on
-- the Find My Badge Number screen). They wait in the scanner's "Waiting at the
-- desk" list until the desk records payment and checks them in.
ALTER TABLE cert_registrants
  ADD COLUMN IF NOT EXISTS self_registered_at timestamptz;
