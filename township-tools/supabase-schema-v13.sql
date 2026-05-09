-- v13: per-contact "seen" tracking so the superadmin can mark individual recent
-- changes as reviewed without bumping the global last_viewed_at.

CREATE TABLE IF NOT EXISTS cv_admin_seen_contacts (
  admin_user_id TEXT NOT NULL,
  contact_id UUID NOT NULL REFERENCES cv_contacts(id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (admin_user_id, contact_id)
);

ALTER TABLE cv_admin_seen_contacts ENABLE ROW LEVEL SECURITY;
