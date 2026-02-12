import React, { useState } from 'react';
import { Upload, Save, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react';

// Color extraction utility - duplicated from ReportBuilder
const rgbToHex = (r, g, b) => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.min(255, Math.max(0, Math.round(x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

const ensureHexColor = (color, fallback = '#2e5f7f') => {
  if (!color) return fallback;
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color;
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return rgbToHex(parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3]));
  }
  return fallback;
};

const extractColorsFromImage = (imageElement) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const size = 100;
  canvas.width = size;
  canvas.height = size;
  ctx.drawImage(imageElement, 0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size).data;
  const colorBuckets = {};

  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const a = imageData[i + 3];
    if (a < 128) continue;

    const quantR = Math.round(r / 16) * 16;
    const quantG = Math.round(g / 16) * 16;
    const quantB = Math.round(b / 16) * 16;
    const key = `${quantR},${quantG},${quantB}`;

    if (!colorBuckets[key]) {
      colorBuckets[key] = { totalR: 0, totalG: 0, totalB: 0, count: 0 };
    }
    colorBuckets[key].totalR += r;
    colorBuckets[key].totalG += g;
    colorBuckets[key].totalB += b;
    colorBuckets[key].count += 1;
  }

  const getBrightness = (r, g, b) => (r * 299 + g * 587 + b * 114) / 1000;
  const getSaturation = (r, g, b) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === 0) return 0;
    return (max - min) / max;
  };
  const isNeutral = (r, g, b) => getSaturation(r, g, b) < 0.15;
  const isWarm = (r, g, b) => r > b && (r > g * 0.8 || g > b);

  const colors = Object.values(colorBuckets)
    .filter(bucket => bucket.count > 10)
    .map(bucket => {
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
    .filter(c => c.brightness > 10 && c.brightness < 250)
    .sort((a, b) => b.count - a.count)
    .slice(0, 25);

  if (colors.length < 3) {
    return { primary: '#2e5f7f', primaryDark: '#1a4a63', accent: '#8B0000', gold: '#f0ad4e' };
  }

  const getColorDistance = (c1, c2) => {
    const rDiff = Math.abs(c1.r - c2.r);
    const gDiff = Math.abs(c1.g - c2.g);
    const bDiff = Math.abs(c1.b - c2.b);
    return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
  };

  const MIN_DISTANCE = 50;
  const sortedByBrightness = [...colors].sort((a, b) => a.brightness - b.brightness);
  const primary = sortedByBrightness[0];

  const saturatedColors = colors
    .filter(c => !c.isNeutral && c.brightness < 180)
    .filter(c => getColorDistance(c, primary) > MIN_DISTANCE)
    .sort((a, b) => b.saturation - a.saturation);

  const accent = saturatedColors[0] ||
    colors.filter(c => getColorDistance(c, primary) > MIN_DISTANCE)[0] ||
    sortedByBrightness[1] ||
    { r: 139, g: 0, b: 0 };

  const warmBrightColors = colors
    .filter(c => !c.isNeutral && c.isWarm && c.brightness > 120)
    .filter(c => getColorDistance(c, primary) > MIN_DISTANCE)
    .filter(c => getColorDistance(c, accent) > MIN_DISTANCE)
    .sort((a, b) => b.brightness - a.brightness);

  const brightSaturatedColors = colors
    .filter(c => !c.isNeutral && c.brightness > 150)
    .filter(c => getColorDistance(c, primary) > MIN_DISTANCE)
    .filter(c => getColorDistance(c, accent) > MIN_DISTANCE)
    .sort((a, b) => b.brightness - a.brightness);

  const highlight = warmBrightColors[0] ||
    brightSaturatedColors[0] ||
    colors.filter(c => c.brightness > 150 && getColorDistance(c, primary) > MIN_DISTANCE && getColorDistance(c, accent) > MIN_DISTANCE)[0] ||
    { r: 240, g: 173, b: 78 };

  // If the logo has few distinct colors and the accent is too light,
  // fall back to dark red accent and gold yellow highlight
  const distinctColors = colors.filter(c => !c.isNeutral).length;
  const accentBrightness = getBrightness(accent.r, accent.g, accent.b);
  if (distinctColors <= 2 && accentBrightness > 170) {
    return {
      primary: rgbToHex(primary.r, primary.g, primary.b),
      primaryDark: rgbToHex(Math.max(0, primary.r - 20), Math.max(0, primary.g - 20), Math.max(0, primary.b - 20)),
      accent: '#8B0000',
      gold: '#f0ad4e',
    };
  }

  return {
    primary: rgbToHex(primary.r, primary.g, primary.b),
    primaryDark: rgbToHex(Math.max(0, primary.r - 20), Math.max(0, primary.g - 20), Math.max(0, primary.b - 20)),
    accent: rgbToHex(accent.r, accent.g, accent.b),
    gold: rgbToHex(highlight.r, highlight.g, highlight.b),
  };
};

const COLOR_LABELS = {
  primary: 'Primary',
  primaryDark: 'Primary Dark',
  accent: 'Accent',
  gold: 'Highlight / Gold',
};

const BrandSettings = ({ logo, setLogo, themeColors, setThemeColors, onSaveDefaults, onClearDefaults }) => {
  const [expanded, setExpanded] = useState(true);
  const [defaultsSaved, setDefaultsSaved] = useState(false);

  const handleSaveWithFeedback = () => {
    onSaveDefaults();
    setDefaultsSaved(true);
    setTimeout(() => setDefaultsSaved(false), 2000);
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

  const handleColorChange = (key, value) => {
    const hex = ensureHexColor(value);
    setThemeColors(prev => ({ ...prev, [key]: hex }));
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <h3 className="text-white font-semibold text-sm">Brand Settings</h3>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Logo Upload */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Organization Logo</label>
            <div className="flex items-center gap-3">
              {logo ? (
                <div className="relative">
                  <img src={logo} alt="Logo" className="w-16 h-16 object-contain bg-white rounded-lg border border-slate-600 p-1" />
                  <button
                    onClick={() => setLogo(null)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-4 py-3 bg-slate-700 border border-dashed border-slate-500 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-400">Upload Logo</span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              )}
              {logo && (
                <label className="text-xs text-amber-500 cursor-pointer hover:text-amber-400">
                  Change
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Color Overrides */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Theme Colors</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(COLOR_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeColors[key] || '#000000'}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="w-8 h-8 rounded border border-slate-600 cursor-pointer bg-transparent"
                  />
                  <span className="text-xs text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Save / Clear */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSaveWithFeedback}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                defaultsSaved ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {defaultsSaved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
              {defaultsSaved ? 'Defaults Saved!' : 'Save as Default'}
            </button>
            <button
              onClick={onClearDefaults}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-600 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear Defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandSettings;
