"use client";

import { useEffect, useState } from "react";
import { X, Loader2, History, ArrowRight } from "lucide-react";

type Entry = {
  id: number;
  action: string;
  before: any;
  after: any;
  reviewer_name: string | null;
  reviewer_email: string | null;
  created_at: string;
};

// Fields we surface in the diff, in display order.
const FIELDS: { key: string; label: string }[] = [
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "title", label: "Title" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "email_status", label: "Email status" },
  { key: "review_status", label: "Status" },
];

const STATUS_LABELS: Record<string, string> = {
  unreviewed: "Unreviewed",
  updated: "Updated",
  no_change: "No change",
  newly_added: "New",
  needs_removal: "Needs removal",
  skipped: "Skipped",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Added",
  update: "Updated",
  no_change: "Confirmed (no change)",
  mark_for_removal: "Marked for removal",
  undo_review: "Review undone",
  skipped: "Skipped",
  address_update: "Address updated",
  amo_mark_synced: "Marked synced to AMO",
  amo_unmark_synced: "Unmarked from AMO",
  mailchimp_mark_synced: "Marked synced to MailChimp",
  mailchimp_unmark_synced: "Unmarked from MailChimp",
  admin_edit: "Admin edit",
  admin_move: "Moved township",
};

function fmt(key: string, v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  if (key === "review_status") return STATUS_LABELS[v] || String(v);
  return String(v);
}

function diffs(before: any, after: any) {
  if (!after) return [];
  const out: { label: string; from: string; to: string }[] = [];
  for (const f of FIELDS) {
    const b = before ? before[f.key] : undefined;
    const a = after[f.key];
    const bn = b === null || b === undefined ? "" : String(b);
    const an = a === null || a === undefined ? "" : String(a);
    if (bn !== an) out.push({ label: f.label, from: fmt(f.key, b), to: fmt(f.key, a) });
  }
  return out;
}

export default function ContactHistoryModal({
  contactId,
  contactName,
  onClose,
}: {
  contactId: string | null;
  contactName?: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contactId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/contact-verification/contact/${contactId}/history`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.error || "Failed to load history");
        setEntries(j.history || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [contactId]);

  if (!contactId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <History className="w-4 h-4" /> Change history
            </h2>
            {contactName && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{contactName}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400 dark:text-gray-500" />
            </div>
          )}
          {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
          {!loading && !error && entries.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No recorded changes for this contact.</p>
          )}

          {entries.map((e) => {
            const ds = diffs(e.before, e.after);
            return (
              <div
                key={e.id}
                className="border border-gray-200 dark:border-gray-800 rounded-md p-3 bg-gray-50 dark:bg-gray-950"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    {ACTION_LABELS[e.action] || e.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(e.created_at).toLocaleString()}
                  </span>
                </div>

                {e.action === "create" ? (
                  <p className="text-sm text-gray-700 dark:text-gray-300">Contact added.</p>
                ) : ds.length > 0 ? (
                  <ul className="space-y-1">
                    {ds.map((d, i) => (
                      <li key={i} className="text-sm flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{d.label}:</span>
                        <span className="text-gray-500 dark:text-gray-400 line-through">{d.from}</span>
                        <ArrowRight className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                        <span className="text-gray-900 dark:text-gray-100 font-medium">{d.to}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No field changes recorded.</p>
                )}

                {(e.reviewer_name || e.reviewer_email) && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    by {e.reviewer_name || e.reviewer_email}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
