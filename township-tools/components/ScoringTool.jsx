"use client";

import React, { useState, useRef } from 'react';
import { Calculator, RotateCcw, AlertTriangle, Building2, User } from 'lucide-react';

const FIELDS = [
  { name: 'assist_none_2324', label: 'Township Assistance (2023–2024)' },
  { name: 'fire_ems_not_active', label: 'Fire / EMS Management' },
  { name: 'afr_2023', label: 'Annual Finance Report – 2023' },
  { name: 'afr_2024', label: 'Annual Finance Report – 2024' },
  { name: 'uploads_2024', label: 'Monthly Uploads – 2024' },
  { name: 'uploads_2025', label: 'Monthly Uploads – 2025' },
  { name: 'budget_cont_2024', label: 'Budget Continued – 2024' },
  { name: 'budget_cont_2025', label: 'Budget Continued – 2025' },
  { name: 'apps_lt_24', label: 'Assistance Applications (fewer than 24)' },
  { name: 'budget_under_100k', label: 'Certified Budget less than $100k (2025)' },
  { name: 'trustee_issue', label: 'Trustee Ballot/Vacancy (max 1)' },
  { name: 'board_issue', label: 'Board Ballot/Vacancy (max 1)' },
];

const QUESTIONS = [
  {
    id: 'assist_none_2324',
    title: 'Township Assistance',
    badge: '2 points',
    description: 'Did your township provide township assistance in 2023 or 2024?',
    options: [
      { value: 0, label: 'Yes — Provided assistance in at least one year', hint: '0 points.' },
      { value: 2, label: <>No — <span className="underline font-bold">No</span> assistance in 2023 or 2024</>, hint: '2 points.' },
    ],
  },
  {
    id: 'fire_ems_not_active',
    title: 'Fire / EMS Management',
    badge: '1 point',
    description: 'As of Jan 1, 2025: does your township actively manage fire protection or EMS?',
    statuteNote: 'One (1) point if a township government does not actively manage fire protection or emergency medical services within the township on January 1, 2025.',
    statuteLink: 'https://iga.in.gov/pdf-documents/124/2026/senate/bills/SB0270/SB0270.05.COMH.pdf',
    options: [
      { value: 0, label: <>Yes — Actively managing fire/EMS</>, hint: '0 points.' },
      { value: 1, label: <>No — <span className="underline font-bold">Not</span> actively managing fire/EMS</>, hint: '1 point.' },
    ],
  },
  {
    id: 'afr',
    title: 'Annual Finance Report Filing',
    badge: '0–2 points',
    description: 'Did your township file the Annual Finance Report (AFR) for the following years?',
    subQuestions: [
      {
        name: 'afr_2023',
        yearLabel: '2023',
        options: [
          { value: 0, label: 'Yes — 2023 AFR was filed', hint: '0 points.' },
          { value: 1, label: <>No — 2023 AFR was <span className="underline font-bold">not</span> filed</>, hint: '1 point.' },
        ],
      },
      {
        name: 'afr_2024',
        yearLabel: '2024',
        options: [
          { value: 0, label: 'Yes — 2024 AFR was filed', hint: '0 points.' },
          { value: 1, label: <>No — 2024 AFR was <span className="underline font-bold">not</span> filed</>, hint: '1 point.' },
        ],
      },
    ],
  },
  {
    id: 'uploads',
    title: 'Monthly Upload Reports',
    badge: '0–2 points',
    description: 'Did your township file all required SBOA monthly upload reports for the following years?',
    subQuestions: [
      {
        name: 'uploads_2024',
        yearLabel: '2024',
        options: [
          { value: 0, label: 'Yes — All 2024 uploads were filed', hint: '0 points.' },
          { value: 1, label: <>No — 2024 uploads were <span className="underline font-bold">not</span> all filed</>, hint: '1 point.' },
        ],
      },
      {
        name: 'uploads_2025',
        yearLabel: '2025',
        options: [
          { value: 0, label: 'Yes — All 2025 uploads were filed', hint: '0 points.' },
          { value: 1, label: <>No — 2025 uploads were <span className="underline font-bold">not</span> all filed</>, hint: '1 point.' },
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
        yearLabel: '2024',
        options: [
          { value: 1, label: 'Yes — 2024 budget continued from 2023', hint: '1 point.' },
          { value: 0, label: <>No — 2024 budget <span className="underline font-bold">not</span> continued</>, hint: '0 points.' },
        ],
      },
      {
        name: 'budget_cont_2025',
        yearLabel: '2025',
        options: [
          { value: 1, label: 'Yes — 2025 budget continued from 2024', hint: '1 point.' },
          { value: 0, label: <>No — 2025 budget <span className="underline font-bold">not</span> continued</>, hint: '0 points.' },
        ],
      },
    ],
  },
  {
    id: 'apps_lt_24',
    title: 'Low Assistance Applications',
    badge: '1 point',
    description: <>Were total township assistance applications received in 2023 <span className="font-bold underline">AND</span> 2024 fewer than 24?</>,
    options: [
      { value: 1, label: <>Yes — Fewer than 24 total applications in 2023 <span className="font-bold underline">AND</span> 2024</>, hint: '1 point.' },
      { value: 0, label: <>No — 24 or <span className="underline font-bold">MORE</span> total applications in 2023 <span className="font-bold underline">AND</span> 2024</>, hint: '0 points.' },
    ],
  },
  {
    id: 'budget_under_100k',
    title: 'Certified Budget Less Than $100,000',
    badge: '1 point',
    description: "Is the township\u2019s certified budget for calendar year 2025 less than $100,000?",
    options: [
      { value: 1, label: 'Yes — 2025 certified budget is less than $100,000', hint: '1 point.' },
      { value: 0, label: 'No — 2025 certified budget is $100,000 or more', hint: '0 points.' },
    ],
  },
  {
    id: 'trustee_issue',
    title: 'Trustee Ballot / Vacancy',
    badge: 'max 1 point',
    description: 'Was there no trustee candidate on the ballot in 2018 or 2022, OR has there been a trustee vacancy of 30+ days as of July 1, 2026?',
    options: [
      { value: 1, label: 'No trustee — qualifies for a point', hint: '1 point.' },
      { value: 0, label: <>No — does <span className="underline font-bold">not</span> qualify</>, hint: '0 points.' },
    ],
  },
  {
    id: 'board_issue',
    title: 'Township Board Ballot / Vacancy',
    badge: 'max 1 point',
    description: 'Was there a candidate for all offices of the township board in 2018 or 2022, OR has there been a board vacancy of 30+ days as of July 1, 2026?',
    options: [
      { value: 1, label: 'Yes — we had at least 1 open candidate slot or a 30+ day vacancy', hint: '1 point.' },
      { value: 0, label: <>No — we did <span className="underline font-bold">NOT</span> have an open candidate slot or 30+ day vacancy</>, hint: '0 points.' },
    ],
  },
];

const ScoringTool = () => {
  const [answers, setAnswers] = useState({});
  const [townshipName, setTownshipName] = useState('');
  const [personName, setPersonName] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [warning, setWarning] = useState(false);
  const [showMissing, setShowMissing] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const resultRef = useRef(null);

  const handleChange = (name, value) => {
    setAnswers(prev => ({ ...prev, [name]: value }));
  };

  // Checkbox field names don't require explicit answers (unchecked = 0)
  const CHECKBOX_FIELDS = new Set(
    QUESTIONS.filter(q => q.checkboxItems).flatMap(q => q.checkboxItems.map(item => item.name))
  );

  const getUnanswered = () => {
    return FIELDS.filter(f => !CHECKBOX_FIELDS.has(f.name) && answers[f.name] === undefined);
  };

  const isFieldAnswered = (name) => {
    if (CHECKBOX_FIELDS.has(name)) return true;
    return answers[name] !== undefined;
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
    const unanswered = getUnanswered();
    if (unanswered.length > 0) {
      setShowResult(true);
      setWarning(true);
      setShowMissing(true);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      return;
    }

    setShowMissing(false);
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
    setShowMissing(false);
    setDisclaimerAccepted(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalScore = FIELDS.reduce((sum, f) => sum + (answers[f.name] || 0), 0);
  const isDesignated = totalScore >= 4;

  const breakdown = FIELDS.map(f => ({
    label: f.label,
    points: answers[f.name] || 0,
  }));

  const isCardComplete = (q) => {
    if (q.checkboxItems) return true;
    if (q.options) return isFieldAnswered(q.id);
    return q.subQuestions.every(sub => isFieldAnswered(sub.name));
  };

  const handleCheckbox = (name, checked) => {
    setAnswers(prev => ({ ...prev, [name]: checked ? 1 : 0 }));
  };

  const renderCheckboxes = (items) => (
    <div className="space-y-2.5">
      {items.map((item) => {
        const isChecked = answers[item.name] === 1;
        return (
          <label
            key={item.name}
            className={`flex items-start gap-3 border rounded-xl p-3 cursor-pointer transition-all ${
              isChecked
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
            }`}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => handleCheckbox(item.name, e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-amber-500 rounded"
            />
            <div>
              <span className="text-sm text-slate-200 leading-snug">{item.label}</span>
              <span className="block text-xs text-slate-500 mt-1">{item.hint}</span>
            </div>
          </label>
        );
      })}
    </div>
  );

  const renderOptions = (options, name) => {
    const unanswered = showMissing && !isFieldAnswered(name);
    return (
      <div className={`flex flex-wrap gap-3 ${unanswered ? 'rounded-lg ring-2 ring-red-500/50 p-1 -m-1' : ''}`}>
        {options.map((opt, i) => {
          const isSelected = answers[name] === opt.value;
          return (
            <label
              key={`${name}-${i}`}
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
  };

  return (
    <div className="max-w-[980px] mx-auto px-4 py-6 pb-16">
      {/* Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-5 shadow-lg">
        <h1 className="text-xl font-bold text-white mb-1.5">SB 270 Township Self-Scoring Tool</h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          Answer each question, then select <strong className="text-slate-200">Calculate Score</strong>. A total of{' '}
          <strong className="text-amber-500">4+ points</strong> indicates &ldquo;Designated Township&rdquo; under SB 270.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-5 shadow-lg">
        <h2 className="text-base font-bold text-amber-500 mb-3">Disclaimer — SB270 Scorecard on Township Mergers</h2>
        <div className="text-sm text-slate-300 leading-relaxed space-y-3 mb-4">
          <p>
            This legislative scorecard has been prepared by the Indiana Township Association for informational purposes only. While every effort has been made to ensure accuracy, the Association cannot guarantee that the conclusions, ratings, or methodologies presented here will align with any analysis or scorecard produced by the Indiana Department of Local Government Finance.
          </p>
          <p>
            The scorecard reflects the best available data, policy interpretations, and contextual information known to the Association at the time of publication. Legislative developments, administrative determinations, and additional data released after publication may affect outcomes, interpretations, or comparisons.
          </p>
          <p>
            This document should not be construed as an official determination of fiscal impact, statutory compliance, or state policy for Indiana township government structure. Users are encouraged to consult official state sources and subsequent updates when evaluating township merger proposals or related legislation.
          </p>
        </div>
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={disclaimerAccepted}
            onChange={(e) => setDisclaimerAccepted(e.target.checked)}
            className="w-5 h-5 accent-amber-500 rounded flex-shrink-0"
          />
          <span className="text-sm text-slate-200 font-semibold group-hover:text-white transition-colors">
            I have read and understand this disclaimer
          </span>
        </label>
      </div>

      {disclaimerAccepted && (
      <>
      {/* Township Info */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-5 shadow-sm">
        <h2 className="text-base font-semibold text-white mb-3">Your Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-2 text-sm text-slate-300 mb-1.5">
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
            <label className="flex items-center gap-2 text-sm text-slate-300 mb-1.5">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 grid-flow-row-dense">
        {QUESTIONS.map((q) => {
          const complete = isCardComplete(q);
          const showIncomplete = showMissing && !complete;
          const isTall = !!q.subQuestions;
          return (
            <div
              key={q.id}
              className={`bg-slate-800 border rounded-xl p-4 shadow-sm transition-colors ${
                showIncomplete ? 'border-red-500/60' : 'border-slate-700'
              } ${isTall ? 'lg:row-span-2' : ''}`}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  {q.title}
                  {showIncomplete && <span className="text-red-400 text-xs font-normal">(answer required)</span>}
                </h2>
                <span className="inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-500 border border-amber-500/30 px-2.5 py-1 rounded-full font-bold text-xs whitespace-nowrap">
                  {q.badge}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-snug mb-3">{q.description}</p>
              {q.statuteNote && (
                <p className="text-xs text-slate-400 leading-snug mb-3 italic">
                  {q.statuteNote}{' '}
                  <a href={q.statuteLink} target="_blank" rel="noopener noreferrer" className="text-amber-500 underline hover:text-amber-400 not-italic">
                    Click here to view definition on page 19.
                  </a>
                </p>
              )}
              {q.checkboxItems && (
                <p className="text-xs text-amber-500/80 font-medium mb-2">Check each year that applies</p>
              )}
              {q.options ? (
                renderOptions(q.options, q.id)
              ) : q.checkboxItems ? (
                renderCheckboxes(q.checkboxItems)
              ) : (
                <div className="space-y-3">
                  {q.subQuestions.map((sub) => (
                    <div key={sub.name}>
                      <div className="inline-block text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full uppercase tracking-wide mb-1.5">{sub.yearLabel}</div>
                      {renderOptions(sub.options, sub.name)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

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
            <div>
              <div className="flex items-center gap-3 text-amber-500 font-bold text-sm mb-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                Please answer all questions before calculating.
              </div>
              <div className="text-xs text-slate-300">
                <span className="text-slate-500">Missing answers for: </span>
                {getUnanswered().map(f => f.label).join(', ')}
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
                <div>
                  {townshipName && (
                    <div className="text-sm text-slate-300 mb-1">{townshipName}</div>
                  )}
                  <div className="text-4xl font-black text-white">{totalScore}</div>
                  <div className="text-sm text-slate-300 font-semibold -mt-0.5">Total Points</div>
                </div>
                <div
                  className={`inline-flex items-center px-4 py-2 rounded-full font-bold text-sm border ${
                    isDesignated
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  }`}
                >
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
                    <span className="text-slate-300">{item.label}</span>
                    <strong className={item.points > 0 ? 'text-amber-500' : 'text-slate-500'}>{item.points}</strong>
                  </div>
                ))}
              </div>

            </>
          )}
        </div>
      )}
      </>
      )}

    </div>
  );
};

export default ScoringTool;
