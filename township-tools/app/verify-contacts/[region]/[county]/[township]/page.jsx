"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
  Pencil,
  Trash2,
  Plus,
  X,
  Save,
  CheckCircle2,
  ChevronDown,
  Undo2,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  SkipForward,
  Clock,
  MessageSquare,
  History,
} from "lucide-react";
import AdminContactEditModal from "../../../../../components/AdminContactEditModal";
import ContactHistoryModal from "../../../../../components/ContactHistoryModal";
import PortalClosedNotice from "../../../../../components/PortalClosedNotice";

const FIELDS = ["first_name", "last_name", "title", "email", "phone", "email_status"];
const EMPTY_DRAFT = { first_name: "", last_name: "", title: "", email: "", phone: "", email_status: "" };

function reviewerKey() {
  return "cv_reviewer_v1";
}

// Standardize US phone numbers to xxx-xxx-xxxx as the user types or when displayed.
function formatPhone(input) {
  let digits = String(input || "").replace(/\D/g, "");
  // Drop a leading 1 (US country code) so 15551234567 renders as 555-123-4567.
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
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
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [view, setView] = useState("wizard"); // 'wizard' | 'summary'
  const [wizardIndex, setWizardIndex] = useState(0);
  const [wizardDirection, setWizardDirection] = useState("forward"); // 'forward' | 'backward'
  const [didInitView, setDidInitView] = useState(false);
  const [savedTick, setSavedTick] = useState(0);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [handoffNote, setHandoffNote] = useState("");
  const [finishingSession, setFinishingSession] = useState(false);
  const [addressEditing, setAddressEditing] = useState(false);
  const [addressDraft, setAddressDraft] = useState({ street_address: "", mailing_address: "" });
  const [addressBusy, setAddressBusy] = useState(false);
  const [verificationDeadline, setVerificationDeadline] = useState(null);
  const [portalLocked, setPortalLocked] = useState(false);
  const [portalManuallyClosed, setPortalManuallyClosed] = useState(false);
  const [portalReopen, setPortalReopen] = useState(null);
  const [townshipNotes, setTownshipNotes] = useState([]);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [notesVisible, setNotesVisible] = useState(false);
  const [recentlyChangedIds, setRecentlyChangedIds] = useState(new Set());
  const [adminEditContact, setAdminEditContact] = useState(null);
  const [historyContact, setHistoryContact] = useState(null);

  useEffect(() => {
    const loaded = loadReviewer();
    setReviewer(loaded);
    if (!loaded?.reviewerName || !loaded?.reviewerEmail) {
      setReviewerOpen(true);
    }
    fetch("/api/verify/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setVerificationDeadline(d.verification_deadline || null);
        setPortalLocked(!!d.portal_locked);
        setPortalManuallyClosed(!!d.portal_manually_closed);
        setPortalReopen(d.portal_reopen || null);
      })
      .catch(() => {});
    fetch("/api/admin/contact-verification/auth")
      .then((r) => r.json())
      .then((d) => setIsSuperadmin(!!d.ok))
      .catch(() => {});
  }, []);

  // Refresh the "X seconds ago" pill text on a 30s tick.
  useEffect(() => {
    if (!lastSavedAt) return;
    const id = setInterval(() => setSavedTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [lastSavedAt]);

  // After contacts load for the first time, skip the wizard if there's
  // only 0 or 1 contact (wizard is pointless for a single card).
  useEffect(() => {
    if (didInitView || !township) return;
    setDidInitView(true);
    if (contacts.length <= 1) setView("summary");
  }, [township, contacts, didInitView]);

  const markSaved = () => setLastSavedAt(Date.now());

  // Move to the next contact in the wizard, or jump to the summary at the end.
  const advanceWizard = () => {
    if (view !== "wizard") return;
    setWizardDirection("forward");
    if (wizardIndex >= contacts.length - 1) {
      setView("summary");
    } else {
      setWizardIndex((i) => i + 1);
    }
  };

  const refresh = async (townshipId) => {
    const res = await fetch(`/api/verify/contacts/${townshipId}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to load");
    setTownship(json.township);
    setContacts(json.contacts || []);
  };

  // Fetch notes only when current user is superadmin (the API rejects non-superadmin requests).
  useEffect(() => {
    if (!isSuperadmin || !township?.id) return;
    fetch(`/api/verify/township/${township.id}/notes`)
      .then((r) => r.json())
      .then((d) => setTownshipNotes(d.notes || []))
      .catch(() => {});
    fetch(`/api/admin/contact-verification/township/${township.id}/recent-changes`)
      .then((r) => r.json())
      .then((d) => setRecentlyChangedIds(new Set(d.contactIds || [])))
      .catch(() => {});
  }, [isSuperadmin, township?.id]);

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
      phone: formatPhone(contact.phone || ""),
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
      advanceWizard();
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
      advanceWizard();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const skipContact = async (contactId) => {
    setBusyId(contactId);
    try {
      const r = await ensureSession();
      const res = await fetch("/api/verify/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, reviewer: r, markSkipped: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      await refresh(township.id);
      markSaved();
      advanceWizard();
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
      advanceWizard();
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
      router.push(
        `/verify-contacts/${regionSlug}/${countySlug}/${townshipSlug}/thank-you`
      );
    } catch (e) {
      alert(e.message);
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
      const qs = new URLSearchParams({
        finished: "1",
        township: township?.name || "",
        county: tree?.county?.name || "",
      });
      router.push(`/verify-contacts?${qs}`);
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

  // Manual close is a hard wall — no viewing or editing the contact list here,
  // even for superadmins (who manage from /admin/contact-verification instead).
  if (portalManuallyClosed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-16">
        <img
          src="/ita-logo.png"
          alt="Indiana Township Association"
          className="w-24 h-24 sm:w-28 sm:h-28 mb-4"
        />
        <div className="max-w-xl w-full">
          <PortalClosedNotice />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button
          onClick={() => router.push(adminBackHref || "/verify-contacts")}
          className="inline-flex items-center gap-2 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md px-4 py-2.5 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 shadow-sm mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          {adminBackHref ? "Back to admin dashboard" : "Pick a different township"}
        </button>

        <div className="flex items-start gap-4">
          <img
            src="/ita-logo.png"
            alt="Indiana Township Association"
            className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 hidden sm:block"
          />
          <div className="min-w-0 flex-1">
            <div className="mb-2 text-base text-gray-500">
              {tree?.region?.name} &rsaquo; {tree?.county?.name} County
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-1">{township?.name}</h1>
          </div>
        </div>
        {lastSavedAt && (
          <div
            key={savedTick}
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700"
          >
            <CheckCircle2 className="w-4 h-4" />
            All changes saved · {formatRelative(lastSavedAt)}
          </div>
        )}

        {township?.status === "completed" && (
          <div className="mt-4 flex items-start gap-2 bg-green-50 border border-green-200 rounded-md px-4 py-3 text-base text-green-900">
            <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              This list was previously marked complete
              {township.completed_at ? ` on ${new Date(township.completed_at).toLocaleDateString()}` : ""}
              {township.completed_by_name ? ` by ${township.completed_by_name}` : ""}. You can still make
              edits — the list will move back into &ldquo;in progress&rdquo; if anything changes.
            </div>
          </div>
        )}

        {portalManuallyClosed && <PortalClosedNotice className="mt-5" />}

        {verificationDeadline && !portalManuallyClosed && (() => {
          const formatted = new Date(verificationDeadline + "T00:00:00").toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          const reopenDate = portalReopen ? new Date(portalReopen) : null;
          const reopenFormatted = reopenDate
            ? reopenDate.toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "";
          const now = new Date();
          const deadlineDate = new Date(verificationDeadline + "T23:59:59-04:00");
          // 3 states: locked / reopened / pre-deadline
          if (portalLocked) {
            return (
              <div className="mt-5 bg-gray-100 border-2 border-gray-300 rounded-md px-4 py-3 text-base text-gray-800 flex items-start gap-2">
                <Clock className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>The portal is currently closed for finalization.</strong> Indiana
                  Township Association is reviewing the records collected by {formatted}. The
                  portal will reopen on <strong>{reopenFormatted}</strong>.
                </div>
              </div>
            );
          }
          if (reopenDate && now >= reopenDate) {
            return (
              <div className="mt-5 bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-base text-blue-900 flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>If there have been changes to your township contact list,
                    please update below.</strong>
                </div>
              </div>
            );
          }
          return (
            <div className="mt-5 bg-amber-50 border-2 border-amber-300 rounded-md px-4 py-3 text-base text-amber-900 flex items-start gap-2">
              <Clock className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Please verify by {formatted}.</strong> The portal will close for review
                after this date so Indiana Township Association can finalize the records. After{" "}
                <strong>{reopenFormatted}</strong>, you can come back to update your township
                contact list as needed.
              </div>
            </div>
          );
        })()}

        {/* Reviewer notes — superadmin only, hidden behind a toggle */}
        {isSuperadmin && townshipNotes.length > 0 && (
          <div className="mt-5">
            <button
              onClick={() => setNotesVisible((v) => !v)}
              className="flex items-center gap-2 text-sm font-medium text-amber-900 bg-amber-50 border border-amber-300 px-4 py-2 rounded-md hover:bg-amber-100"
            >
              <MessageSquare className="w-4 h-4" />
              {notesVisible ? "Hide notes" : "View notes"}
              <span className="inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900">
                {townshipNotes.length}
              </span>
            </button>
            {notesVisible && (
              <div className="mt-2 bg-amber-50/60 border border-amber-200 rounded-md">
                <ul className="divide-y divide-amber-100">
                  {townshipNotes.map((n) => (
                    <li key={n.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">
                          {n.reviewer_name || "Anonymous reviewer"}
                        </span>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(n.created_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="mt-1 pl-3 border-l-2 border-amber-300 italic text-base text-gray-800">
                        &ldquo;{n.note}&rdquo;
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Reviewer identity (required) — hidden when portal is locked */}
        {!portalLocked && (
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
        )}

        {/* Address block */}
        <div
          className={`mt-6 bg-white border rounded-md p-5 sm:p-6 ${
            addressUnreviewed ? "border-l-4 border-l-red-500 border-gray-200" : "border-l-4 border-l-emerald-400 border-gray-200"
          }`}
        >
          {/* Header row: title + status pill (always on top) */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
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

          {addressEditing ? (
            // Edit mode: full-width form, buttons below
            <>
              <div className="space-y-3">
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
              <div className="flex flex-wrap gap-2 justify-end mt-4">
                <button
                  onClick={cancelAddressEdit}
                  disabled={addressBusy}
                  className="flex items-center justify-center gap-1.5 text-sm font-medium text-gray-700 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
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
              </div>
            </>
          ) : (
            // Read-only mode: side-by-side address text + buttons
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0 flex-1 text-base text-gray-800 space-y-2">
                <div>
                  <span className="text-gray-500">Street:</span>{" "}
                  {township?.street_address || <span className="text-gray-500 italic">not on file</span>}
                </div>
                <div>
                  <span className="text-gray-500">Mailing:</span>{" "}
                  {township?.mailing_address || <span className="text-gray-500 italic">not on file</span>}
                </div>
                {township?.address_reviewed_by_name && !addressUnreviewed && (
                  <div className="text-sm text-gray-600 pt-1">
                    Reviewed by {township.address_reviewed_by_name}
                  </div>
                )}
              </div>
              {!portalLocked && (
              <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:justify-end shrink-0">
                {addressUnreviewed ? (
                  <>
                    <button
                      onClick={confirmAddress}
                      disabled={addressBusy}
                      className="flex items-center justify-center gap-1.5 text-sm font-medium text-gray-700 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Check className="w-4 h-4" /> Confirm correct
                    </button>
                    <button
                      onClick={startAddressEdit}
                      disabled={addressBusy}
                      className="flex items-center justify-center gap-1.5 text-sm font-medium text-gray-700 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Pencil className="w-4 h-4" /> Edit
                    </button>
                  </>
                ) : (
                  <button
                    onClick={undoAddress}
                    disabled={addressBusy}
                    className="flex items-center justify-center gap-1.5 text-sm font-medium text-gray-700 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <Undo2 className="w-4 h-4" /> Undo
                  </button>
                )}
              </div>
              )}
            </div>
          )}
        </div>

        {/* Contacts section: wizard view (one at a time) or summary view (full list) */}
        {contacts.length === 0 && !adding && (
          <div className="mt-6 bg-white border border-gray-200 rounded-md p-6 text-center text-sm text-gray-500">
            No contacts on file for this township yet.
          </div>
        )}

        {contacts.length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md px-4 py-3">
            <p className="text-sm text-blue-900">
              <strong>Please don&apos;t stop at your own contact.</strong> If you know for sure that another member of your township has the correct information, needs an update, or should be removed, you can verify their record too. Confirming as much of your township&apos;s list as you can helps us keep the directory accurate.
            </p>
          </div>
        )}

        {contacts.length > 0 && (
          <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
            <div className="text-base text-gray-700">
              {view === "wizard" ? (
                <>
                  Contact <strong>{wizardIndex + 1}</strong> of <strong>{contacts.length}</strong>
                </>
              ) : (
                <>
                  <strong>Review summary</strong>
                  <span className="text-gray-500"> · {contacts.length} contact{contacts.length === 1 ? "" : "s"}</span>
                </>
              )}
            </div>
            {view === "summary" && contacts.length > 1 && (
              <button
                onClick={() => {
                  setWizardDirection("forward");
                  setWizardIndex(0);
                  setView("wizard");
                }}
                className="flex items-center gap-2 text-base font-semibold text-white bg-gray-900 px-5 py-2.5 rounded-md shadow-md hover:bg-gray-800 hover:shadow-lg transition-all"
              >
                <Pencil className="w-4 h-4" /> Review one at a time
              </button>
            )}
          </div>
        )}

        <div className="mt-4 space-y-2">
          {(view === "wizard" && contacts.length > 0
            ? [contacts[Math.min(wizardIndex, contacts.length - 1)]]
            : contacts
          ).map((c) => {
            const isUnreviewed = c.review_status === "unreviewed";
            const isEditing = editingId === c.id;
            const cardBg = isUnreviewed
              ? "bg-red-50 border-red-300 border-l-4 border-l-red-500"
              : c.review_status === "no_change"
              ? "bg-gray-50 border-gray-200 border-l-4 border-l-emerald-400"
              : c.review_status === "newly_added"
              ? "bg-gray-50 border-gray-200 border-l-4 border-l-blue-500"
              : c.review_status === "needs_removal"
              ? "bg-gray-50 border-gray-200 border-l-4 border-l-amber-500"
              : c.review_status === "skipped"
              ? "bg-gray-50 border-gray-200 border-l-4 border-l-yellow-400"
              : "bg-gray-50 border-gray-200 border-l-4 border-l-emerald-500";
            const isReviewed = !isUnreviewed && !isEditing;

            const wizardAnim =
              view === "wizard"
                ? wizardDirection === "backward"
                  ? "animate-slide-in-left"
                  : "animate-slide-in-right"
                : "";
            const isRecentlyChanged = isSuperadmin && recentlyChangedIds.has(c.id);
            return (
              <div
                key={view === "wizard" ? `wiz-${c.id}` : c.id}
                data-unreviewed={isUnreviewed ? "true" : undefined}
                className={`border rounded-md ${cardBg} ${
                  view === "wizard" ? "p-6 sm:p-8 shadow-sm " + wizardAnim : "p-4"
                } transition-opacity ${
                  view === "summary" && isReviewed ? "opacity-90 hover:opacity-100" : ""
                } ${isRecentlyChanged ? "ring-2 ring-blue-400 ring-offset-2" : ""}`}
              >
                {!isEditing ? (
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-semibold text-gray-900">
                          {[c.first_name, c.last_name].filter(Boolean).join(" ") || "(no name)"}
                        </span>
                        <StatusPill status={c.review_status} />
                        {isRecentlyChanged && (
                          <span className="inline-flex items-center text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-blue-600 text-white">
                            Recent change
                          </span>
                        )}
                      </div>
                      {c.title && <div className="text-base text-gray-700 mt-1">{c.title}</div>}
                      <div
                        className={`text-base mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 ${
                          c.review_status === "needs_removal" ? "text-gray-500 line-through" : "text-gray-700"
                        }`}
                      >
                        <span className="inline-flex items-center gap-2 max-w-full break-all">
                          <span className="break-all">
                            {c.email || <span className="text-gray-500 italic">no email</span>}
                          </span>
                          {c.email && c.email_status && (
                            <EmailStatusPill status={c.email_status} />
                          )}
                        </span>
                        {c.phone ? (
                          <span className="text-gray-500">· {formatPhone(c.phone) || c.phone}</span>
                        ) : (
                          <span
                            className="text-gray-500 italic"
                            title="No phone number on file. Adding one opts this contact in for SMS updates from ITA."
                          >
                            · no phone on file
                          </span>
                        )}
                      </div>
                      {c.previous_email && (
                        <div className="text-sm text-amber-700 mt-1">
                          Previously: {c.previous_email}
                          {c.previous_email_status ? ` (status was: ${c.previous_email_status})` : ""}
                        </div>
                      )}
                      {c.reviewed_by_name && c.review_status !== "unreviewed" && (
                        <div className="text-sm text-gray-600 mt-1">
                          Reviewed by {c.reviewed_by_name}
                        </div>
                      )}
                    </div>
                    {(!portalLocked || isSuperadmin) && (
                    <div className="flex flex-col gap-2 shrink-0 sm:w-44">
                      {isSuperadmin && (
                        <button
                          onClick={() => setAdminEditContact(c)}
                          disabled={busyId === c.id}
                          className="flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-1.5 border border-blue-300 text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
                        >
                          <ShieldAlert className="w-4 h-4" /> Admin edit
                        </button>
                      )}
                      {isSuperadmin && (
                        <button
                          onClick={() => setHistoryContact(c)}
                          className="flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-1.5 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50"
                        >
                          <History className="w-4 h-4" /> History
                        </button>
                      )}
                      {!portalLocked && (
                      <>
                      {isUnreviewed && (
                        <>
                          <button
                            onClick={() => markNoChange(c.id)}
                            disabled={busyId === c.id}
                            className="flex items-center justify-center gap-1.5 text-sm font-medium text-gray-700 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            <Check className="w-4 h-4" /> No change
                          </button>
                          <button
                            onClick={() => startEdit(c)}
                            disabled={busyId === c.id}
                            className="flex items-center justify-center gap-1.5 text-sm font-medium text-gray-700 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={() => markForRemoval(c.id)}
                            disabled={busyId === c.id}
                            className="flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-1.5 border border-amber-300 text-amber-700 rounded-md hover:bg-amber-50"
                          >
                            <Trash2 className="w-4 h-4" /> Mark for removal
                          </button>
                        </>
                      )}
                      {(c.review_status === "no_change" ||
                        c.review_status === "needs_removal" ||
                        c.review_status === "skipped") && (
                        <button
                          onClick={() => undoReview(c.id)}
                          disabled={busyId === c.id}
                          className="flex items-center justify-center gap-1.5 text-sm font-medium text-gray-700 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          <Undo2 className="w-4 h-4" /> Undo
                        </button>
                      )}
                      {c.review_status === "updated" && (
                        <>
                          <button
                            onClick={() => undoReview(c.id)}
                            disabled={busyId === c.id}
                            className="flex items-center justify-center gap-1.5 text-sm font-medium text-gray-700 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            <Undo2 className="w-4 h-4" /> Undo
                          </button>
                          <button
                            onClick={() => startEdit(c)}
                            disabled={busyId === c.id}
                            className="flex items-center justify-center gap-1.5 text-sm font-medium text-gray-700 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={() => markForRemoval(c.id)}
                            disabled={busyId === c.id}
                            className="flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-1.5 border border-amber-300 text-amber-700 rounded-md hover:bg-amber-50"
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
                            className="flex items-center justify-center gap-1.5 text-sm font-medium text-gray-700 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={() => removeNewContact(c.id)}
                            disabled={busyId === c.id}
                            className="flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-1.5 border border-red-200 text-red-700 rounded-md hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" /> Remove
                          </button>
                        </>
                      )}
                      </>
                      )}
                    </div>
                    )}
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

          {/* Wizard nav: Previous / Next (only in wizard view) */}
          {view === "wizard" && contacts.length > 0 && (
            <div className="flex items-center justify-between gap-2 mt-4">
              <button
                onClick={() => {
                  setWizardDirection("backward");
                  setWizardIndex((i) => Math.max(0, i - 1));
                }}
                disabled={wizardIndex === 0}
                className="flex items-center gap-2 text-base font-medium text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </button>
              <span className="text-sm text-gray-500">
                {wizardIndex + 1} / {contacts.length}
              </span>
              <button
                onClick={() => {
                  setWizardDirection("forward");
                  if (wizardIndex >= contacts.length - 1) setView("summary");
                  else setWizardIndex((i) => i + 1);
                }}
                className="flex items-center gap-2 text-base font-medium text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {wizardIndex >= contacts.length - 1 ? "Finish & view overview" : "Skip to next"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Add new contact (summary view only) */}
          {view === "summary" && !adding && !portalLocked && (
            <button
              onClick={() => {
                setAdding(true);
                setEditingId(null);
                setDraft(EMPTY_DRAFT);
              }}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-md py-4 text-base font-medium text-gray-600 hover:border-gray-400 hover:text-gray-900 mt-3"
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
                Anything we should know? <span className="text-gray-500">(optional)</span>
              </span>
              <textarea
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-base text-gray-900"
                placeholder="e.g. Joe handles HR contacts — ask him about the rest."
                value={handoffNote}
                onChange={(e) => setHandoffNote(e.target.value)}
              />
              {handoffNote && (
                <span className="block text-xs text-gray-500 mt-1">
                  This is your previous note. Edit it to update what we see.
                </span>
              )}
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
      {!portalLocked && (
      <div className="fixed bottom-0 inset-x-0 bg-white border-t-2 border-gray-300 shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.15)]">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-4 flex-col sm:flex-row">
          <div className="text-base text-gray-800 font-medium whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-1">
            <span className="text-gray-500 font-normal">Progress: </span>
            {contacts.length} contact{contacts.length === 1 ? "" : "s"} ·{" "}
            <span className={unreviewedCount === 0 ? "text-emerald-700 font-semibold" : "text-red-700 font-semibold"}>
              {unreviewedCount === 0 ? "all reviewed" : `${unreviewedCount} still need review`}
            </span>
            {addressUnreviewed && (
              <span className="text-red-700 font-semibold"> · address still needs review</span>
            )}
          </div>
          <div className="flex items-stretch gap-3 flex-shrink-0">
            <button
              onClick={async () => {
                // Pre-fill the modal with this reviewer's previous note for this township, if any
                let prev = "";
                try {
                  if (reviewer?.reviewerEmail && township?.id) {
                    const res = await fetch(
                      `/api/verify/township/${township.id}/my-note?email=${encodeURIComponent(reviewer.reviewerEmail)}`
                    );
                    const json = await res.json();
                    prev = json?.note || "";
                  }
                } catch {}
                setHandoffNote(prev);
                setShowFinishModal(true);
              }}
              className="flex items-center justify-center text-base font-bold text-amber-900 bg-amber-100 border-2 border-amber-300 px-5 py-2.5 rounded-md shadow-sm hover:bg-amber-200 hover:border-amber-400 transition-colors whitespace-nowrap"
            >
              I&apos;m done for now
            </button>
            <button
              onClick={markComplete}
              disabled={completing}
              className={`flex items-center justify-center gap-2 text-base font-bold px-6 py-2.5 rounded-md text-white shadow-md transition-all whitespace-nowrap ${
                blockingComplete
                  ? "bg-gray-400 hover:bg-gray-500"
                  : "bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg"
              } disabled:opacity-50`}
            >
              <CheckCircle2 className="w-5 h-5" /> Mark list completed
            </button>
          </div>
        </div>
      </div>
      )}

      <AdminContactEditModal
        contact={adminEditContact}
        onClose={() => setAdminEditContact(null)}
        onSaved={async () => {
          await refresh(township.id);
          markSaved();
        }}
      />

      <ContactHistoryModal
        contactId={historyContact?.id ?? null}
        contactName={
          historyContact
            ? `${historyContact.first_name ?? ""} ${historyContact.last_name ?? ""}`.trim() ||
              historyContact.email ||
              undefined
            : undefined
        }
        onClose={() => setHistoryContact(null)}
      />
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
  if (status === "skipped") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium px-2.5 py-0.5 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-300">
        Skipped
      </span>
    );
  }
  return null;
}

function EmailStatusPill({ status }) {
  if (!status) return null;
  const norm = status.toLowerCase().trim();
  let cls = "bg-red-100 text-red-800 border-red-300";
  let label = status;
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
      className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${cls} align-middle`}
      title={title}
    >
      {label}
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
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });
  const baseInputClass =
    "w-full border rounded-md px-3 py-2.5 text-base text-gray-900 placeholder-gray-400";
  // Validation rules for new contacts
  const errors = isNew
    ? {
        first_name: !draft.first_name?.trim() ? "This field is required" : "",
        last_name: !draft.last_name?.trim() ? "This field is required" : "",
        title: !draft.title?.trim() ? "This field is required" : "",
        email: !draft.email?.trim()
          ? "This field is required"
          : !/\S+@\S+\.\S+/.test((draft.email || "").trim())
          ? "Enter a valid email address"
          : "",
      }
    : { first_name: "", last_name: "", title: "", email: "" };
  const hasErrors = Object.values(errors).some(Boolean);
  const inputClass = (field) =>
    `${baseInputClass} ${
      submitAttempted && errors[field]
        ? "border-red-400 focus:outline-red-500"
        : "border-gray-300"
    }`;
  const errorFor = (field) =>
    submitAttempted && errors[field] ? (
      <span className="block text-sm text-red-600 mt-1">{errors[field]}</span>
    ) : null;
  const req = (label) =>
    isNew ? (
      <>
        {label} <span className="text-red-600">*</span>
      </>
    ) : (
      label
    );

  const handleSave = () => {
    if (isNew && hasErrors) {
      setSubmitAttempted(true);
      return;
    }
    onSave();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={req("First name")}>
          <input className={inputClass("first_name")} value={draft.first_name} onChange={set("first_name")} />
          {errorFor("first_name")}
        </Field>
        <Field label={req("Last name")}>
          <input className={inputClass("last_name")} value={draft.last_name} onChange={set("last_name")} />
          {errorFor("last_name")}
        </Field>
        <Field label={req("Title")} full>
          <input className={inputClass("title")} value={draft.title} onChange={set("title")} />
          {errorFor("title")}
        </Field>
        <Field
          label={
            <span className="flex items-center gap-2">
              {req("Email address")}
              {draft.email_status && <EmailStatusPill status={draft.email_status} />}
            </span>
          }
          full
        >
          <input type="email" className={inputClass("email")} value={draft.email} onChange={set("email")} />
          {errorFor("email")}
          <span className="block text-sm text-gray-500 mt-1">
            By providing an email address, this contact opts in to receive email updates from ITA at this address.
          </span>
        </Field>
        <Field label="Phone number (optional)" full>
          <input
            type="tel"
            inputMode="numeric"
            className={baseInputClass + " border-gray-300"}
            value={draft.phone}
            placeholder="555-123-4567"
            maxLength={12}
            onChange={(e) => setDraft({ ...draft, phone: formatPhone(e.target.value) })}
          />
          <span className="block text-sm text-gray-500 mt-1">
            Fill in phone number to receive SMS updates from ITA.
          </span>
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
          onClick={handleSave}
          disabled={busy}
          className="flex items-center gap-1.5 text-base font-medium px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {isNew ? "Add contact" : "Save"}
        </button>
      </div>
    </div>
  );
}
