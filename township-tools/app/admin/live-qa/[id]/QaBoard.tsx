"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Inbox,
  Loader2,
  MonitorPlay,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { copyText } from '@/lib/live-qa/clipboard';

const POLL_MS = 3000;

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

type Buckets = { pending: Question[]; approved: Question[]; dismissed: Question[] };

export function QaBoard({ sessionId, initial }: { sessionId: string; initial: Buckets }) {
  const [buckets, setBuckets] = useState<Buckets>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/live-qa/sessions/${sessionId}/questions`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const json = await res.json();
      setBuckets({
        pending: json.pending || [],
        approved: json.approved || [],
        dismissed: json.dismissed || [],
      });
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

  const act = async (q: Question, action: 'approve' | 'dismiss' | 'restore' | 'delete') => {
    setBusyId(q.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/live-qa/questions/${q.id}`, {
        method: action === 'delete' ? 'DELETE' : 'PATCH',
        headers: action === 'delete' ? undefined : { 'Content-Type': 'application/json' },
        body: action === 'delete' ? undefined : JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Action failed');
      await load(); // reconcile from server (source of truth)
    } catch (e: any) {
      setError(e.message || 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const onCopy = async (q: Question) => {
    const tail = [q.township, q.county && `${q.county} County`].filter(Boolean).join(', ');
    const text = `"${q.question}" — ${q.name}${tail ? `, ${tail}` : ''}`;
    await copyText(text);
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-sm rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Incoming */}
        <Lane
          title="Incoming"
          icon={<Inbox className="w-4 h-4" />}
          count={buckets.pending.length}
          accent="indigo"
          empty="No new questions yet."
        >
          {buckets.pending.map((q) => (
            <Card key={q.id} q={q} busy={busyId === q.id}>
              <ActionBtn onClick={() => onCopy(q)} icon={<Copy className="w-3.5 h-3.5" />} label="Copy" />
              <ActionBtn
                onClick={() => act(q, 'approve')}
                disabled={busyId === q.id}
                icon={<Check className="w-3.5 h-3.5" />}
                label="Approve"
                tone="emerald"
              />
              <ActionBtn
                onClick={() => act(q, 'dismiss')}
                disabled={busyId === q.id}
                icon={<X className="w-3.5 h-3.5" />}
                label="Dismiss"
                tone="gray"
              />
            </Card>
          ))}
        </Lane>

        {/* Approved / on board */}
        <Lane
          title="On board"
          icon={<MonitorPlay className="w-4 h-4" />}
          count={buckets.approved.length}
          accent="emerald"
          empty="Approve a question to show it on the board."
        >
          {buckets.approved.map((q) => (
            <Card key={q.id} q={q} busy={busyId === q.id}>
              <ActionBtn onClick={() => onCopy(q)} icon={<Copy className="w-3.5 h-3.5" />} label="Copy" />
              <ActionBtn
                onClick={() => act(q, 'dismiss')}
                disabled={busyId === q.id}
                icon={<X className="w-3.5 h-3.5" />}
                label="Dismiss"
                tone="gray"
              />
            </Card>
          ))}
        </Lane>

        {/* Dismissed */}
        <Lane
          title="Dismissed"
          icon={<Trash2 className="w-4 h-4" />}
          count={buckets.dismissed.length}
          accent="gray"
          empty="Dismissed questions show here. You can restore them."
        >
          {buckets.dismissed.map((q) => (
            <Card key={q.id} q={q} busy={busyId === q.id} muted>
              <ActionBtn
                onClick={() => act(q, 'restore')}
                disabled={busyId === q.id}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                label="Restore"
                tone="amber"
              />
              <ActionBtn onClick={() => onCopy(q)} icon={<Copy className="w-3.5 h-3.5" />} label="Copy" />
              <ActionBtn
                onClick={() => {
                  if (confirm('Permanently delete this question?')) act(q, 'delete');
                }}
                disabled={busyId === q.id}
                icon={<Trash2 className="w-3.5 h-3.5" />}
                label="Delete"
                tone="red"
              />
            </Card>
          ))}
        </Lane>
      </div>
    </div>
  );
}

const ACCENT: Record<string, string> = {
  indigo: 'text-indigo-700 dark:text-indigo-300',
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
  accent: 'indigo' | 'emerald' | 'gray';
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
      <div className="p-3 space-y-2 overflow-auto max-h-[68vh]">
        {count === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">{empty}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function Card({
  q,
  busy,
  muted,
  children,
}: {
  q: Question;
  busy: boolean;
  muted?: boolean;
  children: React.ReactNode;
}) {
  const meta = [q.name, q.township, q.county && `${q.county} County`].filter(Boolean).join(' · ');
  return (
    <div
      className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 ${
        muted ? 'opacity-75' : ''
      } ${busy ? 'animate-pulse' : ''}`}
    >
      <p className="text-sm leading-snug whitespace-pre-wrap break-words">{q.question}</p>
      <p className="mt-2 text-xs text-gray-500">{meta}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

const TONE: Record<string, string> = {
  default: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
  emerald: 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40',
  amber: 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40',
  gray: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
  red: 'text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40',
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
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md disabled:opacity-50 ${TONE[tone]}`}
    >
      {icon}
      {label}
    </button>
  );
}
