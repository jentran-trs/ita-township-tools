-- v49: "Waive fee" — the office lets someone attend free. Recorded like a
-- payment (method 'waived') so they no longer owe and certificates release.
ALTER TABLE cert_payments DROP CONSTRAINT IF EXISTS cert_payments_method_check;
ALTER TABLE cert_payments ADD CONSTRAINT cert_payments_method_check
  CHECK (method IN ('check', 'card', 'admin', 'amo', 'waived'));
