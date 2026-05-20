# Scope of Work — ITA Training Certificate Tool

## 1. Overview
Build a tool inside Township Tools that allows ITA admins to issue training completion certificates in bulk and lets attendees retrieve their certificates as PDFs via a public lookup page. The tool replaces the current manual certificate process and creates a single source of truth for who completed which course.

## 2. User Roles

**Superadmin (ITA staff)**
- Only role that can create courses, upload attendees, and issue certificates.
- Gated by existing superadmin auth (Clerk `privateMetadata.role = "superadmin"` or password cookie).

**Attendees (members and non-members, public access)**
- All attendees use the same public lookup page.
- Must enter their email to be verified against the admin-imported attendee list before any certificate is shown.
- An attendee can have multiple certificates across multiple courses; the lookup shows all certificates tied to their verified email.

## 3. Admin / Back-End Features

### 3.1 Course creation
Admin creates a course record with these fields:
- **Course ID** — auto-suggested in format `ITA-YYYY_NNN` (year auto-filled from course date; NNN incremented in steps of 100: 100, 200, 300…). Editable for legal courses where the ID comes from an external authority.
- **Course name**
- **Course hours** (decimal, e.g., `5.0`)
- **Training method** — In-Person / Online / Hybrid
- **Course date** (the date training was completed — always used on the certificate; never the generation date)
- **Syllabus / course description** — long-form text field, supports paste-in from AI-generated drafts
- **Organization name** — defaults to "Indiana Township Association"
- **Logo** — defaults to the ITA logo; overridable per course
- **Executive Director signature** — defaults to the stored ED e-signature image
- **Additional signatures** (optional) — name + uploaded signature image + title, repeatable

### 3.2 Attendee import
- Upload `.xlsx` or `.csv` with at minimum: First Name, Last Name, Email.
- Preview imported rows before committing; flag duplicates and missing fields.
- On commit, each attendee gets a **unique credential ID** in addition to the course ID. Proposed format: `{CourseID}-{6-char alphanumeric}`, e.g., `ITA-2026_100-A3F9K2`.

### 3.3 Certificate issuance
- One-click "Issue certificates" for all attendees in a course. This creates the certificate records and credential IDs.
- Admins do **not** download PDFs — they only manage the data. PDFs are generated on demand only when an attendee downloads from the lookup page.
- Admin can revoke a certificate or re-issue (re-issue voids the old credential ID and generates a new one).

### 3.4 Course management
- List of all courses with attendee counts and course date.
- View attendee list per course (name, email, credential ID, status, last-downloaded timestamp).
- Edit course details after issuance. Since PDFs are generated on demand, edits are reflected automatically the next time an attendee downloads.

## 4. Attendee-Facing Features

### 4.1 Public lookup page
- Single public page, linkable from the ITA website and from training communications.
- Flow:
  1. Attendee enters their email.
  2. System checks the email against the admin-imported attendee list across all courses.
  3. If matched, the page shows all certificates tied to that email (course name, course date, training hours, training method, download button).
  4. If not matched, the page shows a "no certificates found — contact ITA" message.
- One attendee may see multiple certificates from multiple courses.

### 4.2 Certificate verification
- Optional public verify-by-credential-ID page where anyone (e.g., an employer) can paste a credential ID to confirm authenticity. Returns attendee name, course, course date, and hours — no PDF download.

## 5. Certificate Content (visual layout)
Every certificate includes:
- ITA logo (top)
- "Certificate of Completion" header
- Attendee full name (prominent)
- Completion statement (e.g., "has successfully completed")
- Class name
- Class hours (e.g., "5.0 Hours Training")
- Training method (In-Person / Online / Hybrid)
- Course date (training completion date)
- Course ID
- Credential ID (smaller, for verification lookup)
- Executive Director e-signature image, with **full name + title + organization** printed beneath
- Additional signatures (if added), same format

A visual reference mockup from the ED will be the design starting point.

## 6. Signature Handling

**Recommendation:** Upload a PNG image of the signature (transparent background). This produces the most authentic-looking certificate and matches what most credentialing systems use.

How to produce the image:
- Sign on paper, scan, and remove background; OR
- Sign on an iPad/tablet and export as PNG; OR
- Use a tool like DocuSign or SignWell to generate a signature image.

A cursive auto-generated signature (rendering a name in a script font) is technically simpler but looks generic and less official; not recommended for a credentialing certificate.

The signature block on the certificate always renders as:
```
[signature image]
Full Name
Title
Organization
```

When leadership changes, superadmin uploads a new signature image and updates the name/title; existing certificates are unaffected.

## 7. Data Model (high level)
- `courses` — id, course_id (`ITA-YYYY_NNN`), name, hours, method, course_date, syllabus, logo_url, org_name, created_at
- `course_signatures` — course_id, signer_name, signer_title, signature_image_url, order
- `certificates` — id, credential_id (unique), course_id, attendee_first, attendee_last, attendee_email, status (active/revoked), issued_at, last_downloaded_at

PDFs are not stored — they are rendered on demand from the data above using a shared template. Each PDF is deterministic (same data + same template = same PDF), so download links can be cached briefly but never need to be persisted.

## 8. Out of Scope (v1)
- Quizzes, attendance tracking, or course delivery.
- Automatic email delivery of certificates on issuance (attendees retrieve via lookup page only).
- Admin PDF downloads (admins manage data only; attendees are the sole PDF consumers).
- Public course catalog browsing.
- Self-service course enrollment.

## 9. Infrastructure Note
PDF-on-demand architecture keeps long-term storage costs near zero. Database rows for thousands of certificates are negligible.

- **Supabase Pro** ($25/mo) — needed for headroom on database and bandwidth as the tool scales over the years. ITA-funded.
- **Vercel Hobby** — the tool is designed to run within Hobby's 10s function timeout. Only attendees generate PDFs, one at a time on demand, which completes well under the limit.

Because PDFs are not stored, **archiving is not needed** — all historical certificates remain retrievable indefinitely at no additional storage cost.

## 10. Open Questions for ED
1. For legal courses where ITA doesn't assign the course ID — what's the source/format of those external IDs?
2. Should the verify-by-credential-ID page (Section 4.2) be built in v1 or deferred?
3. Confirm the signature workflow: is uploading a PNG image of a real signature acceptable, or is there a preferred format?
