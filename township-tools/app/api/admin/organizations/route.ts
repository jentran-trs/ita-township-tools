import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Check if user is superadmin
async function isSuperAdmin(userId: string) {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return user.publicMetadata?.role === "superadmin";
}

// GET all organizations (superadmin only)
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const superAdmin = await isSuperAdmin(userId);
    if (!superAdmin) {
      return NextResponse.json({ error: "Forbidden - Superadmin access required" }, { status: 403 });
    }

    const client = await clerkClient();
    const organizations = await client.organizations.getOrganizationList({ limit: 100 });

    // Get members for each organization
    const orgsWithMembers = await Promise.all(
      organizations.data.map(async (org) => {
        const members = await client.organizations.getOrganizationMembershipList({
          organizationId: org.id,
        });
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          imageUrl: org.imageUrl,
          createdAt: org.createdAt,
          membersCount: members.data.length,
          members: members.data.map((m) => ({
            userId: m.publicUserData?.userId,
            email: m.publicUserData?.identifier,
            firstName: m.publicUserData?.firstName,
            lastName: m.publicUserData?.lastName,
            imageUrl: m.publicUserData?.imageUrl,
            role: m.role,
          })),
        };
      })
    );

    return NextResponse.json({ organizations: orgsWithMembers });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST create a new organization (superadmin only)
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const superAdmin = await isSuperAdmin(userId);
    if (!superAdmin) {
      return NextResponse.json({ error: "Forbidden - Superadmin access required" }, { status: 403 });
    }

    const { name, slug } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    const client = await clerkClient();
    const organization = await client.organizations.createOrganization({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
      createdBy: userId,
    });

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
