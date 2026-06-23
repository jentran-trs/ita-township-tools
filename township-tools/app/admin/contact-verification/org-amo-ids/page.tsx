"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  FileUp,
  Loader2,
  ShieldAlert,
  Upload,
} from "lucide-react";

type Summary = {
  org_rows: number;
  townships: number;
  matched: number;
  will_update: number;
  already_set: number;
  ambiguous: number;
  unmatched: number;
};

export default function OrgAmoIdAssignPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [result, setResult] = useState<{ updated_count: number; failed_count: number; summary: Summary } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/contact-verification/auth")
      .then((r) => r.json())
      .then((j) => setAuthorized(!!j.ok))
      .catch(() => setAuthorized(false));
  }, []);

  const submit = async (mode: "preview" | "commit") => {
    if (!file) return setError("Choose the AMO Organization Report file first.");
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("mode", mode);
      const res = await fetch("/api/admin/contact-verification/org-amo-ids", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      if (mode === "preview") {
        setSummary(json.summary);
        setResult(null);
      } else {
        setResult(json);
        setSummary(null);
      }
    } catch (e: any) {
      setError(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setSummary(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link
            href="/admin/contact-verification"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Contact Verification
          </Link>
          <h1 className="text-xl font-bold">Assign Organization AMO IDs</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {authorized === false && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 rounded-xl p-6 flex items-start gap-2">
            <ShieldAlert className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              Superadmin access required. Open{" "}
              <Link href="/admin/contact-verification" className="underline font-medium">
                Contact Verification
              </Link>{" "}
              and sign in first, then come back.
            </div>
          </div>
        )}

        {authorized && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Upload the AMO <strong>Organization Report</strong> export. Each township is matched by
              organization name (&ldquo;Vernon Township, Hancock County&rdquo;) and assigned its AMO
              Organization ID. The ID is then included in contact exports so re-imported individuals
              attach to the existing organization instead of creating a duplicate. Preview first —
              committing only updates townships whose ID changes.
            </p>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-sm rounded-lg px-4 py-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>{error}</div>
              </div>
            )}

            {result ? (
              <section className="bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-900 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-semibold">Done</h2>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1 mb-4">
                  <div>
                    Updated <strong>{result.updated_count}</strong> township
                    {result.updated_count === 1 ? "" : "s"} with an Organization AMO ID.
                  </div>
                  {result.failed_count > 0 && (
                    <div className="text-red-600">{result.failed_count} failed to update.</div>
                  )}
                  <div className="text-gray-500">
                    {result.summary.already_set} already had the correct ID · {result.summary.unmatched}{" "}
                    not in the report · {result.summary.ambiguous} ambiguous (left alone).
                  </div>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Assign from another file
                </button>
              </section>
            ) : (
              <>
                <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center bg-gray-50/50 dark:bg-gray-900/30"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files?.[0];
                      if (f) setFile(f);
                    }}
                  >
                    <FileUp className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                    {file ? (
                      <div>
                        <div className="font-medium">{file.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Drag and drop the AMO <strong>.xlsx</strong> here, or
                      </div>
                    )}
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <Upload className="w-4 h-4" />
                        Choose file
                      </button>
                      {file && (
                        <button
                          type="button"
                          onClick={reset}
                          className="ml-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".xlsx"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setFile(f);
                      }}
                    />
                  </div>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => submit("preview")}
                      disabled={!file || loading}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                    >
                      {loading && !summary ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                      Preview matches
                    </button>
                  </div>
                </section>

                {summary && (
                  <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                    <h2 className="font-semibold mb-3">Preview</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-4">
                      <Stat label="Report rows" value={summary.org_rows} />
                      <Stat label="Townships" value={summary.townships} />
                      <Stat label="Matched" value={summary.matched} tone="green" />
                      <Stat label="Will update" value={summary.will_update} tone="green" />
                      <Stat label="Already correct" value={summary.already_set} />
                      <Stat label="Ambiguous" value={summary.ambiguous} tone={summary.ambiguous ? "amber" : "neutral"} />
                      <Stat label="Not in report" value={summary.unmatched} tone={summary.unmatched ? "amber" : "neutral"} />
                    </div>
                    <p className="text-xs text-gray-500 mb-4">
                      Townships are matched on organization name. Ambiguous (same name, different ID)
                      and not-in-report townships are left unchanged.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => submit("commit")}
                        disabled={loading || summary.will_update === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Assign {summary.will_update} Organization AMO ID{summary.will_update === 1 ? "" : "s"}
                      </button>
                      <button
                        type="button"
                        onClick={reset}
                        className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        Start over
                      </button>
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "green" | "amber" }) {
  const cls = {
    neutral: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
    green: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300",
    amber: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
  }[tone];
  return (
    <div className={`rounded-lg px-3 py-2 ${cls}`}>
      <div className="text-xl font-extrabold tabular-nums">{value}</div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
  );
}
