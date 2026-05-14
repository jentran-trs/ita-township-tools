"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Loader2, ArrowRight, ArrowLeft, User, MapPin, UserCheck, CheckCircle2, X, Clock, HelpCircle, Search } from "lucide-react";

const REVIEWER_KEY = "cv_reviewer_v1";

function loadReviewer() {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(REVIEWER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveReviewer(r) {
  try {
    window.localStorage.setItem(REVIEWER_KEY, JSON.stringify(r));
  } catch {}
}

export default function VerifyLanding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  const [showFinishedBanner, setShowFinishedBanner] = useState(false);
  const [finishedTownship, setFinishedTownship] = useState("");
  const [finishedCounty, setFinishedCounty] = useState("");
  const [verificationDeadline, setVerificationDeadline] = useState(null);
  const [portalLocked, setPortalLocked] = useState(false);
  const [portalReopen, setPortalReopen] = useState(null);
  const [showLookup, setShowLookup] = useState(false);
  const [lookupQuery, setLookupQuery] = useState("");
  const [tree, setTree] = useState(null);
  const [regionId, setRegionId] = useState("");
  const [countyId, setCountyId] = useState("");
  const [townshipId, setTownshipId] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [savedReviewer, setSavedReviewer] = useState(null);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);

  useEffect(() => {
    if (searchParams.get("finished") === "1") {
      setShowFinishedBanner(true);
      setFinishedTownship(searchParams.get("township") || "");
      setFinishedCounty(searchParams.get("county") || "");
    }
  }, [searchParams]);

  useEffect(() => {
    const saved = loadReviewer();
    if (saved && saved.reviewerName && saved.reviewerEmail) {
      setSavedReviewer(saved);
      setReviewerName(saved.reviewerName);
      setReviewerEmail(saved.reviewerEmail);
    } else {
      setIdentityConfirmed(true);
    }
    fetch("/api/verify/locations")
      .then((r) => r.json())
      .then((data) => {
        setTree(data.regions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    fetch("/api/verify/settings")
      .then((r) => r.json())
      .then((d) => {
        setVerificationDeadline(d.verification_deadline || null);
        setPortalLocked(!!d.portal_locked);
        setPortalReopen(d.portal_reopen || null);
      })
      .catch(() => {});
  }, []);

  const confirmAsSaved = () => {
    setIdentityConfirmed(true);
  };
  const startFresh = () => {
    setReviewerName("");
    setReviewerEmail("");
    setSavedReviewer(null);
    saveReviewer({ reviewerName: "", reviewerEmail: "", sessionId: null });
    setIdentityConfirmed(true);
  };

  const region = useMemo(() => (tree || []).find((r) => r.id === regionId), [tree, regionId]);
  const county = useMemo(() => region?.counties?.find((c) => c.id === countyId), [region, countyId]);
  const township = useMemo(() => county?.townships?.find((t) => t.id === townshipId), [county, townshipId]);

  const nameValid = reviewerName.trim().length > 0;
  const emailValid = /\S+@\S+\.\S+/.test(reviewerEmail.trim());
  const ready = identityConfirmed && nameValid && emailValid && !!region && !!county && !!township;

  const go = () => {
    if (!ready) return;
    saveReviewer({
      reviewerName: reviewerName.trim(),
      reviewerEmail: reviewerEmail.trim(),
      sessionId: null,
    });
    router.push(`/verify-contacts/${region.slug}/${county.slug}/${township.slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-12 sm:py-16">
        <button
          onClick={() => router.push(isSignedIn ? "/dashboard" : "/")}
          className="inline-flex items-center gap-2 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md px-4 py-2.5 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 shadow-sm mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          {isSignedIn ? "Back to Township Tools dashboard" : "Back to Township Tools"}
        </button>

        {showFinishedBanner && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-md px-4 py-3 flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
            <div className="flex items-start gap-2 text-base text-emerald-900">
              <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Thanks — your changes are saved</strong>
                {finishedTownship ? (
                  <>
                    {" "}
                    for <strong>{finishedTownship}</strong>
                    {finishedCounty ? <span>, {finishedCounty} County</span> : null}
                  </>
                ) : null}
                . Pick another township below, or you can close this tab.
              </div>
            </div>
            <button
              onClick={() => {
                setShowFinishedBanner(false);
                router.replace("/verify-contacts");
              }}
              className="flex items-center text-emerald-900 hover:text-emerald-700"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {verificationDeadline && (() => {
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
          if (portalLocked) {
            return (
              <div className="mb-6 bg-gray-100 border-2 border-gray-300 rounded-md px-4 py-3 flex items-start gap-2 text-base text-gray-800">
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
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md px-4 py-3 flex items-start gap-2 text-base text-blue-900">
                <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>If there have been changes to your township contact list,
                    please update below.</strong>
                </div>
              </div>
            );
          }
          return (
            <div className="mb-6 bg-amber-50 border-2 border-amber-300 rounded-md px-4 py-3 flex items-start gap-2 text-base text-amber-900">
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

        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="/ita-logo.png"
            alt="Indiana Township Association"
            className="w-24 h-24 sm:w-28 sm:h-28 mb-3"
          />
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Verify your township contacts</h1>
          <p className="text-gray-600 max-w-lg">
            Tell us a little about yourself, then pick your township so we can show you the contacts on file.
          </p>
          <div className="mt-4 max-w-lg w-full bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-left">
            <p className="text-sm text-blue-900">
              <strong>Please don&apos;t stop at your own contact.</strong> If you know for sure that another member of your township has the correct information, needs an update, or should be removed, you can verify their record too. Confirming as much of your township&apos;s list as you can helps us keep the directory accurate.
            </p>
          </div>
        </div>

        {/* Step 1 — your details */}
        {savedReviewer && !identityConfirmed ? (
          <Section
            number="1"
            icon={<UserCheck className="w-4 h-4" />}
            title="Welcome back — is this you?"
            subtitle="We remembered the details from your last visit. Confirm so we attribute changes correctly."
          >
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-3">
              <div className="text-base text-gray-900">
                <span className="font-semibold">{savedReviewer.reviewerName}</span>
              </div>
              <div className="text-sm text-gray-600">{savedReviewer.reviewerEmail}</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={confirmAsSaved}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white text-base font-semibold px-4 py-2.5 rounded-md hover:bg-gray-800"
              >
                Yes, that&apos;s me
              </button>
              <button
                onClick={startFresh}
                className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 text-base font-medium px-4 py-2.5 rounded-md hover:bg-gray-50"
              >
                No, it&apos;s someone else
              </button>
            </div>
          </Section>
        ) : (
          <Section
            number="1"
            icon={<User className="w-4 h-4" />}
            title="Your details"
            subtitle="We track who reviewed each contact so we can follow up if anything looks off."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full name" required>
                <input
                  type="text"
                  required
                  placeholder="Jane Doe"
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                />
              </Field>
              <Field label="Email address" required>
                <input
                  type="email"
                  required
                  placeholder="jane@township.gov"
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400"
                  value={reviewerEmail}
                  onChange={(e) => setReviewerEmail(e.target.value)}
                />
              </Field>
            </div>
          </Section>
        )}

        {/* Step 2 — pick township */}
        {identityConfirmed && (
        <>
        <Section
          number="2"
          icon={<MapPin className="w-4 h-4" />}
          title="Find your township"
          subtitle="Pick your region, then your county, then your township."
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-700">
                Region <span className="text-red-600">*</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowLookup(true);
                  setLookupQuery("");
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 underline"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Don&apos;t know your region?
              </button>
            </div>
            <div>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm bg-white text-gray-900"
                value={regionId}
                onChange={(e) => {
                  setRegionId(e.target.value);
                  setCountyId("");
                  setTownshipId("");
                }}
              >
                <option value="">Select a region</option>
                {(tree || []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <Field label="County" required>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                value={countyId}
                onChange={(e) => {
                  setCountyId(e.target.value);
                  setTownshipId("");
                }}
                disabled={!region}
              >
                <option value="">{region ? "Select a county" : "Pick a region first"}</option>
                {(region?.counties || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Township" required>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                value={townshipId}
                onChange={(e) => setTownshipId(e.target.value)}
                disabled={!county}
              >
                <option value="">{county ? "Select a township" : "Pick a county first"}</option>
                {(county?.townships || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.status === "completed" ? " (completed)" : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        <button
          onClick={go}
          disabled={!ready}
          className="mt-2 w-full flex items-center justify-center gap-2 bg-gray-900 text-white text-base font-semibold px-4 py-3 rounded-md hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue to my township
          <ArrowRight className="w-4 h-4" />
        </button>
        {!ready && (
          <p className="mt-3 text-xs text-gray-500 text-center">
            Fill in all the fields above to continue.
          </p>
        )}
        </>
        )}
      </div>

      {showLookup && (
        <RegionLookupModal
          tree={tree || []}
          query={lookupQuery}
          setQuery={setLookupQuery}
          onPick={(rid) => {
            setRegionId(rid);
            setCountyId("");
            setTownshipId("");
            setShowLookup(false);
          }}
          onClose={() => setShowLookup(false)}
        />
      )}
    </div>
  );
}

function RegionLookupModal({ tree, query, setQuery, onPick, onClose }) {
  // Build flat list of {county, region}
  const allCounties = tree.flatMap((r) =>
    (r.counties || []).map((c) => ({ countyName: c.name, regionName: r.name, regionId: r.id }))
  );
  const q = query.trim().toLowerCase();
  const matches = q.length === 0
    ? []
    : allCounties.filter((c) => c.countyName.toLowerCase().includes(q));

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center px-4 py-12 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-xl w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Look up your region</h2>
            <p className="text-sm text-gray-600 mt-1">
              Type your county name to see which region it belongs to.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            autoFocus
            placeholder="Type a county name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2.5 text-base text-gray-900"
          />
        </div>

        {q.length === 0 ? (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Or browse by region:</p>
            <div className="flex flex-wrap gap-2">
              {tree.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onPick(r.id)}
                  className="text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full"
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        ) : matches.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            No county found matching &ldquo;<strong>{query}</strong>&rdquo;.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100 border border-gray-200 rounded-md overflow-hidden">
            {matches.slice(0, 12).map((m, i) => (
              <li key={i}>
                <button
                  onClick={() => onPick(m.regionId)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{m.countyName} County</div>
                    <div className="text-xs text-gray-500">
                      Belongs to <span className="font-medium text-gray-700">{m.regionName}</span>
                    </div>
                  </div>
                  <span className="text-xs text-blue-700 font-medium">Use this region →</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-gray-500 mt-4 text-center">
          92 counties across 8 regions. Click a result to auto-fill the Region dropdown.
        </p>
      </div>
    </div>
  );
}

function Section({ number, icon, title, subtitle, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 sm:p-6 mb-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 text-white text-sm font-semibold flex-shrink-0">
          {number}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-gray-900">
            <span className="text-base font-semibold">{title}</span>
            <span className="text-gray-400">{icon}</span>
          </div>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}
