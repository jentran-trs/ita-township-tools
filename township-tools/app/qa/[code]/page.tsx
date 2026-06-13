import { MessageSquare } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase';
import { SubmitForm } from './SubmitForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Submit a question · Indiana Township Association',
};

type Params = { params: { code: string } };

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      timeZone: 'America/Indiana/Indianapolis',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return iso;
  }
}

export default async function QaSubmitPage({ params }: Params) {
  const supabase = createServerSupabaseClient();
  // select('*') keeps this working before the v22 window columns exist.
  const { data: session } = await supabase
    .from('lqa_sessions')
    .select('*')
    .eq('submit_code', params.code)
    .maybeSingle();

  // Effective open state: archived, or outside the optional submission window.
  let open = false;
  let notice: string | undefined;
  if (session) {
    const now = Date.now();
    if (session.status !== 'open') {
      notice = 'This Q&A is closed. Thanks for attending!';
    } else if (session.submit_opens_at && now < new Date(session.submit_opens_at).getTime()) {
      notice = `Question portal will open on ${fmtDateTime(session.submit_opens_at)}. Check back then!`;
    } else if (session.submit_closes_at && now > new Date(session.submit_closes_at).getTime()) {
      notice = `Question portal closed on ${fmtDateTime(session.submit_closes_at)}.`;
    } else {
      open = true;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          <span className="font-bold text-lg">Township Tools · Live Q&amp;A</span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full">
        {!session ? (
          <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-10 text-center">
            <h1 className="text-xl font-bold mb-2">Session not found</h1>
            <p className="text-sm text-gray-500">
              This Q&amp;A link isn&apos;t valid. Double-check the link or code shown at the meeting.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">{session.title}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Submit a question for this session — it&apos;ll appear on the screen shortly.
              </p>
            </div>
            <SubmitForm submitCode={session.submit_code} open={open} notice={notice} />
          </>
        )}
      </main>
    </div>
  );
}
