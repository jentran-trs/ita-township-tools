"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, ArchiveRestore, Check, Copy, KeyRound, Loader2 } from 'lucide-react';
import { copyText } from '@/lib/live-qa/clipboard';

// Console header actions that need interactivity: copy the attendee submit link,
// set the screencast-board passcode, and archive / reopen the session.
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

  const onCopy = async () => {
    const url =
      typeof window !== 'undefined' ? `${window.location.origin}/qa/${submitCode}` : `/qa/${submitCode}`;
    if (await copyText(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const onSetPasscode = async () => {
    const input = window.prompt(
      'Set a passcode for the screencast board.\nAnyone with this passcode and the board link can present and dismiss questions.\nLeave blank to remove the passcode (board becomes read-only).',
      passcode || ''
    );
    if (input === null) return; // cancelled
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/live-qa/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board_passcode: input.trim() || null }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
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
        onClick={onSetPasscode}
        disabled={busy}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
        title="Set the passcode presenters use to open the screencast board"
      >
        <KeyRound className="w-4 h-4" />
        {passcode ? 'Passcode ✓' : 'Set passcode'}
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
    </>
  );
}
