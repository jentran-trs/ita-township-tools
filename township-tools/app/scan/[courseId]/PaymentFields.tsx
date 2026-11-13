"use client";

import { useEffect, useRef, useState } from 'react';
import { Camera, CreditCard, FileCheck2, UserCheck, X } from 'lucide-react';
import { compressPhoto } from '@/lib/badges/photo-store';

export type DoorPayment = {
  method: 'check' | 'card';
  check_number?: string;
  amount?: string;
  photo?: Blob;
};

const money = (n: number | null | undefined) => (n == null ? '' : `$${Number(n).toFixed(2)}`);

/**
 * Shown when someone who owes checks in. The team records a check (with a
 * photo) or a card payment, or checks them in without payment, which puts
 * them in Jen's Needs Review list.
 */
export function PaymentSheet({
  name,
  balance,
  onDone,
  onCancel,
}: {
  name: string;
  balance: number | null | undefined;
  onDone: (payment: DoorPayment | null) => void;
  onCancel: () => void;
}) {
  const [method, setMethod] = useState<'check' | 'card' | null>(null);
  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center" onClick={onCancel}>
      <div className="bg-white w-full sm:max-w-md max-h-[92dvh] rounded-t-2xl sm:rounded-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-4 py-3 border-b">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-red-600">Payment due{balance ? ` · ${money(balance)}` : ''}</div>
            <h2 className="font-bold text-lg leading-tight">{name}</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Cancel" className="p-1">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-3">
          {!method ? (
            <>
              <BigChoice icon={<FileCheck2 className="w-6 h-6" />} label="Paid by check" hint="Take a photo of the check" onClick={() => setMethod('check')} />
              <BigChoice icon={<CreditCard className="w-6 h-6" />} label="Paid by credit card" onClick={() => setMethod('card')} />
              <BigChoice
                icon={<UserCheck className="w-6 h-6" />}
                label="Check in without payment"
                hint="They'll be listed for follow-up"
                onClick={() => onDone(null)}
                quiet
              />
            </>
          ) : (
            <PaymentFields method={method} defaultAmount={balance} onBack={() => setMethod(null)} onSave={onDone} saveLabel="Save and check in" />
          )}
        </div>
      </div>
    </div>
  );
}

function BigChoice({ icon, label, hint, onClick, quiet }: { icon: React.ReactNode; label: string; hint?: string; onClick: () => void; quiet?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl text-left border-2 ${
        quiet ? 'border-gray-200 text-gray-700' : 'border-[#1B2E5B] text-[#1B2E5B]'
      }`}
    >
      {icon}
      <span>
        <span className="block text-lg font-bold">{label}</span>
        {hint && <span className="block text-sm text-gray-500">{hint}</span>}
      </span>
    </button>
  );
}

/** Check photo + optional number/amount, or card amount. Also used by the walk-in form. */
export function PaymentFields({
  method,
  defaultAmount,
  onBack,
  onSave,
  saveLabel,
}: {
  method: 'check' | 'card';
  defaultAmount?: number | null;
  onBack?: () => void;
  onSave: (p: DoorPayment) => void;
  saveLabel: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [checkNo, setCheckNo] = useState('');
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : '');
  const [err, setErr] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setErr(null);
    setWorking(true);
    try {
      const small = await compressPhoto(f);
      setPhoto(small);
      setPreview(URL.createObjectURL(small));
    } catch (e: any) {
      setErr(e.message || 'Could not use that photo');
    } finally {
      setWorking(false);
    }
  };

  const save = () => {
    if (method === 'check' && !photo) {
      setErr('Take a photo of the check first.');
      return;
    }
    onSave({ method, check_number: checkNo.trim() || undefined, amount: amount.trim() || undefined, photo: photo || undefined });
  };

  return (
    <div className="space-y-3">
      {method === 'check' && (
        <div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Check" className="w-full rounded-xl border" />
          ) : null}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={working}
            className="mt-2 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold bg-[#1B2E5B] text-white disabled:opacity-50"
          >
            <Camera className="w-5 h-5" /> {working ? 'Saving photo…' : preview ? 'Retake photo' : 'Take photo of check'}
          </button>
          <p className="text-xs text-gray-500 mt-1">The photo is stored privately for ITA staff and deleted after 90 days.</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {method === 'check' && (
          <label className="block">
            <span className="block text-sm font-semibold mb-1">Check # (optional)</span>
            <input value={checkNo} onChange={(e) => setCheckNo(e.target.value)} inputMode="numeric" className="w-full px-3 py-2.5 border border-gray-300 rounded-xl" />
          </label>
        )}
        <label className="block">
          <span className="block text-sm font-semibold mb-1">Amount (optional)</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="$" className="w-full px-3 py-2.5 border border-gray-300 rounded-xl" />
        </label>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button type="button" onClick={save} disabled={working} className="w-full py-3.5 text-lg font-semibold bg-green-600 text-white rounded-xl disabled:opacity-50">
        {saveLabel}
      </button>
      {onBack && (
        <button type="button" onClick={onBack} className="w-full py-2 text-sm text-gray-600">
          Back
        </button>
      )}
    </div>
  );
}
