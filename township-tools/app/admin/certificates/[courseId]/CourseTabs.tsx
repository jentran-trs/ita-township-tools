"use client";

import { useState } from 'react';
import { Pencil, Users } from 'lucide-react';
import { AttendeesTable } from './AttendeesTable';
import { CourseForm, CourseFormInitial } from '../_shared/CourseForm';

type AttendeeRow = React.ComponentProps<typeof AttendeesTable>['certificates'][number];

type Tab = 'attendees' | 'settings';

type Props = {
  courseId: string;
  certificates: AttendeeRow[];
  formInitial: CourseFormInitial;
  existingCourseIds: string[];
};

export function CourseTabs({ courseId, certificates, formInitial, existingCourseIds }: Props) {
  const [tab, setTab] = useState<Tab>('attendees');

  return (
    <div>
      <div className="border-b border-gray-200 dark:border-gray-800 mb-6">
        <nav className="flex gap-1 -mb-px">
          <TabButton
            active={tab === 'attendees'}
            onClick={() => setTab('attendees')}
            icon={<Users className="w-4 h-4" />}
            label={`Attendees (${certificates.length})`}
          />
          <TabButton
            active={tab === 'settings'}
            onClick={() => setTab('settings')}
            icon={<Pencil className="w-4 h-4" />}
            label="Course settings"
          />
        </nav>
      </div>

      {tab === 'attendees' ? (
        <AttendeesTable certificates={certificates} courseId={courseId} />
      ) : (
        <CourseForm
          mode="edit"
          initial={formInitial}
          existingCourseIds={existingCourseIds}
          defaultSignature={null}
          attendeeCount={certificates.length}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
        active
          ? 'border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-900/10'
          : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/40'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
