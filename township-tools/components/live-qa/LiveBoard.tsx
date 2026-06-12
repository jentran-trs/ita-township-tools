"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

const POLL_MS = 4000;

type BoardQuestion = {
  id: string;
  question: string;
  name: string;
  township: string | null;
  county: string | null;
  approved_at: string | null;
};

// Big, high-contrast board designed to be screencast to an audience.
// - Public read-only view: canDismiss = false.
// - Screencaster view (logged-in superadmin): canDismiss = true adds a subtle
//   dismiss control per card that removes it from the public board.
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
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/live-qa/board?code=${encodeURIComponent(boardCode)}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const json = await res.json();
      setQuestions(json.questions || []);
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

  const onDismiss = async (id: string) => {
    setBusyId(id);
    // Optimistically remove; the next poll reconciles with the server.
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    try {
      await fetch(`/api/admin/live-qa/questions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      });
    } catch {
      load(); // restore from server on failure
    } finally {
      setBusyId(null);
    }
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
          <div className="grid grid-cols-1 gap-5">
            {questions.map((q) => (
              <div
                key={q.id}
                className="relative bg-white border border-gray-200 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:shadow-lg rounded-2xl p-6 sm:p-7"
              >
                {canDismiss && (
                  <button
                    type="button"
                    onClick={() => onDismiss(q.id)}
                    disabled={busyId === q.id}
                    title="Dismiss (remove from board)"
                    aria-label="Dismiss question"
                    className="absolute top-3 right-3 w-8 h-8 inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-500 dark:bg-slate-700/70 dark:text-slate-300 hover:bg-red-600 hover:text-white disabled:opacity-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <p className={`text-2xl sm:text-3xl leading-snug font-medium text-gray-900 dark:text-white ${canDismiss ? 'pr-10' : ''}`}>
                  {q.question}
                </p>
                <p className="mt-4 text-lg text-amber-600 dark:text-amber-300 font-semibold">
                  {[q.name, q.township, q.county && `${q.county} County`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
