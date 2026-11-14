import { notFound, redirect } from 'next/navigation';
import { isSuperadmin } from '@/lib/auth/superadmin';
import { loadBadgePrintData } from '@/lib/badges/print-data';
import { BadgePrintClient } from './BadgePrintClient';
import { badgeFont } from '@/lib/badges/fonts';

export const dynamic = 'force-dynamic';

type Props = { params: { courseId: string }; searchParams: { ids?: string; from?: string; to?: string } };

export default async function BadgePrintPage({ params, searchParams }: Props) {
  if (!(await isSuperadmin())) redirect('/admin/contact-verification');

  const ids = (searchParams.ids || '').split(',').map((s) => s.trim()).filter(Boolean);
  const from = parseInt(searchParams.from || '', 10) || null;
  const to = parseInt(searchParams.to || '', 10) || null;
  const data = await loadBadgePrintData(params.courseId, ids, { from, to });
  if (!data) notFound();

  return (
    <div className={badgeFont.variable}>
      <BadgePrintClient
        courseId={params.courseId}
        badges={data.badges}
        event={data.event}
        backHref={`/admin/certificates/${params.courseId}#registrants`}
        showShareLink
        range={from || to ? { from, to } : undefined}
      />
    </div>
  );
}
