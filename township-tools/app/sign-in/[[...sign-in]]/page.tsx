import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <SignIn
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
