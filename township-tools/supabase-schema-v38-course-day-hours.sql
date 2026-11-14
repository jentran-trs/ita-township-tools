-- v38: hours per day for multi-day badge courses.
--
-- cert_courses.day_hours maps each event day to the hours it is worth,
-- e.g. {"2026-12-09": 4, "2026-12-10": 3}. When set, a registrant earns the
-- hours for each day they checked in AND out, so someone at one day of two
-- gets that day's hours automatically. NULL (the default) keeps the old rule:
-- every day for the full course hours. Per-person partial credit
-- (cert_registrants.day_hours) still overrides both.
--
-- SAFETY: additive, nullable column. Re-running is safe.

ALTER TABLE cert_courses ADD COLUMN IF NOT EXISTS day_hours JSONB;
