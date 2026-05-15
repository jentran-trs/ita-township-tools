import Link from "next/link";

const PERSONAL_EMAIL = "giang.jentran@gmail.com";

// Site-wide disclaimer footer. Lives at the bottom of every page via the root
// layout. Distinguishes the two free ITA tools (Scoring Tool, Contact
// Verification Portal — no login) from the paid independent tools.
export default function SiteFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 text-gray-700 text-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-2">
        <p>
          <span className="font-semibold text-emerald-700">Free with ITA membership — no login needed:</span>{" "}
          <Link href="/tools/scoring-tool" className="underline hover:text-gray-900">
            SB 270 Scoring Tool
          </Link>{" "}
          ·{" "}
          <Link href="/verify-contacts" className="underline hover:text-gray-900">
            Contact Verification Portal
          </Link>
        </p>
        <p>
          <span className="font-semibold text-amber-700">Paid subscription</span> by Jen Tran (sign in required) —{" "}
          <span className="font-medium">not</span> included with Indiana Township Association membership.{" "}
          <Link href="/about" className="underline hover:text-gray-900">
            Learn more
          </Link>{" "}
          ·{" "}
          <a href={`mailto:${PERSONAL_EMAIL}`} className="underline hover:text-gray-900">
            {PERSONAL_EMAIL}
          </a>
        </p>
      </div>
    </footer>
  );
}
