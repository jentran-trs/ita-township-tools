"use client";

import { useRouter } from "next/navigation";
import { Building2, ClipboardCheck, FileText, FolderOpen, Mail, ArrowRight, LogIn, Lock } from "lucide-react";

export default function PublicLanding() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
            <span className="text-lg sm:text-xl font-bold text-white">Township Tools</span>
          </div>
          <button
            onClick={() => router.push("/sign-in")}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-amber-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-amber-400 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Member Login
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Hero */}
        <div className="mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Professional Tools for Indiana Townships
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl">
            Everything your township needs — from SB 270 compliance scoring to annual report creation and email templates.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* SB 270 Scoring Tool - PUBLIC */}
          <div
            onClick={() => router.push("/tools/scoring-tool")}
            className="bg-slate-800 border border-slate-700 rounded-xl p-5 sm:p-6 hover:border-amber-500/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
              </div>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                FREE
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">SB 270 Scoring Tool</h3>
            <p className="text-sm sm:text-base text-slate-400 mb-3 sm:mb-4">
              Self-score your township under SB 270 to determine if you are a Designated or Recipient township.
            </p>
            <div className="flex items-center text-purple-500 font-medium text-sm sm:text-base">
              Use Tool <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>

          {/* Annual Report Builder - LOGIN REQUIRED */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 sm:p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Lock className="w-3 h-3" />
                Members Only
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Annual Report Builder</h3>
            <p className="text-sm sm:text-base text-slate-400 mb-3 sm:mb-4">
              Create professional annual reports with a drag-and-drop builder. Export as print-ready PDF.
            </p>
            <button
              onClick={() => router.push("/sign-in")}
              className="flex items-center gap-2 text-amber-500 font-medium text-sm sm:text-base hover:text-amber-400 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Login to Access
            </button>
          </div>

          {/* Report Design Service - LOGIN REQUIRED */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 sm:p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Lock className="w-3 h-3" />
                Members Only
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Report Design Service</h3>
            <p className="text-sm sm:text-base text-slate-400 mb-3 sm:mb-4">
              Submit your report assets and let our team design your annual report. Professional results with minimal effort.
            </p>
            <button
              onClick={() => router.push("/sign-in")}
              className="flex items-center gap-2 text-blue-500 font-medium text-sm sm:text-base hover:text-blue-400 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Login to Access
            </button>
          </div>

          {/* Email Template Builder - LOGIN REQUIRED */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 sm:p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Lock className="w-3 h-3" />
                Members Only
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Email Template Builder</h3>
            <p className="text-sm sm:text-base text-slate-400 mb-3 sm:mb-4">
              Build professional email and newsletter templates with a form-based builder. Copy HTML and paste into any email client.
            </p>
            <button
              onClick={() => router.push("/sign-in")}
              className="flex items-center gap-2 text-emerald-500 font-medium text-sm sm:text-base hover:text-emerald-400 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Login to Access
            </button>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-8 sm:mt-10 bg-slate-800 border border-slate-700 rounded-xl p-5 sm:p-6 text-center">
          <h2 className="text-lg font-bold text-white mb-2">Want to subscribe?</h2>
          <p className="text-sm text-slate-400 mb-4 max-w-lg mx-auto">
            Get access to all Township Tools for your organization. Contact us to get started.
          </p>
          <a
            href="mailto:jentran@my-trs.com"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-slate-900 rounded-lg font-semibold text-sm hover:bg-amber-400 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Contact Jen Tran — jentran@my-trs.com
          </a>
        </div>
      </main>
    </div>
  );
}
