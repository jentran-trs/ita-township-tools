import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Check if user is admin via session claims
function isAdmin(authData: any) {
  const orgRole = authData?.sessionClaims?.o?.rol;
  return orgRole === 'admin' || orgRole === 'org:admin';
}

// GET all users (admin only)
export async function GET() {
  try {
    const authData = await auth();
    const { userId } = authData;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(authData)) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const client = await clerkClient();
    const users = await client.users.getUserList({ limit: 100 });

    // Get organization memberships for each user
    const usersWithOrgs = await Promise.all(
      users.data.map(async (user) => {
        const memberships = await client.users.getOrganizationMembershipList({ userId: user.id });
        return {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
          createdAt: user.createdAt,
          lastSignInAt: user.lastSignInAt,
          publicMetadata: user.publicMetadata,
          organizations: memberships.data.map((m) => ({
            id: m.organization.id,
            name: m.organization.name,
            role: m.role,
          })),
        };
      })
    );

    return NextResponse.json({ users: usersWithOrgs });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
