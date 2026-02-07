"use client";

import { Check } from 'lucide-react';

const STEPS = [
  { id: 1, name: 'Cover' },
  { id: 2, name: 'Letter' },
  { id: 3, name: 'Footer' },
  { id: 4, name: 'Content' },
  { id: 5, name: 'Review' },
];

export default function ProgressIndicator({ currentStep, onStepClick, completedSteps = [] }) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isClickable = isCompleted || step.id <= Math.max(...completedSteps, currentStep);

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step circle */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                className={`
                  relative flex items-center justify-center w-10 h-10 rounded-full font-medium text-sm transition-colors
                  ${isCurrent ? 'bg-[#1e3a5f] text-white' : ''}
                  ${isCompleted && !isCurrent ? 'bg-emerald-500 text-white' : ''}
                  ${!isCurrent && !isCompleted ? 'bg-slate-200 text-slate-500' : ''}
                  ${isClickable ? 'cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-[#1e3a5f]' : 'cursor-not-allowed'}
                `}
              >
                {isCompleted && !isCurrent ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.id
                )}
              </button>

              {/* Step name (below circle on mobile, beside on desktop) */}
              <span className={`
                hidden sm:block ml-2 text-sm font-medium
                ${isCurrent ? 'text-[#1e3a5f]' : ''}
                ${isCompleted ? 'text-emerald-600' : ''}
                ${!isCurrent && !isCompleted ? 'text-slate-400' : ''}
              `}>
                {step.name}
              </span>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div className="flex-1 mx-2 sm:mx-4">
                  <div className={`h-1 rounded ${
                    isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                  }`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile step name */}
      <p className="sm:hidden text-center mt-2 text-sm font-medium text-[#1e3a5f]">
        Step {currentStep}: {STEPS.find(s => s.id === currentStep)?.name}
      </p>
    </div>
  );
}
