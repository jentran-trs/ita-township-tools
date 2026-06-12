"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { copyText } from '@/lib/live-qa/clipboard';

type Session = {
  id: string;
  title: string;
  submit_code: string;
  board_code: string;
  status: 'open' | 'closed';
  created_at: string;
  pending_count: number;
  approved_count: number;
  dismissed_count: number;
  last_question_at: string | null;
};

export function SessionsTable({ initialSessions }: { initialSessions: Session[] }) {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const onCreate = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/live-qa/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Create failed');
      setSessions((prev) => [
        { ...json.session, pending_count: 0, approved_count: 0, dismissed_count: 0, last_question_at: null },
        ...prev,
      ]);
      setNewTitle('');
    } catch (e: any) {
      setError(e.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const onToggleStatus = async (s: Session) => {
    const next = s.status === 'open' ? 'closed' : 'open';
    setBusyId(s.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/live-qa/sessions/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Update failed');
      setSessions((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: next } : x)));
    } catch (e: any) {
      setError(e.message || 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const onRename = async (s: Session) => {
    const title = editTitle.trim();
    if (!title || title === s.title) {
      setEditingId(null);
      return;
    }
    setBusyId(s.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/live-qa/sessions/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Rename failed');
      setSessions((prev) => prev.map((x) => (x.id === s.id ? { ...x, title } : x)));
      setEditingId(null);
    } catch (e: any) {
      setError(e.message || 'Rename failed');
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (s: Session) => {
    const total = s.pending_count + s.approved_count + s.dismissed_count;
    if (
      !confirm(
        total > 0
          ? `Delete "${s.title}" and its ${total} question${total === 1 ? '' : 's'}? This is permanent.`
          : `Delete "${s.title}"? This is permanent.`
      )
    )
      return;
    setBusyId(s.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/live-qa/sessions/${s.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Delete failed');
      setSessions((prev) => prev.filter((x) => x.id !== s.id));
    } catch (e: any) {
      setError(e.message || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-sm rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {/* New session */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onCreate()}
          placeholder="New session title (e.g. 2026 Spring Convention)"
          className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button
          type="button"
          onClick={onCreate}
          disabled={creating || !newTitle.trim()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create session
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-10 text-center text-sm text-gray-500">
          No sessions yet. Create one above to start collecting questions.
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  {editingId === s.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editTitle}
                        autoFocus
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onRename(s);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="px-2 py-1 text-base font-semibold bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => onRename(s)}
                        disabled={busyId === s.id}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-md disabled:opacity-50"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/live-qa/${s.id}`}
                        className="font-semibold text-lg hover:underline truncate"
                      >
                        {s.title}
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setEditTitle(s.title);
                          setEditingId(s.id);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                        title="Rename session"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          s.status === 'open'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {s.status === 'open' ? 'Open' : 'Archived'}
                      </span>
                    </div>
                  )}
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>{s.pending_count} incoming</span>
                    <span>{s.approved_count} on board</span>
                    <span>{s.dismissed_count} dismissed</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={`/api/admin/live-qa/sessions/${s.id}/export`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                    title="Export all questions to Excel"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export
                  </a>
                  <button
                    type="button"
                    onClick={() => onToggleStatus(s)}
                    disabled={busyId === s.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                    title={s.status === 'open' ? 'Archive event (stop new submissions; questions are kept)' : 'Reopen event'}
                  >
                    {s.status === 'open' ? <Archive className="w-3.5 h-3.5" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
                    {s.status === 'open' ? 'Archive' : 'Reopen'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(s)}
                    disabled={busyId === s.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/60 disabled:opacity-50"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    href={`/admin/live-qa/${s.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/60"
                  >
                    Console
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <CopyLinkRow label="Attendee submit link" path={`/qa/${s.submit_code}`} />
                <CopyLinkRow label="Screencast board" path={`/admin/live-qa/${s.id}/present`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CopyLinkRow({ label, path }: { label: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;

  const onCopy = async () => {
    const ok = await copyText(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 min-w-0">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-gray-500">{label}</div>
        <div className="text-xs font-mono truncate text-gray-700 dark:text-gray-300">{path}</div>
      </div>
      <a
        href={path}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Open
      </a>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
