import { redirect } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { isSuperadmin } from '@/lib/auth/superadmin';
import { createServerSupabaseClient } from '@/lib/supabase';
import { BackLink } from './_shared/BackLink';
import { SessionsTable } from './_shared/SessionsTable';

export const dynamic = 'force-dynamic';

export default async function LiveQaSessionsPage() {
  if (!(await isSuperadmin())) {
    redirect('/admin/contact-verification');
  }

  const supabase = createServerSupabaseClient();
  const { data: sessions } = await supabase
    .from('lqa_session_summary')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackLink href="/dashboard">Dashboard</BackLink>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              <h1 className="text-xl font-bold">Live Q&amp;A</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Create a session for each meeting. Share its submit link with attendees; their questions
          appear live on a Live Question Screen you can present, and you can copy them into your Teams
          chat or dismiss them when done.
        </p>
        <SessionsTable initialSessions={(sessions as any) || []} />
      </main>
    </div>
  );
}
