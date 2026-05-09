"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useOrganization, useAuth } from "@clerk/nextjs";
import { ArrowLeft, Loader2, Check, ExternalLink, RefreshCw } from "lucide-react";

type Change = {
  contact_id: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  review_status: string;
  last_action: string;
  last_changed_at: string;
  last_reviewer: string | null;
  township_id: string;
  township_name: string;
  township_slug: string;
  county_name: string;
  county_slug: string;
  region_name: string;
  region_slug: string;
};

const STATUS_LABELS: Record<string, string> = {
  unreviewed: "Unreviewed",
  no_change: "No change",
  updated: "Updated",
  newly_added: "New",
  needs_removal: "Needs removal",
  skipped: "Skipped",
};

export default function RecentChangesPage() {
  const router = useRouter();
  const { isLoaded } = useUser();
  const { membership } = useOrganization();
  const { orgRole } = useAuth();
  const isAdmin = membership?.role === "org:admin" || orgRole === "org:admin";

  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [suppressedUntil, setSuppressedUntil] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isAdmin) router.push("/dashboard");
  }, [isLoaded, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/admin/contact-verification/auth")
      .then((r) => r.json())
      .then((j) => {
        setAuthorized(!!j.ok);
        setAuthChecked(true);
        if (!j.ok) router.push("/admin/contact-verification");
      });
  }, [isAdmin, router]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/contact-verification/recent-changes");
      const json = await res.json();
      if (res.ok) {
        setChanges(json.changes || []);
        setSuppressedUntil(json.suppressed_until || null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authorized) return;
    load();
  }, [authorized]);

  const markSeen = async (contactId: string) => {
    setBusyId(contactId);
    try {
      const res = await fetch(
        `/api/admin/contact-verification/contact/${contactId}/mark-seen`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed");
      setChanges((prev) => prev.filter((c) => c.contact_id !== contactId));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const markAllSeen = async () => {
    if (changes.length === 0) return;
    if (!confirm(`Mark all ${changes.length} changes as reviewed?`)) return;
    setBusyId("__all__");
    try {
      await Promise.all(
        changes.map((c) =>
          fetch(`/api/admin/contact-verification/contact/${c.contact_id}/mark-seen`, {
            method: "POST",
          })
        )
      );
      setChanges([]);
    } finally {
      setBusyId(null);
    }
  };

  if (!isLoaded || !isAdmin || !authChecked || !authorized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <button
          onClick={() => router.push("/admin/contact-verification")}
          className="inline-flex items-center gap-2 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md px-4 py-2.5 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 shadow-sm mb-6"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Contact Verification
        </button>

        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Recent changes</h1>
            <p className="text-sm text-gray-600 mt-1">
              Contacts updated, added, or marked for removal that you haven&apos;t reviewed yet.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            {changes.length > 0 && (
              <button
                onClick={markAllSeen}
                disabled={busyId === "__all__"}
                className="flex items-center gap-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-md disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> Mark all reviewed
              </button>
            )}
          </div>
        </div>

        {suppressedUntil && (
          <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 mb-6 text-sm text-blue-900">
            Notifications are paused until the post-deadline reopen window starts. Edits made
            before then are not flagged.
          </div>
        )}

        {changes.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
            <p className="text-gray-600">
              {suppressedUntil
                ? "No post-reopen changes yet."
                : "Nothing new to review. You're all caught up."}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {changes.map((c) => {
              const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "(no name)";
              return (
                <li
                  key={c.contact_id}
                  className="bg-white border border-gray-200 rounded-md p-4 ring-2 ring-blue-400 ring-offset-1"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-semibold text-gray-900">{name}</span>
                        <span className="inline-flex items-center text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-blue-600 text-white">
                          {c.last_action.replace(/_/g, " ")}
                        </span>
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border border-gray-300 text-gray-700">
                          {STATUS_LABELS[c.review_status] || c.review_status}
                        </span>
                      </div>
                      {c.title && <div className="text-sm text-gray-700 mt-1">{c.title}</div>}
                      <div className="text-sm text-gray-600 mt-1 break-all">
                        {c.email || <span className="text-gray-500 italic">no email</span>}
                        {c.phone ? ` · ${c.phone}` : ""}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        <span className="font-medium text-gray-700">
                          {c.township_name}
                          {c.county_name ? `, ${c.county_name} County` : ""}
                        </span>
                        {c.last_reviewer ? ` · by ${c.last_reviewer}` : " · (anonymous)"}
                        {" · "}
                        {new Date(c.last_changed_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {c.region_slug && c.county_slug && c.township_slug && (
                        <a
                          href={`/verify-contacts/${c.region_slug}/${c.county_slug}/${c.township_slug}?from=admin&scope=township&id=${c.township_id}`}
                          className="flex items-center gap-1 text-xs font-medium text-gray-700 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          <ExternalLink className="w-3 h-3" /> View list
                        </a>
                      )}
                      <button
                        onClick={() => markSeen(c.contact_id)}
                        disabled={busyId === c.contact_id}
                        className="flex items-center gap-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-md disabled:opacity-50"
                      >
                        <Check className="w-3 h-3" /> Mark reviewed
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
