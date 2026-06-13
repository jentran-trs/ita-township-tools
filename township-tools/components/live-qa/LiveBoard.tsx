"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, KeyRound, Loader2, Megaphone, X } from 'lucide-react';
import { townshipLabel } from '@/lib/live-qa/format';

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

// Big, high-contrast board designed to be screencast to an audience. Shows a QR
// code of the submit page so the audience can scan to ask a question.
//
// Presenting (dismissing questions) is unlocked with the session passcode that
// the superadmin sets — no login required. If no passcode is set, the board is
// read-only.
export function LiveBoard({
  boardCode,
  title,
  submitCode,
  passcodeSet,
}: {
  boardCode: string;
  title: string;
  submitCode: string;
  passcodeSet: boolean;
}) {
  const [questions, setQuestions] = useState<BoardQuestion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dismissing, setDismissing] = useState<Record<string, Phase>>({});
  // Cards entering the board (new submission or restored) get a fade/slide-in.
  const [entering, setEntering] = useState<Record<string, boolean>>({});
  const seededRef = useRef(false);
  // The question currently being answered (synced via the session).
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Passcode presenter unlock.
  const [unlocked, setUnlocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [checking, setChecking] = useState(passcodeSet);
  const [gateInput, setGateInput] = useState('');
  const [gateError, setGateError] = useState<string | null>(null);
  const [gateBusy, setGateBusy] = useState(false);

  // QR code of the submit page.
  const [qr, setQr] = useState<string | null>(null);
  const [submitUrl, setSubmitUrl] = useState('');

  const storageKey = `lqa_board_pc_${boardCode}`;

  const questionsRef = useRef<BoardQuestion[]>(questions);
  questionsRef.current = questions;
  const dismissingRef = useRef<Record<string, Phase>>(dismissing);
  dismissingRef.current = dismissing;

  // Build the submit URL + QR code on the client (uses the real origin).
  useEffect(() => {
    const url = `${window.location.origin}/qa/${submitCode}`;
    setSubmitUrl(url);
    let cancelled = false;
    import('qrcode')
      .then((mod) => mod.toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: 400 }))
      .then((dataUrl) => {
        if (!cancelled) setQr(dataUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [submitCode]);

  // Restore a previously-entered passcode for this board (this device).
  useEffect(() => {
    if (!passcodeSet) {
      setChecking(false);
      return;
    }
    let stored = '';
    try {
      stored = localStorage.getItem(storageKey) || '';
    } catch {
      /* ignore */
    }
    if (!stored) {
      setChecking(false);
      return;
    }
    fetch('/api/live-qa/board/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board_code: boardCode, passcode: stored }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setPasscode(stored);
          setUnlocked(true);
        } else {
          try {
            localStorage.removeItem(storageKey);
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passcodeSet, boardCode]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/live-qa/board?code=${encodeURIComponent(boardCode)}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const json = await res.json();
      const server: BoardQuestion[] = json.questions || [];

      const prev = questionsRef.current;
      const animating = dismissingRef.current;
      const serverById = new Map(server.map((s) => [s.id, s]));
      const prevIds = new Set(prev.map((p) => p.id));

      const merged: BoardQuestion[] = prev
        .filter((p) => serverById.has(p.id) || animating[p.id])
        .map((p) => serverById.get(p.id) || p);
      const newIds: string[] = [];
      for (const s of server) {
        if (!prevIds.has(s.id)) {
          merged.push(s);
          newIds.push(s.id);
        }
      }
      setQuestions(merged);
      setCurrentId(json.session?.current_question_id ?? null);
      // Animate genuinely new arrivals in (skip the very first paint).
      if (seededRef.current && newIds.length) markEntering(newIds);
      seededRef.current = true;
    } catch {
      /* keep last good state */
    } finally {
      setLoaded(true);
    }
  }, [boardCode]);

  const markEntering = (ids: string[]) => {
    setEntering((e) => {
      const n = { ...e };
      ids.forEach((id) => (n[id] = true));
      return n;
    });
    setTimeout(() => {
      setEntering((e) => {
        const n = { ...e };
        ids.forEach((id) => (n[id] = false));
        return n;
      });
    }, 30);
    setTimeout(() => {
      setEntering((e) => {
        const n = { ...e };
        ids.forEach((id) => delete n[id]);
        return n;
      });
    }, 600);
  };

  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    loadRef.current();
    const id = setInterval(() => loadRef.current(), POLL_MS);
    return () => clearInterval(id);
  }, []);

  const submitPasscode = async () => {
    const value = gateInput.trim();
    if (!value) return;
    setGateBusy(true);
    setGateError(null);
    try {
      const res = await fetch('/api/live-qa/board/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board_code: boardCode, passcode: value }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error('Incorrect passcode');
      setPasscode(value);
      setUnlocked(true);
      try {
        localStorage.setItem(storageKey, value);
      } catch {
        /* ignore */
      }
    } catch (e: any) {
      setGateError(e.message || 'Incorrect passcode');
    } finally {
      setGateBusy(false);
    }
  };

  const onDismiss = (id: string) => {
    if (dismissing[id]) return;
    setDismissing((d) => ({ ...d, [id]: 'mark' }));
    fetch('/api/live-qa/board/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board_code: boardCode, passcode, question_id: id }),
    }).catch(() => {});

    setTimeout(() => {
      setDismissing((d) => (d[id] ? { ...d, [id]: 'collapse' } : d));
    }, MARK_MS);
    setTimeout(() => {
      setQuestions((prev) => prev.filter((x) => x.id !== id));
      setDismissing((d) => {
        const next = { ...d };
        delete next[id];
        return next;
      });
    }, MARK_MS + COLLAPSE_MS);
  };

  // Set / clear the question being answered (passcode-authorized).
  const setHighlight = (questionId: string | null) => {
    setCurrentId(questionId); // optimistic; poll reconciles
    fetch('/api/live-qa/board/highlight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board_code: boardCode, passcode, question_id: questionId }),
    }).catch(() => {});
  };

  const currentQ = currentId ? questions.find((q) => q.id === currentId) || null : null;

  // ---- Passcode gate (presenter must unlock before the board shows) ----
  if (passcodeSet && !unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900 dark:bg-slate-900 dark:text-white px-4">
        <div className="w-full max-w-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-8 text-center shadow-sm">
          <KeyRound className="w-10 h-10 mx-auto mb-4 text-amber-500" />
          <h1 className="text-xl font-bold mb-1">{title}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
            Enter the passcode to open this Q&amp;A board.
          </p>
          {checking ? (
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          ) : (
            <>
              {gateError && (
                <div className="mb-3 text-sm text-red-600 dark:text-red-400">{gateError}</div>
              )}
              <input
                type="text"
                value={gateInput}
                autoFocus
                onChange={(e) => setGateInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitPasscode()}
                placeholder="Passcode"
                className="w-full px-3 py-2.5 text-center text-base bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 mb-3"
              />
              <button
                type="button"
                onClick={submitPasscode}
                disabled={gateBusy || !gateInput.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-base font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                {gateBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
                Open board
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-slate-900 dark:text-white">
      <header className="border-b border-gray-200 bg-white/80 dark:border-slate-700/60 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="w-full px-6 sm:px-8 py-4 flex items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold truncate min-w-0">{title}</h1>
          <div className="flex items-center gap-3 flex-shrink-0 text-amber-600 dark:text-amber-300">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-400" />
            </span>
            <span className="text-xl sm:text-2xl font-bold uppercase tracking-wider">Live Q&amp;A</span>
          </div>
        </div>
      </header>

      <main className="w-full px-6 sm:px-8 py-8">
        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20">
            {qr && (
              <a href={submitUrl} target="_blank" rel="noopener noreferrer" className="mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qr}
                  alt="Scan to submit a question"
                  className="w-[340px] max-w-[80vw] rounded-2xl border border-gray-200 dark:border-slate-700 bg-white p-4 shadow-sm"
                />
              </a>
            )}
            <p className="text-3xl sm:text-4xl font-semibold text-gray-700 dark:text-slate-200">
              {loaded ? 'Scan the code to submit a question' : 'Loading…'}
            </p>
            <p className="mt-5 text-2xl sm:text-3xl text-gray-600 dark:text-slate-300 font-medium">
              Or visit
            </p>
            <div className="mt-2 inline-block px-6 py-3 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-4xl sm:text-5xl font-extrabold text-amber-700 dark:text-amber-300">
              www.ita-in.org
            </div>
            <p className="mt-5 text-base text-gray-400 dark:text-slate-400">
              Questions will appear here as they come in.
            </p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 min-w-0 w-full order-2 lg:order-1">
            {/* Now Answering — the highlighted question, separated from the list. */}
            {currentQ && (
              <div className="mb-6 rounded-2xl border-4 border-amber-400 dark:border-amber-500/60 bg-amber-100 dark:bg-amber-500/15 shadow-lg p-6 sm:p-8">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="inline-flex items-center gap-2 text-base font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                    </span>
                    Now answering
                  </span>
                  {unlocked && (
                    <button
                      type="button"
                      onClick={() => {
                        setHighlight(null);
                        onDismiss(currentQ.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-sm"
                    >
                      <X className="w-4 h-4" />
                      Dismiss
                    </button>
                  )}
                </div>
                <p className="text-3xl sm:text-4xl leading-snug font-semibold text-gray-900 dark:text-white">
                  {currentQ.question}
                </p>
                <p className="mt-4 text-xl text-amber-700 dark:text-amber-300 font-semibold">
                  {[currentQ.name, townshipLabel(currentQ.township), currentQ.county && `${currentQ.county} County`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            )}
            {questions
              .filter((q) => q.id !== currentId)
              .map((q) => {
              const phase = dismissing[q.id];
              return (
                <div
                  key={q.id}
                  className={`grid transition-all duration-500 ease-in-out ${
                    entering[q.id] ? 'opacity-0 translate-y-4' : ''
                  }`}
                  style={{ gridTemplateRows: phase === 'collapse' ? '0fr' : '1fr' }}
                >
                  <div className="overflow-hidden min-h-0">
                    <div className="pb-5">
                      <div
                        className={`relative bg-gray-100 border-2 border-gray-300 shadow-md dark:bg-slate-800 dark:border-slate-600 dark:shadow-lg rounded-2xl p-6 sm:p-7 transition-transform duration-300 ${
                          phase ? 'scale-[0.99]' : ''
                        }`}
                      >
                        <p className="text-[27px] sm:text-[33px] leading-snug font-medium text-gray-900 dark:text-white">
                          {q.question}
                        </p>
                        <p className="mt-4 text-lg text-amber-600 dark:text-amber-300 font-semibold">
                          {[q.name, townshipLabel(q.township), q.county && `${q.county} County`]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>

                        {unlocked && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setHighlight(q.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                            >
                              <Megaphone className="w-4 h-4" />
                              Answer this
                            </button>
                            <button
                              type="button"
                              onClick={() => onDismiss(q.id)}
                              disabled={!!phase}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 shadow-sm"
                            >
                              <X className="w-4 h-4" />
                              Dismiss
                            </button>
                          </div>
                        )}

                        {unlocked && (
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

            {/* Sticky QR sidebar — large, always scannable beside the questions. */}
            {qr && (
              <aside className="w-full lg:w-80 flex-shrink-0 order-1 lg:order-2 lg:sticky lg:top-28">
                <div className="bg-white border border-gray-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm text-center">
                  <div className="text-base font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-3">
                    Scan to ask a question
                  </div>
                  <a href={submitUrl} target="_blank" rel="noopener noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qr}
                      alt="Scan to submit a question"
                      className="w-full max-w-[300px] mx-auto rounded-lg"
                    />
                  </a>
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                    <div className="text-base font-semibold text-gray-600 dark:text-slate-300">Or visit</div>
                    <div className="mt-1 inline-block px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-xl font-extrabold text-amber-700 dark:text-amber-300">
                      www.ita-in.org
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
