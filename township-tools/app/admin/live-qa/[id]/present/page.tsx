import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { isSuperadmin } from '@/lib/auth/superadmin';
import { createServerSupabaseClient } from '@/lib/supabase';
import { LiveBoard } from '@/components/live-qa/LiveBoard';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

// The screencast board for a logged-in superadmin presenter. Big presentable
// layout with a per-card dismiss control. The presenter screenshares this page
// while the behind-the-scenes admin approves/dismisses from the console.
export default async function PresentBoardPage({ params }: Params) {
  if (!(await isSuperadmin())) {
    redirect('/admin/contact-verification');
  }

  const supabase = createServerSupabaseClient();
  const { data: session } = await supabase
    .from('lqa_sessions')
    .select('title, board_code')
    .eq('id', params.id)
    .maybeSingle();
  if (!session) notFound();

  return (
    <div className="relative">
      {/* Subtle back link — kept minimal so it doesn't intrude on the screencast. */}
      <Link
        href={`/admin/live-qa/${params.id}`}
        className="fixed bottom-4 left-4 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/90 text-gray-600 border border-gray-200 hover:bg-gray-100 dark:bg-slate-800/80 dark:text-slate-300 dark:border-transparent dark:hover:bg-slate-700 rounded-lg shadow-sm"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Console
      </Link>
      <LiveBoard boardCode={session.board_code} title={session.title} canDismiss />
    </div>
  );
}
