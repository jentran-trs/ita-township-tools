"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useOrganization, useAuth } from "@clerk/nextjs";
import { ArrowLeft, Loader2, Upload, Download, RefreshCw, Bell, Settings, Save, Lock, LogOut, Mail, ListChecks, Search, X, Map } from "lucide-react";
import AdminManageTownshipsModal from "@/components/AdminManageTownshipsModal";

type CountyStat = {
  id: string;
  name: string;
  slug: string;
  township_total: number;
  township_completed: number;
  contact_total: number;
  contact_reviewed: number;
  new_since_last_view: number;
  new_since_deadline: number;
};

type RegionStat = {
  id: string;
  name: string;
  slug: string;
  township_total: number;
  township_completed: number;
  contact_total: number;
  contact_reviewed: number;
  new_since_last_view: number;
  new_since_deadline: number;
  counties: CountyStat[];
};

type Settings = {
  verification_deadline: string | null;
  digest_enabled: boolean;
  digest_recipient_email: string | null;
  digest_last_sent_at: string | null;
};

function pct(num: number, den: number) {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

export default function ContactVerificationAdminPage() {
  const router = useRouter();
  const { isLoaded } = useUser();
  const { membership } = useOrganization();
  const { orgRole } = useAuth();
  const isAdmin = membership?.role === "org:admin" || orgRole === "org:admin";

  const [regions, setRegions] = useState<RegionStat[]>([]);
  const [lastViewedAt, setLastViewedAt] = useState<string | null>(null);
  const [verificationDeadline, setVerificationDeadline] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [searchTree, setSearchTree] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [contactResults, setContactResults] = useState<any[]>([]);
  const [manageOpen, setManageOpen] = useState(false);

  const reloadTree = useCallback(() => {
    fetch("/api/verify/locations")
      .then((r) => r.json())
      .then((d) => setSearchTree(d.regions || []))
      .catch(() => {});
  }, []);

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
      })
      .catch(() => setAuthChecked(true));
    fetch("/api/verify/locations")
      .then((r) => r.json())
      .then((d) => setSearchTree(d.regions || []))
      .catch(() => {});
  }, [isAdmin]);

  // Debounced contact search
  useEffect(() => {
    if (!authorized) return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setContactResults([]);
      return;
    }
    const handle = setTimeout(() => {
      fetch(`/api/admin/contact-verification/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setContactResults(d.contacts || []))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(handle);
  }, [searchQuery, authorized]);

  const logoutSuperadmin = async () => {
    await fetch("/api/admin/contact-verification/auth", { method: "DELETE" });
    setAuthorized(false);
  };

  const load = useCallback(async () => {
    try {
      const [statsRes, settingsRes] = await Promise.all([
        fetch("/api/admin/contact-verification/stats"),
        fetch("/api/admin/contact-verification/settings"),
      ]);
      const stats = await statsRes.json();
      const setj = await settingsRes.json();
      if (statsRes.ok) {
        setRegions(stats.regions || []);
        setLastViewedAt(stats.last_viewed_at || null);
        setVerificationDeadline(stats.verification_deadline || null);
      }
      if (settingsRes.ok) {
        setSettings(setj.settings || null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin || !authorized) return;
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [isAdmin, authorized, load]);

  const manualRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
      setLastRefreshedAt(Date.now());
      setJustRefreshed(true);
      setTimeout(() => setJustRefreshed(false), 2000);
    } finally {
      setRefreshing(false);
    }
  };

  const totalNewSinceLastView = regions.reduce((s, r) => s + (r.new_since_last_view || 0), 0);
  const totalNewSinceDeadline = regions.reduce((s, r) => s + (r.new_since_deadline || 0), 0);

  // Search across counties + townships
  const searchResults = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [] as any[];
    const out: any[] = [];
    for (const r of searchTree) {
      for (const c of r.counties || []) {
        if (c.name.toLowerCase().includes(q)) {
          out.push({
            type: "county",
            id: c.id,
            label: `${c.name} County`,
            sub: r.name,
          });
        }
        for (const t of c.townships || []) {
          if (t.name.toLowerCase().includes(q)) {
            out.push({
              type: "township",
              id: t.id,
              label: t.name,
              sub: `${c.name} County · ${r.name}`,
            });
          }
        }
      }
    }
    return out.slice(0, 15);
  })();

  const markAllViewed = async () => {
    await fetch("/api/admin/contact-verification/mark-viewed", { method: "POST" });
    load();
  };

  const saveSettings = async (next: Partial<Settings>) => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/contact-verification/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setSettings(json.settings);
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSavingSettings(false);
    }
  };

  if (!isLoaded || !isAdmin || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!authorized) {
    return <PasswordGate onUnlocked={() => setAuthorized(true)} onCancel={() => router.push("/dashboard")} />;
  }

  if (loading) {
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
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md px-4 py-2.5 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 shadow-sm mb-6"
        >
          <ArrowLeft className="w-5 h-5" /> Back to dashboard
        </button>

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Contact verification</h1>
            <p className="text-sm text-gray-600 mt-1">
              Real-time completion across regions, counties, and townships.
              {verificationDeadline && (
                <>
                  {" · "}
                  Deadline: <span className="font-medium">{new Date(verificationDeadline + "T00:00:00").toLocaleDateString()}</span>
                </>
              )}
              {lastRefreshedAt && (
                <>
                  {" · "}
                  <span className="text-gray-500">
                    Last refreshed {new Date(lastRefreshedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSettingsOpen((v) => !v)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Settings className="w-4 h-4" /> Settings
            </button>
            <button
              onClick={manualRefresh}
              disabled={refreshing}
              className={`flex items-center gap-2 text-sm font-medium px-3 py-2 border rounded-md transition-colors ${
                justRefreshed
                  ? "text-emerald-700 bg-emerald-50 border-emerald-300"
                  : "text-gray-700 border-gray-300 hover:bg-gray-50"
              } disabled:opacity-70`}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing…" : justRefreshed ? "Refreshed" : "Refresh"}
            </button>
            <button
              onClick={() => router.push("/admin/contact-verification/recent-changes")}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <ListChecks className="w-4 h-4" /> Recent changes
            </button>
            <button
              onClick={() => router.push("/admin/contact-verification/amo-ids")}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Upload className="w-4 h-4" /> Assign AMO IDs
            </button>
            <button
              onClick={() => {
                reloadTree();
                setManageOpen(true);
              }}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Map className="w-4 h-4" /> Manage townships
            </button>
            <button
              onClick={() => router.push("/admin/contact-verification/import")}
              className="flex items-center gap-2 text-sm px-3 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
            >
              <Upload className="w-4 h-4" /> Import xlsx
            </button>
            <button
              onClick={logoutSuperadmin}
              title="Lock superadmin"
              className="flex items-center gap-2 text-sm font-medium text-gray-600 px-2 py-2 hover:text-gray-900"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {settingsOpen && settings && (
          <SettingsPanel
            settings={settings}
            saving={savingSettings}
            onSave={saveSettings}
            onClose={() => setSettingsOpen(false)}
          />
        )}

        {(totalNewSinceLastView > 0 || totalNewSinceDeadline > 0) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-blue-900">
              <Bell className="w-5 h-5" />
              <div className="text-sm">
                {totalNewSinceLastView > 0 && (
                  <span>
                    <strong>{totalNewSinceLastView}</strong> change
                    {totalNewSinceLastView === 1 ? "" : "s"} since you last visited
                    {lastViewedAt ? ` (${new Date(lastViewedAt).toLocaleString()})` : ""}.
                  </span>
                )}
                {totalNewSinceDeadline > 0 && (
                  <span className="ml-2">
                    {totalNewSinceLastView > 0 && " · "}
                    <strong>{totalNewSinceDeadline}</strong> since deadline.
                  </span>
                )}
              </div>
            </div>
            {totalNewSinceLastView > 0 && (
              <button
                onClick={markAllViewed}
                className="text-sm font-medium text-blue-900 hover:text-blue-700 underline"
              >
                Mark all as seen
              </button>
            )}
          </div>
        )}

        {/* Search bar (counties + townships) */}
        {searchTree.length > 0 && (
          <div className="relative mb-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by county, township, contact name, or email…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                className="w-full border border-gray-300 rounded-md pl-10 pr-9 py-2.5 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchOpen(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  aria-label="Clear"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {searchOpen && searchQuery.trim().length >= 2 && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
                {searchResults.length === 0 && contactResults.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    No matches for &ldquo;{searchQuery}&rdquo;.
                  </div>
                ) : (
                  <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                    {searchResults.map((r) => (
                      <li key={`${r.type}-${r.id}`}>
                        <button
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery("");
                            router.push(`/admin/contact-verification/${r.type}/${r.id}`);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900">{r.label}</div>
                            <div className="text-xs text-gray-500">{r.sub}</div>
                          </div>
                          <span
                            className={`text-xs font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                              r.type === "township"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {r.type}
                          </span>
                        </button>
                      </li>
                    ))}
                    {contactResults.map((c: any) => {
                      const name =
                        [c.first_name, c.last_name].filter(Boolean).join(" ") || "(no name)";
                      return (
                        <li key={`contact-${c.id}`}>
                          <button
                            onClick={() => {
                              setSearchOpen(false);
                              setSearchQuery("");
                              router.push(
                                `/verify-contacts/${c.region_slug}/${c.county_slug}/${c.township_slug}?from=admin&scope=township&id=${c.township_id}`
                              );
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900">{name}</div>
                              <div className="text-xs text-gray-500 truncate">
                                {c.email || <span className="italic">no email</span>}
                                {c.title ? ` · ${c.title}` : ""}
                              </div>
                              <div className="text-xs text-gray-400 truncate">
                                {c.township_name}
                                {c.county_name ? `, ${c.county_name} County` : ""}
                              </div>
                            </div>
                            <span className="text-xs font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 flex-shrink-0">
                              contact
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {regions.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
            <p className="text-gray-600 mb-4">No data yet. Import a region xlsx to get started.</p>
            <button
              onClick={() => router.push("/admin/contact-verification/import")}
              className="inline-flex items-center gap-2 text-sm px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
            >
              <Upload className="w-4 h-4" /> Import a region
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {regions.map((r) => {
              const isOpen = expandedRegion === r.id;
              return (
                <div key={r.id} className="bg-white border border-gray-200 rounded-lg">
                  <div
                    className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedRegion(isOpen ? null : r.id)}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{r.name}</span>
                        {r.new_since_last_view > 0 && (
                          <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            {r.new_since_last_view} new
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-0.5">
                        {r.township_completed}/{r.township_total} townships completed ·{" "}
                        {r.contact_reviewed}/{r.contact_total} contacts reviewed
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap justify-end">
                      <ProgressBar percent={pct(r.township_completed, r.township_total)} />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/contact-verification/region/${r.id}`);
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-gray-700 px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Open region
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/api/admin/contact-verification/export?scope=region&id=${r.id}&format=xlsx`;
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-gray-700 px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        <Download className="w-3 h-3" /> Export
                      </button>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="border-t border-gray-200 divide-y divide-gray-100">
                      {r.counties.map((c) => (
                        <div
                          key={c.id}
                          className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                          onClick={() => router.push(`/admin/contact-verification/county/${c.id}`)}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{c.name} County</span>
                              {c.new_since_last_view > 0 && (
                                <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                  {c.new_since_last_view} new
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              {c.township_completed}/{c.township_total} townships ·{" "}
                              {c.contact_reviewed}/{c.contact_total} contacts
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <ProgressBar percent={pct(c.township_completed, c.township_total)} small />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/api/admin/contact-verification/export?scope=county&id=${c.id}&format=xlsx`;
                              }}
                              className="flex items-center gap-1 text-xs font-medium text-gray-700 px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                              <Download className="w-3 h-3" /> Export
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AdminManageTownshipsModal
        open={manageOpen}
        tree={searchTree}
        onClose={() => setManageOpen(false)}
        onChanged={() => {
          reloadTree();
          load();
        }}
      />
    </div>
  );
}

function SettingsPanel({
  settings,
  saving,
  onSave,
  onClose,
}: {
  settings: Settings;
  saving: boolean;
  onSave: (next: Partial<Settings>) => void;
  onClose: () => void;
}) {
  const [deadline, setDeadline] = useState(settings.verification_deadline || "");
  const [digestEnabled, setDigestEnabled] = useState(!!settings.digest_enabled);
  const [digestEmail, setDigestEmail] = useState(settings.digest_recipient_email || "");

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 mb-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Settings</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Verification deadline and weekly summary email.
          </p>
        </div>
        <button onClick={onClose} className="text-xs text-gray-500 underline">Close</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Verification deadline</span>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
          />
          <span className="block text-xs text-gray-500 mt-1">
            After this date, banner messaging changes. Leave blank to disable.
          </span>
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Weekly summary email</span>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={digestEnabled}
              onChange={(e) => setDigestEnabled(e.target.checked)}
              id="digest_enabled"
            />
            <label htmlFor="digest_enabled" className="text-sm text-gray-700">
              Send weekly summary every Monday morning
            </label>
          </div>
          <input
            type="email"
            value={digestEmail}
            onChange={(e) => setDigestEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
          />
          {settings.digest_last_sent_at && (
            <span className="block text-xs text-gray-500 mt-1">
              Last sent: {new Date(settings.digest_last_sent_at).toLocaleString()}
            </span>
          )}
        </label>
      </div>

      <div className="flex items-center justify-between gap-2 mt-5 flex-wrap">
        <button
          onClick={async () => {
            try {
              const res = await fetch("/api/admin/contact-verification/digest/test", { method: "POST" });
              const json = await res.json();
              if (!res.ok) throw new Error(json.error || "Failed");
              if (json.skipped) alert(`Test digest skipped: ${json.skipped}`);
              else alert(`Test digest sent to ${json.sent} (${json.changes} change${json.changes === 1 ? "" : "s"}).`);
            } catch (e: any) {
              alert(e.message);
            }
          }}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <Mail className="w-4 h-4" /> Send test now
        </button>
        <button
          onClick={() =>
            onSave({
              verification_deadline: deadline || null,
              digest_enabled: digestEnabled,
              digest_recipient_email: digestEmail || null,
            })
          }
          disabled={saving}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> Save settings
        </button>
      </div>
    </div>
  );
}

function PasswordGate({ onUnlocked, onCancel }: { onUnlocked: () => void; onCancel: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/contact-verification/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Wrong password");
      onUnlocked();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-5 h-5 text-gray-700" />
          <h1 className="text-lg font-semibold text-gray-900">Restricted area</h1>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Enter the superadmin password to access contact-verification administration.
        </p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-base text-gray-900 mb-2"
        />
        {error && <p className="text-sm text-red-700 mb-2">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !password}
            className="text-sm font-medium px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {busy ? "Checking…" : "Unlock"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProgressBar({ percent, small }: { percent: number; small?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${small ? "w-32" : "w-48"}`}>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="text-xs text-gray-600 w-10 text-right">{percent}%</div>
    </div>
  );
}
