"use client";

import { Lock } from "lucide-react";

const SUBSCRIBE_URL =
  "https://www.ita-in.org/site_page.cfm?pk_association_webpage_menu=10935&pk_association_webpage=28515";

// Shown on the public Verify Contacts portal when the superadmin has manually
// closed it (portal_status_override = 'closed'). Directs people to the ITA
// Member Center to update their info, and new members to the subscribe page.
export default function PortalClosedNotice({ className = "" }) {
  return (
    <div
      className={`bg-gray-100 border-2 border-gray-300 rounded-md px-4 py-3 flex items-start gap-2 text-base text-gray-800 ${className}`}
    >
      <Lock className="w-5 h-5 mt-0.5 flex-shrink-0" />
      <div>
        <strong>The contact verification portal is currently closed.</strong> To review
        and update your township contacts, please log in to the{" "}
        <strong>ITA Member Center</strong> and go to the{" "}
        <strong>Update My Information</strong> section.
        <div className="mt-2">
          New to ITA and would like to subscribe to ITA emails?{" "}
          <a
            href={SUBSCRIBE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-700 underline"
          >
            Visit this page
          </a>
          .
        </div>
      </div>
    </div>
  );
}
