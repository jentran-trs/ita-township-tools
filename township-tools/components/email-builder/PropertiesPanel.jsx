import React from 'react';
import { X, ChevronLeft } from 'lucide-react';
import BrandSettings from './BrandSettings';

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
import AlertBoxSection from './sections/AlertBoxSection';
import TwoColumnSection from './sections/TwoColumnSection';
import ListSection from './sections/ListSection';
import GreetingSection from './sections/GreetingSection';
import ClosingSection from './sections/ClosingSection';

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
  alertBox: AlertBoxSection,
  twoColumn: TwoColumnSection,
  list: ListSection,
  greeting: GreetingSection,
  closing: ClosingSection,
};

const SECTION_LABELS = {
  header: 'Header', contentBody: 'Content Body', image: 'Image', highlighted: 'Highlighted',
  importantNotice: 'Important Notice', ctaButton: 'CTA Button', meetingDetails: 'Meeting Details',
  resourceLinks: 'Resource Links', signature: 'Signature', footer: 'Footer',
  newsletterTitle: 'Newsletter Title', featuredArticle: 'Featured Article',
  eventListing: 'Event Listing', newsSection: 'News Section', highlightBanner: 'Highlight Banner',
  memberResources: 'Member Resources', alertBox: 'Alert Box', twoColumn: 'Two Column',
  list: 'List', greeting: 'Greeting', closing: 'Closing',
};

const PropertiesPanel = ({
  activeSection,
  onUpdateSection,
  onDeselectSection,
  logo,
  setLogo,
  logoUrl,
  setLogoUrl,
  logoHeight,
  setLogoHeight,
  themeColors,
  setThemeColors,
  onSaveDefaults,
  onClearDefaults,
  onSaveFooterDefault,
}) => {
  const Editor = activeSection ? SECTION_EDITORS[activeSection.type] : null;

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-700/50">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-semibold text-white">
          {activeSection ? SECTION_LABELS[activeSection.type] || 'Properties' : 'Properties'}
        </h3>
        {activeSection && (
          <button
            onClick={onDeselectSection}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Brand Settings - always visible */}
        <BrandSettings
          logo={logo}
          setLogo={setLogo}
          logoUrl={logoUrl}
          setLogoUrl={setLogoUrl}
          logoHeight={logoHeight}
          setLogoHeight={setLogoHeight}
          themeColors={themeColors}
          setThemeColors={setThemeColors}
          onSaveDefaults={onSaveDefaults}
          onClearDefaults={onClearDefaults}
        />

        {/* Section editor */}
        {activeSection && Editor ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <Editor
              data={activeSection.data}
              onChange={(data) => onUpdateSection(activeSection.id, data)}
              themeColors={themeColors}
              onSaveDefault={activeSection.type === 'footer' ? onSaveFooterDefault : undefined}
            />
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center">
              <ChevronLeft className="w-5 h-5 text-slate-500" />
            </div>
            <p className="text-sm text-slate-500">Click a section on the canvas to edit its properties</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertiesPanel;
