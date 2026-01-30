import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Check if user is superadmin
async function isSuperAdmin(userId: string) {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return user.publicMetadata?.role === "superadmin";
}

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

// GET pending invitations for an organization
export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    const superAdmin = await isSuperAdmin(userId);
    const orgAdmin = await isOrgAdmin(userId, organizationId);

    if (!superAdmin && !orgAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const client = await clerkClient();
    const invitations = await client.organizations.getOrganizationInvitationList({
      organizationId,
    });

    return NextResponse.json({
      invitations: invitations.data.map((inv) => ({
        id: inv.id,
        emailAddress: inv.emailAddress,
        role: inv.role,
        status: inv.status,
        createdAt: inv.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST create invitation to an organization
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, emailAddress, role } = await request.json();

    if (!organizationId || !emailAddress) {
      return NextResponse.json(
        { error: "Organization ID and email address are required" },
        { status: 400 }
      );
    }

    const superAdmin = await isSuperAdmin(userId);
    const orgAdmin = await isOrgAdmin(userId, organizationId);

    if (!superAdmin && !orgAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const client = await clerkClient();
    const invitation = await client.organizations.createOrganizationInvitation({
      organizationId,
      emailAddress,
      role: role || "org:member",
      inviterUserId: userId,
    });

    return NextResponse.json({ invitation });
  } catch (error: any) {
    console.error("Error creating invitation:", error);
    if (error?.errors?.[0]?.message) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE revoke an invitation
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const invitationId = searchParams.get("invitationId");

    if (!organizationId || !invitationId) {
      return NextResponse.json(
        { error: "Organization ID and invitation ID are required" },
        { status: 400 }
      );
    }

    const superAdmin = await isSuperAdmin(userId);
    const orgAdmin = await isOrgAdmin(userId, organizationId);

    if (!superAdmin && !orgAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const client = await clerkClient();
    await client.organizations.revokeOrganizationInvitation({
      organizationId,
      invitationId,
      requestingUserId: userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revoking invitation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
