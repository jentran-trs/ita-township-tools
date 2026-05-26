import { redirect } from 'next/navigation';
import { isSuperadmin } from '@/lib/auth/superadmin';
import { certFontsClassName } from '@/lib/certificates/fonts';
import { CertificatePreviewClient } from './CertificatePreviewClient';

export const dynamic = 'force-dynamic';

export default async function CertificatePreviewPage() {
  if (!(await isSuperadmin())) {
    redirect('/admin/contact-verification');
  }
  return (
    <div className={certFontsClassName}>
      <CertificatePreviewClient />
    </div>
  );
}
