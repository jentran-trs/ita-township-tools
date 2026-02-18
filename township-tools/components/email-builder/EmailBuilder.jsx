import React, { useState, useCallback, useEffect } from 'react';
import { Mail, Newspaper, Eye, Copy, Check, RotateCw, ChevronDown, ChevronRight, X, Save, Trash2, FolderOpen, Plus, FileText } from 'lucide-react';
import BrandSettings from './BrandSettings';
import SectionList from './SectionList';
import SectionMenu from './SectionMenu';
import PreviewPanel from './PreviewPanel';
import { generateEmailHtml } from './templates/emailTemplate';
import { generateNewsletterHtml } from './templates/newsletterTemplate';

// Section editor imports
import HeaderSection from './sections/HeaderSection';
import ContentBodySection from './sections/ContentBodySection';
import HighlightedSection from './sections/HighlightedSection';
import ImportantNoticeSection from './sections/ImportantNoticeSection';
import CtaButtonSection from './sections/CtaButtonSection';
import ResourceLinksSection from './sections/ResourceLinksSection';
import SignatureSection from './sections/SignatureSection';
import FooterSection from './sections/FooterSection';
import NewsletterTitleSection from './sections/NewsletterTitleSection';
import FeaturedArticleSection from './sections/FeaturedArticleSection';
import EventListingSection from './sections/EventListingSection';
import NewsSectionSection from './sections/NewsSectionSection';
import HighlightBannerSection from './sections/HighlightBannerSection';
import MemberResourcesSection from './sections/MemberResourcesSection';
import MeetingDetailsSection from './sections/MeetingDetailsSection';
import ImageSection from './sections/ImageSection';

const generateId = () => Math.random().toString(36).substr(2, 9);

const SECTION_EDITORS = {
  header: HeaderSection,
  contentBody: ContentBodySection,
  highlighted: HighlightedSection,
  importantNotice: ImportantNoticeSection,
  ctaButton: CtaButtonSection,
  resourceLinks: ResourceLinksSection,
  meetingDetails: MeetingDetailsSection,
  signature: SignatureSection,
  footer: FooterSection,
  newsletterTitle: NewsletterTitleSection,
  featuredArticle: FeaturedArticleSection,
  eventListing: EventListingSection,
  newsSection: NewsSectionSection,
  highlightBanner: HighlightBannerSection,
  memberResources: MemberResourcesSection,
  image: ImageSection,
};

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
  const [themeColors, setThemeColors] = useState(DEFAULT_EMAIL_COLORS);
  const [sections, setSections] = useState(() => createDefaultSections('email'));
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showTopBarSave, setShowTopBarSave] = useState(false);
  const [topBarTemplateName, setTopBarTemplateName] = useState('');
  const [templateSavedFeedback, setTemplateSavedFeedback] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState(null);

  const handleSelectSection = useCallback((id) => {
    setActiveSectionId(id);
    // Scroll to the section editor in the main panel
    setTimeout(() => {
      const el = document.getElementById(`section-${id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }, []);

  // Load saved draft or defaults on mount
  useEffect(() => {
    try {
      // Always load saved templates library
      const templates = localStorage.getItem(`${LS_PREFIX}templates`);
      if (templates) setSavedTemplates(JSON.parse(templates));

      const draft = localStorage.getItem(`${LS_PREFIX}draft`);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.templateType) setTemplateType(parsed.templateType);
        if (parsed.logo) setLogo(parsed.logo);
        if (parsed.logoUrl) setLogoUrl(parsed.logoUrl);
        if (parsed.themeColors) setThemeColors(parsed.themeColors);
        if (parsed.sections) setSections(parsed.sections);
        setHasDraft(true);
        return;
      }

      const savedLogoUrl = localStorage.getItem(`${LS_PREFIX}logoUrl`);
      if (savedLogoUrl) setLogoUrl(savedLogoUrl);
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
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  const handleSaveDefaults = useCallback(() => {
    try {
      if (logo) localStorage.setItem(`${LS_PREFIX}logo`, logo);
      if (logoUrl) localStorage.setItem(`${LS_PREFIX}logoUrl`, logoUrl);
      localStorage.setItem(`${LS_PREFIX}colors`, JSON.stringify(themeColors));
      const sig = sections.find(s => s.type === 'signature');
      const foot = sections.find(s => s.type === 'footer');
      const head = sections.find(s => s.type === 'header' || s.type === 'newsletterTitle');
      if (sig) localStorage.setItem(`${LS_PREFIX}signature`, JSON.stringify(sig.data));
      if (foot) localStorage.setItem(`${LS_PREFIX}footer`, JSON.stringify(foot.data));
      if (head) localStorage.setItem(`${LS_PREFIX}header`, JSON.stringify(head.data));
    } catch (e) {
      // Ignore
    }
  }, [logo, logoUrl, themeColors, sections]);

  const handleClearDefaults = useCallback(() => {
    try {
      Object.keys(localStorage).filter(k => k.startsWith(LS_PREFIX)).forEach(k => localStorage.removeItem(k));
    } catch (e) {
      // Ignore
    }
  }, []);

  const handleSaveDraft = useCallback(() => {
    try {
      const draft = { templateType, logo, logoUrl, themeColors, sections };
      localStorage.setItem(`${LS_PREFIX}draft`, JSON.stringify(draft));
      setHasDraft(true);
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2000);
    } catch (e) {
      // Ignore
    }
  }, [templateType, logo, logoUrl, themeColors, sections]);

  const handleClearDraft = useCallback(() => {
    try {
      localStorage.removeItem(`${LS_PREFIX}draft`);
      setHasDraft(false);
    } catch (e) {
      // Ignore
    }
  }, []);

  const handleSaveTemplate = useCallback((name) => {
    if (!name.trim()) return;
    try {
      const newId = generateId();
      const template = {
        id: newId,
        name: name.trim(),
        templateType,
        logo,
        logoUrl,
        themeColors,
        sections,
        savedAt: new Date().toLocaleDateString(),
      };
      const updated = [...savedTemplates, template];
      localStorage.setItem(`${LS_PREFIX}templates`, JSON.stringify(updated));
      setSavedTemplates(updated);
      setNewTemplateName('');
      setShowSaveInput(false);
      setActiveTemplateId(newId);
    } catch (e) {
      // Ignore
    }
  }, [templateType, logo, logoUrl, themeColors, sections, savedTemplates]);

  const handleLoadTemplate = useCallback((template) => {
    setTemplateType(template.templateType || 'email');
    setLogo(template.logo || null);
    setLogoUrl(template.logoUrl || '');
    setThemeColors(template.themeColors || DEFAULT_EMAIL_COLORS);
    setSections(template.sections || createDefaultSections(template.templateType || 'email'));
    setGeneratedHtml('');
    setShowPreview(false);
    setHasGenerated(false);
    setActiveSectionId(null);
    setActiveTemplateId(template.id);
  }, []);

  const handleUpdateTemplate = useCallback(() => {
    if (!activeTemplateId) return;
    try {
      const updated = savedTemplates.map(t =>
        t.id === activeTemplateId
          ? { ...t, templateType, logo, logoUrl, themeColors, sections, savedAt: new Date().toLocaleDateString() }
          : t
      );
      localStorage.setItem(`${LS_PREFIX}templates`, JSON.stringify(updated));
      setSavedTemplates(updated);
      setTemplateSavedFeedback(true);
      setTimeout(() => setTemplateSavedFeedback(false), 2000);
    } catch (e) {
      // Ignore
    }
  }, [activeTemplateId, savedTemplates, templateType, logo, logoUrl, themeColors, sections]);

  const handleDeleteTemplate = useCallback((id) => {
    try {
      const updated = savedTemplates.filter(t => t.id !== id);
      localStorage.setItem(`${LS_PREFIX}templates`, JSON.stringify(updated));
      setSavedTemplates(updated);
      if (activeTemplateId === id) setActiveTemplateId(null);
    } catch (e) {
      // Ignore
    }
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

  const addSection = useCallback((type) => {
    const newSection = { id: generateId(), type, data: {}, locked: false };
    setSections(prev => {
      // Insert before the last section (footer)
      const copy = [...prev];
      copy.splice(copy.length - 1, 0, newSection);
      return copy;
    });
    setActiveSectionId(newSection.id);
  }, []);

  const deleteSection = useCallback((id) => {
    setSections(prev => prev.filter(s => s.id !== id));
    setActiveSectionId(null);
  }, []);

  const moveSection = useCallback((fromIndex, toIndex) => {
    setSections(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  }, []);

  const handleGenerate = useCallback(() => {
    // Use logoUrl for the generated HTML (email-client safe), fall back to base64 for preview only
    const emailLogo = logoUrl || logo;
    const html = templateType === 'newsletter'
      ? generateNewsletterHtml(sections, themeColors, emailLogo)
      : generateEmailHtml(sections, themeColors, emailLogo);
    setGeneratedHtml(html);
    setShowPreview(true);
    setHasGenerated(true);
  }, [templateType, sections, themeColors, logo, logoUrl]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(generatedHtml);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
  }, [generatedHtml]);

  const headerSection = sections.find(s => s.type === 'header' || s.type === 'newsletterTitle');
  const footerSection = sections.find(s => s.type === 'footer');
  const bodySections = sections.filter(s => s.type !== 'header' && s.type !== 'newsletterTitle' && s.type !== 'footer');
  const HeaderEditor = headerSection ? SECTION_EDITORS[headerSection.type] : null;
  const FooterEditor = footerSection ? SECTION_EDITORS[footerSection.type] : null;

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Left Sidebar - Section List */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col overflow-hidden">
        {/* Template Type Toggle */}
        <div className="p-3 border-b border-slate-700">
          <div className="flex bg-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => handleTemplateSwitch('email')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                templateType === 'email' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              onClick={() => handleTemplateSwitch('newsletter')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                templateType === 'newsletter' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Newspaper className="w-4 h-4" />
              Newsletter
            </button>
          </div>
        </div>

        {/* Saved Templates */}
        <div className="border-b border-slate-700">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" />
              My Templates
              {savedTemplates.length > 0 && (
                <span className="text-[10px] bg-slate-600 text-slate-300 px-1.5 py-0.5 rounded-full font-medium normal-case">
                  {savedTemplates.length}
                </span>
              )}
            </span>
            {showTemplates ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {showTemplates && (
            <div className="px-3 pb-3 space-y-2">
              {/* Save current template */}
              {showSaveInput ? (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate(newTemplateName)}
                    placeholder="Template name..."
                    autoFocus
                    className="flex-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => handleSaveTemplate(newTemplateName)}
                    className="px-2 py-1.5 bg-amber-500 text-slate-900 rounded text-xs font-medium hover:bg-amber-400 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setShowSaveInput(false); setNewTemplateName(''); }}
                    className="px-1.5 py-1.5 text-slate-500 hover:text-white transition-colors"
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
                  Save Current as Template
                </button>
              )}

              {/* Template list */}
              {savedTemplates.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-2">No saved templates yet</p>
              ) : (
                savedTemplates.map(t => (
                  <div key={t.id} className="flex items-center gap-1.5 group">
                    <FileText className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 truncate">{t.name}</p>
                      <p className="text-[10px] text-slate-600">{t.templateType} &middot; {t.savedAt}</p>
                    </div>
                    <button
                      onClick={() => handleLoadTemplate(t)}
                      className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-[10px] font-medium hover:bg-amber-500 hover:text-slate-900 transition-colors"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(t.id)}
                      className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete template"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto">
          <SectionList
            sections={sections}
            activeSectionId={activeSectionId}
            onSelect={handleSelectSection}
            onMove={moveSection}
            onDelete={deleteSection}
          />
        </div>

        {/* Add Section */}
        <div className="p-3 border-t border-slate-700">
          <SectionMenu templateType={templateType} onAdd={addSection} />
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-800 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">
            {templateType === 'newsletter' ? 'Newsletter' : 'Email'} Template Builder
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-500 transition-colors text-sm"
            >
              {savedFeedback ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {savedFeedback ? 'Saved!' : 'Save Draft'}
            </button>
            {activeTemplateId && (
              <button
                onClick={handleUpdateTemplate}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                  templateSavedFeedback
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-600 text-white hover:bg-amber-500'
                }`}
              >
                {templateSavedFeedback ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {templateSavedFeedback ? 'Saved!' : `Save "${(savedTemplates.find(t => t.id === activeTemplateId)?.name || 'Template').slice(0, 20)}"`}
              </button>
            )}
            {showTopBarSave ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={topBarTemplateName}
                  onChange={(e) => setTopBarTemplateName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && topBarTemplateName.trim()) {
                      handleSaveTemplate(topBarTemplateName);
                      setTopBarTemplateName('');
                      setShowTopBarSave(false);
                    }
                    if (e.key === 'Escape') { setShowTopBarSave(false); setTopBarTemplateName(''); }
                  }}
                  placeholder="Template name..."
                  autoFocus
                  className="px-3 py-2 bg-slate-700 border border-slate-500 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500 w-44"
                />
                <button
                  onClick={() => {
                    if (topBarTemplateName.trim()) {
                      handleSaveTemplate(topBarTemplateName);
                      setTopBarTemplateName('');
                      setShowTopBarSave(false);
                    }
                  }}
                  className="px-3 py-2 bg-amber-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-amber-400 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => { setShowTopBarSave(false); setTopBarTemplateName(''); }}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTopBarSave(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-500 transition-colors text-sm"
              >
                <FolderOpen className="w-4 h-4" />
                {activeTemplateId ? 'Save as New Template' : 'Save as Template'}
              </button>
            )}
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-400 transition-colors text-sm"
            >
              {hasGenerated ? <RotateCw className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {hasGenerated ? 'Regenerate Preview' : 'Preview'}
            </button>
            {generatedHtml && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors text-sm"
              >
                {copiedFeedback ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedFeedback ? 'Copied!' : 'Copy Template HTML'}
              </button>
            )}
          </div>
        </div>

        {/* Content Area - Split between editor and preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor Panel */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Brand Settings */}
            <BrandSettings
              logo={logo}
              setLogo={setLogo}
              logoUrl={logoUrl}
              setLogoUrl={setLogoUrl}
              themeColors={themeColors}
              setThemeColors={setThemeColors}
              onSaveDefaults={handleSaveDefaults}
              onClearDefaults={handleClearDefaults}
            />

            {/* Header - always visible */}
            {HeaderEditor && headerSection && (
              <div className="mt-6 mb-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <HeaderEditor
                  data={headerSection.data}
                  onChange={(data) => updateSection(headerSection.id, data)}
                  themeColors={themeColors}
                />
              </div>
            )}

            {/* Body Sections - all visible */}
            {bodySections.length > 0 ? (
              bodySections.map((section, idx) => {
                const Editor = SECTION_EDITORS[section.type];
                if (!Editor) return null;
                return (
                  <div
                    key={section.id}
                    id={`section-${section.id}`}
                    className={`${idx === 0 ? 'mt-8' : 'mt-4'} bg-slate-800/50 border rounded-xl p-4 ${
                      activeSectionId === section.id ? 'border-amber-500/50' : 'border-slate-700'
                    }`}
                    onClick={() => setActiveSectionId(section.id)}
                  >
                    <Editor
                      data={section.data}
                      onChange={(data) => updateSection(section.id, data)}
                      themeColors={themeColors}
                    />
                  </div>
                );
              })
            ) : (
              <div className="mt-8 text-center py-8 text-slate-500">
                <p className="text-sm">Add sections using the button in the sidebar</p>
              </div>
            )}

            {/* Footer - always visible */}
            {FooterEditor && footerSection && (
              <div className="mt-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <FooterEditor
                  data={footerSection.data}
                  onChange={(data) => updateSection(footerSection.id, data)}
                  themeColors={themeColors}
                  onSaveDefault={() => {
                    try {
                      localStorage.setItem(`${LS_PREFIX}footer`, JSON.stringify(footerSection.data));
                    } catch (e) {}
                  }}
                />
              </div>
            )}
          </div>

          {/* Preview Panel */}
          {showPreview && generatedHtml && (
            <div className="w-[45%] border-l border-slate-700">
              <PreviewPanel html={generatedHtml} onClose={() => setShowPreview(false)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailBuilder;
