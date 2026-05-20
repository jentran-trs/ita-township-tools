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
  MapPin,
  CheckCircle2,
  HeartHandshake,
  Wrench,
  ExternalLink,
} from "lucide-react";

const PERSONAL_EMAIL = "giang.jentran@gmail.com";
// ITA-billed work (the two free tools above + ITA's own website) — support
// goes to Jen's ITA address so it lands in the right inbox.
const ITA_EMAIL = "jtran@ita-in.org";

// Shared visual treatment for each top-level section header so the three
// categories (Free / Subscription / Custom) read as peer-level groupings.
function SectionHeader({ badge, badgeColors, title, children }) {
  return (
    <div className="text-center mb-8 sm:mb-10">
      <div
        className={`inline-flex items-center gap-2 ${badgeColors} px-4 py-1.5 rounded-full text-sm font-semibold mb-4`}
      >
        {badge}
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-3">{title}</h2>
      {children}
    </div>
  );
}

// A thick horizontal break between top-level sections so the eye sees three
// distinct categories rather than one long scroll.
function SectionDivider() {
  return (
    <div className="flex items-center justify-center my-14 sm:my-20" aria-hidden="true">
      <div className="h-px w-full bg-gray-200 dark:bg-gray-800" />
      <div className="mx-4 w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-700 flex-shrink-0" />
      <div className="h-px w-full bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}

export default function PublicLanding() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 sm:w-9 sm:h-9 text-amber-600 dark:text-amber-400" />
            <span className="text-xl sm:text-2xl font-bold">Township Tools</span>
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
        {/* Hero — flows directly into Section 1 (free tools) to avoid
            repeating "free" / "click and use" content twice. */}
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">Tools for Indiana Townships</h1>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            Free for all Indiana townships
          </h2>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-3">
            Provided as part of your Indiana Township Association membership.
          </p>
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            NO LOGIN NEEDED
          </div>
        </div>

        {/* ───────── Section 1: Free with ITA ───────── */}
        <section>

          <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
            {/* SB 270 Scoring Tool */}
            <button
              onClick={() => router.push("/tools/scoring-tool")}
              className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-8 sm:p-10 text-left hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-lg transition-all group"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-purple-100 dark:bg-purple-900/40 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/60 transition-colors">
                <ClipboardCheck className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2">SB 270 Scoring Tool</h3>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-5">
                Find out if your township is a Designated or Recipient township under SB 270.
              </p>
              <div className="inline-flex items-center gap-2 text-base sm:text-lg font-semibold text-purple-700 dark:text-purple-300 group-hover:text-purple-800">
                Open tool <ArrowRight className="w-5 h-5" />
              </div>
            </button>

            {/* Contact Verification */}
            <button
              onClick={() => router.push("/verify-contacts")}
              className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-8 sm:p-10 text-left hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-lg transition-all group"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-100 dark:bg-rose-900/40 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-rose-200 dark:group-hover:bg-rose-900/60 transition-colors">
                <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Verify Your Contacts</h3>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-5">
                Check and update your township&apos;s officials, addresses, and email addresses.
              </p>
              <div className="inline-flex items-center gap-2 text-base sm:text-lg font-semibold text-rose-700 dark:text-rose-300 group-hover:text-rose-800">
                Open tool <ArrowRight className="w-5 h-5" />
              </div>
            </button>
          </div>

          {/* Tech-support contact CTA — routes to Jen's ITA email since these
              are ITA-funded tools. */}
          <div className="mt-6 sm:mt-8 text-center">
            <a
              href={`mailto:${ITA_EMAIL}?subject=Help%20with%20a%20free%20ITA%20tool`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-900 text-emerald-800 dark:text-emerald-300 border-2 border-emerald-300 dark:border-emerald-700 rounded-lg font-semibold text-base hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
            >
              <Mail className="w-5 h-5" />
              Need help? Contact Jen Tran at {ITA_EMAIL}
            </a>
          </div>
        </section>

        <SectionDivider />

        {/* ───────── Section 2: Subscription-based tools ───────── */}
        <section>
          <SectionHeader
            badgeColors="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
            badge={
              <>
                <HeartHandshake className="w-4 h-4" />
                A FRIENDLY ADD-ON · CONTACT FOR PRICING
              </>
            }
            title="Subscription-based tools"
          >
            <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
              These are friendly add-ons — just a little extra help for day-to-day township work,{" "}
              <strong>not</strong> a replacement for what ITA provides. No long contracts. Cancel
              anytime.
            </p>
            <p className="mt-2">
              <Link
                href="/about"
                className="text-amber-700 dark:text-amber-400 underline hover:text-amber-900 dark:hover:text-amber-300"
              >
                How it works
              </Link>
            </p>
          </SectionHeader>

          <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
            {/* Report Builder */}
            <div className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-7 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center">
                  <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <h4 className="text-lg sm:text-xl font-bold mb-2">Report Builder</h4>
              <p className="text-base text-gray-600 dark:text-gray-400 mb-5 flex-1">
                Build a polished annual report and export it as a print-ready PDF — much faster
                than starting from scratch in Word.
              </p>
              <button
                onClick={() => router.push("/sign-in")}
                className="inline-flex items-center justify-center gap-2 text-base font-semibold text-amber-700 dark:text-amber-300 border-2 border-amber-300 dark:border-amber-700 rounded-lg px-4 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-900/30"
              >
                <LogIn className="w-4 h-4" /> Sign in to use
              </button>
            </div>

            {/* Email Template Builder */}
            <div className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-7 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center">
                  <Mail className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <h4 className="text-lg sm:text-xl font-bold mb-2">Email Template Builder</h4>
              <p className="text-base text-gray-600 dark:text-gray-400 mb-5 flex-1">
                Design professional newsletters and email updates. Copy the HTML and paste into
                any email client — no design skills required.
              </p>
              <button
                onClick={() => router.push("/sign-in")}
                className="inline-flex items-center justify-center gap-2 text-base font-semibold text-emerald-700 dark:text-emerald-300 border-2 border-emerald-300 dark:border-emerald-700 rounded-lg px-4 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
              >
                <LogIn className="w-4 h-4" /> Sign in to use
              </button>
            </div>
          </div>

          {/* Subscribe contact CTA */}
          <div className="mt-6 sm:mt-8 text-center">
            <a
              href={`mailto:${PERSONAL_EMAIL}?subject=Township%20Tools%20subscription`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg font-semibold text-base hover:bg-amber-600 transition-colors shadow-sm"
            >
              <Mail className="w-5 h-5" />
              Get set up — email {PERSONAL_EMAIL}
            </a>
          </div>
        </section>

        <SectionDivider />

        {/* ───────── Section 3: Custom services ───────── */}
        <section>
          <SectionHeader
            badgeColors="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
            badge={
              <>
                <Wrench className="w-4 h-4" />
                CUSTOM SERVICES · PRICED BY SCOPE
              </>
            }
            title="Need something specific?"
          >
            <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
              Pay-per-project services for townships that want something built or designed
              specifically for them. No subscription required.
            </p>
          </SectionHeader>

          <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
            {/* Report Design Service */}
            <div className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-7 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
                  <FolderOpen className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  Custom quote
                </span>
              </div>
              <h4 className="text-lg sm:text-xl font-bold mb-2">Report Design Service</h4>
              <div className="flex-1 mb-5">
                <p className="text-base text-gray-600 dark:text-gray-400 mb-4">
                  Send me your materials and I&apos;ll design your annual report for you. Pricing
                  depends on the number of sections and amount of content — email me for a quote.
                </p>
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    See examples I&apos;ve designed:
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <a
                      href="/examples/vernon-township-2025-year-in-review.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:underline"
                    >
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      Vernon Township — 2025 Year in Review
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                    </a>
                    <a
                      href="/examples/vtfd-2025-annual-report.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:underline"
                    >
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      VTFD — 2025 Annual Report
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                    </a>
                  </div>
                </div>
              </div>
              <a
                href={`mailto:${PERSONAL_EMAIL}?subject=Report%20Design%20Service%20—%20quote%20request`}
                className="inline-flex items-center justify-center gap-2 text-base font-semibold text-blue-700 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-700 rounded-lg px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              >
                <Mail className="w-4 h-4" /> Request a quote
              </a>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
                {PERSONAL_EMAIL}
              </p>
            </div>

            {/* Custom Build Tools */}
            <div className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-7 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center">
                  <Wrench className="w-7 h-7 sm:w-8 sm:h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                  Custom quote
                </span>
              </div>
              <h4 className="text-lg sm:text-xl font-bold mb-2">Custom-Built Tools</h4>
              <p className="text-base text-gray-600 dark:text-gray-400 mb-5 flex-1">
                Have a specific idea? I&apos;ll build a small tool just for your township —
                calculators, data trackers, document templates, automation scripts.
              </p>
              <a
                href={`mailto:${PERSONAL_EMAIL}?subject=Custom%20tool%20for%20my%20township`}
                className="inline-flex items-center justify-center gap-2 text-base font-semibold text-purple-700 dark:text-purple-300 border-2 border-purple-300 dark:border-purple-700 rounded-lg px-4 py-2.5 hover:bg-purple-50 dark:hover:bg-purple-900/30"
              >
                <Mail className="w-4 h-4" /> Tell me your idea
              </a>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
                {PERSONAL_EMAIL}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
