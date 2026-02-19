"use client";

import React, { useState, useRef } from 'react';
import { Calculator, RotateCcw, AlertTriangle, CheckCircle2, XCircle, Building2, User, Mail, FileText, Palette, Send } from 'lucide-react';

const FIELDS = [
  { name: 'assist_none_2324', label: 'Township Assistance (2023–2024)' },
  { name: 'fire_ems_not_active', label: 'Fire / EMS Management' },
  { name: 'afr_2023', label: 'Annual Finance Report – 2023' },
  { name: 'afr_2024', label: 'Annual Finance Report – 2024' },
  { name: 'uploads_2024', label: 'Monthly Uploads – 2024' },
  { name: 'uploads_2025', label: 'Monthly Uploads – 2025' },
  { name: 'budget_cont_2024', label: 'Budget Continued – 2024' },
  { name: 'budget_cont_2025', label: 'Budget Continued – 2025' },
  { name: 'apps_lt_24', label: 'Assistance Applications < 24' },
  { name: 'budget_under_100k', label: 'Certified Budget < $100k (2025)' },
  { name: 'trustee_issue', label: 'Trustee Ballot/Vacancy (max 1)' },
  { name: 'board_issue', label: 'Board Ballot/Vacancy (max 1)' },
];

const QUESTIONS = [
  {
    id: 'assist_none_2324',
    title: 'Township Assistance',
    badge: '2 points',
    description: 'Did your township provide no township assistance in both calendar years 2023 and 2024?',
    options: [
      { value: 2, label: 'Yes — No assistance in 2023 & 2024', hint: 'Counts as 2 points.' },
      { value: 0, label: 'No — Assistance was provided in at least one year', hint: 'Counts as 0 points.' },
    ],
  },
  {
    id: 'fire_ems_not_active',
    title: 'Fire / EMS Management',
    badge: '1 point',
    description: 'As of Jan 1, 2025: does the township not actively manage fire protection or EMS?',
    options: [
      { value: 1, label: 'Yes — Not actively managing fire/EMS', hint: 'Examples: no funds allocated; not a provider unit; or 75%+ paid out to other units.' },
      { value: 0, label: 'No — Actively managing fire/EMS', hint: 'Counts as 0 points.' },
    ],
  },
  {
    id: 'afr',
    title: 'Annual Finance Report Filing',
    badge: '0–2 points',
    description: 'For each year, select whether your township did not file the Annual Finance Report (AFR).',
    subQuestions: [
      {
        name: 'afr_2023',
        options: [
          { value: 1, label: '2023 AFR NOT filed', hint: '1 point if not filed.' },
          { value: 0, label: '2023 AFR filed', hint: '0 points.' },
        ],
      },
      {
        name: 'afr_2024',
        options: [
          { value: 1, label: '2024 AFR NOT filed', hint: '1 point if not filed.' },
          { value: 0, label: '2024 AFR filed', hint: '0 points.' },
        ],
      },
    ],
  },
  {
    id: 'uploads',
    title: 'Monthly Upload Reports',
    badge: '0–2 points',
    description: 'For each year, select whether your township did not file all required monthly upload reports.',
    subQuestions: [
      {
        name: 'uploads_2024',
        options: [
          { value: 1, label: '2024 uploads incomplete / not all filed', hint: '1 point if incomplete.' },
          { value: 0, label: '2024 uploads complete', hint: '0 points.' },
        ],
      },
      {
        name: 'uploads_2025',
        options: [
          { value: 1, label: '2025 uploads incomplete / not all filed', hint: '1 point if incomplete.' },
          { value: 0, label: '2025 uploads complete', hint: '0 points.' },
        ],
      },
    ],
  },
  {
    id: 'budget_cont',
    title: 'Budget Continued Automatically',
    badge: '0–2 points',
    description: 'Was the township budget continued from the prior year (auto-continued) for these budget years?',
    subQuestions: [
      {
        name: 'budget_cont_2024',
        options: [
          { value: 1, label: 'Yes — 2024 budget continued from 2023', hint: '1 point.' },
          { value: 0, label: 'No — 2024 budget not continued', hint: '0 points.' },
        ],
      },
      {
        name: 'budget_cont_2025',
        options: [
          { value: 1, label: 'Yes — 2025 budget continued from 2024', hint: '1 point.' },
          { value: 0, label: 'No — 2025 budget not continued', hint: '0 points.' },
        ],
      },
    ],
  },
  {
    id: 'apps_lt_24',
    title: 'Low Assistance Applications',
    badge: '1 point',
    description: 'Were total township assistance applications received in 2023 + 2024 less than 24?',
    options: [
      { value: 1, label: 'Yes — Total applications < 24', hint: '1 point.' },
      { value: 0, label: 'No — Total applications \u2265 24', hint: '0 points.' },
    ],
  },
  {
    id: 'budget_under_100k',
    title: 'Certified Budget Under $100,000',
    badge: '1 point',
    description: "Is the township\u2019s certified budget for calendar year 2025 under $100,000?",
    options: [
      { value: 1, label: 'Yes — 2025 certified budget < $100,000', hint: '1 point.' },
      { value: 0, label: 'No — 2025 certified budget \u2265 $100,000', hint: '0 points.' },
    ],
  },
  {
    id: 'trustee_issue',
    title: 'Trustee Ballot / Vacancy',
    badge: 'max 1 point',
    description: 'Select the one option that best describes your situation (max 1 point total).',
    options: [
      { value: 1, label: 'Yes — qualifies for a point', hint: 'No trustee candidate (2018 or 2022) OR trustee vacancy \u2265 30 days (as of July 1, 2026).' },
      { value: 0, label: 'No — does not qualify', hint: '0 points.' },
    ],
  },
  {
    id: 'board_issue',
    title: 'Township Board Ballot / Vacancy',
    badge: 'max 1 point',
    description: 'Select the one option that best describes your situation (max 1 point total).',
    options: [
      { value: 1, label: 'Yes — qualifies for a point', hint: 'No board candidates (2018 or 2022) OR a board vacancy \u2265 30 days (as of July 1, 2026).' },
      { value: 0, label: 'No — does not qualify', hint: '0 points.' },
    ],
  },
];

const ScoringTool = () => {
  const [answers, setAnswers] = useState({});
  const [townshipName, setTownshipName] = useState('');
  const [personName, setPersonName] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [warning, setWarning] = useState(false);
  const resultRef = useRef(null);

  const handleChange = (name, value) => {
    setAnswers(prev => ({ ...prev, [name]: value }));
  };

  const allAnswered = () => {
    return FIELDS.every(f => answers[f.name] !== undefined);
  };

  const trackScore = (score, status) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'sb270_score_calculated', {
        township_name: townshipName || 'Not provided',
        person_name: personName || 'Not provided',
        total_score: score,
        designation_status: status,
      });
    }
  };

  const calculate = () => {
    setWarning(false);
    if (!allAnswered()) {
      setShowResult(true);
      setWarning(true);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      return;
    }

    const score = FIELDS.reduce((sum, f) => sum + (answers[f.name] || 0), 0);
    const status = score >= 4 ? 'Designated' : 'Recipient';
    trackScore(score, status);

    setShowResult(true);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const resetAll = () => {
    setAnswers({});
    setTownshipName('');
    setPersonName('');
    setShowResult(false);
    setWarning(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalScore = FIELDS.reduce((sum, f) => sum + (answers[f.name] || 0), 0);
  const isDesignated = totalScore >= 4;

  const breakdown = FIELDS.map(f => ({
    label: f.label,
    points: answers[f.name] || 0,
  }));

  const renderOptions = (options, name) => (
    <div className="flex flex-wrap gap-3">
      {options.map((opt, i) => {
        const isSelected = answers[name] === opt.value;
        return (
          <label
            key={i}
            className={`flex-1 min-w-[220px] border rounded-xl p-3 cursor-pointer transition-all ${
              isSelected
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
            }`}
          >
            <div className="flex gap-3 items-start">
              <input
                type="radio"
                name={name}
                checked={isSelected}
                onChange={() => handleChange(name, opt.value)}
                className="mt-0.5 w-4 h-4 accent-amber-500"
              />
              <div>
                <span className="text-sm text-slate-200 leading-snug">{opt.label}</span>
                <span className="block text-xs text-slate-500 mt-1">{opt.hint}</span>
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );

  return (
    <div className="max-w-[980px] mx-auto px-4 py-6 pb-16">
      {/* Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-5 shadow-lg">
        <h1 className="text-xl font-bold text-white mb-1.5">SB 270 Township Self-Scoring Tool</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Answer each question, then select <strong className="text-slate-200">Calculate Score</strong>. A total of{' '}
          <strong className="text-amber-500">4+ points</strong> indicates &ldquo;Designated Township&rdquo; under SB 270.
        </p>
      </div>

      {/* Township Info */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-5 shadow-sm">
        <h2 className="text-base font-semibold text-white mb-3">Your Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-2 text-sm text-slate-400 mb-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Township Name
            </label>
            <input
              type="text"
              value={townshipName}
              onChange={(e) => setTownshipName(e.target.value)}
              placeholder="e.g. Vernon Township"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-slate-400 mb-1.5">
              <User className="w-3.5 h-3.5" />
              Your Name
            </label>
            <input
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="e.g. Jane Smith"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Questions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {QUESTIONS.map((q) => (
          <div key={q.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h2 className="text-base font-semibold text-white">{q.title}</h2>
              <span className="inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-500 border border-amber-500/30 px-2.5 py-1 rounded-full font-bold text-xs whitespace-nowrap">
                {q.badge}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-snug mb-3">{q.description}</p>
            {q.options ? (
              renderOptions(q.options, q.id)
            ) : (
              <div className="space-y-3">
                {q.subQuestions.map((sub) => renderOptions(sub.options, sub.name))}
              </div>
            )}
          </div>
        ))}

        {/* Actions */}
        <div className="lg:col-span-2 flex flex-wrap gap-3 items-center mt-2">
          <button
            onClick={calculate}
            className="flex items-center gap-2 px-5 py-3 bg-amber-500 text-slate-900 rounded-xl font-bold text-sm hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
          >
            <Calculator className="w-4 h-4" />
            Calculate Score
          </button>
          <button
            onClick={resetAll}
            className="flex items-center gap-2 px-5 py-3 bg-slate-700 text-slate-200 border border-slate-600 rounded-xl font-bold text-sm hover:bg-slate-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      {/* Results */}
      {showResult && (
        <div ref={resultRef} className="mt-5 bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
          {warning ? (
            <div className="flex items-center gap-3 text-amber-500 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              Please answer all questions before calculating.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
                <div>
                  {townshipName && (
                    <div className="text-sm text-slate-400 mb-1">{townshipName}</div>
                  )}
                  <div className="text-4xl font-black text-white">{totalScore}</div>
                  <div className="text-sm text-slate-400 font-semibold -mt-0.5">Total Points</div>
                </div>
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm border ${
                    isDesignated
                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {isDesignated ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {isDesignated ? 'Designated Township (4+)' : 'Recipient Township (0\u20133)'}
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {breakdown.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 px-3 py-2 border border-dashed border-slate-600 rounded-xl bg-slate-900/50 text-sm"
                  >
                    <span className="text-slate-400">{item.label}</span>
                    <strong className={item.points > 0 ? 'text-amber-500' : 'text-slate-500'}>{item.points}</strong>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                <strong className="text-slate-400">Note:</strong> This tool is for education/self-check. Official point
                assignments and any reconsideration process are determined by the Department of Local Government Finance
                as provided in SB 270.
              </p>
            </>
          )}
        </div>
      )}

      {/* Township Tools Promo */}
      <div className="mt-8 bg-gradient-to-br from-slate-800 to-slate-800/80 border border-slate-600 rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-white">Township Tools for Indiana Townships</h2>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed mb-4">
          We offer professional tools built specifically for Indiana townships. Subscribing townships get access to:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <FileText className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-white">Annual Report Builder</span>
            </div>
            <p className="text-xs text-slate-400 leading-snug">
              Create professional annual reports with a drag-and-drop builder. Export as PDF ready to print and share.
            </p>
          </div>
          <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Palette className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-white">Report Design Service</span>
            </div>
            <p className="text-xs text-slate-400 leading-snug">
              Submit your assets and let our team design your annual report for you. Professional results with minimal effort.
            </p>
          </div>
          <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Mail className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold text-white">Email Template Builder</span>
            </div>
            <p className="text-xs text-slate-400 leading-snug">
              Build professional email and newsletter templates with a form-based builder. Copy HTML and paste into any email client.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-700">
          <Send className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-slate-300">
            Interested? Contact <a href="mailto:jentran@my-trs.com" className="text-amber-500 font-semibold hover:text-amber-400 underline underline-offset-2 transition-colors">Jen Tran</a> at{' '}
            <a href="mailto:jentran@my-trs.com" className="text-amber-500 font-semibold hover:text-amber-400 underline underline-offset-2 transition-colors">jentran@my-trs.com</a> for more information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ScoringTool;
