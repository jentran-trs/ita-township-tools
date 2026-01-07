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
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-amber-500" />
            <span className="text-xl font-bold text-white">Township Tools</span>
          </div>
          
          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 text-white hover:text-amber-400 transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-400 transition-colors">
                  Get Started
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-400 transition-colors mr-2"
              >
                Go to Dashboard
              </button>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-bold text-white mb-6">
          Professional Reports for<br />
          <span className="text-amber-500">Indiana Townships</span>
        </h1>
        <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
          Create stunning annual reports in minutes. Upload your logo, customize colors, 
          add your content, and export professional PDFs.
        </p>
        
        <div className="flex justify-center gap-4">
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="px-8 py-4 bg-amber-500 text-slate-900 rounded-lg font-bold text-lg hover:bg-amber-400 transition-colors flex items-center gap-2">
                Start Building <ArrowRight className="w-5 h-5" />
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <button 
              onClick={() => router.push("/dashboard")}
              className="px-8 py-4 bg-amber-500 text-slate-900 rounded-lg font-bold text-lg hover:bg-amber-400 transition-colors flex items-center gap-2"
            >
              Go to Dashboard <ArrowRight className="w-5 h-5" />
            </button>
          </SignedIn>
          <button 
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            className="px-8 py-4 border border-slate-600 text-white rounded-lg font-medium text-lg hover:bg-slate-800 transition-colors"
          >
            Learn More
          </button>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
            <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Annual Report Builder</h3>
            <p className="text-slate-400">
              Drag-and-drop interface to create beautiful annual reports. Add sections, 
              charts, images, and statistics with ease.
            </p>
          </div>
          
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
            <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Organization Access</h3>
            <p className="text-slate-400">
              Townships purchase access for their team. Trustees, clerks, and staff 
              can all collaborate on reports.
            </p>
          </div>
          
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
            <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">ITA Managed</h3>
            <p className="text-slate-400">
              Access managed through Indiana Township Association. 
              Simple licensing for member townships.
            </p>
          </div>
        </div>
      </section>

      {/* How Organization Access Works */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          How Organization Access Works
        </h2>
        
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 max-w-4xl mx-auto">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 text-slate-900 font-bold">1</div>
              <div>
                <h3 className="text-lg font-semibold text-white">Township Purchases Access</h3>
                <p className="text-slate-400">Township pays through ITA for annual access to Township Tools.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 text-slate-900 font-bold">2</div>
              <div>
                <h3 className="text-lg font-semibold text-white">Organization Created</h3>
                <p className="text-slate-400">A township organization is created (e.g., &quot;Vernon Township&quot;) with an admin user.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 text-slate-900 font-bold">3</div>
              <div>
                <h3 className="text-lg font-semibold text-white">Admin Invites Members</h3>
                <p className="text-slate-400">Township admin invites trustees, clerks, and staff to join their organization.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 text-slate-900 font-bold">4</div>
              <div>
                <h3 className="text-lg font-semibold text-white">Team Collaborates</h3>
                <p className="text-slate-400">All organization members can access tools, create reports, and share work.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA for ITA */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Indiana Township Association Partners
          </h2>
          <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
            Interested in providing Township Tools to your member townships? 
            We offer bulk licensing and dedicated support for ITA members.
          </p>
          <a 
            href="mailto:contact@example.com" 
            className="inline-block px-6 py-3 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-400 transition-colors"
          >
            Contact for Partnership
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-slate-400">
          <p>&copy; 2025 Township Tools. Built for Indiana Townships.</p>
        </div>
      </footer>
    </div>
  );
}
