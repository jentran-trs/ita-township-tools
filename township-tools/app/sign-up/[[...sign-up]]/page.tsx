import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { ArrowLeft, Info } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 dark:bg-gray-950 px-4 py-8 sm:py-12">
      <div className="w-full max-w-md mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Township Tools
        </Link>
      </div>
      <div className="w-full max-w-md mb-5 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-base text-gray-800 dark:text-gray-200">
          Signing up creates an account for the <strong>paid tools only</strong> — an independent
          service by Jen Tran, not part of ITA membership. The free tools (SB 270 Scoring Tool,
          Contact Verification Portal) don&apos;t need an account — just open them from the{" "}
          <Link href="/" className="underline text-amber-700 dark:text-amber-400 hover:text-amber-900">
            homepage
          </Link>
          .
        </p>
      </div>
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-white border border-gray-200 shadow-sm",
            headerTitle: "text-gray-900",
            headerSubtitle: "text-gray-600",
            socialButtonsBlockButton: "bg-white border-gray-300 hover:bg-gray-50",
            socialButtonsBlockButtonText: "text-gray-900",
            dividerLine: "bg-gray-200",
            dividerText: "text-gray-500",
            formFieldLabel: "text-gray-700",
            formFieldInput: "bg-white border-gray-300 text-gray-900 placeholder-gray-400",
            formButtonPrimary: "bg-amber-500 hover:bg-amber-600 text-white",
            footerActionLink: "text-amber-700 hover:text-amber-900",
            footer: "bg-white border-t border-gray-200",
            footerAction: "bg-white",
            footerActionText: "text-gray-600",
            identityPreviewText: "text-gray-900",
            identityPreviewEditButton: "text-amber-700",
            formFieldInputShowPasswordButton: "text-gray-500",
            otpCodeFieldInput: "bg-white border-gray-300 text-gray-900",
            formResendCodeLink: "text-amber-700",
            badge: "bg-gray-100 text-gray-700",
          },
        }}
      />
    </div>
  );
}
