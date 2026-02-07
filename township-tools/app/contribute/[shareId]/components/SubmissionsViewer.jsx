"use client";

import { useState } from 'react';
import {
  Users,
  ChevronDown,
  ChevronUp,
  FileText,
  Image,
  BarChart3,
  X,
  Eye,
} from 'lucide-react';

function SubmissionCard({ submission, isExpanded, onToggle }) {
  return (
    <div className="bg-slate-100 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between hover:bg-slate-200 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center flex-shrink-0">
            {submission.logoUrl ? (
              <img
                src={submission.logoUrl}
                alt=""
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <span className="text-slate-600 text-sm font-medium">
                {submission.submitterName?.charAt(0) || '?'}
              </span>
            )}
          </div>
          <div>
            <p className="font-medium text-slate-800 text-sm">
              {submission.submitterName || 'Anonymous'}
            </p>
            <p className="text-xs text-slate-500">
              {new Date(submission.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {submission.sectionCount}
            </span>
            <span className="flex items-center gap-1">
              <Image className="w-3 h-3" />
              {submission.totalImages}
            </span>
            {submission.totalStats > 0 && (
              <span className="flex items-center gap-1">
                <BarChart3 className="w-3 h-3" />
                {submission.totalStats}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-200 p-3 space-y-2">
          {submission.reportName && (
            <p className="text-sm text-slate-700">
              <span className="text-slate-500">Report:</span> {submission.reportName}
            </p>
          )}
          {submission.hasOpeningLetter && submission.letterTitle && (
            <p className="text-sm text-slate-700">
              <span className="text-slate-500">Letter:</span> {submission.letterTitle}
            </p>
          )}
          {submission.sections?.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Sections:</p>
              <div className="flex flex-wrap gap-1">
                {submission.sections.map((section, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-slate-200 rounded text-xs text-slate-600"
                  >
                    {section.title || `Section ${section.order + 1}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SubmissionsViewer({ submissions, projectName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  if (!submissions || submissions.length === 0) {
    return null;
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-full shadow-lg hover:bg-[#2d4a6f] transition-colors z-40"
      >
        <Users className="w-4 h-4" />
        <span className="text-sm font-medium">
          {submissions.length} {submissions.length === 1 ? 'Submission' : 'Submissions'}
        </span>
        <Eye className="w-4 h-4" />
      </button>

      {/* Slide-out Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="font-semibold text-slate-800">Other Submissions</h2>
                <p className="text-sm text-slate-500">
                  {submissions.length} {submissions.length === 1 ? 'contribution' : 'contributions'} to {projectName}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Submissions List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {submissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  isExpanded={expandedId === submission.id}
                  onToggle={() =>
                    setExpandedId(expandedId === submission.id ? null : submission.id)
                  }
                />
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-500 text-center">
                View what others have submitted to avoid duplicate work
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
