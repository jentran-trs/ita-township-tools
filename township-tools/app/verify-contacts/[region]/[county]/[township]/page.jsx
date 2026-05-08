"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Check,
  Pencil,
  Trash2,
  Plus,
  X,
  Save,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Undo2,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

const FIELDS = ["first_name", "last_name", "title", "email", "phone", "email_status"];
const EMPTY_DRAFT = { first_name: "", last_name: "", title: "", email: "", phone: "", email_status: "" };

function reviewerKey() {
  return "cv_reviewer_v1";
}

function formatRelative(ts) {
  if (!ts) return "";
  const diff = Math.max(0, Date.now() - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec} seconds ago`;
  const min = Math.floor(sec / 60);
  if (min === 1) return "1 minute ago";
  if (min < 5) return `${min} minutes ago`;
  // Past 5 minutes, show absolute time
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function loadReviewer() {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(reviewerKey()) : null;
    return raw ? JSON.parse(raw) : { reviewerName: "", reviewerEmail: "", sessionId: null };
  } catch {
    return { reviewerName: "", reviewerEmail: "", sessionId: null };
  }
}
function saveReviewer(r) {
  try {
    window.localStorage.setItem(reviewerKey(), JSON.stringify(r));
  } catch {}
}

export default function VerifyTownshipPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const regionSlug = params.region;
  const countySlug = params.county;
  const townshipSlug = params.township;

  const fromAdmin = searchParams.get("from") === "admin";
  const adminScope = searchParams.get("scope");
  const adminId = searchParams.get("id");
  const adminBackHref = fromAdmin && adminScope && adminId
    ? `/admin/contact-verification/${adminScope}/${adminId}`
    : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tree, setTree] = useState(null);
  const [township, setTownship] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [reviewer, setReviewer] = useState({ reviewerName: "", reviewerEmail: "", sessionId: null });
  const [reviewerOpen, setReviewerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [savedTick, setSavedTick] = useState(0);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [handoffNote, setHandoffNote] = useState("");
  const [finishingSession, setFinishingSession] = useState(false);
  const [addressEditing, setAddressEditing] = useState(false);
  const [addressDraft, setAddressDraft] = useState({ street_address: "", mailing_address: "" });
  const [addressBusy, setAddressBusy] = useState(false);
  const [verificationDeadline, setVerificationDeadline] = useState(null);

  useEffect(() => {
    const loaded = loadReviewer();
    setReviewer(loaded);
    if (!loaded?.reviewerName || !loaded?.reviewerEmail) {
      setReviewerOpen(true);
    }
    fetch("/api/verify/settings")
      .then((r) => r.json())
      .then((d) => setVerificationDeadline(d.verification_deadline || null))
      .catch(() => {});
  }, []);

  // Refresh the "X seconds ago" pill text on a 30s tick.
  useEffect(() => {
    if (!lastSavedAt) return;
    const id = setInterval(() => setSavedTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [lastSavedAt]);

  const markSaved = () => setLastSavedAt(Date.now());

  const refresh = async (townshipId) => {
    const res = await fetch(`/api/verify/contacts/${townshipId}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to load");
    setTownship(json.township);
    setContacts(json.contacts || []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/verify/locations");
        const json = await res.json();
        if (cancelled) return;
        const region = (json.regions || []).find((r) => r.slug === regionSlug);
        const county = region?.counties?.find((c) => c.slug === countySlug);
        const t = county?.townships?.find((t) => t.slug === townshipSlug);
        if (!t) {
          setError("Township not found");
          setLoading(false);
          return;
        }
        setTree({ region, county, township: t });
        await refresh(t.id);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [regionSlug, countySlug, townshipSlug]);

  const isReviewerComplete = (r) =>
    !!(r?.reviewerName && r.reviewerName.trim()) &&
    !!(r?.reviewerEmail && /\S+@\S+\.\S+/.test(r.reviewerEmail.trim()));

  const ensureSession = async () => {
    if (!isReviewerComplete(reviewer)) {
      setReviewerOpen(true);
      throw new Error("Please enter your full name and email before making changes.");
    }
    if (reviewer.sessionId) return reviewer;
    const res = await fetch("/api/verify/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewerName: reviewer.reviewerName,
        reviewerEmail: reviewer.reviewerEmail,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Session failed");
    const next = { ...reviewer, sessionId: json.sessionId };
    setReviewer(next);
    saveReviewer(next);
    return next;
  };

  const startEdit = (contact) => {
    setEditingId(contact.id);
    setAdding(false);
    setDraft({
      first_name: contact.first_name || "",
      last_name: contact.last_name || "",
      title: contact.title || "",
      email: contact.email || "",
      phone: contact.phone || "",
      email_status: contact.email_status || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAdding(false);
    setDraft(EMPTY_DRAFT);
  };

  const saveEdit = async (contactId) => {
    setBusyId(contactId);
    try {
      const r = await ensureSession();
      const res = await fetch("/api/verify/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, reviewer: r, changes: draft }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      cancelEdit();
      await refresh(township.id);
      markSaved();
      setJustCompleted(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const markNoChange = async (contactId) => {
    setBusyId(contactId);
    try {
      const r = await ensureSession();
      const res = await fetch("/api/verify/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, reviewer: r, markNoChange: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      await refresh(township.id);
      markSaved();
      setJustCompleted(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const undoReview = async (contactId) => {
    setBusyId(contactId);
    try {
      const r = await ensureSession();
      const res = await fetch("/api/verify/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, reviewer: r, markUnreviewed: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      await refresh(township.id);
      markSaved();
      setJustCompleted(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const removeNewContact = async (contactId) => {
    if (!confirm("Remove this contact you added? This cannot be undone.")) return;
    setBusyId(contactId);
    try {
      const r = await ensureSession();
      const qs = new URLSearchParams({
        contactId,
        sessionId: r.sessionId || "",
        reviewerName: r.reviewerName || "",
        reviewerEmail: r.reviewerEmail || "",
      });
      const res = await fetch(`/api/verify/contact?${qs}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      await refresh(township.id);
      markSaved();
      setJustCompleted(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const markForRemoval = async (contactId) => {
    if (!confirm("Mark this person for removal? They'll stay visible but flagged so the admin can drop them from the master database.")) return;
    setBusyId(contactId);
    try {
      const r = await ensureSession();
      const res = await fetch("/api/verify/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, reviewer: r, markForRemoval: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      await refresh(township.id);
      markSaved();
      setJustCompleted(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const addNew = async () => {
    setBusyId("new");
    try {
      const r = await ensureSession();
      const res = await fetch("/api/verify/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ townshipId: township.id, reviewer: r, contact: draft }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      cancelEdit();
      await refresh(township.id);
      markSaved();
      setJustCompleted(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const markComplete = async () => {
    if (addressUnreviewed) {
      alert("Please review the township address first (at the top of the page).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (unreviewedCount > 0) {
      alert(
        `${unreviewedCount} contact${unreviewedCount === 1 ? " is" : "s are"} still highlighted in red and need to be reviewed before you can mark this list complete.`
      );
      const firstUnreviewed = document.querySelector('[data-unreviewed="true"]');
      if (firstUnreviewed) firstUnreviewed.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setCompleting(true);
    try {
      const r = await ensureSession();
      const res = await fetch(`/api/verify/township/${township.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer: r }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      await refresh(township.id);
      markSaved();
      setJustCompleted(true);
    } catch (e) {
      alert(e.message);
    } finally {
      setCompleting(false);
    }
  };

  const finishSession = async () => {
    setFinishingSession(true);
    try {
      const r = await ensureSession();
      const res = await fetch(`/api/verify/township/${township.id}/finish-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer: r, note: handoffNote }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      router.push("/verify-contacts?finished=1");
    } catch (e) {
      alert(e.message);
      setFinishingSession(false);
    }
  };

  const onReviewerSave = () => {
    if (!isReviewerComplete(reviewer)) {
      alert("Please enter your full name and a valid email address.");
      return;
    }
    saveReviewer(reviewer);
    setReviewerOpen(false);
  };

  const startAddressEdit = () => {
    setAddressDraft({
      street_address: township?.street_address || "",
      mailing_address: township?.mailing_address || "",
    });
    setAddressEditing(true);
  };
  const cancelAddressEdit = () => setAddressEditing(false);

  const submitAddress = async (payload) => {
    setAddressBusy(true);
    try {
      const r = await ensureSession();
      const res = await fetch(`/api/verify/township/${township.id}/address`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer: r, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      await refresh(township.id);
      markSaved();
      setAddressEditing(false);
      setJustCompleted(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setAddressBusy(false);
    }
  };

  const confirmAddress = () => submitAddress({ confirm: true });
  const undoAddress = () => submitAddress({ markUnreviewed: true });
  const saveAddressEdits = () =>
    submitAddress({
      street_address: addressDraft.street_address,
      mailing_address: addressDraft.mailing_address,
    });

  const unreviewedCount = useMemo(
    () => contacts.filter((c) => c.review_status === "unreviewed").length,
    [contacts]
  );
  const addressUnreviewed = township?.address_status === "unreviewed" || !township?.address_status;
  const blockingComplete = unreviewedCount > 0 || addressUnreviewed;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button
          onClick={() => router.push(adminBackHref || "/verify-contacts")}
          className="flex items-center gap-2 text-base text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          {adminBackHref ? "Back to admin dashboard" : "Pick a different township"}
        </button>

        <div className="mb-2 text-base text-gray-500">
          {tree?.region?.name} &rsaquo; {tree?.county?.name} County
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-1">{township?.name}</h1>
        {lastSavedAt && (
          <div
            key={savedTick}
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700"
          >
            <CheckCircle2 className="w-4 h-4" />
            All changes saved · {formatRelative(lastSavedAt)}
          </div>
        )}

        {justCompleted ? (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-md px-4 py-4 flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
            <div className="flex items-start gap-2 text-base text-green-900">
              <CheckCircle2 className="w-6 h-6 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Thanks — this list is marked complete.</strong> You&apos;re free to close this
                page or jump back to pick another township.
              </div>
            </div>
            {!adminBackHref && (
              <button
                onClick={() => router.push("/verify-contacts")}
                className="text-base font-medium text-green-900 underline whitespace-nowrap"
              >
                Pick another township
              </button>
            )}
          </div>
        ) : township?.status === "completed" ? (
          <div className="mt-4 flex items-start gap-2 bg-green-50 border border-green-200 rounded-md px-4 py-3 text-base text-green-900">
            <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              This list was previously marked complete
              {township.completed_at ? ` on ${new Date(township.completed_at).toLocaleDateString()}` : ""}
              {township.completed_by_name ? ` by ${township.completed_by_name}` : ""}. You can still make
              edits — the list will move back into &ldquo;in progress&rdquo; if anything changes.
            </div>
          </div>
        ) : null}

        {verificationDeadline && new Date() > new Date(verificationDeadline + "T23:59:59") && (
          <div className="mt-5 bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-base text-blue-900 flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <strong>The initial verification phase ended on{" "}
              {new Date(verificationDeadline + "T00:00:00").toLocaleDateString()}.</strong>{" "}
              Need to update something? Make changes anytime — we&apos;ll review them.
            </div>
          </div>
        )}

        {/* Reviewer identity (required) */}
        <div
          className={`mt-6 bg-white border rounded-md ${
            isReviewerComplete(reviewer)
              ? "border-gray-200"
              : "border-l-4 border-l-amber-500 border-gray-200"
          }`}
        >
          {isReviewerComplete(reviewer) && !reviewerOpen ? (
            <div className="flex items-center justify-between px-4 py-3 text-base">
              <div className="text-gray-700">
                Reviewing as{" "}
                <span className="font-medium text-gray-900">{reviewer.reviewerName}</span>{" "}
                <span className="text-gray-500">({reviewer.reviewerEmail})</span>
              </div>
              <button
                onClick={() => setReviewerOpen(true)}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 underline"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="px-4 py-4">
              <div className="text-base font-semibold text-gray-900 mb-1">
                Tell us who you are
              </div>
              <div className="text-sm text-gray-600 mb-3">
                We track your name and email with every change so we can follow up if anything looks off. Both fields are required.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">
                    Full name <span className="text-red-600">*</span>
                  </span>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-base text-gray-900"
                    value={reviewer.reviewerName}
                    onChange={(e) => setReviewer({ ...reviewer, reviewerName: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">
                    Email address <span className="text-red-600">*</span>
                  </span>
                  <input
                    type="email"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-base text-gray-900"
                    value={reviewer.reviewerEmail}
                    onChange={(e) => setReviewer({ ...reviewer, reviewerEmail: e.target.value })}
                  />
                </label>
              </div>
              <div className="flex justify-end mt-3">
                <button
                  onClick={onReviewerSave}
                  disabled={!isReviewerComplete(reviewer)}
                  className="text-base font-medium px-5 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Address block */}
        <div
          className={`mt-6 bg-white border rounded-md p-5 sm:p-6 ${
            addressUnreviewed ? "border-l-4 border-l-red-500 border-gray-200" : "border-l-4 border-l-emerald-400 border-gray-200"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-semibold text-gray-900">Township address</span>
                {addressUnreviewed ? (
                  <span className="inline-flex items-center text-sm font-medium px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                    Needs review
                  </span>
                ) : township?.address_status === "confirmed" ? (
                  <span className="inline-flex items-center gap-1 text-sm font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sm font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Updated
                  </span>
                )}
              </div>
              {!addressEditing ? (
                <div className="mt-3 text-base text-gray-800 space-y-2">
                  <div>
                    <span className="text-gray-500">Street:</span>{" "}
                    {township?.street_address || <span className="text-gray-400">not on file</span>}
                  </div>
                  <div>
                    <span className="text-gray-500">Mailing:</span>{" "}
                    {township?.mailing_address || <span className="text-gray-400">not on file</span>}
                  </div>
                  {township?.address_reviewed_by_name && !addressUnreviewed && (
                    <div className="text-sm text-gray-400 pt-1">
                      Reviewed by {township.address_reviewed_by_name}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <Field label="Street address" full>
                    <input
                      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-base text-gray-900"
                      value={addressDraft.street_address}
                      onChange={(e) =>
                        setAddressDraft({ ...addressDraft, street_address: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Mailing address" full>
                    <input
                      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-base text-gray-900"
                      value={addressDraft.mailing_address}
                      onChange={(e) =>
                        setAddressDraft({ ...addressDraft, mailing_address: e.target.value })
                      }
                    />
                  </Field>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {!addressEditing && addressUnreviewed && (
                <>
                  <button
                    onClick={confirmAddress}
                    disabled={addressBusy}
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <Check className="w-4 h-4" /> Confirm correct
                  </button>
                  <button
                    onClick={startAddressEdit}
                    disabled={addressBusy}
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                </>
              )}
              {!addressEditing && !addressUnreviewed && (
                <button
                  onClick={undoAddress}
                  disabled={addressBusy}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <Undo2 className="w-4 h-4" /> Undo
                </button>
              )}
              {addressEditing && (
                <>
                  <button
                    onClick={cancelAddressEdit}
                    disabled={addressBusy}
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                  <button
                    onClick={saveAddressEdits}
                    disabled={addressBusy}
                    className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" /> Save
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {unreviewedCount > 0 && (
          <div className="mt-5 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-base text-amber-900">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            {unreviewedCount} contact{unreviewedCount === 1 ? "" : "s"} still need review (highlighted in
            red).
          </div>
        )}

        <div className="mt-6 space-y-3">
          {contacts.length === 0 && !adding && (
            <div className="bg-white border border-gray-200 rounded-md p-6 text-center text-sm text-gray-500">
              No contacts on file for this township yet.
            </div>
          )}

          {contacts.map((c) => {
            const isUnreviewed = c.review_status === "unreviewed";
            const isEditing = editingId === c.id;
            const cardBg = isUnreviewed
              ? "bg-red-50 border-red-300 border-l-4 border-l-red-500"
              : c.review_status === "no_change"
              ? "bg-white border-gray-200 border-l-4 border-l-emerald-400"
              : c.review_status === "newly_added"
              ? "bg-white border-gray-200 border-l-4 border-l-blue-500"
              : c.review_status === "needs_removal"
              ? "bg-white border-gray-200 border-l-4 border-l-amber-500"
              : "bg-white border-gray-200 border-l-4 border-l-emerald-500";

            return (
              <div
                key={c.id}
                data-unreviewed={isUnreviewed ? "true" : undefined}
                className={`border rounded-md ${cardBg} p-5`}
              >
                {!isEditing ? (
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-semibold text-gray-900">
                          {[c.first_name, c.last_name].filter(Boolean).join(" ") || "(no name)"}
                        </span>
                        <StatusPill status={c.review_status} />
                      </div>
                      {c.title && <div className="text-base text-gray-700 mt-1">{c.title}</div>}
                      <div
                        className={`text-base mt-1 break-all ${
                          c.review_status === "needs_removal" ? "text-gray-400 line-through" : "text-gray-700"
                        }`}
                      >
                        {c.email || <span className="text-gray-400">no email</span>}
                        {c.phone ? ` · ${c.phone}` : ""}
                      </div>
                      {c.email_status && (
                        <div className="mt-1.5">
                          <EmailStatusPill status={c.email_status} />
                        </div>
                      )}
                      {c.previous_email && (
                        <div className="text-sm text-amber-700 mt-1">
                          Previously: {c.previous_email}
                          {c.previous_email_status ? ` (status was: ${c.previous_email_status})` : ""}
                        </div>
                      )}
                      {c.reviewed_by_name && c.review_status !== "unreviewed" && (
                        <div className="text-sm text-gray-400 mt-1">
                          Reviewed by {c.reviewed_by_name}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {isUnreviewed && (
                        <>
                          <button
                            onClick={() => markNoChange(c.id)}
                            disabled={busyId === c.id}
                            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            <Check className="w-4 h-4" /> No change
                          </button>
                          <button
                            onClick={() => startEdit(c)}
                            disabled={busyId === c.id}
                            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={() => markForRemoval(c.id)}
                            disabled={busyId === c.id}
                            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 border border-amber-300 text-amber-700 rounded-md hover:bg-amber-50"
                          >
                            <Trash2 className="w-4 h-4" /> Mark for removal
                          </button>
                        </>
                      )}
                      {(c.review_status === "no_change" || c.review_status === "needs_removal") && (
                        <button
                          onClick={() => undoReview(c.id)}
                          disabled={busyId === c.id}
                          className="flex items-center gap-1.5 text-sm font-medium text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          <Undo2 className="w-4 h-4" /> Undo
                        </button>
                      )}
                      {c.review_status === "updated" && (
                        <>
                          <button
                            onClick={() => undoReview(c.id)}
                            disabled={busyId === c.id}
                            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            <Undo2 className="w-4 h-4" /> Undo
                          </button>
                          <button
                            onClick={() => startEdit(c)}
                            disabled={busyId === c.id}
                            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={() => markForRemoval(c.id)}
                            disabled={busyId === c.id}
                            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 border border-amber-300 text-amber-700 rounded-md hover:bg-amber-50"
                          >
                            <Trash2 className="w-4 h-4" /> Mark for removal
                          </button>
                        </>
                      )}
                      {c.review_status === "newly_added" && (
                        <>
                          <button
                            onClick={() => startEdit(c)}
                            disabled={busyId === c.id}
                            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={() => removeNewContact(c.id)}
                            disabled={busyId === c.id}
                            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 border border-red-200 text-red-700 rounded-md hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" /> Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <ContactForm
                    draft={draft}
                    setDraft={setDraft}
                    onCancel={cancelEdit}
                    onSave={() => saveEdit(c.id)}
                    busy={busyId === c.id}
                  />
                )}
              </div>
            );
          })}

          {adding && (
            <div className="bg-white border border-blue-300 border-l-4 border-l-blue-500 rounded-md p-4">
              <ContactForm
                draft={draft}
                setDraft={setDraft}
                onCancel={cancelEdit}
                onSave={addNew}
                busy={busyId === "new"}
                isNew
              />
            </div>
          )}

          {!adding && (
            <button
              onClick={() => {
                setAdding(true);
                setEditingId(null);
                setDraft(EMPTY_DRAFT);
              }}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-md py-4 text-base font-medium text-gray-600 hover:border-gray-400 hover:text-gray-900"
            >
              <Plus className="w-5 h-5" /> Add a new contact
            </button>
          )}
        </div>
      </div>

      {/* Finish-session modal */}
      {showFinishModal && (
        <div
          className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center px-4"
          onClick={() => !finishingSession && setShowFinishModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Wrap up your session?</h2>
            <p className="text-base text-gray-700 mb-4">
              {(() => {
                const reviewedCount = contacts.length - unreviewedCount;
                const total = contacts.length;
                const stillPending = [];
                if (unreviewedCount > 0)
                  stillPending.push(
                    `${unreviewedCount} contact${unreviewedCount === 1 ? "" : "s"}`
                  );
                if (addressUnreviewed) stillPending.push("the address");
                return (
                  <>
                    You&apos;ve reviewed{" "}
                    <strong>
                      {reviewedCount} of {total} contacts
                    </strong>
                    .{" "}
                    {stillPending.length > 0
                      ? `${stillPending.join(" and ")} still need review.`
                      : "Everything is reviewed!"}{" "}
                    Your changes are already saved. Marking the rest is optional.
                  </>
                );
              })()}
            </p>
            <label className="block mb-4">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Anything we should know? <span className="text-gray-400">(optional)</span>
              </span>
              <textarea
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-base text-gray-900"
                placeholder="e.g. Joe handles HR contacts — ask him about the rest."
                value={handoffNote}
                onChange={(e) => setHandoffNote(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2 flex-wrap">
              <button
                onClick={() => setShowFinishModal(false)}
                disabled={finishingSession}
                className="text-base font-medium text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Stay on this page
              </button>
              <button
                onClick={finishSession}
                disabled={finishingSession}
                className="text-base font-semibold text-white px-5 py-2 bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {finishingSession ? "Saving…" : "Yes, I'm done"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky completion bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 shadow-md">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-3 flex-col sm:flex-row">
          <div className="text-base text-gray-700">
            {contacts.length} contact{contacts.length === 1 ? "" : "s"} ·{" "}
            <span className={unreviewedCount === 0 ? "text-emerald-700 font-medium" : "text-red-700 font-medium"}>
              {unreviewedCount === 0 ? "all reviewed" : `${unreviewedCount} still need review`}
            </span>
            {addressUnreviewed && (
              <span className="text-red-700 font-medium"> · address still needs review</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={() => {
                setHandoffNote("");
                setShowFinishModal(true);
              }}
              className="text-base font-medium text-gray-700 px-4 py-2.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
            >
              I&apos;m done for now
            </button>
            <button
              onClick={markComplete}
              disabled={completing}
              className={`flex items-center gap-2 text-base font-semibold px-5 py-2.5 rounded-md text-white ${
                blockingComplete ? "bg-gray-400 hover:bg-gray-500" : "bg-emerald-600 hover:bg-emerald-700"
              } disabled:opacity-50`}
            >
              <CheckCircle2 className="w-5 h-5" /> Mark list completed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  if (status === "unreviewed") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
        Needs review
      </span>
    );
  }
  if (status === "no_change") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> Reviewed
      </span>
    );
  }
  if (status === "updated") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> Updated
      </span>
    );
  }
  if (status === "newly_added") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
        <Sparkles className="w-3 h-3" /> New
      </span>
    );
  }
  if (status === "needs_removal") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300">
        Needs removal
      </span>

    );
  }
  return null;
}

function EmailStatusPill({ status }) {
  if (!status) return null;
  const isValid = status.toLowerCase().trim() === "valid";
  const cls = isValid
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-red-50 text-red-700 border-red-200";
  const Icon = isValid ? ShieldCheck : ShieldAlert;
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
      <Icon className="w-4 h-4" />
      Current email status: {status}
    </span>
  );
}

function Field({ label, children, full }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );
}

function ContactForm({ draft, setDraft, onCancel, onSave, busy, isNew }) {
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });
  const inputClass = "w-full border border-gray-300 rounded-md px-3 py-2.5 text-base text-gray-900 placeholder-gray-400";
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="First name">
          <input className={inputClass} value={draft.first_name} onChange={set("first_name")} />
        </Field>
        <Field label="Last name">
          <input className={inputClass} value={draft.last_name} onChange={set("last_name")} />
        </Field>
        <Field label="Title" full>
          <input className={inputClass} value={draft.title} onChange={set("title")} />
        </Field>
        <Field label="Email address" full>
          <input type="email" className={inputClass} value={draft.email} onChange={set("email")} />
          {draft.email_status && (
            <div className="mt-1.5">
              <EmailStatusPill status={draft.email_status} />
            </div>
          )}
        </Field>
        <Field label="Phone number" full>
          <input type="tel" className={inputClass} value={draft.phone} onChange={set("phone")} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-base font-medium text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <X className="w-4 h-4" /> Cancel
        </button>
        <button
          onClick={onSave}
          disabled={busy}
          className="flex items-center gap-1.5 text-base font-medium px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {isNew ? "Add contact" : "Save"}
        </button>
      </div>
    </div>
  );
}
