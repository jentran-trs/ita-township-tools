-- v36: payment status at check-in.
--
-- Additive only; safe to re-run. Existing registrants get payment_status NULL
-- ("not tracked") and existing certificates get payment_hold FALSE, so
-- nothing changes for current courses.
--
--  * cert_registrants.balance_due / payment_status come from the AMO export's
--    "Balance Due" column: $0 → 'paid', more than $0 → 'due'.
--  * The door team records HOW someone paid (check or credit card) — nothing
--    else. No check photos or check/card details are stored. Jen can also
--    mark someone paid later. Every payment is a row in cert_payments.
--  * A certificate issued to someone who still owes is created with
--    payment_hold = TRUE: it shows in the public lookup as issued but not yet
--    downloadable. Recording the payment clears the hold.

ALTER TABLE cert_registrants ADD COLUMN IF NOT EXISTS balance_due NUMERIC(10,2);
ALTER TABLE cert_registrants ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE cert_registrants DROP CONSTRAINT IF EXISTS cert_registrants_payment_status_check;
ALTER TABLE cert_registrants ADD CONSTRAINT cert_registrants_payment_status_check
  CHECK (payment_status IS NULL OR payment_status IN ('paid', 'due'));
-- How the current 'paid' status was reached: amo | check | card | admin.
ALTER TABLE cert_registrants ADD COLUMN IF NOT EXISTS payment_method TEXT;

CREATE TABLE IF NOT EXISTS cert_payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id          UUID NOT NULL REFERENCES cert_courses(id) ON DELETE CASCADE,
  registrant_id      UUID NOT NULL REFERENCES cert_registrants(id) ON DELETE CASCADE,
  -- Generated on the phone; makes offline re-uploads idempotent.
  client_payment_id  TEXT UNIQUE,
  method             TEXT NOT NULL CHECK (method IN ('check', 'card', 'admin')),
  recorded_by        TEXT,           -- scanner name/station, or admin email
  recorded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  voided_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS cert_payments_registrant_idx ON cert_payments (registrant_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS cert_payments_course_idx ON cert_payments (course_id);
ALTER TABLE cert_payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE certificates ADD COLUMN IF NOT EXISTS payment_hold BOOLEAN NOT NULL DEFAULT FALSE;
