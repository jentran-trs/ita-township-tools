-- v31: Township merger meeting map (/merger-map).
--
-- One row per county that has any merger-meeting activity. Counties with no
-- row are shown as "no activity" on the map.
--   status = 'scheduled'  meeting date/time set (orange on the map)
--   status = 'pending'    local contact identified, meeting not yet scheduled (yellow)
--
-- Edited from the public map page after unlocking with MERGER_MAP_PASSCODE
-- (or by an ITA superadmin). All reads/writes go through server routes with
-- the service-role client, so RLS is enabled with no anon/authenticated
-- policies.

CREATE TABLE IF NOT EXISTS merger_map_counties (
  county        TEXT PRIMARY KEY,               -- county name as shown on the map, e.g. 'St. Joseph'
  status        TEXT NOT NULL CHECK (status IN ('scheduled', 'pending')),
  contact_name  TEXT,                           -- local contact / host
  meeting_date  DATE,
  meeting_time  TIME,                           -- Eastern time
  location      TEXT,
  notes         TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE merger_map_counties ENABLE ROW LEVEL SECURITY;

-- Singleton settings row: who visitors should contact, plus intro text.
CREATE TABLE IF NOT EXISTS merger_map_settings (
  id             INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  title          TEXT NOT NULL DEFAULT 'Township Merger Meetings',
  intro          TEXT,
  contact_name   TEXT,
  contact_email  TEXT,
  contact_phone  TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE merger_map_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO merger_map_settings (id, contact_name, intro)
VALUES (1, 'Lydia', 'Hover over (or tap) a county to see when its merger meeting is scheduled. Contact us for details about any meeting.')
ON CONFLICT (id) DO NOTHING;

-- Starting data, transcribed from Lydia's paper map (Nov 2026).
-- Noble's date was unreadable on the paper map — fill it in from the page.
INSERT INTO merger_map_counties (county, status, contact_name, meeting_date, meeting_time) VALUES
  ('Noble',      'scheduled', 'Donna Schwartz',   NULL,         '09:00'),
  ('Starke',     'scheduled', 'Sheri Bartol',     '2026-11-10', '18:00'),
  ('Parke',      'scheduled', 'Sharon Malone',    '2026-11-14', '13:00'),
  ('Morgan',     'scheduled', 'Kathy Taylor',     '2026-11-16', '18:30'),
  ('Miami',      'scheduled', 'Clint Manning',    '2026-12-02', '18:00'),
  ('St. Joseph', 'pending',   'Tim Creason',      NULL, NULL),
  ('Warren',     'pending',   'Danny Kincade',    NULL, NULL),
  ('Tippecanoe', 'pending',   'Frank Cederquist', NULL, NULL),
  ('Wayne',      'pending',   'Vicki Chasteen',   NULL, NULL),
  ('Owen',       'pending',   'Dave Davies',      NULL, NULL),
  ('Monroe',     'pending',   'Gerald Walker',    NULL, NULL),
  ('Lawrence',   'pending',   'Diana Starr',      NULL, NULL),
  ('Perry',      'pending',   'Steve Owen',       NULL, NULL),
  ('Posey',      'pending',   'Virginia Jung',    NULL, NULL)
ON CONFLICT (county) DO NOTHING;
