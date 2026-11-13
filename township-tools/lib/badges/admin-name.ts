import { auth, currentUser } from '@clerk/nextjs/server';

/** Who is making an admin change, for the record: Clerk email, else "ITA admin". */
export async function adminName(): Promise<string> {
  try {
    const a = await auth();
    if (a?.userId) {
      const u = await currentUser();
      return u?.primaryEmailAddress?.emailAddress || u?.fullName || 'ITA admin';
    }
  } catch {}
  return 'ITA admin';
}
