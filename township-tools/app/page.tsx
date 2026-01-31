"use client";

import { SignInButton, SignUpButton, UserButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { FileText, Users, Shield, ArrowRight, Building2 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
            <span className="text-lg sm:text-xl font-bold text-white">Township Tools</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-3 sm:px-4 py-2 text-sm sm:text-base text-white hover:text-amber-400 transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-400 transition-colors">
                  Get Started
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-400 transition-colors mr-1 sm:mr-2"
              >
                <span className="hidden sm:inline">Go to </span>Dashboard
              </button>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
          Professional Reports for<br />
          <span className="text-amber-500">Indiana Townships</span>
        </h1>
        <p className="text-base sm:text-lg lg:text-xl text-slate-300 mb-8 sm:mb-10 max-w-2xl mx-auto px-4">
          Create stunning annual reports in minutes. Upload your logo, customize colors,
          add your content, and export professional PDFs.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-amber-500 text-slate-900 rounded-lg font-bold text-base sm:text-lg hover:bg-amber-400 transition-colors flex items-center justify-center gap-2">
                Start Building <ArrowRight className="w-5 h-5" />
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-amber-500 text-slate-900 rounded-lg font-bold text-base sm:text-lg hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
            >
              Go to Dashboard <ArrowRight className="w-5 h-5" />
            </button>
          </SignedIn>
          <button
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border border-slate-600 text-white rounded-lg font-medium text-base sm:text-lg hover:bg-slate-800 transition-colors"
          >
            Learn More
          </button>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 sm:p-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/20 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Annual Report Builder</h3>
            <p className="text-sm sm:text-base text-slate-400">
              Drag-and-drop interface to create beautiful annual reports. Add sections,
              charts, images, and statistics with ease.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 sm:p-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/20 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Organization Access</h3>
            <p className="text-sm sm:text-base text-slate-400">
              Townships purchase access for their team. Trustees, clerks, and staff
              can all collaborate on reports.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 sm:p-8 sm:col-span-2 lg:col-span-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/20 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">ITA Managed</h3>
            <p className="text-sm sm:text-base text-slate-400">
              Access managed through Indiana Township Association.
              Simple licensing for member townships.
            </p>
          </div>
        </div>
      </section>

      {/* How Organization Access Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-8 sm:mb-12">
          How Organization Access Works
        </h2>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 sm:p-8 max-w-4xl mx-auto">
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 text-slate-900 font-bold text-sm sm:text-base">1</div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white">Township Purchases Access</h3>
                <p className="text-sm sm:text-base text-slate-400">Township pays through ITA for annual access to Township Tools.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 text-slate-900 font-bold text-sm sm:text-base">2</div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white">Organization Created</h3>
                <p className="text-sm sm:text-base text-slate-400">A township organization is created (e.g., &quot;Vernon Township&quot;) with an admin user.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 text-slate-900 font-bold text-sm sm:text-base">3</div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white">Admin Invites Members</h3>
                <p className="text-sm sm:text-base text-slate-400">Township admin invites trustees, clerks, and staff to join their organization.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 text-slate-900 font-bold text-sm sm:text-base">4</div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white">Team Collaborates</h3>
                <p className="text-sm sm:text-base text-slate-400">All organization members can access tools, create reports, and share work.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA for ITA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 sm:p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
            Indiana Township Association Partners
          </h2>
          <p className="text-sm sm:text-base text-slate-300 mb-4 sm:mb-6 max-w-2xl mx-auto">
            Interested in providing Township Tools to your member townships?
            We offer bulk licensing and dedicated support for ITA members.
          </p>
          <a
            href="mailto:ita@ita-in.org"
            className="inline-block px-5 sm:px-6 py-2.5 sm:py-3 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-400 transition-colors"
          >
            Contact for Partnership
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 mt-12 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-center text-sm sm:text-base text-slate-400">
          <p>&copy; 2025 Township Tools. Built for Indiana Townships.</p>
        </div>
      </footer>
    </div>
  );
}
