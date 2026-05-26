# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server at http://localhost:3000
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

This is a Next.js 14 application (App Router) for Indiana townships to create professional annual reports.

### Authentication

- **Clerk** handles all authentication (Microsoft, Google, email)
- `ClerkProvider` wraps the app in `app/layout.tsx`
- `middleware.ts` protects routes using `clerkMiddleware()`
- Organization-based access: users create/join township organizations via Clerk's OrganizationSwitcher

### Key Components

- **ReportBuilder** (`components/ReportBuilder.jsx`): Large client component (~54k tokens) implementing a drag-and-drop PDF report builder with:
  - Canvas-based editing with blocks (text, images, charts, shapes)
  - Theme color extraction from uploaded images
  - PDF export functionality
  - Undo/redo history

### Route Structure

- `/` - Landing page
- `/dashboard` - User dashboard (requires organization selection)
- `/tools/report-builder` - Annual report builder tool
- `/sign-in`, `/sign-up` - Clerk auth pages using catch-all routes

### Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

### Deployment

Deployed to Vercel. After deployment, add the Vercel URL to Clerk Dashboard > Configure > Domains.

### Certificate Generator

ITA superadmins create training courses and import attendee rosters; attendees retrieve their certificates as PDFs from a public lookup page. PDFs are rendered on demand client-side from the same React template — never stored.

- Schema: `supabase-schema-v16-certificates.sql` (tables prefixed `cert_*`; `certificates` is the per-attendee credential table).
- Visual template: `components/certificates/Certificate.tsx` plus the SVG ornaments under `components/certificates/ornaments/`. Fixed 1100×850 render, fonts loaded via `next/font/google` in `lib/certificates/fonts.ts`.
- Admin UI: `/admin/certificates` (list), `/admin/certificates/new`, `/admin/certificates/[courseId]`, `/admin/certificates/[courseId]/import`, `/admin/certificates/signatures`, `/admin/certificates/preview`. All gated by `isSuperadmin()`.
- Public UI: `/certificates` (email lookup), `/certificates/verify` and `/certificates/verify/[credentialId]` (credential check). These routes are in `isPublicRoute` and excluded from the middleware matcher.
- PDF download: `components/certificates/CertificateDownloadButton.tsx` lazy-loads `html2canvas` + `jspdf`, captures an off-screen 1100×850 Certificate instance, and downloads an 11×8.5 in landscape PDF. The QR code on each certificate encodes the absolute verify URL via `lib/certificates/verify-url.ts` — set `NEXT_PUBLIC_APP_URL` in production so the QR points at the deployed origin.
- Storage: signature PNGs and per-course logos live in the existing `report-assets` Supabase Storage bucket. No PDFs are ever uploaded.
