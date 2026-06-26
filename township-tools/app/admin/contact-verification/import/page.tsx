"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganization, useAuth, useUser } from "@clerk/nextjs";
import { ArrowLeft, Upload, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

const SUGGESTED_REGIONS = [
  "Central Area",
  "East Central",
  "Marion",
  "North East",
  "North West",
  "South East",
  "South West",
  "West Central",
];

type ImportSummary = {
  region: string;
  counties: number;
  townships: number;
  contacts: number;
  counties_detail: { name: string; townships: number; contacts: number }[];
};

export default function ImportPage() {
  const router = useRouter();
  const { isLoaded } = useUser();
  const { membership } = useOrganization();
  const { orgRole } = useAuth();
  const isAdmin = membership?.role === "org:admin" || orgRole === "org:admin";

  const [file, setFile] = useState<File | null>(null);
  const [regionName, setRegionName] = useState("");
  const [busy, setBusy] = useState<"" | "preview" | "commit">("");
  const [preview, setPreview] = useState<ImportSummary | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

  const upload = async (dryRun: boolean) => {
    if (!file || !regionName) {
      setError("File and region name are both required.");
      return;
    }
    setError(null);
    setBusy(dryRun ? "preview" : "commit");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("regionName", regionName);
      fd.append("dryRun", dryRun ? "true" : "false");
      const res = await fetch("/api/admin/contact-verification/import", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      if (dryRun) {
        setPreview(json.summary);
        setResult(null);
      } else {
        setResult(json);
        setPreview(null);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  if (!isLoaded || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <button
          onClick={() => router.push("/admin/contact-verification")}
          className="inline-flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-950 hover:border-gray-400 dark:hover:border-gray-600 hover:text-gray-900 dark:hover:text-gray-100 shadow-sm mb-6"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Contact Verification
        </button>

        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Import region xlsx</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
          Upload one of the regional Contact Verification spreadsheets. Existing contacts will be preserved;
          new contacts in the file will be inserted. Run a preview first to confirm the parse looks right.
        </p>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Region name</label>
            <input
              list="region-suggestions"
              type="text"
              value={regionName}
              onChange={(e) => setRegionName(e.target.value)}
              placeholder="e.g. Central Area"
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm"
            />
            <datalist id="region-suggestions">
              {SUGGESTED_REGIONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Spreadsheet</label>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-700 dark:text-gray-300"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md p-3 text-sm text-red-800 dark:text-red-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => upload(true)}
              disabled={!file || !regionName || busy !== ""}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-950 disabled:opacity-50"
            >
              {busy === "preview" ? "Parsing..." : "Preview"}
            </button>
            <button
              onClick={() => upload(false)}
              disabled={!file || !regionName || busy !== ""}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 dark:bg-gray-700 text-white rounded-md hover:bg-gray-800 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {busy === "commit" ? "Importing..." : "Import"}
            </button>
          </div>
        </div>

        {preview && (
          <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Preview</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {preview.counties} counties, {preview.townships} townships, {preview.contacts} contacts found.
            </p>
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="pb-2 font-medium">County</th>
                  <th className="pb-2 text-right font-medium">Townships</th>
                  <th className="pb-2 text-right font-medium">Contacts</th>
                </tr>
              </thead>
              <tbody className="text-gray-900 dark:text-gray-100">
                {preview.counties_detail.map((c) => (
                  <tr key={c.name} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="py-2">{c.name}</td>
                    <td className="py-2 text-right">{c.townships}</td>
                    <td className="py-2 text-right">{c.contacts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && (
          <div className="mt-6 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-700 dark:text-green-300" />
              <h2 className="text-base font-semibold text-green-900 dark:text-green-200">Import complete</h2>
            </div>
            <ul className="text-sm text-green-900 dark:text-green-200 space-y-1">
              <li>{result.written.upsertedCounties} counties processed</li>
              <li>{result.written.upsertedTownships} townships processed</li>
              <li>{result.written.insertedContacts} new contacts inserted</li>
              <li>{result.written.skippedExistingContacts} existing contacts preserved</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
