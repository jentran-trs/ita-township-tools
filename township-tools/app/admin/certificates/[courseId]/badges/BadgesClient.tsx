"use client";

import Link from 'next/link';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Download, FileUp, Loader2, MoreHorizontal, Printer, RotateCcw, Search, Tag, Trash2, Upload, X } from 'lucide-react';
import { deliverLabel, renderNiimbotLabel } from '@/lib/badges/niimbot-label';
import { townshipLabel } from '@/lib/certificates/township';
import { formatCourseDates } from '@/lib/certificates/date-range';
import { easternDate, easternTime, eventDays, formatEventTimes } from '@/lib/badges/attendance';

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
  // Hours per event day for multi-day courses (v38); null = all days for full hours.
  day_hours?: Record<string, number> | null;
};

/** The course's hours per day, when set for every event day. */
function coursePlan(course: Course, days: string[]): Record<string, number> | null {
  const raw = course.day_hours;
  if (!raw || days.length < 2) return null;
  for (const d of days) if (!Number.isFinite(Number(raw[d]))) return null;
  return raw;
}

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
  balance_due: number | null;
  row_number: number;
  issues: string[];
  inFileDuplicate: boolean;
  alreadyRegistered: boolean;
};

type Preview = {
  rows: PreviewRow[];
  summary: { total: number; new: number; alreadyRegistered: number; inFileDupes: number; missingFields: number; missingTitle: number; balanceDue?: number };
};

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5';
const inputCls =
  'px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500';
const btn = 'inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg disabled:opacity-50';
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '');

type Tab = 'setup' | 'registrants' | 'attendance' | 'certificates' | 'settings';
const PAGE_SIZE = 50;

/** Lower-case text to match a search box against. */
const haystack = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' ').toLowerCase();
/** Every word typed must appear somewhere ("clay trustee" finds Clay Township trustees). */
const matches = (text: string, q: string) => q.trim().toLowerCase().split(/\s+/).every((w) => text.includes(w));

export function BadgesClient({
  courseId,
  settingsTab,
  manualHref,
  certificateCount = 0,
}: {
  courseId: string;
  // The course's own settings form, shown as the last tab.
  settingsTab?: React.ReactNode;
  // The secondary page: manual import + every issued certificate.
  manualHref?: string;
  certificateCount?: number;
}) {
  const [course, setCourse] = useState<Course | null>(null);
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [att, setAtt] = useState<{ rows: AttRow[]; days: string[] } | null>(null);
  const [attError, setAttError] = useState<string | null>(null);
  const [tab, setTabState] = useState<Tab | null>(null);
  const [attFilter, setAttFilter] = useState<Filter>('review');
  // One search shared by the Registrants and Attendance lists.
  const [query, setQuery] = useState('');

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

  const loadAtt = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/certificates/courses/${courseId}/attendance`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load attendance');
      setAtt({ rows: json.rows, days: json.days });
      setAttError(null);
    } catch (e: any) {
      setAttError(e.message);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const enabled = !!course?.badge_checkin_enabled;
  const hasPeople = registrants.length > 0;
  useEffect(() => {
    if (enabled && hasPeople) loadAtt();
  }, [enabled, hasPeople, registrants.length, loadAtt]);

  // During the event, keep the numbers live (every minute).
  const today = easternDate();
  const eventToday = !!course && eventDays(course.course_date, course.course_end_date).includes(today);
  useEffect(() => {
    if (!enabled || !hasPeople || !eventToday) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') loadAtt();
    }, 60000);
    return () => clearInterval(t);
  }, [enabled, hasPeople, eventToday, loadAtt]);

  // Remember the open tab per course (and allow #attendance-style links).
  const tabKey = `tt_badges_tab_${courseId}`;
  const setTab = (t: Tab) => {
    // Leaving Course settings: reload so saved changes (e.g. hours per day) show.
    if (tab === 'settings' && t !== 'settings') {
      load();
      loadAtt();
    }
    setTabState(t);
    try {
      localStorage.setItem(tabKey, t);
    } catch {}
  };
  useEffect(() => {
    if (!course || tab) return;
    let t: Tab | null = null;
    const hash = window.location.hash.replace('#', '') as Tab;
    if (['setup', 'registrants', 'attendance', 'certificates', 'settings'].includes(hash)) t = hash;
    if (!t) {
      try {
        t = localStorage.getItem(tabKey) as Tab | null;
      } catch {}
    }
    const needsSetup = !course.badge_checkin_enabled || !hasPeople;
    if (needsSetup && t !== 'settings') t = 'setup';
    // Hash links (#attendance) are one-off; clear so a refresh uses the remembered tab.
    if (hash) history.replaceState(null, '', window.location.pathname + window.location.search);
    setTabState(t || 'attendance');
  }, [course, tab, tabKey, hasPeople]);

  const stats = useMemo(() => {
    const rows = att?.rows || [];
    const c = { review: 0, payment: 0, attended: 0, no_show: 0, inNow: 0, outToday: 0 };
    rows.forEach((r) => {
      c[r.status] += 1;
      if (r.payment_status === 'due') c.payment += 1;
      const d = r.attendance.days.find((x) => x.date === today);
      if (d?.checkIn && !d.checkOut) c.inNow += 1;
      if (d?.checkOut) c.outToday += 1;
    });
    return { ...c, tracksPayment: rows.some((r) => r.payment_status), issued: registrants.filter((r) => r.certificate_id).length };
  }, [att, today, registrants]);

  if (loadError) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-sm rounded-lg px-4 py-3">
        {loadError}. If this is the first time using badges, make sure{' '}
        <code className="font-mono">supabase-schema-v33-badges-attendance.sql</code> has been run.
      </div>
    );
  }
  if (!course || !tab) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  const goAttendance = (f: Filter) => {
    setAttFilter(f);
    setTab('attendance');
  };
  const TABS: { id: Tab; label: string; badge?: number; disabled?: boolean }[] = [
    { id: 'setup', label: 'Setup & import' },
    { id: 'registrants', label: `Registrants (${registrants.length})`, disabled: !enabled },
    { id: 'attendance', label: 'Attendance', badge: stats.review || undefined, disabled: !enabled || !hasPeople },
    { id: 'certificates', label: 'Certificates', disabled: !enabled || !hasPeople },
    ...(settingsTab ? [{ id: 'settings' as Tab, label: 'Course settings' }] : []),
  ];

  return (
    <>
      {!enabled && certificateCount > 0 && manualHref && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-sm rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <span>
            This course has <strong>{certificateCount}</strong> certificate{certificateCount === 1 ? '' : 's'} issued by
            manual import (no badges).
          </span>
          <Link href={manualHref} className={btn + ' bg-amber-500 text-white hover:bg-amber-600'}>
            View issued certificates
          </Link>
        </div>
      )}
      {enabled && hasPeople && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatTile label="Registered" value={registrants.length} onClick={() => setTab('registrants')} />
          {eventToday ? (
            <StatTile label="Checked in now" value={stats.inNow} sub={`${stats.outToday} checked out today`} tone="blue" onClick={() => goAttendance('all')} />
          ) : (
            <StatTile label="Not scanned" value={stats.no_show} onClick={() => goAttendance('no_show')} />
          )}
          <StatTile label="Attended" value={stats.attended} tone="green" onClick={() => goAttendance('attended')} />
          <StatTile label="Needs review" value={stats.review} tone={stats.review ? 'amber' : undefined} onClick={() => goAttendance('review')} />
          {stats.tracksPayment ? (
            <StatTile label="Payment due" value={stats.payment} tone={stats.payment ? 'red' : undefined} onClick={() => goAttendance('payment')} />
          ) : (
            <StatTile label="Walk-ins" value={registrants.filter((r) => r.is_walk_in).length} onClick={() => setTab('registrants')} />
          )}
          <StatTile label="Certificates issued" value={stats.issued} onClick={() => setTab('certificates')} />
        </div>
      )}

      <div className="border-b border-gray-200 dark:border-gray-800 flex gap-1 overflow-x-auto" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            disabled={t.disabled}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px disabled:opacity-40 disabled:cursor-not-allowed ${
              tab === t.id
                ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            {t.label}
            {t.badge ? (
              <span className="ml-1.5 inline-block min-w-[1.25rem] px-1.5 rounded-full bg-amber-500 text-white text-xs">{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'setup' && (
        <>
          <SettingsCard course={course} onSaved={load} />
          {!enabled && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 text-sm rounded-lg px-4 py-3">
              Tick <strong>Use badges and QR check-in for this course</strong> and click <strong>Save settings</strong>. Then
              you can import registrants here, print badges, and scan people in and out, and issue certificates from
              attendance.{manualHref && (
                <>
                  {' '}
                  To skip badges and issue certificates straight from a list, use{' '}
                  <Link href={manualHref} className="font-semibold underline">
                    Manual import &amp; issued certificates
                  </Link>
                  .
                </>
              )}
            </div>
          )}
          {enabled && (
            <ImportCard
              courseId={courseId}
              onImported={() => {
                load();
                setTab('registrants');
              }}
            />
          )}
        </>
      )}
      {tab === 'registrants' && enabled && <RegistrantsCard course={course} registrants={registrants} onChanged={load} query={query} setQuery={setQuery} />}
      {tab === 'attendance' && enabled && hasPeople && (
        <AttendanceCard
          course={course}
          rows={att?.rows || null}
          days={att?.days || []}
          loadError={attError}
          reload={loadAtt}
          filter={attFilter}
          setFilter={setAttFilter}
          registrants={registrants}
          live={eventToday}
          query={query}
          setQuery={setQuery}
        />
      )}
      {tab === 'settings' && settingsTab}
      {tab === 'certificates' && enabled && hasPeople && (
        <IssueCard
          course={course}
          manualHref={manualHref}
          onIssued={() => {
            load();
            loadAtt();
          }}
        />
      )}
    </>
  );
}

function StatTile({
  label,
  value,
  sub,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: 'green' | 'amber' | 'red' | 'blue';
  onClick: () => void;
}) {
  const color =
    tone === 'green'
      ? 'text-green-700 dark:text-green-400'
      : tone === 'amber'
        ? 'text-amber-700 dark:text-amber-400'
        : tone === 'red'
          ? 'text-red-700 dark:text-red-400'
          : tone === 'blue'
            ? 'text-blue-700 dark:text-blue-400'
            : 'text-gray-900 dark:text-gray-100';
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 hover:border-amber-400 transition-colors"
    >
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </button>
  );
}

/** Search box + optional extra controls, used above the long lists. */
function ListToolbar({
  query,
  setQuery,
  placeholder,
  children,
}: {
  query: string;
  setQuery: (q: string) => void;
  placeholder: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <div className="relative flex-1 min-w-[14rem]">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={inputCls + ' w-full pl-9'}
        />
      </div>
      {children}
    </div>
  );
}

/** "Showing 51–100 of 312" with previous/next. Renders nothing for one page. */
function Pager({ page, setPage, total }: { page: number; setPage: (p: number) => void; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total <= PAGE_SIZE) return null;
  const from = page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  return (
    <div className="flex items-center justify-between gap-3 mt-3 text-sm">
      <span className="text-gray-500">
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setPage(page - 1)}
          disabled={page === 0}
          className={btn + ' bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        <span className="px-2 text-gray-500">
          Page {page + 1} of {pages}
        </span>
        <button
          type="button"
          onClick={() => setPage(page + 1)}
          disabled={page >= pages - 1}
          className={btn + ' bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
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
          <span className="block font-medium mb-1">Event Start Time</span>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls + ' w-full'} />
        </label>
        <label className="text-sm">
          <span className="block font-medium mb-1">Event End Time</span>
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
            pattern="[0-9]*"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder={course.has_pin ? 'Enter a new PIN to change it' : '4–8 numbers'}
            className={inputCls + ' w-full'}
          />
          <span className="block text-xs text-gray-500 mt-1">
            Numbers only. Share only with the people scanning. Changing it signs out every phone.
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
        Title, Registrant Type, Balance Due ($0 = paid), Township/County or Organization. Re-uploading updates people already on the list and keeps their badge
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
            {!!preview.summary.balanceDue && (
              <span className="text-red-600"><strong>{preview.summary.balanceDue}</strong> with a balance due</span>
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
                  <th className="px-3 py-2">Balance due</th>
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
                      {r.balance_due == null ? (
                        <span className="text-gray-400">—</span>
                      ) : r.balance_due > 0 ? (
                        <span className="text-red-600 font-semibold">${r.balance_due.toFixed(2)}</span>
                      ) : (
                        <span className="text-green-600">Paid</span>
                      )}
                    </td>
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
  query,
  setQuery,
}: {
  course: Course;
  registrants: Registrant[];
  onChanged: () => void;
  query: string;
  setQuery: (q: string) => void;
}) {
  const days = eventDays(course.course_date, course.course_end_date);
  const multiDay = days.length > 1;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const types = useMemo(
    () => Array.from(new Set(registrants.map((r) => r.registrant_type || 'Attendee'))).sort(),
    [registrants]
  );
  const filtered = useMemo(
    () =>
      registrants.filter(
        (r) =>
          (!typeFilter || (typeFilter === 'walkin' ? r.is_walk_in : (r.registrant_type || 'Attendee') === typeFilter)) &&
          (!query.trim() ||
            matches(haystack(r.first_name, r.last_name, r.email, r.title, r.registrant_type, r.organization, townshipLabel(r.township), r.county), query))
      ),
    [registrants, query, typeFilter]
  );
  useEffect(() => setPage(0), [query, typeFilter]);
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Drop selections for people who no longer exist (after a delete/reload).
  useEffect(() => {
    setSelected((cur) => {
      const ids = new Set(registrants.map((r) => r.id));
      const next = new Set(Array.from(cur).filter((id) => ids.has(id)));
      return next.size === cur.size ? cur : next;
    });
  }, [registrants]);

  // "Select all" covers everyone matching the search/filter, not just this page.
  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const toggle = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const bulkDelete = async () => {
    const n = selected.size;
    if (!n) return;
    if (
      !window.confirm(
        `Remove ${n} registrant${n === 1 ? '' : 's'} from this event?\n\nTheir badges stop working and their check-in/out records are deleted. Anyone who already has a certificate is skipped.`
      )
    )
      return;
    setBusy('bulk');
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/certificates/courses/${course.id}/registrants/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Delete failed');
      setSelected(new Set());
      setNotice(
        `Removed ${json.deleted}.` +
          (json.skipped?.length ? ` Skipped ${json.skipped.length} with certificates: ${json.skipped.join(', ')}.` : '')
      );
      onChanged();
    } catch (e: any) {
      setError(e.message || 'Delete failed');
    } finally {
      setBusy(null);
    }
  };

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
          {coursePlan(course, days) ? (
            <>
              Credit comes from attendance: each day someone checks in and out earns that day&apos;s hours (
              {days.map((d) => `${dayLabel(d)}: ${coursePlan(course, days)![d]} hrs`).join(', ')}). Click{' '}
              <strong>Partial credit</strong> to set someone&apos;s hours by hand instead.
            </>
          ) : (
            <>
              Everyone who checks in and out every day gets full credit ({Number(course.hours)} hours). Click{' '}
              <strong>Partial credit</strong> for someone who missed a day and enter the hours for each day they
              attended, or set the hours for each day in <strong>Course settings</strong> to do this automatically.
            </>
          )}
        </p>
      )}
      {registrants.length > 0 && (
        <ListToolbar query={query} setQuery={setQuery} placeholder="Search name, email, title, township, organization…">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={inputCls}>
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            <option value="walkin">Walk-ins only</option>
          </select>
          {(query || typeFilter) && (
            <span className="text-sm text-gray-500">
              {filtered.length} of {registrants.length}
            </span>
          )}
        </ListToolbar>
      )}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm">
          <span className="font-semibold">{selected.size} selected</span>
          <button
            type="button"
            onClick={bulkDelete}
            disabled={busy === 'bulk'}
            className={btn + ' bg-red-600 text-white hover:bg-red-700'}
          >
            {busy === 'bulk' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete selected
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="text-gray-600 dark:text-gray-300 hover:underline">
            Clear selection
          </button>
        </div>
      )}
      {notice && <p className="text-sm text-green-600 mb-3">{notice}</p>}
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {registrants.length === 0 ? (
        <p className="text-sm text-gray-500">No registrants yet. Import the AMO list on the Setup &amp; import tab.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500">No one matches.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800">
                <th className="py-2 pr-2 w-6">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = selected.size > 0 && !allSelected;
                    }}
                    onChange={() =>
                      setSelected((cur) => {
                        const next = new Set(cur);
                        filtered.forEach((r) => (allSelected ? next.delete(r.id) : next.add(r.id)));
                        return next;
                      })
                    }
                    aria-label={`Select all ${filtered.length} shown`}
                    title={`Select all ${filtered.length}${query || typeFilter ? ' matching' : ''}`}
                    className="h-4 w-4 accent-amber-500"
                  />
                </th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Title</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Township / County / Org</th>
                {multiDay && <th className="py-2 pr-3">Credit</th>}
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id} className={`border-b border-gray-100 dark:border-gray-800 align-top ${selected.has(r.id) ? 'bg-red-50/60 dark:bg-red-950/20' : ''}`}>
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      aria-label={`Select ${r.first_name} ${r.last_name}`}
                      className="h-4 w-4 accent-amber-500 mt-0.5"
                    />
                  </td>
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
                        plan={coursePlan(course, days)}
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
                    <RowMenu
                      items={[
                        {
                          label: 'NIIMBOT label',
                          icon: <Tag className="w-3.5 h-3.5" />,
                          onClick: async () => {
                            try {
                              const blob = await renderNiimbotLabel({
                                firstName: r.first_name,
                                lastName: r.last_name,
                                title: r.title,
                                township: r.township,
                                county: r.county,
                                organization: r.organization,
                                badgeToken: r.badge_token,
                                eventName: course.name,
                              });
                              await deliverLabel(blob, `label-${r.last_name}-${r.first_name}.png`.replace(/\s+/g, '-'));
                            } catch (e: any) {
                              setError(e.message || 'Could not make the label');
                            }
                          },
                        },
                        {
                          label: 'Copy QR text',
                          onClick: async () => {
                            try {
                              await navigator.clipboard.writeText(r.badge_token);
                              setNotice(`Copied ${r.first_name} ${r.last_name}'s QR code. Paste it into a QR code on the NIIMBOT label.`);
                            } catch {
                              window.prompt('Copy this QR code text:', r.badge_token);
                            }
                          },
                        },
                        {
                          label: 'Cancel badge',
                          onClick: () =>
                            call(
                              r.id,
                              { method: 'PATCH', body: JSON.stringify({ action: 'cancel_badge' }) },
                              `Cancel ${r.first_name} ${r.last_name}'s badge? The old QR code stops working and you'll need to reprint it.`
                            ),
                        },
                        {
                          label: 'Remove from event',
                          danger: true,
                          icon: <Trash2 className="w-3.5 h-3.5" />,
                          onClick: () => call(r.id, { method: 'DELETE' }, `Remove ${r.first_name} ${r.last_name} from this event?`),
                        },
                      ]}
                      disabled={busy === r.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} setPage={setPage} total={filtered.length} />
    </section>
  );
}

/** Small "⋯" menu for less-used row actions. */
function RowMenu({
  items,
  disabled,
}: {
  items: { label: string; onClick: () => void; icon?: React.ReactNode; danger?: boolean }[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-50"
        aria-label="More actions"
        title="More actions"
      >
        {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 ${
                it.danger ? 'text-red-600' : ''
              }`}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const dayLabel = (d: string) => formatCourseDates(d, null, 'short').replace(/, \d{4}$/, '');

function PartialCreditCell({
  registrant,
  days,
  courseHours,
  plan,
  busy,
  onSave,
}: {
  registrant: Registrant;
  days: string[];
  courseHours: number;
  plan: Record<string, number> | null;
  busy: boolean;
  onSave: (dayHours: Record<string, number> | null) => void;
}) {
  const saved = registrant.day_hours;
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  const startEditing = () => {
    setValues(Object.fromEntries(days.map((d) => [d, saved?.[d] != null ? String(saved[d]) : plan ? String(plan[d]) : ''])));
    setEditing(true);
  };

  if (!editing) {
    if (!saved) {
      return (
        <div className="whitespace-nowrap">
          <span className="text-gray-700 dark:text-gray-300">{plan ? 'From attendance' : `Full credit (${courseHours} hrs)`}</span>
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
            {plan ? 'Back to automatic' : 'Back to full credit'}
          </button>
        )}
      </div>
    </div>
  );
}

function ScannerLink({ courseId }: { courseId: string }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return (
    <div className="mt-5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm space-y-3">
      <ShareLinkRow
        title="Scanner link for the check-in team"
        url={`${origin}/scan/${courseId}`}
        note="They open it on their phone and unlock it with the PIN once while online, before the event; after that it works without signal."
      />
      <ShareLinkRow
        title="Print link for whoever prints the badges (e.g. Lydia)"
        url={`${origin}/print/${courseId}`}
        note="They open it on a computer and enter the same PIN to print the badges, with printing instructions on the page."
      />
      <p className="text-xs text-gray-500">No Township Tools login needed for either. Send the PIN separately from the link.</p>
    </div>
  );
}

function ShareLinkRow({ title, url, note }: { title: string; url: string; note: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="font-semibold mb-1">{title}</div>
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-mono text-xs break-all">{url}</code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              window.prompt('Copy this link:', url);
            }
          }}
          className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 dark:text-gray-300 hover:underline">
          Open
        </a>
      </div>
      <p className="text-xs text-gray-500 mt-1">{note}</p>
    </div>
  );
}

type DayAtt = { date: string; checkIn: string | null; checkOut: string | null; complete: boolean };
type LogEntry = {
  id: string;
  date: string;
  direction: 'in' | 'out';
  at: string;
  source: 'scan' | 'name_search' | 'manual';
  by: string | null;
  note: string | null;
  voided_at: string | null;
  voided_by: string | null;
  void_note: string | null;
};
const SOURCE_LABEL: Record<LogEntry['source'], string> = { scan: 'Badge scan', name_search: 'Name search', manual: 'Entered by hand' };
type Payment = {
  id: string;
  method: 'check' | 'card' | 'admin';
  recorded_by: string | null;
  recorded_at: string;
};
type AttRow = {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  township: string | null;
  is_walk_in: boolean;
  day_hours: Record<string, number> | null;
  status: 'attended' | 'review' | 'no_show';
  reasons: string[];
  credit_hours: number;
  cert_hours_override?: number | null;
  days_attended?: number;
  balance_due: number | null;
  payment_status: 'paid' | 'due' | null;
  payment_method: string | null;
  payment: Payment | null;
  attendance: { days: DayAtt[] };
  log?: LogEntry[];
};
type Filter = 'review' | 'payment' | 'attended' | 'no_show' | 'all';

const STATUS_LABEL: Record<AttRow['status'], string> = { attended: 'Attended', review: 'Needs review', no_show: 'No scans' };
const FILTER_LABEL: Record<Filter, string> = { review: 'Needs review', payment: 'Payment due', attended: 'Attended', no_show: 'No scans', all: 'Everyone' };
const STATUS_CLS: Record<AttRow['status'], string> = {
  attended: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  no_show: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};
const METHOD_LABEL: Record<string, string> = { check: 'Check', card: 'Credit card', admin: 'Marked by ITA', amo: 'AMO' };
const money = (n: number | null | undefined) => (n == null ? '' : `$${Number(n).toFixed(2)}`);

function AttendanceCard({
  course,
  rows,
  days,
  loadError,
  reload,
  filter,
  setFilter,
  registrants,
  live,
  query,
  setQuery,
}: {
  course: Course;
  rows: AttRow[] | null;
  days: string[];
  loadError: string | null;
  reload: () => Promise<void> | void;
  filter: Filter;
  setFilter: (f: Filter) => void;
  registrants: Registrant[];
  live: boolean;
  query: string;
  setQuery: (q: string) => void;
}) {
  const [actionError, setError] = useState<string | null>(null);
  const error = actionError || loadError;
  const [notice] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; date: string; direction: 'in' | 'out' } | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const load = reload;

  const counts = useMemo(() => {
    const c = { review: 0, payment: 0, attended: 0, no_show: 0, all: rows?.length || 0 };
    rows?.forEach((r) => {
      c[r.status] += 1;
      if (r.payment_status === 'due') c.payment += 1;
    });
    return c;
  }, [rows]);
  // Search uses the fuller registrant record (email, county, organization).
  const searchText = useMemo(() => {
    const m = new Map<string, string>();
    registrants.forEach((r) =>
      m.set(r.id, haystack(r.first_name, r.last_name, r.email, r.title, r.registrant_type, r.organization, townshipLabel(r.township), r.county))
    );
    return m;
  }, [registrants]);
  const tracksPayment = (rows || []).some((r) => r.payment_status);
  const shown = (rows || []).filter(
    (r) =>
      (filter === 'all' ? true : filter === 'payment' ? r.payment_status === 'due' : r.status === filter) &&
      (!query.trim() || matches(searchText.get(r.id) || haystack(r.first_name, r.last_name, r.title, r.township), query))
  );
  useEffect(() => setPage(0), [query, filter]);
  const pageRows = shown.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const voidTime = async (r: AttRow, date: string, direction: 'in' | 'out') => {
    const why = window.prompt(
      `Remove ${r.first_name} ${r.last_name}'s check-${direction} on ${dayLabel(date)}?\n\nWhy? (required, kept on their record)`
    );
    if (why === null) return;
    if (!why.trim()) {
      setError('Removing a time needs a reason. Nothing was changed.');
      return;
    }
    const qs = new URLSearchParams({ registrant_id: r.id, scan_date: date, direction, note: why.trim() });
    const res = await fetch(`/api/admin/certificates/courses/${course.id}/attendance?${qs}`, { method: 'DELETE' });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error || 'Could not remove');
    load();
  };

  const undoPayment = async (r: AttRow) => {
    if (!window.confirm(`Undo ${r.first_name} ${r.last_name}'s payment? They'll show as owing again, and an issued certificate goes back on hold.`)) return;
    const res = await fetch(`/api/admin/certificates/registrants/${r.id}/payment`, { method: 'DELETE' });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error || 'Could not undo');
    load();
  };

  return (
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-bold">Attendance</h2>
          <p className="text-sm text-gray-500">
            Attended = checked in and checked out on every day{tracksPayment ? ', with payment recorded' : ''}. Times are
            Eastern.{live ? ' Updates every minute during the event.' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className={btn + ' bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}>
            <RotateCcw className="w-4 h-4" /> Refresh
          </button>
          <a href={`/api/admin/certificates/courses/${course.id}/attendance/export`} className={btn + ' bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}>
            <Download className="w-4 h-4" /> Excel
          </a>
          <Link href={`/admin/certificates/${course.id}/badges/amo-checklist`} className={btn + ' bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}>
            <Printer className="w-4 h-4" /> AMO checklist
          </Link>
        </div>
      </div>

      <ListToolbar
        query={query}
        setQuery={(q) => {
          // Starting a search looks through everyone, not just the current filter.
          if (!query.trim() && q.trim()) setFilter('all');
          setQuery(q);
        }}
        placeholder="Find someone by name, email, township, organization…"
      />
      <div className="flex flex-wrap gap-1 mb-3">
        {(['review', ...(tracksPayment ? ['payment'] : []), 'attended', 'no_show', 'all'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-full border ${
              filter === f ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-300 dark:border-gray-700'
            }`}
          >
            {FILTER_LABEL[f]} ({counts[f]})
          </button>
        ))}
      </div>

      {notice && <p className="text-sm text-green-600 mb-3">{notice}</p>}
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {!rows ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-gray-500">
          {query.trim() ? `No one matches "${query.trim()}" in ${FILTER_LABEL[filter]}.` : filter === 'review' ? 'Nothing to review.' : 'No one here.'}
          {query.trim() && filter !== 'all' && (
            <button type="button" onClick={() => setFilter('all')} className="ml-2 font-semibold text-amber-700 dark:text-amber-400 hover:underline">
              Search everyone
            </button>
          )}
        </p>
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
                {tracksPayment && <th className="py-2 pr-3">Payment</th>}
                <th className="py-2">Credit</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <Fragment key={r.id}>
                <tr className="border-b border-gray-100 dark:border-gray-800 align-top">
                  <td className="py-2 pr-3">
                    <div className="font-medium">
                      {r.first_name} {r.last_name}
                      {r.is_walk_in && <span className="ml-2 text-xs text-amber-600">walk-in</span>}
                    </div>
                    <div className="text-xs text-gray-500">{[r.title, townshipLabel(r.township)].filter(Boolean).join(' · ')}</div>
                    {(r.log?.length || 0) > 0 && (() => {
                      const noted = (r.log || []).filter((e) => e.source === 'manual' || e.voided_at).length;
                      return (
                        <button
                          type="button"
                          onClick={() => setHistoryId(historyId === r.id ? null : r.id)}
                          className={`mt-1 text-xs hover:underline ${noted ? 'font-semibold text-blue-700 dark:text-blue-400' : 'text-gray-500'}`}
                        >
                          {historyId === r.id ? 'Hide history' : noted ? `History · ${noted} note${noted === 1 ? '' : 's'}` : 'History'}
                        </button>
                      );
                    })()}
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
                                {(() => {
                                  const m = (r.log || []).find((e) => !e.voided_at && e.source === 'manual' && e.date === d.date && e.direction === dir && e.at === t);
                                  return m ? (
                                    <span
                                      className="text-[10px] font-semibold uppercase px-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                                      title={`Entered by hand${m.by ? ` by ${m.by}` : ''}${m.note ? `: ${m.note}` : ''}`}
                                    >
                                      by hand
                                    </span>
                                  ) : null;
                                })()}
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
                  <td className="py-2 pr-3 min-w-[15rem]">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLS[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                    {r.status === 'review' && r.reasons.length > 0 && (
                      <ul className="mt-1 text-xs text-amber-800 dark:text-amber-300 space-y-0.5">
                        {r.reasons.map((x) => (
                          <li key={x} className="whitespace-nowrap">• {x}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  {tracksPayment && (
                    <td className="py-2 pr-3 min-w-[13rem]">
                      {payingId === r.id ? (
                        <MarkPaidForm
                          registrantId={r.id}
                          onDone={(changed) => {
                            setPayingId(null);
                            if (changed) load();
                          }}
                        />
                      ) : (
                        <PaymentCell r={r} onMarkPaid={() => setPayingId(r.id)} onUndo={() => undoPayment(r)} />
                      )}
                    </td>
                  )}
                  <td className="py-2 whitespace-nowrap">
                    {r.credit_hours} hrs
                    {r.day_hours ? (
                      <span className="text-xs text-amber-600"> partial (by hand)</span>
                    ) : r.cert_hours_override != null && days.length > 1 ? (
                      <span className="block text-xs text-amber-600">
                        {r.days_attended} of {days.length} days
                      </span>
                    ) : null}
                  </td>
                </tr>
                {historyId === r.id && (
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                    <td colSpan={days.length + 3 + (tracksPayment ? 1 : 0)} className="px-3 py-3">
                      <ScanHistory log={r.log || []} />
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} setPage={setPage} total={shown.length} />
    </section>
  );
}

/** Every check-in/out entry for one person, with who recorded it and any notes. */
function ScanHistory({ log }: { log: LogEntry[] }) {
  if (!log.length) return <p className="text-xs text-gray-500">No check-ins or check-outs yet.</p>;
  return (
    <div>
      <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Every entry (Eastern time)</div>
      <ul className="text-xs space-y-1">
        {log.map((e) => (
          <li key={e.id} className={e.voided_at ? 'text-gray-400' : ''}>
            <span className={e.voided_at ? 'line-through' : 'font-medium'}>
              {dayLabel(e.date)} · {e.direction === 'in' ? 'Check-in' : 'Check-out'} {easternTime(e.at)}
            </span>{' '}
            · {SOURCE_LABEL[e.source] || e.source}
            {e.by ? ` by ${e.by}` : ''}
            {e.note && <span className="text-blue-800 dark:text-blue-300"> · Note: {e.note}</span>}
            {e.voided_at && (
              <span className="text-red-700 dark:text-red-400">
                {' '}
                · Removed {dayLabel(easternDate(e.voided_at))} {easternTime(e.voided_at)}
                {e.voided_by ? ` by ${e.voided_by}` : ''}
                {e.void_note ? `: ${e.void_note}` : ''}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PaymentCell({ r, onMarkPaid, onUndo }: { r: AttRow; onMarkPaid: () => void; onUndo: () => void }) {
  if (!r.payment_status) return <span className="text-xs text-gray-400">Not tracked</span>;
  if (r.payment_status === 'due') {
    return (
      <div>
        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
          Due{r.balance_due ? ` ${money(r.balance_due)}` : ''}
        </span>
        <button type="button" onClick={onMarkPaid} className="ml-2 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline">
          Mark paid
        </button>
      </div>
    );
  }
  const p = r.payment;
  const method = METHOD_LABEL[p?.method || r.payment_method || 'amo'] || 'Paid';
  return (
    <div className="text-xs space-y-0.5">
      <span className="inline-block px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
        Paid · {method}
      </span>
      {p && (
        <div className="text-gray-500">
          {p.recorded_by || 'Recorded'} · {new Date(p.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })}
        </div>
      )}
      {r.payment_method !== 'amo' && (
        <button type="button" onClick={onUndo} className="text-gray-500 hover:underline">
          Undo
        </button>
      )}
    </div>
  );
}

function MarkPaidForm({ registrantId, onDone }: { registrantId: string; onDone: (changed: boolean) => void }) {
  const [method, setMethod] = useState<'admin' | 'check' | 'card'>('admin');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/certificates/registrants/${registrantId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      onDone(true);
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };
  return (
    <div className="p-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 space-y-1 w-56 whitespace-normal">
      <div className="text-xs font-semibold">Mark paid</div>
      <select value={method} onChange={(e) => setMethod(e.target.value as any)} className={inputCls + ' block w-full min-w-0 text-xs'}>
        <option value="admin">Paid (matched in AMO)</option>
        <option value="check">Paid by check</option>
        <option value="card">Paid by credit card</option>
      </select>
      {err && <div className="text-xs text-red-600">{err}</div>}
      <div className="flex gap-3 text-xs">
        <button type="button" onClick={save} disabled={busy} className="font-semibold text-amber-700 hover:underline">
          Save
        </button>
        <button type="button" onClick={() => onDone(false)} className="text-gray-500 hover:underline">
          Cancel
        </button>
      </div>
      <div className="text-[11px] text-gray-500">An issued certificate becomes downloadable right away.</div>
    </div>
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
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="How you verified (required)" className={inputCls + ' block w-full min-w-0 box-border text-xs'} />
      {err && <div className="text-xs text-red-600">{err}</div>}
      <div className="flex gap-3 text-xs">
        <button type="button" onClick={save} disabled={busy || !time || !note.trim()} className="font-semibold text-amber-700 hover:underline disabled:opacity-40">
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
  rows: {
    id: string;
    name: string;
    credit_hours: number;
    partial: boolean;
    issued: boolean;
    has_email: boolean;
    payment_due: boolean;
    eligible: boolean;
    reason?: string;
  }[];

};

function IssueCard({ course, onIssued, manualHref }: { course: Course; onIssued: () => void; manualHref?: string }) {
  const [preview, setPreview] = useState<IssuePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [force, setForce] = useState<Set<string>>(new Set());
  const [list, setList] = useState<'ready' | 'held'>('ready');
  const [query, setQuery] = useState('');

  const check = async (keepMsg = false) => {
    setBusy(true);
    if (!keepMsg) setMsg(null);
    setForce(new Set());
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
  // Load the list as soon as the tab opens.
  useEffect(() => {
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id]);

  // forceIds = held people Jen has checked herself and wants issued anyway.
  const issue = async (forceIds: string[] = []) => {
    if (forceIds.length && !window.confirm(`Issue certificates to ${forceIds.length} ${forceIds.length === 1 ? 'person who is' : 'people who are'} not ready?\n\nThey get the full ${Number(course.hours)} hours (or the partial hours you entered), even though their check-in/out isn't complete. Anyone who still owes gets theirs on payment hold.\n\nDo this only after you've checked they attended.`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/certificates/courses/${course.id}/attendance/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_ids: forceIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      const parts = [`Issued ${json.issued} certificate${json.issued === 1 ? '' : 's'}`];
      if (json.linked) parts.push(`linked ${json.linked} existing`);
      if (json.on_hold) parts.push(`${json.on_hold} on payment hold (downloadable once paid)`);
      if (json.failed?.length) parts.push(`${json.failed.length} failed: ${json.failed.map((f: any) => f.name).join(', ')}`);
      setMsg({ ok: !json.failed?.length, text: parts.join(' · ') + '.' });
      setForce(new Set());
      onIssued();
      await check(true);
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const ready = preview?.rows.filter((r) => r.eligible) || [];
  const held = preview?.rows.filter((r) => !r.eligible && !r.issued) || [];
  const done = preview?.rows.filter((r) => r.issued) || [];
  const holdNote = (r: { payment_due: boolean }) =>
    r.payment_due ? <span className="text-red-700 dark:text-red-400"> · on payment hold</span> : null;
  const source = list === 'ready' ? ready : held;
  const shown = query.trim() ? source.filter((r) => matches(r.name.toLowerCase(), query)) : source;
  const shownForceable = shown.filter((r) => r.has_email && !r.issued && !r.eligible);
  const allShownForced = shownForceable.length > 0 && shownForceable.every((r) => force.has(r.id));
  const toggleForce = (id: string) =>
    setForce((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const LISTS = [
    { id: 'ready' as const, label: 'Ready', n: ready.length, cls: 'text-green-700 dark:text-green-400' },
    { id: 'held' as const, label: 'Not ready', n: held.length, cls: 'text-amber-700 dark:text-amber-400' },
  ];

  return (
    <section className={card + ' lg:flex lg:items-start lg:gap-6'}>
      {/* Left: what happens + the buttons. Stays in view while the list scrolls. */}
      <div className="lg:w-1/3 lg:min-w-[18rem] lg:sticky lg:top-4 space-y-4 mb-5 lg:mb-0">
        <div>
          <h2 className="text-base font-bold mb-1">Issue certificates</h2>
          <p className="text-sm text-gray-500">
            <strong>Ready</strong> ={' '}
            {coursePlan(course, eventDays(course.course_date, course.course_end_date))
              ? 'checked in and out on at least one day, with no day left half-done; they get the hours for the days they attended'
              : `checked in and out every day (full ${Number(course.hours)} hours)`}
            , or given partial credit. Anyone who still owes gets theirs on <strong>payment hold</strong>: they see it in the public lookup
            with a note to complete payment, and can download it once you mark them paid. Nobody gets two certificates.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {LISTS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setList(l.id)}
              className={`rounded-lg border px-2 py-2 text-center ${list === l.id ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-gray-200 dark:border-gray-800'}`}
            >
              <div className={`text-xl font-bold ${l.cls}`}>{preview ? l.n : '–'}</div>
              <div className="text-xs text-gray-500">{l.label}</div>
            </button>
          ))}
          {manualHref ? (
            <Link
              href={manualHref}
              className="rounded-lg border border-gray-200 dark:border-gray-800 px-2 py-2 text-center hover:border-amber-400"
              title="See every issued certificate on the Manual import & issued certificates page"
            >
              <div className="text-xl font-bold text-gray-600 dark:text-gray-300">{preview ? done.length : '–'}</div>
              <div className="text-xs text-gray-500">Issued →</div>
            </Link>
          ) : (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 px-2 py-2 text-center">
              <div className="text-xl font-bold text-gray-600 dark:text-gray-300">{preview ? done.length : '–'}</div>
              <div className="text-xs text-gray-500">Issued</div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => issue()} disabled={busy || !ready.length} className={btn + ' justify-center bg-amber-500 text-white hover:bg-amber-600'}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Issue {ready.length} ready
          </button>
          {force.size > 0 && (
            <button type="button" onClick={() => issue(Array.from(force))} disabled={busy} className={btn + ' justify-center bg-[#1B2E5B] text-white hover:opacity-90'}>
              <Check className="w-4 h-4" /> Issue {force.size} selected anyway
            </button>
          )}
          <button type="button" onClick={() => check()} disabled={busy} className={btn + ' justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}>
            <RotateCcw className="w-4 h-4" /> Refresh lists
          </button>
        </div>
        {held.length > 0 && list !== 'held' && (
          <p className="text-xs text-gray-500">
            {held.length} {held.length === 1 ? 'person is' : 'people are'} not ready (missing a check-in or check-out, or
            no email). Open <strong>Not ready</strong> to see why and what you can do.
          </p>
        )}
        {preview && list === 'held' && held.length > 0 && (
          <div className="text-sm bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 rounded-lg px-4 py-3 space-y-2">
            <p>
              <strong>These people aren&apos;t ready yet.</strong> The reason is next to each name on the right. You have two options:
            </p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                <strong>Fix the record</strong> (best): add the missing check-in or check-out time on the Attendance tab,
                or give partial credit on the Registrants tab. They then move to Ready.
              </li>
              <li>
                <strong>Issue anyway:</strong> tick them and click <strong>Issue selected anyway</strong>. Use this only
                after you&apos;ve confirmed they attended. What happens:
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  <li>
                    They get a certificate for the full {Number(course.hours)} hours, or the partial hours you entered
                    for them.
                  </li>
                  <li>Their check-in/out records aren&apos;t changed, so the gap still shows on the Attendance tab.</li>
                  <li>If they still owe, the certificate is on payment hold until you mark them paid.</li>
                  <li>They can look it up right away. You can revoke it later on the Manual import page.</li>
                </ul>
              </li>
            </ol>
            <p className="text-xs">People with no email can&apos;t be ticked. Add their email on the Registrants tab first.</p>
          </div>
        )}
        {msg && <p className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
        {manualHref && (
          <p className="text-xs text-gray-500 border-t border-gray-200 dark:border-gray-800 pt-3">
            To download, edit or revoke a certificate, or add someone by hand, open{' '}
            <Link href={manualHref} className="font-semibold text-amber-700 dark:text-amber-400 hover:underline">
              Manual import &amp; issued certificates
            </Link>
            .
          </p>
        )}
      </div>

      {/* Right: one list at a time, searchable, scrolls on its own. */}
      <div className="lg:flex-1 lg:min-w-0">
        <ListToolbar query={query} setQuery={setQuery} placeholder={`Search ${LISTS.find((l) => l.id === list)!.label.toLowerCase()} by name…`}>
          {list === 'held' && shownForceable.length > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allShownForced}
                onChange={() =>
                  setForce((cur) => {
                    const next = new Set(cur);
                    shownForceable.forEach((r) => (allShownForced ? next.delete(r.id) : next.add(r.id)));
                    return next;
                  })
                }
                className="h-4 w-4 accent-amber-500"
              />
              Select all {shownForceable.length}
            </label>
          )}
        </ListToolbar>
        {!preview ? (
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking who is ready…
          </p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-gray-500">
            {query.trim() ? 'No one matches.' : list === 'ready' ? 'No one is ready right now.' : 'Everyone else is issued or ready.'}
          </p>
        ) : (
          <ul className="text-sm divide-y divide-gray-100 dark:divide-gray-800 max-h-[65vh] overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-lg">
            {shown.map((r) => (
              <li key={r.id} className="flex items-start gap-2 px-3 py-2">
                {list === 'held' && (
                  <input
                    type="checkbox"
                    disabled={!r.has_email}
                    checked={force.has(r.id)}
                    onChange={() => toggleForce(r.id)}
                    aria-label={`Select ${r.name}`}
                    title={r.has_email ? 'Select to issue anyway' : 'Add an email first (Registrants tab)'}
                    className="h-4 w-4 mt-0.5 accent-amber-500 disabled:opacity-40"
                  />
                )}
                <span className="flex-1">
                  <span className="font-medium">{r.name}</span>
                  {list === 'held' ? (
                    <span className="text-amber-700 dark:text-amber-400"> · {r.reason}</span>
                  ) : (
                    <span className="text-gray-500">
                      {' '}
                      · {r.credit_hours} hrs{r.partial ? ' (partial)' : ''}
                    </span>
                  )}
                  {holdNote(r)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {preview && shown.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            {shown.length} {shown.length === 1 ? 'person' : 'people'}
            {query.trim() ? ' match' : ''} · in last-name order
          </p>
        )}
      </div>
    </section>
  );
}
