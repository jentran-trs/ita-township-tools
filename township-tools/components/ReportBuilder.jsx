import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, Upload, Image, FileText, BarChart3, Trash2, Move, GripVertical, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Eye, Pencil, Download, Save, FolderOpen, Type, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Palette, Square, Circle, RectangleHorizontal, ZoomIn, ZoomOut, RotateCw, Check, X, Settings, Layers, PanelTop, PanelBottom, Mail, Layout, Maximize2, Minimize2, Undo2, Redo2, Hash, Menu, ArrowRightLeft, MessageSquare } from 'lucide-react';

// Color extraction utility - returns hex colors
const rgbToHex = (r, g, b) => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.min(255, Math.max(0, Math.round(x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

// Ensure color is valid hex format
const ensureHexColor = (color, fallback = '#2B3E50') => {
  if (!color) return fallback;
  // If already valid hex
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color;
  // Try to parse rgb format
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return rgbToHex(parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3]));
  }
  return fallback;
};

const DEFAULT_THEME_COLORS = {
  primary: '#2B3E50',
  primaryDark: '#1a2633',
  accent: '#C1272D',
  gold: '#D4B896',
};

const extractColorsFromImage = (imageElement) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const size = 100;
  canvas.width = size;
  canvas.height = size;
  ctx.drawImage(imageElement, 0, 0, size, size);
  
  const imageData = ctx.getImageData(0, 0, size, size).data;
  
  // Collect colors with finer quantization for better accuracy
  const colorBuckets = {};
  
  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const a = imageData[i + 3];
    
    // Skip transparent pixels
    if (a < 128) continue;
    
    // Use finer quantization (16 instead of 32) for better color accuracy
    const quantR = Math.round(r / 16) * 16;
    const quantG = Math.round(g / 16) * 16;
    const quantB = Math.round(b / 16) * 16;
    
    const key = `${quantR},${quantG},${quantB}`;
    
    if (!colorBuckets[key]) {
      colorBuckets[key] = { totalR: 0, totalG: 0, totalB: 0, count: 0 };
    }
    // Accumulate actual color values for averaging later
    colorBuckets[key].totalR += r;
    colorBuckets[key].totalG += g;
    colorBuckets[key].totalB += b;
    colorBuckets[key].count += 1;
  }
  
  // Calculate brightness/luminance for a color
  const getBrightness = (r, g, b) => (r * 299 + g * 587 + b * 114) / 1000;
  
  // Calculate saturation (how colorful vs gray)
  const getSaturation = (r, g, b) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === 0) return 0;
    return (max - min) / max;
  };
  
  // Check if a color is neutral (gray/white/black)
  const isNeutral = (r, g, b) => {
    const saturation = getSaturation(r, g, b);
    return saturation < 0.15; // Less than 15% saturation = neutral
  };
  
  // Check if a color is warm (reddish, orange, yellow, gold)
  const isWarm = (r, g, b) => {
    return r > b && (r > g * 0.8 || g > b); // More red than blue, warm tone
  };
  
  // Convert buckets to averaged colors, sorted by frequency
  const colors = Object.values(colorBuckets)
    .filter(bucket => bucket.count > 10) // Filter out noise
    .map(bucket => {
      // Use actual averaged color values, not quantized
      const r = Math.round(bucket.totalR / bucket.count);
      const g = Math.round(bucket.totalG / bucket.count);
      const b = Math.round(bucket.totalB / bucket.count);
      return { 
        r, g, b, 
        brightness: getBrightness(r, g, b), 
        saturation: getSaturation(r, g, b),
        isNeutral: isNeutral(r, g, b),
        isWarm: isWarm(r, g, b),
        count: bucket.count 
      };
    })
    .filter(c => c.brightness > 10 && c.brightness < 250) // Filter near-white/black
    .sort((a, b) => b.count - a.count) // Sort by frequency
    .slice(0, 25); // Take top 25 colors
  
  // If we don't have enough colors, return defaults
  if (colors.length < 3) {
    return DEFAULT_THEME_COLORS;
  }
  
  // Calculate color distance (considers both brightness and hue)
  const getColorDistance = (c1, c2) => {
    const rDiff = Math.abs(c1.r - c2.r);
    const gDiff = Math.abs(c1.g - c2.g);
    const bDiff = Math.abs(c1.b - c2.b);
    return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
  };
  
  const MIN_DISTANCE = 50; // Minimum color distance for distinctness
  
  // 1. PRIMARY = Darkest color (can be neutral like navy blue)
  const sortedByBrightness = [...colors].sort((a, b) => a.brightness - b.brightness);
  const primary = sortedByBrightness[0];
  
  // 2. ACCENT = Most saturated dark-to-mid color (skip neutrals)
  const saturatedColors = colors
    .filter(c => !c.isNeutral && c.brightness < 180) // Colorful, not too bright
    .filter(c => getColorDistance(c, primary) > MIN_DISTANCE) // Distinct from primary
    .sort((a, b) => b.saturation - a.saturation); // Most saturated first
  
  const accent = saturatedColors[0] || 
    colors.filter(c => getColorDistance(c, primary) > MIN_DISTANCE)[0] ||
    sortedByBrightness[1] || 
    { r: 193, g: 39, b: 45 };
  
  // 3. HIGHLIGHT = Brightest warm color (gold/tan preferred), skip neutrals
  const warmBrightColors = colors
    .filter(c => !c.isNeutral && c.isWarm && c.brightness > 120) // Warm and bright
    .filter(c => getColorDistance(c, primary) > MIN_DISTANCE)
    .filter(c => getColorDistance(c, accent) > MIN_DISTANCE)
    .sort((a, b) => b.brightness - a.brightness); // Brightest first
  
  // Fallback to any bright saturated color if no warm colors found
  const brightSaturatedColors = colors
    .filter(c => !c.isNeutral && c.brightness > 150)
    .filter(c => getColorDistance(c, primary) > MIN_DISTANCE)
    .filter(c => getColorDistance(c, accent) > MIN_DISTANCE)
    .sort((a, b) => b.brightness - a.brightness);
  
  const highlight = warmBrightColors[0] || 
    brightSaturatedColors[0] ||
    colors.filter(c => c.brightness > 150 && getColorDistance(c, primary) > MIN_DISTANCE && getColorDistance(c, accent) > MIN_DISTANCE)[0] ||
    { r: 212, g: 184, b: 150 };
  
  return {
    primary: rgbToHex(primary.r, primary.g, primary.b),
    primaryDark: rgbToHex(Math.max(0, primary.r - 20), Math.max(0, primary.g - 20), Math.max(0, primary.b - 20)),
    accent: rgbToHex(accent.r, accent.g, accent.b),
    gold: rgbToHex(highlight.r, highlight.g, highlight.b),
  };
};

// Font options
const FONTS = [
  { name: 'Instrument Sans', value: '"Instrument Sans", sans-serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Times New Roman', value: '"Times New Roman", serif' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
  { name: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { name: 'Palatino', value: '"Palatino Linotype", serif' },
  { name: 'Garamond', value: 'Garamond, serif' },
  { name: 'Courier New', value: '"Courier New", monospace' },
  { name: 'Impact', value: 'Impact, sans-serif' },
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

// Generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Image Editor Component
// Rich Text Editor Component
const RichTextEditor = ({ content, onChange, themeColors, maxHeight, defaultFontSize, initialLineSpacing, initialParagraphSpacing, onSpacingChange }) => {
  const editorRef = useRef(null);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showSpacingMenu, setShowSpacingMenu] = useState(false);
  const [currentFont, setCurrentFont] = useState(FONTS[0]);
  const [fontSize, setFontSize] = useState(defaultFontSize ? parseInt(defaultFontSize) : 16);
  const [lineSpacing, setLineSpacing] = useState(initialLineSpacing || 1.4);
  const [paragraphSpacing, setParagraphSpacing] = useState(initialParagraphSpacing || 2);
  const isInitialized = useRef(false);
  const savedSelection = useRef(null);
  
  // Track active formatting states
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const spacingInitialized = useRef(false);
  
  // Notify parent of spacing changes (only after initial render)
  useEffect(() => {
    if (!spacingInitialized.current) {
      spacingInitialized.current = true;
      return;
    }
    if (onSpacingChange) {
      onSpacingChange(lineSpacing, paragraphSpacing);
    }
  }, [lineSpacing, paragraphSpacing]);

  // Only set initial content once
  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      if (content) {
        editorRef.current.innerHTML = content;
      } else {
        // Set a default paragraph if empty to help with formatting
        editorRef.current.innerHTML = '<p><br></p>';
      }
      isInitialized.current = true;
    }
  }, [content]);

  // Listen for selection changes
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
    return () => {
      document.removeEventListener('selectionchange', handleDocumentSelectionChange);
    };
  }, []);

  // Check current formatting state
  const checkFormatting = () => {
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
    setIsUnderline(document.queryCommandState('underline'));
  };

  // Save selection and content when editor loses focus
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      savedSelection.current = selection.getRangeAt(0).cloneRange();
    }
    checkFormatting();
    // Also save content on blur to ensure changes are persisted
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command, value = null) => {
    // Focus the editor first
    if (editorRef.current) {
      editorRef.current.focus();
    }
    
    // Restore selection if we have one saved
    if (savedSelection.current) {
      try {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedSelection.current.cloneRange());
      } catch (e) {
        // Selection might be invalid, continue anyway
      }
    }
    
    // Execute the command
    document.execCommand(command, false, value);
    
    // Update content after command
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
      // Save the new selection and check formatting
      setTimeout(() => {
        saveSelection();
        checkFormatting();
      }, 0);
    }
  };

  const handleFormat = (command) => {
    // Focus editor
    if (editorRef.current) {
      editorRef.current.focus();
    }
    
    // Get current selection
    const selection = window.getSelection();
    
    // Restore selection if we have one saved and current selection is collapsed or empty
    if (savedSelection.current) {
      try {
        selection.removeAllRanges();
        selection.addRange(savedSelection.current.cloneRange());
      } catch (e) {
        // Continue anyway
      }
    }
    
    // Toggle formatting using execCommand (this naturally toggles on/off)
    document.execCommand(command, false, null);
    
    // Update content
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    
    // Immediately update the formatting state
    const newBold = document.queryCommandState('bold');
    const newItalic = document.queryCommandState('italic');
    const newUnderline = document.queryCommandState('underline');
    
    setIsBold(newBold);
    setIsItalic(newItalic);
    setIsUnderline(newUnderline);
    
    // Save selection for future use
    const currentSelection = window.getSelection();
    if (currentSelection.rangeCount > 0) {
      savedSelection.current = currentSelection.getRangeAt(0).cloneRange();
    }
  };

  const handleSelectionChange = () => {
    saveSelection();
    checkFormatting();
  };

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
    
    // Focus and restore selection
    if (editorRef.current) {
      editorRef.current.focus();
    }
    if (savedSelection.current) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedSelection.current);
    }
    
    document.execCommand('fontSize', false, '4');
    // Apply custom size via span
    const fontElements = editorRef.current?.querySelectorAll('font[size="4"]');
    fontElements?.forEach(el => {
      el.removeAttribute('size');
      el.style.fontSize = `${size}px`;
    });
    
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
      saveSelection();
    }
    setShowSizeMenu(false); setShowSpacingMenu(false);
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
      checkFormatting();
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      const toolbar = document.querySelector('.rich-text-toolbar');
      if (toolbar && !toolbar.contains(e.target)) {
        setShowFontMenu(false);
        setShowColorMenu(false);
        setShowSizeMenu(false); setShowSpacingMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToolbarMouseDown = (e) => {
    // Prevent the toolbar button from stealing focus
    e.preventDefault();
  };

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200">
      <div 
        className="rich-text-toolbar flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 overflow-visible"
        onMouseDown={handleToolbarMouseDown}
      >
        {/* Font selector */}
        <div className="relative">
          <button
            onMouseDown={(e) => { 
              e.preventDefault(); 
              e.stopPropagation();
              setShowFontMenu(!showFontMenu); 
              setShowColorMenu(false);
              setShowSizeMenu(false); setShowSpacingMenu(false);
            }}
            className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 rounded text-sm hover:bg-slate-100 text-slate-900"
          >
            <Type className="w-4 h-4" />
            <span className="max-w-20 truncate text-slate-900">{currentFont.name}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showFontMenu && (
            <div 
              className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {FONTS.map((font) => (
                <button
                  key={font.name}
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleFontChange(font); }}
                  className="block w-full text-left px-3 py-2 hover:bg-slate-100 text-sm text-slate-900"
                  style={{ fontFamily: font.value, color: '#0f172a' }}
                >
                  {font.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Font size */}
        <div className="relative">
          <button
            onMouseDown={(e) => { 
              e.preventDefault(); 
              e.stopPropagation();
              setShowSizeMenu(!showSizeMenu); 
              setShowFontMenu(false);
              setShowColorMenu(false);
            }}
            className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 rounded text-sm hover:bg-slate-100 text-slate-900"
          >
            <span className="text-slate-900">{fontSize}px</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showSizeMenu && (
            <div 
              className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {[12, 14, 16, 18, 20, 24, 28, 32, 36, 48].map((size) => (
                <button
                  key={size}
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSizeChange(size); }}
                  className="block w-full text-left px-3 py-2 hover:bg-slate-100 text-sm text-slate-900"
                  style={{ color: '#0f172a' }}
                >
                  {size}px
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        {/* Formatting buttons */}
        <button 
          onMouseDown={(e) => { 
            e.preventDefault(); 
            setShowFontMenu(false);
            setShowColorMenu(false);
            setShowSizeMenu(false); setShowSpacingMenu(false);
            handleFormat('bold'); 
          }} 
          className={`p-1.5 rounded transition-colors ${isBold ? 'bg-slate-700 text-white' : 'text-slate-700 hover:bg-slate-200'}`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button 
          onMouseDown={(e) => { 
            e.preventDefault(); 
            setShowFontMenu(false);
            setShowColorMenu(false);
            setShowSizeMenu(false); setShowSpacingMenu(false);
            handleFormat('italic'); 
          }} 
          className={`p-1.5 rounded transition-colors ${isItalic ? 'bg-slate-700 text-white' : 'text-slate-700 hover:bg-slate-200'}`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button 
          onMouseDown={(e) => { 
            e.preventDefault(); 
            setShowFontMenu(false);
            setShowColorMenu(false);
            setShowSizeMenu(false); setShowSpacingMenu(false);
            handleFormat('underline'); 
          }} 
          className={`p-1.5 rounded transition-colors ${isUnderline ? 'bg-slate-700 text-white' : 'text-slate-700 hover:bg-slate-200'}`}
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        {/* Color picker */}
        <div className="relative">
          <button
            onMouseDown={(e) => { 
              e.preventDefault(); 
              e.stopPropagation();
              setShowColorMenu(!showColorMenu); 
              setShowFontMenu(false);
              setShowSizeMenu(false); setShowSpacingMenu(false);
            }}
            className="p-1.5 text-slate-700 hover:bg-slate-200 rounded flex items-center gap-1"
          >
            <Palette className="w-4 h-4" />
          </button>
          {showColorMenu && (
            <div 
              className="absolute top-full left-0 mt-1 p-2 bg-white border border-slate-200 rounded-lg shadow-lg z-20"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-4 gap-1.5" style={{ width: '140px' }}>
                {TEXT_COLORS.map((item) => (
                  <button
                    key={item.color}
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleColorChange(item.color); }}
                    title={item.name}
                    className="w-8 h-8 rounded border-2 border-slate-200 hover:border-slate-400 hover:scale-105 transition-all shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        {/* Alignment */}
        <button 
          onMouseDown={(e) => { 
            e.preventDefault(); 
            setShowFontMenu(false);
            setShowColorMenu(false);
            setShowSizeMenu(false); setShowSpacingMenu(false);
            handleFormat('justifyLeft'); 
          }} 
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded"
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button 
          onMouseDown={(e) => { 
            e.preventDefault(); 
            setShowFontMenu(false);
            setShowColorMenu(false);
            setShowSizeMenu(false); setShowSpacingMenu(false);
            handleFormat('justifyCenter'); 
          }} 
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded"
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button 
          onMouseDown={(e) => { 
            e.preventDefault(); 
            setShowFontMenu(false);
            setShowColorMenu(false);
            setShowSizeMenu(false); setShowSpacingMenu(false);
            handleFormat('justifyRight'); 
          }} 
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded"
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        {/* Lists and headings */}
        <button 
          onMouseDown={(e) => { 
            e.preventDefault(); 
            setShowFontMenu(false);
            setShowColorMenu(false);
            setShowSizeMenu(false); setShowSpacingMenu(false);
            handleFormat('insertUnorderedList'); 
          }} 
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button 
          onMouseDown={(e) => { 
            e.preventDefault(); 
            setShowFontMenu(false);
            setShowColorMenu(false);
            setShowSizeMenu(false); setShowSpacingMenu(false);
            handleFormat('insertOrderedList'); 
          }} 
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <select
          onMouseDown={(e) => { 
            e.stopPropagation(); 
            setShowFontMenu(false);
            setShowColorMenu(false);
            setShowSizeMenu(false); setShowSpacingMenu(false);
            setShowSpacingMenu(false);
          }}
          onChange={(e) => { 
            if (e.target.value) {
              execCommand('formatBlock', e.target.value); 
              e.target.value = '';
            }
          }}
          className="px-2 py-1 bg-white border border-slate-300 rounded text-sm text-slate-900"
          defaultValue=""
          style={{ color: '#0f172a' }}
        >
          <option value="" disabled style={{ color: '#0f172a' }}>Format</option>
          <option value="p" style={{ color: '#0f172a' }}>Paragraph</option>
          <option value="h1" style={{ color: '#0f172a' }}>Heading 1</option>
          <option value="h2" style={{ color: '#0f172a' }}>Heading 2</option>
          <option value="h3" style={{ color: '#0f172a' }}>Heading 3</option>
          <option value="h4" style={{ color: '#0f172a' }}>Heading 4</option>
        </select>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        {/* Spacing controls */}
        <div className="relative" style={{ overflow: 'visible' }}>
          <button
            onMouseDown={(e) => { 
              e.preventDefault(); 
              e.stopPropagation();
              setShowSpacingMenu(!showSpacingMenu); 
              setShowFontMenu(false);
              setShowColorMenu(false);
              setShowSizeMenu(false);
            }}
            className="px-2 py-1 text-slate-700 hover:bg-slate-200 rounded flex items-center gap-1 text-sm"
            title="Line & Paragraph Spacing"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
              <path d="M7 3v3M7 18v3M17 3v3M17 18v3" strokeWidth="1.5" />
            </svg>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showSpacingMenu && (
            <div 
              className="absolute top-full right-0 mt-1 p-3 bg-white border border-slate-200 rounded-lg shadow-xl w-48"
              style={{ zIndex: 9999 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="mb-3">
                <label className="text-xs font-medium text-slate-600 block mb-1">Line Spacing</label>
                <select
                  value={lineSpacing}
                  onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-sm text-slate-900"
                  style={{ color: '#0f172a' }}
                >
                  <option value="1" style={{ color: '#0f172a' }}>Single (1.0)</option>
                  <option value="1.15" style={{ color: '#0f172a' }}>1.15</option>
                  <option value="1.4" style={{ color: '#0f172a' }}>1.4</option>
                  <option value="1.5" style={{ color: '#0f172a' }}>1.5</option>
                  <option value="2" style={{ color: '#0f172a' }}>Double (2.0)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Paragraph Spacing</label>
                <select
                  value={paragraphSpacing}
                  onChange={(e) => setParagraphSpacing(parseInt(e.target.value))}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-sm text-slate-900"
                  style={{ color: '#0f172a' }}
                >
                  <option value="0" style={{ color: '#0f172a' }}>None</option>
                  <option value="2" style={{ color: '#0f172a' }}>Compact</option>
                  <option value="4" style={{ color: '#0f172a' }}>Small</option>
                  <option value="8" style={{ color: '#0f172a' }}>Medium</option>
                  <option value="12" style={{ color: '#0f172a' }}>Large</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable
        dir="ltr"
        className="min-h-32 p-4 focus:outline-none text-slate-900"
        style={{
          direction: 'ltr',
          textAlign: 'left',
          fontSize: defaultFontSize || '16px',
          lineHeight: lineSpacing,
          maxHeight: maxHeight ? `${maxHeight}px` : 'none',
          overflowY: maxHeight ? 'auto' : 'visible',
          color: '#0f172a',
          fontFamily: '"Instrument Sans", sans-serif'
        }}
        onInput={handleInput}
        onBlur={saveSelection}
        onMouseUp={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        onSelect={handleSelectionChange}
        onMouseDown={() => {
          setShowFontMenu(false);
          setShowColorMenu(false);
          setShowSizeMenu(false); setShowSpacingMenu(false);
          setShowSpacingMenu(false);
        }}
        suppressContentEditableWarning={true}
      />
      <style>{`
        [contenteditable] { line-height: ${lineSpacing}; font-family: "Instrument Sans", sans-serif; }
        [contenteditable] h1 { font-size: 32px; font-weight: bold; margin: ${paragraphSpacing * 2}px 0 ${paragraphSpacing}px 0; }
        [contenteditable] h2 { font-size: 26px; font-weight: bold; margin: ${paragraphSpacing * 1.5}px 0 ${paragraphSpacing * 0.75}px 0; }
        [contenteditable] h3 { font-size: 22px; font-weight: bold; margin: ${paragraphSpacing}px 0 ${paragraphSpacing * 0.5}px 0; }
        [contenteditable] h4 { font-size: 18px; font-weight: bold; margin: ${paragraphSpacing * 0.75}px 0 ${paragraphSpacing * 0.375}px 0; }
        [contenteditable] p { margin: ${paragraphSpacing}px 0; }
        [contenteditable] ul { list-style-type: disc; padding-left: 24px; margin: ${paragraphSpacing}px 0; }
        [contenteditable] ol { list-style-type: decimal; padding-left: 24px; margin: ${paragraphSpacing}px 0; }
        [contenteditable] li { margin: ${Math.max(1, paragraphSpacing / 2)}px 0; }
        [contenteditable] b, [contenteditable] strong { font-weight: bold !important; }
        [contenteditable] i, [contenteditable] em { font-style: italic !important; }
        [contenteditable] u { text-decoration: underline !important; }
        [contenteditable] span[style*="underline"] { text-decoration: underline !important; }
      `}</style>
    </div>
  );
};

// Image Frame Component
const ImageFrame = ({ imageData, onUpdate, onDelete, onMove, targetSections, themeColors, editable = true, canvasWidth = 1000, canvasMaxHeight = 1100, lightBackground = false }) => {
  const [frameWidth, setFrameWidth] = useState(imageData.width || 300);
  const [frameHeight, setFrameHeight] = useState(imageData.height || 200);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, posX: 0, posY: 0 });
  const [position, setPosition] = useState({ x: imageData.posX || 0, y: imageData.posY || 0 });
  const [isLoading, setIsLoading] = useState(false);
  
  // Image repositioning state
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [repoStart, setRepoStart] = useState({ y: 0, offsetY: 0 });
  const [imageOffsetY, setImageOffsetY] = useState(imageData.offsetY || 0);
  const [maxOffsetY, setMaxOffsetY] = useState(0);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  const fileInputRef = useRef(null);
  const frameRef = useRef(null);

  const GRID_SIZE = 20;
  const snapToGrid = (value) => Math.round(value / GRID_SIZE) * GRID_SIZE;

  // Sync with props when image dimensions change externally
  useEffect(() => {
    if (!isResizing) {
      setFrameWidth(imageData.width || 300);
      setFrameHeight(imageData.height || 200);
    }
  }, [imageData.width, imageData.height, isResizing]);

  useEffect(() => {
    if (!isDragging) {
      setPosition({ x: imageData.posX || 0, y: imageData.posY || 0 });
    }
  }, [imageData.posX, imageData.posY, isDragging]);

  useEffect(() => {
    setImageOffsetY(imageData.offsetY || 0);
  }, [imageData.offsetY]);

  // Calculate max offset when image dimensions or frame size changes
  useEffect(() => {
    if (imageDimensions.width > 0 && imageDimensions.height > 0) {
      const imgAspect = imageDimensions.width / imageDimensions.height;
      const frameAspect = frameWidth / frameHeight;
      // For cover: image fills width when it's taller relative to frame (imgAspect <= frameAspect)
      const fillsWidth = imgAspect <= frameAspect;

      let overflow = 0;
      if (fillsWidth) {
        // Image fills width, height overflows → vertical panning available
        const displayedHeight = frameWidth * (imageDimensions.height / imageDimensions.width);
        overflow = Math.max(0, displayedHeight - frameHeight);
      }
      // When image fills height (wider image), no vertical overflow

      setMaxOffsetY(overflow / 2);

      // Clamp current offset if it exceeds new max
      if (Math.abs(imageOffsetY) > overflow / 2) {
        const clampedOffset = Math.max(-overflow / 2, Math.min(overflow / 2, imageOffsetY));
        setImageOffsetY(clampedOffset);
        onUpdate({ ...imageData, offsetY: clampedOffset });
      }
    }
  }, [imageDimensions, frameWidth, frameHeight]);

  const handleImageLoad = (e) => {
    setImageDimensions({
      width: e.target.naturalWidth,
      height: e.target.naturalHeight
    });
  };

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY, width: frameWidth, height: frameHeight });
  };

  const handleDragStart = (e) => {
    if (!editable) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, posX: position.x, posY: position.y });
  };

  const handleImageRepoStart = (e) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    setIsRepositioning(true);
    setRepoStart({ y: e.clientY, offsetY: imageOffsetY });
  };

  useEffect(() => {
    const handleResizeMove = (e) => {
      if (!isResizing) return;
      let newWidth = Math.max(100, resizeStart.width + (e.clientX - resizeStart.x));
      let newHeight = Math.max(100, resizeStart.height + (e.clientY - resizeStart.y));
      // Constrain width so right edge doesn't exceed canvas
      const maxWidth = canvasWidth - position.x;
      newWidth = Math.min(newWidth, maxWidth);
      // Constrain height so bottom of frame doesn't exceed page (captions can overflow)
      const maxHeight = Math.max(100, canvasMaxHeight - position.y);
      newHeight = Math.min(newHeight, maxHeight);
      setFrameWidth(snapToGrid(newWidth));
      setFrameHeight(snapToGrid(newHeight));
    };

    const handleResizeEnd = () => {
      if (isResizing) {
        setIsResizing(false);
        onUpdate({ ...imageData, width: snapToGrid(frameWidth), height: snapToGrid(frameHeight) });
      }
    };

    const handleDragMove = (e) => {
      if (!isDragging) return;
      const newX = snapToGrid(dragStart.posX + (e.clientX - dragStart.x));
      const newY = snapToGrid(dragStart.posY + (e.clientY - dragStart.y));
      // Constrain to canvas bounds (captions can overflow below)
      const maxX = Math.max(0, canvasWidth - frameWidth);
      const maxY = Math.max(0, canvasMaxHeight - frameHeight);
      setPosition({ x: Math.max(0, Math.min(maxX, newX)), y: Math.max(0, Math.min(maxY, newY)) });
    };

    const handleDragEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        onUpdate({ ...imageData, posX: position.x, posY: position.y });
      }
    };

    const handleRepoMove = (e) => {
      if (!isRepositioning) return;
      const deltaY = e.clientY - repoStart.y;
      const newOffsetY = repoStart.offsetY + deltaY;
      // Clamp to valid range
      const clampedOffset = Math.max(-maxOffsetY, Math.min(maxOffsetY, newOffsetY));
      setImageOffsetY(clampedOffset);
    };

    const handleRepoEnd = () => {
      if (isRepositioning) {
        setIsRepositioning(false);
        onUpdate({ ...imageData, offsetY: imageOffsetY });
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    }

    if (isRepositioning) {
      document.addEventListener('mousemove', handleRepoMove);
      document.addEventListener('mouseup', handleRepoEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('mousemove', handleRepoMove);
      document.removeEventListener('mouseup', handleRepoEnd);
    };
  }, [isResizing, isDragging, isRepositioning, resizeStart, dragStart, repoStart, frameWidth, frameHeight, position, imageOffsetY, maxOffsetY, imageData, onUpdate, canvasWidth, canvasMaxHeight]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdate({ ...imageData, src: event.target.result, offsetY: 0 });
        setIsLoading(false);
      };
      reader.onerror = () => {
        setIsLoading(false);
        alert('Error loading image. Please try again.');
      };
      reader.readAsDataURL(file);
    }
  };

  const getFrameStyle = () => {
    const base = {
      width: `${frameWidth}px`,
      height: `${frameHeight}px`,
      border: `3px solid ${themeColors?.gold || '#D4B896'}`,
      overflow: 'hidden',
    };
    
    switch (imageData.shape) {
      case 'circle':
        return { ...base, borderRadius: '50%', width: `${Math.min(frameWidth, frameHeight)}px`, height: `${Math.min(frameWidth, frameHeight)}px` };
      case 'rectangle':
        return { ...base, borderRadius: '8px' };
      default:
        return { ...base, borderRadius: '8px', aspectRatio: '1/1' };
    }
  };

  return (
    <div 
      className="absolute group"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        boxShadow: isDragging ? '0 10px 40px rgba(0,0,0,0.3)' : 'none',
        zIndex: isDragging || isRepositioning ? 100 : 1
      }}
    >
      <div 
        ref={frameRef}
        style={getFrameStyle()} 
        className={`relative bg-slate-100 ${editable ? 'cursor-move' : ''}`}
        onMouseDown={handleDragStart}
      >
        {imageData.src ? (
          <>
            <div className={`absolute inset-0 overflow-hidden ${editable ? 'pointer-events-none' : ''}`}>
              {(() => {
                // Calculate cover-style sizing without object-fit (html2canvas compatible)
                const hasValidDimensions = imageDimensions.width > 0 && imageDimensions.height > 0;
                const imgAspect = hasValidDimensions ? imageDimensions.width / imageDimensions.height : 1;
                const frameAspect = frameWidth / frameHeight;
                // "Cover" = fill so image always covers the frame completely
                // Taller image (imgAspect <= frameAspect): fill width, height overflows
                // Wider image (imgAspect > frameAspect): fill height, width overflows
                const fillWidth = !hasValidDimensions || imgAspect <= frameAspect;
                return (
                  <img
                    src={imageData.src}
                    alt=""
                    className="absolute select-none pointer-events-none"
                    style={{
                      ...(fillWidth
                        ? { width: '100%', height: 'auto', left: '0', top: '50%', transform: `translateY(calc(-50% + ${imageOffsetY}px))` }
                        : { height: '100%', width: 'auto', top: '50%', left: '50%', transform: `translate(-50%, calc(-50% + ${imageOffsetY}px))` }
                      ),
                    }}
                    onLoad={handleImageLoad}
                    draggable={false}
                  />
                );
              })()}
            </div>
            {/* Loading overlay when replacing image */}
            {isLoading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-40">
                <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin mb-2" />
                <span className="text-sm text-white">Loading...</span>
              </div>
            )}
            {/* Always-visible drag handle indicator */}
            {editable && !isLoading && (
              <div className="absolute top-2 left-2 bg-black/60 text-white p-1.5 rounded opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none">
                <Move className="w-4 h-4" />
              </div>
            )}
            {/* Move & Delete buttons - top right */}
            {editable && !isLoading && (
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity z-30">
                {onMove && <MoveToDropdown targetSections={targetSections || []} onMove={onMove} />}
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600"
                  title="Delete frame"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            {editable && !isLoading && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                {/* Top row: Frame position and Image position hints */}
                <div className="absolute top-2 inset-x-0 flex justify-center gap-2">
                  <span className="bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Move className="w-3 h-3" />
                    Move frame
                  </span>
                  {maxOffsetY > 0 && (
                    <span 
                      className="bg-amber-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1 cursor-ns-resize"
                      onMouseDown={handleImageRepoStart}
                    >
                      <ArrowUp className="w-3 h-3" />
                      <ArrowDown className="w-3 h-3" />
                      Adjust image
                    </span>
                  )}
                </div>
                
                {/* Center buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="p-2 bg-white rounded-lg hover:bg-slate-100"
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Replace image"
                  >
                    <Upload className="w-4 h-4 text-slate-700" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onUpdate({ ...imageData, src: null, offsetY: 0 }); }}
                    className="p-2 bg-white rounded-lg hover:bg-slate-100"
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Remove image"
                  >
                    <Trash2 className="w-4 h-4 text-slate-700" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {isLoading ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin mb-2" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : (
              <>
                {/* Drag handle for empty frame */}
                {editable && (
                  <div className="absolute top-2 left-2 bg-black/60 text-white p-1.5 rounded opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <Move className="w-4 h-4" />
                  </div>
                )}
                <div 
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="w-4/5 h-4/5 flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors rounded-lg cursor-pointer mx-auto my-auto absolute inset-0 m-auto"
                  style={{ width: '80%', height: '80%' }}
                >
                  <Image className="w-8 h-8 mb-2" />
                  <span className="text-sm">Click to Add Image</span>
                </div>
              </>
            )}
            {/* Move & Delete buttons for empty frames */}
            {editable && !isLoading && (
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity z-30">
                {onMove && <MoveToDropdown targetSections={targetSections || []} onMove={onMove} />}
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600"
                  title="Delete frame"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        
        {/* Resize Handle */}
        {editable && (
          <div
            onMouseDown={handleResizeStart}
            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize opacity-50 group-hover:opacity-100 transition-opacity z-20"
            style={{
              background: `linear-gradient(135deg, transparent 50%, ${themeColors?.gold || '#D4B896'} 50%)`,
            }}
            title="Drag to resize"
          />
        )}

        {/* Shape selector and dimension indicator - inside frame, bottom left */}
        {editable && (
          <div className="absolute bottom-2 left-2 flex items-center gap-2 z-20">
            <select
              value={imageData.shape || 'square'}
              onChange={(e) => onUpdate({ ...imageData, shape: e.target.value })}
              className="px-2 py-1 text-xs border border-slate-300 rounded bg-white/90 text-black shadow-sm"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <option value="square">Square</option>
              <option value="rectangle">Rectangle</option>
              <option value="circle">Circle</option>
            </select>
            <div className="flex items-center gap-1 text-xs text-slate-600 bg-white/90 px-2 py-1 rounded shadow-sm">
              {Math.round(frameWidth)} × {Math.round(frameHeight)}
            </div>
          </div>
        )}
      </div>

      {/* Caption input - only in edit mode */}
      {editable && (
        <div className="mt-2" style={{ width: `${frameWidth}px` }}>
          <textarea
            ref={(el) => {
              if (el) {
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
              }
            }}
            value={imageData.caption || ''}
            onChange={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
              onUpdate({ ...imageData, caption: e.target.value });
            }}
            placeholder="Add caption (optional) - Press Enter for new line"
            className="w-full px-2 py-1 text-sm border border-slate-200 rounded bg-white text-slate-700 focus:outline-none focus:border-slate-400 resize-none overflow-hidden"
            style={{ minHeight: '32px', fontFamily: '"Instrument Sans", sans-serif' }}
            rows={1}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Caption display - only in preview mode */}
      {!editable && imageData.caption && (
        <p
          className="mt-2 text-center italic font-medium"
          style={{
            fontSize: '12px',
            width: `${frameWidth}px`,
            maxWidth: `${frameWidth}px`,
            color: lightBackground ? (themeColors?.primary || '#2B3E50') : (themeColors?.gold || '#D4B896'),
            textShadow: lightBackground ? 'none' : '0 1px 2px rgba(0,0,0,0.5)',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            fontFamily: '"Instrument Sans", sans-serif'
          }}
        >
          {imageData.caption}
        </p>
      )}
    </div>
  );
};

// Information Card Component
const InfoCard = ({ card, onUpdate, onDelete, onMove, targetSections, themeColors, editable = true, canvasWidth = 1000, canvasMaxHeight = 1100 }) => {
  const [width, setWidth] = useState(card.width || 350);
  const [height, setHeight] = useState(card.height || 200);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, posX: 0, posY: 0 });
  const [position, setPosition] = useState({ x: card.posX || 0, y: card.posY || 0 });
  const cardRef = useRef(null);

  const GRID_SIZE = 20; // Snap to 20px grid

  const snapToGrid = (value) => Math.round(value / GRID_SIZE) * GRID_SIZE;

  // Sync with props when card dimensions change externally
  useEffect(() => {
    if (!isResizing) {
      setWidth(card.width || 350);
      setHeight(card.height || 200);
    }
  }, [card.width, card.height, isResizing]);

  useEffect(() => {
    if (!isDragging) {
      setPosition({ x: card.posX || 0, y: card.posY || 0 });
    }
  }, [card.posX, card.posY, isDragging]);

  const handleResizeStart = (e) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY, width, height });
  };

  const handleDragStart = (e) => {
    if (!editable) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, posX: position.x, posY: position.y });
  };

  useEffect(() => {
    const handleResizeMove = (e) => {
      if (!isResizing) return;
      let newWidth = Math.max(200, resizeStart.width + (e.clientX - resizeStart.x));
      let newHeight = Math.max(100, resizeStart.height + (e.clientY - resizeStart.y));
      // Constrain width so right edge doesn't exceed canvas
      const maxWidth = canvasWidth - position.x;
      newWidth = Math.min(newWidth, maxWidth);
      // Constrain height so bottom doesn't exceed page
      const maxHeight = Math.max(100, canvasMaxHeight - position.y);
      newHeight = Math.min(newHeight, maxHeight);
      setWidth(snapToGrid(newWidth));
      setHeight(snapToGrid(newHeight));
    };

    const handleResizeEnd = () => {
      if (isResizing) {
        setIsResizing(false);
        onUpdate({ ...card, width: snapToGrid(width), height: snapToGrid(height) });
      }
    };

    const handleDragMove = (e) => {
      if (!isDragging) return;
      const newX = snapToGrid(dragStart.posX + (e.clientX - dragStart.x));
      const newY = snapToGrid(dragStart.posY + (e.clientY - dragStart.y));
      // Constrain to canvas bounds (including bottom)
      const maxX = Math.max(0, canvasWidth - width);
      const maxY = Math.max(0, canvasMaxHeight - height);
      setPosition({ x: Math.max(0, Math.min(maxX, newX)), y: Math.max(0, Math.min(maxY, newY)) });
    };

    const handleDragEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        onUpdate({ ...card, posX: position.x, posY: position.y });
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isResizing, isDragging, resizeStart, dragStart, width, height, position, card, onUpdate, canvasWidth, canvasMaxHeight]);

  return (
    <div
      ref={cardRef}
      className={`absolute rounded-xl pt-4 px-6 pb-6 transition-shadow ${editable ? 'group cursor-move' : ''}`}
      style={{
        borderTop: `4px solid ${themeColors?.gold || '#D4B896'}`,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        width: `${width}px`,
        height: `${height}px`,
        left: `${position.x}px`,
        top: `${position.y}px`,
        overflow: 'hidden',
        boxShadow: isDragging ? '0 10px 40px rgba(0,0,0,0.3)' : 'none',
        zIndex: isDragging ? 100 : 1
      }}
      onMouseDown={handleDragStart}
    >
      {editable && (
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {onMove && <MoveToDropdown targetSections={targetSections || []} onMove={onMove} />}
          <button
            onClick={onDelete}
            className="p-1 text-red-400 hover:bg-red-500/20 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Drag Handle Indicator */}
      {editable && (
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-50 transition-opacity">
          <Move className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Card Content Container */}
      {editable ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
          {/* Title - editable with auto-resize */}
          <textarea
            value={card.title || ''}
            onChange={(e) => {
              // Auto-resize height
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
              onUpdate({ ...card, title: e.target.value });
            }}
            ref={(el) => {
              // Auto-resize on mount
              if (el) {
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
              }
            }}
            placeholder="Card Title"
            className="text-xl font-semibold w-full bg-transparent border-none focus:outline-none placeholder-white/50 cursor-text resize-none"
            style={{
              color: themeColors?.gold || '#D4B896',
              minHeight: '28px',
              overflow: 'hidden',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              fontFamily: '"Instrument Sans", sans-serif',
              flexShrink: 0,
              lineHeight: 1.2,
              marginBottom: '12px',
              padding: 0
            }}
            onMouseDown={(e) => e.stopPropagation()}
          />
          {/* Content - editable */}
          <textarea
            value={card.content || ''}
            onChange={(e) => onUpdate({ ...card, content: e.target.value })}
            placeholder="Enter card content..."
            className="w-full bg-transparent border-none focus:outline-none resize-none text-base placeholder-white/50 cursor-text"
            style={{ color: 'white', flex: 1, fontFamily: '"Instrument Sans", sans-serif' }}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
      ) : (
        <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', transform: 'translateY(-50%)', padding: '0 24px' }}>
          {/* Title - preview */}
          {card.title && (
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              lineHeight: 1.2,
              color: themeColors?.gold || '#D4B896',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              fontFamily: '"Instrument Sans", sans-serif',
              margin: 0,
              marginBottom: '12px',
              padding: 0
            }}>
              {card.title.trim()}
            </h3>
          )}
          {/* Content - preview */}
          {card.content && (
            <p style={{
              fontSize: '16px',
              lineHeight: 1.4,
              color: 'white',
              whiteSpace: 'pre-wrap',
              fontFamily: '"Instrument Sans", sans-serif',
              margin: 0,
              padding: 0
            }}>
              {card.content.replace(/[\s\n\r]+$/, '')}
            </p>
          )}
        </div>
      )}

      {/* Resize Handle - only in edit mode */}
      {editable && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize opacity-50 group-hover:opacity-100 transition-opacity"
          style={{
            background: `linear-gradient(135deg, transparent 50%, ${themeColors?.gold || '#D4B896'} 50%)`,
          }}
          title="Drag to resize"
        />
      )}
      
      {/* Size indicator - only in edit mode */}
      {editable && (
        <div className="absolute bottom-1 left-2 text-xs text-white/50 opacity-0 group-hover:opacity-100 transition-opacity">
          {Math.round(width)} × {Math.round(height)}
        </div>
      )}
    </div>
  );
};

// Stat Box Component - displays a big number with label
const StatBox = ({ stat, onUpdate, onDelete, onMove, targetSections, themeColors, editable = true, canvasWidth = 1000, canvasMaxHeight = 1100 }) => {
  const [width, setWidth] = useState(stat.width || 300);
  const [height, setHeight] = useState(stat.height || 180);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, posX: 0, posY: 0 });
  const [position, setPosition] = useState({ x: stat.posX || 0, y: stat.posY || 0 });

  const GRID_SIZE = 20;
  const snapToGrid = (value) => Math.round(value / GRID_SIZE) * GRID_SIZE;

  useEffect(() => {
    if (!isResizing) {
      setWidth(stat.width || 300);
      setHeight(stat.height || 180);
    }
  }, [stat.width, stat.height, isResizing]);

  useEffect(() => {
    if (!isDragging) {
      setPosition({ x: stat.posX || 0, y: stat.posY || 0 });
    }
  }, [stat.posX, stat.posY, isDragging]);

  const handleResizeStart = (e) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY, width, height });
  };

  const handleDragStart = (e) => {
    if (!editable) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, posX: position.x, posY: position.y });
  };

  useEffect(() => {
    const handleResizeMove = (e) => {
      if (!isResizing) return;
      let newWidth = Math.max(150, resizeStart.width + (e.clientX - resizeStart.x));
      let newHeight = Math.max(120, resizeStart.height + (e.clientY - resizeStart.y));
      const maxWidth = canvasWidth - position.x;
      newWidth = Math.min(newWidth, maxWidth);
      const maxHeight = Math.max(120, canvasMaxHeight - position.y);
      newHeight = Math.min(newHeight, maxHeight);
      setWidth(snapToGrid(newWidth));
      setHeight(snapToGrid(newHeight));
    };

    const handleResizeEnd = () => {
      if (isResizing) {
        setIsResizing(false);
        onUpdate({ ...stat, width: snapToGrid(width), height: snapToGrid(height) });
      }
    };

    const handleDragMove = (e) => {
      if (!isDragging) return;
      const newX = snapToGrid(dragStart.posX + (e.clientX - dragStart.x));
      const newY = snapToGrid(dragStart.posY + (e.clientY - dragStart.y));
      const maxX = Math.max(0, canvasWidth - width);
      const maxY = Math.max(0, canvasMaxHeight - height);
      setPosition({ x: Math.max(0, Math.min(maxX, newX)), y: Math.max(0, Math.min(maxY, newY)) });
    };

    const handleDragEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        onUpdate({ ...stat, posX: position.x, posY: position.y });
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isResizing, isDragging, resizeStart, dragStart, width, height, position, stat, onUpdate, canvasWidth, canvasMaxHeight]);

  // Calculate font size based on box dimensions
  const numberFontSize = Math.min(width * 0.25, height * 0.4);
  const labelFontSize = Math.min(width * 0.06, height * 0.12, 18);

  return (
    <div 
      className={`absolute rounded-xl text-center transition-shadow ${editable ? 'group cursor-move' : ''}`}
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        border: `3px solid ${themeColors?.gold || '#D4B896'}`,
        backdropFilter: 'blur(10px)',
        width: `${width}px`,
        height: `${height}px`,
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: isDragging ? 100 : 1
      }}
      onMouseDown={handleDragStart}
    >
      {editable && (
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {onMove && <MoveToDropdown targetSections={targetSections || []} onMove={onMove} />}
          <button
            onClick={onDelete}
            className="p-1 text-red-400 hover:bg-red-500/20 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {editable && (
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-50 transition-opacity">
          <Move className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Content - centered like InfoCard (no intermediate wrapper) */}
      {editable ? (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '0',
          right: '0',
          transform: 'translateY(-50%)',
          textAlign: 'center',
          padding: '0 5%',
        }}>
          <input
            type="text"
            value={stat.number || ''}
            onChange={(e) => onUpdate({ ...stat, number: e.target.value })}
            placeholder="0"
            className="font-bold bg-transparent border-none text-center w-full focus:outline-none placeholder-white/50"
            style={{ color: themeColors?.gold || '#D4B896', fontSize: `${numberFontSize}px`, lineHeight: 1.1, fontFamily: '"Instrument Sans", sans-serif' }}
            onMouseDown={(e) => e.stopPropagation()}
          />
          <textarea
            value={stat.label || ''}
            onChange={(e) => {
              onUpdate({ ...stat, label: e.target.value });
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, height * 0.4) + 'px';
            }}
            placeholder="LABEL"
            className="font-semibold uppercase tracking-wider bg-transparent border-none text-center w-full focus:outline-none placeholder-white/50 mt-2 px-2 resize-none overflow-hidden"
            style={{ color: 'white', fontSize: `${labelFontSize}px`, minHeight: `${labelFontSize + 8}px`, maxHeight: `${height * 0.4}px`, fontFamily: '"Instrument Sans", sans-serif' }}
            onMouseDown={(e) => e.stopPropagation()}
            rows={1}
            onFocus={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, height * 0.4) + 'px';
            }}
          />
        </div>
      ) : (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '0',
          right: '0',
          transform: 'translateY(-50%)',
          textAlign: 'center',
          padding: '0 5%',
        }}>
          <p className="font-bold" style={{ color: themeColors?.gold || '#D4B896', fontSize: `${numberFontSize}px`, lineHeight: 1.1, fontFamily: '"Instrument Sans", sans-serif', margin: 0 }}>
            {stat.number || ''}
          </p>
          {stat.label && (
            <p className="font-semibold uppercase tracking-wider px-2 text-center break-words" style={{ color: 'white', fontSize: `${labelFontSize}px`, maxWidth: '100%', wordWrap: 'break-word', fontFamily: '"Instrument Sans", sans-serif', margin: 0, marginTop: '16px' }}>
              {stat.label}
            </p>
          )}
        </div>
      )}

      {editable && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize opacity-50 group-hover:opacity-100 transition-opacity"
          style={{
            background: `linear-gradient(135deg, transparent 50%, ${themeColors?.gold || '#D4B896'} 50%)`,
          }}
        />
      )}
      
      {editable && (
        <div className="absolute bottom-1 left-2 text-xs text-white/50 opacity-0 group-hover:opacity-100 transition-opacity">
          {Math.round(width)} × {Math.round(height)}
        </div>
      )}
    </div>
  );
};

// Text Block Component - paragraph text on dark background with formatting
const TextBlock = ({ textBlock, onUpdate, onDelete, onMove, targetSections, themeColors, editable = true, canvasWidth = 1000, canvasMaxHeight = 1100 }) => {
  const [width, setWidth] = useState(textBlock.width || 600);
  const [height, setHeight] = useState(textBlock.height || 200);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, posX: 0, posY: 0 });
  const [position, setPosition] = useState({ x: textBlock.posX || 0, y: textBlock.posY || 0 });
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const editorRef = useRef(null);
  const isInitialized = useRef(false);

  const TEXT_COLORS = [
    { name: 'White', value: '#FFFFFF' },
    { name: 'Primary', value: themeColors?.primary || '#1e3a5f' },
    { name: 'Accent', value: themeColors?.accent || '#8B0000' },
    { name: 'Gold/Highlight', value: themeColors?.gold || '#D4B896' },
  ];

  const GRID_SIZE = 20;
  const snapToGrid = (value) => Math.round(value / GRID_SIZE) * GRID_SIZE;

  useEffect(() => {
    if (!isResizing) {
      setWidth(textBlock.width || 600);
      setHeight(textBlock.height || 200);
    }
  }, [textBlock.width, textBlock.height, isResizing]);

  useEffect(() => {
    if (!isDragging) {
      setPosition({ x: textBlock.posX || 0, y: textBlock.posY || 0 });
    }
  }, [textBlock.posX, textBlock.posY, isDragging]);

  // Initialize content when entering edit mode
  useEffect(() => {
    if (editorRef.current && editable) {
      editorRef.current.innerHTML = textBlock.content || '';
    }
  }, [editable]);

  // Reset initialized flag when leaving edit mode
  useEffect(() => {
    if (!editable) {
      isInitialized.current = false;
    }
  }, [editable]);

  // Check formatting state
  const checkFormatting = () => {
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
    setIsUnderline(document.queryCommandState('underline'));
  };

  // Listen for selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      if (editorRef.current && editorRef.current.contains(document.activeElement)) {
        checkFormatting();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const handleFormat = (command) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, null);
      onUpdate({ ...textBlock, content: editorRef.current.innerHTML });
      checkFormatting();
    }
  };

  const handleColorChange = (color) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('foreColor', false, color);
      onUpdate({ ...textBlock, content: editorRef.current.innerHTML });
    }
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      onUpdate({ ...textBlock, content: editorRef.current.innerHTML });
    }
  };

  const handleResizeStart = (e) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY, width, height });
  };

  const handleDragStart = (e) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, posX: position.x, posY: position.y });
  };

  useEffect(() => {
    const handleResizeMove = (e) => {
      if (!isResizing) return;
      let newWidth = Math.max(200, resizeStart.width + (e.clientX - resizeStart.x));
      let newHeight = Math.max(100, resizeStart.height + (e.clientY - resizeStart.y));
      const maxWidth = canvasWidth - position.x;
      newWidth = Math.min(newWidth, maxWidth);
      const maxHeight = Math.max(100, canvasMaxHeight - position.y);
      newHeight = Math.min(newHeight, maxHeight);
      setWidth(snapToGrid(newWidth));
      setHeight(snapToGrid(newHeight));
    };

    const handleResizeEnd = () => {
      if (isResizing) {
        setIsResizing(false);
        onUpdate({ ...textBlock, width: snapToGrid(width), height: snapToGrid(height) });
      }
    };

    const handleDragMove = (e) => {
      if (!isDragging) return;
      const newX = snapToGrid(dragStart.posX + (e.clientX - dragStart.x));
      const newY = snapToGrid(dragStart.posY + (e.clientY - dragStart.y));
      const maxX = Math.max(0, canvasWidth - width);
      const maxY = Math.max(0, canvasMaxHeight - height);
      setPosition({ x: Math.max(0, Math.min(maxX, newX)), y: Math.max(0, Math.min(maxY, newY)) });
    };

    const handleDragEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        onUpdate({ ...textBlock, posX: position.x, posY: position.y });
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isResizing, isDragging, resizeStart, dragStart, width, height, position, textBlock, onUpdate, canvasWidth, canvasMaxHeight]);

  return (
    <div 
      className={`absolute rounded-lg transition-shadow ${editable ? 'group' : ''}`}
      style={{ 
        width: `${width}px`,
        height: `${height}px`,
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: isDragging ? 100 : 1,
        border: editable ? '1px dashed rgba(255,255,255,0.3)' : 'none',
        backgroundColor: 'transparent'
      }}
    >
      {editable && (
        <div className="absolute top-0 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {onMove && <MoveToDropdown targetSections={targetSections || []} onMove={onMove} />}
          <button
            onClick={onDelete}
            className="p-1 text-red-400 hover:bg-red-500/20 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toolbar with drag handle and formatting buttons */}
      {editable && (
        <div className="absolute top-0 left-0 right-16 h-8 flex items-center gap-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/40 rounded-t-lg">
          {/* Drag Handle */}
          <div 
            className="cursor-move p-1 hover:bg-white/20 rounded mr-2"
            onMouseDown={handleDragStart}
          >
            <Move className="w-4 h-4 text-white/70" />
          </div>
          
          <div className="w-px h-5 bg-white/30" />
          
          {/* Formatting buttons */}
          <button
            onMouseDown={(e) => { e.preventDefault(); handleFormat('bold'); }}
            className={`p-1 rounded transition-colors ${isBold ? 'bg-white/30 text-white' : 'text-white/70 hover:bg-white/20'}`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); handleFormat('italic'); }}
            className={`p-1 rounded transition-colors ${isItalic ? 'bg-white/30 text-white' : 'text-white/70 hover:bg-white/20'}`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); handleFormat('underline'); }}
            className={`p-1 rounded transition-colors ${isUnderline ? 'bg-white/30 text-white' : 'text-white/70 hover:bg-white/20'}`}
            title="Underline"
          >
            <Underline className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-white/30" />

          {/* Color options */}
          {TEXT_COLORS.map((color) => (
            <button
              key={color.name}
              onMouseDown={(e) => { e.preventDefault(); handleColorChange(color.value); }}
              className="w-5 h-5 rounded border border-white/30 hover:scale-110 transition-transform"
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      )}

      {editable ? (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleContentChange}
          onBlur={handleContentChange}
          className="w-full overflow-auto focus:outline-none text-white p-3 pt-10 textblock-content"
          style={{
            fontSize: '16px',
            lineHeight: 1.6,
            height: '100%',
            minHeight: '60px',
            fontFamily: '"Instrument Sans", sans-serif'
          }}
          data-placeholder="Enter paragraph text..."
          suppressContentEditableWarning
        />
      ) : (
        textBlock.content && (
          <div
            className="w-full h-full overflow-hidden text-white textblock-content"
            style={{
              fontSize: '16px',
              lineHeight: 1.6,
              padding: '12px',
              fontFamily: '"Instrument Sans", sans-serif'
            }}
            dangerouslySetInnerHTML={{ __html: textBlock.content || '' }}
          />
        )
      )}

      <style>{`
        .textblock-content p {
          margin: 0 0 1em 0;
        }
        .textblock-content p:first-child {
          margin-top: 0;
        }
        .textblock-content p:last-child {
          margin-bottom: 0;
        }
      `}</style>

      {editable && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize opacity-50 group-hover:opacity-100 transition-opacity"
          style={{
            background: `linear-gradient(135deg, transparent 50%, ${themeColors?.gold || '#D4B896'} 50%)`,
          }}
        />
      )}
      
      {editable && (
        <div className="absolute bottom-1 left-2 text-xs text-white/50 opacity-0 group-hover:opacity-100 transition-opacity">
          {Math.round(width)} × {Math.round(height)}
        </div>
      )}
      
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: rgba(255, 255, 255, 0.5);
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

// Footer Element Component - for adding footer within content section
const FooterElement = ({ footer, onUpdate, onDelete, themeColors, logo, editable = true, canvasWidth = 1000, canvasMaxHeight = 1100 }) => {
  const [width, setWidth] = useState(footer.width || 860);
  const [height, setHeight] = useState(footer.height || 280);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, posX: 0, posY: 0 });
  const [position, setPosition] = useState({ x: footer.posX || 0, y: footer.posY || 0 });

  const GRID_SIZE = 20;
  const snapToGrid = (value) => Math.round(value / GRID_SIZE) * GRID_SIZE;

  useEffect(() => {
    if (!isResizing) {
      setWidth(footer.width || 860);
      setHeight(footer.height || 280);
    }
  }, [footer.width, footer.height, isResizing]);

  useEffect(() => {
    if (!isDragging) {
      setPosition({ x: footer.posX || 0, y: footer.posY || 0 });
    }
  }, [footer.posX, footer.posY, isDragging]);

  const handleResizeStart = (e) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY, width, height });
  };

  const handleDragStart = (e) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, posX: position.x, posY: position.y });
  };

  useEffect(() => {
    const handleResizeMove = (e) => {
      if (!isResizing) return;
      let newWidth = Math.max(400, resizeStart.width + (e.clientX - resizeStart.x));
      let newHeight = Math.max(200, resizeStart.height + (e.clientY - resizeStart.y));
      const maxWidth = canvasWidth - position.x;
      newWidth = Math.min(newWidth, maxWidth);
      const maxHeight = Math.max(200, canvasMaxHeight - position.y);
      newHeight = Math.min(newHeight, maxHeight);
      setWidth(snapToGrid(newWidth));
      setHeight(snapToGrid(newHeight));
    };

    const handleResizeEnd = () => {
      if (isResizing) {
        setIsResizing(false);
        onUpdate({ ...footer, width: snapToGrid(width), height: snapToGrid(height) });
      }
    };

    const handleDragMove = (e) => {
      if (!isDragging) return;
      const newX = snapToGrid(dragStart.posX + (e.clientX - dragStart.x));
      const newY = snapToGrid(dragStart.posY + (e.clientY - dragStart.y));
      const maxX = Math.max(0, canvasWidth - width);
      const maxY = Math.max(0, canvasMaxHeight - height);
      setPosition({ x: Math.max(0, Math.min(maxX, newX)), y: Math.max(0, Math.min(maxY, newY)) });
    };

    const handleDragEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        onUpdate({ ...footer, posX: position.x, posY: position.y });
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isResizing, isDragging, resizeStart, dragStart, width, height, position, footer, onUpdate, canvasWidth, canvasMaxHeight]);

  return (
    <div
      className={`absolute rounded-lg transition-shadow ${editable ? 'group' : ''}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: isDragging ? 100 : 1,
        backgroundColor: themeColors?.primaryDark || '#1a2d3d',
        border: editable ? '2px dashed rgba(255,255,255,0.3)' : 'none'
      }}
    >
      {editable && (
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 p-1 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded transition-opacity z-10"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {editable && (
        <div
          className="absolute top-2 left-2 cursor-move p-1 hover:bg-white/20 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onMouseDown={handleDragStart}
        >
          <Move className="w-4 h-4 text-white/70" />
        </div>
      )}

      <div className="p-6 text-center text-white flex flex-col items-center justify-center h-full">
        {logo && (
          <div className="w-16 h-16 mb-3">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}

        {editable ? (
          <>
            <input
              type="text"
              value={footer.name || ''}
              onChange={(e) => onUpdate({ ...footer, name: e.target.value })}
              placeholder="Organization Name"
              className="text-xl font-bold bg-transparent border-none text-center w-full focus:outline-none text-white placeholder-white/50"
            />
            <input
              type="text"
              value={footer.subtitle || ''}
              onChange={(e) => onUpdate({ ...footer, subtitle: e.target.value })}
              placeholder="Department or Division"
              className="text-base font-semibold bg-transparent border-none text-center w-full mt-1 focus:outline-none text-white placeholder-white/50"
            />
            <div className="mt-3 space-y-1 w-full" style={{ color: themeColors?.gold || '#D4B896' }}>
              <input
                type="text"
                value={footer.address || ''}
                onChange={(e) => onUpdate({ ...footer, address: e.target.value })}
                placeholder="Street Address"
                className="bg-transparent border-none text-center w-full focus:outline-none text-sm"
                style={{ color: themeColors?.gold || '#D4B896' }}
              />
              <input
                type="text"
                value={footer.cityStateZip || ''}
                onChange={(e) => onUpdate({ ...footer, cityStateZip: e.target.value })}
                placeholder="City, State ZIP"
                className="bg-transparent border-none text-center w-full focus:outline-none text-sm"
                style={{ color: themeColors?.gold || '#D4B896' }}
              />
              <input
                type="text"
                value={footer.phone || ''}
                onChange={(e) => onUpdate({ ...footer, phone: e.target.value })}
                placeholder="Phone: 000-000-0000"
                className="bg-transparent border-none text-center w-full focus:outline-none text-sm"
                style={{ color: themeColors?.gold || '#D4B896' }}
              />
              <input
                type="email"
                value={footer.email || ''}
                onChange={(e) => onUpdate({ ...footer, email: e.target.value })}
                placeholder="email@example.com"
                className="bg-transparent border-none text-center w-full focus:outline-none text-sm"
                style={{ color: themeColors?.gold || '#D4B896' }}
              />
              <input
                type="text"
                value={footer.website || ''}
                onChange={(e) => onUpdate({ ...footer, website: e.target.value })}
                placeholder="www.website.com"
                className="bg-transparent border-none text-center w-full focus:outline-none text-sm underline"
                style={{ color: themeColors?.gold || '#D4B896' }}
              />
            </div>
          </>
        ) : (
          <>
            {footer.name && <h2 className="text-xl font-bold text-white">{footer.name}</h2>}
            {footer.subtitle && <p className="text-base font-semibold mt-1 text-white">{footer.subtitle}</p>}
            <div className="mt-3 space-y-0.5" style={{ color: themeColors?.gold || '#D4B896' }}>
              {footer.address && <p className="text-sm">{footer.address}</p>}
              {footer.cityStateZip && <p className="text-sm">{footer.cityStateZip}</p>}
              {footer.phone && <p className="text-sm">{footer.phone}</p>}
              {footer.email && (
                <a
                  href={`mailto:${footer.email}`}
                  className="block text-sm hover:opacity-80"
                >
                  {footer.email}
                </a>
              )}
              {footer.website && (
                <a
                  href={footer.website.startsWith('http') ? footer.website : `https://${footer.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm underline hover:opacity-80"
                >
                  {footer.website}
                </a>
              )}
            </div>
          </>
        )}

        <p className="mt-3 text-xs opacity-80">
          © {new Date().getFullYear()} All Rights Reserved
        </p>
      </div>

      {editable && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize opacity-50 group-hover:opacity-100 transition-opacity"
          style={{
            background: `linear-gradient(135deg, transparent 50%, ${themeColors?.gold || '#D4B896'} 50%)`,
          }}
        />
      )}

      {editable && (
        <div className="absolute bottom-1 left-2 text-xs text-white/50 opacity-0 group-hover:opacity-100 transition-opacity">
          {Math.round(width)} × {Math.round(height)}
        </div>
      )}
    </div>
  );
};

// Chart Container Component
const ChartContainer = ({ chart, onUpdate, onDelete, onMove, targetSections, themeColors, editable = true, canvasWidth = 1000, canvasMaxHeight = 1100 }) => {
  const [embedUrl, setEmbedUrl] = useState(chart.embedUrl || '');
  const [width, setWidth] = useState(chart.width || 780);
  const [height, setHeight] = useState(chart.height || 320);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, posX: 0, posY: 0 });
  const [position, setPosition] = useState({ x: chart.posX || 0, y: chart.posY || 0 });
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const GRID_SIZE = 20;
  const snapToGrid = (value) => Math.round(value / GRID_SIZE) * GRID_SIZE;

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdate({ ...chart, chartImage: event.target.result, embedUrl: '' });
        setIsLoading(false);
      };
      reader.onerror = () => {
        setIsLoading(false);
        alert('Error loading image. Please try again.');
      };
      reader.readAsDataURL(file);
    }
  };

  // Sync with props when chart dimensions change externally
  useEffect(() => {
    if (!isResizing) {
      setWidth(chart.width || 780);
      setHeight(chart.height || 320);
    }
  }, [chart.width, chart.height, isResizing]);

  useEffect(() => {
    if (!isDragging) {
      setPosition({ x: chart.posX || 0, y: chart.posY || 0 });
    }
  }, [chart.posX, chart.posY, isDragging]);

  const handleResizeStart = (e) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY, width, height });
  };

  const handleDragStart = (e) => {
    if (!editable) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'IFRAME') return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, posX: position.x, posY: position.y });
  };

  useEffect(() => {
    const handleResizeMove = (e) => {
      if (!isResizing) return;
      let newWidth = Math.max(300, resizeStart.width + (e.clientX - resizeStart.x));
      let newHeight = Math.max(200, resizeStart.height + (e.clientY - resizeStart.y));
      // Constrain width so right edge doesn't exceed canvas
      const maxWidth = canvasWidth - position.x;
      newWidth = Math.min(newWidth, maxWidth);
      // Constrain height so bottom of frame doesn't exceed page (captions can overflow)
      const maxHeight = Math.max(200, canvasMaxHeight - position.y);
      newHeight = Math.min(newHeight, maxHeight);
      setWidth(snapToGrid(newWidth));
      setHeight(snapToGrid(newHeight));
    };

    const handleResizeEnd = () => {
      if (isResizing) {
        setIsResizing(false);
        onUpdate({ ...chart, width: snapToGrid(width), height: snapToGrid(height) });
      }
    };

    const handleDragMove = (e) => {
      if (!isDragging) return;
      const newX = snapToGrid(dragStart.posX + (e.clientX - dragStart.x));
      const newY = snapToGrid(dragStart.posY + (e.clientY - dragStart.y));
      // Constrain to canvas bounds (captions can overflow below)
      const maxX = Math.max(0, canvasWidth - width);
      const maxY = Math.max(0, canvasMaxHeight - height);
      setPosition({ x: Math.max(0, Math.min(maxX, newX)), y: Math.max(0, Math.min(maxY, newY)) });
    };

    const handleDragEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        onUpdate({ ...chart, posX: position.x, posY: position.y });
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isResizing, isDragging, resizeStart, dragStart, width, height, position, chart, onUpdate, canvasWidth, canvasMaxHeight]);

  return (
    <div 
      className="absolute"
      style={{ 
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: isDragging ? 100 : 1
      }}
    >
      <div 
        className={`relative bg-white/95 rounded-xl p-4 shadow-lg ${editable ? 'group cursor-move' : ''}`}
        style={{ 
          border: `2px solid ${themeColors?.gold || '#D4B896'}`,
          width: `${width}px`,
          height: `${height}px`,
          boxShadow: isDragging ? '0 10px 40px rgba(0,0,0,0.3)' : undefined,
        }}
        onMouseDown={handleDragStart}
      >
        {/* Drag Handle Indicator - always visible */}
        {editable && !isLoading && (
          <div className="absolute top-2 left-2 bg-black/60 text-white p-1.5 rounded opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            <Move className="w-4 h-4" />
          </div>
        )}

        {chart.chartImage ? (
          <div className="w-full h-full relative px-6" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={chart.chartImage}
              alt="Chart"
              style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}
            />
            {/* Loading overlay when replacing chart */}
            {isLoading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-40">
                <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin mb-2" />
                <span className="text-sm text-white">Loading...</span>
              </div>
            )}
            {/* Hover overlay with buttons - only in edit mode */}
            {editable && !isLoading && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="p-2 bg-white rounded-lg hover:bg-slate-100"
                  onMouseDown={(e) => e.stopPropagation()}
                  title="Replace chart"
                >
                  <Upload className="w-4 h-4 text-slate-700" />
                </button>
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onUpdate({ ...chart, chartImage: null }); 
                  }}
                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  onMouseDown={(e) => e.stopPropagation()}
                  title="Remove chart"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        ) : editable ? (
          <div className="space-y-4 h-full flex flex-col items-center justify-center" onMouseDown={(e) => e.stopPropagation()}>
            {isLoading ? (
              <>
                <div className="w-10 h-10 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                <span className="text-sm text-slate-500">Loading chart...</span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-slate-500">
                  <BarChart3 className="w-6 h-6" />
                  <span className="text-base font-medium">Add Chart</span>
                </div>
                
                <p className="text-xs text-slate-400 text-center max-w-xs">
                  Export your chart as an image from Google Sheets, Excel, or any charting tool, then upload it here.
                </p>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700"
                >
                  <Upload className="w-4 h-4" />
                  Upload Chart Image
                </button>
              </>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            <p className="text-xs text-slate-400">PNG, JPG, or SVG</p>
            
            <a
              href="https://docs.google.com/spreadsheets/d/1LCOm8e7cozUrYBK7Aa6avC1e5N9PqNKJ/copy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-600 hover:underline"
            >
              Need a chart? Use our Google Sheets template →
            </a>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <p>No chart uploaded</p>
          </div>
        )}

        {/* Resize Handle - only in edit mode */}
        {editable && (
          <div
            onMouseDown={handleResizeStart}
            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize opacity-50 group-hover:opacity-100 transition-opacity"
            style={{
              background: `linear-gradient(135deg, transparent 50%, ${themeColors?.gold || '#D4B896'} 50%)`,
            }}
            title="Drag to resize"
          />
        )}

        {/* Dimension, move, and delete controls - inside frame, bottom left */}
        {editable && (
          <div className="absolute bottom-2 left-2 flex items-center gap-2 z-10">
            <div className="flex items-center gap-1 text-xs text-slate-600 bg-white/90 px-2 py-1 rounded shadow-sm">
              {Math.round(width)} × {Math.round(height)}
            </div>
            {onMove && (
              <div className="bg-white/90 rounded shadow-sm">
                <MoveToDropdown targetSections={targetSections || []} onMove={onMove} />
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded bg-white/90 shadow-sm"
              onMouseDown={(e) => e.stopPropagation()}
              title="Delete chart"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Caption input - only in edit mode */}
      {editable && (
        <div className="mt-2" style={{ width: `${width}px` }}>
          <textarea
            ref={(el) => {
              if (el) {
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
              }
            }}
            value={chart.caption || ''}
            onChange={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
              onUpdate({ ...chart, caption: e.target.value });
            }}
            placeholder="Add caption (optional) - Press Enter for new line"
            className="w-full px-2 py-1 text-sm border border-slate-200 rounded bg-white text-slate-700 focus:outline-none focus:border-slate-400 resize-none overflow-hidden"
            style={{ minHeight: '32px', fontFamily: '"Instrument Sans", sans-serif' }}
            rows={1}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Caption display - only in preview mode */}
      {!editable && chart.caption && (
        <p
          className="mt-2 text-sm text-center italic font-medium"
          style={{
            width: `${width}px`,
            maxWidth: `${width}px`,
            color: themeColors?.gold || '#D4B896',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            fontFamily: '"Instrument Sans", sans-serif'
          }}
        >
          {chart.caption}
        </p>
      )}
    </div>
  );
};

// Banner Section Component
const BannerSection = ({ section, onUpdate, themeColors, logo, isPreview }) => {
  return (
    <div 
      data-section="banner"
      className="relative flex flex-col items-center justify-center p-10 text-center text-white"
      style={{
        backgroundColor: themeColors?.primary || '#2B3E50',
        minHeight: '1400px',
        maxHeight: '1400px',
        height: '1400px',
        width: '990px'
      }}
    >
      {logo && (
        <div className="w-64 h-64 mb-6">
          <img src={logo} alt="Logo" className="w-full h-full object-contain" />
        </div>
      )}
      
      {isPreview ? (
        <>
          {section.title && (
            <h1 className="text-5xl font-bold" style={{ color: themeColors?.gold || '#D4B896', letterSpacing: '2px' }}>
              {section.title}
            </h1>
          )}
          {section.subtitle && (
            <h2 className="text-3xl font-semibold mt-4 text-white">{section.subtitle}</h2>
          )}
          {section.tagline && (
            <p className="text-xl italic mt-6" style={{ color: themeColors?.gold || '#D4B896' }}>
              {section.tagline}
            </p>
          )}
        </>
      ) : (
        <>
          <input
            type="text"
            value={section.title || ''}
            onChange={(e) => onUpdate({ ...section, title: e.target.value })}
            placeholder="ORGANIZATION NAME"
            className="text-5xl font-bold bg-transparent border-none text-center w-full focus:outline-none placeholder-white/50"
            style={{ color: themeColors?.gold || '#D4B896', letterSpacing: '2px' }}
          />
          
          <input
            type="text"
            value={section.subtitle || ''}
            onChange={(e) => onUpdate({ ...section, subtitle: e.target.value })}
            placeholder="2025 Year In Review"
            className="text-3xl font-semibold bg-transparent border-none text-center w-full mt-4 focus:outline-none placeholder-white/50 text-white"
          />
          
          <input
            type="text"
            value={section.tagline || ''}
            onChange={(e) => onUpdate({ ...section, tagline: e.target.value })}
            placeholder="Tagline or motto"
            className="text-xl italic bg-transparent border-none text-center w-full mt-6 focus:outline-none placeholder-white/50"
            style={{ color: themeColors?.gold || '#D4B896' }}
          />
        </>
      )}
    </div>
  );
};

// Opening Letter Section Component
const OpeningLetterSection = ({ section, onUpdate, themeColors, isPreview }) => {
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(1000); // Conservative default
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [isResizingContent, setIsResizingContent] = useState(false);
  const [resizeStart, setResizeStart] = useState({ y: 0, height: 0 });
  const [contentHeight, setContentHeight] = useState(section.contentHeight || null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [photoDragStart, setPhotoDragStart] = useState({ y: 0, posY: 0 });
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const contentRef = useRef(null);
  const bottomCanvasRef = useRef(null);
  const [bottomCanvasWidth, setBottomCanvasWidth] = useState(400);

  // Photo vertical position (0-100, where 50 is center)
  const photoPositionY = section.photoPositionY ?? 50;

  // Initialize bottom images if they don't exist
  const bottomImage1 = section.bottomImage1 || { id: 'bottom1', width: 400, height: 240, posX: 0, posY: 0 };
  const bottomImage2 = section.bottomImage2 || { id: 'bottom2', width: 400, height: 240, posX: 0, posY: 0 };

  // Measure bottom canvas width
  useEffect(() => {
    const measureBottomCanvas = () => {
      if (bottomCanvasRef.current) {
        const width = bottomCanvasRef.current.offsetWidth;
        if (width > 0) {
          setBottomCanvasWidth(width);
        }
      }
    };

    const timeoutId = setTimeout(measureBottomCanvas, 100);
    window.addEventListener('resize', measureBottomCanvas);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', measureBottomCanvas);
    };
  }, []);

  // Sync contentHeight with section data
  useEffect(() => {
    if (section.contentHeight && section.contentHeight !== contentHeight) {
      setContentHeight(section.contentHeight);
    }
  }, [section.contentHeight]);

  // Measure canvas width on mount, resize, and when element size changes
  useEffect(() => {
    const measureCanvas = () => {
      if (canvasRef.current) {
        const width = canvasRef.current.offsetWidth;
        if (width > 0) {
          setCanvasWidth(width);
        }
      }
    };
    
    // Initial measurement after a short delay to ensure render is complete
    const timeoutId = setTimeout(measureCanvas, 100);
    // Also measure again after a longer delay in case of slow renders
    const timeoutId2 = setTimeout(measureCanvas, 500);
    
    // Also measure on window resize
    window.addEventListener('resize', measureCanvas);
    
    // Use ResizeObserver for more reliable size tracking
    let resizeObserver;
    if (canvasRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(measureCanvas);
      resizeObserver.observe(canvasRef.current);
    }
    
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
      window.removeEventListener('resize', measureCanvas);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsPhotoLoading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdate({ ...section, photo: event.target.result });
        setIsPhotoLoading(false);
      };
      reader.onerror = () => {
        setIsPhotoLoading(false);
        alert('Error loading photo. Please try again.');
      };
      reader.readAsDataURL(file);
    }
  };

  // Photo repositioning handlers
  const handlePhotoDragStart = (e) => {
    if (isPreview) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(true);
    setPhotoDragStart({ y: e.clientY, posY: photoPositionY });
  };

  useEffect(() => {
    const handlePhotoDragMove = (e) => {
      if (!isDraggingPhoto) return;
      const deltaY = e.clientY - photoDragStart.y;
      // Convert pixel movement to percentage (negative delta = move image up = lower percentage)
      let newPosY = photoDragStart.posY + (deltaY * 0.5);
      newPosY = Math.max(0, Math.min(100, newPosY));
      onUpdate({ ...section, photoPositionY: Math.round(newPosY) });
    };

    const handlePhotoDragEnd = () => {
      setIsDraggingPhoto(false);
    };

    if (isDraggingPhoto) {
      window.addEventListener('mousemove', handlePhotoDragMove);
      window.addEventListener('mouseup', handlePhotoDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handlePhotoDragMove);
      window.removeEventListener('mouseup', handlePhotoDragEnd);
    };
  }, [isDraggingPhoto, photoDragStart, section, onUpdate, photoPositionY]);

  // Fixed layout heights for Opening Letter section
  // Page: 1400px, Padding: 64px top and bottom for symmetry
  // Header (photo + titles): ~200px
  // Bottom images: 256px (h-64) + 24px gap + 24px padding
  const headerHeight = 200;
  const topPadding = 64;
  const bottomPadding = 0; // Reduced - actual padding is on container
  const bottomImagesHeight = 256 + 24; // h-64 images + gap (removed extra padding)
  const pageHeight = 1400;

  // Calculate available height for content area
  const totalFixedHeight = headerHeight + topPadding + bottomPadding + bottomImagesHeight;
  const maxContentHeight = pageHeight - totalFixedHeight - 50; // 50px bottom padding on container

  // Content box resize handlers
  const handleContentResizeStart = (e) => {
    if (isPreview) return;
    e.preventDefault();
    e.stopPropagation();
    const currentHeight = contentHeight || (contentRef.current?.offsetHeight || 200);
    setIsResizingContent(true);
    setResizeStart({ y: e.clientY, height: currentHeight });
  };

  useEffect(() => {
    const handleContentResizeMove = (e) => {
      if (!isResizingContent) return;
      const deltaY = e.clientY - resizeStart.y;
      let newHeight = Math.max(100, resizeStart.height + deltaY); // Min 100px
      // Constrain to max content height
      newHeight = Math.min(newHeight, maxContentHeight);
      // Snap to 10px grid
      newHeight = Math.round(newHeight / 10) * 10;
      setContentHeight(newHeight);
    };

    const handleContentResizeEnd = () => {
      if (isResizingContent) {
        setIsResizingContent(false);
        // Save to section data
        onUpdate({ ...section, contentHeight: contentHeight });
      }
    };

    if (isResizingContent) {
      document.addEventListener('mousemove', handleContentResizeMove);
      document.addEventListener('mouseup', handleContentResizeEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleContentResizeMove);
      document.removeEventListener('mouseup', handleContentResizeEnd);
    };
  }, [isResizingContent, resizeStart, contentHeight, maxContentHeight, section, onUpdate]);

  // Use custom height or auto
  const actualContentHeight = contentHeight || 'auto';

  // Reflow images in Opening Letter to fill gaps after deletion
  const reflowLetterImages = (imagesToReflow) => {
    if (!imagesToReflow || imagesToReflow.length === 0) return [];
    
    const controlsHeight = 120;
    const gap = 20;
    const maxCanvasWidth = Math.max(canvasWidth - 40, 600);
    
    // Sort images by Y position, then by X position
    const sortedImages = [...imagesToReflow].sort((a, b) => {
      const yDiff = (a.posY || 0) - (b.posY || 0);
      if (yDiff !== 0) return yDiff;
      return (a.posX || 0) - (b.posX || 0);
    });
    
    // Reposition images row by row
    const repositioned = [];
    let currentY = 0;
    let currentX = 0;
    let rowHeight = 0;
    
    sortedImages.forEach(img => {
      const imgWidth = img.width || 300;
      const imgHeight = img.height || 200;
      const totalItemHeight = imgHeight + controlsHeight;
      
      // Check if image fits in current row
      if (currentX + imgWidth > maxCanvasWidth) {
        // Move to next row
        currentY += rowHeight + gap;
        currentX = 0;
        rowHeight = 0;
      }
      
      repositioned.push({
        ...img,
        posX: currentX,
        posY: currentY
      });
      
      currentX += imgWidth + gap;
      rowHeight = Math.max(rowHeight, totalItemHeight);
    });
    
    return repositioned;
  };

  // Delete handler with reflow for Opening Letter
  const deleteLetterImage = (idx) => {
    const remainingImages = section.images.filter((_, i) => i !== idx);
    const reflowedImages = reflowLetterImages(remainingImages);
    onUpdate({ ...section, images: reflowedImages });
  };

  const addImage = () => {
    const imageWidth = 300;
    const imageHeight = 200;
    const gap = 20;
    const controlsHeight = 120; // Space for controls below image
    const totalItemHeight = imageHeight + controlsHeight;
    const maxCanvasWidth = Math.max(canvasWidth - 40, 600); // Account for padding
    
    const images = section.images || [];
    
    // Check if there's room for a new image at all
    if (totalItemHeight > maxCanvasHeight) {
      alert('Canvas is too small for images.');
      return;
    }
    
    // Helper to check if a rectangle overlaps with any existing image
    const overlapsWithAny = (x, y) => {
      for (const img of images) {
        const imgX = img.posX || 0;
        const imgY = img.posY || 0;
        const imgW = img.width || 300;
        const imgH = img.height || 200;
        const imgTotalH = imgH + controlsHeight;
        
        // Check if rectangles overlap (with gap)
        const horizontalOverlap = x < imgX + imgW + gap && x + imageWidth + gap > imgX;
        const verticalOverlap = y < imgY + imgTotalH + gap && y + totalItemHeight + gap > imgY;
        
        if (horizontalOverlap && verticalOverlap) {
          return true;
        }
      }
      return false;
    };
    
    // Check if position fits within canvas bounds
    const fitsInCanvas = (x, y) => {
      return x >= 0 && 
             x + imageWidth <= maxCanvasWidth && 
             y >= 0 && 
             y + totalItemHeight <= maxCanvasHeight;
    };
    
    // First try placing at 0,0 if empty
    if (images.length === 0) {
      if (fitsInCanvas(0, 0)) {
        onUpdate({
          ...section,
          images: [{ id: generateId(), shape: 'rectangle', width: imageWidth, height: imageHeight, posX: 0, posY: 0 }]
        });
        return;
      }
    }
    
    // Try placing next to existing images on same row
    for (const existingImg of images) {
      const potentialX = (existingImg.posX || 0) + (existingImg.width || 300) + gap;
      const potentialY = existingImg.posY || 0;
      if (fitsInCanvas(potentialX, potentialY) && !overlapsWithAny(potentialX, potentialY)) {
        onUpdate({
          ...section,
          images: [...images, { id: generateId(), shape: 'rectangle', width: imageWidth, height: imageHeight, posX: potentialX, posY: potentialY }]
        });
        return;
      }
    }
    
    // Then try grid positions starting from top-left with 20px grid
    const gridStep = 20;
    
    for (let y = 0; y <= maxCanvasHeight - totalItemHeight; y += gridStep) {
      for (let x = 0; x <= maxCanvasWidth - imageWidth; x += gridStep) {
        if (!overlapsWithAny(x, y) && fitsInCanvas(x, y)) {
          onUpdate({
            ...section,
            images: [...images, { id: generateId(), shape: 'rectangle', width: imageWidth, height: imageHeight, posX: x, posY: y }]
          });
          return;
        }
      }
    }
    
    // No space found - alert user
    alert('No more space available for images on this page. Please delete an existing image or resize them to make room.');
  };

  return (
    <div
      data-section="letter"
      className="bg-white flex flex-col"
      style={{
        minHeight: '1400px',
        maxHeight: '1400px',
        height: '1400px',
        width: '990px',
        overflow: 'hidden',
        padding: '64px 64px 50px 64px'
      }}
    >
      <div 
        className="flex items-center gap-8 mb-2 pb-3 flex-shrink-0"
        style={{ borderBottom: `3px solid ${themeColors?.accent || '#C1272D'}` }}
      >
        {/* Author Photo */}
        {isPreview ? (
          section.photo && (
            <div
              className="w-36 h-36 rounded-full flex-shrink-0 overflow-hidden"
              style={{ border: `4px solid ${themeColors?.accent || '#C1272D'}` }}
            >
              <img
                src={section.photo}
                alt="Author"
                className="w-full h-full object-cover"
                style={{ objectPosition: `center ${photoPositionY}%` }}
              />
            </div>
          )
        ) : (
          <div
            className="w-36 h-36 rounded-full bg-slate-100 flex-shrink-0 overflow-hidden relative group"
            style={{ border: `4px solid ${themeColors?.accent || '#C1272D'}` }}
          >
            {isPhotoLoading ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              </div>
            ) : section.photo ? (
              <>
                <img
                  src={section.photo}
                  alt="Author"
                  className="w-full h-full object-cover cursor-move"
                  style={{ objectPosition: `center ${photoPositionY}%` }}
                  onMouseDown={handlePhotoDragStart}
                  draggable={false}
                />
                <div
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity pointer-events-none"
                >
                  <Move className="w-5 h-5 text-white mb-1" />
                  <span className="text-white text-xs">Drag to reposition</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="absolute bottom-1 right-1 p-1.5 bg-white/90 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  title="Change photo"
                >
                  <Upload className="w-3 h-3 text-slate-600" />
                </button>
              </>
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-slate-400 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8" />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
        )}
        
        <div className="flex-1">
          {isPreview ? (
            <>
              {section.heading && (
                <h1 className="text-4xl font-semibold" style={{ color: themeColors?.primary || '#2B3E50', whiteSpace: 'pre-wrap' }}>
                  {section.heading}
                </h1>
              )}
              {section.subheading && (
                <p className="text-xl font-semibold mt-2" style={{ color: themeColors?.accent || '#C1272D', whiteSpace: 'pre-wrap' }}>
                  {section.subheading}
                </p>
              )}
            </>
          ) : (
            <>
              <input
                type="text"
                value={section.heading || ''}
                onChange={(e) => onUpdate({ ...section, heading: e.target.value })}
                placeholder="A Message from [Name]"
                className="text-4xl font-semibold w-full bg-transparent border-none focus:outline-none"
                style={{ color: themeColors?.primary || '#2B3E50' }}
              />
              <input
                type="text"
                value={section.subheading || ''}
                onChange={(e) => onUpdate({ ...section, subheading: e.target.value })}
                placeholder="Subtitle or role"
                className="text-xl font-semibold w-full bg-transparent border-none mt-2 focus:outline-none"
                style={{ color: themeColors?.accent || '#C1272D' }}
              />
            </>
          )}
        </div>
      </div>

      {/* Letter content - full width text box */}
      <div
        ref={contentRef}
        className="flex-1 mt-4 relative"
        style={{
          height: actualContentHeight === 'auto' ? 'auto' : `${actualContentHeight}px`,
          minHeight: '100px',
          maxHeight: `${maxContentHeight}px`,
          overflow: isEditingContent ? 'visible' : 'hidden'
        }}
      >
        {isPreview ? (
          <>
            <style>{`
              .letter-content-preview p { margin: ${section.paragraphSpacing || 16}px 0; }
              .letter-content-preview p:first-child { margin-top: 0; }
              .letter-content-preview li { margin: ${Math.max(1, (section.paragraphSpacing || 16) / 2)}px 0; }
            `}</style>
            <div
              className="prose prose-lg max-w-none h-full letter-content-preview"
              style={{
                position: 'relative',
                direction: 'ltr',
                textAlign: 'left',
                fontSize: '14px',
                lineHeight: section.lineSpacing || 1.15,
                maxHeight: contentHeight ? `${contentHeight}px` : `${maxContentHeight}px`,
                overflow: 'hidden',
                color: '#1e293b',
                fontFamily: '"Instrument Sans", sans-serif'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  transform: 'translateY(-50%)',
                }}
                dangerouslySetInnerHTML={{ __html: section.content || '' }}
              />
            </div>
          </>
        ) : isEditingContent ? (
          <div className="h-full flex flex-col" style={{ overflow: 'visible' }}>
            <div className="flex-1" style={{ overflow: 'visible' }}>
              <RichTextEditor
                content={section.content}
                onChange={(content) => onUpdate({ ...section, content })}
                themeColors={themeColors}
                maxHeight={contentHeight ? contentHeight - 80 : maxContentHeight - 80}
                defaultFontSize="14pt"
                initialLineSpacing={section.lineSpacing || 1.15}
                initialParagraphSpacing={section.paragraphSpacing || 16}
                onSpacingChange={(line, para) => onUpdate({ ...section, lineSpacing: line, paragraphSpacing: para })}
              />
            </div>
            <button
              onClick={() => setIsEditingContent(false)}
              className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 self-start"
            >
              Done Editing
            </button>
          </div>
        ) : (
          <>
            <style>{`
              .letter-content-edit { color: #1e293b; }
              .letter-content-edit p { margin: ${section.paragraphSpacing || 16}px 0; }
              .letter-content-edit p:first-child { margin-top: 0; }
              .letter-content-edit li { margin: ${Math.max(1, (section.paragraphSpacing || 16) / 2)}px 0; }
            `}</style>
            <div
              className="prose prose-lg max-w-none cursor-pointer p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-slate-400 transition-colors h-full letter-content-edit"
              style={{
                direction: 'ltr',
                textAlign: 'left',
                fontSize: '14pt',
                lineHeight: section.lineSpacing || 1.15,
                minHeight: '100px',
                maxHeight: contentHeight ? `${contentHeight}px` : `${maxContentHeight - 40}px`,
                overflowY: 'auto',
                fontFamily: '"Instrument Sans", sans-serif'
              }}
              onClick={() => setIsEditingContent(true)}
            >
              {section.content ? (
                <div dangerouslySetInnerHTML={{ __html: section.content }} />
              ) : (
                <p><strong>Dear Residents,</strong></p>
              )}
              {!section.content && <p className="text-slate-400">Click here to write your opening letter...</p>}
            </div>
          </>
        )}

        {/* Resize handle - only in edit mode */}
        {!isPreview && (
          <div
            onMouseDown={handleContentResizeStart}
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-20 h-3 cursor-ns-resize flex items-center justify-center group"
            title="Drag to resize"
          >
            <div 
              className="w-12 h-1.5 rounded-full bg-slate-300 group-hover:bg-slate-500 transition-colors"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
            />
          </div>
        )}

        {/* Height indicator while resizing */}
        {isResizingContent && (
          <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {contentHeight}px / {maxContentHeight}px max
          </div>
        )}
      </div>

      {/* Two fixed bottom images */}
      <div className="flex gap-6 mt-4" ref={bottomCanvasRef}>
        {/* Bottom Image 1 */}
        <div className="flex-1 relative" style={{ height: '240px' }}>
          <ImageFrame
            imageData={bottomImage1}
            onUpdate={(updated) => onUpdate({ ...section, bottomImage1: updated })}
            onDelete={() => onUpdate({ ...section, bottomImage1: { id: 'bottom1', width: 400, height: 240, posX: 0, posY: 0 } })}
            themeColors={themeColors}
            editable={!isPreview}
            canvasWidth={bottomCanvasWidth / 2 - 12}
            canvasMaxHeight={240}
            lightBackground={true}
          />
        </div>

        {/* Bottom Image 2 */}
        <div className="flex-1 relative" style={{ height: '240px' }}>
          <ImageFrame
            imageData={bottomImage2}
            onUpdate={(updated) => onUpdate({ ...section, bottomImage2: updated })}
            onDelete={() => onUpdate({ ...section, bottomImage2: { id: 'bottom2', width: 400, height: 240, posX: 0, posY: 0 } })}
            themeColors={themeColors}
            editable={!isPreview}
            canvasWidth={bottomCanvasWidth / 2 - 12}
            canvasMaxHeight={240}
            lightBackground={true}
          />
        </div>
      </div>
    </div>
  );
};

// Footer Section Component
const FooterSection = ({ section, onUpdate, themeColors, logo, isPreview }) => {
  return (
    <div 
      data-section="footer"
      className="p-12 text-center text-white flex flex-col items-center justify-center"
      style={{
        backgroundColor: themeColors?.primary || '#2B3E50',
        minHeight: isPreview ? '400px' : '500px',
        height: isPreview ? 'auto' : '500px',
        width: '990px'
      }}
    >
      {logo && (
        <div className="w-28 h-28 mx-auto mb-6">
          <img src={logo} alt="Logo" className="w-full h-full object-contain" />
        </div>
      )}
      
      {isPreview ? (
        <>
          {section.name && <h2 className="text-2xl font-bold">{section.name}</h2>}
          {section.subtitle && <p className="text-lg font-semibold mt-2">{section.subtitle}</p>}
          
          <div className="mt-6 space-y-1" style={{ color: themeColors?.gold || '#D4B896' }}>
            {section.address && <p className="text-lg">{section.address}</p>}
            {section.cityStateZip && <p className="text-lg">{section.cityStateZip}</p>}
            {section.phone && <p className="text-lg">{section.phone}</p>}
            {section.email && <p className="text-lg">{section.email}</p>}
            {section.website && <p className="text-lg underline">{section.website}</p>}
          </div>
        </>
      ) : (
        <>
          <input
            type="text"
            value={section.name || ''}
            onChange={(e) => onUpdate({ ...section, name: e.target.value })}
            placeholder="Organization Name"
            className="text-2xl font-bold bg-transparent border-none text-center w-full focus:outline-none"
          />
          
          <input
            type="text"
            value={section.subtitle || ''}
            onChange={(e) => onUpdate({ ...section, subtitle: e.target.value })}
            placeholder="Department or Division"
            className="text-lg font-semibold bg-transparent border-none text-center w-full mt-2 focus:outline-none"
          />
          
          <div className="mt-6 space-y-2" style={{ color: themeColors?.gold || '#D4B896' }}>
            <input
              type="text"
              value={section.address || ''}
              onChange={(e) => onUpdate({ ...section, address: e.target.value })}
              placeholder="Street Address"
              className="bg-transparent border-none text-center w-full focus:outline-none text-lg"
              style={{ color: themeColors?.gold || '#D4B896' }}
            />
            <input
              type="text"
              value={section.cityStateZip || ''}
              onChange={(e) => onUpdate({ ...section, cityStateZip: e.target.value })}
              placeholder="City, State ZIP"
              className="bg-transparent border-none text-center w-full focus:outline-none text-lg"
              style={{ color: themeColors?.gold || '#D4B896' }}
            />
            <input
              type="text"
              value={section.phone || ''}
              onChange={(e) => onUpdate({ ...section, phone: e.target.value })}
              placeholder="Phone: 000-000-0000"
              className="bg-transparent border-none text-center w-full focus:outline-none text-lg"
              style={{ color: themeColors?.gold || '#D4B896' }}
            />
            <input
              type="email"
              value={section.email || ''}
              onChange={(e) => onUpdate({ ...section, email: e.target.value })}
              placeholder="email@organization.com"
              className="bg-transparent border-none text-center w-full focus:outline-none text-lg"
              style={{ color: themeColors?.gold || '#D4B896' }}
            />
            <input
              type="url"
              value={section.website || ''}
              onChange={(e) => onUpdate({ ...section, website: e.target.value })}
              placeholder="https://www.website.com"
              className="bg-transparent border-none text-center w-full focus:outline-none text-lg underline"
              style={{ color: themeColors?.gold || '#D4B896' }}
            />
          </div>
        </>
      )}
      
      <p className="mt-8 text-sm opacity-80">
        © {new Date().getFullYear()} All Rights Reserved
      </p>
    </div>
  );
};

// Move element to another section dropdown
const MoveToDropdown = ({ targetSections, onMove }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (targetSections.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="p-1 text-blue-400 opacity-0 group-hover:opacity-100 hover:bg-blue-500/20 rounded transition-opacity z-10"
        title="Move to another section"
      >
        <ArrowRightLeft className="w-4 h-4" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[200]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          <div className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-[201] min-w-[180px] overflow-hidden">
            <p className="px-3 py-2 text-xs text-slate-400 border-b border-slate-700">Move to...</p>
            {targetSections.map((s) => (
              <button
                key={s.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(s.id);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 transition-colors"
              >
                {s.title || s.sectionNumber || 'Untitled Section'}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Content Section Component
// Helper to convert number to word for section numbers
const numberToWord = (num) => {
  const words = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];
  return num <= 20 ? words[num] : num.toString();
};

const ContentSection = ({ section, onUpdate, onDelete, onMoveElement, contentSections, contentIndex, themeColors, logo, isPreview }) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(1200);
  const canvasRef = useRef(null);

  // Measure canvas width on mount, resize, and when element size changes
  useEffect(() => {
    const measureCanvas = () => {
      if (canvasRef.current) {
        setCanvasWidth(canvasRef.current.offsetWidth);
      }
    };
    
    // Initial measurement after a short delay to ensure render is complete
    const timeoutId = setTimeout(measureCanvas, 100);
    
    // Also measure on window resize
    window.addEventListener('resize', measureCanvas);
    
    // Use ResizeObserver for more reliable size tracking
    let resizeObserver;
    if (canvasRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(measureCanvas);
      resizeObserver.observe(canvasRef.current);
    }
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', measureCanvas);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  // Helper to find the lowest point of all existing elements
  const getLowestPoint = () => {
    let lowestY = 0;
    
    // Check cards
    (section.cards || []).forEach(card => {
      const bottom = (card.posY || 0) + (card.height || 200) + 40; // 40px gap for card
      if (bottom > lowestY) lowestY = bottom;
    });
    
    // Check charts (need extra space for controls row + caption input)
    (section.charts || []).forEach(chart => {
      const bottom = (chart.posY || 0) + (chart.height || 320) + 60; // 60px for controls + caption + gap
      if (bottom > lowestY) lowestY = bottom;
    });
    
    // Check images (need extra space for shape selector + size + caption)
    (section.images || []).forEach(img => {
      const bottom = (img.posY || 0) + (img.height || 200) + 60; // 60px for controls + caption + gap
      if (bottom > lowestY) lowestY = bottom;
    });
    
    // Check stats
    (section.stats || []).forEach(stat => {
      const bottom = (stat.posY || 0) + (stat.height || 180) + 40;
      if (bottom > lowestY) lowestY = bottom;
    });
    
    // Check textBlocks
    (section.textBlocks || []).forEach(tb => {
      const bottom = (tb.posY || 0) + (tb.height || 200) + 40;
      if (bottom > lowestY) lowestY = bottom;
    });
    
    return lowestY;
  };

  // Helper to find the best position for a new element (tries horizontal first, then vertical)
  const findBestPosition = (newWidth, newHeight, controlsHeight = 40) => {
    const totalHeight = newHeight + controlsHeight;
    const GAP = 20; // Gap between elements
    
    // Get actual canvas width from ref, with fallback
    const effectiveCanvasWidth = canvasRef.current ? canvasRef.current.offsetWidth : 1400;
    
    // Collect all elements with their bounding boxes
    const elements = [];
    
    (section.cards || []).forEach(card => {
      elements.push({
        x: card.posX || 0,
        y: card.posY || 0,
        width: card.width || 350,
        height: (card.height || 200) + 40
      });
    });
    
    (section.charts || []).forEach(chart => {
      elements.push({
        x: chart.posX || 0,
        y: chart.posY || 0,
        width: chart.width || 780,
        height: (chart.height || 320) + 60
      });
    });
    
    (section.images || []).forEach(img => {
      elements.push({
        x: img.posX || 0,
        y: img.posY || 0,
        width: img.width || 300,
        height: (img.height || 200) + 60
      });
    });
    
    (section.stats || []).forEach(stat => {
      elements.push({
        x: stat.posX || 0,
        y: stat.posY || 0,
        width: stat.width || 300,
        height: (stat.height || 180) + 40
      });
    });
    
    (section.textBlocks || []).forEach(tb => {
      elements.push({
        x: tb.posX || 0,
        y: tb.posY || 0,
        width: tb.width || 600,
        height: (tb.height || 200) + 40
      });
    });
    
    // If no elements, place at origin
    if (elements.length === 0) {
      return { x: 0, y: 0 };
    }
    
    // Simple overlap check
    const overlaps = (x, y, w, h) => {
      for (const el of elements) {
        const elRight = el.x + el.width;
        const elBottom = el.y + el.height;
        const newRight = x + w;
        const newBottom = y + h;
        
        if (x < elRight && newRight > el.x && y < elBottom && newBottom > el.y) {
          return true;
        }
      }
      return false;
    };
    
    // Try placing at origin first
    if (!overlaps(0, 0, newWidth, totalHeight) && totalHeight <= maxCanvasHeight) {
      return { x: 0, y: 0 };
    }
    
    // Get unique Y positions (rows)
    const rowYs = [...new Set(elements.map(el => el.y))].sort((a, b) => a - b);
    
    // For each row, try to find horizontal space
    for (const rowY of rowYs) {
      // Get elements in this row (within 30px of rowY)
      const rowElements = elements.filter(el => Math.abs(el.y - rowY) < 30);
      rowElements.sort((a, b) => a.x - b.x);
      
      // Try placing at the start of the row
      if (rowElements[0].x >= newWidth + GAP) {
        const testX = 0;
        if (!overlaps(testX, rowY, newWidth, totalHeight) && rowY + totalHeight <= maxCanvasHeight) {
          return { x: testX, y: rowY };
        }
      }
      
      // Try placing after each element in the row
      for (const el of rowElements) {
        const testX = el.x + el.width + GAP;
        
        // CRITICAL: Check if it fits within canvas width BEFORE checking overlap
        if (testX + newWidth > effectiveCanvasWidth) {
          // Doesn't fit, skip this position
          continue;
        }
        
        if (!overlaps(testX, rowY, newWidth, totalHeight) && rowY + totalHeight <= maxCanvasHeight) {
          return { x: testX, y: rowY };
        }
      }
    }
    
    // No horizontal space found, place below all elements
    const lowestY = getLowestPoint();
    if (lowestY + totalHeight <= maxCanvasHeight) {
      return { x: 0, y: lowestY };
    }
    
    // No space at all
    return null;
  };

  const maxCanvasHeight = 1100;
  
  // Calculate actual canvas height needed for preview
  const actualCanvasHeight = (() => {
    if (isPreview) {
      // In preview, use actual content height with some padding
      return Math.max(100, getLowestPoint());
    }
    // In edit mode, use full canvas for drag space
    return maxCanvasHeight;
  })();

  // Reflow elements to fill gaps after deletion (fills horizontally first, then vertically)
  const reflowElements = (updatedSection) => {
    const GAP = 20; // Gap between elements
    const effectiveCanvasWidth = canvasRef.current ? canvasRef.current.offsetWidth : 1400;
    
    // Collect all elements with their dimensions
    const allElements = [];
    
    (updatedSection.cards || []).forEach((card) => {
      allElements.push({
        type: 'card',
        id: card.id,
        posX: card.posX || 0,
        posY: card.posY || 0,
        width: card.width || 350,
        height: card.height || 200,
        data: card
      });
    });
    
    (updatedSection.charts || []).forEach((chart) => {
      allElements.push({
        type: 'chart',
        id: chart.id,
        posX: chart.posX || 0,
        posY: chart.posY || 0,
        width: chart.width || 780,
        height: chart.height || 320,
        data: chart
      });
    });
    
    (updatedSection.images || []).forEach((img) => {
      allElements.push({
        type: 'image',
        id: img.id,
        posX: img.posX || 0,
        posY: img.posY || 0,
        width: img.width || 300,
        height: img.height || 200,
        data: img
      });
    });
    
    (updatedSection.stats || []).forEach((stat) => {
      allElements.push({
        type: 'stat',
        id: stat.id,
        posX: stat.posX || 0,
        posY: stat.posY || 0,
        width: stat.width || 300,
        height: stat.height || 180,
        data: stat
      });
    });
    
    (updatedSection.textBlocks || []).forEach((tb) => {
      allElements.push({
        type: 'textBlock',
        id: tb.id,
        posX: tb.posX || 0,
        posY: tb.posY || 0,
        width: tb.width || 600,
        height: tb.height || 200,
        data: tb
      });
    });
    
    // If no elements, return as-is
    if (allElements.length === 0) {
      return updatedSection;
    }
    
    // Sort by position: Y first (top to bottom), then X (left to right)
    allElements.sort((a, b) => {
      if (Math.abs(a.posY - b.posY) < 50) {
        // Same row (within 50px), sort by X
        return a.posX - b.posX;
      }
      return a.posY - b.posY;
    });
    
    // Place elements: fill horizontally first, then move to next row
    const placedElements = [];
    
    allElements.forEach((el) => {
      let placed = false;
      
      // Try to find a position in existing rows first
      // Group placed elements by rows
      const rows = [];
      placedElements.forEach(placed => {
        let foundRow = rows.find(row => Math.abs(row.y - placed.newY) < 30);
        if (foundRow) {
          foundRow.elements.push(placed);
          foundRow.maxHeight = Math.max(foundRow.maxHeight, placed.height);
        } else {
          rows.push({
            y: placed.newY,
            maxHeight: placed.height,
            elements: [placed]
          });
        }
      });
      rows.sort((a, b) => a.y - b.y);
      
      // Try to fit in an existing row
      for (const row of rows) {
        // Find rightmost edge in this row
        let rightEdge = 0;
        row.elements.forEach(el => {
          const elRight = el.newX + el.width + GAP;
          if (elRight > rightEdge) rightEdge = elRight;
        });
        
        // Check if element fits in this row
        if (rightEdge + el.width <= effectiveCanvasWidth) {
          placedElements.push({
            ...el,
            newX: rightEdge,
            newY: row.y
          });
          placed = true;
          break;
        }
      }
      
      // If couldn't fit in existing row, start a new row
      if (!placed) {
        let newRowY = 0;
        if (rows.length > 0) {
          const lastRow = rows[rows.length - 1];
          newRowY = lastRow.y + lastRow.maxHeight + GAP;
        }
        
        placedElements.push({
          ...el,
          newX: 0,
          newY: newRowY
        });
      }
    });
    
    // Apply new positions
    const newCards = [...(updatedSection.cards || [])];
    const newCharts = [...(updatedSection.charts || [])];
    const newImages = [...(updatedSection.images || [])];
    const newStats = [...(updatedSection.stats || [])];
    const newTextBlocks = [...(updatedSection.textBlocks || [])];
    
    placedElements.forEach(el => {
      if (el.type === 'card') {
        const idx = newCards.findIndex(c => c.id === el.id);
        if (idx !== -1) {
          newCards[idx] = { ...newCards[idx], posX: el.newX, posY: el.newY };
        }
      } else if (el.type === 'chart') {
        const idx = newCharts.findIndex(c => c.id === el.id);
        if (idx !== -1) {
          newCharts[idx] = { ...newCharts[idx], posX: el.newX, posY: el.newY };
        }
      } else if (el.type === 'image') {
        const idx = newImages.findIndex(i => i.id === el.id);
        if (idx !== -1) {
          newImages[idx] = { ...newImages[idx], posX: el.newX, posY: el.newY };
        }
      } else if (el.type === 'stat') {
        const idx = newStats.findIndex(s => s.id === el.id);
        if (idx !== -1) {
          newStats[idx] = { ...newStats[idx], posX: el.newX, posY: el.newY };
        }
      } else if (el.type === 'textBlock') {
        const idx = newTextBlocks.findIndex(t => t.id === el.id);
        if (idx !== -1) {
          newTextBlocks[idx] = { ...newTextBlocks[idx], posX: el.newX, posY: el.newY };
        }
      }
    });
    
    return {
      ...updatedSection,
      cards: newCards,
      charts: newCharts,
      images: newImages,
      stats: newStats,
      textBlocks: newTextBlocks
    };
  };

  // Delete handlers - preserve positions of remaining elements
  const deleteCard = (idx) => {
    onUpdate({
      ...section,
      cards: section.cards.filter((_, i) => i !== idx)
    });
  };

  const deleteChart = (idx) => {
    onUpdate({
      ...section,
      charts: section.charts.filter((_, i) => i !== idx)
    });
  };

  const deleteImage = (idx) => {
    onUpdate({
      ...section,
      images: section.images.filter((_, i) => i !== idx)
    });
  };

  const deleteStat = (idx) => {
    onUpdate({
      ...section,
      stats: section.stats.filter((_, i) => i !== idx)
    });
  };

  const deleteTextBlock = (idx) => {
    onUpdate({
      ...section,
      textBlocks: section.textBlocks.filter((_, i) => i !== idx)
    });
  };

  const deleteFooter = (idx) => {
    onUpdate({
      ...section,
      footers: section.footers.filter((_, i) => i !== idx)
    });
  };

  // Other content sections available as move targets
  const targetSections = (contentSections || []).filter(s => s.id !== section.id);

  // Move element to another section
  const moveElement = (elementType, idx, targetSectionId) => {
    const arrayKey = elementType;
    const element = section[arrayKey]?.[idx];
    if (!element || !onMoveElement) return;

    // Reset position so it gets placed automatically in the target
    const movedElement = { ...element, posX: 0, posY: 0 };

    // Remove from current section
    onUpdate({
      ...section,
      [arrayKey]: section[arrayKey].filter((_, i) => i !== idx)
    });

    // Add to target section
    onMoveElement(targetSectionId, arrayKey, movedElement);
  };

  const addCard = () => {
    const cardWidth = 350;
    const cardHeight = 200;
    const position = findBestPosition(cardWidth, cardHeight, 40);
    
    if (!position) {
      alert('No more space available on this page. Please delete or resize existing elements.');
      return;
    }
    
    onUpdate({
      ...section,
      cards: [...(section.cards || []), { id: generateId(), title: '', content: '', width: cardWidth, height: cardHeight, posX: position.x, posY: position.y }]
    });
  };

  const addChart = () => {
    const chartWidth = 780;
    const chartHeight = 320;
    const position = findBestPosition(chartWidth, chartHeight, 60);
    
    if (!position) {
      alert('No more space available on this page. Please delete or resize existing elements.');
      return;
    }
    
    onUpdate({
      ...section,
      charts: [...(section.charts || []), { id: generateId(), embedUrl: '', width: chartWidth, height: chartHeight, posX: position.x, posY: position.y }]
    });
  };

  const addImage = () => {
    const imageWidth = 300;
    const imageHeight = 200;
    const position = findBestPosition(imageWidth, imageHeight, 60);
    
    if (!position) {
      alert('No more space available on this page. Please delete or resize existing elements.');
      return;
    }
    
    onUpdate({
      ...section,
      images: [...(section.images || []), { id: generateId(), shape: 'rectangle', width: imageWidth, height: imageHeight, posX: position.x, posY: position.y }]
    });
  };

  const addStat = () => {
    const statWidth = 300;
    const statHeight = 180;
    const position = findBestPosition(statWidth, statHeight, 40);
    
    if (!position) {
      alert('No more space available on this page. Please delete or resize existing elements.');
      return;
    }
    
    onUpdate({
      ...section,
      stats: [...(section.stats || []), { id: generateId(), number: '', label: '', width: statWidth, height: statHeight, posX: position.x, posY: position.y }]
    });
  };

  const addTextBlock = () => {
    const textWidth = 600;
    const textHeight = 200;
    const position = findBestPosition(textWidth, textHeight, 40);

    if (!position) {
      alert('No more space available on this page. Please delete or resize existing elements.');
      return;
    }

    onUpdate({
      ...section,
      textBlocks: [...(section.textBlocks || []), { id: generateId(), content: '', width: textWidth, height: textHeight, posX: position.x, posY: position.y }]
    });
  };

  const addFooter = () => {
    const footerWidth = 860;
    const footerHeight = 280;
    const position = findBestPosition(footerWidth, footerHeight, 40);

    if (!position) {
      alert('No more space available on this page. Please delete or resize existing elements.');
      return;
    }

    onUpdate({
      ...section,
      footers: [...(section.footers || []), {
        id: generateId(),
        name: '',
        subtitle: '',
        address: '',
        cityStateZip: '',
        phone: '',
        website: '',
        width: footerWidth,
        height: footerHeight,
        posX: position.x,
        posY: position.y
      }]
    });
  };

  return (
    <div 
      data-section="content"
      className="relative overflow-hidden"
      style={{
        backgroundColor: section.bgColor || themeColors?.primary || '#2B3E50',
        color: 'white',
        minHeight: '1400px',
        maxHeight: '1400px',
        height: '1400px',
        width: '990px',
        padding: '64px 64px 50px 64px'
      }}
    >
      {!isPreview && (
        <button
          onClick={onDelete}
          className="absolute top-4 right-4 p-2 bg-red-500/80 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}

      <div className="text-center mb-12">
        {isPreview ? (
          <>
            {contentIndex > 0 && (
              <p className="text-sm uppercase tracking-widest mb-2" style={{ color: themeColors?.gold || '#D4B896' }}>
                Section {numberToWord(contentIndex)}
              </p>
            )}
            {section.title && (
              <h2 className="text-4xl font-light text-white">{section.title}</h2>
            )}
          </>
        ) : (
          <>
            <p
              className="text-sm uppercase tracking-widest mb-2"
              style={{ color: themeColors?.gold || '#D4B896' }}
            >
              Section {numberToWord(contentIndex)}
            </p>
            <input
              type="text"
              value={section.title || ''}
              onChange={(e) => onUpdate({ ...section, title: e.target.value })}
              placeholder="Section Title"
              className="text-4xl font-light bg-transparent border-none text-center w-full focus:outline-none text-white placeholder:text-white/50"
            />
          </>
        )}
      </div>

      {/* Background color picker - only in edit mode */}
      {!isPreview && (
        <div className="absolute top-4 left-4 flex items-center gap-2 z-10 bg-black/30 px-2 py-1 rounded">
          <label className="text-xs text-white">Background:</label>
          <input
            type="color"
            value={section.bgColor || themeColors?.primary || '#2B3E50'}
            onChange={(e) => onUpdate({ ...section, bgColor: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer"
          />
        </div>
      )}

      {/* Design notes from contributor */}
      {!isPreview && section.designNotes && (
        <div className="absolute top-4 right-4 z-10 max-w-xs">
          <div className="bg-amber-500/90 text-white px-3 py-2 rounded-lg shadow-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Contributor Note</span>
            </div>
            <p className="text-xs leading-relaxed">{section.designNotes}</p>
          </div>
        </div>
      )}

      {/* Add content buttons - only in edit mode */}
      {!isPreview && (
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={addCard}
            className="flex items-center gap-2 px-4 py-2 bg-black/40 text-white rounded-lg hover:bg-black/50 transition-colors border border-white/20"
          >
            <FileText className="w-4 h-4" />
            Add Card
          </button>
          <button
            onClick={addChart}
            className="flex items-center gap-2 px-4 py-2 bg-black/40 text-white rounded-lg hover:bg-black/50 transition-colors border border-white/20"
          >
            <BarChart3 className="w-4 h-4" />
            Add Chart
          </button>
          <button
            onClick={addImage}
            className="flex items-center gap-2 px-4 py-2 bg-black/40 text-white rounded-lg hover:bg-black/50 transition-colors border border-white/20"
          >
            <Image className="w-4 h-4" />
            Add Image
          </button>
          <button
            onClick={addStat}
            className="flex items-center gap-2 px-4 py-2 bg-black/40 text-white rounded-lg hover:bg-black/50 transition-colors border border-white/20"
          >
            <Hash className="w-4 h-4" />
            Add Stat
          </button>
          <button
            onClick={addTextBlock}
            className="flex items-center gap-2 px-4 py-2 bg-black/40 text-white rounded-lg hover:bg-black/50 transition-colors border border-white/20"
          >
            <Type className="w-4 h-4" />
            Add Text
          </button>
          <button
            onClick={addFooter}
            className="flex items-center gap-2 px-4 py-2 bg-black/40 text-white rounded-lg hover:bg-black/50 transition-colors border border-white/20"
          >
            <PanelBottom className="w-4 h-4" />
            Add Footer
          </button>
        </div>
      )}

      {/* Canvas for draggable items */}
      <div 
        ref={canvasRef}
        className="relative w-full"
        style={{ 
          height: isPreview ? `${actualCanvasHeight}px` : `${maxCanvasHeight}px`,
          minHeight: isPreview ? 'auto' : `${maxCanvasHeight}px`
        }}
      >
        {/* Cards */}
        {(section.cards || []).map((card, idx) => (
          <InfoCard
            key={card.id}
            card={card}
            onUpdate={(updated) => {
              const newCards = [...(section.cards || [])];
              newCards[idx] = updated;
              onUpdate({ ...section, cards: newCards });
            }}
            onDelete={() => deleteCard(idx)}
            onMove={targetSections.length > 0 ? (targetId) => moveElement('cards', idx, targetId) : null}
            targetSections={targetSections}
            themeColors={themeColors}
            editable={!isPreview}
            canvasWidth={canvasWidth}
            canvasMaxHeight={maxCanvasHeight}
          />
        ))}

        {/* Charts */}
        {(section.charts || []).map((chart, idx) => (
          <ChartContainer
            key={chart.id}
            chart={chart}
            onUpdate={(updated) => {
              const newCharts = [...(section.charts || [])];
              newCharts[idx] = updated;
              onUpdate({ ...section, charts: newCharts });
            }}
            onDelete={() => deleteChart(idx)}
            onMove={targetSections.length > 0 ? (targetId) => moveElement('charts', idx, targetId) : null}
            targetSections={targetSections}
            themeColors={themeColors}
            editable={!isPreview}
            canvasWidth={canvasWidth}
            canvasMaxHeight={maxCanvasHeight}
          />
        ))}

        {/* Images */}
        {(section.images || []).map((img, idx) => (
          <ImageFrame
            key={img.id}
            imageData={img}
            onUpdate={(updated) => {
              const newImages = [...(section.images || [])];
              newImages[idx] = updated;
              onUpdate({ ...section, images: newImages });
            }}
            onDelete={() => deleteImage(idx)}
            onMove={targetSections.length > 0 ? (targetId) => moveElement('images', idx, targetId) : null}
            targetSections={targetSections}
            themeColors={themeColors}
            editable={!isPreview}
            canvasWidth={canvasWidth}
            canvasMaxHeight={maxCanvasHeight}
          />
        ))}

        {/* Stats */}
        {(section.stats || []).map((stat, idx) => (
          <StatBox
            key={stat.id}
            stat={stat}
            onUpdate={(updated) => {
              const newStats = [...(section.stats || [])];
              newStats[idx] = updated;
              onUpdate({ ...section, stats: newStats });
            }}
            onDelete={() => deleteStat(idx)}
            onMove={targetSections.length > 0 ? (targetId) => moveElement('stats', idx, targetId) : null}
            targetSections={targetSections}
            themeColors={themeColors}
            editable={!isPreview}
            canvasWidth={canvasWidth}
            canvasMaxHeight={maxCanvasHeight}
          />
        ))}

        {/* Text Blocks */}
        {(section.textBlocks || []).map((textBlock, idx) => (
          <TextBlock
            key={textBlock.id}
            textBlock={textBlock}
            onUpdate={(updated) => {
              const newTextBlocks = [...(section.textBlocks || [])];
              newTextBlocks[idx] = updated;
              onUpdate({ ...section, textBlocks: newTextBlocks });
            }}
            onDelete={() => deleteTextBlock(idx)}
            onMove={targetSections.length > 0 ? (targetId) => moveElement('textBlocks', idx, targetId) : null}
            targetSections={targetSections}
            themeColors={themeColors}
            editable={!isPreview}
            canvasWidth={canvasWidth}
            canvasMaxHeight={maxCanvasHeight}
          />
        ))}

        {/* Footers */}
        {(section.footers || []).map((footer, idx) => (
          <FooterElement
            key={footer.id}
            footer={footer}
            onUpdate={(updated) => {
              const newFooters = [...(section.footers || [])];
              newFooters[idx] = updated;
              onUpdate({ ...section, footers: newFooters });
            }}
            onDelete={() => deleteFooter(idx)}
            themeColors={themeColors}
            logo={logo}
            editable={!isPreview}
            canvasWidth={canvasWidth}
            canvasMaxHeight={maxCanvasHeight}
          />
        ))}
      </div>
    </div>
  );
};

// Main Report Builder Component
export default function ReportBuilder() {
  const [logo, setLogo] = useState(null);
  const [themeColors, setThemeColors] = useState(DEFAULT_THEME_COLORS);
  const [sections, setSections] = useState([
    { id: generateId(), type: 'banner', title: '', subtitle: '', tagline: '' },
    { id: generateId(), type: 'letter', heading: '', subheading: '', content: '', images: [] },
  ]);
  const [showPreview, setShowPreview] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [draggedSectionIdx, setDraggedSectionIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showDraftNotification, setShowDraftNotification] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [isSavingToServer, setIsSavingToServer] = useState(false);
  const [isLogoLoading, setIsLogoLoading] = useState(false);
  const logoInputRef = useRef(null);
  
  // Undo history state
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const MAX_HISTORY = 50;
  const isUndoingRef = useRef(false);
  
  // Save current state to history
  const saveToHistory = useCallback(() => {
    if (isUndoingRef.current) return;
    
    const currentState = {
      logo,
      themeColors,
      sections: JSON.parse(JSON.stringify(sections))
    };
    
    setHistory(prev => {
      // If we're not at the end of history, remove future states
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add current state
      newHistory.push(currentState);
      // Limit history size
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [logo, themeColors, sections, historyIndex]);
  
  // Debounced history save (to avoid saving every keystroke)
  const historyTimeoutRef = useRef(null);
  const saveToHistoryDebounced = useCallback(() => {
    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current);
    }
    historyTimeoutRef.current = setTimeout(() => {
      saveToHistory();
    }, 1000); // Save to history after 1 second of no changes
  }, [saveToHistory]);
  
  // Track changes to save history
  useEffect(() => {
    saveToHistoryDebounced();
    return () => {
      if (historyTimeoutRef.current) {
        clearTimeout(historyTimeoutRef.current);
      }
    };
  }, [sections, logo, themeColors]);
  
  // Undo function
  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    
    isUndoingRef.current = true;
    const prevState = history[historyIndex - 1];
    
    if (prevState) {
      setLogo(prevState.logo);
      setThemeColors(prevState.themeColors);
      setSections(prevState.sections);
      setHistoryIndex(prev => prev - 1);
    }
    
    // Reset the flag after state updates
    setTimeout(() => {
      isUndoingRef.current = false;
    }, 100);
  }, [history, historyIndex]);
  
  // Redo function
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    
    isUndoingRef.current = true;
    const nextState = history[historyIndex + 1];
    
    if (nextState) {
      setLogo(nextState.logo);
      setThemeColors(nextState.themeColors);
      setSections(nextState.sections);
      setHistoryIndex(prev => prev + 1);
    }
    
    // Reset the flag after state updates
    setTimeout(() => {
      isUndoingRef.current = false;
    }, 100);
  }, [history, historyIndex]);
  
  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
  
  // Version management state
  const [savedVersions, setSavedVersions] = useState([]);
  const [showVersionManager, setShowVersionManager] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [versionNameInput, setVersionNameInput] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // IndexedDB helper functions for large data storage
  const openDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ReportBuilderDB', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('versions')) {
          db.createObjectStore('versions', { keyPath: 'id' });
        }
      };
    });
  };

  const saveVersionToDB = async (version) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['versions'], 'readwrite');
      const store = transaction.objectStore('versions');
      const request = store.put(version);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  const getAllVersionsFromDB = async () => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['versions'], 'readonly');
      const store = transaction.objectStore('versions');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  };

  const getVersionFromDB = async (id) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['versions'], 'readonly');
      const store = transaction.objectStore('versions');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const deleteVersionFromDB = async (id) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['versions'], 'readwrite');
      const store = transaction.objectStore('versions');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  // Load saved versions from IndexedDB on mount
  useEffect(() => {
    const loadVersions = async () => {
      try {
        const versions = await getAllVersionsFromDB();
        console.log('Loaded versions from IndexedDB:', versions.length);
        setSavedVersions(versions.map(v => ({ id: v.id, name: v.name, savedAt: v.savedAt })));
      } catch (error) {
        console.error('Error loading versions:', error);
      }
    };
    loadVersions();
  }, []);

  // Check for saved draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('reportBuilderDraft');
    if (savedDraft) {
      setHasSavedDraft(true);
      setShowDraftNotification(true);
      const draft = JSON.parse(savedDraft);
      if (draft.lastSaved) {
        setLastSaved(new Date(draft.lastSaved));
      }
    }
  }, []);

  // Check for generated report from project (sessionStorage)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('from') === 'project') {
      try {
        const generatedReport = sessionStorage.getItem('generatedReport');
        const projectInfo = sessionStorage.getItem('generatedReportProject');

        // Set the project ID if available
        if (projectInfo) {
          const project = JSON.parse(projectInfo);
          if (project.id) {
            setCurrentProjectId(project.id);
          }
        }

        if (generatedReport) {
          const reportData = JSON.parse(generatedReport);

          // Load logo
          if (reportData.logo) {
            setLogo(reportData.logo);
          }

          // Load theme colors
          if (reportData.themeColors) {
            setThemeColors({
              primary: ensureHexColor(reportData.themeColors.primary, DEFAULT_THEME_COLORS.primary),
              primaryDark: ensureHexColor(reportData.themeColors.primaryDark, DEFAULT_THEME_COLORS.primaryDark),
              accent: ensureHexColor(reportData.themeColors.accent, DEFAULT_THEME_COLORS.accent),
              gold: ensureHexColor(reportData.themeColors.gold, DEFAULT_THEME_COLORS.gold),
            });
          }

          // Load sections
          if (reportData.sections && reportData.sections.length > 0) {
            const loadedSections = reportData.sections.map((section, idx) => ({
              id: generateId(),
              ...section,
            }));
            setSections(loadedSections);
          }

          // Clear sessionStorage after loading
          sessionStorage.removeItem('generatedReport');
          sessionStorage.removeItem('generatedReportProject');

          // Hide draft notification since we loaded from project
          setShowDraftNotification(false);
        }
      } catch (error) {
        console.error('Error loading generated report:', error);
      }
    }
  }, []);

  // Auto-save every 30 seconds
  useEffect(() => {
    const autoSaveInterval = setInterval(async () => {
      // Save directly in the interval to avoid stale closure issues
      const draft = {
        logo,
        themeColors,
        sections,
        lastSaved: new Date().toISOString(),
      };
      localStorage.setItem('reportBuilderDraft', JSON.stringify(draft));
      setHasSavedDraft(true);
      setLastSaved(new Date());

      // Also auto-save to server if working on a project
      if (currentProjectId) {
        try {
          await fetch(`/api/projects/${currentProjectId}/drafts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'Report Draft',
              data: draft,
            }),
          });
        } catch (error) {
          console.error('Auto-save to server failed:', error);
        }
      }
    }, 30000);
    return () => clearInterval(autoSaveInterval);
  }, [sections, themeColors, logo, currentProjectId]);

  // Helper function to save draft to server
  const saveDraftToServer = async (draftData, silent = true) => {
    if (!currentProjectId) return;

    setIsSavingToServer(true);
    try {
      const response = await fetch(`/api/projects/${currentProjectId}/drafts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Report Draft',
          data: draftData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save to server');
      }

      if (!silent) {
        console.log('Draft saved to server');
      }
    } catch (error) {
      console.error('Error saving draft to server:', error);
    } finally {
      setIsSavingToServer(false);
    }
  };

  const saveDraft = async (silent = false) => {
    const draft = {
      logo,
      themeColors,
      sections,
      lastSaved: new Date().toISOString(),
    };

    // Save to localStorage
    localStorage.setItem('reportBuilderDraft', JSON.stringify(draft));
    setHasSavedDraft(true);
    setLastSaved(new Date());

    // Also save to server if working on a project
    if (currentProjectId) {
      await saveDraftToServer(draft, silent);
    }

    if (!silent) {
      alert('Draft saved successfully!');
    }
  };

  const loadDraft = (skipConfirm = false) => {
    const savedDraft = localStorage.getItem('reportBuilderDraft');
    if (savedDraft) {
      if (!skipConfirm) {
        const confirmLoad = confirm('This will replace your current work with the saved draft. Continue?');
        if (!confirmLoad) return;
      }
      const draft = JSON.parse(savedDraft);
      if (draft.logo) setLogo(draft.logo);
      if (draft.themeColors) {
        // Ensure all colors are valid hex format
        setThemeColors({
          primary: ensureHexColor(draft.themeColors.primary, DEFAULT_THEME_COLORS.primary),
          primaryDark: ensureHexColor(draft.themeColors.primaryDark, DEFAULT_THEME_COLORS.primaryDark),
          accent: ensureHexColor(draft.themeColors.accent, DEFAULT_THEME_COLORS.accent),
          gold: ensureHexColor(draft.themeColors.gold, DEFAULT_THEME_COLORS.gold),
        });
      }
      if (draft.sections) setSections(draft.sections);
      if (draft.lastSaved) setLastSaved(new Date(draft.lastSaved));
      if (!skipConfirm) {
        alert('Draft loaded successfully!');
      }
    } else {
      alert('No saved draft found.');
    }
  };

  const clearDraft = () => {
    const confirmClear = confirm('This will permanently delete your saved draft. Continue?');
    if (confirmClear) {
      localStorage.removeItem('reportBuilderDraft');
      setHasSavedDraft(false);
      setLastSaved(null);
      alert('Draft cleared.');
    }
  };

  // Version management functions
  const saveVersion = async (name) => {
    if (!name.trim()) {
      setFeedbackMessage('Please enter a version name.');
      setTimeout(() => setFeedbackMessage(''), 3000);
      return;
    }

    if (savedVersions.length >= 3) {
      setFeedbackMessage('Maximum 3 versions. Delete one first.');
      setTimeout(() => setFeedbackMessage(''), 3000);
      return;
    }

    // Check for duplicate names
    if (savedVersions.some(v => v.name.toLowerCase() === name.trim().toLowerCase())) {
      setFeedbackMessage('Version name already exists.');
      setTimeout(() => setFeedbackMessage(''), 3000);
      return;
    }

    const version = {
      id: generateId(),
      name: name.trim(),
      savedAt: new Date().toISOString(),
      data: {
        logo,
        themeColors,
        sections,
      }
    };

    try {
      await saveVersionToDB(version);
      setSavedVersions([...savedVersions, { id: version.id, name: version.name, savedAt: version.savedAt }]);
      setVersionNameInput('');
      setFeedbackMessage(`Version "${name.trim()}" saved with all images!`);
      setTimeout(() => setFeedbackMessage(''), 3000);
    } catch (e) {
      console.error('Error saving version:', e);
      setFeedbackMessage('Failed to save version. Please try again.');
      setTimeout(() => setFeedbackMessage(''), 5000);
    }
  };
  
  const loadVersion = async (versionId) => {
    try {
      const version = await getVersionFromDB(versionId);

      if (!version) {
        console.error('Version not found.');
        setFeedbackMessage('Version not found.');
        setTimeout(() => setFeedbackMessage(''), 3000);
        return;
      }

      if (!version.data) {
        console.error('Version data is corrupted.');
        setFeedbackMessage('Version data is corrupted.');
        setTimeout(() => setFeedbackMessage(''), 3000);
        return;
      }

      // Load logo (or clear it if none saved)
      setLogo(version.data.logo || null);

      // Load theme colors (or reset to defaults)
      if (version.data.themeColors) {
        setThemeColors({
          primary: ensureHexColor(version.data.themeColors.primary, DEFAULT_THEME_COLORS.primary),
          primaryDark: ensureHexColor(version.data.themeColors.primaryDark, DEFAULT_THEME_COLORS.primaryDark),
          accent: ensureHexColor(version.data.themeColors.accent, DEFAULT_THEME_COLORS.accent),
          gold: ensureHexColor(version.data.themeColors.gold, DEFAULT_THEME_COLORS.gold),
        });
      } else {
        setThemeColors(DEFAULT_THEME_COLORS);
      }

      // Load sections (or reset to defaults)
      if (version.data.sections && version.data.sections.length > 0) {
        setSections(version.data.sections);
      } else {
        setSections([
          { id: generateId(), type: 'banner', title: '', subtitle: '', tagline: '' },
          { id: generateId(), type: 'letter', heading: '', subheading: '', content: '', images: [] },
        ]);
      }

      setShowVersionManager(false);
      setFeedbackMessage(`Version "${version.name}" loaded!`);
      setTimeout(() => setFeedbackMessage(''), 3000);
    } catch (error) {
      console.error('Error loading version:', error);
      setFeedbackMessage('Failed to load version. Please try again.');
      setTimeout(() => setFeedbackMessage(''), 3000);
    }
  };
  
  const deleteVersion = async (versionId) => {
    try {
      // Find the version name for the feedback message
      const versionToDelete = savedVersions.find(v => v.id === versionId);
      if (!versionToDelete) {
        setFeedbackMessage('Version not found.');
        setTimeout(() => setFeedbackMessage(''), 3000);
        return;
      }

      await deleteVersionFromDB(versionId);
      setSavedVersions(savedVersions.filter(v => v.id !== versionId));
      setFeedbackMessage(`Version "${versionToDelete.name}" deleted.`);
      setTimeout(() => setFeedbackMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting version:', error);
      setFeedbackMessage('Failed to delete version. Please try again.');
      setTimeout(() => setFeedbackMessage(''), 3000);
    }
  };
  
  const updateVersion = async (versionId) => {
    try {
      const existingVersion = savedVersions.find(v => v.id === versionId);
      if (!existingVersion) {
        console.error('Version not found.');
        setFeedbackMessage('Version not found.');
        setTimeout(() => setFeedbackMessage(''), 3000);
        return;
      }

      const updatedVersion = {
        id: versionId,
        name: existingVersion.name,
        savedAt: new Date().toISOString(),
        data: {
          logo,
          themeColors,
          sections,
        }
      };

      await saveVersionToDB(updatedVersion);
      setSavedVersions(savedVersions.map(v =>
        v.id === versionId
          ? { id: updatedVersion.id, name: updatedVersion.name, savedAt: updatedVersion.savedAt }
          : v
      ));
      setFeedbackMessage(`Version "${existingVersion.name}" updated!`);
      setTimeout(() => setFeedbackMessage(''), 3000);
    } catch (error) {
      console.error('Error updating version:', error);
      setFeedbackMessage('Failed to update version. Please try again.');
      setTimeout(() => setFeedbackMessage(''), 3000);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const colors = extractColorsFromImage(img);
          setThemeColors(colors);
          setLogo(event.target.result);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const addSection = (type) => {
    const newSection = { id: generateId(), type };
    if (type === 'content') {
      newSection.title = '';
      newSection.sectionNumber = '';
      newSection.cards = [];
      newSection.charts = [];
      newSection.images = [];
    } else if (type === 'footer') {
      newSection.name = '';
      newSection.subtitle = '';
      newSection.address = '';
      newSection.cityStateZip = '';
      newSection.phone = '';
      newSection.email = '';
      newSection.website = '';
    }
    setSections([...sections, newSection]);
    setShowAddSection(false);
  };

  const updateSection = (id, updates) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSection = (id) => {
    setSections(sections.filter(s => s.id !== id));
  };

  // Move an element from one content section to another
  const moveElementToSection = (targetSectionId, arrayKey, element) => {
    setSections(prev => prev.map(s => {
      if (s.id === targetSectionId) {
        return {
          ...s,
          [arrayKey]: [...(s[arrayKey] || []), element]
        };
      }
      return s;
    }));
  };

  const moveSection = (idx, direction) => {
    const newSections = [...sections];
    const newIdx = idx + direction;
    if (newIdx >= 0 && newIdx < newSections.length) {
      [newSections[idx], newSections[newIdx]] = [newSections[newIdx], newSections[idx]];
      setSections(newSections);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const exportReport = async () => {
    setIsExporting(true);
    
    // Temporarily switch to preview mode for clean export
    const wasInPreview = showPreview;
    if (!wasInPreview) {
      setShowPreview(true);
    }
    
    // Wait for preview mode to render
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      // Try to dynamically load html2canvas and jsPDF
      console.log('Starting PDF export...');
      
      if (!window.html2canvas) {
        console.log('Loading html2canvas...');
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          script.onload = () => {
            console.log('html2canvas loaded successfully');
            resolve();
          };
          script.onerror = (e) => {
            console.error('Failed to load html2canvas:', e);
            reject(new Error('Failed to load html2canvas library'));
          };
          document.head.appendChild(script);
        });
      }
      
      if (!window.jspdf) {
        console.log('Loading jsPDF...');
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          script.onload = () => {
            console.log('jsPDF loaded successfully');
            resolve();
          };
          script.onerror = (e) => {
            console.error('Failed to load jsPDF:', e);
            reject(new Error('Failed to load jsPDF library'));
          };
          document.head.appendChild(script);
        });
      }
      
      // Wait for libraries to initialize
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check if libraries are available
      if (!window.html2canvas) {
        throw new Error('html2canvas not available after loading');
      }
      if (!window.jspdf) {
        throw new Error('jspdf not available after loading');
      }
      
      const { jsPDF } = window.jspdf;
      console.log('Libraries ready, starting capture...');
      
      // Get all section elements
      const reportElement = document.getElementById('report-preview');
      if (!reportElement) {
        throw new Error('Could not find report content');
      }
      
      const sectionElements = reportElement.querySelectorAll('[data-section]');
      console.log(`Found ${sectionElements.length} sections`);
      
      if (sectionElements.length === 0) {
        throw new Error('No sections found to export');
      }
      
      // Create PDF with A4 page format (210mm x 297mm)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4' // A4: 210mm x 297mm
      });
      
      for (let i = 0; i < sectionElements.length; i++) {
        const section = sectionElements[i];
        console.log(`Capturing section ${i + 1}...`);
        
        // Add new page for sections after the first
        if (i > 0) {
          pdf.addPage('a4');
        }
        
        // Capture section as canvas
        // Set fixed dimensions for consistent export
        const originalWidth = section.style.width;
        const originalMinWidth = section.style.minWidth;
        section.style.width = '990px';
        section.style.minWidth = '990px';

        const canvas = await window.html2canvas(section, {
          scale: 2, // Higher quality
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: true,
          width: 990,
          windowWidth: 990
        });

        // Restore original dimensions
        section.style.width = originalWidth;
        section.style.minWidth = originalMinWidth;
        
        console.log(`Section ${i + 1} captured: ${canvas.width}x${canvas.height}`);
        
        // Convert to image and add to PDF
        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        // Calculate dimensions to fit the A4 page (210mm x 297mm) while maintaining aspect ratio
        const pageWidth = 210;
        const pageHeight = 297;
        const canvasAspect = canvas.width / canvas.height;
        const pageAspect = pageWidth / pageHeight;

        let imgWidth, imgHeight, xOffset, yOffset;

        if (canvasAspect > pageAspect) {
          // Canvas is wider than page - fit to width
          imgWidth = pageWidth;
          imgHeight = pageWidth / canvasAspect;
          xOffset = 0;
          yOffset = (pageHeight - imgHeight) / 2;
        } else {
          // Canvas is taller than page - fit to height
          imgHeight = pageHeight;
          imgWidth = pageHeight * canvasAspect;
          xOffset = (pageWidth - imgWidth) / 2;
          yOffset = 0;
        }

        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
      }
      
      console.log('Saving PDF...');
      // Save the PDF
      pdf.save('annual-report.pdf');
      console.log('PDF saved successfully');
      
    } catch (error) {
      console.error('Export error:', error);
      
      // Offer print as fallback
      const usePrint = window.confirm(
        `PDF export failed: ${error.message}\n\nWould you like to use your browser's Print to PDF feature instead?\n\n(In the print dialog, select "Save as PDF" as the destination)`
      );
      
      if (usePrint) {
        window.print();
      }
    } finally {
      // Restore previous view state
      if (!wasInPreview) {
        setShowPreview(false);
      }
      setIsExporting(false);
    }
  };

  const renderSection = (section, idx) => {
    const commonProps = {
      key: section.id,
      section,
      onUpdate: (updates) => updateSection(section.id, updates),
      themeColors,
      logo,
      isPreview: showPreview,
    };

    switch (section.type) {
      case 'banner':
        return <BannerSection {...commonProps} />;
      case 'letter':
        return <OpeningLetterSection {...commonProps} />;
      case 'footer':
        return <FooterSection {...commonProps} />;
      case 'content':
        // Calculate which content section this is (1-based index)
        const contentSections = sections.filter(s => s.type === 'content');
        const contentIndex = contentSections.findIndex(s => s.id === section.id) + 1;
        return (
          <ContentSection
            {...commonProps}
            onDelete={() => deleteSection(section.id)}
            onMoveElement={moveElementToSection}
            contentSections={contentSections}
            contentIndex={contentIndex}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Global Toast Notification */}
      {feedbackMessage && !showVersionManager && (
        <div className="fixed top-4 right-4 z-[10001] px-4 py-3 bg-emerald-600 text-white rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <Check className="w-5 h-5" />
          <span className="font-medium">{feedbackMessage}</span>
        </div>
      )}
      
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Mobile sidebar toggle */}
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="lg:hidden p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                title="Open settings"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-bold text-white">Report Builder</h1>
                <p className="text-xs text-slate-400">
                  {lastSaved ? `Auto-saved ${lastSaved.toLocaleTimeString()}` : 'Create professional branded reports'}
                </p>
              </div>
            </div>

            {/* Desktop/Tablet action buttons */}
            <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
              {/* Theme Colors Display - hidden on mobile */}
              <div className="hidden md:flex items-center gap-2 px-2 lg:px-3 py-2 bg-slate-800 rounded-lg">
                <span className="hidden lg:inline text-xs text-slate-400">Theme:</span>
                <div className="flex gap-1">
                  {Object.entries(themeColors).slice(0, 4).map(([key, color]) => (
                    <div
                      key={key}
                      className="w-4 h-4 lg:w-5 lg:h-5 rounded-full border-2 border-slate-600"
                      style={{ backgroundColor: color }}
                      title={key}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowSaveModal(true)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 lg:px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                title={lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : 'Save your work'}
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Save</span>
              </button>

              {(hasSavedDraft || savedVersions.length > 0) && (
                <button
                  onClick={() => setShowLoadModal(true)}
                  className="hidden sm:flex items-center gap-2 px-3 lg:px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                  title="Load a saved version or draft"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span className="hidden lg:inline">Load</span>
                </button>
              )}

              <button
                onClick={() => setShowVersionManager(true)}
                className="hidden sm:flex items-center gap-1 sm:gap-2 px-2 sm:px-3 lg:px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                title="Manage saved versions"
              >
                <Layers className="w-4 h-4" />
                <span className="hidden lg:inline">Versions ({savedVersions.length}/3)</span>
                <span className="lg:hidden">{savedVersions.length}/3</span>
              </button>

              {/* Undo/Redo buttons */}
              <div className="hidden sm:flex gap-1">
                <button
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  className={`flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg transition-colors ${
                    historyIndex <= 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-600 text-white hover:bg-slate-500'
                  }`}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  className={`flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg transition-colors ${
                    historyIndex >= history.length - 1
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-600 text-white hover:bg-slate-500'
                  }`}
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 lg:px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                {showPreview ? <Pencil className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="hidden sm:inline">{showPreview ? 'Edit' : 'Preview'}</span>
              </button>

              <button
                onClick={exportReport}
                disabled={isExporting}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 lg:px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg transition-colors ${isExporting ? 'opacity-70 cursor-not-allowed' : 'hover:from-amber-600 hover:to-orange-700'}`}
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Draft notification banner */}
      {showDraftNotification && (
        <div className="bg-amber-500/20 border-b border-amber-500/30">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-5 h-5 text-amber-400" />
              <span className="text-sm text-amber-200">
                You have a saved draft from {lastSaved ? lastSaved.toLocaleString() : 'a previous session'}.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  loadDraft(true);
                  setShowDraftNotification(false);
                }}
                className="px-3 py-1 text-sm bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
              >
                Load Draft
              </button>
              <button
                onClick={() => setShowDraftNotification(false)}
                className="px-3 py-1 text-sm bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
              >
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <div className="flex flex-col lg:flex-row lg:justify-center gap-4 lg:gap-8">
          {/* Sidebar - hidden on mobile/tablet, shown on desktop */}
          <aside className="hidden lg:block lg:w-[340px] lg:flex-shrink-0 space-y-6 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
            {/* Logo Upload */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-base font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Brand Settings
              </h3>

              <div
                onClick={() => logoInputRef.current?.click()}
                className="relative aspect-square bg-slate-700/50 rounded-xl border-2 border-dashed border-slate-600 hover:border-amber-500/50 transition-colors cursor-pointer overflow-hidden group"
              >
                {logo ? (
                  <>
                    <img src={logo} alt="Logo" className="w-full h-full object-contain p-4" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <div className="p-2 bg-white rounded-lg">
                        <Upload className="w-5 h-5 text-slate-700" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <Upload className="w-10 h-10 mb-2" />
                    <span className="text-base font-medium">Upload Logo</span>
                    <span className="text-sm mt-1 opacity-70">Sets theme colors</span>
                  </div>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>

              {/* Remove logo button */}
              {logo && (
                <button
                  onClick={() => {
                    setLogo(null);
                    setThemeColors(DEFAULT_THEME_COLORS);
                  }}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove Logo
                </button>
              )}

              {/* Manual color override */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Primary</span>
                  <input
                    type="color"
                    value={ensureHexColor(themeColors.primary, DEFAULT_THEME_COLORS.primary)}
                    onChange={(e) => setThemeColors({ ...themeColors, primary: e.target.value, primaryDark: rgbToHex(
                      Math.max(0, parseInt(e.target.value.slice(1, 3), 16) - 20),
                      Math.max(0, parseInt(e.target.value.slice(3, 5), 16) - 20),
                      Math.max(0, parseInt(e.target.value.slice(5, 7), 16) - 20)
                    )})}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Accent</span>
                  <input
                    type="color"
                    value={ensureHexColor(themeColors.accent, DEFAULT_THEME_COLORS.accent)}
                    onChange={(e) => setThemeColors({ ...themeColors, accent: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Highlight</span>
                  <input
                    type="color"
                    value={ensureHexColor(themeColors.gold, DEFAULT_THEME_COLORS.gold)}
                    onChange={(e) => setThemeColors({ ...themeColors, gold: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                </div>
                <button
                  onClick={() => setThemeColors(DEFAULT_THEME_COLORS)}
                  className="w-full mt-2 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 rounded transition-colors"
                >
                  Reset to Defaults
                </button>
              </div>
            </div>

            {/* Section List */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-base font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <Layout className="w-5 h-5" />
                Sections
              </h3>
              
              <div className="space-y-2">
                {sections.map((section, idx) => (
                  <div
                    key={section.id}
                    draggable
                    onDragStart={(e) => {
                      setDraggedSectionIdx(idx);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => {
                      setDraggedSectionIdx(null);
                      setDragOverIdx(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedSectionIdx !== null && draggedSectionIdx !== idx) {
                        setDragOverIdx(idx);
                      }
                    }}
                    onDragLeave={() => setDragOverIdx(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedSectionIdx !== null && draggedSectionIdx !== idx) {
                        const newSections = [...sections];
                        const [removed] = newSections.splice(draggedSectionIdx, 1);
                        newSections.splice(idx, 0, removed);
                        setSections(newSections);
                      }
                      setDraggedSectionIdx(null);
                      setDragOverIdx(null);
                    }}
                    className={`flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg group cursor-grab active:cursor-grabbing transition-all ${
                      draggedSectionIdx === idx ? 'opacity-50 scale-95' : ''
                    } ${
                      dragOverIdx === idx ? 'ring-2 ring-amber-500 bg-slate-600/50' : ''
                    }`}
                    title={(() => {
                      const title = section.title || section.heading || section.name;
                      return title ? `${section.type}: ${title}` : section.type;
                    })()}
                  >
                    <GripVertical className="w-4 h-4 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {section.type === 'banner' && <PanelTop className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                        {section.type === 'letter' && <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                        {section.type === 'footer' && <PanelBottom className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                        {section.type === 'content' && <Layers className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                        <span className="text-sm text-white truncate">
                          {(section.title || section.heading || section.name) || (
                            <span className="capitalize">{section.type}</span>
                          )}
                        </span>
                        {section.designNotes && <MessageSquare className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" title="Has contributor notes" />}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveSection(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 hover:bg-slate-600 rounded disabled:opacity-30 bg-slate-600/50"
                        title="Move up"
                      >
                        <ArrowUp className="w-4 h-4 text-white" strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => moveSection(idx, 1)}
                        disabled={idx === sections.length - 1}
                        className="p-1 hover:bg-slate-600 rounded disabled:opacity-30 bg-slate-600/50"
                        title="Move down"
                      >
                        <ArrowDown className="w-4 h-4 text-white" strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => {
                          if (sections.length > 1) {
                            setSections(sections.filter((_, i) => i !== idx));
                          }
                        }}
                        disabled={sections.length <= 1}
                        className="p-1 hover:bg-red-600 rounded disabled:opacity-30 bg-red-500/50"
                        title="Delete section"
                      >
                        <Trash2 className="w-4 h-4 text-white" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Section */}
              <div className="relative mt-4">
                <button
                  onClick={() => setShowAddSection(!showAddSection)}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 hover:border-amber-500/50 hover:text-amber-500 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Section
                </button>
                
                {showAddSection && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-700 rounded-xl shadow-xl border border-slate-600 overflow-hidden z-10">
                    <button
                      onClick={() => addSection('content')}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-600 text-white text-left"
                    >
                      <Layers className="w-5 h-5 text-emerald-500" />
                      <div>
                        <span className="block font-medium">Content Section</span>
                        <span className="text-xs text-slate-400">Cards, charts, and images</span>
                      </div>
                    </button>
                    <button
                      onClick={() => addSection('banner')}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-600 text-white text-left"
                    >
                      <PanelTop className="w-5 h-5 text-amber-500" />
                      <div>
                        <span className="block font-medium">Banner</span>
                        <span className="text-xs text-slate-400">Full-page cover with logo</span>
                      </div>
                    </button>
                    <button
                      onClick={() => addSection('letter')}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-600 text-white text-left"
                    >
                      <Mail className="w-5 h-5 text-blue-500" />
                      <div>
                        <span className="block font-medium">Opening Letter</span>
                        <span className="text-xs text-slate-400">Message with photo and text</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="w-full lg:w-auto lg:flex-shrink-0">
            <div
              id="report-preview"
              className="bg-white rounded-2xl shadow-2xl overflow-hidden mx-auto w-full lg:w-[990px] lg:max-w-[990px]"
            >
              {sections.map((section, idx) => renderSection(section, idx))}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden"
          style={{ zIndex: 10000 }}
          onClick={() => setShowMobileSidebar(false)}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-slate-900 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-500" />
                Settings
              </h2>
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Brand Settings */}
              <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Brand Settings
                </h3>

                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="relative aspect-square bg-slate-700/50 rounded-xl border-2 border-dashed border-slate-600 hover:border-amber-500/50 transition-colors cursor-pointer overflow-hidden group"
                >
                  {logo ? (
                    <>
                      <img src={logo} alt="Logo" className="w-full h-full object-contain p-4" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <div className="p-2 bg-white rounded-lg">
                          <Upload className="w-5 h-5 text-slate-700" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                      <Upload className="w-10 h-10 mb-2" />
                      <span className="text-sm font-medium">Upload Logo</span>
                      <span className="text-xs mt-1 opacity-70">Sets theme colors</span>
                    </div>
                  )}
                </div>

                {logo && (
                  <button
                    onClick={() => {
                      setLogo(null);
                      setThemeColors(DEFAULT_THEME_COLORS);
                    }}
                    className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove Logo
                  </button>
                )}

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Primary</span>
                    <input
                      type="color"
                      value={ensureHexColor(themeColors.primary, DEFAULT_THEME_COLORS.primary)}
                      onChange={(e) => setThemeColors({ ...themeColors, primary: e.target.value, primaryDark: rgbToHex(
                        Math.max(0, parseInt(e.target.value.slice(1, 3), 16) - 20),
                        Math.max(0, parseInt(e.target.value.slice(3, 5), 16) - 20),
                        Math.max(0, parseInt(e.target.value.slice(5, 7), 16) - 20)
                      )})}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Accent</span>
                    <input
                      type="color"
                      value={ensureHexColor(themeColors.accent, DEFAULT_THEME_COLORS.accent)}
                      onChange={(e) => setThemeColors({ ...themeColors, accent: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Highlight</span>
                    <input
                      type="color"
                      value={ensureHexColor(themeColors.gold, DEFAULT_THEME_COLORS.gold)}
                      onChange={(e) => setThemeColors({ ...themeColors, gold: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                  </div>
                  <button
                    onClick={() => setThemeColors(DEFAULT_THEME_COLORS)}
                    className="w-full mt-2 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 rounded transition-colors"
                  >
                    Reset to Defaults
                  </button>
                </div>
              </div>

              {/* Section List */}
              <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  <Layout className="w-4 h-4" />
                  Sections
                </h3>

                <div className="space-y-2">
                  {sections.map((section, idx) => (
                    <div
                      key={section.id}
                      className="flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {section.type === 'banner' && <PanelTop className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                          {section.type === 'letter' && <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                          {section.type === 'footer' && <PanelBottom className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                          {section.type === 'content' && <Layers className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                          <span className="text-sm text-white truncate">
                            {(section.title || section.heading || section.name) || (
                              <span className="capitalize">{section.type}</span>
                            )}
                          </span>
                          {section.designNotes && <MessageSquare className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" title="Has contributor notes" />}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => moveSection(idx, -1)}
                          disabled={idx === 0}
                          className="p-1 hover:bg-slate-600 rounded disabled:opacity-30 bg-slate-600/50"
                        >
                          <ArrowUp className="w-4 h-4 text-white" strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => moveSection(idx, 1)}
                          disabled={idx === sections.length - 1}
                          className="p-1 hover:bg-slate-600 rounded disabled:opacity-30 bg-slate-600/50"
                        >
                          <ArrowDown className="w-4 h-4 text-white" strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => {
                            if (sections.length > 1) {
                              setSections(sections.filter((_, i) => i !== idx));
                            }
                          }}
                          disabled={sections.length <= 1}
                          className="p-1 hover:bg-red-600 rounded disabled:opacity-30 bg-red-500/50"
                        >
                          <Trash2 className="w-4 h-4 text-white" strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Section */}
                <div className="relative mt-4">
                  <button
                    onClick={() => setShowAddSection(!showAddSection)}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 hover:border-amber-500/50 hover:text-amber-500 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add Section
                  </button>

                  {showAddSection && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-700 rounded-xl shadow-xl border border-slate-600 overflow-hidden z-10">
                      <button
                        onClick={() => { addSection('content'); setShowMobileSidebar(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-600 text-white text-left"
                      >
                        <Layers className="w-5 h-5 text-emerald-500" />
                        <div>
                          <span className="block font-medium">Content Section</span>
                          <span className="text-xs text-slate-400">Cards, charts, and images</span>
                        </div>
                      </button>
                      <button
                        onClick={() => { addSection('banner'); setShowMobileSidebar(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-600 text-white text-left"
                      >
                        <PanelTop className="w-5 h-5 text-amber-500" />
                        <div>
                          <span className="block font-medium">Banner</span>
                          <span className="text-xs text-slate-400">Full-page cover with logo</span>
                        </div>
                      </button>
                      <button
                        onClick={() => { addSection('letter'); setShowMobileSidebar(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-600 text-white text-left"
                      >
                        <Mail className="w-5 h-5 text-blue-500" />
                        <div>
                          <span className="block font-medium">Opening Letter</span>
                          <span className="text-xs text-slate-400">Message with photo and text</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions for Mobile */}
              <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  {(hasSavedDraft || savedVersions.length > 0) && (
                    <button
                      onClick={() => { setShowLoadModal(true); setShowMobileSidebar(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                    >
                      <FolderOpen className="w-5 h-5" />
                      Load
                    </button>
                  )}
                  <button
                    onClick={() => { setShowVersionManager(true); setShowMobileSidebar(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-700 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    <Layers className="w-5 h-5" />
                    Versions ({savedVersions.length}/3)
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={undo}
                      disabled={historyIndex <= 0}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                        historyIndex <= 0
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-600 text-white hover:bg-slate-500'
                      }`}
                    >
                      <Undo2 className="w-5 h-5" />
                      Undo
                    </button>
                    <button
                      onClick={redo}
                      disabled={historyIndex >= history.length - 1}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                        historyIndex >= history.length - 1
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-600 text-white hover:bg-slate-500'
                      }`}
                    >
                      <Redo2 className="w-5 h-5" />
                      Redo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Version Manager Modal */}
      {showVersionManager && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center"
          style={{ zIndex: 10000 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowVersionManager(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Version Manager
              </h2>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowVersionManager(false); }}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Save New Version */}
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-600 mb-2">Save Current Report as Version</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={versionNameInput}
                  onChange={(e) => setVersionNameInput(e.target.value)}
                  placeholder="Enter version name..."
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                  style={{ color: '#0f172a' }}
                  maxLength={30}
                  disabled={savedVersions.length >= 3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && versionNameInput.trim() && savedVersions.length < 3) {
                      e.preventDefault();
                      saveVersion(versionNameInput);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveVersion(versionNameInput); }}
                  disabled={savedVersions.length >= 3 || !versionNameInput.trim()}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    savedVersions.length >= 3 || !versionNameInput.trim()
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
              {savedVersions.length >= 3 && (
                <p className="text-xs text-amber-600 mt-2">Maximum 3 versions reached. Delete a version to save a new one.</p>
              )}
              {feedbackMessage && (
                <div className="mt-3 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {feedbackMessage}
                </div>
              )}
            </div>

            {/* Saved Versions List */}
            <div className="px-6 py-4 max-h-80 overflow-y-auto">
              <h3 className="text-sm font-semibold text-slate-600 mb-3">Saved Versions ({savedVersions.length}/3)</h3>
              {savedVersions.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Layers className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No saved versions yet</p>
                  <p className="text-sm">Save your first version above</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedVersions.map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-800 truncate">{version.name}</h4>
                        <p className="text-xs text-slate-500">
                          Saved: {new Date(version.savedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-3">
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); loadVersion(version.id); }}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Load this version"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateVersion(version.id); }}
                          className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-500 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Update this version with current work"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Update
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteVersion(version.id); }}
                          className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-500 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Delete this version"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowVersionManager(false); }}
                className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Modal - Choose where to save */}
      {showSaveModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center"
          style={{ zIndex: 10000 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowSaveModal(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Save className="w-5 h-5" />
                Save Report
              </h2>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSaveModal(false); }}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Save Options */}
            <div className="px-6 py-4">
              <p className="text-sm text-slate-600 mb-4">Choose where to save your current report:</p>

              {/* Save as Draft */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  saveDraft(false);
                  setShowSaveModal(false);
                }}
                className="w-full mb-3 p-4 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 hover:border-slate-300 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                    <Save className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 group-hover:text-slate-900">Save as Draft</h3>
                    <p className="text-xs text-slate-500">Quick save for work in progress</p>
                  </div>
                </div>
              </button>

              {/* Divider */}
              {savedVersions.length > 0 && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-slate-200"></div>
                  <span className="text-xs text-slate-400 font-medium">OR UPDATE EXISTING VERSION</span>
                  <div className="flex-1 h-px bg-slate-200"></div>
                </div>
              )}

              {/* Existing Versions */}
              {savedVersions.length > 0 && (
                <div className="space-y-2 mb-4">
                  {savedVersions.map((version) => (
                    <button
                      key={version.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateVersion(version.id);
                        setShowSaveModal(false);
                      }}
                      className="w-full p-4 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 hover:border-amber-300 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                          <Layers className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-800 group-hover:text-slate-900 truncate">{version.name}</h3>
                          <p className="text-xs text-slate-500">Last saved: {new Date(version.savedAt).toLocaleString()}</p>
                        </div>
                        <div className="text-amber-600 text-sm font-medium">Update</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Create New Version */}
              {savedVersions.length < 3 && (
                <>
                  {savedVersions.length > 0 && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-slate-200"></div>
                      <span className="text-xs text-slate-400 font-medium">OR CREATE NEW VERSION</span>
                      <div className="flex-1 h-px bg-slate-200"></div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={versionNameInput}
                      onChange={(e) => setVersionNameInput(e.target.value)}
                      placeholder="Enter version name..."
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                      style={{ color: '#0f172a' }}
                      maxLength={30}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && versionNameInput.trim()) {
                          e.preventDefault();
                          saveVersion(versionNameInput);
                          setShowSaveModal(false);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (versionNameInput.trim()) {
                          saveVersion(versionNameInput);
                          setShowSaveModal(false);
                        }
                      }}
                      disabled={!versionNameInput.trim()}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                        !versionNameInput.trim()
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      Create
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {savedVersions.length}/3 versions used
                  </p>
                </>
              )}

              {savedVersions.length >= 3 && (
                <p className="text-xs text-amber-600 text-center">
                  Maximum 3 versions reached. Delete a version from Version Manager to create a new one.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSaveModal(false); }}
                className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Modal - Choose what to load */}
      {showLoadModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center"
          style={{ zIndex: 10000 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowLoadModal(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                Load Report
              </h2>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowLoadModal(false); }}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Load Options */}
            <div className="px-6 py-4">
              <p className="text-sm text-slate-600 mb-4">Choose what to load:</p>

              {/* Load Draft */}
              {hasSavedDraft && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    loadDraft();
                    setShowLoadModal(false);
                  }}
                  className="w-full mb-3 p-4 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 hover:border-slate-300 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                      <Save className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 group-hover:text-slate-900">Load Draft</h3>
                      <p className="text-xs text-slate-500">
                        {lastSaved ? `Last saved: ${lastSaved.toLocaleString()}` : 'Your work in progress'}
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {/* Divider */}
              {hasSavedDraft && savedVersions.length > 0 && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-slate-200"></div>
                  <span className="text-xs text-slate-400 font-medium">OR LOAD A VERSION</span>
                  <div className="flex-1 h-px bg-slate-200"></div>
                </div>
              )}

              {/* Saved Versions */}
              {savedVersions.length > 0 && (
                <div className="space-y-2">
                  {savedVersions.map((version) => (
                    <button
                      key={version.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        loadVersion(version.id);
                        setShowLoadModal(false);
                      }}
                      className="w-full p-4 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 hover:border-blue-300 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                          <Layers className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-800 group-hover:text-slate-900 truncate">{version.name}</h3>
                          <p className="text-xs text-slate-500">Saved: {new Date(version.savedAt).toLocaleString()}</p>
                        </div>
                        <div className="text-blue-600 text-sm font-medium">Load</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No content message */}
              {!hasSavedDraft && savedVersions.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No saved content to load</p>
                  <p className="text-sm">Save your work first</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowLoadModal(false); }}
                className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
