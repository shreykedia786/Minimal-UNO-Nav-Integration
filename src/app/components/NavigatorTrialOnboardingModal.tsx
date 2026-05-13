import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';

type NavigatorTrialOnboardingModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartTour: () => void;
  onSkipTour: () => void;
};

export function NavigatorTrialOnboardingModal({
  open,
  onOpenChange,
  onStartTour,
  onSkipTour
}: NavigatorTrialOnboardingModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="max-w-[min(460px,calc(100%-2rem))] gap-0 overflow-hidden border border-slate-200 bg-white p-0 shadow-[0_28px_70px_-18px_rgba(15,23,42,0.35)] sm:max-w-lg"
        aria-describedby="navigator-trial-onboarding-desc"
      >
        <div className="relative border-b border-slate-100 bg-gradient-to-r from-[#071936] via-[#123666] to-[#23508a] px-6 pb-5 pt-6 text-white">
          <div className="pointer-events-none absolute -right-7 -top-8 h-28 w-28 rounded-full bg-white/10 blur-xl" aria-hidden />
          <div className="pointer-events-none absolute -left-6 bottom-0 h-16 w-16 rounded-full bg-[#6ea8ff]/30 blur-xl" aria-hidden />
          <DialogHeader className="relative z-10 space-y-2 text-left">
            <DialogTitle className="flex items-center gap-2.5 text-[22px] font-semibold tracking-tight text-white">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/15 ring-1 ring-white/25">
                <img
                  src={`${import.meta.env.BASE_URL}navigator-pin-mark.png`}
                  srcSet={`${import.meta.env.BASE_URL}navigator-pin-mark.png 1x, ${import.meta.env.BASE_URL}navigator-pin-mark@2x.png 2x`}
                  width={36}
                  height={36}
                  alt="Navigator"
                  className="h-full w-full rounded-xl object-contain object-center p-0.5"
                  decoding="async"
                />
              </span>
              Your 30-day trial is active
            </DialogTitle>
            <DialogDescription id="navigator-trial-onboarding-desc" className="text-[14px] leading-relaxed text-white/90">
              Explore competitor pricing insights using standard configurations during your trial.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 pb-6 pt-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3">
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              What&apos;s included in your trial
            </p>
            <ul className="space-y-1.5 text-[13px] leading-relaxed text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[#2753eb]" aria-hidden />
                Standard setup: 1 night stay · 2 guests
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[#2753eb]" aria-hidden />
                Daily insights: Up to 30 days of data
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[#2753eb]" aria-hidden />
                Weekly insights: Up to 90 days of data
              </li>
            </ul>
          </div>

          <p className="text-[13px] leading-relaxed text-slate-600">
            Upgrade anytime to unlock full customization and extended data access.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onSkipTour}
              className="h-10 border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Skip tour
            </Button>
            <Button type="button" onClick={onStartTour} className="h-10 bg-[#2753eb] text-white hover:bg-[#1f45c5]">
              Start tour
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
