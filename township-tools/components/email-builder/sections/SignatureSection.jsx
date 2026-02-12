import React from 'react';

const SignatureSection = ({ data, onChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span className="w-6 h-6 rounded bg-violet-500/20 text-violet-500 flex items-center justify-center text-xs font-bold">S</span>
        Signature
      </h3>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
        <input
          type="text"
          value={data.name || ''}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. John Smith"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Title / Role</label>
        <input
          type="text"
          value={data.title || ''}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Township Trustee"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Organization</label>
        <input
          type="text"
          value={data.org || ''}
          onChange={(e) => onChange({ org: e.target.value })}
          placeholder="e.g. Springfield Township"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
      <p className="text-xs text-slate-500">Left border uses "Highlight / Gold" color. Organization name uses "Primary" from Brand Settings.</p>
    </div>
  );
};

export default SignatureSection;
