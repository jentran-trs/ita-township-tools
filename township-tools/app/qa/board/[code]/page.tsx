import { createServerSupabaseClient } from '@/lib/supabase';
import { LiveBoard } from '@/components/live-qa/LiveBoard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Live Q&A board · Indiana Township Association',
};

type Params = { params: { code: string } };

// Public, read-only display of approved questions (no dismiss controls). The
// logged-in screencaster uses /admin/live-qa/[id]/present instead, which can
// dismiss. This route stays available for a clean second-screen display.
export default async function QaBoardPage({ params }: Params) {
  const supabase = createServerSupabaseClient();
  const { data: session } = await supabase
    .from('lqa_sessions')
    .select('title')
    .eq('board_code', params.code)
    .maybeSingle();

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900 dark:bg-slate-900 dark:text-white">
        <p className="text-2xl">Board not found.</p>
      </div>
    );
  }

  return <LiveBoard boardCode={params.code} title={session.title} />;
}
