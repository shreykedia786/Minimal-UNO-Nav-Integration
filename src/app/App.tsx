import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Header } from '@/app/components/Header';
import { PropertyInventoryTable } from '@/app/components/PropertyInventoryTable';
import { OnboardingTour, ONBOARDING_STORAGE_KEYS } from '@/app/components/OnboardingTour';
import { NavigatorTrialOnboardingModal } from '@/app/components/NavigatorTrialOnboardingModal';
import { NavigatorAccessGate } from '@/app/components/NavigatorSubscriptionGate';
import { NavigatorUpgradeRequestModal } from '@/app/components/NavigatorUpgradeRequestModal';
import { NavigatorTrialEndedModal } from '@/app/components/NavigatorTrialEndedModal';
import { StartFreeTrialModal } from '@/app/components/StartFreeTrialModal';
import { Button } from '@/app/components/ui/button';
import {
  readNavigatorEntitlement,
  setNavigatorFullSubscriber,
  navigatorIntelligenceUnlocked,
  trialDaysRemaining,
  applyNavigatorLimitedGateChoice,
  isNavigatorLockedPreviewDismissed,
  dismissNavigatorLockedPreview,
  clearNavigatorLockedPreviewDismiss,
  hasNavigatorTrialRequestSubmitted,
  hasNavigatorUpgradeRequestSubmitted,
  markNavigatorTrialRequestSubmitted,
  markNavigatorUpgradeRequestSubmitted,
  resetNavigatorRequestFlagsForDemo,
  ensureExpiredTrialSampleInStorage,
  isNavigatorLimitedUpsell,
  markNavigatorGateCompleted,
  startNavigatorTrial,
  STORAGE_SUBSCRIBED,
  STORAGE_TRIAL_START,
  type NavigatorEntitlement
} from '@/app/lib/navigatorEntitlement';

type AccessScreen = 'gate' | 'main';

/**
 * Demo: clear trial-request + upgrade-request flags once per page load so each
 * browser refresh replays the request flows from scratch. Runs at module init
 * before any `useState` initializers read from localStorage.
 */
resetNavigatorRequestFlagsForDemo();

function initialAccessScreen(): AccessScreen {
  // Every load / refresh: start on the access gate (three paths when a prior trial has expired).
  return 'gate';
}

/**
 * Navigator access with an active trial window (`STORAGE_TRIAL_START` within 30 days): same top strip as limited
 * upsell (dark gradient), so users see how many days remain before upgrading.
 */
function NavigatorTrialBanner({
  onUpgrade,
  upgradeRequestSubmitted = false
}: {
  onUpgrade: () => void;
  upgradeRequestSubmitted?: boolean;
}) {
  const left = trialDaysRemaining();
  if (left == null || left < 1) return null;
  return (
    <div className="navigator-top-strip relative w-full shrink-0 border-b border-white/10 bg-gradient-to-r from-[#001533] to-[#23508a] px-4 py-2.5 text-[14px] sm:px-[50px]">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-center gap-2 text-center sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3 sm:gap-y-2 sm:text-left">
        <p className="max-w-[920px] font-normal leading-snug text-white/95 sm:leading-tight">
          You have <strong className="font-semibold text-white">{left}</strong> day{left === 1 ? '' : 's'} left in your
          Navigator trial. Compare your rates with competitors before it ends.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:shrink-0">
          <span className="hidden select-none text-white/80 sm:inline" aria-hidden>
            —
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={upgradeRequestSubmitted}
            className="inline-flex h-9 w-full items-center justify-center whitespace-nowrap rounded border border-white bg-transparent px-4 text-[14px] font-medium text-white shadow-none hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:border-white/25 disabled:bg-white/[0.04] disabled:text-white/55 disabled:hover:bg-white/[0.04] sm:w-auto"
            onClick={onUpgrade}
          >
            {upgradeRequestSubmitted ? 'Upgrade Request Sent' : 'Upgrade anytime'}
          </Button>
        </div>
      </div>
    </div>
  );
}

const LIMITED_BANNER_DISMISS_KEY = 'uno.navigatorLimitedBanner.dismissed';
const TRIAL_ENDED_MODAL_DISMISS_KEY = 'uno.navigatorTrialEndedModal.dismissed';

/** In-product cross-sell for UNO users without Navigator (no separate marketing page). */
function NavigatorLimitedBanner({
  onStartTrial,
  lockedNavigatorPreviewDismissed,
  onRestoreNavigatorChartPreview,
  onDismiss,
  trialRequestSubmitted,
  upgradeRequestSubmitted,
  upsellContext
}: {
  onStartTrial: () => void;
  lockedNavigatorPreviewDismissed?: boolean;
  onRestoreNavigatorChartPreview?: () => void;
  onDismiss: () => void;
  trialRequestSubmitted: boolean;
  /** Post–trial banner: user completed the in-app upgrade request acknowledgment. */
  upgradeRequestSubmitted: boolean;
  upsellContext: 'standard' | 'trial_ended';
}) {
  const dismiss = () => {
    try {
      sessionStorage.setItem(LIMITED_BANNER_DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    onDismiss();
  };

  return (
    <div className="navigator-top-strip relative w-full shrink-0 border-b border-white/10 bg-gradient-to-r from-[#001533] to-[#23508a] px-4 py-2.5 pr-12 text-[14px] sm:px-[50px] sm:pr-14">
      <button
        type="button"
        className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-white/90 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 sm:right-10"
        aria-label="Dismiss banner"
        onClick={dismiss}
      >
        <X className="size-[18px]" strokeWidth={2} aria-hidden />
      </button>
      <div
        className={`mx-auto flex max-w-[1440px] flex-col items-center justify-center gap-2 text-center sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2 ${
          (upsellContext !== 'trial_ended' && trialRequestSubmitted) ||
          (upsellContext === 'trial_ended' && upgradeRequestSubmitted)
            ? 'sm:justify-center'
            : 'sm:text-left'
        }`}
      >
        {upsellContext !== 'trial_ended' && trialRequestSubmitted ? (
          <p className="m-0 mx-auto w-full max-w-[920px] text-center text-[13px] font-normal leading-snug text-white/95 sm:text-center sm:text-[14px] sm:leading-tight">
            Thanks for your request! Your 30-day trial will be activated shortly—we&apos;ll notify you once it&apos;s
            ready. For any queries, contact{' '}
            <a
              href="mailto:help@rategain.com"
              className="font-medium text-white underline decoration-white/50 underline-offset-2 transition-colors hover:decoration-white"
            >
              help@rategain.com
            </a>
          </p>
        ) : upsellContext === 'trial_ended' && upgradeRequestSubmitted ? (
          <p className="m-0 mx-auto w-full max-w-[920px] text-center text-[13px] font-normal leading-snug text-white/95 sm:text-center sm:text-[14px] sm:leading-tight lg:whitespace-nowrap">
            Thanks for your upgrade request! Our team will contact you shortly to take this forward. For any
            questions, reach out to{' '}
            <a
              href="mailto:help@rategain.com"
              className="font-medium text-white underline decoration-white/50 underline-offset-2 transition-colors hover:decoration-white"
            >
              help@rategain.com
            </a>
          </p>
        ) : (
          <p className="max-w-[920px] font-normal leading-snug text-white/95 sm:leading-tight">
            {upsellContext === 'trial_ended' ? (
              <>
                Your Navigator trial has ended. Upgrade to continue tracking live competitor pricing.
              </>
            ) : (
              <>
                <span aria-hidden>👉 </span>
                Want to stay competitive on pricing? Compare your rates with competitors to make smarter pricing
                decisions
              </>
            )}
          </p>
        )}
        {upsellContext !== 'trial_ended' && trialRequestSubmitted ? null : upsellContext === 'trial_ended' &&
          upgradeRequestSubmitted ? null : (
          <div className="flex flex-wrap items-center justify-center gap-2 sm:shrink-0">
            <span className="hidden select-none text-white/80 sm:inline" aria-hidden>
              —
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="inline-flex h-9 w-full items-center justify-center whitespace-nowrap rounded border border-white bg-transparent px-4 text-[14px] font-medium text-white shadow-none hover:bg-white/10 hover:text-white sm:w-auto"
              onClick={onStartTrial}
            >
              {upsellContext === 'trial_ended' ? 'Upgrade to full version' : 'Start your free 30-day trial'}
            </Button>
            {lockedNavigatorPreviewDismissed && onRestoreNavigatorChartPreview ? (
              <button
                type="button"
                className="text-[12px] font-medium text-white/90 underline decoration-white/50 underline-offset-2 transition-colors hover:text-white hover:decoration-white sm:text-[13px]"
                onClick={onRestoreNavigatorChartPreview}
              >
                Show competitor chart preview
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [accessScreen, setAccessScreen] = useState<AccessScreen>(initialAccessScreen);
  const [entitlement, setEntitlement] = useState<NavigatorEntitlement>(() => readNavigatorEntitlement());
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  const [onboardingInitialStep, setOnboardingInitialStep] = useState(0);
  const [trialOnboardingModalOpen, setTrialOnboardingModalOpen] = useState(false);
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [navigatorUpgradeModalOpen, setNavigatorUpgradeModalOpen] = useState(false);
  const [trialEndedModalOpen, setTrialEndedModalOpen] = useState(false);
  const [trialRequestSubmitted, setTrialRequestSubmitted] = useState(() => hasNavigatorTrialRequestSubmitted());
  const [upgradeRequestSubmitted, setUpgradeRequestSubmitted] = useState(() =>
    hasNavigatorUpgradeRequestSubmitted()
  );
  const [lockedNavigatorPreviewDismissed, setLockedNavigatorPreviewDismissed] = useState(
    () => isNavigatorLockedPreviewDismissed()
  );
  /** Shown once after user hides the locked chart preview (not when preview was already hidden from storage). */
  const [previewDismissGuidanceVisible, setPreviewDismissGuidanceVisible] = useState(false);
  /** Limited promo strip dismissed for this session (sessionStorage); no secondary/minimized UI. */
  const [limitedBannerDismissed, setLimitedBannerDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(LIMITED_BANNER_DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  /** Subscribed demo: UNO date range longer than Navigator’s 365-day competitor data window. */
  const [extendedUnoBeyondNavigator, setExtendedUnoBeyondNavigator] = useState(false);

  const handleLimitedBannerDismiss = useCallback(() => {
    setLimitedBannerDismissed(true);
  }, []);

  const syncEntitlement = useCallback(() => {
    setEntitlement(readNavigatorEntitlement());
  }, []);

  const handleDismissLockedNavigatorPreview = useCallback(() => {
    dismissNavigatorLockedPreview();
    setLockedNavigatorPreviewDismissed(true);
    setPreviewDismissGuidanceVisible(true);
  }, []);

  const handleRestoreLockedNavigatorPreview = useCallback(() => {
    clearNavigatorLockedPreviewDismiss();
    setLockedNavigatorPreviewDismissed(false);
    setPreviewDismissGuidanceVisible(false);
  }, []);

  const enterMainAsFullSubscriber = () => {
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEYS.full);
      localStorage.removeItem(ONBOARDING_STORAGE_KEYS.limited);
    } catch {
      /* ignore */
    }
    setShowOnboardingTour(false);
    setTrialOnboardingModalOpen(false);
    setOnboardingInitialStep(0);
    clearNavigatorLockedPreviewDismiss();
    setLockedNavigatorPreviewDismissed(false);
    setPreviewDismissGuidanceVisible(false);
    try {
      sessionStorage.removeItem(LIMITED_BANNER_DISMISS_KEY);
    } catch {
      /* ignore */
    }
    setLimitedBannerDismissed(false);
    try {
      localStorage.removeItem(STORAGE_TRIAL_START);
    } catch {
      /* ignore */
    }
    setNavigatorFullSubscriber();
    syncEntitlement();
    setAccessScreen('main');
  };

  const enterMainAsTrialSubscriber = () => {
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEYS.full);
      localStorage.removeItem(ONBOARDING_STORAGE_KEYS.limited);
    } catch {
      /* ignore */
    }
    setShowOnboardingTour(false);
    setTrialOnboardingModalOpen(false);
    setOnboardingInitialStep(0);
    clearNavigatorLockedPreviewDismiss();
    setLockedNavigatorPreviewDismissed(false);
    setPreviewDismissGuidanceVisible(false);
    try {
      sessionStorage.removeItem(LIMITED_BANNER_DISMISS_KEY);
    } catch {
      /* ignore */
    }
    setLimitedBannerDismissed(false);
    try {
      localStorage.removeItem(STORAGE_SUBSCRIBED);
    } catch {
      /* ignore */
    }
    startNavigatorTrial();
    syncEntitlement();
    setAccessScreen('main');
  };

  const handleTrialRequestSubmitted = useCallback(() => {
    markNavigatorTrialRequestSubmitted();
    setTrialRequestSubmitted(true);
    clearNavigatorLockedPreviewDismiss();
    setLockedNavigatorPreviewDismissed(false);
    setPreviewDismissGuidanceVisible(false);
    syncEntitlement();
  }, [syncEntitlement]);

  const acknowledgeNavigatorUpgradeRequest = useCallback(() => {
    markNavigatorUpgradeRequestSubmitted();
    setUpgradeRequestSubmitted(true);
  }, []);

  /** Post-trial path: gate → main with `trial_expired` upsell. Seeds a sample ended trial locally when none exists (demo). */
  const enterMainAfterTrialExpired = () => {
    ensureExpiredTrialSampleInStorage();
    try {
      /* Otherwise `readNavigatorEntitlement` short-circuits to `full` and unlocks subscriber charts. */
      localStorage.removeItem(STORAGE_SUBSCRIBED);
    } catch {
      /* ignore */
    }
    try {
      /* User already used UNO during trial — do not re-run either onboarding tour. */
      localStorage.setItem(ONBOARDING_STORAGE_KEYS.limited, 'true');
      localStorage.setItem(ONBOARDING_STORAGE_KEYS.full, 'true');
    } catch {
      /* ignore */
    }
    try {
      sessionStorage.removeItem(LIMITED_BANNER_DISMISS_KEY);
      sessionStorage.removeItem(TRIAL_ENDED_MODAL_DISMISS_KEY);
    } catch {
      /* ignore */
    }
    setLimitedBannerDismissed(false);
    clearNavigatorLockedPreviewDismiss();
    setLockedNavigatorPreviewDismissed(false);
    setPreviewDismissGuidanceVisible(false);
    setShowOnboardingTour(false);
    setTrialOnboardingModalOpen(false);
    setOnboardingInitialStep(0);
    markNavigatorGateCompleted();
    syncEntitlement();
    setAccessScreen('main');
  };

  /** Not subscribed: stay in UNO Rates & Inventory; intelligence stays off until trial or paid Navigator. */
  const enterMainWithoutNavigator = () => {
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEYS.full);
      localStorage.removeItem(ONBOARDING_STORAGE_KEYS.limited);
    } catch {
      /* ignore */
    }
    try {
      sessionStorage.removeItem(LIMITED_BANNER_DISMISS_KEY);
    } catch {
      /* ignore */
    }
    setLimitedBannerDismissed(false);
    clearNavigatorLockedPreviewDismiss();
    setLockedNavigatorPreviewDismissed(false);
    setPreviewDismissGuidanceVisible(false);
    setShowOnboardingTour(false);
    setTrialOnboardingModalOpen(false);
    setOnboardingInitialStep(0);
    applyNavigatorLimitedGateChoice();
    syncEntitlement();
    setAccessScreen('main');
  };

  useEffect(() => {
    if (accessScreen !== 'main') return;
    if (entitlement === 'trial_expired') return;

    const storageKey =
      entitlement === 'limited' ? ONBOARDING_STORAGE_KEYS.limited : ONBOARDING_STORAGE_KEYS.full;
    let tourCompleted = false;
    try {
      tourCompleted = localStorage.getItem(storageKey) === 'true';
    } catch {
      tourCompleted = false;
    }

    if (!tourCompleted) {
      if (entitlement === 'trial') {
        setShowOnboardingTour(false);
        setOnboardingInitialStep(1);
        setTrialOnboardingModalOpen(true);
        return;
      }
      const timer = setTimeout(() => {
        setOnboardingInitialStep(0);
        setShowOnboardingTour(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
    setTrialOnboardingModalOpen(false);
  }, [accessScreen, entitlement]);

  useEffect(() => {
    if (accessScreen !== 'main' || entitlement !== 'trial_expired') {
      setTrialEndedModalOpen(false);
      return;
    }
    if (upgradeRequestSubmitted) {
      setTrialEndedModalOpen(false);
      return;
    }
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(TRIAL_ENDED_MODAL_DISMISS_KEY) === '1';
    } catch {
      dismissed = false;
    }
    setTrialEndedModalOpen(!dismissed);
  }, [accessScreen, entitlement, upgradeRequestSubmitted]);

  const dismissTrialEndedModal = useCallback(() => {
    try {
      sessionStorage.setItem(TRIAL_ENDED_MODAL_DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setTrialEndedModalOpen(false);
  }, []);

  /** Trial or full subscriber: clear completion flag and restart intro modal or guided tour. */
  const restartNavigatorOnboarding = useCallback(() => {
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEYS.full);
    } catch {
      /* ignore */
    }
    setShowOnboardingTour(false);
    setTrialOnboardingModalOpen(false);
    if (entitlement === 'trial') {
      setOnboardingInitialStep(1);
      window.setTimeout(() => setTrialOnboardingModalOpen(true), 0);
    } else if (entitlement === 'full') {
      setOnboardingInitialStep(0);
      window.setTimeout(() => setShowOnboardingTour(true), 100);
    }
  }, [entitlement]);

  const handleTourComplete = () => {
    setShowOnboardingTour(false);
    setOnboardingInitialStep(0);
  };

  const intelligenceOn = navigatorIntelligenceUnlocked(entitlement);

  if (accessScreen === 'gate') {
    return (
      <NavigatorAccessGate
        onNotSubscribed={enterMainWithoutNavigator}
        onTrialSubscribed={enterMainAsTrialSubscriber}
        onFullVersion={enterMainAsFullSubscriber}
        onTrialExpiredContinue={enterMainAfterTrialExpired}
      />
    );
  }

  const limitedLikeUpsell = isNavigatorLimitedUpsell(entitlement);

  return (
    <div className="min-h-screen bg-[#f5f5f5] w-full">
      {limitedLikeUpsell && !limitedBannerDismissed ? (
        <NavigatorLimitedBanner
          onStartTrial={() => {
            if (entitlement === 'trial_expired') {
              if (!upgradeRequestSubmitted) setNavigatorUpgradeModalOpen(true);
              return;
            }
            if (!trialRequestSubmitted) setTrialModalOpen(true);
          }}
          lockedNavigatorPreviewDismissed={lockedNavigatorPreviewDismissed}
          onRestoreNavigatorChartPreview={handleRestoreLockedNavigatorPreview}
          onDismiss={handleLimitedBannerDismiss}
          trialRequestSubmitted={trialRequestSubmitted}
          upgradeRequestSubmitted={upgradeRequestSubmitted}
          upsellContext={entitlement === 'trial_expired' ? 'trial_ended' : 'standard'}
        />
      ) : null}
      {limitedLikeUpsell &&
      lockedNavigatorPreviewDismissed &&
      previewDismissGuidanceVisible ? (
        <div className="w-full shrink-0 border-b border-sky-200/90 bg-sky-50 px-4 py-2.5 sm:px-[50px]">
          <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-center gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="max-w-3xl text-center text-[12px] leading-snug text-sky-950 sm:text-left sm:text-[13px]">
              <span className="font-semibold">Preview hidden.</span>{' '}
              {entitlement === 'trial_expired' ? (
                limitedBannerDismissed ? (
                  <>
                    Use the Navigator intelligence section below to bring the sample preview back, or upgrade from the
                    blue banner at the top.
                  </>
                ) : (
                  <>
                    When you are ready to upgrade, use the blue Navigator banner at the top or the upgrade option in
                    the intelligence section below.
                  </>
                )
              ) : limitedBannerDismissed ? (
                <>
                  Use the Navigator intelligence section in the table below to start a free trial or bring the
                  competitor chart preview back.
                </>
              ) : (
                <>
                  Whenever you want to subscribe or start a trial, use the options in the blue Navigator banner at the
                  top of the page or in the intelligence section below.
                </>
              )}
            </p>
            <button
              type="button"
              className="shrink-0 rounded-md px-3 py-1 text-[12px] font-semibold text-sky-900 underline decoration-sky-400/70 underline-offset-2 transition-colors hover:bg-sky-100/80 hover:decoration-sky-700"
              onClick={() => setPreviewDismissGuidanceVisible(false)}
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
      {navigatorIntelligenceUnlocked(entitlement) && trialDaysRemaining() != null ? (
        <NavigatorTrialBanner
          onUpgrade={() => {
            if (!upgradeRequestSubmitted) setNavigatorUpgradeModalOpen(true);
          }}
          upgradeRequestSubmitted={upgradeRequestSubmitted}
        />
      ) : null}
      <Header
        onUnoLogoClick={() => {
          setTrialModalOpen(false);
          setNavigatorUpgradeModalOpen(false);
          setShowOnboardingTour(false);
          setTrialOnboardingModalOpen(false);
          setOnboardingInitialStep(0);
          clearNavigatorLockedPreviewDismiss();
          setLockedNavigatorPreviewDismissed(false);
          setPreviewDismissGuidanceVisible(false);
          setExtendedUnoBeyondNavigator(false);
          try {
            sessionStorage.removeItem(LIMITED_BANNER_DISMISS_KEY);
            sessionStorage.removeItem(TRIAL_ENDED_MODAL_DISMISS_KEY);
          } catch {
            /* ignore */
          }
          setLimitedBannerDismissed(false);
          setEntitlement(readNavigatorEntitlement());
          setAccessScreen('gate');
        }}
        onReplayNavigatorOnboarding={
          intelligenceOn && (entitlement === 'trial' || entitlement === 'full')
            ? restartNavigatorOnboarding
            : undefined
        }
        dateRangePrimaryLabel={
          intelligenceOn
            ? extendedUnoBeyondNavigator
              ? '20 Jan 2026 – 10 Jul 2027'
              : '20 Jan 2026 – 19 Feb 2026'
            : undefined
        }
        dateRangeHint={
          intelligenceOn
            ? extendedUnoBeyondNavigator
              ? 'UNO range ~18 months (demo). Shaded chart columns: past Navigator’s 1-year data limit.'
              : 'Selected for next 30 days'
            : undefined
        }
        showNavigatorRangeDemo={intelligenceOn}
        extendedUnoBeyondNavigator={extendedUnoBeyondNavigator}
        onExtendedUnoBeyondNavigatorChange={setExtendedUnoBeyondNavigator}
      />
      <div className="w-full max-w-[1440px] mx-auto px-[50px] mt-6">
        <PropertyInventoryTable
          navigatorIntelligenceUnlocked={intelligenceOn}
          extendedUnoBeyondNavigator={intelligenceOn ? extendedUnoBeyondNavigator : false}
          onRequestNavigatorTrial={() => {
            if (!trialRequestSubmitted) setTrialModalOpen(true);
          }}
          lockedNavigatorPreviewDismissed={limitedLikeUpsell ? lockedNavigatorPreviewDismissed : false}
          onDismissLockedNavigatorPreview={limitedLikeUpsell ? handleDismissLockedNavigatorPreview : undefined}
          navigatorTrialRequestSubmitted={trialRequestSubmitted}
          navigatorUpgradeRequestSubmitted={upgradeRequestSubmitted}
          onNavigatorUpgradeRequestAcknowledged={acknowledgeNavigatorUpgradeRequest}
          navigatorUpsellContext={entitlement === 'trial_expired' ? 'trial_expired' : 'limited'}
        />
      </div>

      {showOnboardingTour && (
        <OnboardingTour
          initialStep={onboardingInitialStep}
          includeNavigatorMenuStep={entitlement === 'full'}
          variant={entitlement === 'limited' || entitlement === 'trial_expired' ? 'limited' : 'full'}
          onComplete={handleTourComplete}
          onRequestSubscription={() => {
            if (!trialRequestSubmitted) setTrialModalOpen(true);
          }}
        />
      )}

      <StartFreeTrialModal open={trialModalOpen} onOpenChange={setTrialModalOpen} onSuccess={handleTrialRequestSubmitted} />
      <NavigatorTrialOnboardingModal
        open={trialOnboardingModalOpen}
        onOpenChange={(next) => {
          if (!next) {
            setTrialOnboardingModalOpen(false);
            try {
              localStorage.setItem(ONBOARDING_STORAGE_KEYS.full, 'true');
            } catch {
              /* ignore */
            }
            return;
          }
          setTrialOnboardingModalOpen(next);
        }}
        onStartTour={() => {
          setTrialOnboardingModalOpen(false);
          setOnboardingInitialStep(1);
          setShowOnboardingTour(true);
        }}
        onSkipTour={() => {
          setTrialOnboardingModalOpen(false);
          try {
            localStorage.setItem(ONBOARDING_STORAGE_KEYS.full, 'true');
          } catch {
            /* ignore */
          }
          setShowOnboardingTour(false);
          setOnboardingInitialStep(0);
        }}
      />
      <NavigatorTrialEndedModal
        open={trialEndedModalOpen}
        upgradeRequestSubmitted={upgradeRequestSubmitted}
        onOpenChange={(next) => {
          if (!next) dismissTrialEndedModal();
          else setTrialEndedModalOpen(true);
        }}
        onSkip={dismissTrialEndedModal}
        onUpgradeNow={() => {
          if (upgradeRequestSubmitted) return;
          dismissTrialEndedModal();
          setNavigatorUpgradeModalOpen(true);
        }}
      />
      <NavigatorUpgradeRequestModal
        open={navigatorUpgradeModalOpen}
        onOpenChange={(open) => {
          if (navigatorUpgradeModalOpen && !open) {
            acknowledgeNavigatorUpgradeRequest();
          }
          setNavigatorUpgradeModalOpen(open);
        }}
      />
    </div>
  );
}
