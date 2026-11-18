-- v43: files to print for an event (agenda, handouts, sign-in sheets...).
--
-- The superadmin uploads files on the course's Setup tab with a number of
-- copies; whoever prints (Lydia, via the PIN print link) downloads them and
-- ticks "Printed". Files live in the PRIVATE storage bucket
-- `event-print-files` and are only handed out as short-lived signed links.
--
-- RLS on with no policies: every read/write goes through API routes using
-- the service-role client (superadmin, or the event PIN for the print page).
--
-- SAFETY: new table + new bucket only. Re-running is safe.

CREATE TABLE IF NOT EXISTS cert_print_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID NOT NULL REFERENCES cert_courses(id) ON DELETE CASCADE,
  file_name     TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  content_type  TEXT,
  size_bytes    BIGINT,
  copies        INTEGER NOT NULL DEFAULT 1 CHECK (copies >= 0 AND copies <= 10000),
  uploaded      BOOLEAN NOT NULL DEFAULT FALSE,  -- true once the file reached storage
  printed_at    TIMESTAMPTZ,
  printed_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cert_print_files_course_idx ON cert_print_files (course_id, created_at);
ALTER TABLE cert_print_files ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public)
VALUES ('event-print-files', 'event-print-files', false)
ON CONFLICT (id) DO NOTHING;
