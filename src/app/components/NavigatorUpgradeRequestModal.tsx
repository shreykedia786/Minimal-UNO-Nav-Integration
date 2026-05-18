import { Check } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/app/components/ui/dialog';

const SUPPORT_EMAIL = 'unonavigator@rategain.com';

export type NavigatorUpgradeRequestModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NavigatorUpgradeRequestModal({ open, onOpenChange }: NavigatorUpgradeRequestModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        onPointerDownOutside={() => onOpenChange(false)}
        onEscapeKeyDown={() => onOpenChange(false)}
        className="max-w-[min(400px,calc(100%-2rem))] gap-0 border border-emerald-100/80 bg-white p-0 shadow-2xl sm:max-w-md"
        aria-describedby="navigator-upgrade-request-desc"
      >
        <div className="flex flex-col items-center px-6 pb-7 pt-8 text-center">
          <div
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-[0_0_0_10px_rgba(16,185,129,0.12)]"
            aria-hidden
          >
            <Check className="size-9 text-white" strokeWidth={3} />
          </div>
          <DialogHeader className="mt-6 space-y-2 sm:text-center">
            <DialogTitle className="text-lg font-semibold tracking-tight text-slate-900">
              Upgrade request received
            </DialogTitle>
            <DialogDescription
              id="navigator-upgrade-request-desc"
              className="text-[15px] leading-relaxed text-slate-600"
            >
              Your request has been received. Our team will contact you shortly to enable full access.
            </DialogDescription>
          </DialogHeader>
          <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-slate-600">
            Need help? Contact us at{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-semibold text-[#2753eb] underline decoration-slate-300 underline-offset-2 hover:decoration-[#2753eb]"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
          <DialogClose asChild>
            <Button
              type="button"
              className="mt-6 h-10 w-full max-w-[220px] bg-[#2753eb] text-white shadow-sm hover:bg-[#1e45c7]"
            >
              Got it
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
