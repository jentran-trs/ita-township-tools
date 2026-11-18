"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, CheckCircle2, ChevronRight, Delete } from 'lucide-react';

const NAVY = '#1B2E5B';
const IDLE_MS = 90_000; // walked away mid-form: back to the search screen after 1.5 minutes
const THANKS_MS = 5_000; // thank-you, then straight back to Find My Badge Number
const TYPES = ['Attendee', 'Sponsor', 'Speaker', 'Resource Vendor', 'Staff'];

type FieldKey = 'first_name' | 'last_name' | 'title' | 'township' | 'county' | 'organization' | 'email';
// Order the "Next" key moves through.
const ORDER: FieldKey[] = ['first_name', 'last_name', 'title', 'township', 'county', 'organization', 'email'];
const MAX: Record<FieldKey, number> = { first_name: 60, last_name: 60, title: 80, township: 60, county: 60, organization: 100, email: 120 };

/**
 * Self-registration on the check-in tablet for walk-ins. Same details as the
 * desk's walk-in form, minus payment (the desk does that). Uses its own
 * on-screen keyboard and number pad (no text inputs), so the tablet's keyboard
 * never opens and the whole form stays on screen.
 */
export function RegisterForm({ courseId, onDone }: { courseId: string; eventName?: string; onDone: () => void }) {
  const [f, setF] = useState<Record<FieldKey, string>>({ first_name: '', last_name: '', title: '', township: '', county: '', organization: '', email: '' });
  const [type, setType] = useState('Attendee');
  const [active, setActive] = useState<FieldKey>('first_name');
  const [shift, setShift] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [thanks, setThanks] = useState<string | null>(null);

  // Leave the form if nobody touches it for a while (and after the thank-you).
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const poke = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(onDone, thanks ? THANKS_MS : IDLE_MS);
  }, [onDone, thanks]);
  useEffect(() => {
    poke();
    const events = ['pointerdown', 'keydown'] as const;
    events.forEach((ev) => window.addEventListener(ev, poke, { passive: true }));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, poke));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [poke]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim());
  const ok = !!(f.first_name.trim() && f.last_name.trim() && emailOk);

  // Typing: names and places capitalise each word; the email stays lowercase.
  const type1 = useCallback(
    (key: string) => {
      setErr(null);
      setF((cur) => {
        const v = cur[active];
        if (key === 'back') return { ...cur, [active]: v.slice(0, -1) };
        let ch = key;
        if (active === 'email') ch = ch.toLowerCase();
        else if (/^[a-z]$/i.test(ch)) {
          const startOfWord = v === '' || /[\s\-']$/.test(v);
          ch = startOfWord || shift ? ch.toUpperCase() : ch.toLowerCase();
        }
        if (active === 'email' && ch === ' ') return cur;
        return { ...cur, [active]: (v + ch).slice(0, MAX[active]) };
      });
      if (key !== 'back') setShift(false);
    },
    [active, shift]
  );
  const next = useCallback(() => setActive((a) => ORDER[(ORDER.indexOf(a) + 1) % ORDER.length]), []);

  const submit = useCallback(async () => {
    if (!ok) {
      setErr('Please fill in your first name, last name and email.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/scan/${courseId}/register`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, registrant_type: type }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Something went wrong. Please ask at the Registration Table.');
      setThanks(json.first_name || f.first_name.trim());
    } catch (e: any) {
      setErr(e?.message === 'Failed to fetch' ? 'No internet connection. Please ask at the Registration Table.' : e.message);
    } finally {
      setBusy(false);
    }
  }, [courseId, f, ok, type]);

  // A real keyboard works too (laptop, testing).
  useEffect(() => {
    if (thanks) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement)?.tagName === 'SELECT') return;
      if (e.key === 'Backspace') type1('back');
      else if (e.key === 'Tab') next();
      else if (e.key === 'Enter') submit();
      else if (e.key.length === 1) {
        // Keep the capital letters someone types on a real keyboard.
        if (/^[A-Z]$/.test(e.key) && active !== 'email') setShift(true);
        type1(e.key);
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [thanks, type1, next, submit, active]);

  if (thanks) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-6">
        <CheckCircle2 className="w-28 h-28 text-green-600" />
        <p className="text-5xl font-extrabold" style={{ color: NAVY }}>
          Thank you, {thanks}!
        </p>
        <p className="text-3xl text-gray-700 max-w-3xl">Please go to the Registration Table to pay and pick up your badge.</p>
        <button type="button" onClick={onDone} className="mt-4 px-10 py-5 text-2xl font-bold text-white rounded-2xl" style={{ background: NAVY }}>
          Done
        </button>
      </div>
    );
  }

  const usesOrg = ['Sponsor', 'Speaker', 'Resource Vendor'].includes(type);
  const box = (k: FieldKey, label: string, className = '') => {
    const on = active === k;
    return (
      <div className={`min-w-0 ${className}`}>
        <div className="text-xl font-bold mb-1 whitespace-nowrap truncate">{label}</div>
        <div
          role="textbox"
          aria-label={label}
          onPointerDown={(e) => {
            e.preventDefault();
            setActive(k);
          }}
          className={`h-16 flex items-center px-4 bg-white rounded-xl border-[3px] cursor-text overflow-hidden ${on ? '' : 'border-gray-300'}`}
          style={on ? { borderColor: NAVY } : undefined}
        >
          <span className="text-3xl whitespace-pre truncate">{f[k]}</span>
          {on && <span className="ml-0.5 w-[3px] h-9 flex-shrink-0 animate-pulse" style={{ background: NAVY }} />}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-4 pb-2 space-y-3">
        <div className="grid grid-cols-12 gap-3">
          {box('first_name', 'First name *', 'col-span-3')}
          {box('last_name', 'Last name *', 'col-span-3')}
          {box('title', 'Title', 'col-span-3')}
          <div className="col-span-3 min-w-0">
            <div className="text-xl font-bold mb-1">I am a…</div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="I am a"
              className="w-full h-16 px-3 text-3xl bg-white border-[3px] border-gray-300 rounded-xl"
            >
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-3">
          {box('township', usesOrg ? 'Township (optional)' : 'Township', 'col-span-3')}
          {box('county', usesOrg ? 'County (optional)' : 'County', 'col-span-3')}
          {box('organization', usesOrg ? 'Organization' : 'Organization (optional)', 'col-span-6')}
        </div>
        <div className="grid grid-cols-12 gap-3 items-end">
          {box('email', 'Email * (for your certificate)', 'col-span-8')}
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="col-span-4 h-16 text-3xl font-extrabold text-white rounded-xl disabled:opacity-50"
            style={{ background: ok ? NAVY : '#94a3b8' }}
          >
            {busy ? 'Saving…' : 'Register'}
          </button>
        </div>
        <p className={`text-xl ${err || (f.email && !emailOk) ? 'text-red-600' : 'text-gray-600'}`}>
          {err ||
            (f.email && !emailOk
              ? 'Please check your email: it should look like name@example.com.'
              : 'Then go to the Registration Table to pay and pick up your badge.')}
        </p>
      </div>
      <FullKeyboard onKey={type1} onNext={next} shift={shift} setShift={setShift} lower={active === 'email'} />
    </div>
  );
}

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

/** Letters, symbols for names/emails, and a number pad on the right. Keys react on touch-down. */
function FullKeyboard({
  onKey,
  onNext,
  shift,
  setShift,
  lower,
}: {
  onKey: (key: string) => void;
  onNext: () => void;
  shift: boolean;
  setShift: (v: boolean) => void;
  lower: boolean;
}) {
  const tap = (fn: () => void) => (e: React.PointerEvent) => {
    e.preventDefault();
    fn();
  };
  const keyCls =
    'flex items-center justify-center rounded-xl bg-white border-b-4 border-gray-300 font-bold text-gray-900 shadow-sm active:bg-gray-200 active:border-b-2 active:translate-y-[2px] select-none';
  const h = 'h-[clamp(3rem,7.6vh,4.5rem)]';
  const txt = 'text-[clamp(1.4rem,3.4vh,2.1rem)]';
  const label = (k: string) => (lower ? k.toLowerCase() : k);
  return (
    <div className="flex-shrink-0 bg-gray-200 px-3 pt-3 pb-4 flex gap-4" style={{ touchAction: 'manipulation' }}>
      {/* Letters */}
      <div className="flex-1 min-w-0 space-y-2">
        {ROWS.map((row, i) => (
          <div key={row} className="flex gap-2 justify-center" style={{ paddingLeft: `${i * 2.5}%`, paddingRight: i === 2 ? 0 : `${i * 2.5}%` }}>
            {i === 2 && (
              <button
                type="button"
                onPointerDown={tap(() => setShift(!shift))}
                aria-label="Capital letter"
                className={`${keyCls} ${h} flex-[1.4] ${shift ? '!bg-[#1B2E5B] !text-white' : 'bg-gray-100'}`}
              >
                <ArrowUp className="w-8 h-8" />
              </button>
            )}
            {row.split('').map((k) => (
              <button key={k} type="button" onPointerDown={tap(() => onKey(k))} className={`${keyCls} ${h} flex-1 ${txt}`}>
                {label(k)}
              </button>
            ))}
            {i === 2 && (
              <button type="button" onPointerDown={tap(() => onKey('back'))} aria-label="Delete" className={`${keyCls} ${h} flex-[2] bg-gray-100 gap-2 text-2xl`}>
                <Delete className="w-8 h-8 flex-shrink-0" /> Delete
              </button>
            )}
          </div>
        ))}
        <div className="flex gap-2">
          {['@', '.', '_', '-', "'"].map((k) => (
            <button key={k} type="button" onPointerDown={tap(() => onKey(k))} className={`${keyCls} ${h} flex-1 ${txt}`}>
              {k}
            </button>
          ))}
          <button type="button" onPointerDown={tap(() => onKey(' '))} className={`${keyCls} ${h} flex-[4] text-2xl`}>
            Space
          </button>
          <button type="button" onPointerDown={tap(onNext)} className={`${keyCls} ${h} flex-[2] gap-1 text-2xl !bg-[#1B2E5B] !text-white !border-[#0f1d3d]`}>
            Next <ChevronRight className="w-7 h-7" />
          </button>
        </div>
      </div>
      {/* Number pad */}
      <div className="w-[24%] max-w-[18rem] grid grid-cols-3 gap-2 content-start">
        {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((k) => (
          <button key={k} type="button" onPointerDown={tap(() => onKey(k))} className={`${keyCls} ${h} ${txt}`}>
            {k}
          </button>
        ))}
        <button type="button" onPointerDown={tap(() => onKey('0'))} className={`${keyCls} ${h} col-span-3 ${txt}`}>
          0
        </button>
      </div>
    </div>
  );
}
