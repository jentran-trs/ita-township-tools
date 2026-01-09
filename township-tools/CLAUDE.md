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
