"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser, useOrganization, useAuth } from "@clerk/nextjs";
import { ArrowLeft, Loader2, Download, RotateCcw, CheckCircle2, ExternalLink, Filter } from "lucide-react";

type Stat = {
  region_id: string;
  region_name: string;
  region_slug?: string;
  county_id: string;
  county_name: string;
  county_slug?: string;
  township_id: string;
  township_name: string;
  township_slug?: string;
  township_status: string;
  contact_total: number;
  contact_reviewed: number;
};

type Audit = {
  id: number;
  action: string;
  created_at: string;
  reviewer_name: string | null;
  reviewer_email: string | null;
  township_id: string;
  contact_id: string | null;
  before: any;
  after: any;
};

type Contact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  email_status: string | null;
  previous_email: string | null;
  previous_email_status: string | null;
  review_status: string;
  reviewed_by_name: string | null;
  region_name: string;
  county_name: string;
  township_name: string;
  township_id: string;
};

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unreviewed", label: "Unreviewed" },
  { value: "no_change", label: "No change" },
  { value: "updated", label: "Updated" },
  { value: "newly_added", label: "New" },
  { value: "needs_removal", label: "Needs removal" },
];

export default function DrillDownPage() {
  const router = useRouter();
  const params = useParams();
  const scope = params.scope as string;
  const id = params.id as string;

  const { isLoaded } = useUser();
  const { membership } = useOrganization();
  const { orgRole } = useAuth();
  const isAdmin = membership?.role === "org:admin" || orgRole === "org:admin";

  const [stats, setStats] = useState<Stat[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [lastViewedAt, setLastViewedAt] = useState<string | null>(null);
  const [verificationDeadline, setVerificationDeadline] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<"all" | "since_visit" | "since_deadline">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [detailed, setDetailed] = useState(false);

  useEffect(() => {
    if (isLoaded && !isAdmin) router.push("/dashboard");
  }, [isLoaded, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/admin/contact-verification/auth")
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) router.push("/admin/contact-verification");
      })
      .catch(() => {});
  }, [isAdmin, router]);

  const load = async () => {
    const [scopeRes, contactsRes] = await Promise.all([
      fetch(`/api/admin/contact-verification/scope/${scope}/${id}`),
      fetch(`/api/admin/contact-verification/contacts/${scope}/${id}`),
    ]);
    const scopeJson = await scopeRes.json();
    const contactsJson = await contactsRes.json();
    if (scopeRes.ok) {
      setStats(scopeJson.stats || []);
      setAudit(scopeJson.audit || []);
      setLastViewedAt(scopeJson.last_viewed_at || null);
      setVerificationDeadline(scopeJson.verification_deadline || null);
    }
    if (contactsRes.ok) {
      setContacts(contactsJson.contacts || []);
    }
    setLoading(false);
  };

  const filteredContacts = useMemo(() => {
    if (filter === "all") return contacts;
    return contacts.filter((c) => c.review_status === filter);
  }, [contacts, filter]);

  const filterCounts = useMemo(() => {
    const map: Record<string, number> = { all: contacts.length };
    for (const c of contacts) map[c.review_status] = (map[c.review_status] || 0) + 1;
    return map;
  }, [contacts]);

  const allFilteredSelected =
    filteredContacts.length > 0 && filteredContacts.every((c) => selected.has(c.id));

  const toggleAllFiltered = () => {
    const next = new Set(selected);
    if (allFilteredSelected) {
      for (const c of filteredContacts) next.delete(c.id);
    } else {
      for (const c of filteredContacts) next.add(c.id);
    }
    setSelected(next);
  };

  const toggleOne = (cid: string) => {
    const next = new Set(selected);
    if (next.has(cid)) next.delete(cid);
    else next.add(cid);
    setSelected(next);
  };

  const exportSelected = async (format: "xlsx" | "csv") => {
    if (selected.size === 0) return;
    const variant = detailed ? "detailed" : "simple";
    setExporting(true);
    try {
      const res = await fetch(
        `/api/admin/contact-verification/export?format=${format}&variant=${variant}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactIds: Array.from(selected) }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Export failed");
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="([^"]+)"/);
      const fname = match ? match[1] : `contacts.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin, scope, id]);

  const reopen = async (townshipId: string) => {
    if (!confirm("Reopen this township for editing?")) return;
    await fetch(`/api/admin/contact-verification/township/${townshipId}/reopen`, { method: "POST" });
    load();
  };

  if (!isLoaded || !isAdmin || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const heading =
    scope === "region"
      ? stats[0]?.region_name
      : scope === "county"
      ? `${stats[0]?.county_name} County`
      : stats[0]?.township_name;
  const subheading =
    scope === "township"
      ? `${stats[0]?.region_name} · ${stats[0]?.county_name} County`
      : scope === "county"
      ? stats[0]?.region_name
      : "All counties";

  const contactTotal = stats.reduce((s, r) => s + (r.contact_total || 0), 0);
  const contactReviewed = stats.reduce((s, r) => s + (r.contact_reviewed || 0), 0);
  const townshipCompleted = stats.filter((r) => r.township_status === "completed").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <button
          onClick={() => router.push("/admin/contact-verification")}
          className="inline-flex items-center gap-2 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md px-4 py-2.5 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 shadow-sm mb-6"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Contact Verification
        </button>

        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="text-sm text-gray-500">{subheading}</div>
            <h1 className="text-2xl font-semibold text-gray-900 mt-1">{heading || "—"}</h1>
            <div className="text-sm text-gray-600 mt-2">
              {townshipCompleted}/{stats.length} townships completed · {contactReviewed}/{contactTotal} contacts reviewed
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={detailed}
                onChange={(e) => setDetailed(e.target.checked)}
              />
              Detailed columns
            </label>
            <button
              onClick={() =>
                (window.location.href = `/api/admin/contact-verification/export?scope=${scope}&id=${id}&format=xlsx&variant=${detailed ? "detailed" : "simple"}`)
              }
              className="flex items-center gap-2 text-sm px-3 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
            >
              <Download className="w-4 h-4" /> xlsx
            </button>
            <button
              onClick={() =>
                (window.location.href = `/api/admin/contact-verification/export?scope=${scope}&id=${id}&format=csv&variant=${detailed ? "detailed" : "simple"}`)
              }
              className="flex items-center gap-2 text-sm font-medium text-gray-700 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Download className="w-4 h-4" /> csv
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                {scope !== "township" && <th className="px-4 py-2 font-medium">Township</th>}
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right">Reviewed</th>
                <th className="px-4 py-2 font-medium text-right">Total</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.map((s) => (
                <tr key={s.township_id}>
                  {scope !== "township" && (
                    <td className="px-4 py-2 text-gray-900">
                      {scope === "region" ? `${s.county_name} · ` : ""}
                      {s.township_name}
                    </td>
                  )}
                  <td className="px-4 py-2">
                    <StatusBadge status={s.township_status} />
                  </td>
                  <td className="px-4 py-2 text-right text-gray-700">{s.contact_reviewed}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{s.contact_total}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-2">
                      {s.region_slug && s.county_slug && s.township_slug && (
                        <a
                          href={`/verify-contacts/${s.region_slug}/${s.county_slug}/${s.township_slug}?from=admin&scope=${scope}&id=${id}`}
                          className="flex items-center gap-1 text-xs font-medium text-gray-700 px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          <ExternalLink className="w-3 h-3" /> View list
                        </a>
                      )}
                      {s.township_status === "completed" && (
                        <button
                          onClick={() => reopen(s.township_id)}
                          className="flex items-center gap-1 text-xs font-medium text-gray-700 px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          <RotateCcw className="w-3 h-3" /> Reopen
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <h2 className="text-base font-semibold text-gray-900">Contacts</h2>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <>
                <span className="text-sm text-gray-600">{selected.size} selected</span>
                <button
                  onClick={() => exportSelected("xlsx")}
                  disabled={exporting}
                  className="flex items-center gap-1 text-sm font-medium text-white bg-gray-900 px-3 py-1.5 rounded-md hover:bg-gray-800 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" /> Export selected (xlsx)
                </button>
                <button
                  onClick={() => exportSelected("csv")}
                  disabled={exporting}
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" /> csv
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-gray-500 underline"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`text-xs px-2.5 py-1 rounded-full border ${
                filter === f.value
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {f.label}
              {filterCounts[f.value] !== undefined && (
                <span className="ml-1 opacity-70">({filterCounts[f.value]})</span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-8">
          {filteredContacts.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500 text-center">No contacts in this filter.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleAllFiltered}
                      aria-label="Select all visible"
                    />
                  </th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email · Phone</th>
                  {scope !== "township" && <th className="px-3 py-2 font-medium">Township</th>}
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredContacts.map((c) => {
                  const checked = selected.has(c.id);
                  return (
                    <tr key={c.id} className={checked ? "bg-blue-50" : ""}>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={checked} onChange={() => toggleOne(c.id)} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-gray-900">
                          {[c.first_name, c.last_name].filter(Boolean).join(" ") || "(no name)"}
                        </div>
                        {c.title && <div className="text-xs text-gray-500">{c.title}</div>}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        <div className="break-all">{c.email || <span className="text-gray-400">no email</span>}</div>
                        {c.phone && <div className="text-xs text-gray-500">{c.phone}</div>}
                        {c.previous_email && (
                          <div className="text-xs text-amber-700 mt-0.5">
                            Was: {c.previous_email}
                            {c.previous_email_status ? ` (${c.previous_email_status})` : ""}
                          </div>
                        )}
                      </td>
                      {scope !== "township" && (
                        <td className="px-3 py-2 text-gray-700 text-xs">
                          {c.township_name}
                          <div className="text-gray-400">{c.county_name} County</div>
                        </td>
                      )}
                      <td className="px-3 py-2">
                        <ContactStatusBadge status={c.review_status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <h2 className="text-base font-semibold text-gray-900">Recent activity</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Show:</span>
            {[
              { value: "all" as const, label: "All" },
              {
                value: "since_visit" as const,
                label: lastViewedAt
                  ? `Since my last visit (${new Date(lastViewedAt).toLocaleDateString()})`
                  : "Since my last visit",
                disabled: !lastViewedAt,
              },
              {
                value: "since_deadline" as const,
                label: verificationDeadline
                  ? `Since deadline (${new Date(verificationDeadline + "T00:00:00").toLocaleDateString()})`
                  : "Since deadline",
                disabled: !verificationDeadline,
              },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setActivityFilter(f.value)}
                disabled={f.disabled}
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  activityFilter === f.value
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {(() => {
            const filtered = audit.filter((a) => {
              if (activityFilter === "since_visit" && lastViewedAt) {
                return a.created_at > lastViewedAt;
              }
              if (activityFilter === "since_deadline" && verificationDeadline) {
                return a.created_at >= new Date(verificationDeadline + "T00:00:00").toISOString();
              }
              return true;
            });
            if (filtered.length === 0) {
              return (
                <div className="px-4 py-6 text-sm text-gray-500 text-center">No edits in this filter.</div>
              );
            }
            return (
              <ul className="divide-y divide-gray-100">
                {filtered.map((a) => {
                  const isNew = lastViewedAt ? a.created_at > lastViewedAt : false;
                  return (
                    <li
                      key={a.id}
                      className={`px-4 py-3 text-sm ${isNew ? "bg-blue-50/50" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-gray-900 flex items-center gap-2">
                          {isNew && (
                            <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-600 text-white">
                              new
                            </span>
                          )}
                          <span className="font-medium capitalize">{a.action.replace("_", " ")}</span>
                          {a.reviewer_name || a.reviewer_email ? (
                            <span className="text-gray-600">
                              by {a.reviewer_name || a.reviewer_email}
                            </span>
                          ) : (
                            <span className="text-gray-400">(anonymous)</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(a.created_at).toLocaleString()}
                        </div>
                      </div>
                      {a.after?.first_name || a.after?.last_name || a.before?.first_name ? (
                        <div className="text-xs text-gray-500 mt-1">
                          {[
                            a.after?.first_name || a.before?.first_name,
                            a.after?.last_name || a.before?.last_name,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </div>
                      ) : null}
                      {a.action === "session_finished" && a.after?.note && (
                        <div className="text-sm text-gray-700 italic mt-1.5 pl-2 border-l-2 border-gray-300">
                          &ldquo;{a.after.note}&rdquo;
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function ContactStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    unreviewed: "bg-red-50 text-red-700 border-red-200",
    no_change: "bg-emerald-50 text-emerald-700 border-emerald-200",
    updated: "bg-emerald-50 text-emerald-700 border-emerald-200",
    newly_added: "bg-blue-50 text-blue-700 border-blue-200",
    needs_removal: "bg-amber-50 text-amber-700 border-amber-300",
  };
  const labels: Record<string, string> = {
    unreviewed: "Unreviewed",
    no_change: "No change",
    updated: "Updated",
    newly_added: "New",
    needs_removal: "Needs removal",
  };
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${
        styles[status] || "bg-gray-100 text-gray-600 border-gray-200"
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
        <CheckCircle2 className="w-3 h-3" /> Completed
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">In progress</span>
    );
  }
  return <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">Not started</span>;
}
