"use client";

import { Building2 } from 'lucide-react';

export default function CoverSection({ data, onChange }) {
  const updateField = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Report Cover</h2>
          <p className="text-sm text-slate-500">Basic information for your report's front cover</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Organization Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Name of Organization <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.organizationName || ''}
            onChange={(e) => updateField('organizationName', e.target.value)}
            placeholder="e.g., Washington Township"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
          />
        </div>

        {/* Report Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Name of Report <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.reportName || ''}
            onChange={(e) => updateField('reportName', e.target.value)}
            placeholder="e.g., 2025 Annual Report"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
          />
        </div>

        {/* Tagline */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Tagline / Motto <span className="text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={data.tagline || ''}
            onChange={(e) => updateField('tagline', e.target.value)}
            placeholder="e.g., Building Community, Serving Residents"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
          />
          <p className="mt-1 text-xs text-slate-500">
            A short phrase that represents your organization
          </p>
        </div>
      </div>
    </div>
  );
}
