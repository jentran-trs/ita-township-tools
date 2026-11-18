"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

const NAVY = '#1B2E5B';
const IDLE_MS = 120_000; // walked away mid-form: back to the search screen
const THANKS_MS = 12_000;
const TYPES = ['Attendee', 'Sponsor', 'Speaker', 'Resource Vendor', 'Staff'];

/**
 * Self-registration on the check-in tablet for walk-ins. Same details as the
 * desk's walk-in form, minus payment (the desk does that). Saved straight away;
 * the person then appears in the scanner's "Waiting at the desk" list.
 */
export function RegisterForm({ courseId, onDone }: { courseId: string; eventName?: string; onDone: () => void }) {
  const empty = { first_name: '', last_name: '', title: '', registrant_type: 'Attendee', township: '', county: '', organization: '', email: '' };
  const [f, setF] = useState(empty);
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
    const events = ['pointerdown', 'keydown', 'input'] as const;
    events.forEach((ev) => window.addEventListener(ev, poke, { passive: true }));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, poke));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [poke]);

  const usesOrg = ['Sponsor', 'Speaker', 'Resource Vendor'].includes(f.registrant_type);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim());
  const ok = f.first_name.trim() && f.last_name.trim() && emailOk;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok) return setErr('Please fill in your first name, last name and email.');
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/scan/${courseId}/register`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Something went wrong. Please ask at the Registration Table.');
      setThanks(json.first_name || f.first_name.trim());
    } catch (e: any) {
      setErr(e?.message === 'Failed to fetch' ? 'No internet connection. Please ask at the Registration Table.' : e.message);
    } finally {
      setBusy(false);
    }
  };

  const field = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="block text-2xl font-semibold mb-1.5">{label}</span>
      <input
        value={f[k]}
        onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))}
        className="w-full px-4 py-3.5 text-2xl bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#1B2E5B]"
        {...props}
      />
    </label>
  );

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

  return (
    <form onSubmit={submit} className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-2xl text-gray-700">Not on the list? Fill this in, then pay at the Registration Table.</p>
          <button type="button" onClick={onDone} className="flex items-center gap-2 px-5 py-3 text-xl font-bold rounded-xl bg-gray-200 active:bg-gray-300">
            <ArrowLeft className="w-6 h-6" /> Back
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {field('first_name', 'First name *', { autoCapitalize: 'words', autoComplete: 'off', autoFocus: true })}
          {field('last_name', 'Last name *', { autoCapitalize: 'words', autoComplete: 'off' })}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {field('title', 'Title', { autoCapitalize: 'words', autoComplete: 'off' })}
          <label className="block">
            <span className="block text-2xl font-semibold mb-1.5">I am a…</span>
            <select
              value={f.registrant_type}
              onChange={(e) => setF((x) => ({ ...x, registrant_type: e.target.value }))}
              className="w-full px-4 py-3.5 text-2xl bg-white border-2 border-gray-300 rounded-xl"
            >
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
        {usesOrg && field('organization', 'Organization', { autoCapitalize: 'words', autoComplete: 'off', placeholder: 'Company or agency name' })}
        <div className="grid grid-cols-2 gap-4">
          {field('township', usesOrg ? 'Township (optional)' : 'Township', { autoCapitalize: 'words', autoComplete: 'off' })}
          {field('county', usesOrg ? 'County (optional)' : 'County', { autoCapitalize: 'words', autoComplete: 'off' })}
        </div>
        {!usesOrg && field('organization', 'Organization (optional)', { autoCapitalize: 'words', autoComplete: 'off', placeholder: 'Company or agency name' })}
        {field('email', 'Email * (for your certificate)', { type: 'email', inputMode: 'email', autoCapitalize: 'none', autoComplete: 'off' })}
        {f.email.trim() && !emailOk && <p className="text-xl text-red-600 -mt-3">Please check your email: it should look like name@example.com.</p>}
        {err && <p className="text-2xl text-red-600">{err}</p>}
        <button
          type="submit"
          disabled={busy || !ok}
          className="w-full py-5 text-3xl font-bold text-white rounded-2xl disabled:opacity-40"
          style={{ background: NAVY }}
        >
          {busy ? 'Saving…' : 'Register'}
        </button>
        <p className="text-xl text-gray-600 text-center pb-6">Then go to the Registration Table to pay and pick up your badge.</p>
      </div>
    </form>
  );
}
