"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Save, Plus, Pencil, ArrowRight, Loader2 } from "lucide-react";

// Superadmin-only modal for managing the township directory:
// - rename a township
// - reparent a township to a different county/region
// - create a new township under any county/region
//
// The parent passes the cv_regions tree (same shape as /api/verify/locations)
// and an onChanged callback to refresh that tree after a successful mutation.
export default function AdminManageTownshipsModal({ open, tree, onClose, onChanged }) {
  const [mode, setMode] = useState("edit"); // "edit" | "create"

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Manage townships</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              Rename, reassign, or add townships in the directory.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-sm">
            <button
              onClick={() => setMode("edit")}
              className={`flex items-center gap-1.5 px-3 py-1.5 ${
                mode === "edit"
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Pencil className="w-3.5 h-3.5" /> Edit existing
            </button>
            <button
              onClick={() => setMode("create")}
              className={`flex items-center gap-1.5 px-3 py-1.5 border-l border-gray-300 ${
                mode === "create"
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Create new
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {mode === "edit" ? (
            <EditPanel tree={tree} onChanged={onChanged} onClose={onClose} />
          ) : (
            <CreatePanel tree={tree} onChanged={onChanged} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}

function RegionCountyPicker({ tree, regionId, setRegionId, countyId, setCountyId }) {
  const region = tree.find((r) => r.id === regionId);
  return (
    <>
      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">Region</span>
        <select
          value={regionId}
          onChange={(e) => {
            setRegionId(e.target.value);
            setCountyId("");
          }}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900"
        >
          <option value="">Select a region</option>
          {tree.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">County</span>
        <select
          value={countyId}
          onChange={(e) => setCountyId(e.target.value)}
          disabled={!region}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
        >
          <option value="">{region ? "Select a county" : "Pick a region first"}</option>
          {(region?.counties || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

function EditPanel({ tree, onChanged, onClose }) {
  // Source pickers — find the township to edit
  const [srcRegionId, setSrcRegionId] = useState("");
  const [srcCountyId, setSrcCountyId] = useState("");
  const [srcTownshipId, setSrcTownshipId] = useState("");

  // Destination
  const [name, setName] = useState("");
  const [destRegionId, setDestRegionId] = useState("");
  const [destCountyId, setDestCountyId] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const srcRegion = tree.find((r) => r.id === srcRegionId);
  const srcCounty = srcRegion?.counties?.find((c) => c.id === srcCountyId);
  const srcTownship = srcCounty?.townships?.find((t) => t.id === srcTownshipId);

  // When the user picks a township, prefill the destination/name with its current
  // values so editing one field at a time feels natural.
  useEffect(() => {
    if (!srcTownship) return;
    setName(srcTownship.name || "");
    setDestRegionId(srcRegionId);
    setDestCountyId(srcCountyId);
    setError(null);
    setSuccess(null);
  }, [srcTownshipId]); // eslint-disable-line react-hooks/exhaustive-deps

  const destRegion = tree.find((r) => r.id === destRegionId);
  const destCounty = destRegion?.counties?.find((c) => c.id === destCountyId);

  const dirty =
    !!srcTownship &&
    !!destCountyId &&
    (name.trim() !== (srcTownship.name || "") || destCountyId !== srcCountyId);

  const submit = async () => {
    if (!srcTownship || !destCountyId || !dirty) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const body = {};
      if (name.trim() !== (srcTownship.name || "")) body.name = name.trim();
      if (destCountyId !== srcCountyId) body.county_id = destCountyId;
      const res = await fetch(`/api/admin/contact-verification/township/${srcTownship.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      setSuccess(
        `Saved. "${json.township?.name || name}" is now in ${
          destCounty?.name || "the selected county"
        } County, ${destRegion?.name || "the selected region"}.`
      );
      onChanged?.();
      // Reset township selection so the refreshed tree from the parent shows.
      setSrcTownshipId("");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3 space-y-3">
        <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
          Pick the township to edit
        </p>
        <RegionCountyPicker
          tree={tree}
          regionId={srcRegionId}
          setRegionId={(v) => {
            setSrcRegionId(v);
            setSrcCountyId("");
            setSrcTownshipId("");
          }}
          countyId={srcCountyId}
          setCountyId={(v) => {
            setSrcCountyId(v);
            setSrcTownshipId("");
          }}
        />
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Township</span>
          <select
            value={srcTownshipId}
            onChange={(e) => setSrcTownshipId(e.target.value)}
            disabled={!srcCounty}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">{srcCounty ? "Select a township" : "Pick a county first"}</option>
            {(srcCounty?.townships || []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {srcTownship && (
        <div className="border border-blue-200 bg-blue-50/40 rounded-md p-3 space-y-3">
          <p className="text-xs font-medium text-blue-900 uppercase tracking-wide">
            New values
          </p>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Township name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900"
            />
          </label>
          <RegionCountyPicker
            tree={tree}
            regionId={destRegionId}
            setRegionId={(v) => {
              setDestRegionId(v);
              setDestCountyId("");
            }}
            countyId={destCountyId}
            setCountyId={setDestCountyId}
          />
          <p className="text-xs text-gray-600">
            Contacts attached to this township will follow automatically — they
            inherit county and region through the township link.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
      {success && <p className="text-sm text-emerald-700">{success}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onClose}
          className="text-sm font-medium text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Close
        </button>
        <button
          onClick={submit}
          disabled={!dirty || saving}
          className="flex items-center gap-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function CreatePanel({ tree, onChanged, onClose }) {
  const [regionId, setRegionId] = useState("");
  const [countyId, setCountyId] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const region = tree.find((r) => r.id === regionId);
  const county = region?.counties?.find((c) => c.id === countyId);

  const submit = async () => {
    if (!countyId || !name.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/contact-verification/township`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), county_id: countyId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Create failed");
      setSuccess(
        `Created "${json.township?.name}" in ${county?.name} County, ${region?.name}.`
      );
      setName("");
      onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <RegionCountyPicker
        tree={tree}
        regionId={regionId}
        setRegionId={(v) => {
          setRegionId(v);
          setCountyId("");
        }}
        countyId={countyId}
        setCountyId={setCountyId}
      />
      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">Township name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Center"
          disabled={!county}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900 disabled:bg-gray-100"
        />
        <span className="block text-xs text-gray-500 mt-1">
          The new township starts empty — you can add contacts from its admin
          drill-down page or via xlsx import.
        </span>
      </label>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {success && <p className="text-sm text-emerald-700">{success}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onClose}
          className="text-sm font-medium text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Close
        </button>
        <button
          onClick={submit}
          disabled={!countyId || !name.trim() || saving}
          className="flex items-center gap-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {saving ? "Creating…" : "Create township"}
        </button>
      </div>
    </div>
  );
}
