"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, FileUp, Loader2, RotateCcw, Trash2, Upload } from 'lucide-react';
import { townshipLabel } from '@/lib/certificates/township';
import { formatCourseDates } from '@/lib/certificates/date-range';
import { eventDays, formatEventTimes } from '@/lib/badges/attendance';

type Course = {
  id: string;
  course_id: string;
  name: string;
  hours: number;
  cert_type: string;
  course_date: string;
  course_end_date: string | null;
  badge_checkin_enabled: boolean;
  event_start_time: string | null;
  event_end_time: string | null;
  has_pin: boolean;
};

type Registrant = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  title: string | null;
  township: string | null;
  county: string | null;
  is_walk_in: boolean;
  day_hours: Record<string, number> | null;
  certificate_id: string | null;
};

type PreviewRow = {
  first: string;
  last: string;
  email: string;
  title: string | null;
  township: string | null;
  county: string | null;
  row_number: number;
  issues: string[];
  inFileDuplicate: boolean;
  alreadyRegistered: boolean;
};

type Preview = {
  rows: PreviewRow[];
  summary: { total: number; new: number; alreadyRegistered: number; inFileDupes: number; missingFields: number; missingTitle: number };
};

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5';
const inputCls =
  'px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500';
const btn = 'inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg disabled:opacity-50';
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '');

export function BadgesClient({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/certificates/courses/${courseId}/badges`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setCourse(json.course);
      setRegistrants(json.registrants);
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e.message || 'Failed to load');
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loadError) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-sm rounded-lg px-4 py-3">
        {loadError}. If this is the first time using badges, make sure{' '}
        <code className="font-mono">supabase-schema-v31-badges-attendance.sql</code> has been run.
      </div>
    );
  }
  if (!course) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <>
      <SettingsCard course={course} onSaved={load} />
      {course.badge_checkin_enabled && (
        <>
          <ImportCard courseId={courseId} onImported={load} />
          <RegistrantsCard course={course} registrants={registrants} onChanged={load} />
        </>
      )}
    </>
  );
}

function SettingsCard({ course, onSaved }: { course: Course; onSaved: () => void }) {
  const [enabled, setEnabled] = useState(course.badge_checkin_enabled);
  const [start, setStart] = useState(hhmm(course.event_start_time));
  const [end, setEnd] = useState(hhmm(course.event_end_time));
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const body: Record<string, any> = {
        badge_checkin_enabled: enabled,
        event_start_time: start || null,
        event_end_time: end || null,
      };
      if (pin.trim()) body.scanner_pin = pin.trim();
      const res = await fetch(`/api/admin/certificates/courses/${course.id}/badges`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      setPin('');
      setMsg({ ok: true, text: 'Saved' });
      onSaved();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const times = formatEventTimes(course.event_start_time, course.event_end_time);

  return (
    <section className={card}>
      <h2 className="text-base font-bold mb-1">Event settings</h2>
      <p className="text-sm text-gray-500 mb-4">
        {formatCourseDates(course.course_date, course.course_end_date)}
        {times ? ` · ${times}` : ''} · All times Eastern
      </p>

      <label className="flex items-start gap-3 mb-5 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="mt-1 h-4 w-4 accent-amber-500"
        />
        <span>
          <span className="font-semibold text-sm">Use badges and QR check-in for this course</span>
          <span className="block text-xs text-gray-500">
            Off by default. Turning this on does not change existing attendees or certificates.
          </span>
        </span>
      </label>

      <div className="grid sm:grid-cols-3 gap-4">
        <label className="text-sm">
          <span className="block font-medium mb-1">Start time</span>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls + ' w-full'} />
        </label>
        <label className="text-sm">
          <span className="block font-medium mb-1">End time</span>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls + ' w-full'} />
        </label>
        <label className="text-sm">
          <span className="block font-medium mb-1">
            Scanner PIN {course.has_pin && <span className="text-green-600 font-normal">· set</span>}
          </span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder={course.has_pin ? 'Enter a new PIN to change it' : '4–12 letters or digits'}
            className={inputCls + ' w-full'}
          />
          <span className="block text-xs text-gray-500 mt-1">
            Share only with the people scanning. Changing it signs out every phone.
          </span>
        </label>
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button type="button" onClick={save} disabled={saving} className={btn + ' bg-amber-500 text-white hover:bg-amber-600'}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save settings
        </button>
        {msg && <span className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>}
      </div>
    </section>
  );
}

function ImportCard({ courseId, onImported }: { courseId: string; onImported: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (mode: 'preview' | 'commit', f: File | null = file) => {
    if (!f) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set('file', f);
      fd.set('mode', mode);
      const res = await fetch(`/api/admin/certificates/courses/${courseId}/registrants/import`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Import failed');
      if (mode === 'preview') {
        setPreview(json);
        setDone(null);
      } else {
        const w = json.written;
        setDone(
          `Added ${w.inserted_count}, updated ${w.updated_count}` +
            (w.skipped_count ? `, skipped ${w.skipped_count}` : '') +
            '.'
        );
        setPreview(null);
        setFile(null);
        if (inputRef.current) inputRef.current.value = '';
        onImported();
      }
    } catch (e: any) {
      setError(e.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <section className={card}>
      <h2 className="text-base font-bold mb-1">Import registrants</h2>
      <p className="text-sm text-gray-500 mb-4">
        Upload the AMO Excel export (same file as the certificate import). Columns used: First Name, Last Name, Email,
        Title, Township/County or Organization. Re-uploading updates people already on the list and keeps their badge
        QR codes the same.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            setFile(f);
            setPreview(null);
            setDone(null);
            if (f) submit('preview', f);
          }}
          className="text-sm"
        />
        {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
        {done && (
          <span className="inline-flex items-center gap-1 text-sm text-green-600">
            <Check className="w-4 h-4" /> {done}
          </span>
        )}
      </div>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      {preview && (
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <span><strong>{preview.summary.new}</strong> new</span>
            <span><strong>{preview.summary.alreadyRegistered}</strong> already registered (will be updated)</span>
            {preview.summary.missingFields > 0 && (
              <span className="text-red-600"><strong>{preview.summary.missingFields}</strong> with problems (skipped)</span>
            )}
            {preview.summary.inFileDupes > 0 && (
              <span className="text-amber-600"><strong>{preview.summary.inFileDupes}</strong> duplicates in file (skipped)</span>
            )}
            {preview.summary.missingTitle > 0 && (
              <span className="text-amber-600"><strong>{preview.summary.missingTitle}</strong> without a title</span>
            )}
          </div>
          <div className="max-h-80 overflow-auto border border-gray-200 dark:border-gray-800 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr className="text-left">
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Township / County</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.row_number} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-1.5 text-gray-500">{r.row_number}</td>
                    <td className="px-3 py-1.5">
                      {r.first} {r.last}
                      <div className="text-xs text-gray-500">{r.email}</div>
                    </td>
                    <td className="px-3 py-1.5">{r.title || <span className="text-amber-600">—</span>}</td>
                    <td className="px-3 py-1.5">
                      {[townshipLabel(r.township), r.county ? `${r.county} County` : null].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-3 py-1.5">
                      {r.issues.length ? (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <AlertTriangle className="w-3.5 h-3.5" /> {r.issues.join('; ')}
                        </span>
                      ) : r.inFileDuplicate ? (
                        <span className="text-amber-600">Duplicate in file</span>
                      ) : r.alreadyRegistered ? (
                        <span className="text-gray-500">Update</span>
                      ) : (
                        <span className="text-green-600">New</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => submit('commit')} disabled={loading} className={btn + ' bg-amber-500 text-white hover:bg-amber-600'}>
              <Upload className="w-4 h-4" /> Save registrants
            </button>
            <button type="button" onClick={reset} disabled={loading} className={btn + ' bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}>
              <RotateCcw className="w-4 h-4" /> Start over
            </button>
          </div>
        </div>
      )}
      {!preview && !file && !done && (
        <p className="mt-3 inline-flex items-center gap-1 text-xs text-gray-500">
          <FileUp className="w-3.5 h-3.5" /> Choosing a file shows a preview first; nothing is saved until you confirm.
        </p>
      )}
    </section>
  );
}

function RegistrantsCard({
  course,
  registrants,
  onChanged,
}: {
  course: Course;
  registrants: Registrant[];
  onChanged: () => void;
}) {
  const days = eventDays(course.course_date, course.course_end_date);
  const multiDay = days.length > 1;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const call = async (id: string, init: RequestInit, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/certificates/registrants/${id}`, {
        headers: { 'Content-Type': 'application/json' },
        ...init,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Update failed');
      onChanged();
    } catch (e: any) {
      setError(e.message || 'Update failed');
    } finally {
      setBusy(null);
    }
  };

  const saveHours = (r: Registrant, date: string, value: string) => {
    const current = r.day_hours || {};
    const prev = current[date];
    const next: Record<string, number | null> = { ...current, [date]: value === '' ? null : parseFloat(value) };
    if ((prev ?? '') === (value === '' ? '' : parseFloat(value))) return;
    call(r.id, { method: 'PATCH', body: JSON.stringify({ day_hours: next }) });
  };

  return (
    <section className={card}>
      <h2 className="text-base font-bold mb-1">Registrants ({registrants.length})</h2>
      {multiDay && (
        <p className="text-sm text-gray-500 mb-3">
          Partial credit: for someone who missed a day, enter the hours for each day they attended. Their certificate
          will show the total instead of the full {Number(course.hours)} hours. Leave blank for full credit.
        </p>
      )}
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {registrants.length === 0 ? (
        <p className="text-sm text-gray-500">No registrants yet. Import the AMO list above.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Title</th>
                <th className="py-2 pr-3">Township / County</th>
                {multiDay &&
                  days.map((d) => (
                    <th key={d} className="py-2 pr-3 whitespace-nowrap">
                      {formatCourseDates(d, null, 'short').replace(/, \d{4}$/, '')} hrs
                    </th>
                  ))}
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {registrants.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800 align-top">
                  <td className="py-2 pr-3">
                    <div className="font-medium">
                      {r.first_name} {r.last_name}
                      {r.is_walk_in && <span className="ml-2 text-xs text-amber-600">walk-in</span>}
                    </div>
                    <div className="text-xs text-gray-500">{r.email}</div>
                  </td>
                  <td className="py-2 pr-3">{r.title || '—'}</td>
                  <td className="py-2 pr-3">
                    {[townshipLabel(r.township), r.county ? `${r.county} County` : null].filter(Boolean).join(', ') || '—'}
                  </td>
                  {multiDay &&
                    days.map((d) => (
                      <td key={d} className="py-2 pr-3">
                        <input
                          type="number"
                          min={0}
                          max={24}
                          step={0.5}
                          defaultValue={r.day_hours?.[d] ?? ''}
                          placeholder="full"
                          disabled={busy === r.id}
                          onBlur={(e) => saveHours(r, d, e.target.value)}
                          className={inputCls + ' w-20'}
                          aria-label={`Hours on ${d} for ${r.first_name} ${r.last_name}`}
                        />
                      </td>
                    ))}
                  <td className="py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() =>
                        call(
                          r.id,
                          { method: 'PATCH', body: JSON.stringify({ action: 'cancel_badge' }) },
                          `Cancel ${r.first_name} ${r.last_name}'s badge? The old QR code stops working and you'll need to reprint it.`
                        )
                      }
                      className="text-xs text-gray-600 dark:text-gray-300 hover:underline mr-3"
                    >
                      Cancel badge
                    </button>
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() =>
                        call(r.id, { method: 'DELETE' }, `Remove ${r.first_name} ${r.last_name} from this event?`)
                      }
                      className="inline-flex items-center text-xs text-red-600 hover:underline"
                      title="Remove registrant"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
