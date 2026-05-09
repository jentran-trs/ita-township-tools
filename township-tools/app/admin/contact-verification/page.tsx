"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useOrganization, useAuth } from "@clerk/nextjs";
import { ArrowLeft, Loader2, Upload, Download, RefreshCw, Bell, Settings, Save, Lock, LogOut } from "lucide-react";

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
  const [refreshTick, setRefreshTick] = useState(0);
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);

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
  }, [isAdmin]);

  const logoutSuperadmin = async () => {
    await fetch("/api/admin/contact-verification/auth", { method: "DELETE" });
    setAuthorized(false);
  };

  useEffect(() => {
    if (!isAdmin || !authorized) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [statsRes, settingsRes] = await Promise.all([
          fetch("/api/admin/contact-verification/stats"),
          fetch("/api/admin/contact-verification/settings"),
        ]);
        const stats = await statsRes.json();
        const setj = await settingsRes.json();
        if (cancelled) return;
        if (statsRes.ok) {
          setRegions(stats.regions || []);
          setLastViewedAt(stats.last_viewed_at || null);
          setVerificationDeadline(stats.verification_deadline || null);
        }
        if (settingsRes.ok) {
          setSettings(setj.settings || null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isAdmin, authorized, refreshTick]);

  const totalNewSinceLastView = regions.reduce((s, r) => s + (r.new_since_last_view || 0), 0);
  const totalNewSinceDeadline = regions.reduce((s, r) => s + (r.new_since_deadline || 0), 0);

  const markAllViewed = async () => {
    await fetch("/api/admin/contact-verification/mark-viewed", { method: "POST" });
    setRefreshTick((t) => t + 1);
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
      setRefreshTick((t) => t + 1);
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
              onClick={() => setRefreshTick((t) => t + 1)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
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

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 mb-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Settings</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Sets the verification deadline used for the post-deadline banner and the activity filter.
          </p>
        </div>
        <button onClick={onClose} className="text-xs text-gray-500 underline">Close</button>
      </div>

      <label className="block max-w-md">
        <span className="block text-sm font-medium text-gray-700 mb-1">Verification deadline</span>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
        />
        <span className="block text-xs text-gray-500 mt-1">
          After this date, the public page shows a soft &ldquo;verification ended, edits welcome
          anytime&rdquo; banner. Leave blank to disable.
        </span>
      </label>

      <div className="flex items-center justify-end gap-2 mt-4">
        <button
          onClick={() => onSave({ verification_deadline: deadline || null })}
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
