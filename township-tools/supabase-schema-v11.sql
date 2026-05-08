-- v11: full original-values snapshot so Undo can restore every editable field,
-- not just email/email_status.

ALTER TABLE cv_contacts ADD COLUMN IF NOT EXISTS original_values JSONB;
