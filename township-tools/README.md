# Township Tools

Professional tools for Indiana townships, starting with the Report Builder.

## Features

- 🔐 **Authentication** - Secure login with Microsoft, Google, or email
- 🏛️ **Organizations** - Townships manage their own team members
- 📊 **Report Builder** - Drag-and-drop report creation
- 📄 **PDF Export** - Professional PDF output

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Authentication**: Clerk
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Quick Deploy to Vercel

### Step 1: Push to GitHub

1. Create a new repository on [GitHub](https://github.com/new)
2. Name it `township-tools`
3. Push this code to the repository:

```bash
cd township-tools
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/township-tools.git
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import your `township-tools` repository
4. Add Environment Variables:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = your key
   - `CLERK_SECRET_KEY` = your key
5. Click "Deploy"

### Step 3: Update Clerk Settings

After deployment, add your Vercel URL to Clerk:

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Configure** → **Domains**
3. Add your Vercel URL (e.g., `township-tools.vercel.app`)

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Project Structure

```
township-tools/
├── app/
│   ├── layout.tsx          # Root layout with ClerkProvider
│   ├── page.tsx            # Landing page
│   ├── globals.css         # Global styles
│   ├── dashboard/
│   │   └── page.tsx        # User dashboard
│   ├── tools/
│   │   └── report-builder/
│   │       └── page.tsx    # Report builder tool
│   ├── sign-in/
│   │   └── [[...sign-in]]/
│   │       └── page.tsx    # Sign in page
│   └── sign-up/
│       └── [[...sign-up]]/
│           └── page.tsx    # Sign up page
├── components/
│   └── ReportBuilder.jsx   # Report builder component
├── middleware.ts           # Clerk authentication middleware
├── .env.local             # Environment variables (not in git)
└── package.json
```

## Organization Flow

1. User signs up and creates an organization (their township)
2. Admin invites team members (trustees, clerks, staff)
3. All members can access township tools
4. Each organization's data is separate

## Support

Contact: [your-email@example.com]
