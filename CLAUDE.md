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
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Optional GA4 tag in `app/layout.tsx` |

## High-level architecture

This is a multi-tool SaaS for Indiana townships. The tools share auth, database, and layout but are otherwise independent.

### Tools (one entry per `app/tools/*` and a few siblings)

| Tool | Path | Access |
| --- | --- | --- |
| SB 270 Scoring Tool | `/tools/scoring-tool` | Public, **completely bypasses Clerk middleware** |
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
