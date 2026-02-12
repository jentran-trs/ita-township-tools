import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const formatDisplayDate = (isoDate) => {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[m - 1]} ${d}, ${y}`;
};

const EventListingSection = ({ data, onChange }) => {
  const events = data.events || [{ date: '', calendarDate: '', startTime: '', endTime: '', title: '', description: '', location: '', recurrence: 'one-time', link: '' }];

  const addEvent = () => onChange({ events: [...events, { date: '', calendarDate: '', startTime: '', endTime: '', title: '', description: '', location: '', recurrence: 'one-time', link: '' }] });
  const removeEvent = (i) => onChange({ events: events.filter((_, idx) => idx !== i) });
  const updateEvent = (i, field, value) => {
    const updated = events.map((ev, idx) => {
      if (idx !== i) return ev;
      const patch = { [field]: value };
      // Auto-sync display date when calendar date changes
      if (field === 'calendarDate' && value) {
        patch.date = formatDisplayDate(value);
      }
      return { ...ev, ...patch };
    });
    onChange({ events: updated });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span className="w-6 h-6 rounded bg-purple-500/20 text-purple-500 flex items-center justify-center text-xs font-bold">📅</span>
        Event Listing
      </h3>
      <p className="text-xs text-slate-500">Date badge uses "Primary" color. "Learn more" link uses "Highlight / Gold" color from Brand Settings.</p>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Section Heading</label>
        <input
          type="text"
          value={data.heading || ''}
          onChange={(e) => onChange({ heading: e.target.value })}
          placeholder="e.g. Upcoming Events"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
      <div className="space-y-4">
        {events.map((ev, i) => (
          <div key={i} className="bg-slate-750 border border-slate-600 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Event {i + 1}</span>
              {events.length > 1 && (
                <button onClick={() => removeEvent(i)} className="p-1 text-red-400 hover:text-red-300">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <input
              type="text"
              value={ev.title}
              onChange={(e) => updateEvent(i, 'title', e.target.value)}
              placeholder="Event title"
              className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Date</label>
                <input
                  type="date"
                  value={ev.calendarDate || ''}
                  onChange={(e) => updateEvent(i, 'calendarDate', e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Start Time</label>
                <input
                  type="time"
                  value={ev.startTime || ''}
                  onChange={(e) => updateEvent(i, 'startTime', e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">End Time</label>
                <input
                  type="time"
                  value={ev.endTime || ''}
                  onChange={(e) => updateEvent(i, 'endTime', e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Display Date (shown on badge)</label>
              <input
                type="text"
                value={ev.date || ''}
                onChange={(e) => updateEvent(i, 'date', e.target.value)}
                placeholder="Auto-filled from date picker, or type custom"
                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <input
              type="text"
              value={ev.location || ''}
              onChange={(e) => updateEvent(i, 'location', e.target.value)}
              placeholder="Location (optional, e.g. Town Hall, 123 Main St)"
              className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Recurrence</label>
              <select
                value={ev.recurrence || 'one-time'}
                onChange={(e) => updateEvent(i, 'recurrence', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="one-time">One-time event</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <textarea
              value={ev.description}
              onChange={(e) => updateEvent(i, 'description', e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
            />
            <input
              type="text"
              value={ev.link}
              onChange={(e) => updateEvent(i, 'link', e.target.value)}
              placeholder="Link URL (optional)"
              className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            {ev.calendarDate && ev.startTime && (
              <p className="text-[10px] text-emerald-500">Calendar links (Google, Apple, Outlook) will be generated automatically.</p>
            )}
          </div>
        ))}
      </div>
      <button onClick={addEvent} className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400">
        <Plus className="w-3.5 h-3.5" /> Add Event
      </button>
    </div>
  );
};

export default EventListingSection;
