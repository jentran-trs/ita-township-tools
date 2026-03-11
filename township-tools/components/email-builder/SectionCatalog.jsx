import React, { useState } from 'react';
import { Mail, Newspaper, ChevronDown, ChevronRight, BookOpen, FolderOpen, FileText, Trash2, Plus, X, GripVertical, Palette } from 'lucide-react';
import EXAMPLE_TEMPLATES from './exampleTemplates';
import BrandSettings from './BrandSettings';

const SHARED_SECTIONS = [
  { type: 'greeting', label: 'Greeting', desc: 'Opening greeting with sign-offs', icon: 'G', color: 'emerald' },
  { type: 'contentBody', label: 'Content Body', desc: 'Rich text content block', icon: 'C', color: 'blue' },
  { type: 'image', label: 'Image', desc: 'Image from URL with sizing & shape', icon: 'I', color: 'cyan' },
  { type: 'highlighted', label: 'Highlighted', desc: 'Colored border emphasis block', icon: '!', color: 'amber' },
  { type: 'importantNotice', label: 'Important Notice', desc: 'Yellow notice box', icon: 'i', color: 'yellow' },
  { type: 'alertBox', label: 'Alert Box', desc: 'Red alert/warning box', icon: '!', color: 'red' },
  { type: 'ctaButton', label: 'CTA Button', desc: 'Call-to-action button with link', icon: 'B', color: 'amber' },
  { type: 'meetingDetails', label: 'Meeting Details', desc: 'Date, time, ID & join link', icon: 'M', color: 'indigo' },
  { type: 'resourceLinks', label: 'Resource Links', desc: 'List of clickable links', icon: 'R', color: 'blue' },
  { type: 'twoColumn', label: 'Two Column', desc: 'Side-by-side content columns', icon: '⫼', color: 'teal' },
  { type: 'list', label: 'List', desc: 'Bullet or numbered list', icon: '≡', color: 'orange' },
  { type: 'closing', label: 'Closing', desc: 'Closing remarks', icon: '✉', color: 'rose' },
  { type: 'signature', label: 'Signature', desc: 'Name, title, organization', icon: 'S', color: 'violet' },
];

const NEWSLETTER_SECTIONS = [
  { type: 'featuredArticle', label: 'Featured Article', desc: 'Headline article with CTA', icon: '★', color: 'amber' },
  { type: 'newsSection', label: 'News Section', desc: 'Heading + rich text news', icon: 'N', color: 'blue' },
  { type: 'eventListing', label: 'Event Listing', desc: 'Repeatable event items', icon: 'E', color: 'purple' },
  { type: 'highlightBanner', label: 'Highlight Banner', desc: 'CTA banner with button', icon: '!', color: 'emerald' },
  { type: 'memberResources', label: 'Member Resources', desc: 'Bulleted resource list', icon: 'R', color: 'green' },
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

const DraggableSectionItem = ({ item }) => {
  const colorClass = COLOR_MAP[item.color] || COLOR_MAP.blue;

  const handleDragStart = (e) => {
    e.dataTransfer.setData('application/x-section-type', item.type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-slate-700/50 bg-slate-800/50 cursor-grab active:cursor-grabbing hover:bg-slate-700/50 hover:border-slate-600 transition-all group"
    >
      <GripVertical className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${colorClass}`}>
        {item.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-300 font-medium leading-tight">{item.label}</p>
        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{item.desc}</p>
      </div>
    </div>
  );
};

const SectionCatalog = ({
  templateType,
  onTemplateSwitch,
  savedTemplates,
  onLoadTemplate,
  onDeleteTemplate,
  onSaveTemplate,
  // Brand settings props
  logo, setLogo, logoUrl, setLogoUrl, logoHeight, setLogoHeight,
  themeColors, setThemeColors, onSaveDefaults, onClearDefaults,
}) => {
  const [showBrand, setShowBrand] = useState(true);
  const [showExamples, setShowExamples] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  const sections = templateType === 'newsletter'
    ? [...NEWSLETTER_SECTIONS, ...SHARED_SECTIONS]
    : SHARED_SECTIONS;

  return (
    <div className="h-full flex flex-col bg-slate-900 border-r border-slate-700/50">
      {/* Template Type Toggle */}
      <div className="p-3 border-b border-slate-700/50">
        <div className="flex bg-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => onTemplateSwitch('email')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              templateType === 'email' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
          <button
            onClick={() => onTemplateSwitch('newsletter')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              templateType === 'newsletter' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            Newsletter
          </button>
        </div>
      </div>

      {/* Sections Catalog */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
            Drag sections to canvas
          </p>
          {templateType === 'newsletter' && (
            <>
              <p className="text-[10px] font-semibold text-amber-500/70 uppercase tracking-wider mb-1.5 mt-3 px-1">Newsletter</p>
              <div className="space-y-1.5 mb-3">
                {NEWSLETTER_SECTIONS.map(item => (
                  <DraggableSectionItem key={item.type} item={item} />
                ))}
              </div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 px-1">General</p>
            </>
          )}
          <div className="space-y-1.5">
            {(templateType === 'newsletter' ? SHARED_SECTIONS : sections).map(item => (
              <DraggableSectionItem key={item.type} item={item} />
            ))}
          </div>
        </div>
      </div>

      {/* Brand Settings */}
      <div className="border-t border-slate-700/50">
        <button
          onClick={() => setShowBrand(!showBrand)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" />
            Brand & Colors
          </span>
          {showBrand ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        {showBrand && (
          <div className="px-2 pb-2">
            <BrandSettings
              logo={logo} setLogo={setLogo}
              logoUrl={logoUrl} setLogoUrl={setLogoUrl}
              logoHeight={logoHeight} setLogoHeight={setLogoHeight}
              themeColors={themeColors} setThemeColors={setThemeColors}
              onSaveDefaults={onSaveDefaults} onClearDefaults={onClearDefaults}
            />
          </div>
        )}
      </div>

      {/* Templates */}
      <div className="border-t border-slate-700/50">
        {/* Example Templates */}
        <button
          onClick={() => setShowExamples(!showExamples)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-amber-500/80 uppercase tracking-wider hover:text-amber-400 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            Examples
          </span>
          {showExamples ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        {showExamples && (
          <div className="px-3 pb-2 space-y-1.5">
            {EXAMPLE_TEMPLATES.map(t => (
              <div key={t.id} className="flex items-center gap-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 truncate">{t.name}</p>
                </div>
                <button
                  onClick={() => onLoadTemplate(t)}
                  className="px-2 py-1 bg-amber-500/20 text-amber-500 rounded text-[10px] font-medium hover:bg-amber-500 hover:text-slate-900 transition-colors"
                >
                  Load
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Saved Templates */}
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white transition-colors border-t border-slate-700/50"
        >
          <span className="flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5" />
            My Templates
            {savedTemplates.length > 0 && (
              <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full font-medium normal-case">
                {savedTemplates.length}
              </span>
            )}
          </span>
          {showTemplates ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        {showTemplates && (
          <div className="px-3 pb-2 space-y-1.5">
            {showSaveInput ? (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTemplateName.trim()) {
                      onSaveTemplate(newTemplateName);
                      setNewTemplateName('');
                      setShowSaveInput(false);
                    }
                  }}
                  placeholder="Template name..."
                  autoFocus
                  className="flex-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={() => { onSaveTemplate(newTemplateName); setNewTemplateName(''); setShowSaveInput(false); }}
                  className="px-2 py-1.5 bg-amber-500 text-slate-900 rounded text-xs font-medium hover:bg-amber-400"
                >
                  Save
                </button>
                <button
                  onClick={() => { setShowSaveInput(false); setNewTemplateName(''); }}
                  className="px-1.5 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveInput(true)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 border border-dashed border-slate-600 rounded text-xs text-slate-400 hover:text-amber-500 hover:border-amber-500/50 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Save Current
              </button>
            )}
            {savedTemplates.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-1">No saved templates</p>
            ) : (
              savedTemplates.map(t => (
                <div key={t.id} className="flex items-center gap-1.5 group">
                  <FileText className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 truncate">{t.name}</p>
                  </div>
                  <button
                    onClick={() => onLoadTemplate(t)}
                    className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-[10px] font-medium hover:bg-amber-500 hover:text-slate-900 transition-colors"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => onDeleteTemplate(t.id)}
                    className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SectionCatalog;
