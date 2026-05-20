import React, { useState } from 'react';
import { ChevronDown, ChevronRight, BookOpen, FolderOpen, FileText, Trash2, Plus, X, Palette } from 'lucide-react';
import EXAMPLE_TEMPLATES from './exampleTemplates';
import BrandSettings from './BrandSettings';

// Right-side settings panel: Brand & Colors, Examples, and My Templates.
// Split out of SectionCatalog so the left panel can be dedicated entirely to
// draggable email elements.
const SettingsPanel = ({
  savedTemplates,
  onLoadTemplate,
  onDeleteTemplate,
  onSaveTemplate,
  // Brand settings props
  logo, setLogo, logoUrl, setLogoUrl, logoPath, setLogoPath,
  logoHeight, setLogoHeight,
  themeColors, setThemeColors, onSaveDefaults, onClearDefaults,
}) => {
  const [showBrand, setShowBrand] = useState(true);
  const [showExamples, setShowExamples] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-700/50 overflow-y-auto">
      {/* Brand Settings */}
      <div className="border-b border-slate-700/50" data-tour="brand-settings">
        <button
          onClick={() => setShowBrand(!showBrand)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white transition-colors"
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
              logoPath={logoPath} setLogoPath={setLogoPath}
              logoHeight={logoHeight} setLogoHeight={setLogoHeight}
              themeColors={themeColors} setThemeColors={setThemeColors}
              onSaveDefaults={onSaveDefaults} onClearDefaults={onClearDefaults}
            />
          </div>
        )}
      </div>

      {/* Example Templates */}
      <div className="border-b border-slate-700/50" data-tour="examples">
        <button
          onClick={() => setShowExamples(!showExamples)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-amber-500/80 uppercase tracking-wider hover:text-amber-400 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            Example Templates
          </span>
          {showExamples ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        {showExamples && (
          <div className="px-3 pb-3 space-y-1.5">
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
      </div>

      {/* Saved Templates */}
      <div data-tour="templates">
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white transition-colors"
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
          <div className="px-3 pb-3 space-y-1.5">
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

export default SettingsPanel;
