-- v12: add 'skipped' as a review_status (reviewer saw the contact but had no info to act on it).

ALTER TABLE cv_contacts DROP CONSTRAINT IF EXISTS cv_contacts_review_status_check;
ALTER TABLE cv_contacts
  ADD CONSTRAINT cv_contacts_review_status_check
  CHECK (review_status IN ('unreviewed','no_change','updated','newly_added','needs_removal','skipped'));
