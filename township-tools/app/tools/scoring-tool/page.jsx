"use client";

import { UserButton, OrganizationSwitcher, useOrganization, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Building2, ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";

const ScoringTool = dynamic(() => import("@/components/ScoringTool"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-slate-900">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400">Loading Scoring Tool...</p>
      </div>
    </div>
  ),
});

export default function ScoringToolPage() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const router = useRouter();

  if (!organization) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">No Organization Selected</h1>
          <p className="text-slate-400 mb-6">Please create or select an organization to use the Scoring Tool.</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-400 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="fixed top-0 left-0 right-0 z-[100] border-b border-slate-700 bg-slate-800">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <div className="border-l border-slate-600 pl-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              <span className="text-white font-medium">{organization.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <OrganizationSwitcher
              appearance={{
                elements: {
                  rootBox: "flex items-center",
                  organizationSwitcherTrigger: "bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white hover:bg-slate-600",
                }
              }}
            />
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>
      <div className="pt-14">
        <ScoringTool />
      </div>
    </div>
  );
}
