import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center bg-slate-900 px-4 py-8 sm:py-12">
      <div className="w-full max-w-md mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 border border-slate-700 rounded-md px-4 py-2 hover:border-slate-500"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Township Tools
        </Link>
      </div>
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-slate-800 border border-slate-700",
            headerTitle: "text-white",
            headerSubtitle: "text-slate-400",
            socialButtonsBlockButton: "bg-white border-slate-600 hover:bg-slate-100",
            socialButtonsBlockButtonText: "text-slate-900",
            dividerLine: "bg-slate-600",
            dividerText: "text-slate-400",
            formFieldLabel: "text-slate-300",
            formFieldInput: "bg-slate-700 border-slate-600 text-white placeholder-slate-400",
            formButtonPrimary: "bg-slate-600 hover:bg-slate-500 text-white",
            footerActionLink: "text-amber-500 hover:text-amber-400",
            footer: "bg-slate-800 border-t border-slate-700",
            footerAction: "bg-slate-800",
            footerActionText: "text-slate-400",
            identityPreviewText: "text-white",
            identityPreviewEditButton: "text-amber-500",
            formFieldInputShowPasswordButton: "text-slate-400",
            otpCodeFieldInput: "bg-slate-700 border-slate-600 text-white",
            formResendCodeLink: "text-amber-500",
            badge: "bg-slate-700 text-slate-300",
          },
        }}
      />
    </div>
  );
}
