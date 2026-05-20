"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PERSONAL_EMAIL = "giang.jentran@gmail.com";

// Routes where the disclaimer footer is hidden. These are the paid / signed-in
// pages where the visitor has already understood the distinction between the
// free ITA tools and Jen's private paid service — the footer adds clutter
// without value here.
const HIDE_FOOTER_PREFIXES = [
  "/dashboard",
  "/admin",
  "/projects",
  "/tools/report-builder",
  "/tools/email-builder",
  "/asset-collection",
  "/submit-assets",
  "/submissions",
];

// Site-wide disclaimer footer. Lives at the bottom of every PUBLIC page via the
// root layout. Distinguishes the two free ITA tools (Scoring Tool, Contact
// Verification Portal — no login) from the paid independent tools.
export default function SiteFooter() {
  const pathname = usePathname() || "";
  if (HIDE_FOOTER_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 text-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-2">
        <p>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            Free with ITA membership — no login needed:
          </span>{" "}
          <Link
            href="/tools/scoring-tool"
            className="underline hover:text-gray-900 dark:hover:text-white"
          >
            SB 270 Scoring Tool
          </Link>{" "}
          ·{" "}
          <Link
            href="/verify-contacts"
            className="underline hover:text-gray-900 dark:hover:text-white"
          >
            Contact Verification Portal
          </Link>
        </p>
        <p>
          <span className="font-semibold text-amber-700 dark:text-amber-400">
            Friendly add-on
          </span>{" "}
          by Jen Tran (sign in required) — <span className="font-medium">not</span> included with
          Indiana Township Association membership.{" "}
          <Link
            href="/about"
            className="underline hover:text-gray-900 dark:hover:text-white"
          >
            Learn more
          </Link>{" "}
          ·{" "}
          <a
            href={`mailto:${PERSONAL_EMAIL}`}
            className="underline hover:text-gray-900 dark:hover:text-white"
          >
            {PERSONAL_EMAIL}
          </a>
        </p>
      </div>
    </footer>
  );
}
