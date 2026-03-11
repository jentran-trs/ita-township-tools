import React, { useState, useCallback, useRef } from 'react';
import { GripVertical, Trash2, Lock, Plus, Settings, X, ChevronDown } from 'lucide-react';
import { EditableText, EditableRichText, RichTextToolbar, ConfigInput, ConfigPanel } from './InlineEditable';

// ─── Section Labels ─────────────────────────────────────────────────────────
const SECTION_LABELS = {
  header: 'Header', contentBody: 'Content Body', image: 'Image', highlighted: 'Highlighted',
  importantNotice: 'Important Notice', ctaButton: 'CTA Button', meetingDetails: 'Meeting Details',
  resourceLinks: 'Resource Links', signature: 'Signature', footer: 'Footer',
  newsletterTitle: 'Newsletter Title', featuredArticle: 'Featured Article',
  eventListing: 'Event Listing', newsSection: 'News Section', highlightBanner: 'Highlight Banner',
  memberResources: 'Member Resources', alertBox: 'Alert Box', twoColumn: 'Two Column',
  list: 'List', greeting: 'Greeting', closing: 'Closing',
};

// ─── Sections that have config panels ───────────────────────────────────────
const SECTIONS_WITH_CONFIG = new Set([
  'image', 'ctaButton', 'meetingDetails', 'resourceLinks', 'list',
  'eventListing', 'featuredArticle', 'highlightBanner', 'memberResources', 'greeting',
]);

// ─── Inline Section Renderer ────────────────────────────────────────────────
const InlineSection = ({ section, isEditing, onChange, themeColors, logo, logoHeight, showRichToolbar, onRichFocus }) => {
  const { type, data } = section;
  const c = themeColors;
  const editing = isEditing;

  switch (type) {
    // ── Header ──────────────────────────────────────────────────────────
    case 'header':
      return (
        <div style={{ backgroundColor: c.primary }} className="px-10 py-8 text-center">
          {logo && (
            <div className="mb-3 flex justify-center">
              <img src={logo} alt="Logo" style={{ height: logoHeight || 90 }} className="object-contain" />
            </div>
          )}
          <EditableText
            tag="h1"
            value={data.title || ''}
            onChange={(v) => onChange({ title: v })}
            placeholder="Email Title"
            disabled={!editing}
            className="text-xl font-bold text-white m-0 focus:bg-white/10 rounded px-1"
          />
          <EditableText
            tag="p"
            value={data.subtitle || ''}
            onChange={(v) => onChange({ subtitle: v })}
            placeholder="Subtitle (optional)"
            disabled={!editing}
            className="text-sm mt-2 text-white/70 focus:bg-white/10 rounded px-1"
          />
        </div>
      );

    // ── Newsletter Title ────────────────────────────────────────────────
    case 'newsletterTitle':
      return (
        <div style={{ backgroundColor: c.primary }} className="px-10 py-8 text-center">
          {logo && (
            <div className="mb-3 flex justify-center">
              <img src={logo} alt="Logo" style={{ height: logoHeight || 90 }} className="object-contain" />
            </div>
          )}
          <EditableText
            tag="h1"
            value={data.name || ''}
            onChange={(v) => onChange({ name: v })}
            placeholder="Newsletter Name"
            disabled={!editing}
            className="text-xl font-bold text-white m-0 focus:bg-white/10 rounded px-1"
          />
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-white/60">
            <span>Vol.</span>
            <EditableText value={data.volume || ''} onChange={(v) => onChange({ volume: v })} placeholder="1" disabled={!editing}
              className="focus:bg-white/10 rounded px-1 text-white/60" />
            <span>·</span>
            <span>Issue</span>
            <EditableText value={data.issue || ''} onChange={(v) => onChange({ issue: v })} placeholder="1" disabled={!editing}
              className="focus:bg-white/10 rounded px-1 text-white/60" />
            <span>·</span>
            <EditableText value={data.date || ''} onChange={(v) => onChange({ date: v })} placeholder="Date" disabled={!editing}
              className="focus:bg-white/10 rounded px-1 text-white/60" />
          </div>
        </div>
      );

    // ── Greeting ────────────────────────────────────────────────────────
    case 'greeting': {
      const signOffs = data.signOffs || [];
      return (
        <div className="px-10 py-5 bg-white">
          <EditableText
            tag="p"
            value={data.greeting || data.text || ''}
            onChange={(v) => onChange({ greeting: v })}
            placeholder="Dear residents..."
            disabled={!editing}
            className="font-bold text-sm focus:bg-amber-50 rounded px-1"
            style={{ color: c.accent }}
          />
          {editing ? (
            <EditableRichText
              value={data.content || ''}
              onChange={(v) => onChange({ content: v })}
              placeholder="Write greeting body..."
              onFocus={onRichFocus}
              className="text-sm text-gray-600 mt-2 focus:bg-blue-50/50 rounded px-1"
            />
          ) : (
            data.content && <div className="text-sm text-gray-600 mt-2" dangerouslySetInnerHTML={{ __html: data.content }} />
          )}
          {data.signOffLine && (
            <p className="text-sm text-gray-800 mt-3">{data.signOffLine}</p>
          )}
          {signOffs.filter(s => s.name).map((s, i) => (
            <p key={i} className="text-sm"><strong className="text-gray-800">{s.name}</strong>{s.title && <span className="text-gray-500">, {s.title}</span>}</p>
          ))}
          {data.org && <p className="text-xs italic mt-1" style={{ color: c.primary }}>{data.org}</p>}
        </div>
      );
    }

    // ── Content Body ────────────────────────────────────────────────────
    case 'contentBody':
      return (
        <div className="px-10 py-5 bg-white">
          {editing ? (
            <EditableRichText
              value={data.content || ''}
              onChange={(v) => onChange({ content: v })}
              placeholder="Write your main email content here..."
              onFocus={onRichFocus}
              className="text-sm text-gray-700 focus:bg-blue-50/50 rounded px-1"
            />
          ) : (
            data.content
              ? <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: data.content }} />
              : <p className="text-sm text-gray-300 italic">Write your main email content here...</p>
          )}
        </div>
      );

    // ── Image ───────────────────────────────────────────────────────────
    case 'image':
      return (
        <div className="px-10 py-5 bg-white" style={{ textAlign: data.align || 'center' }}>
          {data.url ? (
            <img
              src={data.url}
              alt={data.alt || ''}
              style={{
                width: `${data.width || 100}%`,
                maxHeight: '200px',
                objectFit: 'cover',
                borderRadius: data.shape === 'circle' ? '50%' : data.shape === 'rounded' ? '8px' : '0',
              }}
            />
          ) : (
            <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg py-8 text-center">
              <p className="text-sm text-gray-400">Click to configure image</p>
            </div>
          )}
        </div>
      );

    // ── Highlighted ─────────────────────────────────────────────────────
    case 'highlighted':
      return (
        <div className="px-10 py-5 bg-white">
          <div className="border-l-4 pl-4 py-2" style={{ borderColor: c.accent }}>
            {editing ? (
              <EditableRichText
                value={data.content || ''}
                onChange={(v) => onChange({ content: v })}
                placeholder="Highlighted content..."
                onFocus={onRichFocus}
                className="text-sm text-gray-700 focus:bg-amber-50/50 rounded px-1"
              />
            ) : (
              data.content
                ? <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: data.content }} />
                : <p className="text-sm text-gray-300 italic">Highlighted content...</p>
            )}
          </div>
        </div>
      );

    // ── Important Notice ────────────────────────────────────────────────
    case 'importantNotice':
      return (
        <div className="px-10 py-5 bg-white">
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
            <EditableText
              tag="p"
              value={data.title || ''}
              onChange={(v) => onChange({ title: v })}
              placeholder="Important Notice"
              disabled={!editing}
              className="text-sm font-bold text-yellow-800 mb-1 focus:bg-yellow-100 rounded px-1"
            />
            {editing ? (
              <EditableRichText
                value={data.content || ''}
                onChange={(v) => onChange({ content: v })}
                placeholder="Notice content..."
                onFocus={onRichFocus}
                className="text-xs text-yellow-700 focus:bg-yellow-100/50 rounded px-1"
              />
            ) : (
              data.content
                ? <div className="text-xs text-yellow-700" dangerouslySetInnerHTML={{ __html: data.content }} />
                : <p className="text-xs text-yellow-600/50 italic">Notice content...</p>
            )}
          </div>
        </div>
      );

    // ── Alert Box ───────────────────────────────────────────────────────
    case 'alertBox':
      return (
        <div className="px-10 py-5 bg-white">
          <div className="bg-red-50 border border-red-300 rounded-lg p-4">
            <EditableText
              tag="p"
              value={data.title || ''}
              onChange={(v) => onChange({ title: v })}
              placeholder="Alert"
              disabled={!editing}
              className="text-sm font-bold text-red-800 mb-1 focus:bg-red-100 rounded px-1"
            />
            {editing ? (
              <EditableRichText
                value={data.content || ''}
                onChange={(v) => onChange({ content: v })}
                placeholder="Alert content..."
                onFocus={onRichFocus}
                className="text-xs text-red-700 focus:bg-red-100/50 rounded px-1"
              />
            ) : (
              data.content
                ? <div className="text-xs text-red-700" dangerouslySetInnerHTML={{ __html: data.content }} />
                : <p className="text-xs text-red-600/50 italic">Alert content...</p>
            )}
          </div>
        </div>
      );

    // ── CTA Button ──────────────────────────────────────────────────────
    case 'ctaButton': {
      const buttons = data.buttons || (data.buttonText ? [{ text: data.buttonText }] : [{ text: '' }]);
      return (
        <div className="px-10 py-5 bg-white text-center">
          <div className="flex flex-wrap gap-2 justify-center">
            {buttons.map((btn, i) => (
              <span key={i} className="inline-block px-5 py-2.5 text-sm font-bold rounded cursor-text"
                style={{ backgroundColor: c.gold, color: '#1a1a1a' }}>
                {editing ? (
                  <EditableText
                    value={btn.text || ''}
                    onChange={(v) => {
                      const updated = buttons.map((b, j) => j === i ? { ...b, text: v } : b);
                      onChange({ buttons: updated });
                    }}
                    placeholder="Button Text"
                    className="focus:bg-black/10 rounded px-1"
                  />
                ) : (
                  btn.text || <span className="opacity-50 italic">Button Text</span>
                )}
              </span>
            ))}
          </div>
          {data.helperText && <p className="text-xs text-gray-500 mt-2">{data.helperText}</p>}
        </div>
      );
    }

    // ── Meeting Details ─────────────────────────────────────────────────
    case 'meetingDetails':
      return (
        <div className="px-10 py-5 bg-white">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-bold text-gray-800 mb-3">Meeting Details</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
              <div className="flex gap-1">
                <span className="font-medium text-gray-500">Date:</span>
                <EditableText value={data.date || ''} onChange={(v) => onChange({ date: v })} placeholder="TBD" disabled={!editing}
                  className="focus:bg-blue-50 rounded px-1" />
              </div>
              <div className="flex gap-1">
                <span className="font-medium text-gray-500">Time:</span>
                <EditableText value={data.time || ''} onChange={(v) => onChange({ time: v })} placeholder="TBD" disabled={!editing}
                  className="focus:bg-blue-50 rounded px-1" />
              </div>
              {(data.format || editing) && (
                <div className="flex gap-1 col-span-2">
                  <span className="font-medium text-gray-500">Format:</span>
                  <EditableText value={data.format || ''} onChange={(v) => onChange({ format: v })} placeholder="e.g. Zoom" disabled={!editing}
                    className="focus:bg-blue-50 rounded px-1" />
                </div>
              )}
              {(data.meetingId || editing) && (
                <div className="flex gap-1">
                  <span className="font-medium text-gray-500">ID:</span>
                  <EditableText value={data.meetingId || ''} onChange={(v) => onChange({ meetingId: v })} placeholder="—" disabled={!editing}
                    className="focus:bg-blue-50 rounded px-1" />
                </div>
              )}
              {(data.passcode || editing) && (
                <div className="flex gap-1">
                  <span className="font-medium text-gray-500">Passcode:</span>
                  <EditableText value={data.passcode || ''} onChange={(v) => onChange({ passcode: v })} placeholder="—" disabled={!editing}
                    className="focus:bg-blue-50 rounded px-1" />
                </div>
              )}
            </div>
            {(data.buttonText || data.meetingUrl) && (
              <div className="mt-3 text-center">
                <span className="inline-block px-4 py-2 text-sm font-bold rounded text-white" style={{ backgroundColor: c.accent }}>
                  {data.buttonText || 'Join Meeting'}
                </span>
              </div>
            )}
          </div>
        </div>
      );

    // ── Resource Links ──────────────────────────────────────────────────
    case 'resourceLinks': {
      const links = data.links || [];
      return (
        <div className="px-10 py-5 bg-white">
          <EditableText
            tag="p"
            value={data.heading || ''}
            onChange={(v) => onChange({ heading: v })}
            placeholder="Resources"
            disabled={!editing}
            className="text-sm font-bold text-gray-800 mb-2 focus:bg-blue-50 rounded px-1"
          />
          {links.length > 0 ? (
            <ul className="space-y-1">
              {links.map((link, i) => (
                <li key={i} className="text-sm" style={{ color: c.gold }}>
                  → {link.text || link.label || link.url || 'Link'}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-300 italic">Add resource links in settings...</p>
          )}
        </div>
      );
    }

    // ── Two Column ──────────────────────────────────────────────────────
    case 'twoColumn':
      return (
        <div className="px-10 py-5 bg-white">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded p-3 min-h-[40px]">
              {editing ? (
                <EditableRichText
                  value={data.leftContent || ''}
                  onChange={(v) => onChange({ leftContent: v })}
                  placeholder="Left column content..."
                  onFocus={onRichFocus}
                  className="text-sm text-gray-600 focus:bg-blue-50/50 rounded px-1"
                />
              ) : (
                data.leftContent
                  ? <div className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: data.leftContent }} />
                  : <p className="text-xs text-gray-300 italic text-center">Left column</p>
              )}
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded p-3 min-h-[40px]">
              {editing ? (
                <EditableRichText
                  value={data.rightContent || ''}
                  onChange={(v) => onChange({ rightContent: v })}
                  placeholder="Right column content..."
                  onFocus={onRichFocus}
                  className="text-sm text-gray-600 focus:bg-blue-50/50 rounded px-1"
                />
              ) : (
                data.rightContent
                  ? <div className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: data.rightContent }} />
                  : <p className="text-xs text-gray-300 italic text-center">Right column</p>
              )}
            </div>
          </div>
        </div>
      );

    // ── List ────────────────────────────────────────────────────────────
    case 'list': {
      const items = data.items || [];
      const isOrdered = data.listType === 'ordered';
      return (
        <div className="px-10 py-5 bg-white">
          <EditableText
            tag="p"
            value={data.heading || ''}
            onChange={(v) => onChange({ heading: v })}
            placeholder="List Heading"
            disabled={!editing}
            className="text-sm font-bold text-gray-800 mb-2 focus:bg-blue-50 rounded px-1"
          />
          {items.length > 0 ? (
            isOrdered ? (
              <ol className="list-decimal list-inside space-y-0.5">
                {items.map((item, i) => <li key={i} className="text-sm text-gray-600">{item}</li>)}
              </ol>
            ) : (
              <ul className="list-disc list-inside space-y-0.5">
                {items.map((item, i) => <li key={i} className="text-sm text-gray-600">{item}</li>)}
              </ul>
            )
          ) : (
            <p className="text-xs text-gray-300 italic">Add list items in settings...</p>
          )}
        </div>
      );
    }

    // ── Closing ─────────────────────────────────────────────────────────
    case 'closing':
      return (
        <div className="px-10 py-5 bg-white">
          {editing ? (
            <EditableRichText
              value={data.content || ''}
              onChange={(v) => onChange({ content: v })}
              placeholder="Closing remarks..."
              onFocus={onRichFocus}
              className="text-sm text-gray-600 focus:bg-blue-50/50 rounded px-1"
            />
          ) : (
            data.content
              ? <div className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: data.content }} />
              : <p className="text-sm text-gray-300 italic">Closing remarks...</p>
          )}
        </div>
      );

    // ── Signature ───────────────────────────────────────────────────────
    case 'signature':
      return (
        <div className="px-10 py-5 bg-white">
          <div className="border-t border-gray-200 pt-3">
            <EditableText
              tag="p"
              value={data.name || ''}
              onChange={(v) => onChange({ name: v })}
              placeholder="Your Name"
              disabled={!editing}
              className="text-sm font-bold text-gray-800 focus:bg-blue-50 rounded px-1"
            />
            <EditableText
              tag="p"
              value={data.title || ''}
              onChange={(v) => onChange({ title: v })}
              placeholder="Title / Role"
              disabled={!editing}
              className="text-xs text-gray-600 mt-0.5 focus:bg-blue-50 rounded px-1"
            />
            <EditableText
              tag="p"
              value={data.org || ''}
              onChange={(v) => onChange({ org: v })}
              placeholder="Organization"
              disabled={!editing}
              className="text-xs mt-0.5 focus:bg-blue-50 rounded px-1"
              style={{ color: c.primary }}
            />
          </div>
        </div>
      );

    // ── Footer ──────────────────────────────────────────────────────────
    case 'footer':
      return (
        <div style={{ backgroundColor: c.primary }} className="px-10 py-5 text-center">
          <EditableText
            tag="p"
            value={data.orgName || ''}
            onChange={(v) => onChange({ orgName: v })}
            placeholder="Organization Name"
            disabled={!editing}
            className="text-sm text-white font-medium focus:bg-white/10 rounded px-1"
          />
          <EditableText
            tag="p"
            value={data.website || ''}
            onChange={(v) => onChange({ website: v })}
            placeholder="https://yourwebsite.gov"
            disabled={!editing}
            className="text-xs mt-1 focus:bg-white/10 rounded px-1"
            style={{ color: c.gold }}
          />
          <EditableText
            tag="p"
            value={data.tagline || ''}
            onChange={(v) => onChange({ tagline: v })}
            placeholder="Tagline (optional)"
            disabled={!editing}
            className="text-xs mt-1 text-white/50 focus:bg-white/10 rounded px-1"
          />
        </div>
      );

    // ── Featured Article ────────────────────────────────────────────────
    case 'featuredArticle':
      return (
        <div className="px-10 py-5 bg-white">
          <div className="border-l-4 pl-4" style={{ borderColor: c.gold }}>
            <EditableText
              tag="p"
              value={data.headline || ''}
              onChange={(v) => onChange({ headline: v })}
              placeholder="Featured Article Headline"
              disabled={!editing}
              className="text-sm font-bold text-gray-800 focus:bg-amber-50 rounded px-1"
            />
            <EditableText
              tag="p"
              value={data.summary || ''}
              onChange={(v) => onChange({ summary: v })}
              placeholder="Article summary..."
              disabled={!editing}
              className="text-xs text-gray-600 mt-1 focus:bg-amber-50 rounded px-1"
            />
            {data.ctaText && (
              <span className="inline-block mt-2 px-3 py-1.5 text-xs font-bold rounded" style={{ backgroundColor: c.gold, color: '#1a1a1a' }}>
                {data.ctaText}
              </span>
            )}
          </div>
        </div>
      );

    // ── News Section ────────────────────────────────────────────────────
    case 'newsSection':
      return (
        <div className="px-10 py-5 bg-white">
          <EditableText
            tag="p"
            value={data.heading || ''}
            onChange={(v) => onChange({ heading: v })}
            placeholder="News Section Heading"
            disabled={!editing}
            className="text-sm font-bold mb-2 focus:bg-blue-50 rounded px-1"
            style={{ color: c.primary }}
          />
          {editing ? (
            <EditableRichText
              value={data.content || ''}
              onChange={(v) => onChange({ content: v })}
              placeholder="News content..."
              onFocus={onRichFocus}
              className="text-sm text-gray-600 focus:bg-blue-50/50 rounded px-1"
            />
          ) : (
            data.content
              ? <div className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: data.content }} />
              : <p className="text-xs text-gray-300 italic">News content...</p>
          )}
        </div>
      );

    // ── Event Listing ───────────────────────────────────────────────────
    case 'eventListing': {
      const events = data.events || [];
      return (
        <div className="px-10 py-5 bg-white">
          <EditableText
            tag="p"
            value={data.heading || ''}
            onChange={(v) => onChange({ heading: v })}
            placeholder="Upcoming Events"
            disabled={!editing}
            className="text-sm font-bold text-gray-800 mb-2 focus:bg-blue-50 rounded px-1"
          />
          {events.length > 0 ? (
            <div className="space-y-2">
              {events.map((evt, i) => (
                <div key={i} className="bg-gray-50 border border-gray-200 rounded p-3">
                  <p className="text-sm font-bold text-gray-800">{evt.name || 'Event'}</p>
                  <p className="text-xs text-gray-500">{evt.date || 'Date TBD'} {evt.time && `· ${evt.time}`}</p>
                  {evt.location && <p className="text-xs text-gray-500">{evt.location}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-300 italic">Add events in settings...</p>
          )}
        </div>
      );
    }

    // ── Highlight Banner ────────────────────────────────────────────────
    case 'highlightBanner':
      return (
        <div className="py-1">
          <div className="px-10 py-6 text-center" style={{ backgroundColor: c.accent }}>
            <EditableText
              tag="p"
              value={data.heading || ''}
              onChange={(v) => onChange({ heading: v })}
              placeholder="Banner Heading"
              disabled={!editing}
              className="text-sm font-bold text-white focus:bg-white/10 rounded px-1"
            />
            <EditableText
              tag="p"
              value={data.subtext || ''}
              onChange={(v) => onChange({ subtext: v })}
              placeholder="Subtext (optional)"
              disabled={!editing}
              className="text-xs text-white/70 mt-1 focus:bg-white/10 rounded px-1"
            />
            {data.ctaText && (
              <span className="inline-block mt-3 px-4 py-1.5 text-xs font-bold rounded text-slate-900" style={{ backgroundColor: c.gold }}>
                {data.ctaText}
              </span>
            )}
          </div>
        </div>
      );

    // ── Member Resources ────────────────────────────────────────────────
    case 'memberResources': {
      const resources = data.resources || [];
      return (
        <div className="px-10 py-5 bg-white">
          <EditableText
            tag="p"
            value={data.heading || ''}
            onChange={(v) => onChange({ heading: v })}
            placeholder="Member Resources"
            disabled={!editing}
            className="text-sm font-bold text-gray-800 mb-2 focus:bg-blue-50 rounded px-1"
          />
          {resources.length > 0 ? (
            <ul className="space-y-1">
              {resources.map((r, i) => (
                <li key={i} className="text-sm" style={{ color: c.primary }}>• {r.label || r.url || 'Resource'}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-300 italic">Add resources in settings...</p>
          )}
        </div>
      );
    }

    default:
      return (
        <div className="px-10 py-5 bg-white">
          <p className="text-xs text-gray-400 italic">{type} section</p>
        </div>
      );
  }
};

// ─── Config Panels for Complex Sections ─────────────────────────────────────
const SectionConfigPanel = ({ section, onChange, themeColors }) => {
  const { type, data } = section;

  switch (type) {
    case 'image':
      return (
        <div className="space-y-2">
          <ConfigInput label="Image URL" value={data.url} onChange={(v) => onChange({ url: v })} placeholder="https://example.com/image.jpg" />
          <div className="grid grid-cols-2 gap-2">
            <ConfigInput label="Alt Text" value={data.alt} onChange={(v) => onChange({ alt: v })} placeholder="Describe the image" />
            <ConfigInput label="Link URL (optional)" value={data.linkUrl} onChange={(v) => onChange({ linkUrl: v })} placeholder="Wrap in link" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Width: {data.width || 100}%</label>
              <input type="range" min="10" max="100" step="5" value={data.width || 100}
                onChange={(e) => onChange({ width: parseInt(e.target.value) })}
                onClick={(e) => e.stopPropagation()}
                className="w-full accent-amber-500 h-1" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Shape</label>
              <div className="flex gap-1">
                {['rectangle', 'square', 'circle'].map(s => (
                  <button key={s} onClick={(e) => { e.stopPropagation(); onChange({ shape: s }); }}
                    className={`px-2 py-1 rounded text-[10px] font-medium ${(data.shape || 'rectangle') === s ? 'bg-amber-500 text-slate-900' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Align</label>
              <div className="flex gap-1">
                {['left', 'center', 'right'].map(a => (
                  <button key={a} onClick={(e) => { e.stopPropagation(); onChange({ align: a }); }}
                    className={`px-2 py-1 rounded text-[10px] font-medium ${(data.align || 'center') === a ? 'bg-amber-500 text-slate-900' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                    {a.charAt(0).toUpperCase() + a.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      );

    case 'ctaButton': {
      const buttons = data.buttons || (data.buttonText ? [{ text: data.buttonText, url: '' }] : [{ text: '', url: '' }]);
      return (
        <div className="space-y-2">
          {buttons.map((btn, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1">
                <ConfigInput label={`Button ${i + 1} URL`} value={btn.url} placeholder="https://..."
                  onChange={(v) => { const u = buttons.map((b, j) => j === i ? { ...b, url: v } : b); onChange({ buttons: u }); }} />
              </div>
              {buttons.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); onChange({ buttons: buttons.filter((_, j) => j !== i) }); }}
                  className="p-1.5 text-red-400 hover:text-red-600 mb-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); onChange({ buttons: [...buttons, { text: '', url: '' }] }); }}
              className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-700 font-medium">
              <Plus className="w-3 h-3" /> Add Button
            </button>
          </div>
          <ConfigInput label="Helper Text (below buttons)" value={data.helperText} onChange={(v) => onChange({ helperText: v })} placeholder="Optional helper text" />
        </div>
      );
    }

    case 'meetingDetails':
      return (
        <div className="space-y-2">
          <ConfigInput label="Meeting Link" value={data.meetingUrl} onChange={(v) => onChange({ meetingUrl: v })} placeholder="https://zoom.us/j/..." />
          <ConfigInput label="Button Text" value={data.buttonText} onChange={(v) => onChange({ buttonText: v })} placeholder="e.g. JOIN ZOOM MEETING" />
        </div>
      );

    case 'resourceLinks': {
      const links = data.links || [{ text: '', url: '' }];
      return (
        <div className="space-y-2">
          {links.map((link, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1 grid grid-cols-2 gap-1">
                <ConfigInput label={`Link ${i + 1} Text`} value={link.text} placeholder="Link text"
                  onChange={(v) => { const u = links.map((l, j) => j === i ? { ...l, text: v } : l); onChange({ links: u }); }} />
                <ConfigInput label="URL" value={link.url} placeholder="https://..."
                  onChange={(v) => { const u = links.map((l, j) => j === i ? { ...l, url: v } : l); onChange({ links: u }); }} />
              </div>
              {links.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); onChange({ links: links.filter((_, j) => j !== i) }); }}
                  className="p-1.5 text-red-400 hover:text-red-600 mb-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
              )}
            </div>
          ))}
          <button onClick={(e) => { e.stopPropagation(); onChange({ links: [...links, { text: '', url: '' }] }); }}
            className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-700 font-medium">
            <Plus className="w-3 h-3" /> Add Link
          </button>
        </div>
      );
    }

    case 'list': {
      const items = data.items || [''];
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <label className="text-[10px] font-medium text-gray-400">Type:</label>
            {['unordered', 'ordered'].map(t => (
              <button key={t} onClick={(e) => { e.stopPropagation(); onChange({ listType: t }); }}
                className={`px-2 py-1 rounded text-[10px] font-medium ${(data.listType || 'unordered') === t ? 'bg-amber-500 text-slate-900' : 'bg-gray-200 text-gray-600'}`}>
                {t === 'ordered' ? 'Numbered' : 'Bullets'}
              </button>
            ))}
          </div>
          {items.map((item, i) => (
            <div key={i} className="flex gap-1 items-center">
              <span className="text-[10px] text-gray-400 w-4 text-center">{data.listType === 'ordered' ? `${i+1}.` : '•'}</span>
              <input type="text" value={item} placeholder="List item..."
                onChange={(e) => { const u = items.map((it, j) => j === i ? e.target.value : it); onChange({ items: u }); }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-gray-800 text-xs placeholder-gray-400 focus:outline-none focus:border-amber-500" />
              {items.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); onChange({ items: items.filter((_, j) => j !== i) }); }}
                  className="p-1 text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
              )}
            </div>
          ))}
          <button onClick={(e) => { e.stopPropagation(); onChange({ items: [...items, ''] }); }}
            className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-700 font-medium">
            <Plus className="w-3 h-3" /> Add Item
          </button>
        </div>
      );
    }

    case 'greeting': {
      const signOffs = data.signOffs || [{ name: '', title: '' }];
      return (
        <div className="space-y-2">
          <ConfigInput label="Sign-off Line" value={data.signOffLine} onChange={(v) => onChange({ signOffLine: v })} placeholder="e.g. Sincerely," />
          {signOffs.map((so, i) => (
            <div key={i} className="flex gap-1 items-end">
              <div className="flex-1 grid grid-cols-2 gap-1">
                <ConfigInput label={`Name ${i + 1}`} value={so.name} placeholder="Full name"
                  onChange={(v) => { const u = signOffs.map((s, j) => j === i ? { ...s, name: v } : s); onChange({ signOffs: u }); }} />
                <ConfigInput label="Title" value={so.title} placeholder="Title / Role"
                  onChange={(v) => { const u = signOffs.map((s, j) => j === i ? { ...s, title: v } : s); onChange({ signOffs: u }); }} />
              </div>
              {signOffs.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); onChange({ signOffs: signOffs.filter((_, j) => j !== i) }); }}
                  className="p-1.5 text-red-400 hover:text-red-600 mb-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
              )}
            </div>
          ))}
          <button onClick={(e) => { e.stopPropagation(); onChange({ signOffs: [...signOffs, { name: '', title: '' }] }); }}
            className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-700 font-medium">
            <Plus className="w-3 h-3" /> Add Name
          </button>
          <ConfigInput label="Organization" value={data.org} onChange={(v) => onChange({ org: v })} placeholder="e.g. Township Name" />
        </div>
      );
    }

    case 'eventListing': {
      const events = data.events || [{ name: '', date: '', time: '', location: '' }];
      return (
        <div className="space-y-2">
          {events.map((evt, i) => (
            <div key={i} className="p-2 bg-white border border-gray-200 rounded space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-gray-400">Event {i + 1}</span>
                {events.length > 1 && (
                  <button onClick={(e) => { e.stopPropagation(); onChange({ events: events.filter((_, j) => j !== i) }); }}
                    className="p-0.5 text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1">
                <ConfigInput label="Name" value={evt.name} placeholder="Event name"
                  onChange={(v) => { const u = events.map((e, j) => j === i ? { ...e, name: v } : e); onChange({ events: u }); }} />
                <ConfigInput label="Date" value={evt.date} placeholder="Date"
                  onChange={(v) => { const u = events.map((e, j) => j === i ? { ...e, date: v } : e); onChange({ events: u }); }} />
                <ConfigInput label="Time" value={evt.time} placeholder="Time"
                  onChange={(v) => { const u = events.map((e, j) => j === i ? { ...e, time: v } : e); onChange({ events: u }); }} />
                <ConfigInput label="Location" value={evt.location} placeholder="Location"
                  onChange={(v) => { const u = events.map((e, j) => j === i ? { ...e, location: v } : e); onChange({ events: u }); }} />
              </div>
            </div>
          ))}
          <button onClick={(e) => { e.stopPropagation(); onChange({ events: [...events, { name: '', date: '', time: '', location: '' }] }); }}
            className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-700 font-medium">
            <Plus className="w-3 h-3" /> Add Event
          </button>
        </div>
      );
    }

    case 'featuredArticle':
      return (
        <div className="grid grid-cols-2 gap-2">
          <ConfigInput label="CTA Button Text" value={data.ctaText} onChange={(v) => onChange({ ctaText: v })} placeholder="Read More" />
          <ConfigInput label="CTA Button URL" value={data.ctaUrl} onChange={(v) => onChange({ ctaUrl: v })} placeholder="https://..." />
        </div>
      );

    case 'highlightBanner':
      return (
        <div className="grid grid-cols-2 gap-2">
          <ConfigInput label="CTA Button Text" value={data.ctaText} onChange={(v) => onChange({ ctaText: v })} placeholder="Learn More" />
          <ConfigInput label="CTA Button URL" value={data.ctaUrl} onChange={(v) => onChange({ ctaUrl: v })} placeholder="https://..." />
        </div>
      );

    case 'memberResources': {
      const resources = data.resources || [{ label: '', url: '' }];
      return (
        <div className="space-y-2">
          {resources.map((r, i) => (
            <div key={i} className="flex gap-1 items-end">
              <div className="flex-1 grid grid-cols-2 gap-1">
                <ConfigInput label={`Resource ${i + 1}`} value={r.label} placeholder="Label"
                  onChange={(v) => { const u = resources.map((res, j) => j === i ? { ...res, label: v } : res); onChange({ resources: u }); }} />
                <ConfigInput label="URL" value={r.url} placeholder="https://..."
                  onChange={(v) => { const u = resources.map((res, j) => j === i ? { ...res, url: v } : res); onChange({ resources: u }); }} />
              </div>
              {resources.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); onChange({ resources: resources.filter((_, j) => j !== i) }); }}
                  className="p-1.5 text-red-400 hover:text-red-600 mb-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
              )}
            </div>
          ))}
          <button onClick={(e) => { e.stopPropagation(); onChange({ resources: [...resources, { label: '', url: '' }] }); }}
            className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-700 font-medium">
            <Plus className="w-3 h-3" /> Add Resource
          </button>
        </div>
      );
    }

    default:
      return null;
  }
};

// ─── Main Canvas Component ──────────────────────────────────────────────────
const BuilderCanvas = ({
  sections,
  activeSectionId,
  onSelectSection,
  onMoveSection,
  onDeleteSection,
  onAddSection,
  onUpdateSection,
  themeColors,
  logo,
  logoHeight,
}) => {
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isDraggingFromCatalog, setIsDraggingFromCatalog] = useState(false);
  const [reorderDragIndex, setReorderDragIndex] = useState(null);
  const [reorderDragOverIndex, setReorderDragOverIndex] = useState(null);
  const [showConfig, setShowConfig] = useState(null); // section id showing config
  const [richToolbarVisible, setRichToolbarVisible] = useState(false);
  const canvasRef = useRef(null);

  const handleCanvasDragOver = useCallback((e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('application/x-section-type')) {
      setIsDraggingFromCatalog(true);
    }
  }, []);

  const handleCanvasDragLeave = useCallback((e) => {
    if (canvasRef.current && !canvasRef.current.contains(e.relatedTarget)) {
      setIsDraggingFromCatalog(false);
      setDragOverIndex(null);
    }
  }, []);

  const handleCanvasDrop = useCallback(() => {
    setIsDraggingFromCatalog(false);
    setDragOverIndex(null);
  }, []);

  const handleCatalogDrop = useCallback((sectionType, index) => {
    onAddSection(sectionType, index);
    setIsDraggingFromCatalog(false);
    setDragOverIndex(null);
  }, [onAddSection]);

  const handleReorderDragStart = (e, index) => {
    if (sections[index].locked) { e.preventDefault(); return; }
    setReorderDragIndex(index);
    e.dataTransfer.setData('application/x-reorder-index', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleReorderDragOver = (e, index) => {
    e.preventDefault();
    if (sections[index].locked) return;
    setReorderDragOverIndex(index);
  };

  const handleReorderDrop = (e, index) => {
    e.preventDefault();
    const fromStr = e.dataTransfer.getData('application/x-reorder-index');
    if (fromStr !== '') {
      const fromIndex = parseInt(fromStr);
      if (fromIndex !== index && !sections[index].locked) {
        onMoveSection(fromIndex, index);
      }
    }
    setReorderDragIndex(null);
    setReorderDragOverIndex(null);
  };

  const handleReorderDragEnd = () => {
    setReorderDragIndex(null);
    setReorderDragOverIndex(null);
  };

  const handleClickCanvas = useCallback(() => {
    onSelectSection(null);
    setShowConfig(null);
    setRichToolbarVisible(false);
  }, [onSelectSection]);

  const handleSelectSection = useCallback((id) => {
    onSelectSection(id);
    // If selecting a new section, close config of previous
    if (showConfig && showConfig !== id) setShowConfig(null);
  }, [onSelectSection, showConfig]);

  const toggleConfig = useCallback((id, e) => {
    e.stopPropagation();
    setShowConfig(prev => prev === id ? null : id);
  }, []);

  return (
    <div
      ref={canvasRef}
      className="h-full overflow-y-auto bg-slate-200/50"
      style={{ backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      onDragOver={handleCanvasDragOver}
      onDragLeave={handleCanvasDragLeave}
      onDrop={handleCanvasDrop}
      onClick={handleClickCanvas}
    >
      {/* Inline CSS for contentEditable placeholders */}
      <style>{`
        .inline-editable-text:empty::before,
        .inline-editable-rich:empty::before {
          content: attr(data-placeholder);
          color: rgba(0,0,0,0.3);
          font-style: italic;
          pointer-events: none;
        }
        .inline-editable-rich p { margin: 4px 0; }
        .inline-editable-rich ul { list-style-type: disc; padding-left: 24px; margin: 4px 0; }
        .inline-editable-rich ol { list-style-type: decimal; padding-left: 24px; margin: 4px 0; }
        .inline-editable-rich li { margin: 2px 0; }
        .inline-editable-rich b, .inline-editable-rich strong { font-weight: bold; }
        .inline-editable-rich i, .inline-editable-rich em { font-style: italic; }
        .inline-editable-rich u { text-decoration: underline; }
      `}</style>

      <div className="max-w-[620px] mx-auto my-8">
        {/* Rich Text Toolbar - floats above canvas */}
        <div className="sticky top-2 z-50 flex justify-center mb-2">
          <RichTextToolbar visible={richToolbarVisible} />
        </div>

        {/* Email canvas container */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-slate-300" onClick={(e) => e.stopPropagation()}>
          {sections.map((section, index) => {
            const isActive = activeSectionId === section.id;
            const isLocked = section.locked;
            const hasConfig = SECTIONS_WITH_CONFIG.has(section.type);
            const isConfigOpen = showConfig === section.id;
            const isFirst = index === 0;
            const isLast = index === sections.length - 1;

            return (
              <React.Fragment key={section.id}>
                {/* Drop zone for catalog drags */}
                {isDraggingFromCatalog && !isFirst && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }}
                    onDrop={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      const t = e.dataTransfer.getData('application/x-section-type');
                      if (t) handleCatalogDrop(t, index);
                    }}
                    className={`transition-all duration-200 ${
                      dragOverIndex === index
                        ? 'h-10 bg-amber-500/10 border-y-2 border-dashed border-amber-500/50 flex items-center justify-center'
                        : 'h-1 hover:h-6 hover:bg-amber-500/5'
                    }`}
                  >
                    {dragOverIndex === index && (
                      <span className="text-xs text-amber-500/70 font-medium flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Drop here
                      </span>
                    )}
                  </div>
                )}

                {/* Section block */}
                <div
                  draggable={!isLocked}
                  onDragStart={(e) => handleReorderDragStart(e, index)}
                  onDragOver={(e) => handleReorderDragOver(e, index)}
                  onDrop={(e) => handleReorderDrop(e, index)}
                  onDragEnd={handleReorderDragEnd}
                  onClick={(e) => { e.stopPropagation(); handleSelectSection(section.id); }}
                  className={`relative group transition-all ${
                    isActive
                      ? 'ring-2 ring-amber-500 ring-inset z-10'
                      : 'hover:ring-2 hover:ring-amber-500/30 hover:ring-inset'
                  } ${reorderDragIndex === index ? 'opacity-40' : ''} ${
                    reorderDragOverIndex === index && reorderDragIndex !== null ? 'ring-2 ring-blue-500 ring-inset' : ''
                  }`}
                >
                  {/* Top-right controls */}
                  <div className={`absolute top-0 right-0 flex items-center gap-0.5 z-20 transition-opacity ${
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    {hasConfig && (
                      <button
                        onClick={(e) => toggleConfig(section.id, e)}
                        className={`p-1 rounded-bl-lg transition-colors ${isConfigOpen ? 'bg-amber-500 text-slate-900' : 'bg-gray-700/80 text-white hover:bg-gray-600'}`}
                        title="Section settings"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="bg-amber-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                      {SECTION_LABELS[section.type] || section.type}
                    </span>
                    {!isLocked && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteSection(section.id); }}
                        className="bg-red-500 text-white p-0.5 rounded-bl-lg hover:bg-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Drag handle */}
                  {!isLocked && (
                    <div className={`absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center z-20 transition-opacity cursor-grab active:cursor-grabbing ${
                      isActive ? 'opacity-60' : 'opacity-0 group-hover:opacity-60'
                    }`}>
                      <GripVertical className="w-4 h-4 text-slate-400" />
                    </div>
                  )}

                  {isLocked && (
                    <div className="absolute left-1 top-1 z-20 opacity-0 group-hover:opacity-60 transition-opacity">
                      <Lock className="w-3 h-3 text-slate-400" />
                    </div>
                  )}

                  {/* Inline-editable section preview */}
                  <InlineSection
                    section={section}
                    isEditing={isActive}
                    onChange={(newData) => onUpdateSection(section.id, newData)}
                    themeColors={themeColors}
                    logo={logo}
                    logoHeight={logoHeight}
                    showRichToolbar={richToolbarVisible}
                    onRichFocus={() => setRichToolbarVisible(true)}
                  />

                  {/* Config panel */}
                  {isActive && isConfigOpen && hasConfig && (
                    <ConfigPanel visible>
                      <SectionConfigPanel
                        section={section}
                        onChange={(newData) => onUpdateSection(section.id, newData)}
                        themeColors={themeColors}
                      />
                    </ConfigPanel>
                  )}
                </div>

                {/* Drop zone after last section */}
                {isDraggingFromCatalog && isLast && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOverIndex(sections.length); }}
                    onDrop={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      const t = e.dataTransfer.getData('application/x-section-type');
                      if (t) handleCatalogDrop(t, sections.length);
                    }}
                    className={`transition-all duration-200 ${
                      dragOverIndex === sections.length
                        ? 'h-10 bg-amber-500/10 border-y-2 border-dashed border-amber-500/50 flex items-center justify-center'
                        : 'h-1 hover:h-6 hover:bg-amber-500/5'
                    }`}
                  >
                    {dragOverIndex === sections.length && (
                      <span className="text-xs text-amber-500/70 font-medium flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Drop here
                      </span>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {sections.length === 0 && (
          <div className="bg-white rounded-lg shadow-xl border-2 border-dashed border-slate-300 py-16 text-center">
            <p className="text-slate-400 text-sm">Drag sections from the left panel to start building</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuilderCanvas;
