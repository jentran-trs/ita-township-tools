import { Award, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { VerifyByCredentialClient } from './VerifyByCredentialClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Verify a credential · Indiana Township Association',
  description:
    'Paste a credential ID to verify an ITA training certificate. Confirms recipient, course, date, hours, and status.',
};

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <Award className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            <span className="font-bold text-lg">Township Tools</span>
          </Link>
          <Link
            href="/certificates"
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <Award className="w-4 h-4" />
            Find your certificate
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 w-full">
        <div className="text-center mb-8">
          <ShieldCheck className="w-12 h-12 text-amber-600 dark:text-amber-400 mx-auto mb-4" />
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Verify a credential</h1>
          <p className="text-base text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Paste a credential ID from an ITA training certificate to confirm its recipient, course, and status.
          </p>
        </div>

        <VerifyByCredentialClient />
      </main>
    </div>
  );
}
