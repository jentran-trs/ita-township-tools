-- v23: track the question currently being answered for a Live Q&A session.
--
-- The screencast presenter clicks "Answer this" to lift a question into a
-- highlighted "Now Answering" panel; the superadmin console mirrors it so they
-- know which question is live. Stored as a pointer on the session. ON DELETE
-- SET NULL so deleting that question simply clears the pointer.

ALTER TABLE lqa_sessions
  ADD COLUMN IF NOT EXISTS current_question_id UUID
  REFERENCES lqa_questions(id) ON DELETE SET NULL;
