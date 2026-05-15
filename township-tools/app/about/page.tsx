import Link from "next/link";
import { ArrowLeft, CheckCircle2, Lock, Mail } from "lucide-react";

export const metadata = {
  title: "About this site — Township Tools",
  description:
    "How Township Tools relates to Indiana Township Association: which tools are free with ITA membership, and which are an independent paid service.",
};

const PERSONAL_EMAIL = "giang.jentran@gmail.com";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md px-4 py-2.5 hover:bg-gray-100 mb-8 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Township Tools
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">About this site</h1>
        <p className="text-base sm:text-lg text-gray-600 mb-8">
          This site has two different kinds of tools. Here&apos;s the difference.
        </p>

        {/* Free / ITA section */}
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 sm:p-7 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Free with ITA membership — no login needed
            </h2>
          </div>
          <p className="text-base sm:text-lg text-gray-800 mb-3">
            The <strong>SB 270 Scoring Tool</strong> and the{" "}
            <strong>Contact Verification Portal</strong> are free for any Indiana township to use.
            They are provided as part of what Indiana Township Association gives its members.
          </p>
          <p className="text-base sm:text-lg text-gray-800">
            <strong>You do not need to create an account or sign in.</strong> Just open the tool
            from the homepage and start using it. No payment, no subscription, no login.
          </p>
        </div>

        {/* Paid section */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 sm:p-7 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-6 h-6 text-amber-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Extra tools — paid subscription (sign in required)
            </h2>
          </div>
          <p className="text-base sm:text-lg text-gray-800 mb-3">
            All other tools on this site — including the <strong>Annual Report Builder</strong>,{" "}
            <strong>Email Template Builder</strong>, and{" "}
            <strong>Report Design Service</strong> — are a separate, paid service run by{" "}
            <strong>Jen Tran</strong>. They require a sign-in because access is tied to a paid
            subscription. <strong>They are not part of your ITA membership.</strong>
          </p>
          <p className="text-base sm:text-lg text-gray-800">
            Jen is also separately hired by ITA to provide technical support and to manage ITA&apos;s
            official website. That&apos;s how she built the two free tools above. But the paid
            tools are her own work, offered to townships that want them.
          </p>
        </div>

        {/* Where to direct questions */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 sm:p-7 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            Who to contact
          </h2>
          <ul className="space-y-3 text-base sm:text-lg text-gray-800">
            <li>
              <strong>Questions about your ITA membership:</strong> contact ITA staff.
            </li>
            <li>
              <strong>Help with the free tools:</strong> email Jen at{" "}
              <a href={`mailto:${PERSONAL_EMAIL}`} className="text-amber-700 underline hover:text-amber-900">
                {PERSONAL_EMAIL}
              </a>
              .
            </li>
            <li>
              <strong>Questions about the paid tools or a subscription:</strong> email Jen at{" "}
              <a href={`mailto:${PERSONAL_EMAIL}`} className="text-amber-700 underline hover:text-amber-900">
                {PERSONAL_EMAIL}
              </a>
              .
            </li>
          </ul>
        </div>

        {/* Subscribe CTA */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 sm:p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Want a subscription?
          </h2>
          <p className="text-base sm:text-lg text-gray-600 mb-5">
            Email Jen for pricing and to set up your township.
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
