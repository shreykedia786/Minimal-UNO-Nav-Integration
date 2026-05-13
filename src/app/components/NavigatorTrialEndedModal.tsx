import { Clock3, Sparkles } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';

export type NavigatorTrialEndedModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgradeNow: () => void;
  onSkip: () => void;
  /** After the user acknowledged the upgrade flow; primary CTA reflects request sent. */
  upgradeRequestSubmitted?: boolean;
};

export function NavigatorTrialEndedModal({
  open,
  onOpenChange,
  onUpgradeNow,
  onSkip,
  upgradeRequestSubmitted = false
}: NavigatorTrialEndedModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="max-w-[min(460px,calc(100%-2rem))] gap-0 border border-slate-200 bg-white p-0 shadow-2xl sm:max-w-lg"
        aria-describedby="navigator-trial-ended-desc"
      >
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#0b1e3f] to-[#23508a] px-6 pb-5 pt-6 text-white">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[12px] font-medium">
            <Clock3 className="size-3.5" aria-hidden />
            30-day trial completed
          </div>
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-[22px] font-semibold tracking-tight text-white">
              Your Navigator trial has ended
            </DialogTitle>
            <DialogDescription id="navigator-trial-ended-desc" className="text-[14px] leading-relaxed text-white/85">
              Keep competitor pricing insights active to stay competitive and avoid missed opportunities.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 pb-6 pt-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3">
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">What you’ve been using</p>
            <ul className="space-y-1.5 text-[13px] leading-relaxed text-slate-700">
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[#2753eb]" aria-hidden />
                Compare your rates with competitors across dates
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[#2753eb]" aria-hidden />
                See competitor min and max rates per day to spot pricing gaps
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[#2753eb]" aria-hidden />
                Make faster pricing decisions with clear benchmarks
              </li>
            </ul>
          </div>

          <p className="text-[13px] leading-relaxed text-slate-600">
            Upgrade to continue accessing live competitor insights without interruption.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onSkip}
              className="h-10 border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Maybe later
            </Button>
            <Button
              type="button"
              disabled={upgradeRequestSubmitted}
              onClick={onUpgradeNow}
              className="h-10 bg-[#2753eb] text-white hover:bg-[#1f45c5] disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-white/90 disabled:hover:bg-slate-600"
            >
              {upgradeRequestSubmitted ? 'Upgrade Request Sent' : 'Upgrade now'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
