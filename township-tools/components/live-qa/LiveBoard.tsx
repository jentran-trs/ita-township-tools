"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';

const POLL_MS = 4000;
const MARK_MS = 450; // how long the red "Dismissed" flash shows before collapsing
const COLLAPSE_MS = 550; // pull-up collapse duration

type BoardQuestion = {
  id: string;
  question: string;
  name: string;
  township: string | null;
  county: string | null;
  approved_at: string | null;
};

type Phase = 'mark' | 'collapse';

// Big, high-contrast board designed to be screencast to an audience.
// - Public read-only view: canDismiss = false.
// - Screencaster view (logged-in superadmin): canDismiss = true adds a clear
//   Dismiss button. Dismissing flashes a "Dismissed" overlay, then the card
//   collapses so the questions below pull up smoothly.
export function LiveBoard({
  boardCode,
  title,
  canDismiss = false,
}: {
  boardCode: string;
  title: string;
  canDismiss?: boolean;
}) {
  const [questions, setQuestions] = useState<BoardQuestion[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Cards mid-animation: id -> phase. Kept on screen until the animation ends,
  // even if the server already dropped them.
  const [dismissing, setDismissing] = useState<Record<string, Phase>>({});

  const questionsRef = useRef<BoardQuestion[]>(questions);
  questionsRef.current = questions;
  const dismissingRef = useRef<Record<string, Phase>>(dismissing);
  dismissingRef.current = dismissing;

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/live-qa/board?code=${encodeURIComponent(boardCode)}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const json = await res.json();
      const server: BoardQuestion[] = json.questions || [];

      // Merge while preserving order and keeping any animating cards in place.
      const prev = questionsRef.current;
      const animating = dismissingRef.current;
      const serverById = new Map(server.map((s) => [s.id, s]));
      const prevIds = new Set(prev.map((p) => p.id));

      const merged: BoardQuestion[] = prev
        .filter((p) => serverById.has(p.id) || animating[p.id])
        .map((p) => serverById.get(p.id) || p);
      for (const s of server) {
        if (!prevIds.has(s.id)) merged.push(s); // newly approved → append at bottom
      }
      setQuestions(merged);
    } catch {
      /* keep last good state on transient errors */
    } finally {
      setLoaded(true);
    }
  }, [boardCode]);

  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    loadRef.current();
    const id = setInterval(() => loadRef.current(), POLL_MS);
    return () => clearInterval(id);
  }, []);

  const onDismiss = (id: string) => {
    if (dismissing[id]) return; // already animating out
    // Phase 1: flash the "Dismissed" overlay at full size.
    setDismissing((d) => ({ ...d, [id]: 'mark' }));
    fetch(`/api/admin/live-qa/questions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss' }),
    }).catch(() => {});

    // Phase 2: collapse the card so the ones below pull up.
    setTimeout(() => {
      setDismissing((d) => (d[id] ? { ...d, [id]: 'collapse' } : d));
    }, MARK_MS);

    // Remove once the collapse finishes.
    setTimeout(() => {
      setQuestions((prev) => prev.filter((x) => x.id !== id));
      setDismissing((d) => {
        const next = { ...d };
        delete next[id];
        return next;
      });
    }, MARK_MS + COLLAPSE_MS);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-slate-900 dark:text-white">
      <header className="border-b border-gray-200 bg-white/80 dark:border-slate-700/60 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="w-full px-6 sm:px-8 py-5 flex items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">{title}</h1>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-300 flex-shrink-0">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400" />
            </span>
            <span className="text-sm font-semibold uppercase tracking-wider">Live Q&amp;A</span>
          </div>
        </div>
      </header>

      <main className="w-full px-6 sm:px-8 py-8">
        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-32">
            <p className="text-3xl sm:text-4xl font-semibold text-gray-600 dark:text-slate-200">
              {loaded ? 'Waiting for questions…' : 'Loading…'}
            </p>
            <p className="mt-4 text-xl text-gray-400 dark:text-slate-400">
              Approved questions will appear here.
            </p>
          </div>
        ) : (
          <div>
            {questions.map((q) => {
              const phase = dismissing[q.id];
              return (
                <div
                  key={q.id}
                  className="grid transition-all duration-500 ease-in-out"
                  style={{ gridTemplateRows: phase === 'collapse' ? '0fr' : '1fr' }}
                >
                  <div className="overflow-hidden min-h-0">
                    <div className="pb-5">
                      <div
                        className={`relative bg-white border border-gray-200 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:shadow-lg rounded-2xl p-6 sm:p-7 transition-transform duration-300 ${
                          phase ? 'scale-[0.99]' : ''
                        }`}
                      >
                        {canDismiss && (
                          <button
                            type="button"
                            onClick={() => onDismiss(q.id)}
                            disabled={!!phase}
                            title="Dismiss (remove from board)"
                            aria-label="Dismiss question"
                            className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                          >
                            <X className="w-4 h-4" />
                            Dismiss
                          </button>
                        )}
                        <p
                          className={`text-2xl sm:text-3xl leading-snug font-medium text-gray-900 dark:text-white ${
                            canDismiss ? 'pr-32' : ''
                          }`}
                        >
                          {q.question}
                        </p>
                        <p className="mt-4 text-lg text-amber-600 dark:text-amber-300 font-semibold">
                          {[q.name, q.township, q.county && `${q.county} County`]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>

                        {/* Dismissed flash overlay (presenter view only). */}
                        {canDismiss && (
                          <div
                            className={`absolute inset-0 rounded-2xl bg-red-600/95 flex items-center justify-center gap-3 text-white transition-opacity duration-300 ${
                              phase ? 'opacity-100' : 'opacity-0 pointer-events-none'
                            }`}
                          >
                            <Check className="w-8 h-8" />
                            <span className="text-2xl sm:text-3xl font-bold uppercase tracking-wide">
                              Dismissed
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
