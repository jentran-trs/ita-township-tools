import { redirect } from 'next/navigation';
import { FileSignature } from 'lucide-react';
import { isSuperadmin } from '@/lib/auth/superadmin';
import { createServerSupabaseClient } from '@/lib/supabase';
import { BackLink } from '../_shared/BackLink';
import { DefaultSignatureClient } from './DefaultSignatureClient';

export const dynamic = 'force-dynamic';

export default async function DefaultSignaturePage() {
  if (!(await isSuperadmin())) {
    redirect('/admin/contact-verification');
  }

  const supabase = createServerSupabaseClient();
  const { data: sig } = await supabase
    .from('cert_default_signature')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackLink href="/admin/certificates">Certificates</BackLink>
            <div className="flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h1 className="text-xl font-bold">Default Executive Director signature</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-32">
        <DefaultSignatureClient
          initial={
            sig
              ? {
                  signer_name: sig.signer_name,
                  signer_title: sig.signer_title,
                  signature_image_url: sig.signature_image_url,
                  updated_at: sig.updated_at,
                }
              : null
          }
        />
      </main>
    </div>
  );
}
