import React, { useState, useRef } from 'react';
import { GripVertical, ArrowUp, ArrowDown, Trash2, Lock } from 'lucide-react';

const SECTION_LABELS = {
  header: 'Header',
  contentBody: 'Content Body',
  image: 'Image',
  highlighted: 'Highlighted',
  importantNotice: 'Important Notice',
  ctaButton: 'CTA Button',
  meetingDetails: 'Meeting Details',
  resourceLinks: 'Resource Links',
  signature: 'Signature',
  footer: 'Footer',
  newsletterTitle: 'Newsletter Title',
  featuredArticle: 'Featured Article',
  eventListing: 'Event Listing',
  newsSection: 'News Section',
  highlightBanner: 'Highlight Banner',
  memberResources: 'Member Resources',
};

const SECTION_COLORS = {
  header: 'bg-amber-500/20 text-amber-500',
  contentBody: 'bg-blue-500/20 text-blue-500',
  image: 'bg-cyan-500/20 text-cyan-500',
  highlighted: 'bg-amber-500/20 text-amber-500',
  importantNotice: 'bg-yellow-500/20 text-yellow-500',
  ctaButton: 'bg-amber-500/20 text-amber-500',
  meetingDetails: 'bg-indigo-500/20 text-indigo-500',
  resourceLinks: 'bg-blue-500/20 text-blue-500',
  signature: 'bg-violet-500/20 text-violet-500',
  footer: 'bg-slate-500/20 text-slate-400',
  newsletterTitle: 'bg-amber-500/20 text-amber-500',
  featuredArticle: 'bg-amber-500/20 text-amber-500',
  eventListing: 'bg-purple-500/20 text-purple-500',
  newsSection: 'bg-blue-500/20 text-blue-500',
  highlightBanner: 'bg-emerald-500/20 text-emerald-500',
  memberResources: 'bg-green-500/20 text-green-500',
};

const SectionList = ({ sections, activeSectionId, onSelect, onMove, onDelete }) => {
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = (e, index) => {
    if (sections[index].locked) { e.preventDefault(); return; }
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (sections[index].locked) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index && !sections[index].locked) {
      onMove(dragIndex, index);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="p-2 space-y-1">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide px-2 py-1">Sections</p>
      {sections.map((section, index) => {
        const isFirst = index === 0;
        const isLast = index === sections.length - 1;
        const canMoveUp = !section.locked && index > 1; // Can't move above first locked section
        const canMoveDown = !section.locked && index < sections.length - 2; // Can't move below last locked section
        const colorClass = SECTION_COLORS[section.type] || 'bg-slate-500/20 text-slate-400';

        return (
          <div
            key={section.id}
            draggable={!section.locked}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onClick={() => onSelect(section.id)}
            className={`flex items-center gap-1.5 px-2 py-2 rounded-lg cursor-pointer transition-all text-sm group ${
              activeSectionId === section.id
                ? 'bg-slate-600 ring-1 ring-amber-500/50'
                : 'hover:bg-slate-700/50'
            } ${dragOverIndex === index ? 'ring-2 ring-amber-500/50 bg-slate-700' : ''} ${
              dragIndex === index ? 'opacity-50' : ''
            }`}
          >
            {/* Drag Handle */}
            {!section.locked ? (
              <GripVertical className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 flex-shrink-0 cursor-grab" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
            )}

            {/* Section Badge */}
            <span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${colorClass}`}>
              {(SECTION_LABELS[section.type] || '?')[0]}
            </span>

            {/* Label */}
            <span className="text-slate-300 truncate flex-1 text-xs">
              {SECTION_LABELS[section.type] || section.type}
            </span>

            {/* Actions */}
            {!section.locked && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); canMoveUp && onMove(index, index - 1); }}
                  disabled={!canMoveUp}
                  className="p-0.5 text-slate-500 hover:text-slate-300 disabled:opacity-30"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); canMoveDown && onMove(index, index + 1); }}
                  disabled={!canMoveDown}
                  className="p-0.5 text-slate-500 hover:text-slate-300 disabled:opacity-30"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(section.id); }}
                  className="p-0.5 text-red-400/60 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SectionList;
