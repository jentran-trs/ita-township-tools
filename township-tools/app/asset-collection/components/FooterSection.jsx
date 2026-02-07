"use client";

import { MapPin } from 'lucide-react';

export default function FooterSection({ data, onChange }) {
  const updateField = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
          <MapPin className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Footer Information</h2>
          <p className="text-sm text-slate-500">Contact details for the report footer</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Department */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Department / Division <span className="text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={data.department || ''}
            onChange={(e) => updateField('department', e.target.value)}
            placeholder="e.g., Fire Department (leave blank for general township reports)"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
          />
        </div>

        {/* Street Address */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Street Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.streetAddress || ''}
            onChange={(e) => updateField('streetAddress', e.target.value)}
            placeholder="e.g., 123 Main Street"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
          />
        </div>

        {/* City State ZIP */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            City, State, ZIP <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.cityStateZip || ''}
            onChange={(e) => updateField('cityStateZip', e.target.value)}
            placeholder="e.g., Indianapolis, IN 46201"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={data.phone || ''}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="e.g., (317) 555-1234"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={data.email || ''}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="e.g., info@township.gov"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
          />
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Website URL <span className="text-slate-400">(optional)</span>
          </label>
          <input
            type="url"
            value={data.website || ''}
            onChange={(e) => updateField('website', e.target.value)}
            placeholder="e.g., https://www.township.gov"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}
