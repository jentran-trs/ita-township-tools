import React from 'react';
import { Plus, X } from 'lucide-react';

const CtaButtonSection = ({ data, onChange }) => {
  // Migrate old single-button data to new multi-button format
  const buttons = data.buttons || (data.buttonText ? [{ text: data.buttonText, url: data.url || '' }] : [{ text: '', url: '' }]);

  const updateButton = (index, field, value) => {
    const updated = buttons.map((btn, i) => i === index ? { ...btn, [field]: value } : btn);
    onChange({ buttons: updated });
  };

  const addButton = () => {
    onChange({ buttons: [...buttons, { text: '', url: '' }] });
  };

  const removeButton = (index) => {
    if (buttons.length <= 1) return;
    onChange({ buttons: buttons.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs font-bold">B</span>
        Call-to-Action Buttons
      </h3>
      <p className="text-xs text-slate-500">Button color uses the "Gold / Accent" color in Brand Settings above.</p>

      {buttons.map((btn, index) => (
        <div key={index} className="flex items-start gap-2">
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={btn.text || ''}
              onChange={(e) => updateButton(index, 'text', e.target.value)}
              placeholder="Button text"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <input
              type="text"
              value={btn.url || ''}
              onChange={(e) => updateButton(index, 'url', e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          {buttons.length > 1 && (
            <button
              onClick={() => removeButton(index)}
              className="mt-2 p-1.5 text-slate-500 hover:text-red-400 transition-colors"
              title="Remove button"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}

      <button
        onClick={addButton}
        className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Button
      </button>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Helper Text (optional, shown below buttons)</label>
        <input
          type="text"
          value={data.helperText || ''}
          onChange={(e) => onChange({ helperText: e.target.value })}
          placeholder="e.g. Visit our website for more details"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Live preview */}
      {buttons.some(b => b.text) && (
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Preview</label>
          <div className="flex flex-wrap gap-2 justify-center p-3 bg-slate-900/50 rounded-lg">
            {buttons.filter(b => b.text).map((btn, i) => (
              <span key={i} className="inline-block px-4 py-2 bg-amber-500 text-slate-900 text-sm font-bold rounded">
                {btn.text}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CtaButtonSection;
