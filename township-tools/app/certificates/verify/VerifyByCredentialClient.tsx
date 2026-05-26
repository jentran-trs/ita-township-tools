"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, ShieldCheck } from 'lucide-react';

export function VerifyByCredentialClient() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    setLoading(true);
    router.push(`/certificates/verify/${encodeURIComponent(v)}`);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-5 shadow-sm"
    >
      <label htmlFor="credential-id" className="block text-sm font-medium mb-1.5">
        Credential ID
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="credential-id"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="ITA-2026_100-A3F9K2"
            autoCapitalize="characters"
            spellCheck={false}
            required
            className="w-full pl-10 pr-3 py-2.5 text-base font-mono bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Verify
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        The credential ID is printed on the certificate. Scanning the QR code on a certificate also opens this page.
      </p>
    </form>
  );
}
