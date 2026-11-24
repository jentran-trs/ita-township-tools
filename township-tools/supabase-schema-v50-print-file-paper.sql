-- v50: paper size for each file to print (e.g. "Letter (8.5 × 11 in)", or a
-- custom size typed by the admin). NULL = not specified.
ALTER TABLE cert_print_files
  ADD COLUMN IF NOT EXISTS paper_size text;
