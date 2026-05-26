"use client";

import { UserButton, OrganizationSwitcher, useUser, useOrganization, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, FileText, Users, ArrowRight, ShieldCheck, FolderOpen, Mail, ClipboardCheck, MapPin, Award } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

export default function Dashboard() {
  const { user } = useUser();
  const { organization, membership } = useOrganization();
  const { orgRole } = useAuth();
  const router = useRouter();

  const isAdmin = membership?.role === 'org:admin' || orgRole === 'org:admin';

  // Superadmin (only the user with the password cookie) — used to gate the
  // ITA-wide "Contact Verification" admin tool from other org admins.
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  useEffect(() => {
    fetch("/api/admin/contact-verification/auth")
      .then((r) => r.json())
      .then((j) => setIsSuperadmin(!!j.ok))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex justify-between items-center gap-4">
            <div
              className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => router.push("/")}
            >
              <Building2 className="w-7 h-7 sm:w-9 sm:h-9 text-amber-600 dark:text-amber-400" />
              <span className="text-lg sm:text-2xl font-bold">Township Tools</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {isAdmin && (
                <>
                  <NotificationBell orgId={organization?.id} />
                  <button
                    onClick={() => router.push("/admin")}
                    className="flex items-center gap-1 sm:gap-2 px-3 py-2 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors text-sm font-semibold"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </button>
                </>
              )}
              <span className="hidden md:inline text-gray-700 dark:text-gray-300 text-sm">
                Hi, {user?.firstName || user?.emailAddresses[0]?.emailAddress}
              </span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>

          {/* Organization Switcher */}
          <div className="mt-4 sm:mt-3 flex">
            <OrganizationSwitcher
              appearance={{
                elements: {
                  rootBox: "flex items-center w-full sm:w-auto",
                  organizationSwitcherTrigger:
                    "bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 hover:bg-gray-50 w-full sm:w-auto justify-between sm:justify-start shadow-sm",
                },
              }}
              createOrganizationMode="modal"
              afterCreateOrganizationUrl="/dashboard"
              afterSelectOrganizationUrl="/dashboard"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {organization ? (
          <>
            {/* Org Header */}
            <div className="mb-8 sm:mb-10">
              <h1 className="text-2xl sm:text-4xl font-bold mb-2">{organization.name}</h1>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
                Pick a tool below to get started.
              </p>
            </div>

            {/* Tools Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 mb-10 sm:mb-12">
              <ToolCard
                onClick={() => router.push("/tools/scoring-tool")}
                icon={<ClipboardCheck className="w-7 h-7 sm:w-8 sm:h-8 text-purple-600 dark:text-purple-400" />}
                iconBg="bg-purple-100 dark:bg-purple-900/40"
                hoverBorder="hover:border-purple-400 dark:hover:border-purple-500"
                accentText="text-purple-700 dark:text-purple-300"
                title="SB 270 Scoring Tool"
                description="Find out if your township is a Designated or Recipient township under SB 270."
                cta="Open tool"
                badge={{ label: "FREE", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" }}
              />

              <ToolCard
                onClick={() => router.push("/verify-contacts")}
                icon={<MapPin className="w-7 h-7 sm:w-8 sm:h-8 text-rose-600 dark:text-rose-400" />}
                iconBg="bg-rose-100 dark:bg-rose-900/40"
                hoverBorder="hover:border-rose-400 dark:hover:border-rose-500"
                accentText="text-rose-700 dark:text-rose-300"
                title="Verify Your Contacts"
                description="Check and update your township's officials, addresses, and email addresses."
                cta="Open tool"
                badge={{ label: "FREE", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" }}
              />

              {isSuperadmin && (
                <ToolCard
                  onClick={() => router.push("/certificates")}
                  icon={<Award className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600 dark:text-amber-400" />}
                  iconBg="bg-amber-100 dark:bg-amber-900/40"
                  hoverBorder="hover:border-amber-400 dark:hover:border-amber-500"
                  accentText="text-amber-700 dark:text-amber-300"
                  title="Find Your Certificate"
                  description="Attended an ITA training? Enter your email to download a PDF of every certificate issued to you."
                  cta="Open tool"
                  badge={{ label: "ITA ONLY", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" }}
                />
              )}

              {isAdmin && (
                <ToolCard
                  onClick={() => router.push("/tools/report-builder")}
                  icon={<FileText className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600 dark:text-amber-400" />}
                  iconBg="bg-amber-100 dark:bg-amber-900/40"
                  hoverBorder="hover:border-amber-400 dark:hover:border-amber-500"
                  accentText="text-amber-700 dark:text-amber-300"
                  title="Report Builder"
                  description="Build a polished annual report and export it as a print-ready PDF."
                  cta="Open tool"
                  badge={{ label: "ADD-ON", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" }}
                />
              )}

              <ToolCard
                onClick={() => router.push("/projects")}
                icon={<FolderOpen className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />}
                iconBg="bg-blue-100 dark:bg-blue-900/40"
                hoverBorder="hover:border-blue-400 dark:hover:border-blue-500"
                accentText="text-blue-700 dark:text-blue-300"
                title={isSuperadmin ? "View Report Assets" : "Submit Report Assets"}
                description={
                  isSuperadmin
                    ? "Generate and design reports from submitted assets."
                    : "Custom report design service by Jen Tran — send your materials and I'll design your annual report. See example reports inside."
                }
                cta={isSuperadmin ? "View assets" : "Submit assets"}
                badge={isSuperadmin ? undefined : { label: "CUSTOM SERVICE", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" }}
              />

              {isAdmin && (
                <ToolCard
                  onClick={() => router.push("/tools/email-builder")}
                  icon={<Mail className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600 dark:text-emerald-400" />}
                  iconBg="bg-emerald-100 dark:bg-emerald-900/40"
                  hoverBorder="hover:border-emerald-400 dark:hover:border-emerald-500"
                  accentText="text-emerald-700 dark:text-emerald-300"
                  title="Email Template Builder"
                  description="Design professional email and newsletter templates to use in any email client."
                  cta="Open tool"
                  badge={{ label: "ADD-ON", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" }}
                />
              )}

              {isSuperadmin && (
                <ToolCard
                  onClick={() => router.push("/admin/contact-verification")}
                  icon={<ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600 dark:text-amber-400" />}
                  iconBg="bg-amber-100 dark:bg-amber-900/40"
                  hoverBorder="hover:border-amber-400 dark:hover:border-amber-500"
                  accentText="text-amber-700 dark:text-amber-300"
                  title="Contact Verification (Admin)"
                  description="Track verification progress across all townships, import xlsx, and export updated lists."
                  cta="Open tool"
                  badge={{ label: "ITA ONLY", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" }}
                />
              )}

              {isSuperadmin && (
                <ToolCard
                  onClick={() => router.push("/admin/certificates")}
                  icon={<Award className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600 dark:text-indigo-400" />}
                  iconBg="bg-indigo-100 dark:bg-indigo-900/40"
                  hoverBorder="hover:border-indigo-400 dark:hover:border-indigo-500"
                  accentText="text-indigo-700 dark:text-indigo-300"
                  title="Certificate Generator (Admin)"
                  description="Create training courses, import attendees, and issue credential IDs. Attendees download their PDFs from the public lookup page."
                  cta="Open tool"
                  badge={{ label: "ITA ONLY", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" }}
                />
              )}
            </div>

            {/* Organization Management - Admin only */}
            {isAdmin && (
              <div className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  <h2 className="text-xl sm:text-2xl font-bold">Organization Members</h2>
                </div>
                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-5">
                  Manage your township&apos;s team members and their access.
                </p>
                <button
                  onClick={() => router.push("/admin")}
                  className="inline-flex items-center gap-2 bg-amber-500 text-white rounded-lg px-5 py-3 font-semibold text-base hover:bg-amber-600 transition-colors shadow-sm"
                >
                  <Users className="w-4 h-4" />
                  Manage members
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 sm:py-20 px-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4">
              Create Your Township Organization
            </h1>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Set up your township to start using the tools. You can invite trustees,
              clerks, and staff to collaborate.
            </p>
            <OrganizationSwitcher
              appearance={{
                elements: {
                  rootBox: "flex justify-center",
                  organizationSwitcherTrigger:
                    "bg-amber-500 text-white rounded-lg px-6 py-3 font-bold text-base sm:text-lg hover:bg-amber-600 shadow-sm",
                },
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

function ToolCard({
  onClick,
  icon,
  iconBg,
  hoverBorder,
  accentText,
  title,
  description,
  cta,
  badge,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  iconBg: string;
  hoverBorder: string;
  accentText: string;
  title: string;
  description: string;
  cta: string;
  badge?: { label: string; className: string };
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-7 text-left hover:shadow-lg transition-all group ${hoverBorder}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-14 h-14 sm:w-16 sm:h-16 ${iconBg} rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform`}
        >
          {icon}
        </div>
        {badge && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge.className}`}>
            {badge.label}
          </span>
        )}
      </div>
      <h3 className="text-lg sm:text-xl font-bold mb-2">{title}</h3>
      <p className="text-base text-gray-600 dark:text-gray-400 mb-4">{description}</p>
      <div className={`inline-flex items-center gap-2 text-base font-semibold ${accentText}`}>
        {cta} <ArrowRight className="w-4 h-4" />
      </div>
    </button>
  );
}
