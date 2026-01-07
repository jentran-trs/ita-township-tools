"use client";

import { UserButton, OrganizationSwitcher, useUser, useOrganization } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Building2, FileText, Settings, Users, ArrowRight, Plus } from "lucide-react";

export default function Dashboard() {
  const { user } = useUser();
  const { organization } = useOrganization();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => router.push("/")}
            >
              <Building2 className="w-8 h-8 text-amber-500" />
              <span className="text-xl font-bold text-white">Township Tools</span>
            </div>
            
            {/* Organization Switcher */}
            <div className="border-l border-slate-600 pl-6">
              <OrganizationSwitcher 
                appearance={{
                  elements: {
                    rootBox: "flex items-center",
                    organizationSwitcherTrigger: "bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white hover:bg-slate-600",
                  }
                }}
                createOrganizationMode="modal"
                afterCreateOrganizationUrl="/dashboard"
                afterSelectOrganizationUrl="/dashboard"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm">
              Welcome, {user?.firstName || user?.emailAddresses[0]?.emailAddress}
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Organization Status */}
        {organization ? (
          <>
            {/* Org Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                {organization.name}
              </h1>
              <p className="text-slate-400">
                Your township tools and resources
              </p>
            </div>

            {/* Tools Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {/* Annual Report Builder */}
              <div 
                onClick={() => router.push("/tools/report-builder")}
                className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-amber-500/50 transition-colors cursor-pointer group"
              >
                <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-amber-500/30 transition-colors">
                  <FileText className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Annual Report Builder</h3>
                <p className="text-slate-400 mb-4">
                  Create professional annual reports with our drag-and-drop builder.
                </p>
                <div className="flex items-center text-amber-500 font-medium">
                  Open Tool <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </div>

              {/* Coming Soon - Placeholder Tool */}
              <div className="bg-slate-800/50 border border-slate-700 border-dashed rounded-xl p-6 opacity-60">
                <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center mb-4">
                  <Plus className="w-6 h-6 text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-500 mb-2">More Tools Coming</h3>
                <p className="text-slate-500">
                  Additional township management tools will be added here.
                </p>
              </div>
            </div>

            {/* Organization Management */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl font-bold text-white">Organization Members</h2>
              </div>
              <p className="text-slate-400 mb-4">
                Manage your township&apos;s team members and their access.
              </p>
              <OrganizationSwitcher 
                appearance={{
                  elements: {
                    rootBox: "flex",
                    organizationSwitcherTrigger: "bg-amber-500 text-slate-900 rounded-lg px-4 py-2 font-medium hover:bg-amber-400",
                  }
                }}
                organizationProfileMode="modal"
              />
            </div>
          </>
        ) : (
          /* No Organization - Prompt to Create */
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-slate-600" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Create Your Township Organization
            </h1>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              Set up your township to start using the tools. You can invite trustees, 
              clerks, and staff to collaborate.
            </p>
            <OrganizationSwitcher 
              appearance={{
                elements: {
                  rootBox: "flex justify-center",
                  organizationSwitcherTrigger: "bg-amber-500 text-slate-900 rounded-lg px-6 py-3 font-bold text-lg hover:bg-amber-400",
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
