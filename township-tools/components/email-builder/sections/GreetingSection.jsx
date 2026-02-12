import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import RichTextEditor from '../RichTextEditor';

const GreetingSection = ({ data, onChange, themeColors }) => {
  const signOffs = data.signOffs || [{ name: '', title: '' }];

  const updateSignOff = (index, field, value) => {
    const updated = [...signOffs];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ signOffs: updated });
  };

  const addSignOff = () => {
    onChange({ signOffs: [...signOffs, { name: '', title: '' }] });
  };

  const removeSignOff = (index) => {
    if (signOffs.length <= 1) return;
    onChange({ signOffs: signOffs.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span className="w-6 h-6 rounded bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-bold">G</span>
        Greeting
      </h3>

      {/* Greeting Line */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Greeting Line
          <span className="text-slate-600 font-normal ml-1">(bold, accent color)</span>
        </label>
        <input
          type="text"
          value={data.greeting || data.text || ''}
          onChange={(e) => onChange({ greeting: e.target.value })}
          placeholder="e.g. Dear ITA Members,"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
        <p className="text-[10px] text-slate-600 mt-1">Color uses Accent from Brand Settings</p>
      </div>

      {/* Body */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Body</label>
        <RichTextEditor
          value={data.content || ''}
          onChange={(val) => onChange({ content: val })}
        />
      </div>

      {/* Sign-off Line */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Sign-off Line</label>
        <input
          type="text"
          value={data.signOffLine || ''}
          onChange={(e) => onChange({ signOffLine: e.target.value })}
          placeholder="e.g. Sincerely,"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Sign-offs */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2">Sign-off Names</label>
        <div className="space-y-2">
          {signOffs.map((so, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1 space-y-1.5">
                <input
                  type="text"
                  value={so.name || ''}
                  onChange={(e) => updateSignOff(i, 'name', e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  value={so.title || ''}
                  onChange={(e) => updateSignOff(i, 'title', e.target.value)}
                  placeholder="Title / Role"
                  className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              {signOffs.length > 1 && (
                <button
                  onClick={() => removeSignOff(i)}
                  className="mt-1.5 p-1 text-red-400/60 hover:text-red-400 transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addSignOff}
          className="mt-2 flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add another name
        </button>
      </div>

      {/* Organization */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Organization</label>
        <input
          type="text"
          value={data.org || ''}
          onChange={(e) => onChange({ org: e.target.value })}
          placeholder="e.g. Indiana Township Association"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
    </div>
  );
};

export default GreetingSection;
