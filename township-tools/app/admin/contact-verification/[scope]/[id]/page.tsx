"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser, useOrganization, useAuth } from "@clerk/nextjs";
import { ArrowLeft, Loader2, Download, RotateCcw, CheckCircle2, ExternalLink, Filter, MoveRight, X } from "lucide-react";

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
  cv_townships?: { name: string; cv_counties?: { name: string } } | null;
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

const STATUS_OPTIONS: { value: string; label: string }[] = [
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
  const [lastViewedAt, setLastViewedAt] = useState<string | null>(null);
  const [verificationDeadline, setVerificationDeadline] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [townshipFilters, setTownshipFilters] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [detailed, setDetailed] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTree, setMoveTree] = useState<any[]>([]);
  const [moveRegionId, setMoveRegionId] = useState("");
  const [moveCountyId, setMoveCountyId] = useState("");
  const [moveTownshipId, setMoveTownshipId] = useState("");
  const [moving, setMoving] = useState(false);

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
      setLastViewedAt(scopeJson.last_viewed_at || null);
      setVerificationDeadline(scopeJson.verification_deadline || null);
    }
    if (contactsRes.ok) {
      setContacts(contactsJson.contacts || []);
    }
    setLoading(false);
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (statusFilters.size > 0 && !statusFilters.has(c.review_status)) return false;
      if (townshipFilters.size > 0 && !townshipFilters.has(c.township_id)) return false;
      return true;
    });
  }, [contacts, statusFilters, townshipFilters]);

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of contacts) map[c.review_status] = (map[c.review_status] || 0) + 1;
    return map;
  }, [contacts]);

  const townshipOptions = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; count: number }>();
    for (const c of contacts) {
      if (!c.township_id) continue;
      const existing = seen.get(c.township_id);
      if (existing) existing.count += 1;
      else seen.set(c.township_id, { id: c.township_id, name: c.township_name, count: 1 });
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts]);

  const toggleStatus = (v: string) => {
    const next = new Set(statusFilters);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setStatusFilters(next);
  };
  const toggleTownship = (id: string) => {
    const next = new Set(townshipFilters);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setTownshipFilters(next);
  };

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

  const submitMove = async () => {
    if (selected.size === 0 || !moveTownshipId) return;
    setMoving(true);
    try {
      const res = await fetch("/api/admin/contact-verification/contacts/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: Array.from(selected),
          target_township_id: moveTownshipId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Move failed");
      setShowMoveModal(false);
      setSelected(new Set());
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setMoving(false);
    }
  };

  const moveRegion = moveTree.find((r: any) => r.id === moveRegionId);
  const moveCounty = moveRegion?.counties?.find((c: any) => c.id === moveCountyId);

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

        {scope === "region" && stats[0]?.region_id && (
          <DangerZone regionId={id} regionName={stats[0]?.region_name || ""} />
        )}

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
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {s.region_slug && s.county_slug && s.township_slug && (
                        <a
                          href={`/verify-contacts/${s.region_slug}/${s.county_slug}/${s.township_slug}?from=admin&scope=${scope}&id=${id}`}
                          className="flex items-center gap-1 text-xs font-medium text-gray-700 px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          <ExternalLink className="w-3 h-3" /> View list
                        </a>
                      )}
                      <a
                        href={`/api/admin/contact-verification/export?scope=township&id=${s.township_id}&format=xlsx&variant=${detailed ? "detailed" : "simple"}`}
                        className="flex items-center gap-1 text-xs font-medium text-gray-700 px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        <Download className="w-3 h-3" /> Export
                      </a>
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
                  onClick={async () => {
                    if (moveTree.length === 0) {
                      try {
                        const r = await fetch("/api/verify/locations");
                        const j = await r.json();
                        setMoveTree(j.regions || []);
                      } catch {}
                    }
                    setMoveRegionId("");
                    setMoveCountyId("");
                    setMoveTownshipId("");
                    setShowMoveModal(true);
                  }}
                  className="flex items-center gap-1 text-sm font-medium text-blue-700 border border-blue-300 px-3 py-1.5 rounded-md hover:bg-blue-50"
                >
                  <MoveRight className="w-3.5 h-3.5" /> Move to township
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

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 mb-3 space-y-3">
          {townshipOptions.length > 1 && (
            <div className="flex items-start gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-xs font-medium text-gray-600 mt-1">
                <Filter className="w-3 h-3" /> Townships:
              </span>
              {townshipOptions.map((t) => {
                const active = townshipFilters.has(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTownship(t.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border ${
                      active
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {t.name} <span className="opacity-70">({t.count})</span>
                  </button>
                );
              })}
              {townshipFilters.size > 0 && (
                <button
                  onClick={() => setTownshipFilters(new Set())}
                  className="text-xs text-gray-500 underline ml-1 mt-1"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          <div className="flex items-start gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs font-medium text-gray-600 mt-1">
              <Filter className="w-3 h-3" /> Statuses:
            </span>
            {STATUS_OPTIONS.map((f) => {
              const active = statusFilters.has(f.value);
              const count = statusCounts[f.value] || 0;
              return (
                <button
                  key={f.value}
                  onClick={() => toggleStatus(f.value)}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    active
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {f.label} <span className="opacity-70">({count})</span>
                </button>
              );
            })}
            {statusFilters.size > 0 && (
              <button
                onClick={() => setStatusFilters(new Set())}
                className="text-xs text-gray-500 underline ml-1 mt-1"
              >
                Clear
              </button>
            )}
          </div>

          <div className="text-xs text-gray-500">
            Showing <strong>{filteredContacts.length}</strong> of {contacts.length} contact{contacts.length === 1 ? "" : "s"}.
            {(townshipFilters.size > 0 || statusFilters.size > 0) && (
              <button
                onClick={() => {
                  setTownshipFilters(new Set());
                  setStatusFilters(new Set());
                }}
                className="ml-2 text-gray-700 underline"
              >
                Clear all filters
              </button>
            )}
          </div>
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


      </div>

      {showMoveModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
          onClick={() => !moving && setShowMoveModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold text-gray-900">
                Move {selected.size} contact{selected.size === 1 ? "" : "s"}
              </h2>
              <button
                onClick={() => setShowMoveModal(false)}
                className="text-gray-500 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Reassign the selected contact{selected.size === 1 ? "" : "s"} to a different
              township. This is logged in the audit history.
            </p>
            <div className="space-y-3">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Region</span>
                <select
                  value={moveRegionId}
                  onChange={(e) => {
                    setMoveRegionId(e.target.value);
                    setMoveCountyId("");
                    setMoveTownshipId("");
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900"
                >
                  <option value="">Select a region</option>
                  {moveTree.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">County</span>
                <select
                  value={moveCountyId}
                  onChange={(e) => {
                    setMoveCountyId(e.target.value);
                    setMoveTownshipId("");
                  }}
                  disabled={!moveRegion}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">{moveRegion ? "Select a county" : "Pick a region first"}</option>
                  {(moveRegion?.counties || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Township</span>
                <select
                  value={moveTownshipId}
                  onChange={(e) => setMoveTownshipId(e.target.value)}
                  disabled={!moveCounty}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">{moveCounty ? "Select a township" : "Pick a county first"}</option>
                  {(moveCounty?.townships || []).map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-5 flex-wrap">
              <button
                onClick={() => setShowMoveModal(false)}
                disabled={moving}
                className="text-sm font-medium text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitMove}
                disabled={moving || !moveTownshipId}
                className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {moving ? "Moving…" : `Move ${selected.size} contact${selected.size === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DangerZone({ regionId, regionName }: { regionId: string; regionName: string }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/contact-verification/region/${regionId}/delete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmName: confirmText }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      alert(`Deleted "${json.deleted}". Returning to dashboard.`);
      router.push("/admin/contact-verification");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-6 border-2 border-red-200 rounded-lg p-5 bg-red-50/40">
        <h2 className="text-base font-semibold text-red-900 mb-1">Danger zone</h2>
        <p className="text-sm text-red-900/80 mb-4">
          Delete this entire region — including all of its counties, townships, contacts, and
          audit history. Use this after you have exported the data and applied it to your
          downstream system. This cannot be undone.
        </p>
        <button
          onClick={() => {
            setConfirmText("");
            setShowModal(true);
          }}
          className="flex items-center gap-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md shadow-sm"
        >
          Delete region
        </button>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
          onClick={() => !busy && setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Delete &ldquo;{regionName}&rdquo;?
            </h2>
            <p className="text-sm text-gray-700 mb-4">
              This permanently removes all counties, townships, contacts, and audit-log entries
              under this region. There is no undo.
            </p>
            <label className="block mb-4">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Type the region name to confirm: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{regionName}</span>
              </span>
              <input
                type="text"
                autoFocus
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-base text-gray-900"
              />
            </label>
            <div className="flex justify-end gap-2 flex-wrap">
              <button
                onClick={() => setShowModal(false)}
                disabled={busy}
                className="text-sm font-medium text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={busy || confirmText !== regionName}
                className="text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? "Deleting…" : "Yes, delete this region"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
