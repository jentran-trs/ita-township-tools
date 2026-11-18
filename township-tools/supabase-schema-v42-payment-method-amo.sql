-- v42: the check-in team can record "Paid in AMO" (paid online, e.g. after the
-- last AMO export), alongside check and credit card.
--
-- SAFETY: widens an existing CHECK constraint only. Re-running is safe.

ALTER TABLE cert_payments DROP CONSTRAINT IF EXISTS cert_payments_method_check;
ALTER TABLE cert_payments ADD CONSTRAINT cert_payments_method_check
  CHECK (method IN ('check', 'card', 'admin', 'amo'));
