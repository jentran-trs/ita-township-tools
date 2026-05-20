import Link from "next/link";
import { ArrowLeft, CheckCircle2, Mail, HeartHandshake } from "lucide-react";

export const metadata = {
  title: "About this site — Township Tools",
  description:
    "How Township Tools relates to Indiana Township Association: which tools are free with ITA membership, and which are an independent paid service.",
};

const PERSONAL_EMAIL = "giang.jentran@gmail.com";
const ITA_EMAIL = "jtran@ita-in.org";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 mb-8 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Township Tools
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold mb-3">About this site</h1>
        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-8">
          Two kinds of tools live here. Here&apos;s the quick version.
        </p>

        {/* Free / ITA */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 sm:p-7 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl sm:text-2xl font-bold">Free with ITA membership</h2>
          </div>
          <p className="text-base sm:text-lg text-gray-800 dark:text-gray-200 mb-3">
            Provided as part of what ITA gives its members. <strong>No account, no payment, no login.</strong>
          </p>
          <ul className="space-y-1.5 text-base sm:text-lg text-gray-800 dark:text-gray-200 list-disc list-inside">
            <li>SB 270 Scoring Tool</li>
            <li>Contact Verification Portal</li>
          </ul>
        </div>

        {/* Paid / Jen's service */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-6 sm:p-7 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <HeartHandshake className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <h2 className="text-xl sm:text-2xl font-bold">Paid add-on tools (sign in required)</h2>
          </div>
          <p className="text-base sm:text-lg text-gray-800 dark:text-gray-200 mb-3">
            A separate service by <strong>Jen Tran</strong> — just a little extra help for
            day-to-day township work. <strong>Not</strong> a replacement for ITA.
          </p>
          <ul className="space-y-1.5 text-base sm:text-lg text-gray-800 dark:text-gray-200 list-disc list-inside mb-3">
            <li>Report Builder</li>
            <li>Email Template Builder</li>
            <li>Report Design Service</li>
            <li>Custom-built tools</li>
          </ul>
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 italic">
            Why is Jen connected to ITA? She&apos;s contracted by ITA to manage their official
            website and provide tech support. The paid tools are her own private work.
          </p>
        </div>

        {/* How to get access */}
        <div className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-7 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <h2 className="text-xl sm:text-2xl font-bold">Interested in the paid tools?</h2>
          </div>
          <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 mb-4">
            Send Jen a note and she&apos;ll get you set up. Quick rundown of what&apos;s available:
          </p>
          <div className="space-y-4">
            <div className="border-l-4 border-amber-400 pl-4">
              <div className="font-bold text-lg sm:text-xl mb-1">Report Builder + Email Template Builder</div>
              <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300">
                Sign-in tools for day-to-day township work.
              </p>
            </div>
            <div className="border-l-4 border-blue-400 pl-4">
              <div className="font-bold text-lg sm:text-xl mb-1">Report Design Service</div>
              <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300">
                Send Jen your materials, she designs your annual report for you.
              </p>
            </div>
            <div className="border-l-4 border-purple-400 pl-4">
              <div className="font-bold text-lg sm:text-xl mb-1">Custom-built tools</div>
              <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300">
                Calculators, data trackers, document templates — built specifically for your township.
              </p>
            </div>
          </div>
        </div>

        {/* Who to contact */}
        <div className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-7 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Who to contact</h2>
          <ul className="space-y-2 text-base sm:text-lg text-gray-800 dark:text-gray-200 list-disc list-inside">
            <li>
              <strong>Help with the free tools</strong> → Jen Tran at{" "}
              <a
                href={`mailto:${ITA_EMAIL}`}
                className="text-emerald-700 dark:text-emerald-300 underline hover:text-emerald-900"
              >
                {ITA_EMAIL}
              </a>
            </li>
            <li>
              <strong>Access to the paid tools, or custom work</strong> → Jen Tran at{" "}
              <a
                href={`mailto:${PERSONAL_EMAIL}`}
                className="text-amber-700 dark:text-amber-300 underline hover:text-amber-900"
              >
                {PERSONAL_EMAIL}
              </a>
            </li>
          </ul>
        </div>

        {/* Email CTA */}
        <div className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8 text-center">
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-4">
            Questions or curious about the paid tools? Send me a note.
          </p>
          <a
            href={`mailto:${PERSONAL_EMAIL}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg font-semibold text-base sm:text-lg hover:bg-amber-600 transition-colors shadow-sm"
          >
            <Mail className="w-5 h-5" />
            {PERSONAL_EMAIL}
          </a>
        </div>
      </div>
    </div>
  );
}
