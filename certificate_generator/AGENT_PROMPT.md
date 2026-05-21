# Build Prompt: Certificate Generator for Township Tools

You are adding a new tool to the **Township Tools** Next.js app (`township-tools/`) that lets ITA superadmins issue training-completion certificates in bulk and lets attendees retrieve those certificates as PDFs from a public lookup page.

## Read these first (non-negotiable)

1. **`township-tools/CLAUDE.md`** — auth model, dual Supabase client pattern, middleware rules, `runtime = 'nodejs'` / `ssr: false` conventions, storage bucket naming. New code must fit these patterns; do not invent parallel patterns.
2. **The visual draft in `certificate_generator/ITA_certificate/`:**
   - **`certificate/RibbonCert.jsx`** — the chosen design (ribbon-banner diploma). Port this into the new tool.
   - **`certificate/Ornaments.jsx`** — SVG ornaments `RibbonCert` depends on: `GuillocheBorder`, `CornerFleuron`, `OrnamentalRule`, `RibbonBanner`, `Sprig`, `SignaturePlaceholder`, `VerifySeal`.
   - **`wireframes/CertWireframes.jsx`** — alternative designs the ED considered. **Ignore for v1.** The ribbon design was chosen.
   - **`images/ita-logo.jpeg`** — default ITA logo. Copy to `township-tools/public/certificates/ita-logo.jpeg`.
   - **`ITA Certificate.html`, `design-canvas.jsx`, `tweaks-panel.jsx`** — Babel-in-browser sandbox harness. Throwaway. Do not port.
3. **`township-tools/lib/auth/superadmin.ts`** and **`lib/auth/isAdmin.ts`** — copy the auth guards exactly.
4. **`township-tools/middleware.ts`** — new public routes must be added to **both** `isPublicRoute` and `config.matcher`.
5. The latest **`township-tools/supabase-schema*.sql`** files — to learn the migration numbering and the `security_invoker = true` convention for views (introduced in v14).
6. **`township-tools/lib/contact-verification/xlsx.js`** — existing xlsx-parser pattern to follow.
7. **`township-tools/components/ReportBuilder.jsx`** — existing pattern for client-side PDF generation via lazy-loaded `html2canvas` + `jspdf`. The certificate tool uses the same approach.

## Mission

Replace the current manual certificate process with one tool inside Township Tools. Superadmins create courses, import attendee lists, and the system issues credential IDs in bulk. Attendees enter their email on a public page and download a PDF of every certificate tied to that email. PDFs are rendered on demand from data + a shared React template — never stored.

## User roles

- **Superadmin (ITA staff)** — only role that creates courses, imports attendees, manages signatures, revokes or re-issues. Guarded by `requireSuperadmin()`.
- **Attendees (public, anonymous)** — verify by entering email; the system matches case-insensitively against the imported roster and returns every active certificate.
- **Anyone verifying a credential (public, anonymous)** — paste a credential ID into a verify page and get back recipient name, course, date, hours, method, status. No PDF, no email exposed.

## Refined scope of work

### Course creation (admin)

Fields:

| Field | Type | Notes |
|---|---|---|
| `course_id` | text, unique | Auto-suggested as `ITA-{YYYY}_{NNN}`. `YYYY` = year of `course_date`. `NNN` = `(highest existing NNN for that year) + 100`, starting at `100` if none. Editable for externally-assigned IDs (legal courses). |
| `name` | text, required | |
| `hours` | `numeric(5,1)`, required | Always rendered with one decimal place: `5.0`, not `5`. |
| `method` | enum: `in_person` \| `online` \| `hybrid` | Rendered as "In-Person" / "Online" / "Hybrid". |
| `course_date` | date, required | **This date appears on every certificate.** Never the generation date. |
| `syllabus` | long text, optional | Stored for admin reference; does not render on the certificate. |
| `org_name` | text | Defaults to `"Indiana Township Association"`. Appears under each signature. |
| `logo_url` | text | Defaults to `/certificates/ita-logo.jpeg`. Overridable per course via Supabase Storage upload to the existing `report-assets` bucket. |
| `signatures` | rows in `cert_signatures` | At least one (Executive Director). Each: `signer_name`, `signer_title`, `signature_image_url`, `display_order`. |

A course-create form pre-populates the signature row from the org-wide default ED signature (see `cert_default_signature`, below). Admin can edit, add additional signers, or remove them per course.

### Attendee import (admin)

- Accept `.xlsx` and `.csv`. Use the `xlsx` package (already in deps; follow `lib/contact-verification/xlsx.js`).
- Required columns: `First Name`, `Last Name`, `Email`. Header matching is case-insensitive and tolerates `first_name` / `firstName` / `First` variants.
- Optional columns: `Township`, `County`. If present, render on the certificate; if absent, omit the location clause entirely (do not render an empty comma).
- Show a preview table before commit. Flag:
  - duplicate emails within the upload,
  - emails already issued for the same course (so re-importing the same roster does not create duplicates — give the admin a choice: skip dupes or re-issue),
  - missing required fields.
- On commit, each row creates a `certificates` row with a `credential_id` of the form `{course_id}-{6-char-alphanumeric}` using only `A–Z` and `2–9` (skip `0`, `1`, `I`, `O`, `L` for unambiguous reading). Confirm uniqueness in an insert-retry loop.

### Certificate issuance

**Implicit on import.** Importing the attendee list IS issuing the certificates — the credential ID is generated and `status` starts as `active`. There is no separate "Issue certificates" button; that step in the original SOW was friction with no behavior difference.

Admin actions on existing certificate rows:

- **Revoke** → flips `status` to `revoked`. Hidden from public lookup; verify page returns "revoked".
- **Re-issue** → marks old row `status='reissued'`, inserts a new row with the same course + attendee but a fresh `credential_id`.

**Admins never download PDFs.** PDFs are produced only for attendees, only on the public page.

### Course management (admin)

- **List view** at `/admin/certificates` — table of all courses with date, attendee count, last activity. Sort by `course_date desc`.
- **Detail view** at `/admin/certificates/[courseId]` — editable course metadata; attendee table (name, email, credential ID, status, `last_downloaded_at`); buttons to import more, revoke, re-issue.
- Edits to course fields after issuance are fine because PDFs render on demand from current data. Surface a small caption near the edit form: "Edits apply to all certificates the next time an attendee downloads."

### Public lookup page

- Path: `/certificates`. Public — add to `isPublicRoute` AND `config.matcher` in `middleware.ts`.
- Single email input. On submit:
  - Normalize: lowercase, trim.
  - Query certificates (joined to courses) where `attendee_email = $normalized` and `status = 'active'`.
  - If matched: list of cards, one per certificate, each with course name, course date, hours, method, and "Download PDF".
  - If unmatched: return the same neutral empty-state message regardless ("No certificates found for that email. If you believe this is an error, contact ITA at [email]."). Do not leak existence.
- Bonus polish (verify scope with user): a "Download all" button that bundles every active cert into one multi-page PDF.

### Public verify-by-credential page

- Paste-in form at `/certificates/verify`; direct deep link at `/certificates/verify/[credentialId]`.
- Returns recipient first + last, course name, course date, hours, method, org name, status. **No PDF, no email.**
- The certificate itself carries this URL inside the bottom-right `VerifySeal` QR code so anyone (an employer, say) can scan and confirm.

### Certificate visual design

Port `certificate_generator/ITA_certificate/certificate/RibbonCert.jsx` into the Next.js app as a proper React component (no Babel-in-browser; no `window.*` globals; use ES module imports). Port the ornaments from `Ornaments.jsx` as siblings.

Adjustments from the draft:

- Replace the inline `SignaturePlaceholder` SVG with `<img src={signature.url}>` rendered above the signature rule. Fall back to `SignaturePlaceholder` only when no image URL is set.
- The current draft renders `of {township}, {county}`; make that line conditional. If both are absent, render `for the successful completion of` and skip the location clause entirely (no orphaned punctuation).
- The `VerifySeal` component exists in `Ornaments.jsx` but **is not** rendered in `RibbonCert.jsx`. **Render it** in the production version, bottom-right corner, ~90px, with a real QR (use `qrcode` or `qrcode.react` — pick one and stay consistent) encoding the absolute verify URL.
- Fonts (Cormorant Garamond, Pinyon Script, Cutive Mono) load from Google Fonts. Use `next/font/google` so the same font assets work for both the browser preview and the html2canvas capture.
- Brand colors as constants: `NAVY = #1B2E5B`, `GOLD = #B89243`, `DEEP = #11204A`. Define once, reuse everywhere.
- Fixed render size: `1100 × 850` (11 × 8.5 in @ 100 dpi). The page scales it for preview but captures it at native size.

### Signature handling

Confirmed approach: **PNG upload with transparent background.** No auto-generated cursive.

- Per-course signatures live on `cert_signatures` and are uploaded at course-create or course-edit time.
- A **Default Signatures** admin page at `/admin/certificates/signatures` lets the ED upload/replace a single org-default ED signature. New courses pre-fill from it.
- Validate uploads: `image/png` only, max 2 MB. Optional warning (not a block) if no transparency detected.
- Existing certificates are **not** retroactively updated when the default signature changes — the URL is copied onto `cert_signatures` at course-create, not referenced through a pointer. Make this explicit in the admin UI: "Updating the default signature only affects courses created after this change."

### PDF generation — chosen approach

**Client-side**, matching `components/ReportBuilder.jsx`:

1. The public certificate card renders a hidden, off-screen 1100×850 `<Certificate>` instance with the real data.
2. On "Download PDF" click, `await import('html2canvas')` and `await import('jspdf')`, capture the wrapper at `scale: 2`, embed into an 11×8.5 in landscape PDF, trigger download.
3. Filename: `ITA-Certificate-{lastName}-{credentialId}.pdf`.
4. After successful download, fire-and-forget `POST /api/certificates/[credentialId]/touch` to bump `last_downloaded_at`. Do not block the download on success.

Rationale: matches existing codebase patterns, sidesteps server-side font handling, stays well under Vercel Hobby's 10s function timeout (download workload is on the attendee's browser). The deterministic-output requirement is satisfied because rendering is data-driven and reproducible.

If raster output proves unacceptable for credentialing (fonts soft, scaling artifacts), the fallback is `@react-pdf/renderer` rebuilt in their DSL — flag this to the user before doing it, because it's a much larger refactor.

## Data model

Use the `cert_` prefix for new tables (matches the `cv_` / `report_` convention). All IDs are UUIDs. Enable RLS on every table with **no public policies** — writes go through API routes using the service-role client; reads happen the same way.

```sql
-- one row per course
create table cert_courses (
  id uuid primary key default gen_random_uuid(),
  course_id text not null unique,                  -- e.g. ITA-2026_100
  name text not null,
  hours numeric(5,1) not null check (hours >= 0),
  method text not null check (method in ('in_person','online','hybrid')),
  course_date date not null,
  syllabus text,
  org_name text not null default 'Indiana Township Association',
  logo_url text not null default '/certificates/ita-logo.jpeg',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- per-course signers
create table cert_signatures (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references cert_courses(id) on delete cascade,
  signer_name text not null,
  signer_title text not null,
  signature_image_url text not null,
  display_order int not null default 0
);

-- singleton (id=1) org-default ED signature
create table cert_default_signature (
  id int primary key check (id = 1),
  signer_name text not null,
  signer_title text not null default 'Executive Director',
  signature_image_url text not null,
  updated_at timestamptz not null default now()
);

-- one row per attendee per course (the credential)
create table certificates (
  id uuid primary key default gen_random_uuid(),
  credential_id text not null unique,              -- {course_id}-{6-char}
  course_id uuid not null references cert_courses(id) on delete restrict,
  attendee_first text not null,
  attendee_last text not null,
  attendee_email text not null,                    -- stored lowercased + trimmed
  attendee_township text,                          -- optional
  attendee_county text,                            -- optional
  status text not null default 'active'
    check (status in ('active','revoked','reissued')),
  issued_at timestamptz not null default now(),
  last_downloaded_at timestamptz
);

create index certificates_email_idx on certificates (attendee_email);
create index certificates_course_idx on certificates (course_id);
create index certificates_credential_idx on certificates (credential_id);

-- convenience view for the admin course-list page
-- security_invoker = true matches the v14 precedent (Supabase lint)
create view cert_course_summary
  with (security_invoker = true)
  as
  select c.*,
    (select count(*) from certificates ce
       where ce.course_id = c.id and ce.status = 'active') as active_count,
    (select max(issued_at) from certificates ce
       where ce.course_id = c.id) as last_issued_at
  from cert_courses c;
```

Name the migration file `supabase-schema-NN-certificates.sql`, with `NN` = next number after the highest existing `supabase-schema-*.sql` in the repo.

## File layout (suggested)

```
township-tools/
├── app/
│   ├── admin/certificates/
│   │   ├── page.tsx                                # course list
│   │   ├── new/page.tsx                            # create course
│   │   ├── [courseId]/page.tsx                     # detail + edit + attendees
│   │   ├── [courseId]/import/page.tsx              # attendee upload + preview
│   │   ├── signatures/page.tsx                     # default ED signature
│   │   └── preview/page.tsx                        # superadmin-only test page for certificate rendering
│   ├── certificates/
│   │   ├── page.tsx                                # public email lookup
│   │   └── verify/
│   │       ├── page.tsx                            # paste credential
│   │       └── [credentialId]/page.tsx             # verify result
│   └── api/
│       ├── admin/certificates/
│       │   ├── courses/route.ts                    # GET list, POST create
│       │   ├── courses/[courseId]/route.ts         # GET, PATCH, DELETE
│       │   ├── courses/[courseId]/import/route.ts  # POST file → preview or commit
│       │   ├── courses/[courseId]/signatures/route.ts
│       │   ├── certificates/[id]/route.ts          # PATCH revoke
│       │   ├── certificates/[id]/reissue/route.ts  # POST reissue
│       │   └── default-signature/route.ts          # GET / PUT
│       └── certificates/
│           ├── lookup/route.ts                     # POST {email}
│           ├── [credentialId]/route.ts             # GET public verify data
│           └── [credentialId]/touch/route.ts       # POST bump last_downloaded_at
├── components/certificates/
│   ├── Certificate.tsx                             # ported from RibbonCert.jsx
│   ├── ornaments/
│   │   ├── GuillocheBorder.tsx
│   │   ├── CornerFleuron.tsx
│   │   ├── OrnamentalRule.tsx
│   │   ├── RibbonBanner.tsx
│   │   ├── Sprig.tsx
│   │   └── VerifySeal.tsx
│   ├── CertificateDownloadButton.tsx               # lazy-loads html2canvas + jspdf
│   └── SignatureUpload.tsx
├── lib/certificates/
│   ├── credential-id.ts                            # generator + uniqueness retry
│   ├── course-id.ts                                # ITA-YYYY_NNN auto-suggest
│   ├── xlsx-import.ts                              # parse + validate attendee files
│   └── verify-url.ts                               # absolute URL builder for the QR code
├── public/certificates/
│   └── ita-logo.jpeg                               # copied from the draft folder
└── supabase-schema-NN-certificates.sql
```

## Codebase patterns you MUST follow

- **Server-side admin guard:** `const sErr = await requireSuperadmin(); if (sErr) return sErr;` at the top of every `/api/admin/certificates/**` handler.
- **UI admin guard:** pages under `/admin/certificates/**` redirect non-superadmins. Mirror the existing `/admin/contact-verification` pages.
- **Service-role Supabase client:** every API route that writes uses `createServerSupabaseClient()` and declares `export const runtime = 'nodejs'`. The public lookup and verify endpoints also go through API routes (service-role queries) so the browser never touches Supabase directly.
- **Middleware:** add `'/certificates(.*)'` to `isPublicRoute` AND to the matcher exclusion in `config.matcher`. Verify by hitting `/certificates` signed out — no Clerk redirect.
- **Heavy client components:** `Certificate.tsx` and `CertificateDownloadButton.tsx` are imported via `next/dynamic` with `ssr: false` from their host pages (they touch `window`, canvas, fonts).
- **Supabase Storage:** signatures and per-course logos go in the existing `report-assets` bucket. When replacing a file, delete the old one — see existing routes for the `oldUrl` pattern.
- **Dashboard tile:** add a Certificate Generator tile to the existing dashboard (find it under `app/dashboard/*` or wherever recent commits like `35a6a93 change dashboard UI and tool categories` touched). Visible only to superadmins.
- **TS/JSX:** new files are `.tsx` / `.ts`. Don't bulk-rewrite existing `.jsx` / `.js`.

## Implementation phases

Each phase should leave the app buildable and prior phases functional.

1. **Schema + storage** — write `supabase-schema-NN-certificates.sql`, apply locally, verify in Supabase Studio. Copy `ita-logo.jpeg` into `public/certificates/`.
2. **Certificate component** — port `RibbonCert.jsx` + `Ornaments.jsx`. Build `/admin/certificates/preview` (superadmin-only) that renders with sample data and a few toggles (signer count, paper color). Verify it looks right in the browser before wiring data.
3. **Admin: course CRUD** — list, create, edit, delete. Auto-suggest course ID. Default-signature page. Signature upload.
4. **Admin: attendee import** — file parse → preview → commit. Credential IDs generated at commit.
5. **Public lookup** — email form, normalized matching, list cards.
6. **Download flow** — `CertificateDownloadButton` lazy-loads `html2canvas` + `jspdf`, captures the hidden certificate, downloads, then fires `/touch`.
7. **Verify** — paste-or-link page; certificate QR points here.
8. **Polish** — dashboard tile, revoke / re-issue, optional "Download all", friendly empty/error states.

## Verification checklist

Before declaring done, manually verify (do not rely on type-checks alone):

- [ ] `npm run build` succeeds with no `window is not defined` errors.
- [ ] `npm run lint` passes.
- [ ] Signed-out user reaches `/certificates` and `/certificates/verify/...` without a Clerk redirect.
- [ ] A non-superadmin Clerk org admin **cannot** reach `/admin/certificates`.
- [ ] Create a course → import a 3-row xlsx → every row gets a credential ID matching `^ITA-\d{4}_\d+-[A-Z2-9]{6}$`.
- [ ] Email lookup with a known address returns the certificate(s); lookup with an unknown address returns the same neutral empty-state.
- [ ] Download a PDF; opens cleanly in Preview/Acrobat at 11×8.5 landscape with the correct fonts (Cormorant Garamond body, Pinyon Script name).
- [ ] Re-issue a certificate → old `credential_id` returns `reissued` from `/certificates/verify/...`; new `credential_id` returns `active`.
- [ ] Revoke a certificate → it disappears from email lookup; verify page returns `revoked`.
- [ ] Edit a course's `name` → re-download an existing certificate → new name appears in the PDF.
- [ ] QR on the PDF, scanned with a phone, opens the verify URL.
- [ ] Inspect the `report-assets` storage bucket — only logos and signature PNGs are stored. **No PDFs.**

## Out of scope (do not build)

- Quizzes, attendance tracking, course delivery.
- Automatic emailing of certificates on issuance.
- Admin PDF downloads (admins manage data only).
- Public course catalog browsing or self-enrollment.
- Persistent PDF storage or archive. PDFs are rendered on demand, forever — no caching, no backup. ITA's ~1,350-person audience cannot realistically blow past the Supabase Free 5 GB/month bandwidth cap from on-demand renders.

## Decisions to confirm with the user before starting

Ask once, batched:

1. **Default ED signature image** — is one ready to bundle, or ship with a placeholder and let the ED upload on first login?
2. **External course IDs** — for legal/state-mandated courses where the ID comes from outside, is "free-text override of the auto-suggested ID" enough, or is a separate "externally-issued" flag needed?
3. **"Download all" bundled PDF** — build in v1 or defer?

## Notes

- The visual draft in `certificate_generator/ITA_certificate/` is a sandbox prototype, not a buildable system. Only `certificate/RibbonCert.jsx` and `certificate/Ornaments.jsx` carry forward.
- Do not create a `CLAUDE.md` inside `township-tools/`. Add a short section on the new tool to the root `CLAUDE.md` once the tool is working.
- The original SOW lives in `ITA_certtool_SOW.md` (referenced from `CLAUDE.md`). This prompt is a refined version of it. Where the two conflict, this prompt wins.
