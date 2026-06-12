"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, ArchiveRestore, Check, Copy, Loader2 } from 'lucide-react';
import { copyText } from '@/lib/live-qa/clipboard';

// Console header actions that need interactivity: copy the attendee submit link
// and archive / reopen the session.
export function SessionControls({
  id,
  status,
  submitCode,
}: {
  id: string;
  status: 'open' | 'closed';
  submitCode: string;
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
