"use client";

import { CreditCard, FileCheck2, UserCheck, X } from 'lucide-react';

// How someone paid at the door. Only the method is recorded — no check
// photos or check/card details, since those are sensitive.
export type DoorPayment = { method: 'check' | 'card' };

const money = (n: number | null | undefined) => (n == null ? '' : `$${Number(n).toFixed(2)}`);

/**
 * Shown when someone who owes checks in: paid by check, paid by credit card,
 * or check in without payment (they're then listed for Jen's follow-up).
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
          <BigChoice icon={<FileCheck2 className="w-6 h-6" />} label="Paid by check" onClick={() => onDone({ method: 'check' })} />
          <BigChoice icon={<CreditCard className="w-6 h-6" />} label="Paid by credit card" onClick={() => onDone({ method: 'card' })} />
          <BigChoice
            icon={<UserCheck className="w-6 h-6" />}
            label="Check in without payment"
            hint="They'll be listed for follow-up"
            onClick={() => onDone(null)}
            quiet
          />
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
