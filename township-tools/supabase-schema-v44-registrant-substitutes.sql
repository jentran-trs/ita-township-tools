-- v44: someone else attends on a registration ("Jim is coming in place of Sheri").
-- The registration's name/details become the person attending; the original
-- registrant's details are kept here so we know whose registration it was
-- (and can find it in AMO). NULL = the registered person is attending.
ALTER TABLE cert_registrants
  ADD COLUMN IF NOT EXISTS substituted_for jsonb,
  ADD COLUMN IF NOT EXISTS substituted_at timestamptz,
  ADD COLUMN IF NOT EXISTS substituted_by text;

COMMENT ON COLUMN cert_registrants.substituted_for IS
  'Original registrant when someone else attends in their place: {first_name,last_name,email,title,township,county,organization}';
