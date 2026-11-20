import { redirect } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { isSuperadmin } from '@/lib/auth/superadmin';
import { BackLink } from '../_shared/BackLink';
import { UnpaidClient } from './UnpaidClient';

export const dynamic = 'force-dynamic';

// Everyone who still owes, at any event (the latest one included), grouped by person.
export default async function UnpaidPage() {
  if (!(await isSuperadmin())) redirect('/admin/contact-verification');
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <BackLink href="/admin/certificates">Certificate &amp; Badge Generator</BackLink>
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6 text-red-600 dark:text-red-400" />
            <h1 className="text-xl font-bold">Unpaid across events</h1>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <UnpaidClient />
      </main>
    </div>
  );
}
