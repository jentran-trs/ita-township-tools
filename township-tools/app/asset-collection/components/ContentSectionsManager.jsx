"use client";

import { useState, useEffect, useRef } from 'react';
import FileUpload from './FileUpload';
import { Layers, Plus, Trash2, ChevronDown, ChevronUp, BarChart3, Info, X, Image, FileText, CreditCard, Hash, ExternalLink, MessageSquare } from 'lucide-react';

// Individual image with caption
function ImageWithCaption({ image, index, onChange, onRemove, isChart }) {
  const hasImage = image.file || image.existingUrl;

  return (
    <div className={`rounded-xl p-4 space-y-3 ${isChart ? 'bg-purple-50' : 'bg-slate-50'}`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium flex items-center gap-2 ${isChart ? 'text-purple-700' : 'text-slate-700'}`}>
          {isChart ? <BarChart3 className="w-4 h-4" /> : null}
          {isChart ? 'Chart Image' : `Image ${index + 1}`}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-red-500 hover:bg-red-100 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {isChart && !hasImage && (
        <div className="p-3 bg-purple-100 rounded-lg">
          <p className="text-xs text-purple-800 flex items-start gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>How to add a chart:</strong>
              <br />1. Make a copy of{' '}
              <a
                href="https://docs.google.com/spreadsheets/d/1LCOm8e7cozUrYBK7Aa6avC1e5N9PqNKJ/copy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline inline-flex items-center gap-1"
              >
                this chart template <ExternalLink className="w-3 h-3 inline" />
              </a>
              <br />2. Fill in your data in the spreadsheet
              <br />3. Click the vertical three dots (<strong>⋮</strong>) &gt; choose <strong>Download as PNG/JPG</strong>
              <br />4. Upload the downloaded image below
            </span>
          </p>
        </div>
      )}

      {/* Show existing image if no new file uploaded */}
      {image.existingUrl && !image.file && (
        <div className="relative">
          <img
            src={image.existingUrl}
            alt={image.caption || 'Existing image'}
            className="w-full h-32 object-cover rounded-lg border border-slate-200"
          />
          <p className="text-xs text-slate-500 mt-1">Current image — upload a new file to replace</p>
        </div>
      )}

      <FileUpload
        accept="image/png,image/jpeg"
        value={image.file}
        onChange={(file) => onChange({ ...image, file })}
        compact
      />
      {hasImage && (
        <input
          type="text"
          value={image.caption || ''}
          onChange={(e) => onChange({ ...image, caption: e.target.value })}
          placeholder={isChart ? "Chart caption (e.g., Budget Breakdown 2025) — optional" : "Add a caption for this image (optional)"}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
        />
      )}
    </div>
  );
}

// Text block element
function TextBlock({ content, onChange, onRemove }) {
  const charCount = (content || '').length;
  const maxChars = 1000;

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');

    // Normalize all types of line endings to \n
    let formatted = text
      .replace(/\r\n/g, '\n')  // Windows
      .replace(/\r/g, '\n');    // Old Mac

    // Convert all single newlines to double newlines for paragraph spacing
    formatted = formatted
      .replace(/\n{2,}/g, '<<PARA>>')  // Mark existing paragraph breaks
      .replace(/\n/g, '\n\n')          // Single newlines become double
      .replace(/<<PARA>>/g, '\n\n');   // Restore paragraph breaks as double

    // Clean up any excessive newlines (3+ becomes 2) and trim
    formatted = formatted.replace(/\n{3,}/g, '\n\n').trim();

    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = content || '';
    const newValue = (currentValue.slice(0, start) + formatted + currentValue.slice(end)).slice(0, maxChars);
    onChange(newValue);

    // Restore cursor position after React re-renders
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + formatted.length;
    }, 0);
  };

  return (
    <div className="bg-blue-50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-blue-700 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Text Block
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-red-500 hover:bg-red-100 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <textarea
        value={content || ''}
        onChange={(e) => {
          onChange(e.target.value.slice(0, maxChars));
        }}
        onPaste={handlePaste}
        placeholder="Write your paragraph content here..."
        rows={4}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent resize-y"
      />
      <p className={`text-xs text-right ${charCount > maxChars * 0.9 ? 'text-red-500' : 'text-slate-400'}`}>
        {charCount}/{maxChars}
      </p>
    </div>
  );
}

// Content card element
function ContentCard({ card, onChange, onRemove }) {
  const charCount = (card.body || '').length;
  const maxChars = 900;

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');

    // Normalize all types of line endings to \n
    let formatted = text
      .replace(/\r\n/g, '\n')  // Windows
      .replace(/\r/g, '\n');    // Old Mac

    // Convert all single newlines to double newlines for paragraph spacing
    formatted = formatted
      .replace(/\n{2,}/g, '<<PARA>>')  // Mark existing paragraph breaks
      .replace(/\n/g, '\n\n')          // Single newlines become double
      .replace(/<<PARA>>/g, '\n\n');   // Restore paragraph breaks as double

    // Clean up any excessive newlines (3+ becomes 2) and trim
    formatted = formatted.replace(/\n{3,}/g, '\n\n').trim();

    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = card.body || '';
    const newValue = (currentValue.slice(0, start) + formatted + currentValue.slice(end)).slice(0, maxChars);
    onChange({ ...card, body: newValue });

    // Restore cursor position after React re-renders
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + formatted.length;
    }, 0);
  };

  return (
    <div className="bg-amber-50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-amber-700 flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Content Card
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-red-500 hover:bg-red-100 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <input
        type="text"
        value={card.title || ''}
        onChange={(e) => onChange({ ...card, title: e.target.value })}
        placeholder="Card title (e.g., Our Mission)"
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
      />
      <textarea
        value={card.body || ''}
        onChange={(e) => {
          onChange({ ...card, body: e.target.value.slice(0, maxChars) });
        }}
        onPaste={handlePaste}
        placeholder="Card content..."
        rows={3}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent resize-y"
      />
      <p className={`text-xs text-right ${charCount > maxChars * 0.9 ? 'text-red-500' : 'text-slate-400'}`}>
        {charCount}/{maxChars}
      </p>
    </div>
  );
}

// Stat input
function StatInput({ stat, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-3 bg-emerald-50 rounded-lg p-3">
      <Hash className="w-4 h-4 text-emerald-600 flex-shrink-0" />
      <input
        type="text"
        value={stat.label || ''}
        onChange={(e) => onChange({ ...stat, label: e.target.value })}
        placeholder="Label (e.g., Calls Responded)"
        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
      />
      <input
        type="text"
        value={stat.value || ''}
        onChange={(e) => onChange({ ...stat, value: e.target.value })}
        placeholder="Value (e.g., 1,247)"
        className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
      />
      <button
        type="button"
        onClick={onRemove}
        className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Add element dropdown
function AddElementDropdown({ onAdd, imageCount, chartCount, textCount, cardCount, statCount }) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  const options = [
    { type: 'image', label: 'Image with Caption', icon: Image, count: imageCount, recommended: 3 },
    { type: 'chart', label: 'Chart Image', icon: BarChart3, count: chartCount, recommended: 1 },
    { type: 'text', label: 'Text Block', icon: FileText, count: textCount, recommended: 3 },
    { type: 'card', label: 'Content Card', icon: CreditCard, count: cardCount, recommended: 3 },
    { type: 'stat', label: 'Statistic', icon: Hash, count: statCount, recommended: 3 },
  ];

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-6 py-3 bg-[#D4B896] text-[#1e3a5f] rounded-xl hover:bg-[#c4a886] transition-colors flex items-center justify-center gap-2 font-medium shadow-md"
      >
        <Plus className="w-4 h-4" />
        Add Element
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            style={dropdownStyle}
            className="bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden"
          >
            {options.map((option) => (
              <button
                key={option.type}
                type="button"
                onClick={() => {
                  onAdd(option.type);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-slate-50 text-slate-700"
              >
                <option.icon className="w-5 h-5" />
                <div className="flex-1">
                  <span>{option.label}</span>
                  <p className="text-xs text-slate-400">{option.count} added · {option.recommended} recommended</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ContentSection({ section, index, onChange, onRemove, canRemove, isExpanded, onToggle }) {
  const [highlightId, setHighlightId] = useState(null);
  const highlightRef = useRef(null);

  useEffect(() => {
    if (highlightId) {
      // Scroll the new element into view after a brief delay for render
      setTimeout(() => {
        if (highlightRef.current) {
          highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
      const timer = setTimeout(() => setHighlightId(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [highlightId]);

  const updateField = (field, value) => {
    onChange({ ...section, [field]: value });
  };

  // Count elements
  const allImages = section.images || [];
  const imageCount = allImages.filter(img => !img.isChart).length;
  const chartCount = allImages.filter(img => img.isChart).length;
  const textCount = section.textBlocks?.length || 0;
  const cardCount = section.contentCards?.length || 0;
  const statCount = section.stats?.length || 0;
  const totalElements = allImages.length + textCount + cardCount + statCount;

  // Add element handlers
  const addElement = (type) => {
    switch (type) {
      case 'image':
        updateField('images', [...allImages, { file: null, caption: '' }]);
        setHighlightId(`img-${allImages.length}`);
        break;
      case 'chart':
        updateField('images', [...allImages, { file: null, caption: '', isChart: true }]);
        setHighlightId(`img-${allImages.length}`);
        break;
      case 'text':
        updateField('textBlocks', [...(section.textBlocks || []), '']);
        setHighlightId(`text-${textCount}`);
        break;
      case 'card':
        updateField('contentCards', [...(section.contentCards || []), { title: '', body: '' }]);
        setHighlightId(`card-${cardCount}`);
        break;
      case 'stat':
        updateField('stats', [...(section.stats || []), { label: '', value: '' }]);
        setHighlightId(`stat-${statCount}`);
        break;
    }
  };

  // Update handlers
  const updateImage = (idx, updated) => {
    const images = [...(section.images || [])];
    images[idx] = updated;
    updateField('images', images);
  };

  const removeImage = (idx) => {
    const images = [...(section.images || [])];
    images.splice(idx, 1);
    updateField('images', images);
  };

  const updateTextBlock = (idx, content) => {
    const textBlocks = [...(section.textBlocks || [])];
    textBlocks[idx] = content;
    updateField('textBlocks', textBlocks);
  };

  const removeTextBlock = (idx) => {
    const textBlocks = [...(section.textBlocks || [])];
    textBlocks.splice(idx, 1);
    updateField('textBlocks', textBlocks);
  };

  const updateCard = (idx, updated) => {
    const contentCards = [...(section.contentCards || [])];
    contentCards[idx] = updated;
    updateField('contentCards', contentCards);
  };

  const removeCard = (idx) => {
    const contentCards = [...(section.contentCards || [])];
    contentCards.splice(idx, 1);
    updateField('contentCards', contentCards);
  };

  const updateStat = (idx, updated) => {
    const stats = [...(section.stats || [])];
    stats[idx] = updated;
    updateField('stats', stats);
  };

  const removeStat = (idx) => {
    const stats = [...(section.stats || [])];
    stats.splice(idx, 1);
    updateField('stats', stats);
  };

  return (
    <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-sm">
      {/* Section Header */}
      <div
        onClick={() => onToggle()}
        className="flex items-center justify-between p-4 bg-[#1e3a5f]/5 border-b border-slate-200 cursor-pointer hover:bg-[#1e3a5f]/10"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1e3a5f] rounded-lg flex items-center justify-center text-white font-medium text-sm">
            {index + 1}
          </div>
          <div>
            <p className="font-medium text-slate-800">
              {section.title || `Section ${index + 1}`}
            </p>
            <p className="text-xs text-slate-500">
              {imageCount} images, {chartCount} charts, {textCount + cardCount} content blocks, {statCount} stats
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Section Content */}
      {isExpanded && (
        <div className="p-4 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Section Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={section.title || ''}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g., Fire & Emergency Services"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
            />
          </div>

          {/* Content Elements Section */}
          <div className="border-t border-slate-200 pt-5">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Section Content</h4>

            <div className="space-y-3">
              {/* Images */}
              {section.images?.map((image, idx) => (
                <div
                  key={`img-${idx}`}
                  ref={highlightId === `img-${idx}` ? highlightRef : null}
                  className={highlightId === `img-${idx}` ? 'highlight-new-element rounded-xl' : ''}
                >
                  <ImageWithCaption
                    image={image}
                    index={idx}
                    onChange={(updated) => updateImage(idx, updated)}
                    onRemove={() => removeImage(idx)}
                    isChart={image.isChart}
                  />
                </div>
              ))}

              {/* Text Blocks */}
              {section.textBlocks?.map((content, idx) => (
                <div
                  key={`text-${idx}`}
                  ref={highlightId === `text-${idx}` ? highlightRef : null}
                  className={highlightId === `text-${idx}` ? 'highlight-new-element rounded-xl' : ''}
                >
                  <TextBlock
                    content={content}
                    onChange={(updated) => updateTextBlock(idx, updated)}
                    onRemove={() => removeTextBlock(idx)}
                  />
                </div>
              ))}

              {/* Content Cards */}
              {section.contentCards?.map((card, idx) => (
                <div
                  key={`card-${idx}`}
                  ref={highlightId === `card-${idx}` ? highlightRef : null}
                  className={highlightId === `card-${idx}` ? 'highlight-new-element rounded-xl' : ''}
                >
                  <ContentCard
                    card={card}
                    onChange={(updated) => updateCard(idx, updated)}
                    onRemove={() => removeCard(idx)}
                  />
                </div>
              ))}

              {/* Stats */}
              {section.stats?.map((stat, idx) => (
                <div
                  key={`stat-${idx}`}
                  ref={highlightId === `stat-${idx}` ? highlightRef : null}
                  className={highlightId === `stat-${idx}` ? 'highlight-new-element rounded-xl' : ''}
                >
                  <StatInput
                    stat={stat}
                    onChange={(updated) => updateStat(idx, updated)}
                    onRemove={() => removeStat(idx)}
                  />
                </div>
              ))}

              {/* Empty state */}
              {imageCount === 0 && textCount === 0 && cardCount === 0 && statCount === 0 && (
                <p className="text-sm text-slate-400 italic text-center py-4">
                  No content added yet. Click "Add Element" below to add images, text, cards, or stats.
                </p>
              )}

              {/* Element counter */}
              {totalElements > 0 && (
                <div className="text-xs text-center space-y-0.5">
                  <p className="text-slate-400">{totalElements} element{totalElements !== 1 ? 's' : ''} added — recommended 7–9 per page</p>
                  {totalElements > 9 && (
                    <p className="text-amber-600">Extra elements might be added to an additional page</p>
                  )}
                </div>
              )}

              {/* Add Element Button */}
              <AddElementDropdown
                onAdd={addElement}
                imageCount={imageCount}
                chartCount={chartCount}
                textCount={textCount}
                cardCount={cardCount}
                statCount={statCount}
              />
            </div>
          </div>

          {/* Design Notes */}
          <div className="border-t border-slate-200 pt-5">
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              Notes for Designer <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={section.designNotes || ''}
              onChange={(e) => updateField('designNotes', e.target.value)}
              placeholder="Any layout preferences, special instructions, or context for the designer..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent resize-y"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContentSectionsManager({ sections, onChange }) {
  const [expandedIndex, setExpandedIndex] = useState(0);

  const addSection = () => {
    if (sections.length < 20) {
      const newIndex = sections.length;
      onChange([...sections, { title: '', images: [], textBlocks: [], contentCards: [], stats: [], designNotes: '' }]);
      setExpandedIndex(newIndex);
    }
  };

  const updateSection = (index, updatedSection) => {
    const newSections = [...sections];
    newSections[index] = updatedSection;
    onChange(newSections);
  };

  const removeSection = (index) => {
    const newSections = [...sections];
    newSections.splice(index, 1);
    onChange(newSections);
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
          <Layers className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Content Sections</h2>
          <p className="text-sm text-slate-500">
            Add sections for your report (e.g., Fire Services, Roads, Parks)
          </p>
        </div>
      </div>

      <div className="space-y-8 divide-y divide-slate-200">
        {sections.map((section, index) => (
          <div key={index} className={index > 0 ? 'pt-8' : ''}>
            <ContentSection
              section={section}
              index={index}
              onChange={(updated) => updateSection(index, updated)}
              onRemove={() => removeSection(index)}
              canRemove={sections.length > 1}
              isExpanded={expandedIndex === index}
              onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
            />
          </div>
        ))}
      </div>

      {sections.length < 20 && (
        <button
          type="button"
          onClick={addSection}
          className="w-full py-4 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2d4a6f] transition-colors flex items-center justify-center gap-2 font-medium shadow-md"
        >
          <Plus className="w-5 h-5" />
          Add New Section
        </button>
      )}

      <p className="text-sm text-slate-500 text-center">
        {sections.length} of 20 sections used
      </p>
    </div>
  );
}
