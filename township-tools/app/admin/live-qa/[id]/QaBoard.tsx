"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Loader2, Megaphone, MonitorPlay, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { copyText } from '@/lib/live-qa/clipboard';
import { townshipLabel } from '@/lib/live-qa/format';

const POLL_MS = 3000;
const MARK_MS = 420; // "Dismissed"/"Restored" flash before collapsing
const COLLAPSE_MS = 420; // pull-up collapse duration
const ENTER_MS = 520; // entrance fade/slide-in duration

type Question = {
  id: string;
  question: string;
  name: string;
  township: string | null;
  county: string | null;
  status: 'pending' | 'approved' | 'dismissed';
  created_at: string;
  approved_at: string | null;
  dismissed_at: string | null;
};

type Anim = { kind: 'dismiss' | 'restore'; phase: 'mark' | 'collapse' };
type Buckets = { live: Question[]; dismissed: Question[] };

const byCreatedAsc = (a: Question, b: Question) =>
  new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
const byDismissedDesc = (a: Question, b: Question) =>
  new Date(b.dismissed_at || 0).getTime() - new Date(a.dismissed_at || 0).getTime();

export function QaBoard({ sessionId, initial }: { sessionId: string; initial: Buckets }) {
  const [buckets, setBuckets] = useState<Buckets>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Cards mid leaving-animation (dismiss/restore) stay pinned to their current
  // lane until the animation finishes.
  const [anim, setAnim] = useState<Record<string, Anim>>({});
  // Cards entering a lane (new submission or restored) get a fade/slide-in.
  const [entering, setEntering] = useState<Record<string, boolean>>({});
  // Organizer-typed question.
  const [addText, setAddText] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  // Inline delete confirmation (no native confirm dialog, which the browser can
  // permanently suppress via "prevent additional dialogs").
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  // The question currently being answered (mirrors the screencast).
  const [currentId, setCurrentId] = useState<string | null>(null);

  const bucketsRef = useRef(buckets);
  bucketsRef.current = buckets;
  const animRef = useRef(anim);
  animRef.current = anim;
  const seededRef = useRef(false);

  const markEntering = (ids: string[]) => {
    if (!ids.length) return;
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
    }, ENTER_MS + 60);
  };

  // Plays the red "Dismissed" flash + pull-up for one or more cards. callApi is
  // false when the dismiss already happened elsewhere (e.g. the screencast) and
  // we're only mirroring the effect. On completion the cards move to the
  // dismissed lane locally so the next poll doesn't re-trigger the effect.
  const runDismissAnim = (ids: string[], callApi: boolean) => {
    if (!ids.length) return;
    setAnim((a) => {
      const n = { ...a };
      ids.forEach((id) => {
        if (!n[id]) n[id] = { kind: 'dismiss', phase: 'mark' };
      });
      return n;
    });
    if (callApi) {
      ids.forEach((id) =>
        fetch(`/api/admin/live-qa/questions/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'dismiss' }),
        }).catch(() => {})
      );
    }
    setTimeout(() => {
      setAnim((a) => {
        const n = { ...a };
        ids.forEach((id) => {
          if (n[id]) n[id] = { ...n[id], phase: 'collapse' };
        });
        return n;
      });
    }, MARK_MS);
    setTimeout(() => {
      const idSet = new Set(ids);
      const nowIso = new Date().toISOString();
      setBuckets((b) => ({
        live: b.live.filter((c) => !idSet.has(c.id)),
        dismissed: [
          ...b.live
            .filter((c) => idSet.has(c.id))
            .map((c) => ({ ...c, status: 'dismissed' as const, dismissed_at: c.dismissed_at || nowIso })),
          ...b.dismissed,
        ].sort(byDismissedDesc),
      }));
      setAnim((a) => {
        const n = { ...a };
        ids.forEach((id) => delete n[id]);
        return n;
      });
    }, MARK_MS + COLLAPSE_MS);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/live-qa/sessions/${sessionId}/questions`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const json = await res.json();
      const serverLive: Question[] = json.live || [];
      const serverDismissed: Question[] = json.dismissed || [];

      const a = animRef.current;
      const prev = bucketsRef.current;
      const cardById = new Map<string, Question>();
      [...prev.live, ...prev.dismissed, ...serverLive, ...serverDismissed].forEach((c) =>
        cardById.set(c.id, c)
      );

      // A question dismissed elsewhere (e.g. from the screencast board) leaves
      // server-live and lands in server-dismissed. Detect those so the console
      // plays the dismiss effect too, instead of the card just vanishing.
      const externalDismiss = prev.live
        .filter(
          (c) =>
            !serverLive.some((s) => s.id === c.id) &&
            serverDismissed.some((s) => s.id === c.id) &&
            !a[c.id]
        )
        .map((c) => c.id);
      const extSet = new Set(externalDismiss);

      // Natural lanes minus anything animating, then pin animating cards to the
      // lane they started in so they finish their effect there.
      const live = serverLive.filter((c) => !a[c.id]);
      const dismissed = serverDismissed.filter((c) => !a[c.id] && !extSet.has(c.id));
      Object.keys(a).forEach((id) => {
        const card = cardById.get(id);
        if (!card) return;
        if (a[id].kind === 'dismiss') live.push(card);
        else dismissed.push(card);
      });
      // Keep externally-dismissed cards on the board until their effect plays.
      externalDismiss.forEach((id) => {
        const card = cardById.get(id);
        if (card) live.push(card);
      });
      live.sort(byCreatedAsc);
      dismissed.sort(byDismissedDesc);

      const prevLiveIds = new Set(prev.live.map((c) => c.id));
      setBuckets({ live, dismissed });
      setCurrentId(json.current_question_id ?? null);

      if (externalDismiss.length) runDismissAnim(externalDismiss, false);

      if (seededRef.current) {
        const newIds = live
          .filter((c) => !prevLiveIds.has(c.id) && !a[c.id] && !extSet.has(c.id))
          .map((c) => c.id);
        markEntering(newIds);
      }
      seededRef.current = true;
    } catch {
      /* keep last good state on transient errors */
    }
  }, [sessionId]);

  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    const id = setInterval(() => loadRef.current(), POLL_MS);
    return () => clearInterval(id);
  }, []);

  const animate = (q: Question, kind: 'dismiss' | 'restore') => {
    if (anim[q.id]) return;
    setError(null);
    setAnim((a) => ({ ...a, [q.id]: { kind, phase: 'mark' } }));
    fetch(`/api/admin/live-qa/questions/${q.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: kind }),
    }).catch(() => {});
    setTimeout(() => {
      setAnim((a) => (a[q.id] ? { ...a, [q.id]: { ...a[q.id], phase: 'collapse' } } : a));
    }, MARK_MS);
    setTimeout(() => {
      setAnim((a) => {
        const n = { ...a };
        delete n[q.id];
        return n;
      });
      load();
    }, MARK_MS + COLLAPSE_MS);
  };

  const del = async (q: Question) => {
    setConfirmDelete(null);
    setBusyId(q.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/live-qa/questions/${q.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await load();
    } catch (e: any) {
      setError(e.message || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  const onCopy = async (q: Question) => {
    const tail = [townshipLabel(q.township), q.county && `${q.county} County`].filter(Boolean).join(', ');
    await copyText(`"${q.question}" — ${q.name}${tail ? `, ${tail}` : ''}`);
  };

  const setHighlight = async (questionId: string | null) => {
    setCurrentId(questionId); // optimistic; poll reconciles
    try {
      await fetch(`/api/admin/live-qa/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_question_id: questionId }),
      });
    } catch {
      /* ignore; next poll corrects */
    }
    load();
  };

  const onAdd = async () => {
    const question = addText.trim();
    if (!question) return;
    setAddBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/live-qa/sessions/${sessionId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Add failed');
      }
      setAddText('');
      await load(); // new question shows in On board (animates in)
    } catch (e: any) {
      setError(e.message || 'Add failed');
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-sm rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {/* Organizer can type a question straight onto the board. */}
      <div className="flex gap-2">
        <input
          type="text"
          value={addText}
          onChange={(e) => setAddText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          placeholder="Type a question to put on the board…"
          className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={addBusy || !addText.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
        >
          {addBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add to board
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Lane
          title="On board"
          icon={<MonitorPlay className="w-4 h-4" />}
          count={buckets.live.length}
          accent="emerald"
          empty="Submitted questions appear here and on the screencast board."
        >
          {(currentId
            ? [
                ...buckets.live.filter((q) => q.id === currentId),
                ...buckets.live.filter((q) => q.id !== currentId),
              ]
            : buckets.live
          ).map((q) => (
            <QCard
              key={q.id}
              q={q}
              anim={anim[q.id]}
              entering={!!entering[q.id]}
              highlighted={q.id === currentId}
            >
              <ActionBtn
                onClick={() => setHighlight(q.id === currentId ? null : q.id)}
                icon={<Megaphone className="w-4 h-4" />}
                label={q.id === currentId ? 'Stop' : 'Answer this'}
                tone={q.id === currentId ? 'amber' : 'answer'}
              />
              <ActionBtn onClick={() => onCopy(q)} icon={<Copy className="w-4 h-4" />} label="Copy" />
              <ActionBtn
                onClick={() => runDismissAnim([q.id], true)}
                disabled={!!anim[q.id]}
                icon={<X className="w-4 h-4" />}
                label="Dismiss"
                tone="gray"
              />
            </QCard>
          ))}
        </Lane>

        <Lane
          title="Dismissed"
          icon={<Trash2 className="w-4 h-4" />}
          count={buckets.dismissed.length}
          accent="gray"
          empty="Dismissed questions show here. You can restore them."
        >
          {buckets.dismissed.map((q) => (
            <QCard key={q.id} q={q} anim={anim[q.id]} entering={false} muted>
              {confirmDelete === q.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                    Delete permanently?
                  </span>
                  <ActionBtn
                    onClick={() => del(q)}
                    disabled={busyId === q.id}
                    icon={<Trash2 className="w-4 h-4" />}
                    label="Yes, delete"
                    tone="red"
                  />
                  <ActionBtn
                    onClick={() => setConfirmDelete(null)}
                    icon={<X className="w-4 h-4" />}
                    label="Cancel"
                    tone="amber"
                  />
                </div>
              ) : (
                <>
                  <ActionBtn
                    onClick={() => animate(q, 'restore')}
                    disabled={!!anim[q.id]}
                    icon={<RotateCcw className="w-4 h-4" />}
                    label="Restore"
                    tone="amber"
                  />
                  <ActionBtn onClick={() => onCopy(q)} icon={<Copy className="w-4 h-4" />} label="Copy" />
                  <ActionBtn
                    onClick={() => setConfirmDelete(q.id)}
                    disabled={busyId === q.id || !!anim[q.id]}
                    icon={<Trash2 className="w-4 h-4" />}
                    label="Delete"
                    tone="red"
                  />
                </>
              )}
            </QCard>
          ))}
        </Lane>
      </div>
    </div>
  );
}

const ACCENT: Record<string, string> = {
  emerald: 'text-emerald-700 dark:text-emerald-300',
  gray: 'text-gray-600 dark:text-gray-400',
};

function Lane({
  title,
  icon,
  count,
  accent,
  empty,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  accent: 'emerald' | 'gray';
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-gray-100/60 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-xl flex flex-col min-h-[200px]">
      <div className={`flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800 font-semibold ${ACCENT[accent]}`}>
        {icon}
        <span>{title}</span>
        <span className="ml-auto text-xs font-bold bg-white dark:bg-gray-800 rounded-full px-2 py-0.5">
          {count}
        </span>
      </div>
      <div className="p-3 overflow-auto max-h-[68vh]">
        {count === 0 ? <p className="text-sm text-gray-400 text-center py-8">{empty}</p> : children}
      </div>
    </section>
  );
}

function QCard({
  q,
  anim,
  entering,
  muted,
  highlighted,
  children,
}: {
  q: Question;
  anim?: Anim;
  entering: boolean;
  muted?: boolean;
  highlighted?: boolean;
  children: React.ReactNode;
}) {
  const meta = [q.name, townshipLabel(q.township), q.county && `${q.county} County`]
    .filter(Boolean)
    .join(' · ');
  return (
    <div
      className={`grid transition-all duration-[420ms] ease-in-out ${entering ? 'opacity-0 translate-y-3' : ''}`}
      style={{ gridTemplateRows: anim?.phase === 'collapse' ? '0fr' : '1fr' }}
    >
      <div className="overflow-hidden min-h-0">
        <div className="pb-2">
          <div
            className={`relative rounded-lg p-3 transition-transform duration-300 ${
              highlighted
                ? 'bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-400 dark:border-amber-500/50 ring-1 ring-amber-300'
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800'
            } ${muted ? 'opacity-75' : ''} ${anim ? 'scale-[0.99]' : ''}`}
          >
            {highlighted && (
              <div className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                <Megaphone className="w-3.5 h-3.5" />
                Now answering
              </div>
            )}
            <p className="text-sm leading-snug whitespace-pre-wrap break-words">{q.question}</p>
            <p className="mt-2 text-xs text-gray-500">{meta}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>

            {anim && (
              <div
                className={`absolute inset-0 rounded-lg flex items-center justify-center gap-2 text-white ${
                  anim.kind === 'dismiss' ? 'bg-red-600/95' : 'bg-emerald-600/95'
                }`}
              >
                {anim.kind === 'dismiss' ? <X className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
                <span className="text-base font-bold uppercase tracking-wide">
                  {anim.kind === 'dismiss' ? 'Dismissed' : 'Restored'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const TONE: Record<string, string> = {
  // Copy — primary action (paste into Teams), filled so it stands out.
  default: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
  // Answer this — mark as the question being answered.
  answer: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm',
  // Dismiss — prominent red-tinted button.
  gray: 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900',
  // Restore
  amber: 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900',
  // Delete
  red: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
};

function ActionBtn({
  onClick,
  icon,
  label,
  tone = 'default',
  disabled,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tone?: keyof typeof TONE;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors ${TONE[tone]}`}
    >
      {icon}
      {label}
    </button>
  );
}
