-- v19: per-signature organization. The course-level cert_courses.org_name
-- still names the issuing authority (shown in the ribbon's "Authorized by
-- the …" subtitle). Each signer can optionally belong to a different
-- organization that's printed below their title — useful when a course is
-- co-signed by, say, the ITA Executive Director and a State of Indiana
-- training officer.

ALTER TABLE cert_signatures ADD COLUMN IF NOT EXISTS signer_organization TEXT;
