import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import ONBOARDING_STEPS from './onboardingSteps';

const OnboardingGuide = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [arrowStyle, setArrowStyle] = useState({});
  const [highlightStyle, setHighlightStyle] = useState({});
  const tooltipRef = useRef(null);

  const step = ONBOARDING_STEPS[currentStep];

  const positionTooltip = useCallback(() => {
    if (!step) return;
    const target = document.querySelector(`[data-tour="${step.target}"]`);
    if (!target) {
      // If target not found, center the tooltip
      setHighlightStyle({ display: 'none' });
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
      setArrowStyle({ display: 'none' });
      return;
    }

    const rect = target.getBoundingClientRect();
    const pad = 6;

    // Highlight box around the target
    setHighlightStyle({
      position: 'fixed',
      top: rect.top - pad,
      left: rect.left - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
      borderRadius: '12px',
    });

    const tooltipWidth = 320;
    const tooltipHeight = tooltipRef.current?.offsetHeight || 180;
    let top, left;
    let arrowPos = {};

    switch (step.position) {
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + pad + 16;
        // Clamp within viewport
        if (top < 8) top = 8;
        if (top + tooltipHeight > window.innerHeight - 8) top = window.innerHeight - tooltipHeight - 8;
        arrowPos = {
          position: 'absolute',
          top: '50%',
          left: '-6px',
          transform: 'translateY(-50%) rotate(45deg)',
          width: '12px',
          height: '12px',
          background: '#1e293b',
          borderLeft: '1px solid rgba(245,158,11,0.4)',
          borderBottom: '1px solid rgba(245,158,11,0.4)',
        };
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - pad - 16 - tooltipWidth;
        if (top < 8) top = 8;
        if (top + tooltipHeight > window.innerHeight - 8) top = window.innerHeight - tooltipHeight - 8;
        if (left < 8) left = 8;
        arrowPos = {
          position: 'absolute',
          top: '50%',
          right: '-6px',
          transform: 'translateY(-50%) rotate(45deg)',
          width: '12px',
          height: '12px',
          background: '#1e293b',
          borderRight: '1px solid rgba(245,158,11,0.4)',
          borderTop: '1px solid rgba(245,158,11,0.4)',
        };
        break;
      case 'bottom':
        top = rect.bottom + pad + 16;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        if (left < 8) left = 8;
        if (left + tooltipWidth > window.innerWidth - 8) left = window.innerWidth - tooltipWidth - 8;
        if (top + tooltipHeight > window.innerHeight - 8) {
          // Fall back to above
          top = rect.top - pad - 16 - tooltipHeight;
        }
        arrowPos = {
          position: 'absolute',
          top: '-6px',
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
          width: '12px',
          height: '12px',
          background: '#1e293b',
          borderLeft: '1px solid rgba(245,158,11,0.4)',
          borderTop: '1px solid rgba(245,158,11,0.4)',
        };
        break;
      default:
        top = rect.bottom + pad + 16;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
    }

    setTooltipStyle({
      position: 'fixed',
      top,
      left,
      width: tooltipWidth,
    });
    setArrowStyle(arrowPos);
  }, [step]);

  useEffect(() => {
    positionTooltip();
    window.addEventListener('resize', positionTooltip);
    return () => window.removeEventListener('resize', positionTooltip);
  }, [positionTooltip]);

  // Re-position after render so tooltipRef has height
  useEffect(() => {
    const timer = setTimeout(positionTooltip, 50);
    return () => clearTimeout(timer);
  }, [currentStep, positionTooltip]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onComplete} />

      {/* Highlight cutout with pulse animation */}
      <div
        className="absolute z-[1] pointer-events-none"
        style={highlightStyle}
      >
        <div className="absolute inset-0 rounded-xl border-2 border-amber-500 animate-pulse" />
        <div className="absolute inset-0 rounded-xl bg-amber-500/5" />
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="z-[2] bg-slate-800 border border-amber-500/40 rounded-xl shadow-2xl shadow-black/40 p-5"
        style={tooltipStyle}
      >
        {/* Arrow */}
        <div style={arrowStyle} />

        {/* Step counter */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] text-amber-500/70 font-medium uppercase tracking-wide">
            Step {currentStep + 1} of {ONBOARDING_STEPS.length}
          </span>
          <button
            onClick={onComplete}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <h3 className="text-base font-semibold text-white mb-2">{step.title}</h3>
        <p className="text-sm text-slate-300 leading-relaxed mb-4">{step.description}</p>

        {/* Progress bar */}
        <div className="w-full h-1 bg-slate-700 rounded-full mb-4">
          <div
            className="h-1 bg-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onComplete}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Skip Tour
          </button>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-300 hover:text-white bg-slate-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-slate-900 bg-amber-500 rounded-lg hover:bg-amber-400 transition-colors"
            >
              {currentStep === ONBOARDING_STEPS.length - 1 ? 'Finish' : 'Next'}
              {currentStep < ONBOARDING_STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingGuide;
