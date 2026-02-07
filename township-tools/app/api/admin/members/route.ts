import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Check if user is org admin
async function isOrgAdmin(userId: string, organizationId: string) {
  const client = await clerkClient();
  try {
    const membership = await client.organizations.getOrganizationMembershipList({
      organizationId,
    });
    const userMembership = membership.data.find(
      (m) => m.publicUserData?.userId === userId
    );
    return userMembership?.role === "org:admin";
  } catch {
    return false;
  }
}

// PATCH update member role
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, memberId, role } = await request.json();

    if (!organizationId || !memberId || !role) {
      return NextResponse.json(
        { error: "Organization ID, member ID, and role are required" },
        { status: 400 }
      );
    }

    const orgAdmin = await isOrgAdmin(userId, organizationId);

    if (!orgAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    // Prevent demoting yourself
    if (memberId === userId && role !== "org:admin") {
      return NextResponse.json(
        { error: "You cannot demote yourself" },
        { status: 400 }
      );
    }

    const client = await clerkClient();
    await client.organizations.updateOrganizationMembership({
      organizationId,
      userId: memberId,
      role,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE remove member from organization
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const memberId = searchParams.get("memberId");

    if (!organizationId || !memberId) {
      return NextResponse.json(
        { error: "Organization ID and member ID are required" },
        { status: 400 }
      );
    }

    const orgAdmin = await isOrgAdmin(userId, organizationId);

    if (!orgAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    // Prevent removing yourself
    if (memberId === userId) {
      return NextResponse.json(
        { error: "You cannot remove yourself from the organization" },
        { status: 400 }
      );
    }

    const client = await clerkClient();
    await client.organizations.deleteOrganizationMembership({
      organizationId,
      userId: memberId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
