import React, { useState } from 'react';
import { Save, Check } from 'lucide-react';

const FooterSection = ({ data, onChange, onSaveDefault }) => {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSaveDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-slate-500/20 text-slate-400 flex items-center justify-center text-xs font-bold">F</span>
          Footer
        </h3>
        {onSaveDefault && (
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
              saved ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {saved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
            {saved ? 'Saved!' : 'Save as Default'}
          </button>
        )}
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Organization Name</label>
        <input
          type="text"
          value={data.orgName || ''}
          onChange={(e) => onChange({ orgName: e.target.value })}
          placeholder="e.g. Springfield Township"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Website URL</label>
        <input
          type="text"
          value={data.website || ''}
          onChange={(e) => onChange({ website: e.target.value })}
          placeholder="e.g. https://springfieldtownship.gov"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Tagline (optional)</label>
        <input
          type="text"
          value={data.tagline || ''}
          onChange={(e) => onChange({ tagline: e.target.value })}
          placeholder="e.g. Serving our community since 1837"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
      <p className="text-xs text-slate-500">Background uses "Primary" color (matches header). Website link uses "Highlight / Gold" from Brand Settings.</p>
    </div>
  );
};

export default FooterSection;
