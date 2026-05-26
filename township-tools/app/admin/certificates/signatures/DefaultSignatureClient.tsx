"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { SignatureUpload } from '@/components/certificates/SignatureUpload';

type Initial = {
  signer_name: string;
  signer_title: string;
  signature_image_url: string;
  updated_at: string;
} | null;

export function DefaultSignatureClient({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [signerName, setSignerName] = useState(initial?.signer_name || '');
  const [signerTitle, setSignerTitle] = useState(initial?.signer_title || 'Executive Director');
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.signature_image_url || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const onSave = async () => {
    setError(null);
    if (!signerName.trim()) return setError('Name is required');
    if (!imageUrl) return setError('Signature image is required');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/certificates/default-signature', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signer_name: signerName.trim(),
          signer_title: signerTitle.trim() || 'Executive Director',
          signature_image_url: imageUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 text-sm rounded-lg px-4 py-3">
        Updating the default signature only affects courses created <strong>after</strong> this change.
        Existing certificates keep the signature URL copied onto them when their course was created.
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {saved && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-sm rounded-lg px-4 py-2">
          Saved.
        </div>
      )}

      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
        <Field label="Executive Director name" required>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="e.g. Debbie Driskell"
            className={inputCls}
          />
        </Field>
        <Field label="Title" hint="Defaults to Executive Director.">
          <input
            type="text"
            value={signerTitle}
            onChange={(e) => setSignerTitle(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Signature image" required hint="PNG with a transparent background, max 2 MB.">
          <SignatureUpload kind="signature" value={imageUrl} onChange={setImageUrl} />
        </Field>

        {initial?.updated_at && (
          <div className="text-xs text-gray-500">
            Last updated {new Date(initial.updated_at).toLocaleString()}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save default signature
          </button>
        </div>
      </section>
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400';

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}
