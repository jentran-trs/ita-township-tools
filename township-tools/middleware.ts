import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Check if Clerk is properly configured for production
const isClerkProduction = () => {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return key && !key.includes('pk_test_');
};

// Routes that should be public (accessible without auth)
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/contribute(.*)',
  '/api/projects/share(.*)',
  '/api/contribute(.*)',
  '/api/asset-collection(.*)',
  '/api/submissions(.*)',
  '/api/projects(.*)',
  '/',
]);

// Use conditional middleware based on environment
export default function middleware(request: NextRequest) {
  // Skip Clerk entirely if using development keys in production
  if (!isClerkProduction()) {
    return NextResponse.next();
  }

  // Use Clerk middleware for production with proper keys
  return clerkMiddleware((auth, req) => {
    // Allow public routes
    if (isPublicRoute(req)) {
      return NextResponse.next();
    }
  })(request, {} as any);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
