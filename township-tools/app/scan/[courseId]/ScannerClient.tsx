"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, CheckCircle2, CloudOff, LogIn, LogOut, RefreshCw, Search, UserPlus, X, XCircle, AlertTriangle, Tag } from 'lucide-react';
import { easternDate, easternTime } from '@/lib/badges/attendance';
import { isBadgeToken } from '@/lib/badges/token';
import { townshipLabel } from '@/lib/certificates/township';
import { badgeNumberLabel } from '@/lib/badges/badge-numbers';
import { formatCourseDates } from '@/lib/certificates/date-range';
import { deliverLabel, renderNiimbotLabel } from '@/lib/badges/niimbot-label';
import { DoorPayment, PaymentSheet } from './PaymentFields';
import {
  ScannerState,
  RosterPerson,
  ScanRecord,
  WalkInRecord,
  PaymentRecord,
  emptyState,
  loadState,
  mergeServer,
  randomBadgeToken,
  randomId,
  saveState,
} from '@/lib/badges/scanner-store';

type Info = { id: string; name: string; dates: string; times: string | null; scanning_open: boolean };
type Phase = 'loading' | 'notfound' | 'closed' | 'pin' | 'scan';
type Mode = 'in' | 'out';
type Result = { kind: 'ok' | 'warn' | 'error'; title: string; detail?: string; at: number; undoScanId?: string };

const SYNC_EVERY_MS = 15_000;

export function ScannerClient({ courseId }: { courseId: string }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [info, setInfo] = useState<Info | null>(null);
  const [state, setStateRaw] = useState<ScannerState>(emptyState);
  const stateRef = useRef(state);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const setState = useCallback(
    (fn: (s: ScannerState) => ScannerState) => {
      const next = fn(stateRef.current);
      stateRef.current = next;
      saveState(courseId, next);
      setStateRaw(next);
    },
    [courseId]
  );

  const fetchRoster = useCallback(async (): Promise<'ok' | 'pin' | 'offline' | 'closed'> => {
    try {
      const res = await fetch(`/api/scan/${courseId}/roster`, { cache: 'no-store', credentials: 'same-origin' });
      if (res.status === 401) return 'pin';
      if (res.status === 409) return 'closed';
      if (!res.ok) return 'offline';
      const json = await res.json();
      setState((s) => mergeServer(s, json));
      setOnline(true);
      return 'ok';
    } catch {
      setOnline(false);
      return 'offline';
    }
  }, [courseId, setState]);

  // Payments (method only) upload after their person exists on the server.
  // Returns false when the phone is offline or signed out, so the rest wait.
  const syncPayments = useCallback(async (): Promise<boolean> => {
    for (const pay of stateRef.current.pendingPayments || []) {
      try {
        const res = await fetch(`/api/scan/${courseId}/payments`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pay),
        });
        if (res.status === 401) {
          setPhase('pin');
          return false;
        }
        const json = await res.json().catch(() => ({}));
        if (!res.ok && !json.rejected) throw new Error(json.error || 'Upload failed');
        if (json.rejected) setSyncError('A payment could not be saved (person removed from the event).');
        setState((cur) => ({ ...cur, pendingPayments: cur.pendingPayments.filter((x) => x.client_payment_id !== pay.client_payment_id) }));
      } catch {
        setOnline(false);
        return false;
      }
    }
    return true;
  }, [courseId, setState]);

  const sync = useCallback(async () => {
    const s = stateRef.current;
    if (!s.pendingScans.length && !s.pendingWalkIns.length && !(s.pendingVoids || []).length) {
      // Nothing else to send; upload any payments, then refresh the roster so
      // walk-ins and payments from other phones show up.
      if ((s.pendingPayments || []).length) {
        setSyncing(true);
        const ok = await syncPayments();
        setSyncing(false);
        if (!ok) return;
      }
      const r = await fetchRoster();
      if (r === 'pin') setPhase('pin');
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch(`/api/scan/${courseId}/sync`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walk_ins: s.pendingWalkIns, scans: s.pendingScans, voids: s.pendingVoids || [] }),
      });
      if (res.status === 401) {
        setPhase('pin');
        return;
      }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Upload failed');
      const json = await res.json();
      // Accepted and rejected items both leave the queue; rejected ones would
      // fail forever (e.g. a person removed by the admin).
      const sentScans = new Set(s.pendingScans.map((x) => x.client_scan_id));
      const sentWalkIns = new Set(s.pendingWalkIns.map((x) => x.id));
      const sentVoids = new Set((s.pendingVoids || []).map((x) => x.client_scan_id));
      setState((cur) => ({
        ...cur,
        pendingVoids: (cur.pendingVoids || []).filter((x) => !sentVoids.has(x.client_scan_id)),
        pendingScans: cur.pendingScans.filter((x) => !sentScans.has(x.client_scan_id)),
        pendingWalkIns: cur.pendingWalkIns.filter((x) => !sentWalkIns.has(x.id)),
      }));
      setSyncError(json.rejected?.length ? `${json.rejected.length} item(s) could not be saved` : null);
      setOnline(true);
      // Walk-ins exist on the server now, so their payments can follow.
      await syncPayments();
      await fetchRoster();
    } catch {
      // Network down: keep everything queued and try again shortly.
      setOnline(false);
    } finally {
      setSyncing(false);
    }
  }, [courseId, fetchRoster, setState, syncPayments]);

  // Let the scanner page itself open with no signal after the first visit.
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/scan-sw.js', { scope: '/scan/' }).catch(() => {});
    }
  }, []);

  // Boot: event info, then the saved roster (works offline), then refresh.
  useEffect(() => {
    const saved = loadState(courseId);
    stateRef.current = saved;
    setStateRaw(saved);
    (async () => {
      let i: Info | null = null;
      try {
        const res = await fetch(`/api/scan/${courseId}`, { cache: 'no-store' });
        if (res.status === 404) return setPhase('notfound');
        if (res.ok) i = await res.json();
      } catch {}
      if (i) {
        setInfo(i);
        if (!i.scanning_open) return setPhase('closed');
      }
      if (!saved.event) {
        if (!i) setOnline(false);
        return setPhase('pin');
      }
      const r = await fetchRoster();
      if (r === 'pin') setPhase('pin');
      else if (r === 'closed') setPhase('closed');
      else setPhase('scan');
    })();
  }, [courseId, fetchRoster]);

  // Background upload while scanning.
  useEffect(() => {
    if (phase !== 'scan') return;
    sync();
    const t = setInterval(sync, SYNC_EVERY_MS);
    const onOnline = () => sync();
    window.addEventListener('online', onOnline);
    return () => {
      clearInterval(t);
      window.removeEventListener('online', onOnline);
    };
  }, [phase, sync]);

  // Upload new scans right away (debounced) instead of waiting for the timer.
  const pendingCount =
    state.pendingScans.length + state.pendingWalkIns.length + (state.pendingPayments || []).length + (state.pendingVoids || []).length;
  useEffect(() => {
    if (phase !== 'scan' || !pendingCount) return;
    const t = setTimeout(sync, 800);
    return () => clearTimeout(t);
  }, [phase, pendingCount, sync]);

  if (phase === 'loading') return <Shell><p className="text-center text-gray-500 py-20">Loading…</p></Shell>;
  if (phase === 'notfound') return <Shell><Notice title="Event not found" body="Check the scanner link with the event organizer." /></Shell>;
  if (phase === 'closed')
    return (
      <Shell title={info?.name}>
        <Notice title="Scanning is off for this event" body="The organizer hasn't turned on check-in or set a PIN yet." />
      </Shell>
    );
  if (phase === 'pin')
    return (
      <Shell title={info?.name} subtitle={info ? [info.dates, info.times].filter(Boolean).join(' · ') : undefined}>
        <PinScreen
          courseId={courseId}
          offline={!online}
          initialLabel={state.deviceLabel}
          onUnlocked={async (label) => {
            setState((s) => ({ ...s, deviceLabel: label }));
            const r = await fetchRoster();
            if (r === 'ok') setPhase('scan');
            return r;
          }}
        />
      </Shell>
    );

  return (
    <ScanScreen
      state={state}
      setState={setState}
      online={online}
      syncing={syncing}
      syncError={syncError}
      onSync={sync}
    />
  );
}

/* ───────────────────────────── PIN screen ───────────────────────────── */

function PinScreen({
  courseId,
  offline,
  initialLabel,
  onUnlocked,
}: {
  courseId: string;
  offline: boolean;
  initialLabel: string;
  onUnlocked: (label: string) => Promise<'ok' | 'pin' | 'offline' | 'closed'>;
}) {
  const [pin, setPin] = useState('');
  const [label, setLabel] = useState(initialLabel);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/scan/${courseId}/unlock`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not unlock');
      const r = await onUnlocked(label.trim());
      if (r !== 'ok') throw new Error('Unlocked, but the attendee list did not load. Check the connection and try again.');
    } catch (e: any) {
      setError(e.message === 'Failed to fetch' ? 'No internet connection' : e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 pt-4">
      {offline && (
        <div className="flex gap-2 items-start bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-xl p-3">
          <CloudOff className="w-5 h-5 shrink-0" />
          <span>No connection. Unlock the scanner once while online, before the event. After that it works without signal.</span>
        </div>
      )}
      <label className="block">
        <span className="block text-sm font-semibold mb-1">Event PIN</span>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          autoComplete="one-time-code"
          autoFocus
          className="w-full text-2xl tracking-widest text-center px-4 py-3 border border-gray-300 rounded-xl"
          placeholder="••••"
        />
      </label>
      <label className="block">
        <span className="block text-sm font-semibold mb-1">Your name or station</span>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl"
          placeholder="e.g. Lydia – front door"
        />
        <span className="block text-xs text-gray-500 mt-1">Saved with each scan so Jen knows who scanned.</span>
      </label>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={busy || !pin.trim()}
        className="w-full py-3.5 text-lg font-semibold bg-[#1B2E5B] text-white rounded-xl disabled:opacity-50"
      >
        {busy ? 'Unlocking…' : 'Unlock scanner'}
      </button>
    </form>
  );
}

/* ───────────────────────────── Scan screen ───────────────────────────── */

function ScanScreen({
  state,
  setState,
  online,
  syncing,
  syncError,
  onSync,
}: {
  state: ScannerState;
  setState: (fn: (s: ScannerState) => ScannerState) => void;
  online: boolean;
  syncing: boolean;
  syncError: string | null;
  onSync: () => void;
}) {
  const event = state.event!;
  const [mode, setMode] = useState<Mode>(() => {
    try {
      return (localStorage.getItem('tt_scan_mode') as Mode) || 'in';
    } catch {
      return 'in';
    }
  });
  const [result, setResult] = useState<Result | null>(null);
  const [sheet, setSheet] = useState<null | 'walkin'>(null);
  const [lastWalkIn, setLastWalkIn] = useState<RosterPerson | null>(null);
  // Someone who owes, waiting for the team to choose check / card / no payment.
  const [paymentFor, setPaymentFor] = useState<{ person: RosterPerson; source: 'scan' | 'name_search' } | null>(null);
  // This event tracks payment if anyone imported with a Balance Due.
  const tracksPayment = useMemo(() => state.roster.some((p) => p.payment_status), [state.roster]);
  const audio = useRef<AudioContext | null>(null);
  const today = easternDate(new Date());
  const isEventDay = event.days.includes(today);

  useEffect(() => {
    try {
      localStorage.setItem('tt_scan_mode', mode);
    } catch {}
  }, [mode]);

  const byToken = useMemo(() => new Map(state.roster.map((p) => [p.badge_token, p])), [state.roster]);
  const todays = useMemo(() => state.scans.filter((x) => x.scan_date === today), [state.scans, today]);
  const counts = useMemo(() => {
    const ins = new Set(todays.filter((x) => x.direction === 'in').map((x) => x.registrant_id));
    const outs = new Set(todays.filter((x) => x.direction === 'out').map((x) => x.registrant_id));
    return { ins: ins.size, outs: outs.size, total: state.roster.length };
  }, [todays, state.roster.length]);

  const beep = useCallback((kind: Result['kind']) => {
    try {
      const ctx = audio.current;
      if (ctx) {
        const tones = kind === 'ok' ? [880] : kind === 'warn' ? [660, 660] : [220];
        tones.forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = f;
          o.connect(g);
          g.connect(ctx.destination);
          const t = ctx.currentTime + i * 0.18;
          g.gain.setValueAtTime(0.25, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
          o.start(t);
          o.stop(t + 0.16);
        });
      }
      navigator.vibrate?.(kind === 'ok' ? 80 : [80, 60, 80]);
    } catch {}
  }, []);

  const show = useCallback(
    (r: Omit<Result, 'at'>) => {
      setResult({ ...r, at: Date.now() });
      beep(r.kind);
    },
    [beep]
  );

  const queuePayment = useCallback(
    (personId: string, pay: DoorPayment) => {
      const rec: PaymentRecord = {
        client_payment_id: randomId(),
        registrant_id: personId,
        method: pay.method,
        recorded_at: new Date().toISOString(),
        device_label: state.deviceLabel || undefined,
      };
      setState((s) => ({
        ...s,
        pendingPayments: [...(s.pendingPayments || []), rec],
        roster: s.roster.map((p) => (p.id === personId ? { ...p, payment_status: 'paid' } : p)),
      }));
    },
    [setState, state.deviceLabel]
  );

  const record = useCallback(
    (person: RosterPerson, source: 'scan' | 'name_search', opts?: { skipPayment?: boolean; paidBy?: 'check' | 'card' | 'none' }) => {
      const name = `${person.first_name} ${person.last_name}`;
      const mine = state.scans.filter((x) => x.registrant_id === person.id && x.scan_date === today);
      const same = mine.filter((x) => x.direction === mode).sort((a, b) => a.scanned_at.localeCompare(b.scanned_at));
      if (same.length) {
        const first = same[0];
        if (mode === 'in') {
          return show({ kind: 'warn', title: `${name} is already checked in`, detail: `Checked in at ${easternTime(first.scanned_at)}. Nothing recorded.` });
        }
        // A later check-out replaces the time (the latest one counts), but a
        // badge held in front of the camera shouldn't record again and again.
        const latest = same[same.length - 1];
        if (Date.now() - new Date(latest.scanned_at).getTime() < 2 * 60_000) {
          return show({ kind: 'warn', title: `${name} is already checked out`, detail: `Checked out at ${easternTime(latest.scanned_at)}. Nothing recorded.` });
        }
      }
      // Can't check out someone who never checked in today.
      const hadIn = mine.some((x) => x.direction === 'in');
      if (mode === 'out' && !hadIn) {
        return show({
          kind: 'error',
          title: `${name} isn't checked in yet`,
          detail: 'Nothing recorded. Switch to Check IN to check them in first.',
        });
      }
      // Owes and checking in: ask about payment first.
      if (mode === 'in' && person.payment_status === 'due' && !opts?.skipPayment) {
        setPaymentFor({ person, source });
        beep('warn');
        return;
      }
      const now = new Date();
      const rec: ScanRecord = {
        client_scan_id: randomId(),
        registrant_id: person.id,
        direction: mode,
        scanned_at: now.toISOString(),
        scan_date: easternDate(now),
        source,
        device_label: state.deviceLabel || undefined,
      };
      setState((s) => ({ ...s, scans: [...s.scans, rec], pendingScans: [...s.pendingScans, rec] }));
      if (mode === 'out' && same.length) {
        show({ kind: 'ok', title: `${name} checked out again`, detail: `Check-out time updated to ${easternTime(now)}.`, undoScanId: rec.client_scan_id });
      } else if (mode === 'in' && opts?.paidBy === 'none') {
        show({ kind: 'warn', title: `${name} checked in`, detail: 'No payment collected. They will be listed for follow-up.', undoScanId: rec.client_scan_id });
      } else {
        const paid = opts?.paidBy === 'check' ? 'Paid by check' : opts?.paidBy === 'card' ? 'Paid by card' : null;
        const owes = mode === 'out' && person.payment_status === 'due' ? 'Payment still due' : null;
        show({
          kind: owes ? 'warn' : 'ok',
          title: `${name} ${mode === 'in' ? 'checked in' : 'checked out'}`,
          detail: [mode === 'in' ? (badgeNumberLabel(person) ? `Badge ${badgeNumberLabel(person)}` : null) : null, paid, owes, person.title, townshipLabel(person.township)].filter(Boolean).join(' · ') || undefined,
          undoScanId: rec.client_scan_id,
        });
      }
    },
    [beep, mode, setState, show, state.deviceLabel, state.scans, today]
  );

  // Undo a scan made by mistake. Not uploaded yet: just drop it. Uploaded:
  // queue it to be marked void on the server (kept in the record with a note).
  const undoScan = useCallback(
    (scanId: string) => {
      const rec = state.scans.find((x) => x.client_scan_id === scanId);
      if (!rec) return;
      const person = state.roster.find((p) => p.id === rec.registrant_id);
      const notUploaded = state.pendingScans.some((x) => x.client_scan_id === scanId);
      setState((s) => ({
        ...s,
        scans: s.scans.filter((x) => x.client_scan_id !== scanId),
        pendingScans: s.pendingScans.filter((x) => x.client_scan_id !== scanId),
        pendingVoids: notUploaded
          ? s.pendingVoids || []
          : [...(s.pendingVoids || []), { client_scan_id: scanId, device_label: s.deviceLabel || undefined }],
      }));
      setResult({
        kind: 'warn',
        title: `Undone: ${person ? `${person.first_name} ${person.last_name}'s` : 'the'} check-${rec.direction}`,
        detail: notUploaded ? 'Removed. Nothing was saved.' : 'Removed. Their history will show it was undone on the scanner.',
        at: Date.now(),
      });
    },
    [setState, state]
  );

  const lastCode = useRef<{ code: string; at: number } | null>(null);
  const onCode = useCallback(
    (code: string) => {
      const now = Date.now();
      // The camera sees the same badge many times a second; act once.
      if (lastCode.current && lastCode.current.code === code && now - lastCode.current.at < 4000) return;
      lastCode.current = { code, at: now };
      const token = code.trim();
      if (!isBadgeToken(token)) return show({ kind: 'error', title: 'Not an ITA badge', detail: 'This QR code is not a Township Tools badge.' });
      const person = byToken.get(token);
      if (!person)
        return show({ kind: 'error', title: 'Badge not recognized', detail: 'It may be cancelled or from another event. Look them up by name below.' });
      record(person, 'scan');
    },
    [byToken, record, show]
  );

  const pending = state.pendingScans.length + state.pendingWalkIns.length;

  return (
    <div className="min-h-[100dvh] bg-gray-100 text-gray-900 flex flex-col">
      <header className="bg-[#1B2E5B] text-white px-4 pt-3 pb-3">
        <div className="text-xs opacity-80">{formatCourseDates(today, null)}{isEventDay ? '' : ' · not an event day'}</div>
        <div className="font-semibold leading-tight truncate">{event.name}</div>
        <button type="button" onClick={onSync} className="mt-1 inline-flex items-center gap-1.5 text-xs opacity-90">
          {syncing ? (
            <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
          ) : !online ? (
            <><CloudOff className="w-3.5 h-3.5" /> Offline · {pending} waiting to upload</>
          ) : pending ? (
            <><RefreshCw className="w-3.5 h-3.5" /> {pending} waiting to upload · tap to retry</>
          ) : (
            <><CheckCircle2 className="w-3.5 h-3.5" /> All scans uploaded</>
          )}
        </button>
        {syncError && <div className="text-xs text-amber-200 mt-1">{syncError}</div>}
      </header>

      {!isEventDay && (
        <div className="bg-amber-100 text-amber-900 text-sm px-4 py-2">
          Today isn&apos;t one of this event&apos;s days ({event.days.map((d) => formatCourseDates(d, null, 'short')).join(', ')}). Scans
          still save, but won&apos;t count toward attendance.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 p-3">
        <ModeButton active={mode === 'in'} onClick={() => setMode('in')} icon={<LogIn className="w-5 h-5" />} label="Check IN" color="green" />
        <ModeButton active={mode === 'out'} onClick={() => setMode('out')} icon={<LogOut className="w-5 h-5" />} label="Check OUT" color="blue" />
      </div>

      <div className="px-3">
        <CameraView paused={sheet !== null} onCode={onCode} onStart={() => {
          if (!audio.current) {
            try {
              const Ctx = window.AudioContext || (window as any).webkitAudioContext;
              audio.current = new Ctx();
            } catch {}
          }
          audio.current?.resume?.();
        }} mode={mode} />
      </div>

      <div className="px-3 pt-3 min-h-[6.5rem]">
        {result && <ResultCard result={result} onUndo={result.undoScanId ? () => undoScan(result.undoScanId!) : undefined} />}
      </div>

      <NameLookup roster={state.roster} todays={todays} mode={mode} onCheck={(p) => record(p, 'name_search')} onAddWalkIn={() => setSheet('walkin')} />

      <div className="px-3 pt-2">
        <button type="button" onClick={() => setSheet('walkin')} className="w-full flex items-center justify-center gap-2 py-3 bg-white rounded-xl font-semibold shadow-sm">
          <UserPlus className="w-5 h-5" /> Add walk-in
        </button>
      </div>

      {lastWalkIn && (
        <div className="px-3 pt-2">
          <button
            type="button"
            onClick={async () => {
              try {
                const fresh = state.roster.find((x) => x.id === lastWalkIn.id) || lastWalkIn;
                const blob = await renderNiimbotLabel({
                  numberLabel: badgeNumberLabel(fresh) || null,
                  firstName: lastWalkIn.first_name,
                  lastName: lastWalkIn.last_name,
                  title: lastWalkIn.title,
                  township: lastWalkIn.township,
                  county: lastWalkIn.county,
                  organization: lastWalkIn.organization,
                  badgeToken: lastWalkIn.badge_token,
                  eventName: event.name,
                });
                await deliverLabel(blob, `label-${lastWalkIn.last_name}-${lastWalkIn.first_name}.png`.replace(/\s+/g, '-'));
              } catch (e: any) {
                show({ kind: 'error', title: 'Could not make the label', detail: e.message });
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 text-white rounded-xl font-semibold"
          >
            <Tag className="w-5 h-5" /> Save NIIMBOT label with QR code ({lastWalkIn.first_name} {lastWalkIn.last_name})
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(lastWalkIn.badge_token);
                show({
                  kind: 'ok',
                  title: 'QR code copied',
                  detail: 'In the NIIMBOT app, add a QR code to the label and paste this as its content. Add the name as text.',
                });
              } catch {
                window.prompt('Copy this QR code text into the NIIMBOT app:', lastWalkIn.badge_token);
              }
            }}
            className="mt-2 w-full flex items-center justify-center gap-2 py-3 bg-white rounded-xl font-semibold shadow-sm"
          >
            Copy QR code for NIIMBOT
          </button>
        </div>
      )}

      {/* pb leaves room for the floating dark-mode button */}
      <div className="px-4 pt-4 pb-20 text-center text-sm text-gray-600">
        Today: <strong>{counts.ins}</strong> checked in · <strong>{counts.outs}</strong> checked out · {counts.total} registered
      </div>

      {paymentFor && (
        <PaymentSheet
          name={`${paymentFor.person.first_name} ${paymentFor.person.last_name}`}
          balance={paymentFor.person.balance_due}
          onCancel={() => setPaymentFor(null)}
          onDone={(pay) => {
            const { person, source } = paymentFor;
            setPaymentFor(null);
            if (pay) queuePayment(person.id, pay);
            record({ ...person, payment_status: pay ? 'paid' : 'due' }, source, { skipPayment: true, paidBy: pay ? pay.method : 'none' });
          }}
        />
      )}
      {sheet === 'walkin' && (
        <WalkInSheet
          mode={mode}
          tracksPayment={tracksPayment}
          onClose={() => setSheet(null)}
          onSave={(w, checkIn, pay) => {
            const person: RosterPerson = {
              id: w.id,
              first_name: w.first_name,
              last_name: w.last_name,
              title: w.title || null,
              township: w.township || null,
              county: w.county || null,
              organization: w.organization || null,
              badge_token: w.badge_token,
              is_walk_in: true,
              payment_status: tracksPayment ? (pay ? 'paid' : 'due') : null,
            };
            const walkIn = { ...w, payment_status: person.payment_status };
            setState((s) => ({ ...s, roster: [...s.roster, person], pendingWalkIns: [...s.pendingWalkIns, walkIn] }));
            if (pay) queuePayment(person.id, pay);
            setSheet(null);
            setLastWalkIn(person);
            if (checkIn) {
              // record() reads state from props; queue the check-in directly.
              const now = new Date();
              const rec: ScanRecord = {
                client_scan_id: randomId(),
                registrant_id: person.id,
                direction: 'in',
                scanned_at: now.toISOString(),
                scan_date: easternDate(now),
                source: 'name_search',
                device_label: state.deviceLabel || undefined,
              };
              setState((s) => ({ ...s, scans: [...s.scans, rec], pendingScans: [...s.pendingScans, rec] }));
              show({
                kind: tracksPayment && !pay ? 'warn' : 'ok',
                title: `${person.first_name} ${person.last_name} added and checked in`,
                detail: (tracksPayment && !pay ? 'No payment collected; listed for follow-up. ' : '') + 'Print their NIIMBOT label below.',
              });
            } else {
              show({ kind: 'ok', title: `${person.first_name} ${person.last_name} added`, detail: 'Print their NIIMBOT label below.' });
            }
          }}
        />
      )}
    </div>
  );
}

function ModeButton({ active, onClick, icon, label, color }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; color: 'green' | 'blue' }) {
  const on = color === 'green' ? 'bg-green-600 text-white border-green-600' : 'bg-blue-600 text-white border-blue-600';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center justify-center gap-2 py-3.5 rounded-xl text-lg font-bold border-2 ${active ? on : 'bg-white text-gray-500 border-gray-200'}`}
    >
      {icon} {label}
    </button>
  );
}

function ResultCard({ result, onUndo }: { result: Result; onUndo?: () => void }) {
  const styles = {
    ok: 'bg-green-600 text-white',
    warn: 'bg-amber-400 text-amber-950',
    error: 'bg-red-600 text-white',
  }[result.kind];
  const Icon = result.kind === 'ok' ? CheckCircle2 : result.kind === 'warn' ? AlertTriangle : XCircle;
  return (
    <div key={result.at} className={`rounded-xl p-4 flex gap-3 items-start ${styles}`} role="status" aria-live="assertive">
      <Icon className="w-7 h-7 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-lg font-bold leading-tight">{result.title}</div>
        {result.detail && <div className="text-sm opacity-90 mt-0.5">{result.detail}</div>}
      </div>
      {onUndo && (
        <button
          type="button"
          onClick={onUndo}
          className="shrink-0 self-center px-3 py-2 rounded-lg bg-white/90 text-gray-900 text-sm font-bold active:bg-white"
        >
          Undo
        </button>
      )}
    </div>
  );
}

/* ───────────────────────────── Camera ───────────────────────────── */

function CameraView({ paused, onCode, onStart, mode }: { paused: boolean; onCode: (code: string) => void; onStart: () => void; mode: Mode }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<'idle' | 'starting' | 'running' | 'denied' | 'error'>('idle');
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  const start = useCallback(async () => {
    onStart();
    setStatus('starting');
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      stream.current = s;
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play();
      }
      setStatus('running');
    } catch (e: any) {
      setStatus(e?.name === 'NotAllowedError' ? 'denied' : 'error');
    }
  }, [onStart]);

  useEffect(() => stop, [stop]);

  // Decode a frame every ~150 ms while running and not paused.
  useEffect(() => {
    if (status !== 'running' || paused) return;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const v = video.current;
      if (v && v.readyState >= 2 && v.videoWidth) {
        const scale = Math.min(1, 640 / v.videoWidth);
        const w = Math.round(v.videoWidth * scale);
        const h = Math.round(v.videoHeight * scale);
        if (!canvas.current) canvas.current = document.createElement('canvas');
        const c = canvas.current;
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(v, 0, 0, w, h);
          const img = ctx.getImageData(0, 0, w, h);
          const found = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
          if (found?.data) onCodeRef.current(found.data);
        }
      }
      setTimeout(() => requestAnimationFrame(tick), 150);
    };
    tick();
    return () => {
      alive = false;
    };
  }, [status, paused]);

  const ring = mode === 'in' ? 'ring-green-500' : 'ring-blue-500';

  return (
    <div className={`relative aspect-[4/3] bg-black rounded-2xl overflow-hidden ring-4 ${ring}`}>
      <video ref={video} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
      {status === 'running' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-1/2 aspect-square border-4 border-white/80 rounded-2xl" />
        </div>
      )}
      {status !== 'running' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-6 gap-3">
          {status === 'denied' ? (
            <>
              <p className="font-semibold">Camera access was blocked.</p>
              <p className="text-sm opacity-80">Allow the camera for this site in your browser settings, then tap below. You can still look people up by name below.</p>
            </>
          ) : status === 'error' ? (
            <p className="text-sm opacity-80">Couldn&apos;t start the camera. Look them up by name below, or try again.</p>
          ) : null}
          <button type="button" onClick={start} disabled={status === 'starting'} className="inline-flex items-center gap-2 px-5 py-3 bg-white text-gray-900 rounded-xl font-semibold">
            <Camera className="w-5 h-5" /> {status === 'starting' ? 'Starting…' : 'Start camera'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── Sheets ───────────────────────────── */

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md max-h-[90dvh] rounded-t-2xl sm:rounded-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-bold text-lg">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

/**
 * Search box on the scanner screen: type a last name to see the badge number
 * (to pull the badge from the box) and today's status. Typing records nothing;
 * "Check in"/"Check out" on a row is for someone without their badge.
 */
function NameLookup({
  roster,
  todays,
  mode,
  onCheck,
  onAddWalkIn,
}: {
  roster: RosterPerson[];
  todays: ScanRecord[];
  mode: Mode;
  onCheck: (p: RosterPerson) => void;
  onAddWalkIn: () => void;
}) {
  const [q, setQ] = useState('');
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return roster
      .filter(
        (p) =>
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(t) ||
          `${p.last_name} ${p.first_name}`.toLowerCase().includes(t) ||
          (/^#?\d+$/.test(t) && !p.is_walk_in && String(p.badge_number ?? '') === t.replace('#', ''))
      )
      .slice(0, 8);
  }, [q, roster]);
  const statusFor = (id: string) => {
    const mine = todays.filter((x) => x.registrant_id === id).sort((a, b) => a.scanned_at.localeCompare(b.scanned_at));
    const ins = mine.filter((x) => x.direction === 'in');
    const outs = mine.filter((x) => x.direction === 'out');
    return [ins.length ? `In ${easternTime(ins[0].scanned_at)}` : null, outs.length ? `Out ${easternTime(outs[outs.length - 1].scanned_at)}` : null]
      .filter(Boolean)
      .join(' · ');
  };
  return (
    <div className="px-3">
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find badge # by last name"
          autoComplete="off"
          className="w-full pl-12 pr-4 py-3.5 text-lg bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#1B2E5B]"
        />
      </div>
      {q.trim() && (
        <div className="mt-2 bg-white rounded-xl shadow-sm px-4">
          {!matches.length ? (
            <div className="py-3 flex items-center gap-3">
              <p className="flex-1 text-sm text-gray-600">No one by that name, so they&apos;re a walk-in.</p>
              <button
                type="button"
                onClick={() => {
                  setQ('');
                  onAddWalkIn();
                }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#1B2E5B] text-white rounded-lg font-semibold text-sm"
              >
                <UserPlus className="w-4 h-4" /> Add walk-in
              </button>
            </div>
          ) : (
            <ul className="divide-y">
              {matches.map((p) => (
                <li key={p.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-lg leading-tight">
                      {p.first_name} {p.last_name}
                      {p.payment_status === 'due' && <span className="ml-2 text-xs font-semibold text-red-600">payment due</span>}
                    </div>
                    <div className="text-sm text-gray-500">
                      {[p.title, townshipLabel(p.township) || p.organization].filter(Boolean).join(' · ')}
                      {statusFor(p.id) && <span className="ml-1 text-gray-700">· {statusFor(p.id)}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onCheck(p);
                        setQ('');
                      }}
                      className="mt-1 text-sm font-semibold text-[#1B2E5B] underline underline-offset-2"
                    >
                      {mode === 'in' ? 'Check in without badge' : 'Check out without badge'}
                    </button>
                  </div>
                  {badgeNumberLabel(p) ? (
                    <span className={`flex-shrink-0 font-extrabold text-[#1B2E5B] text-right leading-none ${p.is_walk_in ? 'text-lg' : 'text-4xl'}`}>
                      {badgeNumberLabel(p)}
                    </span>
                  ) : p.is_walk_in ? (
                    <span className="flex-shrink-0 text-lg font-extrabold text-[#1B2E5B] text-right">Walk-in</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function WalkInSheet({
  mode,
  tracksPayment,
  onSave,
  onClose,
}: {
  mode: Mode;
  tracksPayment: boolean;
  onSave: (w: WalkInRecord, checkIn: boolean, payment: DoorPayment | null) => void;
  onClose: () => void;
}) {
  const [payMethod, setPayMethod] = useState<'none' | 'check' | 'card'>('none');
  const [f, setF] = useState({ first_name: '', last_name: '', title: '', township: '', county: '', organization: '', email: '', registrant_type: 'Attendee' });
  const [checkIn, setCheckIn] = useState(mode === 'in');
  const field = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="block text-sm font-semibold mb-1">{label}</span>
      <input value={f[k]} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 rounded-xl" {...props} />
    </label>
  );
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim());
  const ok = f.first_name.trim() && f.last_name.trim() && emailOk;
  // Sponsors, speakers and vendors come from a company, not a township.
  const usesOrg = ['Sponsor', 'Speaker', 'Resource Vendor'].includes(f.registrant_type);
  return (
    <Sheet title="Add walk-in" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
            if (!ok) return;
          onSave(
            {
              id: randomId(),
              badge_token: randomBadgeToken(),
              first_name: f.first_name.trim(),
              last_name: f.last_name.trim(),
              title: f.title.trim() || undefined,
              registrant_type: f.registrant_type,
              township: (!usesOrg && f.township.trim()) || undefined,
              county: (!usesOrg && f.county.trim()) || undefined,
              organization: (usesOrg && f.organization.trim()) || undefined,
              email: f.email.trim(),
            },
            checkIn,
            tracksPayment && payMethod !== 'none' ? { method: payMethod } : null
          );
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          {field('first_name', 'First name *', { autoFocus: true, autoCapitalize: 'words' })}
          {field('last_name', 'Last name *', { autoCapitalize: 'words' })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field('title', 'Title', { autoCapitalize: 'words' })}
          <label className="block">
            <span className="block text-sm font-semibold mb-1">Type</span>
            <select
              value={f.registrant_type}
              onChange={(e) => setF((x) => ({ ...x, registrant_type: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-white"
            >
              {['Attendee', 'Sponsor', 'Speaker', 'Resource Vendor', 'Staff'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
        {usesOrg ? (
          field('organization', 'Organization', { autoCapitalize: 'words', placeholder: 'Company or agency name' })
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {field('township', 'Township', { autoCapitalize: 'words' })}
            {field('county', 'County', { autoCapitalize: 'words' })}
          </div>
        )}
        {field('email', 'Email * (for their certificate)', { type: 'email', inputMode: 'email', autoCapitalize: 'none', required: true })}
        {f.email.trim() && !emailOk && <p className="text-sm text-red-600 -mt-2">Check the email: it should look like name@example.com.</p>}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={checkIn} onChange={(e) => setCheckIn(e.target.checked)} className="h-5 w-5" />
          Check them in now
        </label>
        {tracksPayment && (
          <fieldset className="space-y-1">
            <legend className="text-sm font-semibold mb-1">Payment</legend>
            {([
              ['check', 'Paid by check'],
              ['card', 'Paid by credit card'],
              ['none', 'Not paid yet (listed for follow-up)'],
            ] as const).map(([v, label]) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input type="radio" name="walkin-pay" checked={payMethod === v} onChange={() => setPayMethod(v)} className="h-5 w-5" />
                {label}
              </label>
            ))}
          </fieldset>
        )}
        <button type="submit" disabled={!ok} className="w-full py-3.5 text-lg font-semibold bg-[#1B2E5B] text-white rounded-xl disabled:opacity-50">
          Add walk-in
        </button>
        {!ok && <p className="text-xs text-gray-500 text-center">First name, last name and email are required.</p>}
        <p className="text-xs text-gray-500">Works offline. It uploads with the scans when the phone is back online.</p>
      </form>
    </Sheet>
  );
}

/* ───────────────────────────── Layout bits ───────────────────────────── */

function Shell({ title, subtitle, children }: { title?: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-gray-50 text-gray-900">
      <header className="bg-[#1B2E5B] text-white px-5 py-5">
        <div className="text-xs uppercase tracking-wide opacity-80">ITA badge scanner</div>
        {title && <h1 className="text-xl font-bold leading-tight mt-1">{title}</h1>}
        {subtitle && <div className="text-sm opacity-90 mt-0.5">{subtitle}</div>}
      </header>
      <main className="max-w-md mx-auto px-5 py-4">{children}</main>
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center py-16">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-gray-600 mt-2">{body}</p>
    </div>
  );
}
