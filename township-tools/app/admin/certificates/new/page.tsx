import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Award, Plus } from 'lucide-react';
import { isSuperadmin } from '@/lib/auth/superadmin';
import { createServerSupabaseClient } from '@/lib/supabase';
import { BackLink } from '../_shared/BackLink';
import { CourseForm, CourseFormInitial } from '../_shared/CourseForm';

export const dynamic = 'force-dynamic';

const DEFAULT_LOGO = '/certificates/ita-logo.png';

export default async function NewCoursePage() {
  if (!(await isSuperadmin())) {
    redirect('/admin/contact-verification');
  }

  const supabase = createServerSupabaseClient();
  const [{ data: courses }, { data: defaultSig }] = await Promise.all([
    supabase.from('cert_courses').select('course_id'),
    supabase.from('cert_default_signature').select('*').eq('id', 1).maybeSingle(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const initial: CourseFormInitial = {
    course_id: '',
    name: '',
    hours: '5.0',
    method: 'in_person',
    course_date: today,
    syllabus: '',
    syllabus_file_url: null,
    syllabus_file_name: null,
    org_name: 'Indiana Township Association',
    logo_url: DEFAULT_LOGO,
    signatures: defaultSig
      ? [
          {
            signer_name: defaultSig.signer_name,
            signer_title: defaultSig.signer_title,
            signature_image_url: defaultSig.signature_image_url,
            display_order: 0,
          },
        ]
      : [{ signer_name: '', signer_title: 'Executive Director', signature_image_url: '', display_order: 0 }],
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackLink href="/admin/certificates">Certificates</BackLink>
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h1 className="text-xl font-bold">New course</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-32">
        {!defaultSig && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-sm rounded-lg px-4 py-3">
            <div className="font-semibold mb-0.5">No default Executive Director signature is set.</div>
            <div>
              You can still create this course with custom signers below, or{' '}
              <Link href="/admin/certificates/signatures" className="underline font-medium">
                set the default ED signature
              </Link>{' '}
              to have it pre-fill the first signer for every new course.
            </div>
          </div>
        )}

        {defaultSig && (
          <div className="mb-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-sm rounded-lg px-4 py-3">
            <div className="font-semibold mb-0.5">
              Default ITA logo and Executive Director signature are preloaded.
            </div>
            <div>
              The first signer below is already filled in with{' '}
              <strong>{defaultSig.signer_name}</strong> ({defaultSig.signer_title}) and the ITA logo
              is set. Edit, replace, or remove them only if this specific course needs something
              different — you don&apos;t need to re-upload them for every new course.{' '}
              <Link href="/admin/certificates/signatures" className="underline font-medium">
                Change the org-wide default
              </Link>
              .
            </div>
          </div>
        )}

        <CourseForm
          mode="create"
          initial={initial}
          existingCourseIds={(courses || []).map((c: any) => c.course_id)}
          defaultSignature={
            defaultSig
              ? {
                  signer_name: defaultSig.signer_name,
                  signer_title: defaultSig.signer_title,
                  signature_image_url: defaultSig.signature_image_url,
                }
              : null
          }
        />
      </main>

      <div className="hidden">
        <Award className="w-4 h-4" />
      </div>
    </div>
  );
}
