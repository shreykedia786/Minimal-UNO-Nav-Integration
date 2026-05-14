import { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Info,
  BarChart3
} from 'lucide-react';
import { NavigatorIntroPreview } from '@/app/components/PricingGapWelcomeAnimation';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string; // CSS selector to find the element
  position: 'top' | 'bottom' | 'left' | 'right';
  highlightPadding?: number;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Unlock Smarter Pricing Insights',
    description: 'Understand your pricing and stay competitive across channels.',
    targetSelector: '', // Centered modal
    position: 'bottom',
    highlightPadding: 0
  },
  {
    id: 'competitor-graph',
    title: 'Per-date competitor pricing',
    description:
      'Hover the info icon on any date to see your rate vs. competitor min and max.',
    targetSelector: '[data-tour="rate-chart"]',
    position: 'right',
    highlightPadding: 8
  },
  {
    id: 'drawer-preview',
    title: 'View detailed analysis',
    description:
      'Open the detailed view to compare your prices with competitors for each date. See where you are priced higher or lower—and identify opportunities to adjust.',
    targetSelector: '[data-tour="view-details-button"]',
    position: 'right',
    highlightPadding: 8
  }
];

const NAVIGATOR_MENU_STEP: OnboardingStep = {
  id: 'navigator-menu',
  title: 'Access Navigator from the UNO menu to explore full insights',
  description:
    'Open the UNO menu and search for Navigator to access deeper pricing insights anytime.',
  targetSelector: '[data-tour="uno-menu"]',
  position: 'right',
  highlightPadding: 10
};

/** Not subscribed / limited demo: single welcome with trial CTA + Maybe later (no in-app tour). */
const LIMITED_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome-intro-limited',
    title: 'Meet Navigator',
    description: '',
    targetSelector: '',
    position: 'bottom',
    highlightPadding: 0
  }
];

export const ONBOARDING_STORAGE_KEYS = {
  full: 'onboardingTourCompleted',
  limited: 'onboardingLimitedTourCompleted'
} as const;

export type OnboardingTourVariant = 'full' | 'limited';

interface OnboardingTourProps {
  onComplete: () => void;
  onStepChange?: (stepIndex: number) => void;
  variant?: OnboardingTourVariant;
  initialStep?: number;
  includeNavigatorMenuStep?: boolean;
  /** Limited welcome modal: opens the in-app subscribe / trial-request flow. */
  onRequestSubscription?: () => void;
}

const chartStyleTooltipIds = new Set(['competitor-graph']);

export function OnboardingTour({
  onComplete,
  onStepChange,
  variant = 'full',
  initialStep = 0,
  includeNavigatorMenuStep = false,
  onRequestSubscription
}: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState({ top: 0 });
  /** When true, pointer is on the left edge of the tooltip (tooltip sits to the right of the target). When false, tooltip flipped left of target — pointer on right edge. */
  const [tooltipArrowOnLeft, setTooltipArrowOnLeft] = useState(true);
  const [highlightRect, setHighlightRect] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [isVisible, setIsVisible] = useState(false);

  const steps = useMemo(() => {
    if (variant === 'limited') return LIMITED_ONBOARDING_STEPS;
    return includeNavigatorMenuStep ? [...ONBOARDING_STEPS, NAVIGATOR_MENU_STEP] : ONBOARDING_STEPS;
  }, [variant, includeNavigatorMenuStep]);

  useEffect(() => {
    setCurrentStep(Math.max(0, initialStep));
    setIsVisible(false);
  }, [variant, initialStep]);

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const isCenterModal = !step.targetSelector; // Check if this should be a centered modal
  const isLimitedWelcomeStep = step.id === 'welcome-intro-limited';
  const isWelcomeStep = step.id === 'welcome' || isLimitedWelcomeStep;
  const isNavigatorMenuStep = step.id === 'navigator-menu';

  const getTooltipWidth = (s: OnboardingStep) => {
    if (s.id === 'competitor-graph') return 332;
    return 360;
  };

  const getTooltipHeight = () => {
    if (isWelcomeStep) {
      if (step.id === 'welcome-intro-limited') return 500;
      return 460;
    }
    if (step.id === 'competitor-graph') return 340;
    if (step.id === 'drawer-preview') return 280;
    if (step.id === 'navigator-menu') return 330;
    return 260;
  };

  // Find target element and calculate position
  useEffect(() => {
    // Notify parent about step change
    onStepChange?.(currentStep);

    // If it's a center modal (no target selector), show immediately
    if (isCenterModal) {
      setTargetElement(null);
      setIsVisible(true);
      return;
    }

    const findTarget = () => {
      const element = document.querySelector(step.targetSelector) as HTMLElement;
      if (element) {
        setTargetElement(element);
        calculatePosition(element);
        setIsVisible(true);
      } else {
        // Retry after a short delay if element not found
        setTimeout(findTarget, 100);
      }
    };

    findTarget();

    // Recalculate on scroll or resize
    const handleUpdate = () => {
      if (targetElement) {
        calculatePosition(targetElement);
      }
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [currentStep, step.targetSelector, targetElement, isCenterModal]);

  const calculatePosition = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const tooltipWidth = getTooltipWidth(step);
    const tooltipHeight = getTooltipHeight();
    const padding = 20;

    // Update highlight rect here
    const currentHighlightRect = element.getBoundingClientRect();
    setHighlightRect(currentHighlightRect);

    let top = 0;
    let left = 0;

    switch (step.position) {
      case 'bottom':
        top = currentHighlightRect.bottom + padding;
        left = currentHighlightRect.left + currentHighlightRect.width / 2 - tooltipWidth / 2;
        break;
      case 'top':
        top = currentHighlightRect.top - tooltipHeight - padding;
        left = currentHighlightRect.left + currentHighlightRect.width / 2 - tooltipWidth / 2;
        break;
      case 'right': {
        // Check if tooltip would overflow on the right
        const rightPosition = currentHighlightRect.right + padding;
        if (rightPosition + tooltipWidth > window.innerWidth - 20) {
          // Tooltip on the left of the target — arrow must sit on the right edge of the tooltip
          left = currentHighlightRect.left - tooltipWidth - padding;
          setTooltipArrowOnLeft(false);
        } else {
          left = rightPosition;
          setTooltipArrowOnLeft(true);
        }

        // Calculate ideal position - center the arrow on the highlighted element
        // Arrow will be at position 95px from tooltip top (to stay on white background)
        // So we need: top + 95 = highlightCenter
        const highlightCenter = currentHighlightRect.top + currentHighlightRect.height / 2;
        let idealTop = highlightCenter - 95;

        // Chart tooltip — keep high placement so Next/CTAs stay in view on short viewports.
        if (step.id === 'competitor-graph') {
          idealTop = Math.min(idealTop, 330);
        }

        // Apply the ideal position with bounds checking
        top = idealTop;

        if (top + tooltipHeight > window.innerHeight - 20) {
          top = window.innerHeight - tooltipHeight - 20;
        }
        if (top < 40) {
          top = 40;
        }
        break;
      }
      case 'left':
        left = currentHighlightRect.left - tooltipWidth - padding;

        // Calculate ideal position - center the arrow on the highlighted element
        const highlightCenterLeft = currentHighlightRect.top + currentHighlightRect.height / 2;
        const idealTopLeft = highlightCenterLeft - 95;

        // Apply the ideal position with bounds checking
        top = idealTopLeft;

        if (top + tooltipHeight > window.innerHeight - 20) {
          top = window.innerHeight - tooltipHeight - 20;
        }
        if (top < 40) {
          top = 40;
        }
        break;
    }

    // Keep tooltip within viewport horizontally
    left = Math.max(20, Math.min(left, window.innerWidth - tooltipWidth - 20));

    setTooltipPosition({ top, left });

    // Calculate arrow position for right/left positioned tooltips
    if (step.position === 'right' || step.position === 'left') {
      // Calculate where the arrow should point to align with the highlighted element
      const highlightCenter = currentHighlightRect.top + currentHighlightRect.height / 2;
      const arrowTop = highlightCenter - top;

      const minArrowTop = 95;
      const maxArrowTop = tooltipHeight - 30;
      const constrainedArrowTop = Math.max(minArrowTop, Math.min(arrowTop, maxArrowTop));

      setArrowPosition({ top: constrainedArrowTop });
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, 200);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
      }, 200);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => {
      onComplete();
      const key = variant === 'limited' ? ONBOARDING_STORAGE_KEYS.limited : ONBOARDING_STORAGE_KEYS.full;
      localStorage.setItem(key, 'true');
    }, 200);
  };

  if (!targetElement && !isCenterModal) return null;

  const focusPad = step.highlightPadding ?? 8;
  const focusLeft = highlightRect.left - focusPad;
  const focusTop = highlightRect.top - focusPad;
  const focusW = highlightRect.width + focusPad * 2;
  const focusH = highlightRect.height + focusPad * 2;
  const focusRight = focusLeft + focusW;
  const focusBottom = focusTop + focusH;
  // Single dim layer with a true cut-out so the target is not washed by a second overlay (even-odd hole).
  const spotlightClipPath = `polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${focusLeft}px ${focusTop}px, ${focusLeft}px ${focusBottom}px, ${focusRight}px ${focusBottom}px, ${focusRight}px ${focusTop}px, ${focusLeft}px ${focusTop}px)`;

  return (
    <>
      {isCenterModal ? (
        <div
          className="fixed inset-0 z-[9998] bg-black/60 transition-opacity duration-300"
          style={{ opacity: isVisible ? 1 : 0 }}
        />
      ) : (
        <>
          <div
            className="fixed inset-0 z-[9998] bg-black/[0.52] transition-opacity duration-300 pointer-events-auto"
            style={{
              opacity: isVisible ? 1 : 0,
              clipPath: spotlightClipPath
            }}
            aria-hidden
          />
          <div
            className="fixed z-[9999] pointer-events-none transition-all duration-300 rounded-xl border-[3px] border-white bg-transparent shadow-[0_0_0_1px_rgba(39,83,235,0.65),0_0_32px_rgba(39,83,235,0.45),0_0_80px_rgba(39,83,235,0.12)]"
            style={{
              top: focusTop,
              left: focusLeft,
              width: focusW,
              height: focusH,
              opacity: isVisible ? 1 : 0
            }}
          />
        </>
      )}

      {/* Tooltip */}
      <div
        className={`fixed z-[10000] bg-white rounded-xl transition-all duration-300 ${
          chartStyleTooltipIds.has(step.id)
            ? 'shadow-[0_22px_50px_-12px_rgba(15,23,42,0.18)] ring-1 ring-[#2753eb]/12'
            : 'shadow-2xl ring-1 ring-black/[0.04]'
        }`}
        style={
          isCenterModal
            ? {
                top: '50%',
                left: '50%',
                transform: isVisible ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.95)',
                width: isLimitedWelcomeStep
                  ? 'min(500px, calc(100vw - 2rem))'
                  : isWelcomeStep
                    ? 'min(460px, calc(100vw - 2rem))'
                    : '420px',
                maxWidth: isLimitedWelcomeStep ? '500px' : isWelcomeStep ? '460px' : undefined,
                opacity: isVisible ? 1 : 0
              }
            : {
                top: tooltipPosition.top,
                left: tooltipPosition.left,
                width: `${getTooltipWidth(step)}px`,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'scale(1)' : 'scale(0.95)'
              }
        }
      >
        {/* Header — same blue bar as all other onboarding steps */}
        <div className="relative overflow-visible bg-gradient-to-r from-[#2753eb] to-[#4f46e5] px-6 py-4 text-white rounded-t-xl">
          {/* Last step (full Navigator): blue pointer in header toward UNO menu — replaces white body arrow */}
          {isNavigatorMenuStep && !isCenterModal && step.position === 'right' ? (
            tooltipArrowOnLeft ? (
              <div
                aria-hidden
                className="pointer-events-none absolute left-0 top-[20px] z-[2] h-3.5 w-3.5 -translate-x-1/2 rotate-45 border border-[#1e40af]/35 bg-[#2753eb]"
              />
            ) : (
              <div
                aria-hidden
                className="pointer-events-none absolute right-0 top-1/2 z-[2] h-3.5 w-3.5 translate-x-1/2 -translate-y-1/2 rotate-45 border border-[#1e40af]/35 bg-[#2753eb] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
              />
            )
          ) : null}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold leading-tight mb-1">{step.title}</h3>
                {steps.length > 1 ? (
                  <p className="text-[11px] text-white/80">
                    Step {currentStep + 1} of {steps.length}
                  </p>
                ) : (
                  <p className="text-[11px] text-white/80">Stay competitive on price</p>
                )}
              </div>
            </div>
            <button
              onClick={handleComplete}
              className="text-white/80 hover:text-white transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`px-6 ${isWelcomeStep ? 'py-5 pb-5' : 'py-5'}`}>
          {!isWelcomeStep && step.description ? (
            <p className="text-[13px] leading-relaxed text-gray-700">{step.description}</p>
          ) : null}

          {/* Welcome — full trial: two cards; limited trial: dedicated preview per step */}
          {isWelcomeStep && (
            <div className={isLimitedWelcomeStep ? 'space-y-3' : 'space-y-4'}>
              {step.id === 'welcome-intro-limited' ? (
                <NavigatorIntroPreview />
              ) : (
                <>
                  <p className="text-[13px] leading-relaxed text-slate-600">{step.description}</p>
                  <div className="grid gap-3">
                    <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                      <div className="flex gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2753eb] ring-1 ring-blue-200/70">
                          <BarChart3 className="h-5 w-5" strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[13px] font-bold leading-snug text-slate-900">
                            Competitor rate insights
                          </h4>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                            See how your rates compare with competitors across dates.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-[10px] leading-snug text-slate-400">
                    {steps.length <= 2 ? '~30 seconds' : '~1 minute'} · {steps.length} quick step
                    {steps.length === 1 ? '' : 's'}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Hover-tooltip preview — mirrors RoomDateInfoIcon visually: trigger glyph + tailed card. */}
          {step.id === 'competitor-graph' && (
            <div className="mt-3">
              {/* Trigger hint: animated info icon "sitting" above the tooltip — reads as a real hover affordance. */}
              <div className="mb-1.5 flex items-center gap-2 px-0.5">
                <span className="relative inline-flex h-[16px] w-[16px] items-center justify-center rounded-full border border-slate-300/90 bg-white text-[#1565C0] shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
                  <Info className="h-[10px] w-[10px]" strokeWidth={2.5} aria-hidden />
                  <span
                    aria-hidden
                    className="absolute inset-0 animate-ping rounded-full bg-[#2196F3]/30"
                  />
                </span>
                <span className="text-[10.5px] font-medium text-slate-600">
                  Hover the info icon on a date
                </span>
                <span className="ml-auto text-[8.5px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Preview
                </span>
              </div>

              {/* Tooltip card */}
              <div className="relative rounded-xl border border-slate-200/85 bg-gradient-to-b from-slate-50/90 to-white px-2.5 pb-2 pt-2 shadow-[0_10px_24px_-14px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.9)]">
                {/* Pointer tail connecting to the info-icon trigger above */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-[5px] left-3 h-2 w-2 rotate-45 border-l border-t border-slate-200/85 bg-slate-50/90"
                />

                {/* Date / room header */}
                <div className="flex items-baseline justify-between gap-2 border-b border-slate-200/70 pb-1.5">
                  <span className="text-[11px] font-semibold leading-tight text-slate-900">Thu, 18 Dec</span>
                  <span className="text-[9.5px] font-medium text-slate-400">Standard Room</span>
                </div>

                {/* Rate rows with color rails */}
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="h-4 w-[3px] shrink-0 rounded-full bg-sky-500" />
                    <span className="flex-1 truncate text-[10.5px] font-semibold tracking-tight text-sky-700">
                      Your rate
                    </span>
                    <span className="text-[13px] font-bold tabular-nums leading-none text-slate-900">€420</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="h-4 w-[3px] shrink-0 rounded-full bg-emerald-500" />
                    <span className="flex-1 truncate text-[10.5px] font-semibold tracking-tight text-emerald-700">
                      Competitor min
                    </span>
                    <span className="text-[13px] font-bold tabular-nums leading-none text-slate-900">€365</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="h-4 w-[3px] shrink-0 rounded-full bg-rose-500" />
                    <span className="flex-1 truncate text-[10.5px] font-semibold tracking-tight text-rose-700">
                      Competitor max
                    </span>
                    <span className="text-[13px] font-bold tabular-nums leading-none text-slate-900">€510</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step.id === 'navigator-menu' && (
            <div className="mt-3">
              <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <p className="text-[13px] font-semibold leading-snug text-slate-900">With Navigator, you can:</p>
                <ul className="mt-2.5 list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-slate-700">
                  <li>Track rate trends</li>
                  <li>View demand forecasts</li>
                  <li>Monitor OTA rankings</li>
                </ul>
              </div>
            </div>
          )}

          {/* Progress indicators — only when there are multiple steps */}
          {steps.length > 1 && (
            <div className="flex items-center gap-1.5 mb-4 mt-5">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className="h-1.5 flex-1 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: index === currentStep ? '#2753eb' : index < currentStep ? '#2753eb80' : '#e5e7eb'
                  }}
                />
              ))}
            </div>
          )}

          {/* Actions */}
          {isLimitedWelcomeStep ? (
            <div className={steps.length > 1 ? '' : 'mt-5'}>
              <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={handleComplete}
                  className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
                >
                  Maybe later
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleComplete();
                    onRequestSubscription?.();
                  }}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#2753eb] px-5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#1e3db8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2753eb]/40"
                >
                  Start your free 30 days trial
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
                </button>
              </div>
              <p className="mt-2.5 text-center text-[10.5px] font-medium leading-snug text-slate-400">
                Cancel anytime. No commitments.
              </p>
            </div>
          ) : isNavigatorMenuStep ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleSkip}
                className="order-3 self-start text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-700 sm:order-1"
              >
                Skip tour
              </button>
              <div className="order-1 flex flex-wrap items-center justify-end gap-2 sm:order-2">
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-100 rounded-lg"
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-[#2753eb] hover:bg-[#1e3db8] rounded-lg transition-colors"
                >
                  Finish
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleSkip}
                className="text-[13px] text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                Skip Tour
              </button>

              <div className="flex items-center gap-2">
                {!isFirstStep && (
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Previous
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-[#2753eb] hover:bg-[#1e3db8] rounded-lg transition-colors"
                >
                  {isLastStep ? 'Finish' : 'Next'}
                  {!isLastStep && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Arrow pointer — vertical position targets highlight center (chevron on step 2) */}
        {!isCenterModal && step.position === 'bottom' && (
          <div
            className="absolute -top-2 w-4 h-4 bg-white"
            style={{
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)'
            }}
          />
        )}
        {!isCenterModal && step.position === 'top' && (
          <div
            className="absolute -bottom-2 w-4 h-4 bg-white"
            style={{
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)'
            }}
          />
        )}
        {!isCenterModal && step.position === 'right' && tooltipArrowOnLeft && !isNavigatorMenuStep && (
          <div
            className="absolute -left-2 h-4 w-4 bg-white"
            style={{
              top: arrowPosition.top,
              transform: 'translateY(-50%) rotate(45deg)'
            }}
          />
        )}
        {!isCenterModal && step.position === 'right' && !tooltipArrowOnLeft && !isNavigatorMenuStep && (
          <div
            className="absolute -right-2 h-4 w-4 bg-white"
            style={{
              top: arrowPosition.top,
              transform: 'translateY(-50%) rotate(45deg)'
            }}
          />
        )}
        {!isCenterModal && step.position === 'left' && (
          <div
            className="absolute -right-2 w-4 h-4 bg-white"
            style={{
              top: arrowPosition.top,
              transform: 'rotate(45deg)'
            }}
          />
        )}
      </div>
    </>
  );
}