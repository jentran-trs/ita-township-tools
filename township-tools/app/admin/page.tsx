"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  Mail,
  ShieldCheck,
  UserPlus,
  Trash2,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Check,
  X,
  RefreshCw,
} from "lucide-react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  createdAt: number;
  membersCount: number;
  members: Member[];
}

interface Member {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
  role: string;
}

interface Invitation {
  id: string;
  emailAddress: string;
  role: string;
  status: string;
  createdAt: number;
}

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<Record<string, Invitation[]>>({});
  const [showInviteModal, setShowInviteModal] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("org:member");
  const [inviting, setInviting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const isSuperAdmin = user?.publicMetadata?.role === "superadmin";

  useEffect(() => {
    if (isLoaded && !isSuperAdmin) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSuperAdmin, router]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchOrganizations();
    }
  }, [isSuperAdmin]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/organizations");
      if (!response.ok) {
        throw new Error("Failed to fetch organizations");
      }
      const data = await response.json();
      setOrganizations(data.organizations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async (orgId: string) => {
    try {
      const response = await fetch(`/api/admin/invitations?organizationId=${orgId}`);
      if (response.ok) {
        const data = await response.json();
        setInvitations((prev) => ({ ...prev, [orgId]: data.invitations }));
      }
    } catch (err) {
      console.error("Error fetching invitations:", err);
    }
  };

  const toggleOrg = (orgId: string) => {
    if (expandedOrg === orgId) {
      setExpandedOrg(null);
    } else {
      setExpandedOrg(orgId);
      if (!invitations[orgId]) {
        fetchInvitations(orgId);
      }
    }
  };

  const sendInvitation = async () => {
    if (!showInviteModal || !inviteEmail) return;

    setInviting(true);
    try {
      const response = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: showInviteModal,
          emailAddress: inviteEmail,
          role: inviteRole,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send invitation");
      }

      setFeedback({ type: "success", message: `Invitation sent to ${inviteEmail}` });
      setInviteEmail("");
      setShowInviteModal(null);
      fetchInvitations(showInviteModal);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to send invitation" });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setInviting(false);
    }
  };

  const updateMemberRole = async (orgId: string, memberId: string, newRole: string) => {
    try {
      const response = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          memberId,
          role: newRole,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update role");
      }

      setFeedback({ type: "success", message: "Role updated successfully" });
      fetchOrganizations();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to update role" });
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const removeMember = async (orgId: string, memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const response = await fetch(
        `/api/admin/members?organizationId=${orgId}&memberId=${memberId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove member");
      }

      setFeedback({ type: "success", message: "Member removed successfully" });
      fetchOrganizations();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to remove member" });
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const revokeInvitation = async (orgId: string, invitationId: string) => {
    try {
      const response = await fetch(
        `/api/admin/invitations?organizationId=${orgId}&invitationId=${invitationId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to revoke invitation");
      }

      setFeedback({ type: "success", message: "Invitation revoked" });
      fetchInvitations(orgId);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({ type: "error", message: "Failed to revoke invitation" });
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            feedback.type === "success" ? "bg-emerald-600" : "bg-red-600"
          } text-white text-sm sm:text-base`}
        >
          {feedback.type === "success" ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <X className="w-4 h-4 sm:w-5 sm:h-5" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-1.5 sm:p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
            </button>
            <div className="flex items-center gap-2 sm:gap-3">
              <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
              <span className="text-lg sm:text-xl font-bold text-white">
                <span className="hidden sm:inline">Super </span>Admin<span className="hidden sm:inline"> Panel</span>
              </span>
            </div>
          </div>
          <button
            onClick={fetchOrganizations}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm sm:text-base"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4 sm:mb-6 text-sm sm:text-base">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-white">{organizations.length}</p>
                <p className="text-xs sm:text-sm text-slate-400">Organizations</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {organizations.reduce((sum, org) => sum + org.membersCount, 0)}
                </p>
                <p className="text-xs sm:text-sm text-slate-400">Total Members</p>
              </div>
            </div>
          </div>
        </div>

        {/* Organizations List */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">All Organizations</h2>

          {organizations.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 sm:p-8 text-center">
              <Building2 className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600 mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-slate-400">No organizations yet</p>
            </div>
          ) : (
            organizations.map((org) => (
              <div key={org.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                {/* Org Header */}
                <div
                  className="p-3 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition-colors"
                  onClick={() => toggleOrg(org.id)}
                >
                  <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                      {org.imageUrl ? (
                        <img src={org.imageUrl} alt={org.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-semibold text-white truncate">{org.name}</h3>
                      <p className="text-xs sm:text-sm text-slate-400">{org.membersCount} members</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowInviteModal(org.id);
                      }}
                      className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 transition-colors text-xs sm:text-sm font-medium"
                    >
                      <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Invite</span>
                    </button>
                    {expandedOrg === org.id ? (
                      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedOrg === org.id && (
                  <div className="border-t border-slate-700 p-3 sm:p-4">
                    {/* Members */}
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 sm:mb-3">
                      Members
                    </h4>
                    <div className="space-y-2 mb-4 sm:mb-6">
                      {org.members.map((member) => (
                        <div
                          key={member.userId}
                          className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-700/50 rounded-lg p-2 sm:p-3 gap-2 sm:gap-0"
                        >
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-600 rounded-full overflow-hidden flex-shrink-0">
                              {member.imageUrl ? (
                                <img src={member.imageUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Users className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 m-1.5 sm:m-2" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white text-xs sm:text-sm font-medium truncate">
                                {member.firstName} {member.lastName}
                              </p>
                              <p className="text-slate-400 text-[10px] sm:text-xs truncate">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-9 sm:ml-0">
                            <select
                              value={member.role}
                              onChange={(e) => updateMemberRole(org.id, member.userId, e.target.value)}
                              className="bg-slate-600 text-white text-xs sm:text-sm rounded-lg px-2 py-1 border border-slate-500"
                            >
                              <option value="org:admin">Admin</option>
                              <option value="org:member">Member</option>
                            </select>
                            <button
                              onClick={() => removeMember(org.id, member.userId)}
                              className="p-1 sm:p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                              title="Remove member"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pending Invitations */}
                    {invitations[org.id]?.length > 0 && (
                      <>
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 sm:mb-3">
                          Pending Invitations
                        </h4>
                        <div className="space-y-2">
                          {invitations[org.id]
                            .filter((inv) => inv.status === "pending")
                            .map((invitation) => (
                              <div
                                key={invitation.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 sm:p-3 gap-2 sm:gap-0"
                              >
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-white text-xs sm:text-sm truncate">{invitation.emailAddress}</p>
                                    <p className="text-slate-400 text-[10px] sm:text-xs">
                                      Role: {invitation.role === "org:admin" ? "Admin" : "Member"}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => revokeInvitation(org.id, invitation.id)}
                                  className="text-red-400 hover:text-red-300 text-xs sm:text-sm ml-6 sm:ml-0"
                                >
                                  Revoke
                                </button>
                              </div>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6 w-full max-w-md">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Invite User</h3>
            <p className="text-slate-400 text-xs sm:text-sm mb-3 sm:mb-4">
              Send an invitation to join{" "}
              <span className="text-white font-medium">
                {organizations.find((o) => o.id === showInviteModal)?.name}
              </span>
            </p>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="org:member">Member - Can use tools</option>
                  <option value="org:admin">Admin - Can manage members</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 sm:gap-3 mt-4 sm:mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(null);
                  setInviteEmail("");
                }}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendInvitation}
                disabled={!inviteEmail || inviting}
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 transition-colors text-sm sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inviting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Sending...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span className="hidden sm:inline">Send </span>Invite
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
