"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser, useOrganization, useAuth } from "@clerk/nextjs";
import { ArrowLeft, Loader2, Download, RotateCcw, CheckCircle2, ExternalLink, Filter, MoveRight, X, Pencil, Send, Search, Mail, ChevronRight, ChevronDown } from "lucide-react";
import AdminContactEditModal from "../../../../../components/AdminContactEditModal";
import AmoExportModal, { AmoMode } from "../../../../../components/AmoExportModal";

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
  amo_organization_id?: string | null;
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
  amo_individual_id: string | null;
  amo_updated_at: string | null;
  amo_updated_by: string | null;
  mailchimp_updated_at: string | null;
  mailchimp_updated_by: string | null;
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
  // Township chips are collapsed by default — the list can be long.
  const [townshipFilterOpen, setTownshipFilterOpen] = useState(false);
  const [emailStatusFilters, setEmailStatusFilters] = useState<Set<string>>(new Set());
  const [amoFilter, setAmoFilter] = useState<"all" | "synced" | "unsynced">("all");
  const [mailchimpFilter, setMailchimpFilter] = useState<"all" | "synced" | "unsynced">("all");
  const [contactQuery, setContactQuery] = useState("");
  const [markingAmo, setMarkingAmo] = useState(false);
  const [markingMailchimp, setMarkingMailchimp] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  // Holds the export to run once the superadmin picks an AMO mode in the modal.
  const [pendingExport, setPendingExport] = useState<null | ((mode: AmoMode) => void)>(null);
  const [detailed, setDetailed] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTree, setMoveTree] = useState<any[]>([]);
  const [moveRegionId, setMoveRegionId] = useState("");
  const [moveCountyId, setMoveCountyId] = useState("");
  const [moveTownshipId, setMoveTownshipId] = useState("");
  const [moving, setMoving] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

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

  const emailStatusKey = (raw: string | null) =>
    (raw || "").toLowerCase().trim() || "__none__";

  const filteredContacts = useMemo(() => {
    const q = contactQuery.trim().toLowerCase();
    return contacts.filter((c) => {
      if (statusFilters.size > 0 && !statusFilters.has(c.review_status)) return false;
      if (townshipFilters.size > 0 && !townshipFilters.has(c.township_id)) return false;
      if (emailStatusFilters.size > 0 && !emailStatusFilters.has(emailStatusKey(c.email_status)))
        return false;
      if (amoFilter === "synced" && !c.amo_updated_at) return false;
      if (amoFilter === "unsynced" && c.amo_updated_at) return false;
      if (mailchimpFilter === "synced" && !c.mailchimp_updated_at) return false;
      if (mailchimpFilter === "unsynced" && c.mailchimp_updated_at) return false;
      if (q) {
        const hay = [
          c.first_name,
          c.last_name,
          c.title,
          c.email,
          c.phone,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [contacts, statusFilters, townshipFilters, emailStatusFilters, amoFilter, mailchimpFilter, contactQuery]);

  const amoCounts = useMemo(() => {
    let synced = 0;
    let unsynced = 0;
    for (const c of contacts) {
      if (c.amo_updated_at) synced += 1;
      else unsynced += 1;
    }
    return { synced, unsynced };
  }, [contacts]);

  const mailchimpCounts = useMemo(() => {
    let synced = 0;
    let unsynced = 0;
    for (const c of contacts) {
      if (c.mailchimp_updated_at) synced += 1;
      else unsynced += 1;
    }
    return { synced, unsynced };
  }, [contacts]);

  const emailStatusOptions = useMemo(() => {
    const seen = new Map<string, { key: string; display: string; count: number }>();
    for (const c of contacts) {
      const key = emailStatusKey(c.email_status);
      const display = (c.email_status || "").trim() || "(no status)";
      const existing = seen.get(key);
      if (existing) existing.count += 1;
      else seen.set(key, { key, display, count: 1 });
    }
    return Array.from(seen.values()).sort((a, b) => {
      // Push "(no status)" to the end; otherwise alpha
      if (a.key === "__none__") return 1;
      if (b.key === "__none__") return -1;
      return a.display.localeCompare(b.display);
    });
  }, [contacts]);

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of contacts) map[c.review_status] = (map[c.review_status] || 0) + 1;
    return map;
  }, [contacts]);

  const townshipOptions = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; county: string; count: number }>();
    for (const c of contacts) {
      if (!c.township_id) continue;
      const existing = seen.get(c.township_id);
      if (existing) existing.count += 1;
      else
        seen.set(c.township_id, {
          id: c.township_id,
          name: c.township_name,
          county: c.county_name,
          count: 1,
        });
    }
    // Alphabetical by township name, with county as the tiebreaker so same-named
    // townships from different counties stay grouped together.
    return Array.from(seen.values()).sort(
      (a, b) => a.name.localeCompare(b.name) || a.county.localeCompare(b.county)
    );
  }, [contacts]);

  // Townships in the region/county table, sorted alphabetically — by county
  // first (matching the "County · Township" display), then township name.
  const sortedStats = useMemo(
    () =>
      [...stats].sort(
        (a, b) =>
          (a.county_name || "").localeCompare(b.county_name || "") ||
          (a.township_name || "").localeCompare(b.township_name || "")
      ),
    [stats]
  );

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
  const toggleEmailStatus = (key: string) => {
    const next = new Set(emailStatusFilters);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setEmailStatusFilters(next);
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

  const markAmoSynced = async (synced: boolean) => {
    if (selected.size === 0) return;
    const verb = synced ? "mark synced to AMO" : "clear the AMO sync flag for";
    if (!confirm(`Are you sure you want to ${verb} ${selected.size} contact${selected.size === 1 ? "" : "s"}?`)) return;
    setMarkingAmo(true);
    try {
      const res = await fetch("/api/admin/contact-verification/contacts/mark-amo-synced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: Array.from(selected), synced }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setMarkingAmo(false);
    }
  };

  const selectedAmoState = useMemo(() => {
    if (selected.size === 0) return { syncedCount: 0, unsyncedCount: 0 };
    let syncedCount = 0;
    let unsyncedCount = 0;
    for (const c of contacts) {
      if (!selected.has(c.id)) continue;
      if (c.amo_updated_at) syncedCount += 1;
      else unsyncedCount += 1;
    }
    return { syncedCount, unsyncedCount };
  }, [contacts, selected]);

  const markMailchimpSynced = async (synced: boolean) => {
    if (selected.size === 0) return;
    const verb = synced ? "mark synced to MailChimp" : "clear the MailChimp sync flag for";
    if (!confirm(`Are you sure you want to ${verb} ${selected.size} contact${selected.size === 1 ? "" : "s"}?`)) return;
    setMarkingMailchimp(true);
    try {
      const res = await fetch("/api/admin/contact-verification/contacts/mark-mailchimp-synced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: Array.from(selected), synced }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setMarkingMailchimp(false);
    }
  };

  const selectedMailchimpState = useMemo(() => {
    if (selected.size === 0) return { syncedCount: 0, unsyncedCount: 0 };
    let syncedCount = 0;
    let unsyncedCount = 0;
    for (const c of contacts) {
      if (!selected.has(c.id)) continue;
      if (c.mailchimp_updated_at) syncedCount += 1;
      else unsyncedCount += 1;
    }
    return { syncedCount, unsyncedCount };
  }, [contacts, selected]);

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

  // Open the AMO-mode chooser, then run `run(mode)` with the picked mode.
  const askExport = (run: (mode: AmoMode) => void) => {
    setPendingExport(() => (mode: AmoMode) => {
      setPendingExport(null);
      run(mode);
    });
  };

  // GET-style exports (whole scope / single township) navigate the browser.
  const exportUrl = (params: string) => (mode: AmoMode) => {
    window.location.href = `/api/admin/contact-verification/export?${params}&amoMode=${mode}`;
  };

  const exportSelected = async (format: "xlsx" | "csv", amoMode: AmoMode) => {
    if (selected.size === 0) return;
    const variant = detailed ? "detailed" : "simple";
    setExporting(true);
    try {
      const res = await fetch(
        `/api/admin/contact-verification/export?format=${format}&variant=${variant}&amoMode=${amoMode}`,
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
                askExport(
                  exportUrl(`scope=${scope}&id=${id}&format=xlsx&variant=${detailed ? "detailed" : "simple"}`)
                )
              }
              className="flex items-center gap-2 text-sm px-3 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
            >
              <Download className="w-4 h-4" /> xlsx
            </button>
            <button
              onClick={() =>
                askExport(
                  exportUrl(`scope=${scope}&id=${id}&format=csv&variant=${detailed ? "detailed" : "simple"}`)
                )
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
                {scope !== "township" && <th className="px-4 py-2 font-medium">Org AMO ID</th>}
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right">Reviewed</th>
                <th className="px-4 py-2 font-medium text-right">Total</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedStats.map((s) => (
                <tr key={s.township_id}>
                  {scope !== "township" && (
                    <td className="px-4 py-2 text-gray-900">
                      {scope === "region" ? `${s.county_name} County, ` : ""}
                      {s.township_name}
                    </td>
                  )}
                  {scope !== "township" && (
                    <td className="px-4 py-2 font-mono text-xs text-gray-700">
                      {s.amo_organization_id || <span className="text-gray-400">—</span>}
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
                      <button
                        onClick={() =>
                          askExport(
                            exportUrl(`scope=township&id=${s.township_id}&format=xlsx&variant=${detailed ? "detailed" : "simple"}`)
                          )
                        }
                        className="flex items-center gap-1 text-xs font-medium text-gray-700 px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        <Download className="w-3 h-3" /> Export
                      </button>
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
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 mb-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, title, email, or phone…"
              value={contactQuery}
              onChange={(e) => setContactQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-md pl-10 pr-9 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            {contactQuery && (
              <button
                onClick={() => setContactQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {townshipOptions.length > 1 && (
            <div className="flex items-start gap-2 flex-wrap">
              <button
                onClick={() => setTownshipFilterOpen((o) => !o)}
                className="flex items-center gap-1 text-xs font-medium text-gray-600 mt-1 hover:text-gray-900"
              >
                {townshipFilterOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <Filter className="w-3 h-3" /> Townships{" "}
                <span className="opacity-70">({townshipOptions.length})</span>
                {townshipFilters.size > 0 && (
                  <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full bg-gray-900 text-white text-[10px]">
                    {townshipFilters.size} selected
                  </span>
                )}
              </button>
              {townshipFilterOpen &&
                townshipOptions.map((t) => {
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
                      {t.name} · {t.county} County{" "}
                      <span className="opacity-70">({t.count})</span>
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

          <div className="flex items-start gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs font-medium text-gray-600 mt-1">
              <Filter className="w-3 h-3" /> AMO sync:
            </span>
            {(["all", "synced", "unsynced"] as const).map((opt) => {
              const active = amoFilter === opt;
              const label =
                opt === "all"
                  ? `All (${contacts.length})`
                  : opt === "synced"
                  ? `Synced to AMO (${amoCounts.synced})`
                  : `Not synced (${amoCounts.unsynced})`;
              return (
                <button
                  key={opt}
                  onClick={() => setAmoFilter(opt)}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    active
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex items-start gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs font-medium text-gray-600 mt-1">
              <Filter className="w-3 h-3" /> MailChimp sync:
            </span>
            {(["all", "synced", "unsynced"] as const).map((opt) => {
              const active = mailchimpFilter === opt;
              const label =
                opt === "all"
                  ? `All (${contacts.length})`
                  : opt === "synced"
                  ? `Synced to MailChimp (${mailchimpCounts.synced})`
                  : `Not synced (${mailchimpCounts.unsynced})`;
              return (
                <button
                  key={opt}
                  onClick={() => setMailchimpFilter(opt)}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    active
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {emailStatusOptions.length > 0 && (
            <div className="flex items-start gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-xs font-medium text-gray-600 mt-1">
                <Filter className="w-3 h-3" /> Email status:
              </span>
              {emailStatusOptions.map((opt) => {
                const active = emailStatusFilters.has(opt.key);
                return (
                  <button
                    key={opt.key}
                    onClick={() => toggleEmailStatus(opt.key)}
                    className={`text-xs px-2.5 py-1 rounded-full border ${
                      active
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {opt.display} <span className="opacity-70">({opt.count})</span>
                  </button>
                );
              })}
              {emailStatusFilters.size > 0 && (
                <button
                  onClick={() => setEmailStatusFilters(new Set())}
                  className="text-xs text-gray-500 underline ml-1 mt-1"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          <div className="text-xs text-gray-500">
            Showing <strong>{filteredContacts.length}</strong> of {contacts.length} contact{contacts.length === 1 ? "" : "s"}.
            {(townshipFilters.size > 0 ||
              statusFilters.size > 0 ||
              emailStatusFilters.size > 0 ||
              amoFilter !== "all" ||
              mailchimpFilter !== "all" ||
              contactQuery.trim().length > 0) && (
              <button
                onClick={() => {
                  setTownshipFilters(new Set());
                  setStatusFilters(new Set());
                  setEmailStatusFilters(new Set());
                  setAmoFilter("all");
                  setMailchimpFilter("all");
                  setContactQuery("");
                }}
                className="ml-2 text-gray-700 underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {selected.size > 0 && (
          <div className="sticky top-2 z-10 mb-3 flex items-center gap-2 flex-wrap bg-white border border-gray-300 rounded-lg shadow-sm px-3 py-2">
            <span className="text-sm text-gray-700 font-medium">{selected.size} selected</span>
            <button
              onClick={() => askExport((mode) => exportSelected("xlsx", mode))}
              disabled={exporting}
              className="flex items-center gap-1 text-sm font-medium text-white bg-gray-900 px-3 py-1.5 rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> Export selected (xlsx)
            </button>
            <button
              onClick={() => askExport((mode) => exportSelected("csv", mode))}
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
            {selectedAmoState.unsyncedCount > 0 && (
              <button
                onClick={() => markAmoSynced(true)}
                disabled={markingAmo}
                title="Stamp selected contacts as pushed to AMO. Any future edit clears the stamp."
                className="flex items-center gap-1 text-sm font-medium text-emerald-700 border border-emerald-300 bg-emerald-50 px-3 py-1.5 rounded-md hover:bg-emerald-100 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                Mark {selectedAmoState.unsyncedCount} synced to AMO
              </button>
            )}
            {selectedAmoState.syncedCount > 0 && (
              <button
                onClick={() => markAmoSynced(false)}
                disabled={markingAmo}
                title="Clear the AMO sync stamp on selected contacts."
                className="flex items-center gap-1 text-sm font-medium text-gray-700 border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Unmark {selectedAmoState.syncedCount} from AMO
              </button>
            )}
            {selectedMailchimpState.unsyncedCount > 0 && (
              <button
                onClick={() => markMailchimpSynced(true)}
                disabled={markingMailchimp}
                title="Stamp selected contacts as pushed to MailChimp. Any future edit clears the stamp."
                className="flex items-center gap-1 text-sm font-medium text-amber-700 border border-amber-300 bg-amber-50 px-3 py-1.5 rounded-md hover:bg-amber-100 disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5" />
                Mark {selectedMailchimpState.unsyncedCount} synced to MailChimp
              </button>
            )}
            {selectedMailchimpState.syncedCount > 0 && (
              <button
                onClick={() => markMailchimpSynced(false)}
                disabled={markingMailchimp}
                title="Clear the MailChimp sync stamp on selected contacts."
                className="flex items-center gap-1 text-sm font-medium text-gray-700 border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Unmark {selectedMailchimpState.syncedCount} from MailChimp
              </button>
            )}
            <button
              onClick={() => setSelected(new Set())}
              className="ml-auto text-xs text-gray-500 underline"
            >
              Clear
            </button>
          </div>
        )}

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
                  <th className="px-3 py-2 font-medium">AMO ID</th>
                  {scope !== "township" && <th className="px-3 py-2 font-medium">Township</th>}
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium w-12"></th>
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
                        <div className="break-all flex items-center gap-2 flex-wrap">
                          <span>{c.email || <span className="text-gray-400">no email</span>}</span>
                          {c.email && c.email_status && <EmailStatusPill status={c.email_status} />}
                        </div>
                        {c.phone && <div className="text-xs text-gray-500">{c.phone}</div>}
                        {c.previous_email && (
                          <div className="text-xs text-amber-700 mt-0.5">
                            Was: {c.previous_email}
                            {c.previous_email_status ? ` (${c.previous_email_status})` : ""}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-700">
                        {c.amo_individual_id || <span className="text-gray-400">—</span>}
                      </td>
                      {scope !== "township" && (
                        <td className="px-3 py-2 text-gray-700 text-xs">
                          {c.township_name}
                          <div className="text-gray-400">{c.county_name} County</div>
                        </td>
                      )}
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1 items-start">
                          <ContactStatusBadge status={c.review_status} />
                          {c.amo_updated_at && (
                            <AmoSyncedPill at={c.amo_updated_at} by={c.amo_updated_by} />
                          )}
                          {c.mailchimp_updated_at && (
                            <MailchimpSyncedPill at={c.mailchimp_updated_at} by={c.mailchimp_updated_by} />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => setEditingContact(c)}
                          title="Admin edit"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-200"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
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

      <AdminContactEditModal
        contact={editingContact}
        onClose={() => setEditingContact(null)}
        onSaved={load}
      />

      <AmoExportModal
        open={pendingExport !== null}
        onCancel={() => setPendingExport(null)}
        onChoose={(mode) => pendingExport?.(mode)}
      />
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

function AmoSyncedPill({ at, by }: { at: string; by: string | null }) {
  const d = new Date(at);
  const dateLabel = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const title = by ? `Marked synced to AMO on ${d.toLocaleString()} by ${by}` : `Marked synced to AMO on ${d.toLocaleString()}`;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap bg-emerald-50 text-emerald-800 border-emerald-300"
      title={title}
    >
      <Send className="w-3 h-3" /> AMO · {dateLabel}
    </span>
  );
}

function MailchimpSyncedPill({ at, by }: { at: string; by: string | null }) {
  const d = new Date(at);
  const dateLabel = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const title = by ? `Marked synced to MailChimp on ${d.toLocaleString()} by ${by}` : `Marked synced to MailChimp on ${d.toLocaleString()}`;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap bg-amber-50 text-amber-800 border-amber-300"
      title={title}
    >
      <Mail className="w-3 h-3" /> MailChimp · {dateLabel}
    </span>
  );
}

function EmailStatusPill({ status }: { status: string | null }) {
  if (!status) return null;
  const norm = status.toLowerCase().trim();
  let cls = "bg-red-100 text-red-800 border-red-300";
  let label: string = status;
  let title = `Email status: ${status}`;
  if (norm === "valid") {
    cls = "bg-emerald-100 text-emerald-800 border-emerald-300";
    label = "Valid";
  } else if (norm === "updated") {
    cls = "bg-blue-100 text-blue-800 border-blue-300";
    label = "Updated";
    title = "Email was updated by a reviewer — needs reverification";
  }
  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${cls}`}
      title={title}
    >
      {label}
    </span>
  );
}
