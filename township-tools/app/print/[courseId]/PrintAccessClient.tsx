"use client";

import { useCallback, useEffect, useState } from 'react';
import { BadgePrintClient } from '@/app/admin/certificates/[courseId]/badges/print/BadgePrintClient';
import type { BadgeData, BadgeEvent } from '@/components/badges/Badge';

type Info = { name: string; dates: string; times: string | null; scanning_open: boolean };

export function PrintAccessClient({ courseId }: { courseId: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [data, setData] = useState<{ event: BadgeEvent; badges: BadgeData[] } | null>(null);
  const [phase, setPhase] = useState<'loading' | 'pin' | 'ready' | 'closed' | 'notfound'>('loading');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already unlocked on this computer (cookie)? Load straight away.
  const loadBadges = useCallback(async (): Promise<boolean> => {
    const res = await fetch(`/api/scan/${courseId}/badges`, { cache: 'no-store', credentials: 'same-origin' });
    if (!res.ok) return false;
    setData(await res.json());
    setPhase('ready');
    return true;
  }, [courseId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/scan/${courseId}`, { cache: 'no-store' });
        if (res.status === 404) return setPhase('notfound');
        const i: Info = await res.json();
        setInfo(i);
        if (!i.scanning_open) return setPhase('closed');
        if (!(await loadBadges())) setPhase('pin');
      } catch {
        setPhase('pin');
        setError('No internet connection');
      }
    })();
  }, [courseId, loadBadges]);

  const unlock = async (e: React.FormEvent) => {
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
      if (!(await loadBadges())) throw new Error('Unlocked, but the badges did not load. Please try again.');
    } catch (err: any) {
      setError(err.message === 'Failed to fetch' ? 'No internet connection' : err.message);
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'ready' && data) return <BadgePrintClient courseId={courseId} badges={data.badges} event={data.event} />;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-[#1B2E5B] text-white px-5 py-5">
        <div className="text-xs uppercase tracking-wide opacity-80">ITA name badges</div>
        {info && <h1 className="text-xl font-bold leading-tight mt-1">{info.name}</h1>}
        {info && <div className="text-sm opacity-90 mt-0.5">{[info.dates, info.times].filter(Boolean).join(' · ')}</div>}
      </header>
      <main className="max-w-md mx-auto px-5 py-8">
        {phase === 'loading' && <p className="text-center text-gray-500">Loading…</p>}
        {phase === 'notfound' && <p className="text-center">Event not found. Check the link with ITA.</p>}
        {phase === 'closed' && <p className="text-center">Badges aren&apos;t available for this event yet. Please check with ITA.</p>}
        {phase === 'pin' && (
          <form onSubmit={unlock} className="space-y-4">
            <p className="text-gray-700">Enter the event PIN from ITA to print the badges.</p>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              autoFocus
              placeholder="••••"
              aria-label="Event PIN"
              className="w-full text-2xl tracking-widest text-center px-4 py-3 border border-gray-300 rounded-xl bg-white"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={busy || !pin} className="w-full py-3.5 text-lg font-semibold bg-[#1B2E5B] text-white rounded-xl disabled:opacity-50">
              {busy ? 'Opening…' : 'Open badges'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
