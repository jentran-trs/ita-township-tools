import React, { useState, useCallback, useEffect } from 'react';
import { Eye, Copy, Check, RotateCw, X, Save, Plus, HelpCircle } from 'lucide-react';
import SectionCatalog from './SectionCatalog';
import BuilderCanvas from './BuilderCanvas';
import PreviewPanel from './PreviewPanel';
import { generateEmailHtml } from './templates/emailTemplate';
import { generateNewsletterHtml } from './templates/newsletterTemplate';
import OnboardingGuide from './OnboardingGuide';

const generateId = () => Math.random().toString(36).substr(2, 9);

const DEFAULT_EMAIL_COLORS = {
  primary: '#2e5f7f',
  primaryDark: '#1a4a63',
  accent: '#8B0000',
  gold: '#f0ad4e',
};

const createDefaultSections = (type) => {
  if (type === 'newsletter') {
    return [
      { id: generateId(), type: 'newsletterTitle', data: { name: '', volume: '', issue: '', date: '' }, locked: true },
      { id: generateId(), type: 'footer', data: { orgName: '', website: '', tagline: '' }, locked: true },
    ];
  }
  return [
    { id: generateId(), type: 'header', data: { title: '', subtitle: '' }, locked: true },
    { id: generateId(), type: 'footer', data: { orgName: '', website: '', tagline: '' }, locked: true },
  ];
};

const LS_PREFIX = 'email-builder-';

const EmailBuilder = () => {
  const [templateType, setTemplateType] = useState('email');
  const [logo, setLogo] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoHeight, setLogoHeight] = useState(90);
  const [themeColors, setThemeColors] = useState(DEFAULT_EMAIL_COLORS);
  const [sections, setSections] = useState(() => createDefaultSections('email'));
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [activeTemplateId, setActiveTemplateId] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [templateSavedFeedback, setTemplateSavedFeedback] = useState(false);
  const [showTopBarSave, setShowTopBarSave] = useState(false);
  const [topBarTemplateName, setTopBarTemplateName] = useState('');

  // Load saved draft or defaults on mount
  useEffect(() => {
    try {
      if (!localStorage.getItem(`${LS_PREFIX}onboarding-complete`)) {
        setShowOnboarding(true);
      }
      const templates = localStorage.getItem(`${LS_PREFIX}templates`);
      if (templates) setSavedTemplates(JSON.parse(templates));

      const draft = localStorage.getItem(`${LS_PREFIX}draft`);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.templateType) setTemplateType(parsed.templateType);
        if (parsed.logo) setLogo(parsed.logo);
        if (parsed.logoUrl) setLogoUrl(parsed.logoUrl);
        if (parsed.logoHeight) setLogoHeight(parsed.logoHeight);
        if (parsed.themeColors) setThemeColors(parsed.themeColors);
        if (parsed.sections) setSections(parsed.sections);
        return;
      }

      const savedLogoUrl = localStorage.getItem(`${LS_PREFIX}logoUrl`);
      if (savedLogoUrl) setLogoUrl(savedLogoUrl);
      const savedLogoHeight = localStorage.getItem(`${LS_PREFIX}logoHeight`);
      if (savedLogoHeight) setLogoHeight(parseInt(savedLogoHeight));
      const savedLogo = localStorage.getItem(`${LS_PREFIX}logo`);
      const savedColors = localStorage.getItem(`${LS_PREFIX}colors`);
      const savedSignature = localStorage.getItem(`${LS_PREFIX}signature`);
      const savedFooter = localStorage.getItem(`${LS_PREFIX}footer`);
      const savedHeader = localStorage.getItem(`${LS_PREFIX}header`);

      if (savedLogo) setLogo(savedLogo);
      if (savedColors) setThemeColors(JSON.parse(savedColors));
      if (savedSignature || savedFooter || savedHeader) {
        setSections(prev => prev.map(s => {
          if (s.type === 'signature' && savedSignature) return { ...s, data: JSON.parse(savedSignature) };
          if (s.type === 'footer' && savedFooter) return { ...s, data: JSON.parse(savedFooter) };
          if (s.type === 'header' && savedHeader) return { ...s, data: JSON.parse(savedHeader) };
          return s;
        }));
      }
    } catch (e) {}
  }, []);

  const handleSaveDefaults = useCallback(() => {
    try {
      if (logo) localStorage.setItem(`${LS_PREFIX}logo`, logo);
      if (logoUrl) localStorage.setItem(`${LS_PREFIX}logoUrl`, logoUrl);
      localStorage.setItem(`${LS_PREFIX}logoHeight`, String(logoHeight));
      localStorage.setItem(`${LS_PREFIX}colors`, JSON.stringify(themeColors));
      const sig = sections.find(s => s.type === 'signature');
      const foot = sections.find(s => s.type === 'footer');
      const head = sections.find(s => s.type === 'header' || s.type === 'newsletterTitle');
      if (sig) localStorage.setItem(`${LS_PREFIX}signature`, JSON.stringify(sig.data));
      if (foot) localStorage.setItem(`${LS_PREFIX}footer`, JSON.stringify(foot.data));
      if (head) localStorage.setItem(`${LS_PREFIX}header`, JSON.stringify(head.data));
    } catch (e) {}
  }, [logo, logoUrl, logoHeight, themeColors, sections]);

  const handleClearDefaults = useCallback(() => {
    try {
      Object.keys(localStorage).filter(k => k.startsWith(LS_PREFIX)).forEach(k => localStorage.removeItem(k));
    } catch (e) {}
  }, []);

  const handleSaveDraft = useCallback(() => {
    try {
      const draft = { templateType, logo, logoUrl, logoHeight, themeColors, sections };
      localStorage.setItem(`${LS_PREFIX}draft`, JSON.stringify(draft));
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2000);
    } catch (e) {}
  }, [templateType, logo, logoUrl, logoHeight, themeColors, sections]);

  const handleNew = useCallback(() => {
    setTemplateType('email');
    setLogo(null);
    setLogoUrl('');
    setLogoHeight(90);
    setThemeColors(DEFAULT_EMAIL_COLORS);
    setSections(createDefaultSections('email'));
    setGeneratedHtml('');
    setShowPreview(false);
    setHasGenerated(false);
    setActiveSectionId(null);
    setActiveTemplateId(null);
    try {
      const savedLogo = localStorage.getItem(`${LS_PREFIX}logo`);
      const savedLogoUrl = localStorage.getItem(`${LS_PREFIX}logoUrl`);
      const savedLogoHeight = localStorage.getItem(`${LS_PREFIX}logoHeight`);
      const savedColors = localStorage.getItem(`${LS_PREFIX}colors`);
      if (savedLogo) setLogo(savedLogo);
      if (savedLogoUrl) setLogoUrl(savedLogoUrl);
      if (savedLogoHeight) setLogoHeight(parseInt(savedLogoHeight));
      if (savedColors) setThemeColors(JSON.parse(savedColors));
    } catch (e) {}
  }, []);

  const handleSaveTemplate = useCallback((name) => {
    if (!name.trim()) return;
    try {
      const newId = generateId();
      const template = {
        id: newId, name: name.trim(), templateType, logo, logoUrl, logoHeight,
        themeColors, sections, savedAt: new Date().toLocaleDateString(),
      };
      const updated = [...savedTemplates, template];
      localStorage.setItem(`${LS_PREFIX}templates`, JSON.stringify(updated));
      setSavedTemplates(updated);
      setActiveTemplateId(newId);
    } catch (e) {}
  }, [templateType, logo, logoUrl, logoHeight, themeColors, sections, savedTemplates]);

  const handleLoadTemplate = useCallback((template) => {
    setTemplateType(template.templateType || 'email');
    setLogo(template.logo || null);
    setLogoUrl(template.logoUrl || '');
    setLogoHeight(template.logoHeight || 90);
    setThemeColors(template.themeColors ? { ...template.themeColors } : DEFAULT_EMAIL_COLORS);
    const clonedSections = (template.sections || createDefaultSections(template.templateType || 'email'))
      .map(s => ({ ...s, id: generateId(), data: JSON.parse(JSON.stringify(s.data)) }));
    setSections(clonedSections);
    setGeneratedHtml('');
    setShowPreview(false);
    setHasGenerated(false);
    setActiveSectionId(null);
    setActiveTemplateId(template.builtIn ? null : template.id);
  }, []);

  const handleUpdateTemplate = useCallback(() => {
    if (!activeTemplateId) return;
    try {
      const updated = savedTemplates.map(t =>
        t.id === activeTemplateId
          ? { ...t, templateType, logo, logoUrl, logoHeight, themeColors, sections, savedAt: new Date().toLocaleDateString() }
          : t
      );
      localStorage.setItem(`${LS_PREFIX}templates`, JSON.stringify(updated));
      setSavedTemplates(updated);
      setTemplateSavedFeedback(true);
      setTimeout(() => setTemplateSavedFeedback(false), 2000);
    } catch (e) {}
  }, [activeTemplateId, savedTemplates, templateType, logo, logoUrl, logoHeight, themeColors, sections]);

  const handleDeleteTemplate = useCallback((id) => {
    try {
      const updated = savedTemplates.filter(t => t.id !== id);
      localStorage.setItem(`${LS_PREFIX}templates`, JSON.stringify(updated));
      setSavedTemplates(updated);
      if (activeTemplateId === id) setActiveTemplateId(null);
    } catch (e) {}
  }, [savedTemplates, activeTemplateId]);

  const handleTemplateSwitch = useCallback((type) => {
    setTemplateType(type);
    setSections(createDefaultSections(type));
    setGeneratedHtml('');
    setShowPreview(false);
    setHasGenerated(false);
    setActiveSectionId(null);
    setActiveTemplateId(null);
  }, []);

  const updateSection = useCallback((id, data) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, data: { ...s.data, ...data } } : s));
  }, []);

  const addSectionAtIndex = useCallback((type, index) => {
    const newSection = { id: generateId(), type, data: {}, locked: false };
    setSections(prev => {
      const copy = [...prev];
      let insertAt = index;
      if (insertAt <= 0) insertAt = 1;
      if (insertAt >= copy.length) insertAt = copy.length - 1;
      copy.splice(insertAt, 0, newSection);
      return copy;
    });
    setActiveSectionId(newSection.id);
  }, []);

  const deleteSection = useCallback((id) => {
    setSections(prev => prev.filter(s => s.id !== id));
    if (activeSectionId === id) setActiveSectionId(null);
  }, [activeSectionId]);

  const moveSection = useCallback((fromIndex, toIndex) => {
    setSections(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  }, []);

  const handleGenerate = useCallback(() => {
    const emailLogo = logoUrl || logo;
    const html = templateType === 'newsletter'
      ? generateNewsletterHtml(sections, themeColors, emailLogo, logoHeight)
      : generateEmailHtml(sections, themeColors, emailLogo, logoHeight);
    setGeneratedHtml(html);
    setShowPreview(true);
    setHasGenerated(true);
  }, [templateType, sections, themeColors, logo, logoUrl, logoHeight]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(generatedHtml);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
  }, [generatedHtml]);

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Left Panel - Section Catalog + Brand Settings */}
      <div className="w-72 flex-shrink-0">
        <SectionCatalog
          templateType={templateType}
          onTemplateSwitch={handleTemplateSwitch}
          savedTemplates={savedTemplates}
          onLoadTemplate={handleLoadTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          onSaveTemplate={handleSaveTemplate}
          logo={logo} setLogo={setLogo}
          logoUrl={logoUrl} setLogoUrl={setLogoUrl}
          logoHeight={logoHeight} setLogoHeight={setLogoHeight}
          themeColors={themeColors} setThemeColors={setThemeColors}
          onSaveDefaults={handleSaveDefaults}
          onClearDefaults={handleClearDefaults}
        />
      </div>

      {/* Center - Canvas + Top Bar */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700/50 flex-shrink-0">
          <h2 className="text-sm font-bold text-white">
            {templateType === 'newsletter' ? 'Newsletter' : 'Email'} Builder
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={handleNew}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-600 hover:text-white transition-colors text-xs">
              <Plus className="w-3.5 h-3.5" /> New
            </button>
            <button onClick={handleSaveDraft}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-500 transition-colors text-xs">
              {savedFeedback ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {savedFeedback ? 'Saved!' : 'Draft'}
            </button>
            {activeTemplateId && (
              <button onClick={handleUpdateTemplate}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors text-xs ${
                  templateSavedFeedback ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white hover:bg-amber-500'
                }`}>
                {templateSavedFeedback ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {templateSavedFeedback ? 'Saved!' : 'Update'}
              </button>
            )}
            {showTopBarSave ? (
              <div className="flex items-center gap-1">
                <input type="text" value={topBarTemplateName}
                  onChange={(e) => setTopBarTemplateName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && topBarTemplateName.trim()) {
                      handleSaveTemplate(topBarTemplateName); setTopBarTemplateName(''); setShowTopBarSave(false);
                    }
                    if (e.key === 'Escape') { setShowTopBarSave(false); setTopBarTemplateName(''); }
                  }}
                  placeholder="Template name..." autoFocus
                  className="px-2 py-1.5 bg-slate-700 border border-slate-500 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500 w-32" />
                <button onClick={() => {
                    if (topBarTemplateName.trim()) { handleSaveTemplate(topBarTemplateName); setTopBarTemplateName(''); setShowTopBarSave(false); }
                  }}
                  className="px-2 py-1.5 bg-amber-500 text-slate-900 rounded-lg text-xs font-medium hover:bg-amber-400">Save</button>
                <button onClick={() => { setShowTopBarSave(false); setTopBarTemplateName(''); }}
                  className="p-1.5 text-slate-400 hover:text-white"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <button onClick={() => setShowTopBarSave(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-500 transition-colors text-xs">
                <Save className="w-3.5 h-3.5" /> {activeTemplateId ? 'Save As' : 'Save'}
              </button>
            )}
            <div className="w-px h-5 bg-slate-700" />
            <button onClick={handleGenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-400 transition-colors text-xs">
              {hasGenerated ? <RotateCw className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {hasGenerated ? 'Regenerate' : 'Preview HTML'}
            </button>
            {generatedHtml && (
              <button onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors text-xs">
                {copiedFeedback ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedFeedback ? 'Copied!' : 'Copy HTML'}
              </button>
            )}
            <button onClick={() => setShowOnboarding(true)}
              className="p-1.5 text-slate-400 hover:text-amber-400 transition-colors" title="Guided tour">
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas or HTML Preview */}
        <div className="flex-1 overflow-hidden">
          {showPreview && generatedHtml ? (
            <PreviewPanel html={generatedHtml} onClose={() => setShowPreview(false)} />
          ) : (
            <BuilderCanvas
              sections={sections}
              activeSectionId={activeSectionId}
              onSelectSection={setActiveSectionId}
              onMoveSection={moveSection}
              onDeleteSection={deleteSection}
              onAddSection={addSectionAtIndex}
              onUpdateSection={updateSection}
              themeColors={themeColors}
              logo={logoUrl || logo}
              logoHeight={logoHeight}
            />
          )}
        </div>
      </div>

      {/* Onboarding Guide */}
      {showOnboarding && (
        <OnboardingGuide
          onComplete={() => {
            setShowOnboarding(false);
            try { localStorage.setItem(`${LS_PREFIX}onboarding-complete`, 'true'); } catch (e) {}
          }}
        />
      )}
    </div>
  );
};

export default EmailBuilder;
