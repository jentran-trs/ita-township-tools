"use client";

import { useEffect, useState } from "react";
import { X, Save, ShieldAlert, MoveRight } from "lucide-react";

const EMAIL_STATUS_PRESETS = ["Valid", "Invalid", "Mailbox not working", "Updated"];

function formatPhone(input) {
  let digits = String(input || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// Superadmin-only modal for editing a contact's details + email status.
// Renders nothing when `contact` is null. Calls onSaved with the updated
// contact row on success, then onClose. Endpoint enforces auth — this UI
// just collects the changes.
export default function AdminContactEditModal({ contact, onClose, onSaved }) {
  const [draft, setDraft] = useState({
    first_name: "",
    last_name: "",
    title: "",
    email: "",
    phone: "",
    email_status: "",
    amo_individual_id: "",
  });
  // Tracks whether email_status comes from the preset dropdown or a custom "Other..." value.
  const [statusMode, setStatusMode] = useState("clear");
  const [keepUnreviewed, setKeepUnreviewed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Move-township state. The cv_regions tree is fetched lazily the first time
  // a contact opens this modal. moveTownshipId defaults to the contact's
  // current township so "no change" means no move call is fired.
  const [tree, setTree] = useState([]);
  const [moveRegionId, setMoveRegionId] = useState("");
  const [moveCountyId, setMoveCountyId] = useState("");
  const [moveTownshipId, setMoveTownshipId] = useState("");

  useEffect(() => {
    if (!contact) return;
    const status = contact.email_status || "";
    let mode = "clear";
    if (status) {
      mode = EMAIL_STATUS_PRESETS.some((p) => p.toLowerCase() === status.toLowerCase())
        ? "preset"
        : "other";
    }
    setDraft({
      first_name: contact.first_name || "",
      last_name: contact.last_name || "",
      title: contact.title || "",
      email: contact.email || "",
      phone: formatPhone(contact.phone || ""),
      email_status: status,
      amo_individual_id: contact.amo_individual_id || "",
    });
    setStatusMode(mode);
    setKeepUnreviewed(true);
    setError(null);
    setMoveTownshipId(contact.township_id || "");
  }, [contact]);

  // Lazy-load the locations tree the first time a contact opens the modal,
  // and pre-select region/county based on the contact's current township.
  useEffect(() => {
    if (!contact || tree.length > 0) return;
    fetch("/api/verify/locations")
      .then((r) => r.json())
      .then((d) => setTree(d.regions || []))
      .catch(() => {});
  }, [contact, tree.length]);

  // Whenever the tree or the contact's township changes, sync the region/county
  // pickers to match the township the contact is currently in.
  useEffect(() => {
    if (!contact || tree.length === 0) return;
    for (const r of tree) {
      for (const c of r.counties || []) {
        if ((c.townships || []).some((t) => t.id === contact.township_id)) {
          setMoveRegionId(r.id);
          setMoveCountyId(c.id);
          return;
        }
      }
    }
  }, [contact, tree]);

  if (!contact) return null;

  // Only expose the AMO ID field where the contact was loaded with it (the
  // admin contacts list). On the public portal it's absent, so we never send it
  // — avoids blanking an existing ID.
  const canEditAmo = "amo_individual_id" in contact;

  const moveRegion = tree.find((r) => r.id === moveRegionId);
  const moveCounty = moveRegion?.counties?.find((c) => c.id === moveCountyId);
  const movePending = moveTownshipId && moveTownshipId !== contact.township_id;

  const setField = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/contact-verification/contact/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changes: {
            first_name: draft.first_name,
            last_name: draft.last_name,
            title: draft.title,
            email: draft.email,
            phone: draft.phone,
            email_status: draft.email_status || null,
            ...(canEditAmo ? { amo_individual_id: draft.amo_individual_id.trim() || null } : {}),
          },
          keepUnreviewed,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");

      // If the user picked a different township, fire the move endpoint after
      // the field edits land so the audit log shows them in the right order.
      if (movePending) {
        const moveRes = await fetch("/api/admin/contact-verification/contacts/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactIds: [contact.id],
            target_township_id: moveTownshipId,
          }),
        });
        const moveJson = await moveRes.json();
        if (!moveRes.ok) throw new Error(moveJson.error || "Move failed");
      }

      onSaved?.(json.contact);
      onClose?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const selectValue =
    statusMode === "other" ? "__other__" : statusMode === "clear" ? "" : draft.email_status;

  const onStatusSelect = (e) => {
    const v = e.target.value;
    if (v === "__other__") {
      setStatusMode("other");
      setDraft({ ...draft, email_status: "" });
    } else if (v === "") {
      setStatusMode("clear");
      setDraft({ ...draft, email_status: "" });
    } else {
      setStatusMode("preset");
      setDraft({ ...draft, email_status: v });
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto"
      onClick={() => !busy && onClose?.()}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-600" /> Admin edit
          </h2>
          <button
            onClick={() => !busy && onClose?.()}
            className="text-gray-500 hover:text-gray-900"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Edit any field directly. By default the contact stays marked
          &ldquo;Needs review&rdquo; so the township still has to confirm.
        </p>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">First name</span>
              <input
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-base text-gray-900"
                value={draft.first_name}
                onChange={setField("first_name")}
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">Last name</span>
              <input
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-base text-gray-900"
                value={draft.last_name}
                onChange={setField("last_name")}
              />
            </label>
          </div>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Title</span>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-base text-gray-900"
              value={draft.title}
              onChange={setField("title")}
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Email</span>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-base text-gray-900"
              value={draft.email}
              onChange={setField("email")}
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Phone</span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={12}
              placeholder="555-123-4567"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-base text-gray-900"
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: formatPhone(e.target.value) })}
            />
          </label>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">Email status</span>
            <select
              value={selectValue}
              onChange={onStatusSelect}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-base text-gray-900 bg-white"
            >
              <option value="">— Clear (no status) —</option>
              {EMAIL_STATUS_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              <option value="__other__">Other…</option>
            </select>
            {statusMode === "other" && (
              <input
                type="text"
                autoFocus
                placeholder="Custom status (e.g. Bounced)"
                value={draft.email_status}
                onChange={(e) => setDraft({ ...draft, email_status: e.target.value })}
                className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 text-base text-gray-900"
              />
            )}
          </div>

          {canEditAmo && (
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">AMO Individual ID</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 1424320"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-base text-gray-900"
                value={draft.amo_individual_id}
                onChange={setField("amo_individual_id")}
              />
              <span className="block text-xs text-gray-500 mt-1">
                Links this contact to AMO so an export re-imports onto the right record. Leave blank
                if they aren&apos;t in AMO.
              </span>
            </label>
          )}

          <div className="border border-blue-200 bg-blue-50/40 rounded-md p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 uppercase tracking-wide">
              <MoveRight className="w-3.5 h-3.5" /> Township assignment
            </div>
            <p className="text-xs text-blue-900/80">
              Currently in <strong>{contact.township_name}</strong>
              {contact.county_name ? `, ${contact.county_name} County` : ""}. Change the
              dropdowns below to move this person to a different township when you save.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="block">
                <span className="block text-xs font-medium text-gray-700 mb-1">Region</span>
                <select
                  value={moveRegionId}
                  onChange={(e) => {
                    setMoveRegionId(e.target.value);
                    setMoveCountyId("");
                    setMoveTownshipId("");
                  }}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white text-gray-900"
                >
                  <option value="">Select…</option>
                  {tree.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-gray-700 mb-1">County</span>
                <select
                  value={moveCountyId}
                  onChange={(e) => {
                    setMoveCountyId(e.target.value);
                    setMoveTownshipId("");
                  }}
                  disabled={!moveRegion}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white text-gray-900 disabled:bg-gray-100"
                >
                  <option value="">{moveRegion ? "Select…" : "Pick region"}</option>
                  {(moveRegion?.counties || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-gray-700 mb-1">Township</span>
                <select
                  value={moveTownshipId}
                  onChange={(e) => setMoveTownshipId(e.target.value)}
                  disabled={!moveCounty}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white text-gray-900 disabled:bg-gray-100"
                >
                  <option value="">{moveCounty ? "Select…" : "Pick county"}</option>
                  {(moveCounty?.townships || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {movePending && (
              <p className="text-xs font-medium text-blue-900">
                Saving will move this contact to <strong>{moveCounty?.townships?.find((t) => t.id === moveTownshipId)?.name}</strong>.
              </p>
            )}
          </div>

          <label className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md mt-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={keepUnreviewed}
              onChange={(e) => setKeepUnreviewed(e.target.checked)}
            />
            <span className="text-sm text-amber-900">
              <strong>Keep as &ldquo;Needs review&rdquo;</strong> so the township still has to
              confirm. Uncheck to stamp this contact as reviewed by you instead.
            </span>
          </label>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5 flex-wrap">
          <button
            onClick={() => !busy && onClose?.()}
            disabled={busy}
            className="text-sm font-medium text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={busy}
            className="flex items-center gap-1.5 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-md disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
