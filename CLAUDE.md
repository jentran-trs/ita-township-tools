# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

The Next.js application lives in `township-tools/`. **All `npm` commands must be run from that directory**, not the repo root.

Other top-level entries are non-code artifacts:
- `Contact Verification Lists/` — source `.xlsx` workbooks for each Indiana ITA region. These are uploaded through the Contact Verification admin import flow (see `app/api/admin/contact-verification/import/route.ts`).
- `township tools screenshots/` — UI screenshots, not used at runtime.
- `SB0270.05.COMH.pdf` — the Indiana state bill the SB 270 Scoring Tool is built around.
- `ITA_certtool_SOW.md` — scope document for a planned training-certificate tool (not yet implemented).

## Commands

Run from `township-tools/`:

```bash
npm install
npm run dev      # next dev — http://localhost:3000
npm run build    # next build
npm run start    # next start (production)
npm run lint     # next lint
```

There is no configured test framework.

## Required environment variables

Place in `township-tools/.env.local`:

| Var | Used by |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk auth (everywhere) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | `createServerSupabaseClient()` in API routes — bypasses RLS |
| `RESEND_API_KEY`, optional `DIGEST_FROM_EMAIL` | Weekly Contact Verification digest email |
| `CRON_SECRET` | Authorizes `/api/cron/*` (Vercel sends as `Authorization: Bearer …`) |
| `CV_SUPERADMIN_PASSWORD` | Optional override of the hardcoded fallback (`TownshipVerify@2026`) for the password-cookie path to ITA superadmin |
| `MERGER_MAP_PASSCODE` | Passcode that unlocks editing on the merger meeting map (ITA site and `/admin/merger-map`); editing is disabled if unset |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Optional GA4 tag in `app/layout.tsx` |

## High-level architecture

This is a multi-tool SaaS for Indiana townships. The tools share auth, database, and layout but are otherwise independent.

### Tools (one entry per `app/tools/*` and a few siblings)

| Tool | Path | Access |
| --- | --- | --- |
| SB 270 Scoring Tool | `/tools/scoring-tool` | Public, **completely bypasses Clerk middleware** |
| Merger Meeting Map | ITA website (AMO paste block) + `/admin/merger-map` | The AMO page holds only `<div id="ita-merger-map">` + `<script src=".../merger-map/embed.js">` (AMO's CKEditor mangles inline scripts containing `<`). `public/merger-map/embed.js` is generated from `lib/merger-map/amo/amo-template.html` by `build-amo.mjs` — rerun it after editing the template — and reads `/api/merger-map/data` (public, CORS `*`). `/admin/merger-map` is a superadmin-only copy. Editing unlocks with `MERGER_MAP_PASSCODE` (sent per request in the `x-merger-map-passcode` header, not a cookie, since the ITA site is a different origin). Data in `merger_map_counties` / `merger_map_settings` (v31, v32) |
| Verify Contacts Portal | `/verify-contacts/...` | Public; reviewer enters name+email, no auth |
| Asset Collection Form | `/contribute/[shareId]`, `/asset-collection` | Public via project share link |
| Report Builder | `/tools/report-builder` | Clerk org admin only |
| Email Template Builder | `/tools/email-builder` | Clerk org member |
| Project Workspace | `/projects/...`, `/submissions/...` | Clerk org member; design service for non-admins |
| Org Members admin | `/admin` | Clerk org admin only |
| Contact Verification admin | `/admin/contact-verification/...` | ITA superadmin only (see below) |

### Three auth layers — get them right

1. **Clerk users** — `ClerkProvider` wraps the app in `app/layout.tsx`; `middleware.ts` runs `clerkMiddleware()` on all non-public routes.
2. **Clerk organization role** — Each township is a Clerk Organization. Inside React, use `useOrganization()` + `useAuth()`; the canonical admin check is `membership?.role === 'org:admin' || orgRole === 'org:admin'`. Server-side, `lib/auth/isAdmin.ts` reads `authData.sessionClaims.o.rol`.
3. **ITA superadmin** — independent of Clerk org roles, used only for the cross-township Contact Verification admin. See `lib/auth/superadmin.ts`. A request is superadmin if **either**:
   - The `cv_superadmin` cookie matches the SHA-256 hash of `CV_SUPERADMIN_PASSWORD` (set by POST to `/api/admin/contact-verification/auth`), **or**
   - The Clerk user has `privateMetadata.role === 'superadmin'` (set in the Clerk dashboard).
   - Server route guard: `const sErr = await requireSuperadmin(); if (sErr) return sErr;`

### Middleware gotchas (`middleware.ts`)

- New public routes must be added to the `isPublicRoute` matcher list **and** the `config.matcher` exclusion if applicable, or Clerk will redirect.
- `/tools/scoring-tool` is excluded from the matcher entirely so it carries zero Clerk overhead — keep it that way for the public quiz.

### Supabase — dual-client pattern

`lib/supabase.js` exports two clients:

- `getSupabaseClient()` / `supabase` — browser client with the anon key. Subject to RLS.
- `createServerSupabaseClient()` — server-only, uses `SUPABASE_SERVICE_ROLE_KEY` and bypasses RLS. Always paired with `export const runtime = 'nodejs'` on API routes that import it.

**Convention:** all writes go through server-side API routes using the service-role client. RLS policies for `anon`/`authenticated` are read-only. Don't try to write from the browser client — it will fail or surface raw RLS errors.

### Database schemas (`township-tools/supabase-schema*.sql`)

Numbered files are sequential migrations applied to a single Supabase project. Skim the latest few before changing the data model. They split into two largely independent feature areas:

**Report Builder / Asset Collection** (`assets`, `reports`, `report_projects`, `report_submissions`, `report_sections`, `report_section_stats`, `report_drafts`, `contributor_sessions`, `notifications`):
- `report_projects` is an org-owned workspace with a short `share_id`. Contributors submit assets at `/contribute/[shareId]` without logging in. `contributor_sessions.draft_data` lets them resume.
- `report_submissions` → `report_sections` → `report_section_stats` holds the collected content from contributors. Each submission also carries cover/letter/footer metadata.
- `app/api/projects/[id]/generate-report/route.js` aggregates all submissions for a project, calls `node-vibrant` server-side on the logo to extract a four-color theme, and returns a positioned-blocks document for the Report Builder canvas. Contributors can embed `[CARD]...[/CARD]` blocks inside section content; the generator parses these into separate card elements.
- Finalizing a project (`/api/projects/[id]/finalize`) flips status to `completed` and freezes further submissions.

**Contact Verification** (tables prefixed `cv_`):
- Hierarchy: `cv_regions → cv_counties → cv_townships → cv_contacts`. Schema v7 introduces this; later migrations add review semantics.
- `cv_audit_log` records every reviewer action; the weekly digest cron only emails on rows with `action IN ('create','update','mark_for_removal','address_update')`.
- `cv_settings` is a singleton row (`id=1`) holding the global `verification_deadline` and digest config.
- **Time-windowed lock**: `lib/contact-verification/portal-lock.ts#isPortalLocked()` rejects all public writes (returns HTTP 423) between midnight ET the day after the deadline and midnight ET one month later — the window the superadmin uses to sync verified contacts into AMO. Every public mutation in `app/api/verify/**` calls `rejectIfLocked()` first.
- `lib/contact-verification/cutoff.ts#getRecentChangesCutoff()` suppresses "new since last visit" admin pills during that same window so the superadmin isn't spammed by activity in the closing days of the cycle.
- xlsx import: `lib/contact-verification/xlsx.js` parses one workbook per ITA region (one sheet per county) with a townships-banner / contacts-table layout. Used by the superadmin import page.
- v14 flipped `cv_completion_stats` to `SECURITY INVOKER` — if you add new views, do the same to avoid Supabase's "Security Definer View" lint.

**Badges & QR check-in** (extends the Certificate & Badge Generator; opt-in per course via `cert_courses.badge_checkin_enabled`, migrations v33–v48):
- The course page `/admin/certificates/[courseId]` is the badge flow (`badges/BadgesClient.tsx`: Setup & import / Registrants / Attendance / Certificates / Course settings tabs). The old direct import + full list of issued certificates is the secondary page `/admin/certificates/[courseId]/manual`; `/badges` redirects to the course page.
- `cert_registrants` (imported from the AMO export, or walk-ins) each carry an opaque `badge_token` printed as a QR code on the back of a 3.5"×2.25" Avery 5390 badge (`components/badges/Badge.tsx`, print page `/admin/certificates/[courseId]/badges/print`). `cert_attendance_scans` is an append-only in/out log; manual entries and voids are marked, never deleted. Manual entries require a note (`entered_by`, `note`); removing a time requires a reason (`voided_by`, `void_note`, v37). Both show in the Attendance tab's per-person History and the Excel export's "Check-in log" sheet.
- Registrants can be edited by hand (Registrants tab → Edit; PATCH `/api/admin/certificates/registrants/[id]`). v41: `edited_at` makes later AMO imports keep the hand-edited details (only balance/payment update), and `original_key` (AMO's email+first+last before the first edit) keeps the import matching the same person. Edits are copied to a linked certificate. The scanner can also fix name/title/place ("Fix name & reprint" → `/api/scan/[courseId]/edit`, event PIN; shared logic in `lib/badges/registrant-edit.ts`) and then offers a NIIMBOT label with the same QR code.
- Substitutes (v44): "Someone else is attending" (scanner search row, or the admin Edit checkbox) renames the registration to the person attending and keeps the original registrant in `cert_registrants.substituted_for` (jsonb; `substituted_at`/`substituted_by`). Same badge number, QR and payment; requires the attendee's email. Shown as "In place of …" on the scanner, Registrants/Attendance tabs, Excel export and AMO checklist ("registered as …"); searching the original name finds them. Admin Edit can undo it (restores the original). Helpers in `lib/badges/registrant-edit.ts`.
- Cancelled registrations (v45): `cert_registrants.cancelled_at` / `cancelled_by` / `cancel_note`, set from the Registrants tab row menu ("Mark registration cancelled" / "Undo cancellation"). Cancelled people stay on the list but get no badge number or printed badge (`print-data.ts`, `badge-numbers.ts`), aren't on the kiosk lookup, aren't flagged as owing at later events (`prior-unpaid.ts`), and get attendance status `cancelled` instead of `no_show` (only when never scanned; a cancelled person who comes anyway is checked in normally, with a warning on the scanner). Separate from "Cancel badge" (new QR code for a lost badge).
- Registration fee (v48): `cert_courses.registration_fee`, set in Event settings on the Setup tab. Walk-ins (scanner sync and kiosk register) get it as `balance_due` when the event tracks payment; saving the fee also fills it in for anyone `due` with no balance; Unpaid across events falls back to it. AMO-imported people keep their AMO Balance Due. A person's own amount (e.g. a sponsor) can be set in Registrants → Edit ("Amount owed", while they owe) or by clicking the amount on the Unpaid page (PATCH registrant `balance_due`). Payment method `waived` (v49) = "Waive fee".
- Badge numbers (v39, `lib/badges/badge-numbers.ts`): `badge_number` in last-name order, set the first time badges load for printing (later additions continue at the end, never renumbered automatically); walk-ins get `walkin_number` ("Walk-in #2") on upload. Printed on the badge front, NIIMBOT label, scanner search and Registrants tab.
- Scanner: public `/scan/[courseId]` (excluded from Clerk middleware), unlocked with a per-event PIN (checked against `scanner_pin_hash`; also stored AES-GCM-encrypted in `scanner_pin_enc`, v40, so the superadmin sees it on the Setup tab); session cookie is HMAC-signed and tied to `scanner_pin_version` (`lib/badges/scan-session.ts`). Works offline: roster + queue in localStorage (`lib/badges/scanner-store.ts`), service worker `public/scan-sw.js` scoped to `/scan/`. Uploads are idempotent on `client_scan_id`. Self-serve "Find my badge number" kiosk for tablets at check-in: `/scan/[courseId]/find` (same PIN; `/api/scan/[courseId]/lookup` returns only name, township/company and badge number; clears 7 s after the last touch; records nothing). The kiosk also has a \"Register\" button (corner of the banner, and on \"Can't find your name?\") for walk-ins to sign themselves up (`find/RegisterForm.tsx` → POST `/api/scan/[courseId]/register`; no payment; saves a walk-in with `self_registered_at`, v46). On the scanner they appear in \"Waiting at the desk\" until checked in; tapping one opens the Finish sheet (copy email for the card reader, payment, check in, then the NIIMBOT label). The roster sends email/type only for these self-registered walk-ins. Scanner search also matches township/organization; "Record payment" on someone who owes records a check/card payment without checking them in (e.g. a trustee paying for staff ahead of time). A scan can be undone from its confirmation: dropped if not uploaded, otherwise queued as a void (`pendingVoids`, voided with a note on sync).
- Files to print (v43): `cert_print_files` + private storage bucket `event-print-files` (`lib/badges/print-files.ts`). The admin uploads on the Setup tab (browser uploads straight to storage via a signed upload URL, bypassing Vercel's body limit) with a copies count; the print page (admin and Lydia's PIN link `/print/[courseId]`, via `/api/scan/[courseId]/files`) lists them with signed download links and a "Printed" tick. Blank badges: "Which badges" → Blank · Attendee/Sponsor prints the type bar only (`badge.blank`), leaving room for a 70×40 mm NIIMBOT label (`lib/badges/niimbot-label.ts`: header with ITA logo, event name, tagline and the badge number top-right).
- Unpaid across events (`lib/badges/prior-unpaid.ts`): a registrant is flagged when the same person (email, else first+last name) is still `payment_status = 'due'` at an earlier badge course (by `course_date`). Shown on the scanner (search line + a collect-first sheet at check-in; collecting posts a door payment against the EARLIER registration, which `/api/scan/[courseId]/payments` accepts only for a flagged debt) and on the admin course page (banner, Attendance "Owes from past event" filter, Excel column). Computed on the fly; no table. `/admin/certificates/unpaid` ("Unpaid across events", linked from the course list; GET `/api/admin/certificates/unpaid`) lists every registration still `due` at any event, the latest included, grouped by person (email, else name), with came/didn't-check-in, totals, copy emails and Mark paid (POST `registrants/[id]/payment`, methods check/card/amo/admin).
- Attendance rule (`lib/badges/attendance.ts`): checked in AND out on every event day, Eastern time. Checking out more than 30 minutes before the course's `event_end_time` puts the person in Needs review ("Left early …"). The Attendance tab's "Not checked out" filter (checked in on a day with no check-out) has a "Check out N people" button that posts `{ entries, note }` to the attendance route, saved as hand-entered times with the note. "Mark reviewed" on a Needs review row (PATCH registrant `action: 'mark_reviewed'`, optional note; v47 `reviewed_at`/`reviewed_by`/`review_note`) accepts their attendance: status becomes attended with full credit (multi-day: each day they came), shown as "Reviewed by … · Was: …" with Undo; the note goes in the Excel Notes column. Never scanned = status `no_show`, labelled "Not checked in" until the last day's `event_end_time` passes (Eastern; end of day if unset), then "No show" (`isEventOver`, computed on the fly; `event_over` in the attendance API). Multi-day training courses set hours per day in Course settings (`cert_courses.day_hours`, v38; the course total is their sum): then each day with an in AND out earns that day's hours (`lib/badges/admin-attendance.ts`, which sets `cert_hours_override` for issuing). Partial credit = `cert_registrants.day_hours`; issued certificates carry `certificates.hours_override` (NULL = course hours), read by the lookup/verify routes.

### Cron

`vercel.json` schedules `/api/cron/contact-verification-digest` weekly (Monday 13:00 UTC). Authorization is `Authorization: Bearer ${CRON_SECRET}` (Vercel automatic) or `?secret=` for manual previews. The route silently skips when digest is disabled, no recipient is configured, or no relevant activity occurred in the past 7 days.

### Big client components — dynamic import with `ssr: false`

`ReportBuilder.jsx`, `EmailBuilder.jsx`, and `ScoringTool.jsx` all rely on browser-only APIs (canvas, blob URLs, html2canvas/jspdf lazy-loaded for PDF export, color extraction). Their pages import them via `next/dynamic` with `ssr: false`. Follow the same pattern for any new heavy client-only component or builds will break with `window is not defined`.

### Theming

- Tailwind dark mode uses the `class` strategy. `ThemeToggle.jsx` writes `tt_theme` to localStorage. A small synchronous script in `app/layout.tsx`'s `<head>` applies the class before hydration to prevent a flash of the wrong theme — don't move this script into a component.
- Every tool with branding has the same four-color palette shape: `{ primary, primaryDark, accent, gold }`. The Report Builder extracts these from a logo two ways: client-side via canvas histogram (`components/ReportBuilder.jsx`) and server-side via `node-vibrant` (`api/projects/[id]/generate-report/route.js`). Defaults: `#2B3E50 / #1a2633 / #C1272D / #D4B896`.

### Conventions

- Mixed `.tsx` / `.jsx` / `.js` is intentional — newer pages and `lib/` are TypeScript; many older components are plain JSX. Don't bulk-rewrite working JS to TS.
- TS path alias: `@/*` resolves to `township-tools/` root, so `@/components/...` and `@/lib/...` work from anywhere.
- API routes that use Supabase service role, ExcelJS, Resend, or other Node-only libs must declare `export const runtime = 'nodejs'`.
- The `report-assets` Supabase storage bucket is shared across logo uploads, report images, email-builder logos. Many routes pass `oldUrl` when re-uploading so the previous file is deleted.

## Deployment

Deployed to Vercel. After deploying:
1. Add the Vercel URL to Clerk Dashboard → Configure → Domains, or sign-in flows will reject the origin.
2. Run the `supabase-schema*.sql` migrations against the Supabase project in numerical order if upgrading from an older version.
3. Confirm `CRON_SECRET` is set in Vercel env so the weekly digest can authorize.

## Notes for editing

- Don't introduce a CLAUDE.md duplicate inside `township-tools/`. There used to be one; it was outdated and consolidated here.
- When adding a new public route, update **both** `isPublicRoute` and `config.matcher` in `middleware.ts`.
- When changing the contact-verification schema, also update `cv_completion_stats` if your change affects `contact_total` / `contact_reviewed` definitions, and keep `security_invoker = true` on it.
