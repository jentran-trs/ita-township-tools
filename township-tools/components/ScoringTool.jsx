"use client";

import React, { useState, useRef } from 'react';
import { Calculator, RotateCcw, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

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
  const [showResult, setShowResult] = useState(false);
  const [warning, setWarning] = useState(false);
  const resultRef = useRef(null);

  const handleChange = (name, value) => {
    setAnswers(prev => ({ ...prev, [name]: value }));
  };

  const allAnswered = () => {
    return FIELDS.every(f => answers[f.name] !== undefined);
  };

  const calculate = () => {
    setWarning(false);
    if (!allAnswered()) {
      setShowResult(true);
      setWarning(true);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      return;
    }

    setShowResult(true);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const resetAll = () => {
    setAnswers({});
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
    </div>
  );
};

export default ScoringTool;
