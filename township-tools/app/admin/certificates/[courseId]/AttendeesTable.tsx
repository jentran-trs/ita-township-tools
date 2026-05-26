"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Info, Loader2, RotateCcw, ShieldOff, X } from 'lucide-react';

type Cert = {
  id: string;
  credential_id: string;
  attendee_first: string;
  attendee_last: string;
  attendee_email: string;
  attendee_township: string | null;
  attendee_county: string | null;
  status: 'active' | 'revoked' | 'reissued';
  issued_at: string;
  last_downloaded_at: string | null;
  revoke_reason?: string | null;
  revoked_at?: string | null;
};

const STATUS_BADGE: Record<Cert['status'], string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  revoked: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  reissued: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export function AttendeesTable({ certificates, courseId }: { certificates: Cert[]; courseId: string }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'revoked' | 'reissued'>('all');
  const [query, setQuery] = useState('');
  const [revokingCert, setRevokingCert] = useState<Cert | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const filtered = certificates.filter((c) => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (!query) return true;
    const q = query.trim().toLowerCase();
    return (
      c.attendee_first.toLowerCase().includes(q) ||
      c.attendee_last.toLowerCase().includes(q) ||
      c.attendee_email.toLowerCase().includes(q) ||
      c.credential_id.toLowerCase().includes(q)
    );
  });

  const onRevoke = (cert: Cert) => {
    setRevokingCert(cert);
    setRevokeReason('');
    setError(null);
  };

  const confirmRevoke = async () => {
    if (!revokingCert) return;
    setBusyId(revokingCert.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/certificates/certificates/${revokingCert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'revoked',
          revoke_reason: revokeReason.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Revoke failed');
      setRevokingCert(null);
      setRevokeReason('');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const onReissue = async (cert: Cert) => {
    if (!confirm(`Re-issue ${cert.attendee_first} ${cert.attendee_last}'s certificate? A new credential ID will be generated.`)) return;
    setBusyId(cert.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/certificates/certificates/${cert.id}/reissue`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Reissue failed');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (!certificates.length) {
    return (
      <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-10 text-center text-sm text-gray-500">
        No attendees imported yet. Upload an xlsx or CSV file to issue certificates.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-sm rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-72">
          <input
            type="text"
            placeholder="Search name, email, credential ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-3 pr-8 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute inset-y-0 right-1.5 my-auto h-6 w-6 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {(['all', 'active', 'revoked', 'reissued'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                filter === f
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="ml-auto text-xs text-gray-500">
          {filtered.length} of {certificates.length} shown
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/95 text-left text-xs uppercase tracking-wider text-gray-500 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-gray-50/95">
              <tr>
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Email</th>
                <th className="px-3 py-2 font-semibold">Township / County</th>
                <th className="px-3 py-2 font-semibold">Credential ID</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Last download</th>
                <th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-3 py-2">
                    {c.attendee_first} {c.attendee_last}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{c.attendee_email}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                    {[c.attendee_township, c.attendee_county && `${c.attendee_county} County`]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{c.credential_id}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[c.status]}`}>
                        {c.status}
                      </span>
                      {c.status === 'revoked' && c.revoke_reason && (
                        <span
                          className="inline-flex items-center"
                          title={`Reason: ${c.revoke_reason}${
                            c.revoked_at ? ` (revoked ${new Date(c.revoked_at).toLocaleString()})` : ''
                          }`}
                        >
                          <Info className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        </span>
                      )}
                    </div>
                    {c.status === 'revoked' && c.revoke_reason && (
                      <div className="text-xs text-gray-500 mt-0.5 max-w-[18rem] truncate" title={c.revoke_reason}>
                        {c.revoke_reason}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs">
                    {c.last_downloaded_at ? new Date(c.last_downloaded_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-1">
                      {c.status === 'active' && (
                        <button
                          onClick={() => onRevoke(c)}
                          disabled={busyId === c.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md disabled:opacity-50"
                          title="Revoke"
                        >
                          {busyId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldOff className="w-3 h-3" />}
                          Revoke
                        </button>
                      )}
                      {(c.status === 'active' || c.status === 'revoked') && (
                        <button
                          onClick={() => onReissue(c)}
                          disabled={busyId === c.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-md disabled:opacity-50"
                          title="Re-issue with new credential ID"
                        >
                          {busyId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                          Re-issue
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {revokingCert && (
        <RevokeReasonModal
          cert={revokingCert}
          reason={revokeReason}
          onChangeReason={setRevokeReason}
          onCancel={() => {
            if (busyId) return;
            setRevokingCert(null);
            setRevokeReason('');
          }}
          onConfirm={confirmRevoke}
          submitting={!!busyId}
        />
      )}
    </div>
  );
}

function RevokeReasonModal({
  cert,
  reason,
  onChangeReason,
  onCancel,
  onConfirm,
  submitting,
}: {
  cert: Cert;
  reason: string;
  onChangeReason: (r: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  const fullName = `${cert.attendee_first} ${cert.attendee_last}`.trim();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldOff className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold">Revoke certificate</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Revoke <strong>{fullName}</strong>&apos;s certificate (<span className="font-mono">{cert.credential_id}</span>)?
            They&apos;ll no longer see it in their email lookup, and the verify page will show it as
            revoked.
          </p>

          <div>
            <label htmlFor="revoke-reason" className="block text-sm font-medium mb-1.5">
              Reason for revocation
            </label>
            <textarea
              id="revoke-reason"
              value={reason}
              onChange={(e) => onChangeReason(e.target.value)}
              disabled={submitting}
              placeholder="e.g. Attendee did not actually complete the training, issued by mistake, name spelled incorrectly…"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[88px]"
            />
            <p className="mt-1 text-xs text-gray-500">
              Admin-only — never shown on the public verify page. Helps you remember why this was
              revoked later.
            </p>
          </div>
        </div>

        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/40 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
            Revoke certificate
          </button>
        </div>
      </div>
    </div>
  );
}
