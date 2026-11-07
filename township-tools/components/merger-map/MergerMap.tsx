"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Lock, LogOut, Mail, MapPin, Phone, Settings, User, X } from 'lucide-react';
import { INDIANA_COUNTIES, INDIANA_VIEWBOX } from '@/lib/merger-map/indiana-counties';
import {
  formatDate,
  formatTime,
  isPast,
  scheduledInOrder,
  todayEastern,
  type CountyMeeting,
  type MapSettings,
  type MeetingStatus,
} from '@/lib/merger-map/types';

// ITA website palette (matches the AMO site pages).
const NAVY = '#2e5f7f';
const CREAM = '#FBF8EF';
const SCHEDULED = '#F47B3E';
const HELD = '#F8B996';
const PENDING = '#F7E95C';
const NONE = '#FFFFFF';

const PASS_KEY = 'ita_merger_map_passcode';
const PASS_HEADER = 'x-merger-map-passcode';

type EditStatus = MeetingStatus | 'none';

type Draft = {
  county: string;
  status: EditStatus;
  contact_name: string;
  meeting_date: string;
  meeting_time: string;
  location: string;
  notes: string;
};

export default function MergerMap({
  initialMeetings,
  initialSettings,
  loadError,
}: {
  initialMeetings: CountyMeeting[];
  initialSettings: MapSettings;
  loadError: boolean;
}) {
  const [meetings, setMeetings] = useState<CountyMeeting[]>(initialMeetings);
  const [settings, setSettings] = useState<MapSettings>(initialSettings);
  const today = useMemo(() => todayEastern(), []);

  const byCounty = useMemo(() => {
    const m = new Map<string, CountyMeeting>();
    for (const row of meetings) m.set(row.county, row);
    return m;
  }, [meetings]);

  const ordered = useMemo(() => scheduledInOrder(meetings), [meetings]);
  const orderNumber = useMemo(() => {
    const m = new Map<string, number>();
    ordered.forEach((row, i) => m.set(row.county, i + 1));
    return m;
  }, [ordered]);
  const pending = useMemo(
    () => meetings.filter((m) => m.status === 'pending').sort((a, b) => a.county.localeCompare(b.county)),
    [meetings],
  );

  // ---- hover / tap tooltip -------------------------------------------------
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ county: string; x: number; y: number } | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);

  function pointerPos(e: React.PointerEvent | React.MouseEvent) {
    const r = wrapRef.current?.getBoundingClientRect();
    return r ? { x: e.clientX - r.left, y: e.clientY - r.top } : { x: 0, y: 0 };
  }

  // ---- editor unlock -------------------------------------------------------
  const [passcode, setPasscode] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const editing = !!passcode;

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(PASS_KEY);
    } catch {}
    if (!saved) return;
    fetch('/api/merger-map/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: saved }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok) setPasscode(saved);
        else sessionStorage.removeItem(PASS_KEY);
      })
      .catch(() => {});
  }, []);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError(null);
    try {
      const r = await fetch('/api/merger-map/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: loginInput }),
      });
      const j = await r.json();
      if (j?.ok) {
        const p = loginInput.trim();
        setPasscode(p);
        try {
          sessionStorage.setItem(PASS_KEY, p);
        } catch {}
        setShowLogin(false);
        setLoginInput('');
      } else {
        setLoginError('That passcode is not correct.');
      }
    } catch {
      setLoginError('Could not check the passcode. Try again.');
    } finally {
      setLoginBusy(false);
    }
  }

  function lock() {
    setPasscode(null);
    setDraft(null);
    setSettingsDraft(null);
    try {
      sessionStorage.removeItem(PASS_KEY);
    } catch {}
  }

  // ---- county editing ------------------------------------------------------
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function openEditor(county: string) {
    const m = byCounty.get(county);
    setSaveError(null);
    setDraft({
      county,
      status: m?.status ?? 'none',
      contact_name: m?.contact_name ?? '',
      meeting_date: m?.meeting_date ?? '',
      meeting_time: m?.meeting_time ? m.meeting_time.slice(0, 5) : '',
      location: m?.location ?? '',
      notes: m?.notes ?? '',
    });
  }

  async function saveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || !passcode) return;
    setSaving(true);
    setSaveError(null);
    try {
      const r = await fetch('/api/merger-map/county', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', [PASS_HEADER]: passcode },
        body: JSON.stringify(draft),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 403) lock();
        throw new Error(j?.error || 'Save failed');
      }
      setMeetings((prev) => {
        const rest = prev.filter((m) => m.county !== draft.county);
        return j.meeting ? [...rest, j.meeting as CountyMeeting] : rest;
      });
      setDraft(null);
    } catch (err: any) {
      setSaveError(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // ---- settings editing ----------------------------------------------------
  const [settingsDraft, setSettingsDraft] = useState<MapSettings | null>(null);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settingsDraft || !passcode) return;
    setSaving(true);
    setSaveError(null);
    try {
      const r = await fetch('/api/merger-map/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', [PASS_HEADER]: passcode },
        body: JSON.stringify(settingsDraft),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 403) lock();
        throw new Error(j?.error || 'Save failed');
      }
      setSettings(j.settings);
      setSettingsDraft(null);
    } catch (err: any) {
      setSaveError(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function fillFor(county: string) {
    const m = byCounty.get(county);
    if (!m) return NONE;
    if (m.status === 'pending') return PENDING;
    return isPast(m, today) ? HELD : SCHEDULED;
  }

  const tipCounty = hover?.county ?? null;
  const pinnedMeeting = pinned ? byCounty.get(pinned) : undefined;

  return (
    <div style={{ background: CREAM, color: '#333' }} className="font-sans">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: NAVY }}>
            {settings.title}
          </h1>
          {settings.intro && (
            <p className="mt-2 text-[15px] text-gray-600 max-w-2xl mx-auto leading-relaxed whitespace-pre-line">
              {settings.intro}
            </p>
          )}
        </div>

        {loadError && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            The meeting list could not be loaded right now. Please try again later.
          </p>
        )}

        {editing && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>
              <strong>Editing on.</strong> Click any county to set its meeting. Changes go live as soon as you save.
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSaveError(null);
                  setSettingsDraft({ ...settings });
                }}
                className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-white px-3 py-1.5 font-semibold hover:bg-amber-100"
              >
                <Settings className="w-4 h-4" /> Page text &amp; contact
              </button>
              <button
                type="button"
                onClick={lock}
                className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-white px-3 py-1.5 font-semibold hover:bg-amber-100"
              >
                <LogOut className="w-4 h-4" /> Done editing
              </button>
            </span>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_300px] items-start">
          {/* Map */}
          <div
            ref={wrapRef}
            className="relative rounded-xl bg-white shadow-sm border border-black/5 p-3"
            onMouseLeave={() => setHover(null)}
          >
            <svg
              viewBox={INDIANA_VIEWBOX}
              className="w-full h-auto max-h-[80vh] mx-auto block"
              role="img"
              aria-label="Map of Indiana counties showing merger meeting status"
            >
              {INDIANA_COUNTIES.map((c) => {
                const active = tipCounty === c.name || pinned === c.name || draft?.county === c.name;
                return (
                  <path
                    key={c.fips}
                    d={c.d}
                    fill={fillFor(c.name)}
                    stroke={active ? NAVY : '#555'}
                    strokeWidth={active ? 2.2 : 0.7}
                    strokeLinejoin="round"
                    className="cursor-pointer transition-[fill] duration-150"
                    style={{ filter: active ? 'brightness(0.93)' : undefined }}
                    onMouseMove={(e) => {
                      const p = pointerPos(e);
                      setHover({ county: c.name, ...p });
                    }}
                    onClick={(e) => {
                      if (editing) {
                        openEditor(c.name);
                        return;
                      }
                      const p = pointerPos(e);
                      setHover({ county: c.name, ...p });
                      setPinned((cur) => (cur === c.name ? null : c.name));
                    }}
                  >
                    <title>{c.name}</title>
                  </path>
                );
              })}
              {/* Re-draw the active outline on top so it isn't hidden by neighbors */}
              {INDIANA_COUNTIES.filter(
                (c) => c.name === tipCounty || c.name === pinned || c.name === draft?.county,
              ).map((c) => (
                <path key={`hl-${c.fips}`} d={c.d} fill="none" stroke={NAVY} strokeWidth={2.4} pointerEvents="none" />
              ))}
              {INDIANA_COUNTIES.map((c) => (
                <text
                  key={`t-${c.fips}`}
                  x={c.cx}
                  y={c.cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  pointerEvents="none"
                  fontSize={c.name.length > 9 ? 8.5 : 10}
                  fontWeight={byCounty.has(c.name) ? 700 : 500}
                  fill="#222"
                >
                  {c.name}
                </text>
              ))}
              {INDIANA_COUNTIES.filter((c) => orderNumber.has(c.name)).map((c) => (
                <g key={`n-${c.fips}`} pointerEvents="none">
                  <circle cx={c.cx} cy={c.cy - 15} r={8} fill="#fff" stroke={NAVY} strokeWidth={1.4} />
                  <text
                    x={c.cx}
                    y={c.cy - 15}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={9.5}
                    fontWeight={700}
                    fill={NAVY}
                  >
                    {orderNumber.get(c.name)}
                  </text>
                </g>
              ))}
            </svg>

            {/* Hover tooltip (desktop) */}
            {hover && !draft && (
              <Tooltip
                x={hover.x}
                y={hover.y}
                containerWidth={wrapRef.current?.clientWidth ?? 600}
                county={hover.county}
                meeting={byCounty.get(hover.county)}
                today={today}
                editing={editing}
              />
            )}
          </div>

          {/* Side panel */}
          <aside className="space-y-4">
            {/* Tapped county details (mobile-friendly, stays put) */}
            {pinned && !editing && (
              <div className="rounded-xl bg-white shadow-sm border-2 p-4 relative" style={{ borderColor: NAVY }}>
                <button
                  type="button"
                  onClick={() => setPinned(null)}
                  className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-700"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
                <MeetingDetails county={pinned} meeting={pinnedMeeting} today={today} />
              </div>
            )}

            <div className="rounded-xl bg-white shadow-sm border border-black/5 p-4">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: NAVY }}>
                Legend
              </h2>
              <ul className="space-y-2 text-[15px]">
                <LegendRow color={SCHEDULED} label="Meeting scheduled" count={ordered.filter((m) => !isPast(m, today)).length} />
                {ordered.some((m) => isPast(m, today)) && (
                  <LegendRow color={HELD} label="Meeting held" count={ordered.filter((m) => isPast(m, today)).length} />
                )}
                <LegendRow color={PENDING} label="Not yet scheduled" count={pending.length} />
                <LegendRow color={NONE} label="No meeting planned" />
              </ul>
              <p className="mt-3 text-xs text-gray-500">
                Numbers show meeting order. Hover over or tap a county for details.
              </p>
            </div>

            <ContactCard settings={settings} />
          </aside>
        </div>

        {/* Meeting list */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-white shadow-sm border border-black/5 p-4">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3" style={{ color: NAVY }}>
              <CalendarDays className="w-5 h-5" /> Scheduled meetings
            </h2>
            {ordered.length === 0 ? (
              <p className="text-gray-500 text-[15px]">No meetings scheduled yet.</p>
            ) : (
              <ol className="space-y-2">
                {ordered.map((m, i) => (
                  <li key={m.county}>
                    <button
                      type="button"
                      onClick={() => (editing ? openEditor(m.county) : setPinned(m.county))}
                      className="w-full text-left flex gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-50"
                    >
                      <span
                        className="flex-none w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center border"
                        style={{ color: NAVY, borderColor: NAVY }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-[15px] leading-snug">
                        <strong>{m.county} County</strong>
                        {isPast(m, today) && <span className="ml-1 text-xs text-gray-500">(held)</span>}
                        <br />
                        <span className="text-gray-600">
                          {[formatDate(m.meeting_date) ?? 'Date to be announced', formatTime(m.meeting_time)]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="rounded-xl bg-white shadow-sm border border-black/5 p-4">
            <h2 className="text-lg font-bold mb-3" style={{ color: NAVY }}>
              Not yet scheduled
            </h2>
            {pending.length === 0 ? (
              <p className="text-gray-500 text-[15px]">Nothing to show.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[15px]">
                {pending.map((m) => (
                  <li key={m.county}>
                    <button
                      type="button"
                      onClick={() => (editing ? openEditor(m.county) : setPinned(m.county))}
                      className="hover:underline text-left"
                    >
                      {m.county}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Discreet editor entry */}
        {!editing && (
          <div className="mt-6 text-right">
            <button
              type="button"
              onClick={() => {
                setLoginError(null);
                setShowLogin(true);
              }}
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              <Lock className="w-3 h-3" /> Editor
            </button>
          </div>
        )}
      </div>

      {/* Passcode modal */}
      {showLogin && (
        <Modal onClose={() => setShowLogin(false)} title="Edit the map">
          <form onSubmit={unlock} className="space-y-3">
            <p className="text-sm text-gray-600">Enter the editor passcode to update meetings.</p>
            <input
              type="password"
              autoFocus
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-[15px] text-gray-900 bg-white"
              placeholder="Passcode"
            />
            {loginError && <p className="text-sm text-red-700">{loginError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowLogin(false)} className="px-4 py-2 text-sm text-gray-600">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loginBusy || !loginInput.trim()}
                className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: NAVY }}
              >
                {loginBusy ? 'Checking…' : 'Unlock'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* County editor */}
      {draft && (
        <Modal onClose={() => setDraft(null)} title={`${draft.county} County`}>
          <form onSubmit={saveDraft} className="space-y-3 text-[15px]">
            <fieldset>
              <legend className="text-sm font-semibold text-gray-700 mb-1">Status</legend>
              <div className="flex flex-col gap-1">
                {(
                  [
                    ['scheduled', 'Meeting scheduled', SCHEDULED],
                    ['pending', 'Not yet scheduled', PENDING],
                    ['none', 'No meeting planned (clear)', NONE],
                  ] as const
                ).map(([value, label, color]) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={draft.status === value}
                      onChange={() => setDraft({ ...draft, status: value })}
                    />
                    <span className="inline-block w-4 h-4 rounded-sm border border-gray-400" style={{ background: color }} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            {draft.status !== 'none' && (
              <>
                {draft.status === 'scheduled' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Date">
                      <input
                        type="date"
                        value={draft.meeting_date}
                        onChange={(e) => setDraft({ ...draft, meeting_date: e.target.value })}
                        className="input"
                      />
                    </Field>
                    <Field label="Time (ET)">
                      <input
                        type="time"
                        value={draft.meeting_time}
                        onChange={(e) => setDraft({ ...draft, meeting_time: e.target.value })}
                        className="input"
                      />
                    </Field>
                  </div>
                )}
                <Field label="Local contact (optional)">
                  <input
                    value={draft.contact_name}
                    onChange={(e) => setDraft({ ...draft, contact_name: e.target.value })}
                    className="input"
                    placeholder="e.g. Donna Schwartz"
                  />
                </Field>
                <Field label="Location (optional)">
                  <input
                    value={draft.location}
                    onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                    className="input"
                    placeholder="e.g. Noble County Public Library, Albion"
                  />
                </Field>
                <Field label="Note shown to visitors (optional)">
                  <textarea
                    rows={2}
                    value={draft.notes}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                    className="input"
                  />
                </Field>
              </>
            )}

            {saveError && <p className="text-sm text-red-700">{saveError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setDraft(null)} className="px-4 py-2 text-sm text-gray-600">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: NAVY }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Settings editor */}
      {settingsDraft && (
        <Modal onClose={() => setSettingsDraft(null)} title="Page text & contact">
          <form onSubmit={saveSettings} className="space-y-3 text-[15px]">
            <Field label="Title">
              <input
                value={settingsDraft.title}
                onChange={(e) => setSettingsDraft({ ...settingsDraft, title: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Intro text">
              <textarea
                rows={3}
                value={settingsDraft.intro ?? ''}
                onChange={(e) => setSettingsDraft({ ...settingsDraft, intro: e.target.value })}
                className="input"
              />
            </Field>
            <p className="text-sm font-semibold text-gray-700 pt-1">Who visitors should contact for details</p>
            <Field label="Name">
              <input
                value={settingsDraft.contact_name ?? ''}
                onChange={(e) => setSettingsDraft({ ...settingsDraft, contact_name: e.target.value })}
                className="input"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email">
                <input
                  type="email"
                  value={settingsDraft.contact_email ?? ''}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, contact_email: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Phone">
                <input
                  value={settingsDraft.contact_phone ?? ''}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, contact_phone: e.target.value })}
                  className="input"
                />
              </Field>
            </div>
            {saveError && <p className="text-sm text-red-700">{saveError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setSettingsDraft(null)} className="px-4 py-2 text-sm text-gray-600">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: NAVY }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 7px 10px;
          background: #fff;
          color: #111827;
        }
        .input:focus {
          outline: 2px solid ${NAVY};
          outline-offset: -1px;
        }
      `}</style>
    </div>
  );
}

function LegendRow({ color, label, count }: { color: string; label: string; count?: number }) {
  return (
    <li className="flex items-center gap-2">
      <span className="inline-block w-5 h-5 rounded border border-gray-500" style={{ background: color }} />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-gray-500 text-sm">{count}</span>}
    </li>
  );
}

function MeetingDetails({
  county,
  meeting,
  today,
}: {
  county: string;
  meeting: CountyMeeting | undefined;
  today: string;
}) {
  return (
    <div className="text-[14px] leading-snug">
      <p className="font-bold text-[16px] mb-1" style={{ color: NAVY }}>
        {county} County
      </p>
      {!meeting && <p className="text-gray-600">No merger meeting planned yet.</p>}
      {meeting?.status === 'pending' && <p className="text-gray-700">Meeting not yet scheduled.</p>}
      {meeting?.status === 'scheduled' && (
        <p className="flex items-start gap-1.5 text-gray-800">
          <CalendarDays className="w-4 h-4 mt-0.5 flex-none" />
          <span>
            {isPast(meeting, today) ? 'Held ' : ''}
            <strong>{formatDate(meeting.meeting_date) ?? 'Date to be announced'}</strong>
            {meeting.meeting_time && (
              <>
                <br />
                {formatTime(meeting.meeting_time)}
              </>
            )}
          </span>
        </p>
      )}
      {meeting?.location && (
        <p className="flex items-start gap-1.5 text-gray-700 mt-1">
          <MapPin className="w-4 h-4 mt-0.5 flex-none" />
          <span>{meeting.location}</span>
        </p>
      )}
      {meeting?.contact_name && (
        <p className="flex items-start gap-1.5 text-gray-700 mt-1">
          <User className="w-4 h-4 mt-0.5 flex-none" />
          <span>Local contact: {meeting.contact_name}</span>
        </p>
      )}
      {meeting?.notes && <p className="text-gray-600 mt-1 whitespace-pre-line">{meeting.notes}</p>}
    </div>
  );
}

function Tooltip({
  x,
  y,
  containerWidth,
  county,
  meeting,
  today,
  editing,
}: {
  x: number;
  y: number;
  containerWidth: number;
  county: string;
  meeting: CountyMeeting | undefined;
  today: string;
  editing: boolean;
}) {
  const W = 240;
  const left = Math.max(8, Math.min(x + 14, containerWidth - W - 8));
  const flipLeft = x + 14 + W > containerWidth && x - W - 14 > 8;
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-lg bg-white px-3 py-2 shadow-lg border border-gray-200 hidden md:block"
      style={{ left: flipLeft ? x - W - 14 : left, top: y + 14, width: W }}
    >
      <MeetingDetails county={county} meeting={meeting} today={today} />
      {editing && <p className="mt-1 text-xs text-amber-700 font-semibold">Click to edit</p>}
    </div>
  );
}

function ContactCard({ settings }: { settings: MapSettings }) {
  if (!settings.contact_name && !settings.contact_email && !settings.contact_phone) return null;
  return (
    <div className="rounded-xl p-4 text-white" style={{ background: NAVY }}>
      <p className="font-bold mb-1">Questions about a meeting?</p>
      <p className="text-sm text-white/85 mb-2">
        Reach out{settings.contact_name ? ` to ${settings.contact_name}` : ''} for details.
      </p>
      {settings.contact_email && (
        <a href={`mailto:${settings.contact_email}`} className="flex items-center gap-2 text-sm underline break-all">
          <Mail className="w-4 h-4 flex-none" /> {settings.contact_email}
        </a>
      )}
      {settings.contact_phone && (
        <a href={`tel:${settings.contact_phone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-2 text-sm underline mt-1">
          <Phone className="w-4 h-4 flex-none" /> {settings.contact_phone}
        </a>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="mt-10 w-full max-w-md rounded-xl bg-white p-5 shadow-xl text-gray-900">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold" style={{ color: NAVY }}>
            {title}
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
