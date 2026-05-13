import { Lock, Sparkles, X } from 'lucide-react';
import { NavigatorIntelligenceTeaserImage } from '@/app/components/NavigatorIntelligenceTeaserImage';

type DateCell = { day: string; date: string; month: string };

type NavigatorIntelligenceLockedRowProps = {
  dates: DateCell[];
  onRequestTrial: () => void;
  /** Limited / not-subscribed only: hide the whole preview block (persisted via parent + localStorage). */
  onDismissPreview?: () => void;
  trialRequestSubmitted?: boolean;
  navigatorUpgradeRequestSubmitted?: boolean;
  onNavigatorUpgradeRequestAcknowledged?: () => void;
  navigatorUpsellContext?: 'limited' | 'trial_expired';
};

export function NavigatorIntelligenceLockedRow({
  dates,
  onRequestTrial,
  onDismissPreview,
  trialRequestSubmitted = false,
  navigatorUpgradeRequestSubmitted = false,
  onNavigatorUpgradeRequestAcknowledged,
  navigatorUpsellContext = 'limited'
}: NavigatorIntelligenceLockedRowProps) {
  const colSpan = 2 + dates.length;

  return (
    <tr className="border-b border-[#e0e0e0] bg-white" data-tour="navigator-intelligence-locked">
      <td colSpan={colSpan} className="p-0">
        <div className="relative overflow-visible border-y border-[#e2e8f0]/80 bg-gradient-to-br from-[#f8fafc] via-white to-[#eff6ff]/90 px-3 py-3.5 sm:px-5 sm:py-4">
          <div
            className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-[#2753eb]/[0.06] blur-2xl"
            aria-hidden
          />
          <div className="relative z-[60] flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#2753eb]/15 bg-white shadow-sm ring-1 ring-black/[0.03]">
                  <Lock className="size-4 text-[#2753eb]" strokeWidth={2} aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <h3 className="inline-flex items-center gap-1.5 text-[14px] font-semibold leading-snug tracking-tight text-[#0f172a] sm:text-[15px]">
                      <Sparkles className="size-3.5 shrink-0 text-[#2753eb]" strokeWidth={2} aria-hidden />
                      <span>
                        {navigatorUpsellContext === 'trial_expired'
                          ? 'Your trial has ended — upgrade to continue'
                          : 'Competitor pricing'}
                      </span>
                    </h3>
                    <span className="rounded-md bg-slate-100/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Preview
                    </span>
                  </div>
                  <p className="max-w-2xl text-[11px] leading-snug text-slate-500 sm:text-[12px]">
                    {navigatorUpsellContext === 'trial_expired' ? (
                      <>
                        Your 30-day trial has ended. Upgrade to continue tracking competitor pricing on your live
                        dates.
                      </>
                    ) : (
                      <>Hover or tap the blue dots on the chart below to preview what subscribers see.</>
                    )}
                  </p>
                </div>
              </div>
              {onDismissPreview ? (
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-slate-300/90 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 opacity-0 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2753eb]/35 sm:py-1.5"
                  onClick={onDismissPreview}
                >
                  <X className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
                  Hide preview
                </button>
              ) : null}
            </div>
            <NavigatorIntelligenceTeaserImage
              notSubscribedLead
              onRequestTrial={onRequestTrial}
              onDismissPreview={onDismissPreview}
              trialRequestSubmitted={trialRequestSubmitted}
              navigatorUpgradeRequestSubmitted={navigatorUpgradeRequestSubmitted}
              onNavigatorUpgradeRequestAcknowledged={onNavigatorUpgradeRequestAcknowledged}
              navigatorUpsellContext={navigatorUpsellContext}
            />
          </div>
        </div>
      </td>
    </tr>
  );
}
