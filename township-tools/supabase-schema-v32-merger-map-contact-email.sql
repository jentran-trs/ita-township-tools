-- v32: local contact email for each county on the merger meeting map.
-- Shown to visitors next to the local contact name (as a mailto link in the
-- county details card).

ALTER TABLE merger_map_counties ADD COLUMN IF NOT EXISTS contact_email TEXT;
