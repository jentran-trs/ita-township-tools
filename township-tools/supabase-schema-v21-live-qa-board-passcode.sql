-- v21: optional passcode for the Live Q&A screencast board.
--
-- Previously only a superadmin could open the dismiss-capable screencast board.
-- With a passcode set by the superadmin, anyone who has the board link AND the
-- passcode can open the board and dismiss questions — no login required. This
-- lets a volunteer run the screencast while the superadmin works behind the
-- scenes. NULL passcode = board is read-only to non-superadmins.

ALTER TABLE lqa_sessions ADD COLUMN IF NOT EXISTS board_passcode TEXT;
