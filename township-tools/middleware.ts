import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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
  '/tools/scoring-tool(.*)',
  '/',
]);

// Use Clerk middleware - development keys work in production (with limits)
export default clerkMiddleware(async (auth, req) => {
  // Public routes don't require authentication
  if (isPublicRoute(req)) {
    return;
  }
  // For non-public routes, protect them (but this is handled by the client-side)
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
