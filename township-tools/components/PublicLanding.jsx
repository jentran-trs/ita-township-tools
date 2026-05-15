"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Mail,
  ArrowRight,
  LogIn,
  Lock,
  MapPin,
  CheckCircle2,
} from "lucide-react";

const PERSONAL_EMAIL = "giang.jentran@gmail.com";

export default function PublicLanding() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 sm:w-9 sm:h-9 text-amber-600" />
            <span className="text-xl sm:text-2xl font-bold text-gray-900">Township Tools</span>
          </div>
          <button
            onClick={() => router.push("/sign-in")}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-amber-500 text-white rounded-lg text-base font-semibold hover:bg-amber-600 transition-colors shadow-sm"
          >
            <LogIn className="w-4 h-4" />
            Sign in
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Hero */}
        <div className="mb-10 sm:mb-12 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-4">
            Tools for Indiana Townships
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Pick a tool below to get started.
          </p>
        </div>

        {/* ───────── Section 1: Free with ITA ───────── */}
        <section className="mb-14 sm:mb-20">
          <div className="text-center mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              <CheckCircle2 className="w-4 h-4" />
              FREE · NO LOGIN NEEDED
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Free for all Indiana townships
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Provided as part of your Indiana Township Association membership.
              Just click and use — no account needed.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
            {/* SB 270 Scoring Tool */}
            <button
              onClick={() => router.push("/tools/scoring-tool")}
              className="bg-white border-2 border-gray-200 rounded-2xl p-8 sm:p-10 text-left hover:border-emerald-400 hover:shadow-lg transition-all group"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-purple-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-purple-200 transition-colors">
                <ClipboardCheck className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                SB 270 Scoring Tool
              </h3>
              <p className="text-base sm:text-lg text-gray-600 mb-5">
                Find out if your township is a Designated or Recipient township under SB 270.
              </p>
              <div className="inline-flex items-center gap-2 text-base sm:text-lg font-semibold text-purple-700 group-hover:text-purple-800">
                Open tool <ArrowRight className="w-5 h-5" />
              </div>
            </button>

            {/* Contact Verification */}
            <button
              onClick={() => router.push("/verify-contacts")}
              className="bg-white border-2 border-gray-200 rounded-2xl p-8 sm:p-10 text-left hover:border-emerald-400 hover:shadow-lg transition-all group"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-rose-200 transition-colors">
                <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-rose-600" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Verify Your Contacts
              </h3>
              <p className="text-base sm:text-lg text-gray-600 mb-5">
                Check and update your township&apos;s officials, addresses, and email addresses.
              </p>
              <div className="inline-flex items-center gap-2 text-base sm:text-lg font-semibold text-rose-700 group-hover:text-rose-800">
                Open tool <ArrowRight className="w-5 h-5" />
              </div>
            </button>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-gray-300 mb-14 sm:mb-20"></div>

        {/* ───────── Section 2: Paid subscription ───────── */}
        <section className="mb-12">
          <div className="text-center mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              <Lock className="w-4 h-4" />
              PAID SUBSCRIPTION · SIGN IN REQUIRED
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Extra tools — paid subscription
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              A separate service by Jen Tran.{" "}
              <strong>Not included with ITA membership.</strong>{" "}
              <Link href="/about" className="text-amber-700 underline hover:text-amber-900">
                Why?
              </Link>
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {/* Annual Report Builder */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 sm:p-7 flex flex-col">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                Annual Report Builder
              </h3>
              <p className="text-base text-gray-600 mb-5 flex-1">
                Build a polished annual report and export it as a PDF.
              </p>
              <button
                onClick={() => router.push("/sign-in")}
                className="inline-flex items-center justify-center gap-2 text-base font-semibold text-amber-700 border-2 border-amber-300 rounded-lg px-4 py-2.5 hover:bg-amber-50"
              >
                <LogIn className="w-4 h-4" /> Sign in to use
              </button>
            </div>

            {/* Report Design Service */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 sm:p-7 flex flex-col">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <FolderOpen className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                Report Design Service
              </h3>
              <p className="text-base text-gray-600 mb-5 flex-1">
                Send us your materials and we&apos;ll design your annual report for you.
              </p>
              <button
                onClick={() => router.push("/sign-in")}
                className="inline-flex items-center justify-center gap-2 text-base font-semibold text-blue-700 border-2 border-blue-300 rounded-lg px-4 py-2.5 hover:bg-blue-50"
              >
                <LogIn className="w-4 h-4" /> Sign in to use
              </button>
            </div>

            {/* Email Template Builder */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 sm:p-7 flex flex-col">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <Mail className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                Email Template Builder
              </h3>
              <p className="text-base text-gray-600 mb-5 flex-1">
                Design professional email and newsletter templates to use in any email client.
              </p>
              <button
                onClick={() => router.push("/sign-in")}
                className="inline-flex items-center justify-center gap-2 text-base font-semibold text-emerald-700 border-2 border-emerald-300 rounded-lg px-4 py-2.5 hover:bg-emerald-50"
              >
                <LogIn className="w-4 h-4" /> Sign in to use
              </button>
            </div>
          </div>
        </section>

        {/* Subscribe CTA */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 sm:p-10 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Want a subscription for your township?
          </h2>
          <p className="text-base sm:text-lg text-gray-600 mb-5">
            Email Jen Tran for pricing and to get set up.
          </p>
          <a
            href={`mailto:${PERSONAL_EMAIL}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg font-semibold text-base sm:text-lg hover:bg-amber-600 transition-colors shadow-sm"
          >
            <Mail className="w-5 h-5" />
            {PERSONAL_EMAIL}
          </a>
        </div>
      </main>
    </div>
  );
}
