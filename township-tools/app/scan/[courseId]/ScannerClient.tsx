"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { Camera, Check, CheckCircle2, CloudOff, Copy, LogIn, LogOut, QrCode, RefreshCw, Search, Tablet, UserPlus, X, XCircle, AlertTriangle } from 'lucide-react';
import { easternDate, easternTime } from '@/lib/badges/attendance';
import { isBadgeToken } from '@/lib/badges/token';
import { extraOrganization, townshipLabel } from '@/lib/certificates/township';
import { badgeNumberLabel } from '@/lib/badges/badge-numbers';
import { formatCourseDates } from '@/lib/certificates/date-range';
import { deliverLabel, renderNiimbotLabel } from '@/lib/badges/niimbot-label';
import { DOOR_METHOD_LABEL, DoorPayment, PaymentSheet, PriorDebtSheet } from './PaymentFields';
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
// out: a check-out confirmation (blue instead of green, like the Check OUT button).
type Result = { kind: 'ok' | 'warn' | 'error'; title: string; detail?: string; at: number; undoScanId?: string; out?: boolean };

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
        <span className="block text-base font-semibold mb-1">Event PIN</span>
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
        <span className="block text-base font-semibold mb-1">Your name or station</span>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl"
          placeholder="e.g. Lydia – front door"
        />
        <span className="block text-sm text-gray-500 mt-1">Saved with each scan so Jen knows who scanned.</span>
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
  // Last walk-in added, or someone whose details were just fixed: offer their NIIMBOT label.
  const [lastWalkIn, setLastWalkIn] = useState<RosterPerson | null>(null);
  const [fixFor, setFixFor] = useState<RosterPerson | null>(null);
  // true = "Someone else is attending" on this registration.
  const [fixSub, setFixSub] = useState(false);
  // Paying ahead of check-in (e.g. a trustee paying for their staff).
  const [payOnlyFor, setPayOnlyFor] = useState<RosterPerson | null>(null);
  // Owes for an earlier event: collect at check-in (or record ahead with payOnly).
  const [priorFor, setPriorFor] = useState<{ person: RosterPerson; source: 'scan' | 'name_search'; opts?: any; payOnly?: boolean } | null>(null);
  // Someone who owes, waiting for the team to choose check / card / no payment.
  const [paymentFor, setPaymentFor] = useState<{ person: RosterPerson; source: 'scan' | 'name_search' } | null>(null);
  // This event tracks payment if anyone imported with a Balance Due.
  const tracksPayment = useMemo(() => state.roster.some((p) => p.payment_status), [state.roster]);
  // Walk-ins who registered on the tablet and haven't been checked in yet.
  const waiting = useMemo(() => {
    const scanned = new Set(state.scans.map((x) => x.registrant_id));
    return state.roster.filter((p) => p.self_registered && !scanned.has(p.id) && !p.cancelled);
  }, [state.roster, state.scans]);
  const [finishFor, setFinishFor] = useState<RosterPerson | null>(null);
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
    (person: RosterPerson, source: 'scan' | 'name_search', opts?: { skipPayment?: boolean; skipPrior?: boolean; paidBy?: 'check' | 'card' | 'amo' | 'none' }) => {
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
      // Still owes for an earlier event: ask to collect that first.
      if (mode === 'in' && (person.prior_unpaid || []).length && !opts?.skipPrior) {
        setPriorFor({ person, source, opts });
        beep('warn');
        return;
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
        show({ kind: 'ok', title: `${name} checked out again`, detail: `Check-out time updated to ${easternTime(now)}.`, undoScanId: rec.client_scan_id, out: true });
      } else if (mode === 'in' && opts?.paidBy === 'none') {
        show({ kind: 'warn', title: `${name} checked in`, detail: 'No payment collected. They will be listed for follow-up.', undoScanId: rec.client_scan_id });
      } else {
        const paid = opts?.paidBy && opts.paidBy !== 'none' ? DOOR_METHOD_LABEL[opts.paidBy] : null;
        const owes = mode === 'out' && person.payment_status === 'due' ? 'Payment still due' : null;
        const cancelledNote = mode === 'in' && person.cancelled ? 'Their registration was marked CANCELLED. Checked in anyway' : null;
        show({
          kind: owes || cancelledNote ? 'warn' : 'ok',
          out: mode === 'out',
          title: `${name} ${mode === 'in' ? 'checked in' : 'checked out'}`,
          detail: [cancelledNote, mode === 'in' ? (badgeNumberLabel(person) ? `Badge ${badgeNumberLabel(person)}` : null) : null, paid, owes, person.title, townshipLabel(person.township)].filter(Boolean).join(' · ') || undefined,
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
  // QR code of this scanner's link, to bring another team member on board.
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-gray-100 text-gray-900 flex flex-col">
      <header className="bg-[#1B2E5B] text-white px-4 pt-3 pb-3 relative">
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="absolute top-3 right-3 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold"
          aria-label="Show the scanner link as a QR code"
        >
          <QrCode className="w-7 h-7" />
          Share
        </button>
        <div className="text-xs opacity-80 pr-20">{formatCourseDates(today, null)}{isEventDay ? '' : ' · not an event day'}</div>
        <div className="font-semibold leading-tight truncate pr-20">{event.name}</div>
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

      {/* Search sits right under the camera: look up the badge #, then scan it. */}
      <div className="pt-2">
        <NameLookup
          roster={state.roster}
          todays={todays}
          mode={mode}
          onCheck={(p) => record(p, 'name_search')}
          onAddWalkIn={() => setSheet('walkin')}
          onFix={(p) => {
            setFixSub(false);
            setFixFor(p);
          }}
          onSubstitute={(p) => {
            setFixSub(true);
            setFixFor(p);
          }}
          onPay={(p) => ((p.prior_unpaid || []).length ? setPriorFor({ person: p, source: 'name_search', payOnly: true }) : setPayOnlyFor(p))}
        />
      </div>

      {result && (
        <div className="px-3 pt-2">
          <ResultCard result={result} onUndo={result.undoScanId ? () => undoScan(result.undoScanId!) : undefined} />
        </div>
      )}

      {waiting.length > 0 && (
        <div className="px-3 pt-2">
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-3">
            <div className="flex items-center gap-2 text-xl font-bold text-amber-900">
              <Tablet className="w-6 h-6" /> Waiting at the desk ({waiting.length})
            </div>
            <p className="text-base text-amber-900 mb-2">Registered on the tablet. Tap a name to take payment, check in and print their label.</p>
            <div className="flex flex-col gap-2">
              {waiting.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFinishFor(p)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white border-2 border-amber-300 rounded-xl text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-xl font-bold leading-tight">
                      {p.first_name} {p.last_name}
                    </span>
                    <span className="block text-base text-gray-600">
                      {[p.registrant_type && p.registrant_type !== 'Attendee' ? p.registrant_type : null, townshipLabel(p.township) || p.organization]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  {badgeNumberLabel(p) && <span className="flex-shrink-0 text-lg font-extrabold text-[#C1272D]">{badgeNumberLabel(p)}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="px-3 pt-2">
        <button type="button" onClick={() => setSheet('walkin')} className="w-full flex items-center justify-center gap-2.5 py-2 bg-white rounded-xl font-bold text-2xl shadow-sm">
          <UserPlus className="w-7 h-7" /> Add walk-in
        </button>
      </div>

      {/* Today's numbers, right under Add walk-in; "registered" on its own line. */}
      <div className="px-4 pt-3 text-center text-lg text-gray-600 leading-snug">
        <div className="whitespace-nowrap">
          Today: <strong>{counts.ins}</strong> checked in · <strong>{counts.outs}</strong> checked out
        </div>
        <div>
          <strong>{counts.total}</strong> registered
        </div>
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
                  tagline: event.tagline ?? null,
                });
                await deliverLabel(blob, `label-${lastWalkIn.last_name}-${lastWalkIn.first_name}.png`.replace(/\s+/g, '-'));
              } catch (e: any) {
                show({ kind: 'error', title: 'Could not make the label', detail: e.message });
              }
            }}
            className="w-full py-3 px-4 bg-amber-500 text-white rounded-xl text-center leading-snug"
          >
            <span className="block font-semibold">Save NIIMBOT label with QR code</span>
            <span className="block text-sm opacity-90">
              {lastWalkIn.first_name} {lastWalkIn.last_name}
            </span>
          </button>
        </div>
      )}

      {/* Room for the floating dark-mode button */}
      <div className="pb-20" />

      {finishFor && (
        <FinishWalkInSheet
          person={finishFor}
          tracksPayment={tracksPayment}
          onClose={() => setFinishFor(null)}
          onFix={() => {
            const p = finishFor;
            setFinishFor(null);
            setFixSub(false);
            setFixFor(p);
          }}
          onDone={(checkIn, pay) => {
            const person = finishFor;
            setFinishFor(null);
            if (pay) queuePayment(person.id, pay);
            setLastWalkIn(person);
            if (checkIn) {
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
              setState((st) => ({ ...st, scans: [...st.scans, rec], pendingScans: [...st.pendingScans, rec] }));
            }
            show({
              kind: tracksPayment && !pay && person.payment_status === 'due' ? 'warn' : 'ok',
              title: `${person.first_name} ${person.last_name} ${checkIn ? 'checked in' : 'saved'}`,
              detail:
                (tracksPayment && !pay && person.payment_status === 'due' ? 'No payment collected; listed for follow-up. ' : '') +
                'Print their NIIMBOT label below.',
            });
          }}
        />
      )}

      {shareOpen && <ShareScannerSheet courseId={event.id} eventName={event.name} onClose={() => setShareOpen(false)} />}

      {fixFor && (
        <FixDetailsSheet
          courseId={event.id}
          person={fixFor}
          substitute={fixSub}
          onClose={() => setFixFor(null)}
          onSaved={(updated) => {
            setState((st) => ({ ...st, roster: st.roster.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)) }));
            setFixFor(null);
            setLastWalkIn(updated);
            show(
              fixSub
                ? {
                    kind: 'ok',
                    title: `${updated.first_name} ${updated.last_name} is attending for ${updated.in_place_of || `${fixFor.first_name} ${fixFor.last_name}`}`,
                    detail: 'Print their NIIMBOT label below, then scan it to check them in. Same QR code as the original badge.',
                  }
                : { kind: 'ok', title: `Saved ${updated.first_name} ${updated.last_name}`, detail: 'Print their new NIIMBOT label below. Same QR code, so either badge scans.' }
            );
          }}
        />
      )}

      {priorFor && (
        <PriorDebtSheet
          name={`${priorFor.person.first_name} ${priorFor.person.last_name}`}
          debts={priorFor.person.prior_unpaid || []}
          paymentOnly={priorFor.payOnly}
          onCancel={() => setPriorFor(null)}
          onDone={(pay) => {
            const { person, source, opts, payOnly } = priorFor;
            setPriorFor(null);
            let next = person;
            if (pay) {
              // Marks the earlier event's registration paid (releases its held certificate).
              (person.prior_unpaid || []).forEach((d) => queuePayment(d.registrant_id, pay));
              next = { ...person, prior_unpaid: [] };
              setState((st) => ({ ...st, roster: st.roster.map((x) => (x.id === person.id ? { ...x, prior_unpaid: [] } : x)) }));
            }
            if (payOnly) {
              if (pay) {
                show({
                  kind: 'ok',
                  title: `Collected for ${person.first_name} ${person.last_name}'s previous event`,
                  detail: `${DOOR_METHOD_LABEL[pay.method]} · not checked in yet.`,
                });
              }
              return;
            }
            record(next, source, { ...(opts || {}), skipPrior: true });
            if (!pay) {
              show({
                kind: 'warn',
                title: `${person.first_name} ${person.last_name} checked in`,
                detail: `Still owes ${(person.prior_unpaid || []).map((d) => `${d.balance_due ? `$${Number(d.balance_due).toFixed(2)} ` : ''}from ${d.course_name}`).join('; ')}. Flagged for follow-up.`,
              });
            }
          }}
        />
      )}

      {payOnlyFor && (
        <PaymentSheet
          name={`${payOnlyFor.first_name} ${payOnlyFor.last_name}`}
          balance={payOnlyFor.balance_due}
          paymentOnly
          onCancel={() => setPayOnlyFor(null)}
          onDone={(pay) => {
            const person = payOnlyFor;
            setPayOnlyFor(null);
            if (!pay) return;
            queuePayment(person.id, pay);
            show({
              kind: 'ok',
              title: `${person.first_name} ${person.last_name} marked paid`,
              detail: `${DOOR_METHOD_LABEL[pay.method]} · not checked in yet. Scan their badge when they arrive.`,
            });
          }}
        />
      )}

      {paymentFor && (
        <PaymentSheet
          name={`${paymentFor.person.first_name} ${paymentFor.person.last_name}`}
          balance={paymentFor.person.balance_due}
          onCancel={() => setPaymentFor(null)}
          onDone={(pay) => {
            const { person, source } = paymentFor;
            setPaymentFor(null);
            if (pay) queuePayment(person.id, pay);
            record({ ...person, payment_status: pay ? 'paid' : 'due' }, source, { skipPayment: true, skipPrior: true, paidBy: pay ? pay.method : 'none' });
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
    ok: result.out ? 'bg-blue-600 text-white' : 'bg-green-600 text-white',
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
    <div
      className={`relative bg-black rounded-2xl overflow-hidden ring-4 ${ring} ${
        status === 'denied' || status === 'error' ? 'min-h-[13rem]' : 'aspect-[2/1]'
      }`}
    >
      <video ref={video} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
      {status === 'running' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-[84%] aspect-square border-4 border-white/80 rounded-2xl" />
        </div>
      )}
      {status !== 'running' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-4 gap-3">
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

/** Copy to the clipboard (e.g. an email into the Square card reader). */
function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers: copy through a hidden field.
      const t = document.createElement('textarea');
      t.value = text;
      t.style.position = 'fixed';
      t.style.opacity = '0';
      document.body.appendChild(t);
      t.select();
      try {
        document.execCommand('copy');
      } catch {}
      document.body.removeChild(t);
    }
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-lg font-bold ${done ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-900 active:bg-gray-300'}`}
      aria-label={`${label} ${text}`}
    >
      {done ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
      {done ? 'Copied' : label}
    </button>
  );
}

/** Finish a walk-in who registered on the tablet: payment, check-in, then their label. */
function FinishWalkInSheet({
  person,
  tracksPayment,
  onClose,
  onFix,
  onDone,
}: {
  person: RosterPerson;
  tracksPayment: boolean;
  onClose: () => void;
  onFix: () => void;
  onDone: (checkIn: boolean, pay: DoorPayment | null) => void;
}) {
  const owes = tracksPayment && person.payment_status === 'due';
  const [payMethod, setPayMethod] = useState<'none' | 'check' | 'card' | 'amo'>('none');
  const [checkIn, setCheckIn] = useState(true);
  const place = [townshipLabel(person.township), person.county ? `${person.county} County` : null].filter(Boolean).join(', ');
  return (
    <Sheet title="Finish walk-in" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <div className="text-3xl font-bold leading-tight">
            {person.first_name} {person.last_name}
          </div>
          {[person.title, person.registrant_type && person.registrant_type !== 'Attendee' ? person.registrant_type : null].filter(Boolean).length > 0 && (
            <div className="text-lg text-gray-700">
              {[person.title, person.registrant_type && person.registrant_type !== 'Attendee' ? person.registrant_type : null].filter(Boolean).join(' · ')}
            </div>
          )}
          {place && <div className="text-lg text-gray-700">{place}</div>}
          {person.organization && <div className="text-lg text-gray-700">{person.organization}</div>}
          {badgeNumberLabel(person) && <div className="text-lg font-bold text-[#C1272D]">{badgeNumberLabel(person)}</div>}
        </div>
        {person.email && (
          <div>
            <div className="text-base font-semibold text-gray-600 mb-1">Email</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 px-3 py-2.5 bg-gray-100 rounded-xl text-lg break-all">{person.email}</div>
              <CopyButton text={person.email} />
            </div>
          </div>
        )}
        <button type="button" onClick={onFix} className="text-lg font-semibold text-[#1B2E5B] underline underline-offset-2">
          Fix a typo in their details
        </button>
        <label className="flex items-center gap-3 text-xl font-semibold py-1">
          <input type="checkbox" checked={checkIn} onChange={(e) => setCheckIn(e.target.checked)} className="h-7 w-7 shrink-0" />
          Check them in now
        </label>
        {owes && (
          <fieldset className="space-y-1">
            <legend className="text-xl font-bold mb-1">Payment</legend>
            {([
              ['check', 'Paid by check'],
              ['card', 'Paid by credit card'],
              ['amo', 'Paid in AMO'],
              ['none', 'Not paid yet (listed for follow-up)'],
            ] as const).map(([v, label]) => (
              <label key={v} className="flex items-center gap-3 text-xl py-1.5">
                <input type="radio" name="finish-pay" checked={payMethod === v} onChange={() => setPayMethod(v)} className="h-7 w-7 shrink-0" />
                {label}
              </label>
            ))}
          </fieldset>
        )}
        <button
          type="button"
          onClick={() => onDone(checkIn, owes && payMethod !== 'none' ? { method: payMethod } : null)}
          className="w-full py-3.5 text-2xl font-bold bg-[#1B2E5B] text-white rounded-xl"
        >
          {checkIn ? 'Check in' : 'Save'}
        </button>
      </div>
    </Sheet>
  );
}

/** Big QR code of this scanner's link: a team member scans it, then enters the event PIN. */
function ShareScannerSheet({ courseId, eventName, onClose }: { courseId: string; eventName: string; onClose: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  // The event PIN (needs internet); undefined while loading, null if unavailable.
  const [pin, setPin] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    fetch(`/api/scan/${courseId}/pin`, { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { pin: null }))
      .then((j) => setPin(j.pin || null))
      .catch(() => setPin(null));
  }, [courseId]);
  const url = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 600, errorCorrectionLevel: 'M' })
      .then(setSrc)
      .catch(() => setSrc(null));
  }, [url]);
  return (
    <Sheet title="Help scan" onClose={onClose}>
      <div className="text-center space-y-3">
        <div>
          <p className="text-xl">Scan to help check in attendees for</p>
          <p
            className={`font-bold whitespace-nowrap overflow-hidden text-ellipsis ${
              eventName.length <= 24 ? 'text-2xl' : eventName.length <= 30 ? 'text-xl' : eventName.length <= 36 ? 'text-lg' : 'text-base'
            }`}
          >
            {eventName}
          </p>
        </div>
        <div className="flex justify-center">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="QR code for the scanner link" className="w-72 h-72 max-w-full" style={{ imageRendering: 'pixelated' }} />
          ) : (
            <div className="w-72 h-72 bg-gray-100 rounded-xl" />
          )}
        </div>
        {pin ? (
          <div className="text-5xl font-extrabold text-[#1B2E5B]">
            PIN: <span className="tracking-[0.15em]">{pin}</span>
          </div>
        ) : (
          <div className="text-lg text-gray-600">
            {pin === undefined ? 'Loading PIN…' : "Couldn't show the PIN (no connection?). It's on the course page's Setup tab."}
          </div>
        )}
        <p className="text-sm text-gray-500 break-all">{url}</p>
      </div>
    </Sheet>
  );
}

/** Fix someone's name/title/township on the spot, then print a new NIIMBOT label. */
function FixDetailsSheet({
  courseId,
  person,
  substitute = false,
  onClose,
  onSaved,
}: {
  courseId: string;
  person: RosterPerson;
  // Someone else is attending on this registration: start with a blank name.
  substitute?: boolean;
  onClose: () => void;
  onSaved: (p: RosterPerson) => void;
}) {
  const [f, setF] = useState({
    first_name: substitute ? '' : person.first_name || '',
    last_name: substitute ? '' : person.last_name || '',
    email: '',
    title: substitute ? '' : person.title || '',
    township: person.township || '',
    county: person.county || '',
    organization: person.organization || '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const field = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="block text-base font-semibold mb-1">{label}</span>
      <input value={f[k]} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} className="w-full px-3 py-3 text-lg border border-gray-300 rounded-xl" {...props} />
    </label>
  );
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.first_name.trim() || !f.last_name.trim()) return setErr('First and last name are required.');
    if (substitute && !f.email.trim()) return setErr('Email is required, so they can get their certificate.');
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/scan/${courseId}/edit`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          substitute ? { registrant_id: person.id, substitute: true, ...f } : { registrant_id: person.id, ...f, email: undefined }
        ),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not save');
      onSaved(json.person);
    } catch (e: any) {
      setErr(e?.message === 'Failed to fetch' ? 'No connection. Try again when the phone is back online.' : e.message);
      setBusy(false);
    }
  };
  return (
    <Sheet title={substitute ? 'Someone else is attending' : 'Fix name & reprint label'} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        {substitute && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm">
            Registration of <strong>{person.in_place_of || `${person.first_name} ${person.last_name}`}</strong>
            {badgeNumberLabel(person) ? ` (${badgeNumberLabel(person)})` : ''}. Enter the person who&apos;s attending instead.
            {person.in_place_of ? '' : ` ${person.first_name} ${person.last_name} stays on record as the registrant.`}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {field('first_name', 'First name *', { autoCapitalize: 'words', autoFocus: substitute })}
          {field('last_name', 'Last name *', { autoCapitalize: 'words' })}
        </div>
        {substitute && field('email', 'Email * (for their certificate)', { type: 'email', inputMode: 'email', autoCapitalize: 'none' })}
        {field('title', 'Title', { autoCapitalize: 'words' })}
        <div className="grid grid-cols-2 gap-3">
          {field('township', 'Township', { autoCapitalize: 'words' })}
          {field('county', 'County', { autoCapitalize: 'words' })}
        </div>
        {field('organization', 'Organization (sponsors, speakers, vendors)', { autoCapitalize: 'words' })}
        {err && <p className="text-base text-red-600">{err}</p>}
        <button type="submit" disabled={busy} className="w-full py-3.5 text-lg font-semibold bg-[#1B2E5B] text-white rounded-xl disabled:opacity-50">
          {busy ? 'Saving…' : substitute ? 'Save and make their label' : 'Save and make new label'}
        </button>
        <p className="text-sm text-gray-500">
          {substitute
            ? 'Needs internet. They use this registration (badge number, QR code and payment). The original registrant is kept on record, and an AMO re-import won\'t undo it.'
            : 'Needs internet. Their badge number and QR code stay the same, so the old badge still scans. The fix is kept when the AMO list is imported again.'}
        </p>
      </form>
    </Sheet>
  );
}

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
  onFix,
  onSubstitute,
  onPay,
}: {
  roster: RosterPerson[];
  todays: ScanRecord[];
  mode: Mode;
  onCheck: (p: RosterPerson) => void;
  onAddWalkIn: () => void;
  onFix: (p: RosterPerson) => void;
  onSubstitute: (p: RosterPerson) => void;
  onPay: (p: RosterPerson) => void;
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
          // The original registrant's name finds who's attending in their place.
          (!!p.in_place_of && p.in_place_of.toLowerCase().includes(t)) ||
          (/^#?\d+$/.test(t) && !p.is_walk_in && String(p.badge_number ?? '') === t.replace('#', '')) ||
          // Township or organization, e.g. "Ohio" lists everyone from Ohio Township
          // (a trustee paying for their staff).
          (t.length >= 3 && `${p.township || ''} ${p.organization || ''}`.toLowerCase().includes(t))
      )
      .slice(0, 25);
  }, [q, roster]);
  // Today: checked in (green) / checked out (grey) / nothing yet.
  const stateFor = (id: string): 'in' | 'out' | null => {
    const mine = todays.filter((x) => x.registrant_id === id).sort((a, b) => a.scanned_at.localeCompare(b.scanned_at));
    if (!mine.length) return null;
    return mine[mine.length - 1].direction === 'out' ? 'out' : 'in';
  };
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
        <Search className="w-6 h-6 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Last name, township or #"
          autoComplete="off"
          className={`w-full pl-11 ${q ? 'pr-[6.5rem]' : 'pr-4'} py-4 text-xl bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#1B2E5B] [&::-webkit-search-cancel-button]:appearance-none`}
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-2 py-2 rounded-lg bg-gray-200 active:bg-gray-300 text-gray-800 text-base font-bold"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>
      {q.trim() && (
        <div className="mt-2 bg-white rounded-xl shadow-sm px-4">
          {!matches.length ? (
            <div className="py-4 flex flex-col gap-3">
              <p className="text-lg text-gray-700">No one by that name, so they&apos;re a walk-in.</p>
              <button
                type="button"
                onClick={() => {
                  setQ('');
                  onAddWalkIn();
                }}
                className="w-full flex items-center justify-center gap-2.5 py-3 bg-[#1B2E5B] text-white rounded-xl font-bold text-2xl"
              >
                <UserPlus className="w-7 h-7" /> Add walk-in
              </button>
            </div>
          ) : (
            <ul className="divide-y-2 divide-gray-200">
              {matches.map((p) => {
                const st = stateFor(p.id);
                const owes = p.payment_status === 'due' || (p.prior_unpaid || []).length > 0;
                const action = 'w-full py-3.5 px-4 rounded-xl text-xl font-bold text-left border-2';
                return (
                  <li key={p.id} className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-3xl leading-tight">
                          {p.first_name} {p.last_name}
                        </div>
                        {st && (
                          <div className="mt-1 flex items-center gap-2 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-base font-bold text-white ${st === 'in' ? 'bg-green-600' : 'bg-gray-500'}`}
                            >
                              {st === 'in' ? 'Checked in' : 'Checked out'}
                            </span>
                            {statusFor(p.id) && <span className="text-lg font-semibold text-gray-800">{statusFor(p.id)}</span>}
                          </div>
                        )}
                      </div>
                      {badgeNumberLabel(p) ? (
                        <span className={`flex-shrink-0 font-extrabold text-[#C1272D] text-right leading-none ${p.is_walk_in ? 'text-2xl' : 'text-5xl'}`}>
                          {badgeNumberLabel(p)}
                        </span>
                      ) : p.is_walk_in ? (
                        <span className="flex-shrink-0 text-2xl font-extrabold text-[#1B2E5B] text-right">Walk-in</span>
                      ) : null}
                    </div>
                    {p.title && <div className="mt-1 text-lg text-gray-600 leading-snug">{p.title}</div>}
                    {(townshipLabel(p.township) || p.organization) && (
                      <div className="text-lg text-gray-600 leading-snug">{townshipLabel(p.township) || p.organization}</div>
                    )}
                    {extraOrganization(p) && <div className="text-lg text-gray-600 leading-snug">{extraOrganization(p)}</div>}
                    {(p.cancelled || p.payment_status === 'due') && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {p.cancelled && <span className="px-3 py-1 rounded-full text-base font-bold bg-red-600 text-white">CANCELLED</span>}
                        {p.payment_status === 'due' && (
                          <span className="px-3 py-1 rounded-full text-base font-bold bg-red-100 text-red-700 border border-red-300">Payment due</span>
                        )}
                      </div>
                    )}
                    {p.in_place_of && <div className="mt-1 text-lg font-semibold text-amber-700">In place of {p.in_place_of}</div>}
                    {p.cancelled && <div className="mt-1 text-base text-red-700">Came anyway? Check them in as usual.</div>}
                    {(p.prior_unpaid || []).map((d, i) => (
                      <div key={i} className="mt-1 text-lg font-semibold text-red-700">
                        Owes {d.balance_due ? `$${Number(d.balance_due).toFixed(2)} ` : ''}from {d.course_name}
                      </div>
                    ))}
                    <div className="mt-3 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onCheck(p);
                          setQ('');
                        }}
                        className={`${action} bg-[#1B2E5B] border-[#1B2E5B] text-white`}
                      >
                        {mode === 'in' ? 'Check in without badge' : 'Check out without badge'}
                      </button>
                      {owes && (
                        <button type="button" onClick={() => onPay(p)} className={`${action} bg-white border-red-600 text-red-700`}>
                          Record payment
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onFix(p);
                          setQ('');
                        }}
                        className={`${action} bg-white border-gray-300 text-gray-900`}
                      >
                        Fix name &amp; reprint
                      </button>
                      {!p.is_walk_in && (
                        <button
                          type="button"
                          onClick={() => {
                            onSubstitute(p);
                            setQ('');
                          }}
                          className={`${action} bg-white border-amber-500 text-amber-800`}
                        >
                          Someone else is attending
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
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
  const [payMethod, setPayMethod] = useState<'none' | 'check' | 'card' | 'amo'>('none');
  const [f, setF] = useState({ first_name: '', last_name: '', title: '', township: '', county: '', organization: '', email: '', registrant_type: 'Attendee' });
  // Checked by default (most walk-ins are checking in); untick to only add them.
  const [checkIn, setCheckIn] = useState(true);
  const field = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="block text-base font-semibold mb-1">{label}</span>
      <input value={f[k]} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} className="w-full px-3 py-3 text-lg border border-gray-300 rounded-xl" {...props} />
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
              township: f.township.trim() || undefined,
              county: f.county.trim() || undefined,
              organization: f.organization.trim() || undefined,
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
            <span className="block text-base font-semibold mb-1">Type</span>
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
        {/* Sponsors, speakers and vendors: organization first; everyone can have both. */}
        {usesOrg && field('organization', 'Organization', { autoCapitalize: 'words', placeholder: 'Company or agency name' })}
        <div className="grid grid-cols-2 gap-3">
          {field('township', usesOrg ? 'Township (optional)' : 'Township', { autoCapitalize: 'words' })}
          {field('county', usesOrg ? 'County (optional)' : 'County', { autoCapitalize: 'words' })}
        </div>
        {!usesOrg && field('organization', 'Organization (optional)', { autoCapitalize: 'words', placeholder: 'Company or agency name' })}
        <div className="relative">
          {field('email', 'Email * (for their certificate)', { type: 'email', inputMode: 'email', autoCapitalize: 'none', required: true })}
          {f.email.trim() && (
            <div className="absolute right-2 bottom-2">
              <CopyButton text={f.email.trim()} />
            </div>
          )}
        </div>
        {f.email.trim() && !emailOk && <p className="text-sm text-red-600 -mt-2">Check the email: it should look like name@example.com.</p>}
        <label className="flex items-center gap-3 text-xl font-semibold py-1">
          <input type="checkbox" checked={checkIn} onChange={(e) => setCheckIn(e.target.checked)} className="h-7 w-7 shrink-0" />
          Check them in now
        </label>
        {tracksPayment && (
          <fieldset className="space-y-1">
            <legend className="text-xl font-bold mb-1">Payment</legend>
            {([
              ['check', 'Paid by check'],
              ['card', 'Paid by credit card'],
              ['amo', 'Paid in AMO'],
              ['none', 'Not paid yet (listed for follow-up)'],
            ] as const).map(([v, label]) => (
              <label key={v} className="flex items-center gap-3 text-xl py-1.5">
                <input type="radio" name="walkin-pay" checked={payMethod === v} onChange={() => setPayMethod(v)} className="h-7 w-7 shrink-0" />
                {label}
              </label>
            ))}
          </fieldset>
        )}
        <button type="submit" disabled={!ok} className="w-full py-3.5 text-lg font-semibold bg-[#1B2E5B] text-white rounded-xl disabled:opacity-50">
          Add walk-in
        </button>
        {!ok && <p className="text-sm text-gray-500 text-center">First name, last name and email are required.</p>}
        <p className="text-sm text-gray-500">Works offline. It uploads with the scans when the phone is back online.</p>
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
