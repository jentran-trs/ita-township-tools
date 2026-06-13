"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, ArchiveRestore, Check, Copy, KeyRound, Loader2, Trash2, X } from 'lucide-react';
import { copyText } from '@/lib/live-qa/clipboard';

// Console header actions that need interactivity: copy the attendee submit link,
// set/change/remove the screencast-board passcode, and archive / reopen.
export function SessionControls({
  id,
  status,
  submitCode,
  passcode,
}: {
  id: string;
  status: 'open' | 'closed';
  submitCode: string;
  passcode: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Passcode editor (in-app modal — no native dialog).
  const [pcOpen, setPcOpen] = useState(false);
  const [pcValue, setPcValue] = useState('');
  const [pcBusy, setPcBusy] = useState(false);
  const [pcError, setPcError] = useState<string | null>(null);

  const onCopy = async () => {
    const url =
      typeof window !== 'undefined' ? `${window.location.origin}/qa/${submitCode}` : `/qa/${submitCode}`;
    if (await copyText(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const openPasscode = () => {
    setPcValue(passcode || '');
    setPcError(null);
    setPcOpen(true);
  };

  const savePasscode = async (value: string) => {
    setPcBusy(true);
    setPcError(null);
    try {
      const res = await fetch(`/api/admin/live-qa/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board_passcode: value.trim() || null }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Save failed');
      }
      setPcOpen(false);
      router.refresh();
    } catch (e: any) {
      setPcError(e.message || 'Save failed');
    } finally {
      setPcBusy(false);
    }
  };

  const onToggle = async () => {
    const next = status === 'open' ? 'closed' : 'open';
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/live-qa/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
        title="Copy the attendee submit link"
      >
        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Copied' : 'Submit link'}
      </button>
      <button
        type="button"
        onClick={openPasscode}
        disabled={busy}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
        title="Set, change, or remove the passcode presenters use to open the screencast board"
      >
        <KeyRound className="w-4 h-4" />
        {passcode ? 'Change passcode' : 'Set passcode'}
      </button>
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : status === 'open' ? (
          <Archive className="w-4 h-4" />
        ) : (
          <ArchiveRestore className="w-4 h-4" />
        )}
        {status === 'open' ? 'Archive' : 'Reopen'}
      </button>

      {pcOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !pcBusy && setPcOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-sm shadow-xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold">Board passcode</h3>
              </div>
              <button
                type="button"
                onClick={() => setPcOpen(false)}
                disabled={pcBusy}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Anyone with this passcode and the board link can open the screencast board and
                dismiss questions. Leave it blank (or use Remove) to make the board read-only.
              </p>
              {pcError && <div className="text-sm text-red-600 dark:text-red-400">{pcError}</div>}
              <input
                type="text"
                value={pcValue}
                autoFocus
                onChange={(e) => setPcValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && savePasscode(pcValue)}
                placeholder="e.g. ITA2026"
                className="w-full px-3 py-2.5 text-base bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/40 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2">
              <div>
                {passcode && (
                  <button
                    type="button"
                    onClick={() => savePasscode('')}
                    disabled={pcBusy}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPcOpen(false)}
                  disabled={pcBusy}
                  className="px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => savePasscode(pcValue)}
                  disabled={pcBusy || !pcValue.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                >
                  {pcBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
