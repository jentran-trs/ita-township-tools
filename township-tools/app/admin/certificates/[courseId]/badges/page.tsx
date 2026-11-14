import { redirect } from 'next/navigation';

// Badges & check-in now lives on the course page itself.
export default function CourseBadgesPage({ params }: { params: { courseId: string } }) {
  redirect(`/admin/certificates/${params.courseId}`);
}
