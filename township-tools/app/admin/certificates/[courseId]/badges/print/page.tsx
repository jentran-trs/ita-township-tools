import { notFound, redirect } from 'next/navigation';
import { isSuperadmin } from '@/lib/auth/superadmin';
import { loadBadgePrintData } from '@/lib/badges/print-data';
import { BadgePrintClient } from './BadgePrintClient';
import { badgeFont } from '@/lib/badges/fonts';

export const dynamic = 'force-dynamic';

type Props = { params: { courseId: string }; searchParams: { ids?: string } };

export default async function BadgePrintPage({ params, searchParams }: Props) {
  if (!(await isSuperadmin())) redirect('/admin/contact-verification');

  const ids = (searchParams.ids || '').split(',').map((s) => s.trim()).filter(Boolean);
  const data = await loadBadgePrintData(params.courseId, ids);
  if (!data) notFound();

  return (
    <div className={badgeFont.variable}>
      <BadgePrintClient
        courseId={params.courseId}
        badges={data.badges}
        event={data.event}
        backHref={`/admin/certificates/${params.courseId}#registrants`}
        showShareLink
      />
    </div>
  );
}
