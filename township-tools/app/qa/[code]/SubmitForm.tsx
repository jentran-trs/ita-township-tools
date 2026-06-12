"use client";

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';

const PROFILE_KEY = 'lqa_profile';
const LAST_SUBMIT_KEY = 'lqa_last_submit';
const COOLDOWN_MS = 5000;
const MAX_QUESTION = 1000;

type Profile = { name?: string; township?: string; county?: string };

export function SubmitForm({ submitCode, open }: { submitCode: string; open: boolean }) {
  const [question, setQuestion] = useState('');
  const [name, setName] = useState('');
  const [township, setTownship] = useState('');
  const [county, setCounty] = useState('');
  const [hp, setHp] = useState(''); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Autofill identity from a prior submission ON THIS DEVICE (localStorage —
  // never IP, since convention attendees share venue WiFi). The question is
  // always left blank.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const p: Profile = JSON.parse(raw);
        if (p.name) setName(p.name);
        if (p.township) setTownship(p.township);
        if (p.county) setCounty(p.county);
      }
      const last = parseInt(localStorage.getItem(LAST_SUBMIT_KEY) || '0', 10);
      const remaining = COOLDOWN_MS - (Date.now() - last);
      if (remaining > 0) startCooldown(Math.ceil(remaining / 1000));
    } catch {
      /* ignore storage errors */
    }
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const onSubmit = async () => {
    setError(null);
    if (!question.trim()) return setError('Please enter a question.');
    if (!name.trim()) return setError('Please enter your name.');

    setSubmitting(true);
    try {
      const res = await fetch('/api/live-qa/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submit_code: submitCode,
          question: question.trim(),
          name: name.trim(),
          township: township.trim(),
          county: county.trim(),
          hp,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Submission failed');

      // Remember identity on this device for the next question.
      try {
        localStorage.setItem(
          PROFILE_KEY,
          JSON.stringify({ name: name.trim(), township: township.trim(), county: county.trim() })
        );
        localStorage.setItem(LAST_SUBMIT_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
      setQuestion('');
      setSent(true);
      startCooldown(Math.ceil(COOLDOWN_MS / 1000));
    } catch (e: any) {
      setError(e.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 rounded-xl p-6 text-center">
        <h2 className="font-semibold mb-1">This Q&amp;A is closed</h2>
        <p className="text-sm">It&apos;s no longer accepting new questions. Thanks for attending!</p>
      </div>
    );
  }

  // Confirmation screen after a successful submission.
  if (sent) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-1">Question submitted!</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
          It&apos;ll appear on screen once an organizer approves it. Got another? Send it below.
        </p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setSent(false);
          }}
          disabled={cooldown > 0}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 text-base font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-5 h-5" />
          {cooldown > 0 ? `Submit another in ${cooldown}s` : 'Submit another question'}
        </button>
      </div>
    );
  }

  const disabled = submitting || cooldown > 0;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6 space-y-4">
      {error && (
        <div
          role="alert"
          className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-sm rounded-lg px-4 py-3"
        >
          {error}
        </div>
      )}

      <div>
        <label htmlFor="lqa-question" className="block text-sm font-medium mb-1.5">
          Your question <span className="text-red-600">*</span>
        </label>
        <textarea
          id="lqa-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION))}
          rows={4}
          placeholder="Type your question here…"
          className="w-full px-3 py-2.5 text-base bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <div className="mt-1 text-xs text-gray-400 text-right">
          {question.length}/{MAX_QUESTION}
        </div>
      </div>

      <div>
        <label htmlFor="lqa-name" className="block text-sm font-medium mb-1.5">
          Your name <span className="text-red-600">*</span>
        </label>
        <input
          id="lqa-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2.5 text-base bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="lqa-township" className="block text-sm font-medium mb-1.5">
            Township <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="lqa-township"
            type="text"
            value={township}
            onChange={(e) => setTownship(e.target.value)}
            className="w-full px-3 py-2.5 text-base bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label htmlFor="lqa-county" className="block text-sm font-medium mb-1.5">
            County <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="lqa-county"
            type="text"
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            placeholder="e.g. Hancock"
            className="w-full px-3 py-2.5 text-base bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      {/* Honeypot — hidden from humans, only bots fill it. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
        <label>
          Company
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
          />
        </label>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-base font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
        {submitting
          ? 'Submitting…'
          : cooldown > 0
          ? `Wait ${cooldown}s to submit again`
          : 'Submit question'}
      </button>
    </div>
  );
}
