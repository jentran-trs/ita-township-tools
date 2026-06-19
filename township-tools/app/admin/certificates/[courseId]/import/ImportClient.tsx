"use client";

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, FileUp, Loader2, RotateCcw, Upload } from 'lucide-react';
import { townshipLabel } from '@/lib/certificates/township';

type ParsedRow = {
  first: string;
  last: string;
  email: string;
  township: string | null;
  county: string | null;
  row_number: number;
  issues: string[];
  inFileDuplicate: boolean;
  alreadyIssued: boolean;
};

type PreviewResponse = {
  ok: boolean;
  mode: 'preview';
  course: { id: string; course_id: string; name: string };
  rows: ParsedRow[];
  summary: { total: number; valid: number; inFileDupes: number; alreadyIssued: number; missingFields: number };
};

type CommitResponse = {
  ok: boolean;
  mode: 'commit';
  written: { inserted_count: number; skipped_count: number; reissued_count: number; updated_count: number };
  inserted: { id: string; credential_id: string; email: string }[];
  skipped: { row_number: number; reason: string }[];
};

export function ImportClient({ courseId, courseLabel }: { courseId: string; courseLabel: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [result, setResult] = useState<CommitResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dupePolicy, setDupePolicy] = useState<'skip' | 'reissue' | 'update'>('skip');

  const submit = async (mode: 'preview' | 'commit') => {
    if (!file) return setError('Pick a file first.');
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      fd.set('mode', mode);
      fd.set('dupePolicy', dupePolicy);
      const res = await fetch(`/api/admin/certificates/courses/${courseId}/import`, {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Import failed');
      if (mode === 'preview') {
        setPreview(json);
        setResult(null);
      } else {
        setResult(json);
        setPreview(null);
        // Invalidate the cached course page so the attendee list is fresh when
        // the superadmin returns to it (preserves this result view's state).
        router.refresh();
      }
    } catch (e: any) {
      setError(e.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const onReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-sm rounded-lg px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {result ? (
        <CommitResult
          result={result}
          onDone={() => {
            router.push(`/admin/certificates/${courseId}`);
            router.refresh(); // ensure the attendee list reflects the import
          }}
          onAgain={onReset}
        />
      ) : (
        <>
          {/* Upload card */}
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
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Drag and drop your <strong>.xlsx</strong> or <strong>.csv</strong> here, or
                  </div>
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
                    onClick={onReset}
                    className="ml-2 inline-flex items-center gap-2 px-3 py-2 text-sm bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  >
                    Clear
                  </button>
                )}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
              />
            </div>

            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <button
                type="button"
                onClick={() => submit('preview')}
                disabled={!file || loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                {loading && !preview ? 'Parsing…' : 'Preview rows'}
              </button>

              <label className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 flex-wrap">
                <span>If a person in this file already has a certificate for this course:</span>
                <select
                  value={dupePolicy}
                  onChange={(e) => setDupePolicy(e.target.value as any)}
                  className="px-2 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md"
                >
                  <option value="skip">Keep their existing certificate</option>
                  <option value="update">Update township/county (keep same certificate &amp; ID)</option>
                  <option value="reissue">Replace it with a new certificate</option>
                </select>
              </label>
            </div>
          </section>

          {preview && (
            <PreviewBlock
              preview={preview}
              dupePolicy={dupePolicy}
              loading={loading}
              onCommit={() => submit('commit')}
              onReset={onReset}
            />
          )}
        </>
      )}
    </div>
  );
}

function PreviewBlock({
  preview,
  dupePolicy,
  loading,
  onCommit,
  onReset,
}: {
  preview: PreviewResponse;
  dupePolicy: 'skip' | 'reissue' | 'update';
  loading: boolean;
  onCommit: () => void;
  onReset: () => void;
}) {
  const { rows, summary } = preview;

  return (
    <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Preview</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Review the list before importing.{' '}
            {dupePolicy === 'skip'
              ? 'People who already have a certificate for this course will be left as-is.'
              : dupePolicy === 'update'
              ? 'People who already have a certificate keep it (same ID) — only their township/county is refreshed from this file.'
              : 'People who already have a certificate will get a fresh one; their old certificate becomes invalid.'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <Pill label="Total rows" value={summary.total} />
          <Pill label="Ready to issue" value={summary.valid} tone="green" />
          <Pill label="Missing info" value={summary.missingFields} tone={summary.missingFields ? 'red' : 'neutral'} />
          <Pill label="Repeats in file" value={summary.inFileDupes} tone={summary.inFileDupes ? 'amber' : 'neutral'} />
          <Pill label="Already have one" value={summary.alreadyIssued} tone={summary.alreadyIssued ? 'amber' : 'neutral'} />
        </div>
      </div>

      {/* Action bar: Issue + Start over sit ABOVE the table so the
          superadmin doesn't have to scroll past a long roster to commit. */}
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 flex items-center justify-between flex-wrap gap-2">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <RotateCcw className="w-4 h-4" />
          Start over
        </button>
        {(() => {
          const acted = summary.valid + (dupePolicy === 'skip' ? 0 : summary.alreadyIssued);
          const verb = dupePolicy === 'update' ? 'Update' : 'Issue';
          return (
            <button
              type="button"
              onClick={onCommit}
              disabled={loading || acted === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {verb} {acted} certificate{acted === 1 ? '' : 's'}
            </button>
          );
        })()}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/60 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-3 py-2">Row</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r, i) => (
              <tr key={i} className={r.issues.length || r.inFileDuplicate ? 'bg-red-50/30 dark:bg-red-950/10' : r.alreadyIssued ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}>
                <td className="px-3 py-2 text-gray-500 text-xs">{r.row_number}</td>
                <td className="px-3 py-2">
                  {r.first} {r.last}
                </td>
                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.email || '—'}</td>
                <td className="px-3 py-2 text-gray-500">
                  {[townshipLabel(r.township), r.county && `${r.county} County`].filter(Boolean).join(', ') || '—'}
                </td>
                <td className="px-3 py-2">
                  {r.issues.length ? (
                    <Tag tone="red" label={r.issues.join('; ')} />
                  ) : r.inFileDuplicate ? (
                    <Tag tone="red" label="Same person appears earlier in this file" />
                  ) : r.alreadyIssued ? (
                    <Tag
                      tone="amber"
                      label={
                        dupePolicy === 'skip'
                          ? 'Already has a certificate — will skip'
                          : dupePolicy === 'update'
                          ? 'Already has a certificate — will update township/county'
                          : 'Already has a certificate — will replace'
                      }
                    />
                  ) : (
                    <Tag tone="green" label="Ready to issue" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CommitResult({
  result,
  onDone,
  onAgain,
}: {
  result: CommitResponse;
  onDone: () => void;
  onAgain: () => void;
}) {
  return (
    <section className="bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-900 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-3">
        <Check className="w-5 h-5 text-emerald-600" />
        <h2 className="text-lg font-semibold">Import complete</h2>
      </div>
      <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1 mb-4">
        {result.written.inserted_count > 0 && (
          <div>
            Issued <strong>{result.written.inserted_count}</strong> new certificate
            {result.written.inserted_count === 1 ? '' : 's'}.
          </div>
        )}
        {result.written.updated_count > 0 && (
          <div>
            Updated <strong>{result.written.updated_count}</strong> existing certificate
            {result.written.updated_count === 1 ? '' : 's'} (same credential ID).
          </div>
        )}
        {result.written.reissued_count > 0 && (
          <div>Re-issued <strong>{result.written.reissued_count}</strong> existing.</div>
        )}
        {result.written.skipped_count > 0 && (
          <div className="text-gray-500">Skipped {result.written.skipped_count} row{result.written.skipped_count === 1 ? '' : 's'}.</div>
        )}
        {result.written.inserted_count === 0 &&
          result.written.updated_count === 0 &&
          result.written.reissued_count === 0 && (
            <div className="text-gray-500">No certificates were created or changed.</div>
          )}
      </div>
      {result.skipped.length > 0 && (
        <details className="mb-4">
          <summary className="text-sm cursor-pointer text-gray-600 dark:text-gray-400">
            Show skipped row details
          </summary>
          <ul className="mt-2 text-xs space-y-0.5 max-h-48 overflow-auto">
            {result.skipped.map((s, i) => (
              <li key={i}>
                Row {s.row_number}: {s.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDone}
          className="px-4 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600"
        >
          Back to course
        </button>
        <button
          type="button"
          onClick={onAgain}
          className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          Import another file
        </button>
      </div>
    </section>
  );
}

function Tag({ tone, label }: { tone: 'green' | 'amber' | 'red'; label: string }) {
  const cls = {
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  }[tone];
  return <span className={`inline-block px-2 py-0.5 rounded text-xs ${cls}`}>{label}</span>;
}

function Pill({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'green' | 'amber' | 'red' }) {
  const cls = {
    neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${cls}`}>
      <span className="opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}
