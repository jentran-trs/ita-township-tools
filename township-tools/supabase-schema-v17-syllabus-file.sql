-- v17: support attaching a PDF or DOCX syllabus to a course in addition to
-- (or instead of) the inline text syllabus.
--
-- The file lives in the existing `report-assets` Supabase Storage bucket
-- under `certificates/syllabi/`. We keep the original filename so admins can
-- recognise what they uploaded and so the public verify page can show a
-- proper download label.

ALTER TABLE cert_courses ADD COLUMN IF NOT EXISTS syllabus_file_url TEXT;
ALTER TABLE cert_courses ADD COLUMN IF NOT EXISTS syllabus_file_name TEXT;
