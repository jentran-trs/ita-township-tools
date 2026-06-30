-- v27: Manual open/close override for the Contact Verification portal.
--
-- The portal's open/closed state has until now been derived purely from
-- verification_deadline (see lib/contact-verification/portal-lock.ts). This adds
-- a superadmin-controlled override so the portal can be opened or closed on
-- demand without touching the deadline:
--   'auto'   -> use the deadline-window logic (default, unchanged behavior)
--   'open'   -> force open regardless of the deadline window
--   'closed' -> force closed (public writes rejected; closed notification shown)

ALTER TABLE cv_settings
  ADD COLUMN IF NOT EXISTS portal_status_override text NOT NULL DEFAULT 'auto';

ALTER TABLE cv_settings
  DROP CONSTRAINT IF EXISTS cv_settings_portal_status_override_check;

ALTER TABLE cv_settings
  ADD CONSTRAINT cv_settings_portal_status_override_check
  CHECK (portal_status_override IN ('auto', 'open', 'closed'));
