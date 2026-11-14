"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronUp, Delete, Maximize, Search, X } from 'lucide-react';

type Person = { first: string; last: string; place: string; number: number };
type Data = { event: { name: string }; people: Person[]; savedAt: number };

const CLEAR_AFTER_MS = 10_000; // after the last touch or key press
const REFRESH_EVERY_MS = 3 * 60_000; // pick up late additions
const MIN_LETTERS = 2;
const MAX_SHOWN = 6;
const NAVY = '#1B2E5B';

const storeKey = (courseId: string) => `tt_find_${courseId}`;

export function FindBadgeClient({ courseId }: { courseId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [eventName, setEventName] = useState('');
  const [phase, setPhase] = useState<'loading' | 'pin' | 'ready' | 'closed' | 'notfound'>('loading');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  // Our own letters-only keyboard (the tablet's keyboard covers half the screen).
  const [kbOpen, setKbOpen] = useState(true);

  // ---------- data ----------
  const fetchList = useCallback(async (): Promise<'ok' | 'pin' | 'offline'> => {
    try {
      const res = await fetch(`/api/scan/${courseId}/lookup`, { cache: 'no-store', credentials: 'same-origin' });
      if (res.status === 401) return 'pin';
      if (!res.ok) return 'offline';
      const json = await res.json();
      const next: Data = { ...json, savedAt: Date.now() };
      setData(next);
      try {
        localStorage.setItem(storeKey(courseId), JSON.stringify(next));
      } catch {}
      return 'ok';
    } catch {
      return 'offline';
    }
  }, [courseId]);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/scan-sw.js', { scope: '/scan/' }).catch(() => {});
    (async () => {
      // Last saved list first, so the screen works with no internet.
      try {
        const saved = localStorage.getItem(storeKey(courseId));
        if (saved) {
          setData(JSON.parse(saved));
          setPhase('ready');
        }
      } catch {}
      try {
        const res = await fetch(`/api/scan/${courseId}`, { cache: 'no-store' });
        if (res.status === 404) return setPhase('notfound');
        const info = await res.json();
        setEventName(info.name || '');
        if (!info.scanning_open) return setPhase('closed');
      } catch {}
      const r = await fetchList();
      if (r === 'ok') setPhase('ready');
      else if (r === 'pin') setPhase('pin');
      else setPhase((p) => (p === 'loading' ? 'pin' : p));
    })();
  }, [courseId, fetchList]);

  useEffect(() => {
    if (phase !== 'ready') return;
    const t = setInterval(() => {
      fetchList().then((r) => r === 'pin' && setPhase('pin'));
    }, REFRESH_EVERY_MS);
    return () => clearInterval(t);
  }, [phase, fetchList]);

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setPinError(null);
    try {
      const res = await fetch(`/api/scan/${courseId}/unlock`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not unlock');
      setPin('');
      const r = await fetchList();
      if (r !== 'ok') throw new Error('Could not load the list. Check the internet connection.');
      setPhase('ready');
    } catch (err: any) {
      setPinError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // ---------- auto-clear 10 seconds after the last touch / key ----------
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearName = useCallback(() => {
    setQ('');
    setKbOpen(true);
  }, []);
  const press = useCallback((key: string) => {
    setKbOpen(true);
    setQ((cur) => (key === 'back' ? cur.slice(0, -1) : (cur + key).slice(0, 30)));
  }, []);
  // A real keyboard works too (handy for a laptop, and for testing).
  useEffect(() => {
    if (phase !== 'ready') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Backspace') press('back');
      else if (e.key === 'Escape') clearName();
      else if (/^[a-zA-Z' -]$/.test(e.key)) press(e.key.toUpperCase());
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, press, clearName]);
  const poke = useCallback(() => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(clearName, CLEAR_AFTER_MS);
  }, [clearName]);
  useEffect(() => {
    if (phase !== 'ready') return;
    const events = ['pointerdown', 'keydown', 'input', 'touchstart'] as const;
    events.forEach((ev) => window.addEventListener(ev, poke, { passive: true }));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, poke));
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, [phase, poke]);

  // ---------- search ----------
  const term = q.trim().toLowerCase().replace(/\s+/g, ' ');
  const matches = useMemo(() => {
    if (!data || term.replace(/[^a-z]/g, '').length < MIN_LETTERS) return [];
    const hits = data.people.filter((p) => {
      const first = p.first.toLowerCase();
      const last = p.last.toLowerCase();
      return last.startsWith(term) || `${first} ${last}`.includes(term) || `${last} ${first}`.startsWith(term);
    });
    // Last names that start with what they typed come first.
    return hits.sort((a, b) => Number(!b.last.toLowerCase().startsWith(term)) - Number(!a.last.toLowerCase().startsWith(term)));
  }, [data, term]);

  // One match: fold the keyboard away after a short pause so the number fills the screen.
  useEffect(() => {
    if (matches.length !== 1) return;
    const t = setTimeout(() => setKbOpen(false), 1200);
    return () => clearTimeout(t);
  }, [matches.length, term]);

  const fullscreen = () => {
    const el: any = document.documentElement;
    (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
  };

  // ---------- screens ----------
  if (phase === 'loading') return <Frame><p className="text-3xl text-gray-500 text-center py-24">Loading…</p></Frame>;
  if (phase === 'notfound') return <Frame><p className="text-3xl text-center py-24">This event wasn&apos;t found.</p></Frame>;
  if (phase === 'closed') {
    return (
      <Frame>
        <p className="text-3xl text-center py-24">Badge lookup isn&apos;t open for this event.</p>
      </Frame>
    );
  }
  if (phase === 'pin') {
    return (
      <Frame>
        <form onSubmit={unlock} className="max-w-md mx-auto py-16 space-y-4">
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>
            Set up the badge lookup screen
          </h1>
          <p className="text-gray-600">{eventName}</p>
          <p className="text-gray-600">Staff: enter the event PIN (the same one the scanners use).</p>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            className="w-full px-4 py-4 text-3xl tracking-widest text-center border-2 border-gray-300 rounded-xl"
          />
          {pinError && <p className="text-red-600">{pinError}</p>}
          <button type="submit" disabled={busy || pin.length < 4} className="w-full py-4 text-xl font-bold text-white rounded-xl disabled:opacity-50" style={{ background: NAVY }}>
            {busy ? 'Opening…' : 'Open lookup screen'}
          </button>
        </form>
      </Frame>
    );
  }

  const name = data?.event.name || eventName;
  return (
    <div className="h-[100dvh] flex flex-col bg-gray-50 text-gray-900 overflow-hidden">
      {/* Compact header so the search and results stay above the on-screen keyboard. */}
      <header className="flex items-center gap-4 px-6 py-3 text-white flex-shrink-0" style={{ background: NAVY }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/badges/ita-logo.png" alt="ITA" className="h-12 w-12 rounded-full bg-white object-contain" />
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-wide leading-none">FIND MY BADGE NUMBER</h1>
          {name && <div className="text-base opacity-80 truncate mt-1">{name}</div>}
        </div>
        <button type="button" onClick={fullscreen} className="p-2 rounded-lg hover:bg-white/10" aria-label="Full screen" title="Full screen">
          <Maximize className="w-6 h-6" />
        </button>
      </header>

      <div className="px-6 pt-4 flex-shrink-0">
        <div className="flex items-stretch gap-3">
          {/* Looks like a search box but isn't a text field, so the tablet's keyboard never opens. */}
          <div
            role="textbox"
            aria-label="Your last name"
            onClick={() => setKbOpen(true)}
            className="relative flex-1 flex items-center pl-20 pr-4 py-4 bg-white border-4 rounded-2xl cursor-text"
            style={{ borderColor: NAVY }}
          >
            <Search className="w-9 h-9 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
            {q ? (
              <span className="text-4xl font-semibold tracking-wide whitespace-pre">{q}</span>
            ) : (
              <span className="text-4xl font-semibold text-gray-400">Type your last name</span>
            )}
            {kbOpen && <span className="ml-0.5 w-[3px] h-10 animate-pulse" style={{ background: NAVY }} />}
          </div>
          <button
            type="button"
            onClick={clearName}
            className="flex items-center gap-2 px-7 text-2xl font-bold text-white rounded-2xl active:scale-95 transition-transform"
            style={{ background: '#C1272D' }}
          >
            <X className="w-8 h-8" /> Clear Name
          </button>
        </div>
      </div>

      <main className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        {term.replace(/[^a-z]/g, '').length < MIN_LETTERS ? (
          <div className="text-center pt-8 text-gray-500">
            <p className="text-3xl font-semibold">Type your last name on the keyboard below.</p>
            <p className="text-xl mt-3">Your badge number will appear here.</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center pt-8">
            <p className="text-4xl font-bold" style={{ color: NAVY }}>
              Can&apos;t find your name?
            </p>
            <p className="text-3xl mt-3 text-gray-700">Please go to the Registration Table to sign up and get your badge.</p>
          </div>
        ) : matches.length === 1 ? (
          <BigResult p={matches[0]} />
        ) : (
          <>
            <div className={`grid gap-4 ${matches.length <= 4 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'}`}>
              {matches.slice(0, MAX_SHOWN).map((p, i) => (
                <div key={`${p.number}-${i}`} className="bg-white rounded-2xl border-2 border-gray-200 p-5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold leading-tight ${matches.length <= 4 ? 'text-3xl' : 'text-2xl'}`}>
                      {p.first} {p.last}
                    </div>
                    {p.place && <div className={`text-gray-600 leading-snug ${matches.length <= 4 ? 'text-xl' : 'text-lg'}`}>{p.place}</div>}
                  </div>
                  <div className={`font-extrabold leading-none flex-shrink-0 ${matches.length <= 4 ? 'text-7xl' : 'text-6xl'}`} style={{ color: NAVY }}>
                    #{p.number}
                  </div>
                </div>
              ))}
            </div>
            {matches.length > MAX_SHOWN && (
              <p className="text-xl text-gray-500 text-center mt-4">More names match. Keep typing your last name.</p>
            )}
            <Instruction />
          </>
        )}
      </main>

      {kbOpen ? (
        <LetterKeyboard onKey={press} />
      ) : (
        <button
          type="button"
          onClick={() => setKbOpen(true)}
          className="flex-shrink-0 flex items-center justify-center gap-2 py-4 text-2xl font-bold text-white"
          style={{ background: NAVY }}
        >
          <ChevronUp className="w-7 h-7" /> Show keyboard
        </button>
      )}
    </div>
  );
}

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

/** Big letters-only keyboard. Keys react on touch-down so fast typing works. */
function LetterKeyboard({ onKey }: { onKey: (key: string) => void }) {
  const tap = (key: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    onKey(key);
  };
  const keyCls =
    'flex items-center justify-center rounded-xl bg-white border-b-4 border-gray-300 font-bold text-gray-900 shadow-sm active:bg-gray-200 active:border-b-2 active:translate-y-[2px] select-none';
  const h = 'h-[clamp(3.25rem,8.5vh,5rem)]';
  return (
    <div className="flex-shrink-0 bg-gray-200 px-3 pt-3 pb-4 space-y-2" style={{ touchAction: 'manipulation' }}>
      {ROWS.map((row, i) => (
        <div key={row} className="flex gap-2 justify-center" style={{ paddingLeft: `${i * 3}%`, paddingRight: `${i * 3}%` }}>
          {row.split('').map((k) => (
            <button key={k} type="button" onPointerDown={tap(k)} className={`${keyCls} ${h} flex-1 max-w-[7rem] text-[clamp(1.5rem,3.6vh,2.25rem)]`}>
              {k}
            </button>
          ))}
          {i === 2 && (
            <button type="button" onPointerDown={tap('back')} aria-label="Delete" className={`${keyCls} ${h} flex-[2.2] max-w-[14rem] bg-gray-100 gap-2 text-[clamp(1.25rem,3vh,1.875rem)]`}>
              <Delete className="w-8 h-8 flex-shrink-0" /> Delete
            </button>
          )}
        </div>
      ))}
      <div className="flex gap-2 justify-center px-[9%]">
        <button type="button" onPointerDown={tap("'")} className={`${keyCls} ${h} w-24 text-3xl`}>
          &apos;
        </button>
        <button type="button" onPointerDown={tap('-')} className={`${keyCls} ${h} w-24 text-3xl`}>
          -
        </button>
        <button type="button" onPointerDown={tap(' ')} className={`${keyCls} ${h} flex-1 text-[clamp(1.5rem,3.6vh,2.25rem)]`}>
          Space
        </button>
      </div>
    </div>
  );
}

function BigResult({ p }: { p: Person }) {
  return (
    <div className="bg-white rounded-3xl border-4 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6" style={{ borderColor: NAVY }}>
      <div className="flex-1 min-w-0 text-center sm:text-left">
        <div className="text-5xl font-extrabold leading-tight">
          {p.first} {p.last}
        </div>
        {p.place && <div className="text-3xl text-gray-600 mt-2">{p.place}</div>}
        <Instruction />
      </div>
      <div className="text-center flex-shrink-0">
        <div className="text-2xl font-bold tracking-widest text-gray-500">YOUR BADGE</div>
        <div className="font-extrabold leading-none" style={{ color: NAVY, fontSize: 'clamp(6rem, 18vw, 13rem)' }}>
          #{p.number}
        </div>
      </div>
    </div>
  );
}

function Instruction() {
  return (
    <p className="text-2xl mt-4 font-semibold" style={{ color: NAVY }}>
      Show this number at the check-in table. We&apos;ll scan your badge to check you in.
    </p>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-gray-50 text-gray-900">
      <header className="px-6 py-4 text-white" style={{ background: NAVY }}>
        <h1 className="text-3xl font-extrabold tracking-wide">FIND MY BADGE NUMBER</h1>
      </header>
      <div className="px-6">{children}</div>
    </div>
  );
}
