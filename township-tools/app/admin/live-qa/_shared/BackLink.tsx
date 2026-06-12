import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
    >
      <ArrowLeft className="w-4 h-4" />
      {children}
    </Link>
  );
}
