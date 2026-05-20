import React, { useState } from 'react';
import { GripVertical, Plus, ChevronDown, ChevronRight, MousePointer2 } from 'lucide-react';

// Core email-mode elements. Header + Footer are defaults (locked at top/bottom),
// so they aren't draggable from the catalog.
const EMAIL_SECTIONS = [
  { type: 'contentBody', label: 'Rich Text', desc: 'Paragraphs, headings, bullets, links', icon: 'T', color: 'blue' },
  { type: 'ctaButton', label: 'Button', desc: 'Maroon call-to-action button', icon: 'B', color: 'red' },
  { type: 'highlighted', label: 'Highlighted Card', desc: 'Light gray card with accent border', icon: '!', color: 'amber' },
  { type: 'highlightBanner', label: 'Navy Callout', desc: 'White text on navy — top priority', icon: '★', color: 'indigo' },
  { type: 'twoColumn', label: 'Two Column', desc: 'Side-by-side content columns', icon: '⫼', color: 'teal' },
  { type: 'meetingDetails', label: 'Meeting Details', desc: 'Date, time, link + auto calendar buttons', icon: 'M', color: 'purple' },
  { type: 'divider', label: 'Divider', desc: 'Orange accent rule between sections', icon: '—', color: 'orange' },
];

// Newsletter-format story blocks. These appear below the Email Elements
// group regardless of which mode the user picked at the top — users can mix
// any element into either kind of document.
const NEWSLETTER_SECTIONS = [
  { type: 'featuredArticle', label: 'Featured Article', desc: 'Main story with optional CTA', icon: '★', color: 'amber' },
  { type: 'newsSection', label: 'News Update', desc: 'Heading + short news paragraph', icon: 'N', color: 'blue' },
  { type: 'eventListing', label: 'Upcoming Events', desc: 'List of upcoming events', icon: 'E', color: 'purple' },
];

// Image is its own utility element — useful in any kind of email.
const UNIVERSAL_SECTIONS = [
  { type: 'image', label: 'Image', desc: 'A single image from a URL or upload', icon: 'I', color: 'cyan' },
];

const COLOR_MAP = {
  emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  teal: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  rose: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  violet: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  green: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const DraggableSectionItem = ({ item, onAdd }) => {
  const colorClass = COLOR_MAP[item.color] || COLOR_MAP.blue;

  const handleDragStart = (e) => {
    e.dataTransfer.setData('application/x-section-type', item.type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Click-to-add fallback: if drag-and-drop is hard (older users on
  // touchpads/touchscreens), clicking the catalog item adds the section
  // straight to the end of the canvas.
  const handleClick = () => {
    if (onAdd) onAdd(item.type);
  };

  return (
    <button
      type="button"
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      title="Drag onto the canvas — or click to add to the end"
      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-slate-700/50 bg-slate-800/50 cursor-grab active:cursor-grabbing hover:bg-slate-700/50 hover:border-amber-500 transition-all group text-left"
    >
      <GripVertical className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${colorClass}`}>
        {item.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-300 font-medium leading-tight">{item.label}</p>
        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{item.desc}</p>
      </div>
      <Plus className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-500 flex-shrink-0" />
    </button>
  );
};

// Left-side panel: ALL draggable elements (email + newsletter + universal).
// No more email/newsletter toggle — every element is always available, and
// users compose any kind of email by mixing whatever blocks fit their needs.
const SectionCatalog = ({ onAddSection }) => {
  const [showHelp, setShowHelp] = useState(false);
  return (
    <div className="h-full flex flex-col bg-slate-900 border-r border-slate-700/50">
      {/* Collapsible quick-start. Closed by default; one tap to peek. */}
      <div className="p-2 border-b border-slate-700/50">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 rounded"
        >
          <span className="flex items-center gap-1.5">
            <MousePointer2 className="w-3.5 h-3.5" />
            Quick start
          </span>
          {showHelp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        {showHelp && (
          <ol className="mt-1.5 mb-1 px-2 text-xs text-slate-300 space-y-1 list-decimal list-inside leading-snug">
            <li>Click an element below.</li>
            <li>Edit colors &amp; logo on the right.</li>
            <li>Hit <span className="text-amber-300 font-semibold">Preview</span> → Copy HTML.</li>
          </ol>
        )}
      </div>

      {/* Sections Catalog */}
      <div className="flex-1 overflow-y-auto" data-tour="add-section">
        <div className="p-3 space-y-4">
          {/* Email elements */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 px-1">
              Email elements
            </p>
            <div className="space-y-1.5">
              {EMAIL_SECTIONS.map(item => (
                <DraggableSectionItem key={item.type} item={item} onAdd={onAddSection} />
              ))}
            </div>
          </div>

          {/* Newsletter elements */}
          <div>
            <p className="text-[10px] font-semibold text-amber-500/70 uppercase tracking-wider mb-1.5 px-1">
              Newsletter elements
            </p>
            <div className="space-y-1.5">
              {NEWSLETTER_SECTIONS.map(item => (
                <DraggableSectionItem key={item.type} item={item} onAdd={onAddSection} />
              ))}
            </div>
          </div>

          {/* Universal */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 px-1">
              Universal
            </p>
            <div className="space-y-1.5">
              {UNIVERSAL_SECTIONS.map(item => (
                <DraggableSectionItem key={item.type} item={item} onAdd={onAddSection} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionCatalog;
