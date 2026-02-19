import React, { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

const SHARED_SECTIONS = [
  { type: 'contentBody', label: 'Content Body', desc: 'Rich text content block', icon: 'C' },
  { type: 'image', label: 'Image', desc: 'Image from URL with sizing & shape', icon: '🖼' },
  { type: 'highlighted', label: 'Highlighted Section', desc: 'Colored border emphasis block', icon: '!' },
  { type: 'importantNotice', label: 'Important Notice', desc: 'Yellow notice box', icon: 'i' },
  { type: 'ctaButton', label: 'CTA Button', desc: 'Call-to-action button with link', icon: 'B' },
  { type: 'meetingDetails', label: 'Meeting Details', desc: 'Date, time, ID, passcode & join link', icon: '📋' },
  { type: 'resourceLinks', label: 'Resource Links', desc: 'List of clickable links', icon: '🔗' },
  { type: 'signature', label: 'Signature', desc: 'Name, title, organization', icon: 'S' },
  { type: 'alertBox', label: 'Alert Box', desc: 'Red-bordered alert/warning box', icon: '⚠' },
  { type: 'twoColumn', label: 'Two Column', desc: 'Side-by-side content columns', icon: '⫼' },
  { type: 'list', label: 'List', desc: 'Bullet or numbered list', icon: '☰' },
  { type: 'greeting', label: 'Greeting', desc: 'Opening greeting with sign-offs', icon: 'G' },
  { type: 'closing', label: 'Closing', desc: 'Closing remarks', icon: '✉' },
];

const NEWSLETTER_SECTIONS = [
  { type: 'featuredArticle', label: 'Featured Article', desc: 'Headline article with CTA', icon: '★' },
  { type: 'newsSection', label: 'News Section', desc: 'Heading + rich text news', icon: '📰' },
  { type: 'eventListing', label: 'Event Listing', desc: 'Repeatable event items', icon: '📅' },
  { type: 'highlightBanner', label: 'Highlight Banner', desc: 'CTA banner with button', icon: '🎯' },
  { type: 'memberResources', label: 'Member Resources', desc: 'Bulleted resource list', icon: '📋' },
];

const SectionMenu = ({ templateType, onAdd }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const sections = templateType === 'newsletter'
    ? [...NEWSLETTER_SECTIONS, { divider: true }, ...SHARED_SECTIONS]
    : SHARED_SECTIONS;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-500/20 text-amber-500 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Section
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-80 overflow-y-auto z-50">
          <div className="sticky top-0 bg-slate-800 flex items-center justify-between px-3 py-2 border-b border-slate-700">
            <span className="text-xs font-medium text-slate-400">Add Section</span>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {templateType === 'newsletter' && (
            <p className="px-3 pt-2 text-[10px] uppercase tracking-wide text-amber-500/70 font-medium">Newsletter</p>
          )}
          {sections.map((item, i) => {
            if (item.divider) {
              return (
                <div key={`divider-${i}`}>
                  <div className="border-t border-slate-700 my-1" />
                  <p className="px-3 pt-1 text-[10px] uppercase tracking-wide text-slate-500 font-medium">General</p>
                </div>
              );
            }
            return (
              <button
                key={item.type}
                onClick={() => { onAdd(item.type); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-700/50 transition-colors text-left"
              >
                <span className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-xs flex-shrink-0">
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-slate-300">{item.label}</p>
                  <p className="text-xs text-slate-500 truncate">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SectionMenu;
