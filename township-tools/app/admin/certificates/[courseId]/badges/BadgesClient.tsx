"use client";

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Download, FileUp, Loader2, Printer, RotateCcw, Tag, Trash2, Upload, X } from 'lucide-react';
import { deliverLabel, renderNiimbotLabel } from '@/lib/badges/niimbot-label';
import { townshipLabel } from '@/lib/certificates/township';
import { formatCourseDates } from '@/lib/certificates/date-range';
import { easternTime, eventDays, formatEventTimes } from '@/lib/badges/attendance';

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
  badge_tagline: string | null;
  has_pin: boolean;
};

type Registrant = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  title: string | null;
  registrant_type: string | null;
  organization: string | null;
  township: string | null;
  county: string | null;
  badge_token: string;
  is_walk_in: boolean;
  day_hours: Record<string, number> | null;
  certificate_id: string | null;
};

type PreviewRow = {
  first: string;
  last: string;
  email: string;
  title: string | null;
  registrant_type: string | null;
  organization: string | null;
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
      {!course.badge_checkin_enabled && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 text-sm rounded-lg px-4 py-3">
          Tick <strong>Use badges and QR check-in for this course</strong> and click <strong>Save settings</strong>. Then
          you can import registrants here, print badges, and scan people in and out. (The orange &ldquo;Import attendees
          for certificates&rdquo; button on the course page is the old way: it issues certificates straight away and
          doesn&apos;t make badges.)
        </div>
      )}
      {course.badge_checkin_enabled && (
        <>
          <ImportCard courseId={courseId} onImported={load} />
          <RegistrantsCard course={course} registrants={registrants} onChanged={load} />
          {registrants.length > 0 && <AttendanceCard course={course} reloadKey={registrants.length} />}
          {registrants.length > 0 && <IssueCard course={course} onIssued={load} />}
        </>
      )}
    </>
  );
}

function SettingsCard({ course, onSaved }: { course: Course; onSaved: () => void }) {
  const [enabled, setEnabled] = useState(course.badge_checkin_enabled);
  const [start, setStart] = useState(hhmm(course.event_start_time));
  const [end, setEnd] = useState(hhmm(course.event_end_time));
  const [tagline, setTagline] = useState(course.badge_tagline || '');
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
        badge_tagline: tagline,
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

      <label className="text-sm block mb-4">
        <span className="block font-medium mb-1">Badge tagline</span>
        <input
          type="text"
          maxLength={80}
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Optional, e.g. Ready Today, Resilient Tomorrow"
          className={inputCls + ' w-full'}
        />
        <span className="block text-xs text-gray-500 mt-1">Printed in gold under the event name on every badge.</span>
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

      {course.badge_checkin_enabled && course.has_pin && <ScannerLink courseId={course.id} />}

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
        Title, Registrant Type, Township/County or Organization. Re-uploading updates people already on the list and keeps their badge
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
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Township / County / Org</th>
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
                    <td className="px-3 py-1.5">{r.registrant_type || <span className="text-gray-400">Attendee</span>}</td>
                    <td className="px-3 py-1.5">
                      {[townshipLabel(r.township), r.county ? `${r.county} County` : null].filter(Boolean).join(', ') || r.organization || '—'}
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

  return (
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h2 className="text-base font-bold">Registrants ({registrants.length})</h2>
        {registrants.length > 0 && (
          <Link
            href={`/admin/certificates/${course.id}/badges/print`}
            className={btn + ' bg-amber-500 text-white hover:bg-amber-600'}
          >
            <Printer className="w-4 h-4" /> Print all badges
          </Link>
        )}
      </div>
      {multiDay && (
        <p className="text-sm text-gray-500 mb-3">
          Everyone gets full credit ({Number(course.hours)} hours) unless you click <strong>Partial credit</strong>{' '}
          for someone who missed a day and enter the hours for each day they attended. Their certificate then shows
          the total of those hours.
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
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Township / County / Org</th>
                {multiDay && <th className="py-2 pr-3">Credit</th>}
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
                    {r.email ? (
                      <div className="text-xs text-gray-500">{r.email}</div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const email = window.prompt(`Email for ${r.first_name} ${r.last_name} (needed to look up their certificate):`);
                          if (email) call(r.id, { method: 'PATCH', body: JSON.stringify({ email }) });
                        }}
                        className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                      >
                        Add email
                      </button>
                    )}
                  </td>
                  <td className="py-2 pr-3">{r.title || '—'}</td>
                  <td className="py-2 pr-3">{r.registrant_type || 'Attendee'}</td>
                  <td className="py-2 pr-3">
                    {[townshipLabel(r.township), r.county ? `${r.county} County` : null].filter(Boolean).join(', ') || r.organization || '—'}
                  </td>
                  {multiDay && (
                    <td className="py-2 pr-3">
                      <PartialCreditCell
                        registrant={r}
                        days={days}
                        courseHours={Number(course.hours)}
                        busy={busy === r.id}
                        onSave={(dayHours) =>
                          call(r.id, { method: 'PATCH', body: JSON.stringify({ day_hours: dayHours }) })
                        }
                      />
                    </td>
                  )}
                  <td className="py-2 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/certificates/${course.id}/badges/print?ids=${r.id}`}
                      className="text-xs text-gray-600 dark:text-gray-300 hover:underline mr-3"
                      title="Print or reprint this person's badge"
                    >
                      Print badge
                    </Link>
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={async () => {
                        try {
                          const blob = await renderNiimbotLabel({
                            firstName: r.first_name,
                            lastName: r.last_name,
                            title: r.title,
                            township: r.township,
                            county: r.county,
                            badgeToken: r.badge_token,
                            eventName: course.name,
                          });
                          await deliverLabel(blob, `label-${r.last_name}-${r.first_name}.png`.replace(/\s+/g, '-'));
                        } catch (e: any) {
                          setError(e.message || 'Could not make the label');
                        }
                      }}
                      className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 hover:underline mr-3"
                      title="NIIMBOT 75 x 50 mm label"
                    >
                      <Tag className="w-3 h-3" /> Label
                    </button>
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

const dayLabel = (d: string) => formatCourseDates(d, null, 'short').replace(/, \d{4}$/, '');

function PartialCreditCell({
  registrant,
  days,
  courseHours,
  busy,
  onSave,
}: {
  registrant: Registrant;
  days: string[];
  courseHours: number;
  busy: boolean;
  onSave: (dayHours: Record<string, number> | null) => void;
}) {
  const saved = registrant.day_hours;
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  const startEditing = () => {
    setValues(Object.fromEntries(days.map((d) => [d, saved?.[d] != null ? String(saved[d]) : ''])));
    setEditing(true);
  };

  if (!editing) {
    if (!saved) {
      return (
        <div className="whitespace-nowrap">
          <span className="text-gray-700 dark:text-gray-300">Full credit ({courseHours} hrs)</span>
          <button type="button" disabled={busy} onClick={startEditing} className="ml-3 text-xs text-amber-700 dark:text-amber-400 hover:underline">
            Partial credit
          </button>
        </div>
      );
    }
    const total = days.reduce((sum, d) => sum + (saved[d] || 0), 0);
    return (
      <div>
        <div className="font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap">
          Partial: {Math.round(total * 10) / 10} of {courseHours} hrs
        </div>
        <div className="text-xs text-gray-500">
          {days.map((d) => `${dayLabel(d)}: ${saved[d] ?? 0}`).join(' · ')}
        </div>
        <button type="button" disabled={busy} onClick={startEditing} className="text-xs text-amber-700 dark:text-amber-400 hover:underline">
          Edit
        </button>
      </div>
    );
  }

  const total = days.reduce((sum, d) => sum + (parseFloat(values[d]) || 0), 0);
  const save = () => {
    const out: Record<string, number> = {};
    for (const d of days) {
      const n = parseFloat(values[d]);
      out[d] = Number.isFinite(n) && n > 0 ? n : 0;
    }
    onSave(out);
    setEditing(false);
  };

  return (
    <div className="space-y-2 min-w-[14rem]">
      <div className="flex flex-wrap gap-2">
        {days.map((d) => (
          <label key={d} className="text-xs">
            <span className="block text-gray-500 mb-0.5">{dayLabel(d)}</span>
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={values[d] ?? ''}
              placeholder="0"
              onChange={(e) => setValues((v) => ({ ...v, [d]: e.target.value }))}
              className={inputCls + ' w-20'}
              aria-label={`Hours attended on ${d}`}
            />
          </label>
        ))}
      </div>
      <div className="text-xs text-gray-500">Blank or 0 = did not attend that day. Total: {Math.round(total * 10) / 10} hrs</div>
      <div className="flex gap-3 text-xs">
        <button type="button" onClick={save} className="font-semibold text-amber-700 dark:text-amber-400 hover:underline">
          Save
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-gray-500 hover:underline">
          Cancel
        </button>
        {saved && (
          <button
            type="button"
            onClick={() => {
              onSave(null);
              setEditing(false);
            }}
            className="text-gray-500 hover:underline"
          >
            Back to full credit
          </button>
        )}
      </div>
    </div>
  );
}

function ScannerLink({ courseId }: { courseId: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/scan/${courseId}` : `/scan/${courseId}`;
  return (
    <div className="mt-5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm">
      <div className="font-semibold mb-1">Scanner link for door volunteers</div>
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-mono text-xs break-all">{url}</code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {}
          }}
          className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 dark:text-gray-300 hover:underline">
          Open
        </a>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Send this link and the PIN to the people scanning. They open it on their phone and unlock it once while online,
        before the event; after that it works without signal. No Township Tools login is needed.
      </p>
    </div>
  );
}

type DayAtt = { date: string; checkIn: string | null; checkOut: string | null; complete: boolean };
type AttRow = {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  township: string | null;
  is_walk_in: boolean;
  day_hours: Record<string, number> | null;
  status: 'attended' | 'review' | 'no_show';
  credit_hours: number;
  attendance: { days: DayAtt[] };
};
type Filter = 'review' | 'attended' | 'no_show' | 'all';

const STATUS_LABEL: Record<AttRow['status'], string> = { attended: 'Attended', review: 'Needs review', no_show: 'No scans' };
const STATUS_CLS: Record<AttRow['status'], string> = {
  attended: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  no_show: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

function AttendanceCard({ course, reloadKey }: { course: Course; reloadKey: number }) {
  const [rows, setRows] = useState<AttRow[] | null>(null);
  const [days, setDays] = useState<string[]>([]);
  const [filter, setFilter] = useState<Filter>('review');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; date: string; direction: 'in' | 'out' } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/certificates/courses/${course.id}/attendance`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load attendance');
      setRows(json.rows);
      setDays(json.days);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [course.id]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const counts = useMemo(() => {
    const c = { review: 0, attended: 0, no_show: 0, all: rows?.length || 0 };
    rows?.forEach((r) => (c[r.status] += 1));
    return c;
  }, [rows]);
  const shown = (rows || []).filter((r) => filter === 'all' || r.status === filter);

  const voidTime = async (r: AttRow, date: string, direction: 'in' | 'out') => {
    if (!window.confirm(`Remove ${r.first_name} ${r.last_name}'s check-${direction} on ${date}?`)) return;
    const qs = new URLSearchParams({ registrant_id: r.id, scan_date: date, direction });
    const res = await fetch(`/api/admin/certificates/courses/${course.id}/attendance?${qs}`, { method: 'DELETE' });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error || 'Could not remove');
    load();
  };

  return (
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-bold">Attendance</h2>
          <p className="text-sm text-gray-500">
            Attended = checked in and checked out on every day. Times are Eastern. Refreshes when you reopen this page.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className={btn + ' bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}>
            <RotateCcw className="w-4 h-4" /> Refresh
          </button>
          <a href={`/api/admin/certificates/courses/${course.id}/attendance/export`} className={btn + ' bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}>
            <Download className="w-4 h-4" /> Excel
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {(['review', 'attended', 'no_show', 'all'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-full border ${
              filter === f ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-300 dark:border-gray-700'
            }`}
          >
            {f === 'all' ? 'Everyone' : STATUS_LABEL[f]} ({counts[f]})
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {!rows ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-gray-500">{filter === 'review' ? 'Nothing to review.' : 'No one here.'}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800">
                <th className="py-2 pr-3">Name</th>
                {days.map((d) => (
                  <th key={d} className="py-2 pr-3 whitespace-nowrap">{formatCourseDates(d, null, 'short').replace(/, \d{4}$/, '')}</th>
                ))}
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Credit</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800 align-top">
                  <td className="py-2 pr-3">
                    <div className="font-medium">
                      {r.first_name} {r.last_name}
                      {r.is_walk_in && <span className="ml-2 text-xs text-amber-600">walk-in</span>}
                    </div>
                    <div className="text-xs text-gray-500">{[r.title, townshipLabel(r.township)].filter(Boolean).join(' · ')}</div>
                  </td>
                  {r.attendance.days.map((d) => (
                    <td key={d.date} className="py-2 pr-3 whitespace-nowrap">
                      {(['in', 'out'] as const).map((dir) => {
                        const t = dir === 'in' ? d.checkIn : d.checkOut;
                        const isEditing = editing?.id === r.id && editing.date === d.date && editing.direction === dir;
                        if (isEditing) {
                          return (
                            <ManualTimeForm
                              key={dir}
                              courseId={course.id}
                              registrantId={r.id}
                              date={d.date}
                              direction={dir}
                              defaultTime={(dir === 'in' ? course.event_start_time : course.event_end_time)?.slice(0, 5) || (dir === 'in' ? '09:00' : '16:00')}
                              onDone={() => {
                                setEditing(null);
                                load();
                              }}
                            />
                          );
                        }
                        return (
                          <div key={dir} className="flex items-center gap-1">
                            <span className="text-gray-500 w-7">{dir === 'in' ? 'In' : 'Out'}</span>
                            {t ? (
                              <>
                                <span>{easternTime(t)}</span>
                                <button type="button" onClick={() => voidTime(r, d.date, dir)} className="text-gray-400 hover:text-red-600" title="Remove this time">
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditing({ id: r.id, date: d.date, direction: dir })}
                                className={`text-xs hover:underline ${d.checkIn || d.checkOut ? 'text-amber-700 dark:text-amber-400 font-semibold' : 'text-gray-400'}`}
                              >
                                {d.checkIn || d.checkOut ? 'Missing · add' : 'add'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </td>
                  ))}
                  <td className="py-2 pr-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLS[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    {r.credit_hours} hrs{r.day_hours ? <span className="text-xs text-amber-600"> partial</span> : null}
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

function ManualTimeForm({
  courseId,
  registrantId,
  date,
  direction,
  defaultTime,
  onDone,
}: {
  courseId: string;
  registrantId: string;
  date: string;
  direction: 'in' | 'out';
  defaultTime: string;
  onDone: () => void;
}) {
  const [time, setTime] = useState(defaultTime);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/certificates/courses/${courseId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrant_id: registrantId, date, direction, time, note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      onDone();
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };
  return (
    <div className="my-1 p-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 space-y-1 w-56 whitespace-normal overflow-hidden">
      <div className="text-xs font-semibold">Manual check-{direction}</div>
      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls + ' block w-full min-w-0 box-border'} />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="How you verified (optional)" className={inputCls + ' block w-full min-w-0 box-border text-xs'} />
      {err && <div className="text-xs text-red-600">{err}</div>}
      <div className="flex gap-3 text-xs">
        <button type="button" onClick={save} disabled={busy || !time} className="font-semibold text-amber-700 hover:underline">
          Save
        </button>
        <button type="button" onClick={onDone} className="text-gray-500 hover:underline">
          Cancel
        </button>
      </div>
    </div>
  );
}

type IssuePreview = {
  course_hours: number;
  rows: { id: string; name: string; credit_hours: number; partial: boolean; issued: boolean; eligible: boolean; reason?: string }[];
};

function IssueCard({ course, onIssued }: { course: Course; onIssued: () => void }) {
  const [preview, setPreview] = useState<IssuePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const check = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/certificates/courses/${course.id}/attendance/issue`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setPreview(json);
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const issue = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/certificates/courses/${course.id}/attendance/issue`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      const parts = [`Issued ${json.issued} certificate${json.issued === 1 ? '' : 's'}`];
      if (json.linked) parts.push(`linked ${json.linked} existing`);
      if (json.failed?.length) parts.push(`${json.failed.length} failed: ${json.failed.map((f: any) => f.name).join(', ')}`);
      setMsg({ ok: !json.failed?.length, text: parts.join(' · ') + '.' });
      setPreview(null);
      onIssued();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const ready = preview?.rows.filter((r) => r.eligible) || [];
  const held = preview?.rows.filter((r) => !r.eligible && !r.issued) || [];
  const done = preview?.rows.filter((r) => r.issued) || [];

  return (
    <section className={card}>
      <h2 className="text-base font-bold mb-1">Issue certificates</h2>
      <p className="text-sm text-gray-500 mb-4">
        Certificates go to everyone who attended (full {Number(course.hours)} hours) and anyone you gave partial credit.
        People who need review are held until you fix their times or enter partial credit. You can run this again after
        fixing reviews; nobody gets two certificates. Issued certificates appear on the Attendees tab and the public
        certificate lookup.
      </p>
      {!preview ? (
        <button type="button" onClick={check} disabled={busy} className={btn + ' bg-amber-500 text-white hover:bg-amber-600'}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Check who is ready
        </button>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-4">
            <span className="text-green-700 dark:text-green-400"><strong>{ready.length}</strong> ready</span>
            <span className="text-amber-700 dark:text-amber-400"><strong>{held.length}</strong> held</span>
            <span className="text-gray-500"><strong>{done.length}</strong> already issued</span>
          </div>
          {ready.length > 0 && (
            <div>
              <div className="font-semibold mb-1">Ready</div>
              <ul className="text-gray-700 dark:text-gray-300">
                {ready.map((r) => (
                  <li key={r.id}>
                    {r.name} · {r.credit_hours} hrs{r.partial ? ' (partial)' : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {held.length > 0 && (
            <div>
              <div className="font-semibold mb-1">Held</div>
              <ul className="text-gray-700 dark:text-gray-300">
                {held.map((r) => (
                  <li key={r.id}>
                    {r.name} · <span className="text-amber-700 dark:text-amber-400">{r.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={issue} disabled={busy || !ready.length} className={btn + ' bg-amber-500 text-white hover:bg-amber-600'}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Issue {ready.length} certificate{ready.length === 1 ? '' : 's'}
            </button>
            <button type="button" onClick={() => setPreview(null)} className={btn + ' bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {msg && <p className={`text-sm mt-3 ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
    </section>
  );
}
