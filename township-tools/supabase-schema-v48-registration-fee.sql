-- v48: the event's registration fee. Walk-ins (and anyone still owing without
-- an AMO balance) owe this amount; used for "Payment due" amounts and the
-- Unpaid across events totals. NULL = not set.
ALTER TABLE cert_courses
  ADD COLUMN IF NOT EXISTS registration_fee numeric(10,2);
