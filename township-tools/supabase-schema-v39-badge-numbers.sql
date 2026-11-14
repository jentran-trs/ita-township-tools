-- v39: badge numbers, so the check-in table can find a pre-printed badge fast.
--
-- badge_number: pre-registered people, assigned in last-name order the first
--   time badges are loaded for printing; people added later continue at the
--   end. Never changes once set (reprints and cancelled badges keep it).
-- walkin_number: walk-ins, "Walk-in #1, #2…" in the order they were added.
--   Walk-ins never get a badge_number, so the printed numbers stay put.
--
-- SAFETY: additive, nullable columns + partial unique indexes. Re-running is safe.

ALTER TABLE cert_registrants ADD COLUMN IF NOT EXISTS badge_number INTEGER;
ALTER TABLE cert_registrants ADD COLUMN IF NOT EXISTS walkin_number INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS cert_registrants_badge_number_uq
  ON cert_registrants (course_id, badge_number) WHERE badge_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cert_registrants_walkin_number_uq
  ON cert_registrants (course_id, walkin_number) WHERE walkin_number IS NOT NULL;
