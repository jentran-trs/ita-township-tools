import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Download, MonitorPlay } from 'lucide-react';
import { isSuperadmin } from '@/lib/auth/superadmin';
import { createServerSupabaseClient } from '@/lib/supabase';
import { BackLink } from '../_shared/BackLink';
import { SessionControls } from './SessionControls';
import { QaBoard } from './QaBoard';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

export default async function LiveQaConsolePage({ params }: Params) {
  if (!(await isSuperadmin())) {
    redirect('/admin/contact-verification');
  }

  const supabase = createServerSupabaseClient();
  const { data: session } = await supabase
    .from('lqa_sessions')
    .select('id, title, status, submit_code, board_code')
    .eq('id', params.id)
    .maybeSingle();
  if (!session) notFound();

  const { data: questions } = await supabase
    .from('lqa_questions')
    .select('id, question, name, township, county, status, created_at, approved_at, dismissed_at')
    .eq('session_id', session.id);

  const rows = questions || [];
  const byTime = (a: string | null, b: string | null) =>
    new Date(b || 0).getTime() - new Date(a || 0).getTime();
  const initial = {
    pending: rows.filter((r: any) => r.status === 'pending').sort((a: any, b: any) => byTime(a.created_at, b.created_at)),
    approved: rows.filter((r: any) => r.status === 'approved').sort((a: any, b: any) => byTime(a.approved_at, b.approved_at)),
    dismissed: rows.filter((r: any) => r.status === 'dismissed').sort((a: any, b: any) => byTime(a.dismissed_at, b.dismissed_at)),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BackLink href="/admin/live-qa">Live Q&amp;A</BackLink>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold truncate">{session.title}</h1>
              <div className="text-xs text-gray-500">
                {session.status === 'open' ? 'Accepting questions' : 'Archived — submissions closed'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/live-qa/${session.id}/present`}
              target="_blank"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Open the screencast board in a new tab"
            >
              <MonitorPlay className="w-4 h-4" />
              Screencast board
            </Link>
            <a
              href={`/api/admin/live-qa/sessions/${session.id}/export`}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <Download className="w-4 h-4" />
              Export
            </a>
            <SessionControls id={session.id} status={session.status} submitCode={session.submit_code} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <QaBoard sessionId={session.id} initial={initial as any} />
      </main>
    </div>
  );
}
