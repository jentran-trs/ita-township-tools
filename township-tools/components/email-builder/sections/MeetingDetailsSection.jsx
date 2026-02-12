import React from 'react';

const MeetingDetailsSection = ({ data, onChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-500 flex items-center justify-center text-xs font-bold">📋</span>
        Meeting Details
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
          <input
            type="text"
            value={data.date || ''}
            onChange={(e) => onChange({ date: e.target.value })}
            placeholder="e.g. Friday, February 13, 2026"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Time</label>
          <input
            type="text"
            value={data.time || ''}
            onChange={(e) => onChange({ time: e.target.value })}
            placeholder="e.g. 10:00 AM – 11:00 AM ET"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Format / Platform (optional)</label>
        <input
          type="text"
          value={data.format || ''}
          onChange={(e) => onChange({ format: e.target.value })}
          placeholder="e.g. Zoom Video Conference"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Meeting ID (optional)</label>
          <input
            type="text"
            value={data.meetingId || ''}
            onChange={(e) => onChange({ meetingId: e.target.value })}
            placeholder="e.g. 898 2388 8699"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Passcode (optional)</label>
          <input
            type="text"
            value={data.passcode || ''}
            onChange={(e) => onChange({ passcode: e.target.value })}
            placeholder="e.g. 069760"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Meeting Link</label>
        <input
          type="text"
          value={data.meetingUrl || ''}
          onChange={(e) => onChange({ meetingUrl: e.target.value })}
          placeholder="https://zoom.us/j/..."
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Button Text</label>
        <p className="text-xs text-slate-500 mb-1">Button color uses the "Accent" color in Brand Settings above.</p>
        <input
          type="text"
          value={data.buttonText || ''}
          onChange={(e) => onChange({ buttonText: e.target.value })}
          placeholder="e.g. JOIN ZOOM MEETING"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
    </div>
  );
};

export default MeetingDetailsSection;
