"use client";

import { UserButton, OrganizationSwitcher, useUser, useOrganization, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Building2, FileText, Users, ArrowRight, Plus, ShieldCheck, FolderOpen, Mail, ClipboardCheck } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

export default function Dashboard() {
  const { user } = useUser();
  const { organization, membership } = useOrganization();
  const { orgRole } = useAuth();
  const router = useRouter();

  // Check if user is admin via organization membership
  const isAdmin = membership?.role === 'org:admin' || orgRole === 'org:admin';

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          {/* Top row - Logo and User */}
          <div className="flex justify-between items-center">
            <div
              className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => router.push("/")}
            >
              <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
              <span className="text-lg sm:text-xl font-bold text-white">Township Tools</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {isAdmin && (
                <>
                  <NotificationBell orgId={organization?.id} />
                  <button
                    onClick={() => router.push("/admin")}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 bg-amber-500/20 text-amber-500 rounded-lg hover:bg-amber-500/30 transition-colors text-xs sm:text-sm font-medium"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </button>
                </>
              )}
              <span className="hidden md:inline text-slate-300 text-sm">
                Welcome, {user?.firstName || user?.emailAddresses[0]?.emailAddress}
              </span>
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
          </div>

          {/* Organization Switcher - Second row on mobile */}
          <div className="mt-3 sm:mt-0 sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:top-1/2 sm:-translate-y-1/2 lg:static lg:translate-x-0 lg:translate-y-0 lg:ml-6 lg:mt-0 lg:border-l lg:border-slate-600 lg:pl-6 flex items-center">
            <div className="w-full sm:w-auto">
              <OrganizationSwitcher
                appearance={{
                  elements: {
                    rootBox: "flex items-center w-full sm:w-auto",
                    organizationSwitcherTrigger: "bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white hover:bg-slate-600 w-full sm:w-auto justify-between sm:justify-start",
                  }
                }}
                createOrganizationMode="modal"
                afterCreateOrganizationUrl="/dashboard"
                afterSelectOrganizationUrl="/dashboard"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Organization Status */}
        {organization ? (
          <>
            {/* Org Header */}
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">
                {organization.name}
              </h1>
              <p className="text-sm sm:text-base text-slate-300">
                Your township tools and resources
              </p>
            </div>

            {/* Tools Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
              {/* Annual Report Builder - Admin Only */}
              {isAdmin && (
                <div
                  onClick={() => router.push("/tools/report-builder")}
                  className="bg-slate-800 border border-slate-700 rounded-xl p-5 sm:p-6 hover:border-amber-500/50 transition-colors cursor-pointer group"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/20 rounded-lg flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-amber-500/30 transition-colors">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Annual Report Builder</h3>
                  <p className="text-sm sm:text-base text-slate-300 mb-3 sm:mb-4">
                    Create professional annual reports with our drag-and-drop builder.
                  </p>
                  <div className="flex items-center text-amber-500 font-medium text-sm sm:text-base">
                    Open Tool <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </div>
              )}

              {/* Report Assets */}
              <div
                onClick={() => router.push("/projects")}
                className="bg-slate-800 border border-slate-700 rounded-xl p-5 sm:p-6 hover:border-amber-500/50 transition-colors cursor-pointer group"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-blue-500/30 transition-colors">
                  <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                  {isAdmin ? 'View Report Assets' : 'Submit Report Assets'}
                </h3>
                <p className="text-sm sm:text-base text-slate-300 mb-3 sm:mb-4">
                  {isAdmin
                    ? 'Generate and design reports from submitted assets.'
                    : 'Submit your report assets and let us handle the design.'}
                </p>
                <div className="flex items-center text-blue-500 font-medium text-sm sm:text-base">
                  {isAdmin ? 'View Assets' : 'Submit Assets'} <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </div>

              {/* Email/Newsletter Builder */}
              <div
                onClick={() => router.push("/tools/email-builder")}
                className="bg-slate-800 border border-slate-700 rounded-xl p-5 sm:p-6 hover:border-amber-500/50 transition-colors cursor-pointer group"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-emerald-500/30 transition-colors">
                  <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Email Builder</h3>
                <p className="text-sm sm:text-base text-slate-300 mb-3 sm:mb-4">
                  Create professional email and newsletter templates with a form-based builder.
                </p>
                <div className="flex items-center text-emerald-500 font-medium text-sm sm:text-base">
                  Open Tool <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </div>

              {/* SB 270 Scoring Tool */}
              <div
                onClick={() => router.push("/tools/scoring-tool")}
                className="bg-slate-800 border border-slate-700 rounded-xl p-5 sm:p-6 hover:border-amber-500/50 transition-colors cursor-pointer group"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-purple-500/30 transition-colors">
                  <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">SB 270 Scoring Tool</h3>
                <p className="text-sm sm:text-base text-slate-300 mb-3 sm:mb-4">
                  Self-score your township under SB 270 to determine Designated or Recipient status.
                </p>
                <div className="flex items-center text-purple-500 font-medium text-sm sm:text-base">
                  Open Tool <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </div>
            </div>

            {/* Organization Management - Admin only */}
            {isAdmin && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                  <h2 className="text-lg sm:text-xl font-bold text-white">Organization Members</h2>
                </div>
                <p className="text-sm sm:text-base text-slate-300 mb-3 sm:mb-4">
                  Manage your township&apos;s team members and their access.
                </p>
                <OrganizationSwitcher
                  appearance={{
                    elements: {
                      rootBox: "flex",
                      organizationSwitcherTrigger: "bg-amber-500 text-slate-900 rounded-lg px-3 sm:px-4 py-2 font-medium hover:bg-amber-400 text-sm sm:text-base",
                    }
                  }}
                  organizationProfileMode="modal"
                />
              </div>
            )}
          </>
        ) : (
          /* No Organization - Prompt to Create */
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-slate-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              Create Your Township Organization
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mb-6 sm:mb-8 max-w-md mx-auto">
              Set up your township to start using the tools. You can invite trustees,
              clerks, and staff to collaborate.
            </p>
            <OrganizationSwitcher
              appearance={{
                elements: {
                  rootBox: "flex justify-center",
                  organizationSwitcherTrigger: "bg-amber-500 text-slate-900 rounded-lg px-5 sm:px-6 py-2.5 sm:py-3 font-bold text-base sm:text-lg hover:bg-amber-400",
                }
              }}
              createOrganizationMode="modal"
              afterCreateOrganizationUrl="/dashboard"
            />
          </div>
        )}
      </main>
    </div>
  );
}
