-- v22: optional submission time window for a Live Q&A session.
--
-- The superadmin can set a start and/or end timestamp on the attendee submit
-- link. Outside that window the public submit route rejects questions (HTTP
-- 423) and the submit page shows a "not open yet" / "closed" notice. NULL on
-- either side means no bound on that end. This is independent of the manual
-- archive (status = 'closed'), which also blocks submissions.

ALTER TABLE lqa_sessions ADD COLUMN IF NOT EXISTS submit_opens_at TIMESTAMPTZ;
ALTER TABLE lqa_sessions ADD COLUMN IF NOT EXISTS submit_closes_at TIMESTAMPTZ;
