-- v20: Live Q&A tool.
--
-- A superadmin runs live Q&A during meetings/conventions. Attendees submit
-- questions from a public page; the superadmin watches them arrive on a private
-- console, copies them (to paste into a Teams chat), APPROVES selected ones onto
-- a separate PUBLIC "live board" she screencasts to the audience, and DISMISSES
-- them when done (restorable). Organized into one SESSION per meeting.
--
-- Tables:
--   lqa_sessions   one row per meeting; holds two unguessable short codes —
--                  submit_code (attendee submit link) and board_code (public
--                  screencast board link), kept separate on purpose.
--   lqa_questions  one row per submitted question; status pending → approved →
--                  dismissed (restorable back to pending).
--
-- View: lqa_session_summary — admin session-list page summary (per-lane counts).
-- Built with security_invoker = true so PostgREST evaluates RLS against the
-- caller's role, matching the v14/v16 precedent.
--
-- RLS is enabled. lqa_sessions has NO public policies (admin/service-role only).
-- lqa_questions has a single anon INSERT-only policy as defense-in-depth, but the
-- app still funnels every submit through the service-role API route (which also
-- enforces the honeypot, length caps, and the session-closed check). No anon
-- SELECT anywhere — the public live board reads via a service-role API route,
-- exactly like the certificate lookup page.
--
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

-- ───────────────────────────────────────────────────────────────────────
-- 1. lqa_sessions
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lqa_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  submit_code  TEXT NOT NULL UNIQUE,
  board_code   TEXT NOT NULL UNIQUE,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lqa_sessions_created_at_idx
  ON lqa_sessions (created_at DESC);

-- updated_at touch trigger (mirrors cert_courses_touch_updated_at)
CREATE OR REPLACE FUNCTION lqa_sessions_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lqa_sessions_touch_updated_at ON lqa_sessions;
CREATE TRIGGER lqa_sessions_touch_updated_at
  BEFORE UPDATE ON lqa_sessions
  FOR EACH ROW
  EXECUTE FUNCTION lqa_sessions_touch_updated_at();

ALTER TABLE lqa_sessions ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────────────────
-- 2. lqa_questions
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lqa_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES lqa_sessions(id) ON DELETE CASCADE,
  question      TEXT NOT NULL,
  name          TEXT NOT NULL,
  township      TEXT,
  county        TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','dismissed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at   TIMESTAMPTZ,
  dismissed_at  TIMESTAMPTZ
);

-- Drives the 3s admin poll (incoming, by arrival) and the live-board poll
-- (approved, by approval time).
CREATE INDEX IF NOT EXISTS lqa_questions_session_status_created_idx
  ON lqa_questions (session_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS lqa_questions_session_status_approved_idx
  ON lqa_questions (session_id, status, approved_at DESC);

ALTER TABLE lqa_questions ENABLE ROW LEVEL SECURITY;

-- Defense-in-depth anon INSERT. The app does NOT rely on this — every submit
-- goes through the service-role route /api/live-qa/submit. No anon SELECT.
DROP POLICY IF EXISTS lqa_questions_anon_insert ON lqa_questions;
CREATE POLICY lqa_questions_anon_insert ON lqa_questions
  FOR INSERT TO anon WITH CHECK (true);

-- ───────────────────────────────────────────────────────────────────────
-- 3. lqa_session_summary view (per-lane counts, for the admin session list)
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW lqa_session_summary
  WITH (security_invoker = true)
  AS
  SELECT
    s.*,
    COALESCE((SELECT COUNT(*) FROM lqa_questions q
                WHERE q.session_id = s.id AND q.status = 'pending'), 0)   AS pending_count,
    COALESCE((SELECT COUNT(*) FROM lqa_questions q
                WHERE q.session_id = s.id AND q.status = 'approved'), 0)  AS approved_count,
    COALESCE((SELECT COUNT(*) FROM lqa_questions q
                WHERE q.session_id = s.id AND q.status = 'dismissed'), 0) AS dismissed_count,
    (SELECT MAX(created_at) FROM lqa_questions q
       WHERE q.session_id = s.id) AS last_question_at
  FROM lqa_sessions s;
