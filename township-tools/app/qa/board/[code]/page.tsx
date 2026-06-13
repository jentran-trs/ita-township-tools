import { createServerSupabaseClient } from '@/lib/supabase';
import { LiveBoard } from '@/components/live-qa/LiveBoard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Live Q&A board · Indiana Township Association',
};

type Params = { params: { code: string } };

// Public screencast board. Shows approved questions + a QR of the submit page.
// Presenting (dismissing) unlocks with the session passcode the superadmin set —
// no login required. Read-only if no passcode is set.
export default async function QaBoardPage({ params }: Params) {
  const supabase = createServerSupabaseClient();
  const { data: session } = await supabase
    .from('lqa_sessions')
    .select('title, submit_code, board_passcode')
    .eq('board_code', params.code)
    .maybeSingle();

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900 dark:bg-slate-900 dark:text-white">
        <p className="text-2xl">Board not found.</p>
      </div>
    );
  }

  return (
    <LiveBoard
      boardCode={params.code}
      title={session.title}
      submitCode={session.submit_code}
      passcodeSet={!!session.board_passcode}
    />
  );
}
