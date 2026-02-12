import React, { useState, useRef, useEffect } from 'react';
import { Type, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Palette, ChevronDown } from 'lucide-react';

const FONTS = [
  { name: 'Instrument Sans', value: '"Instrument Sans", sans-serif' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Times New Roman', value: '"Times New Roman", serif' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
  { name: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { name: 'Palatino', value: '"Palatino Linotype", serif' },
  { name: 'Garamond', value: 'Garamond, serif' },
  { name: 'Courier New', value: '"Courier New", monospace' },
];

const TEXT_COLORS = [
  { name: 'Black', color: '#000000' },
  { name: 'Dark Gray', color: '#4A4A4A' },
  { name: 'Gray', color: '#9B9B9B' },
  { name: 'White', color: '#FFFFFF' },
  { name: 'Red', color: '#D0021B' },
  { name: 'Orange', color: '#F5A623' },
  { name: 'Yellow', color: '#F8E71C' },
  { name: 'Green', color: '#7ED321' },
  { name: 'Blue', color: '#4A90D9' },
  { name: 'Purple', color: '#9013FE' },
  { name: 'Pink', color: '#E91E8C' },
  { name: 'Brown', color: '#8B572A' },
];

const RichTextEditor = ({ content, onChange, placeholder }) => {
  const editorRef = useRef(null);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [currentFont, setCurrentFont] = useState(FONTS[0]);
  const [fontSize, setFontSize] = useState(16);
  const isInitialized = useRef(false);
  const savedSelection = useRef(null);

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      if (content) {
        editorRef.current.innerHTML = content;
      } else {
        editorRef.current.innerHTML = '<p><br></p>';
      }
      isInitialized.current = true;
    }
  }, [content]);

  useEffect(() => {
    const handleDocumentSelectionChange = () => {
      if (editorRef.current) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (editorRef.current.contains(range.commonAncestorContainer)) {
            checkFormatting();
          }
        }
      }
    };
    document.addEventListener('selectionchange', handleDocumentSelectionChange);
    return () => document.removeEventListener('selectionchange', handleDocumentSelectionChange);
  }, []);

  const checkFormatting = () => {
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
    setIsUnderline(document.queryCommandState('underline'));
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      savedSelection.current = selection.getRangeAt(0).cloneRange();
    }
    checkFormatting();
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command, value = null) => {
    if (editorRef.current) editorRef.current.focus();
    if (savedSelection.current) {
      try {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedSelection.current.cloneRange());
      } catch (e) {}
    }
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
      setTimeout(() => { saveSelection(); checkFormatting(); }, 0);
    }
  };

  const handleFormat = (command) => {
    if (editorRef.current) editorRef.current.focus();
    const selection = window.getSelection();
    if (savedSelection.current) {
      try {
        selection.removeAllRanges();
        selection.addRange(savedSelection.current.cloneRange());
      } catch (e) {}
    }
    document.execCommand(command, false, null);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
    setIsUnderline(document.queryCommandState('underline'));
    const currentSelection = window.getSelection();
    if (currentSelection.rangeCount > 0) {
      savedSelection.current = currentSelection.getRangeAt(0).cloneRange();
    }
  };

  const handleSelectionChange = () => { saveSelection(); checkFormatting(); };

  const handleFontChange = (font) => {
    setCurrentFont(font);
    execCommand('fontName', font.value);
    setShowFontMenu(false);
  };

  const handleColorChange = (color) => {
    execCommand('foreColor', color);
    setShowColorMenu(false);
  };

  const handleSizeChange = (size) => {
    setFontSize(size);
    if (editorRef.current) editorRef.current.focus();
    if (savedSelection.current) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedSelection.current);
    }
    document.execCommand('fontSize', false, '4');
    const fontElements = editorRef.current?.querySelectorAll('font[size="4"]');
    fontElements?.forEach(el => {
      el.removeAttribute('size');
      el.style.fontSize = `${size}px`;
    });
    if (editorRef.current) { onChange(editorRef.current.innerHTML); saveSelection(); }
    setShowSizeMenu(false);
  };

  const handleInput = () => {
    if (editorRef.current) { onChange(editorRef.current.innerHTML); checkFormatting(); }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      const toolbar = e.target.closest('.email-rte-toolbar');
      if (!toolbar) {
        setShowFontMenu(false);
        setShowColorMenu(false);
        setShowSizeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToolbarMouseDown = (e) => { e.preventDefault(); };

  const closeAllMenus = () => { setShowFontMenu(false); setShowColorMenu(false); setShowSizeMenu(false); };

  return (
    <div className="bg-white rounded-lg border-2 border-slate-200">
      <div
        className="email-rte-toolbar flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 overflow-visible"
        onMouseDown={handleToolbarMouseDown}
      >
        {/* Font selector */}
        <div className="relative">
          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowFontMenu(!showFontMenu); setShowColorMenu(false); setShowSizeMenu(false); }}
            className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 rounded text-sm hover:bg-slate-100 text-slate-900"
          >
            <Type className="w-4 h-4" />
            <span className="max-w-20 truncate">{currentFont.name}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showFontMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
              {FONTS.map((font) => (
                <button key={font.name} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleFontChange(font); }} className="block w-full text-left px-3 py-2 hover:bg-slate-100 text-sm text-slate-900" style={{ fontFamily: font.value }}>
                  {font.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Font size */}
        <div className="relative">
          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowSizeMenu(!showSizeMenu); setShowFontMenu(false); setShowColorMenu(false); }}
            className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 rounded text-sm hover:bg-slate-100 text-slate-900"
          >
            <span>{fontSize}px</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showSizeMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20" onMouseDown={(e) => e.stopPropagation()}>
              {[12, 14, 16, 18, 20, 24, 28, 32, 36, 48].map((size) => (
                <button key={size} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSizeChange(size); }} className="block w-full text-left px-3 py-2 hover:bg-slate-100 text-sm text-slate-900">
                  {size}px
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        {/* Formatting buttons */}
        <button onMouseDown={(e) => { e.preventDefault(); closeAllMenus(); handleFormat('bold'); }} className={`p-1.5 rounded transition-colors ${isBold ? 'bg-slate-700 text-white' : 'text-slate-700 hover:bg-slate-200'}`} title="Bold">
          <Bold className="w-4 h-4" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); closeAllMenus(); handleFormat('italic'); }} className={`p-1.5 rounded transition-colors ${isItalic ? 'bg-slate-700 text-white' : 'text-slate-700 hover:bg-slate-200'}`} title="Italic">
          <Italic className="w-4 h-4" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); closeAllMenus(); handleFormat('underline'); }} className={`p-1.5 rounded transition-colors ${isUnderline ? 'bg-slate-700 text-white' : 'text-slate-700 hover:bg-slate-200'}`} title="Underline">
          <Underline className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        {/* Color picker */}
        <div className="relative">
          <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowColorMenu(!showColorMenu); setShowFontMenu(false); setShowSizeMenu(false); }} className="p-1.5 text-slate-700 hover:bg-slate-200 rounded flex items-center gap-1">
            <Palette className="w-4 h-4" />
          </button>
          {showColorMenu && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-slate-200 rounded-lg shadow-lg z-20" onMouseDown={(e) => e.stopPropagation()}>
              <div className="grid grid-cols-4 gap-1.5" style={{ width: '140px' }}>
                {TEXT_COLORS.map((item) => (
                  <button key={item.color} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleColorChange(item.color); }} title={item.name} className="w-8 h-8 rounded border-2 border-slate-200 hover:border-slate-400 hover:scale-105 transition-all shadow-sm" style={{ backgroundColor: item.color }} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        {/* Alignment */}
        <button onMouseDown={(e) => { e.preventDefault(); closeAllMenus(); handleFormat('justifyLeft'); }} className="p-1.5 text-slate-700 hover:bg-slate-200 rounded" title="Align Left">
          <AlignLeft className="w-4 h-4" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); closeAllMenus(); handleFormat('justifyCenter'); }} className="p-1.5 text-slate-700 hover:bg-slate-200 rounded" title="Align Center">
          <AlignCenter className="w-4 h-4" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); closeAllMenus(); handleFormat('justifyRight'); }} className="p-1.5 text-slate-700 hover:bg-slate-200 rounded" title="Align Right">
          <AlignRight className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        {/* Lists */}
        <button onMouseDown={(e) => { e.preventDefault(); closeAllMenus(); handleFormat('insertUnorderedList'); }} className="p-1.5 text-slate-700 hover:bg-slate-200 rounded" title="Bullet List">
          <List className="w-4 h-4" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); closeAllMenus(); handleFormat('insertOrderedList'); }} className="p-1.5 text-slate-700 hover:bg-slate-200 rounded" title="Numbered List">
          <ListOrdered className="w-4 h-4" />
        </button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        dir="ltr"
        className="min-h-32 p-4 focus:outline-none text-slate-900"
        style={{ direction: 'ltr', textAlign: 'left', fontSize: '16px', lineHeight: 1.5, color: '#0f172a', fontFamily: '"Instrument Sans", sans-serif' }}
        onInput={handleInput}
        onBlur={saveSelection}
        onMouseUp={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        onSelect={handleSelectionChange}
        onMouseDown={closeAllMenus}
        suppressContentEditableWarning={true}
        data-placeholder={placeholder}
      />
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
        }
        [contenteditable] h1 { font-size: 28px; font-weight: bold; margin: 8px 0; }
        [contenteditable] h2 { font-size: 22px; font-weight: bold; margin: 6px 0; }
        [contenteditable] h3 { font-size: 18px; font-weight: bold; margin: 4px 0; }
        [contenteditable] p { margin: 4px 0; }
        [contenteditable] ul { list-style-type: disc; padding-left: 24px; margin: 4px 0; }
        [contenteditable] ol { list-style-type: decimal; padding-left: 24px; margin: 4px 0; }
        [contenteditable] li { margin: 2px 0; }
        [contenteditable] b, [contenteditable] strong { font-weight: bold !important; }
        [contenteditable] i, [contenteditable] em { font-style: italic !important; }
        [contenteditable] u { text-decoration: underline !important; }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
