-- v10: maintenance phase support — verification deadline, daily digest config,
--      and per-admin "last viewed" tracking for unread-style notifications.

-- Single-row settings table (id is always 1)
CREATE TABLE IF NOT EXISTS cv_settings (
  id INT PRIMARY KEY DEFAULT 1,
  verification_deadline DATE,
  digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  digest_recipient_email TEXT,
  digest_last_sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cv_settings_singleton CHECK (id = 1)
);

-- Seed the singleton row if it doesn't exist
INSERT INTO cv_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Per-admin "last viewed dashboard" timestamp, used to compute unread counts.
CREATE TABLE IF NOT EXISTS cv_admin_views (
  admin_user_id TEXT PRIMARY KEY,
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS — service-role only (anon/authenticated cannot read these)
ALTER TABLE cv_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_admin_views ENABLE ROW LEVEL SECURITY;

-- (No anon policies; only service role accesses these tables.)
