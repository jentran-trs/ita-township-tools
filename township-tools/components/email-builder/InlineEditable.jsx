import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Palette, Type, ChevronDown, Link2 } from 'lucide-react';

// ─── Inline Editable Plain Text ─────────────────────────────────────────────
export const EditableText = ({ value, onChange, placeholder, tag: Tag = 'span', className, style }) => {
  const ref = useRef(null);
  const lastValue = useRef(value);

  useEffect(() => {
    if (ref.current && !ref.current.matches(':focus')) {
      ref.current.textContent = value || '';
      lastValue.current = value;
    }
  }, [value]);

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onBlur={() => {
        const newValue = ref.current?.textContent || '';
        if (newValue !== lastValue.current) {
          lastValue.current = newValue;
          onChange(newValue);
        }
      }}
      data-placeholder={placeholder}
      className={`outline-none cursor-text inline-editable-text ${className || ''}`}
      style={{ ...style, minWidth: '20px' }}
    />
  );
};

// ─── Inline Editable Rich Text ──────────────────────────────────────────────
export const EditableRichText = ({ value, onChange, placeholder, className, style, onFocus }) => {
  const ref = useRef(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (ref.current && !isInitialized.current) {
      ref.current.innerHTML = value || '';
      isInitialized.current = true;
    }
  }, []);

  // Update content when value changes externally (e.g. loading template)
  useEffect(() => {
    if (ref.current && !ref.current.matches(':focus') && isInitialized.current) {
      const currentHtml = ref.current.innerHTML;
      if (currentHtml !== value) {
        ref.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleInput = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onFocus={onFocus}
      data-placeholder={placeholder}
      className={`outline-none cursor-text inline-editable-rich ${className || ''}`}
      style={{ minHeight: '1.5em', lineHeight: 1.6, ...style }}
    />
  );
};

// ─── Floating Rich Text Toolbar ─────────────────────────────────────────────
const FONTS = [
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Times New Roman', value: '"Times New Roman", serif' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
  { name: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
];

const TEXT_COLORS = [
  '#000000', '#4A4A4A', '#9B9B9B', '#D0021B', '#F5A623', '#7ED321', '#4A90D9', '#9013FE', '#E91E8C', '#8B572A',
];

export const RichTextToolbar = ({ visible }) => {
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);

  const checkFormatting = useCallback(() => {
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
    setIsUnderline(document.queryCommandState('underline'));
  }, []);

  useEffect(() => {
    if (visible) {
      const handler = () => checkFormatting();
      document.addEventListener('selectionchange', handler);
      return () => document.removeEventListener('selectionchange', handler);
    }
  }, [visible, checkFormatting]);

  if (!visible) return null;

  const exec = (command, value = null) => {
    document.execCommand(command, false, value);
    checkFormatting();
  };

  const preventBlur = (e) => e.preventDefault();

  return (
    <div
      className="flex items-center gap-0.5 px-2 py-1.5 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
      onMouseDown={preventBlur}
    >
      {/* Font selector */}
      <div className="relative">
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowFontMenu(!showFontMenu); setShowColorMenu(false); }}
          className="flex items-center gap-0.5 px-1.5 py-1 border border-gray-200 rounded text-xs hover:bg-gray-100 text-gray-700"
        >
          <Type className="w-3 h-3" />
          <ChevronDown className="w-2.5 h-2.5" />
        </button>
        {showFontMenu && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px]">
            {FONTS.map(f => (
              <button key={f.name} onMouseDown={(e) => { e.preventDefault(); exec('fontName', f.value); setShowFontMenu(false); }}
                className="block w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs text-gray-700" style={{ fontFamily: f.value }}>
                {f.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-gray-200 mx-0.5" />

      <button onMouseDown={(e) => { e.preventDefault(); exec('bold'); }}
        className={`p-1 rounded ${isBold ? 'bg-gray-700 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button onMouseDown={(e) => { e.preventDefault(); exec('italic'); }}
        className={`p-1 rounded ${isItalic ? 'bg-gray-700 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
        <Italic className="w-3.5 h-3.5" />
      </button>
      <button onMouseDown={(e) => { e.preventDefault(); exec('underline'); }}
        className={`p-1 rounded ${isUnderline ? 'bg-gray-700 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
        <Underline className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-5 bg-gray-200 mx-0.5" />

      {/* Color */}
      <div className="relative">
        <button onMouseDown={(e) => { e.preventDefault(); setShowColorMenu(!showColorMenu); setShowFontMenu(false); }}
          className="p-1 text-gray-600 hover:bg-gray-100 rounded">
          <Palette className="w-3.5 h-3.5" />
        </button>
        {showColorMenu && (
          <div className="absolute top-full left-0 mt-1 p-1.5 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="grid grid-cols-5 gap-1" style={{ width: '110px' }}>
              {TEXT_COLORS.map(c => (
                <button key={c} onMouseDown={(e) => { e.preventDefault(); exec('foreColor', c); setShowColorMenu(false); }}
                  className="w-5 h-5 rounded border border-gray-200 hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-gray-200 mx-0.5" />

      <button onMouseDown={(e) => { e.preventDefault(); exec('justifyLeft'); }} className="p-1 text-gray-600 hover:bg-gray-100 rounded">
        <AlignLeft className="w-3.5 h-3.5" />
      </button>
      <button onMouseDown={(e) => { e.preventDefault(); exec('justifyCenter'); }} className="p-1 text-gray-600 hover:bg-gray-100 rounded">
        <AlignCenter className="w-3.5 h-3.5" />
      </button>
      <button onMouseDown={(e) => { e.preventDefault(); exec('justifyRight'); }} className="p-1 text-gray-600 hover:bg-gray-100 rounded">
        <AlignRight className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-5 bg-gray-200 mx-0.5" />

      <button onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList'); }} className="p-1 text-gray-600 hover:bg-gray-100 rounded">
        <List className="w-3.5 h-3.5" />
      </button>
      <button onMouseDown={(e) => { e.preventDefault(); exec('insertOrderedList'); }} className="p-1 text-gray-600 hover:bg-gray-100 rounded">
        <ListOrdered className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-5 bg-gray-200 mx-0.5" />

      <button onMouseDown={(e) => {
        e.preventDefault();
        const url = prompt('Enter URL:');
        if (url) exec('createLink', url);
      }} className="p-1 text-gray-600 hover:bg-gray-100 rounded" title="Insert link">
        <Link2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// ─── Compact Config Input (for URLs, settings etc.) ─────────────────────────
export const ConfigInput = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <label className="block text-[10px] font-medium text-gray-400 mb-0.5">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onClick={(e) => e.stopPropagation()}
      className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-gray-800 text-xs placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
    />
  </div>
);

// ─── Config Panel Wrapper ───────────────────────────────────────────────────
export const ConfigPanel = ({ children, visible }) => {
  if (!visible) return null;
  return (
    <div
      className="bg-gray-50/95 backdrop-blur-sm border-t border-gray-200 px-6 py-3 space-y-2"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
};
