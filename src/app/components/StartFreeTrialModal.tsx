import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { cn } from '@/app/components/ui/utils';

const NAVIGATOR_LOGO_BRAND_FILTER =
  'brightness(0) saturate(100%) invert(29%) sepia(90%) saturate(6194%) hue-rotate(225deg) brightness(98%) contrast(101%)';

const TRIAL_THANKS_AUTO_CLOSE_MS = 3600;

const ERR_PROPERTY_URL_EMPTY = 'Please enter a website URL for your property.';
const ERR_PROPERTY_URL_BAD =
  'Please enter a valid URL for your property (for example https://www.booking.com/hotel/...).';
const ERR_C1_NAME = 'Please enter at least one competitor property.';
const ERR_C1_URL_EMPTY = 'Please enter a website URL for competitor 1.';
const ERR_C1_URL_BAD =
  'Please enter a valid URL for competitor 1 (for example https://www.booking.com/hotel/...).';
const ERR_C2_PAIR = 'For competitor 2, enter both property name and URL, or leave both fields blank.';
const ERR_C2_URL_BAD = 'Please enter a valid URL for competitor 2.';
const ERR_C3_PAIR = 'For competitor 3, enter both property name and URL, or leave both fields blank.';
const ERR_C3_URL_BAD = 'Please enter a valid URL for competitor 3.';

function isValidHttpUrl(input: string): boolean {
  const raw = input.trim();
  if (!raw) return false;
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(candidate);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

type StartFreeTrialModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultBrand?: string;
  defaultProperty?: string;
};

export function StartFreeTrialModal({
  open,
  onOpenChange,
  onSuccess,
  defaultBrand = 'Mosaic Hotel Noida',
  defaultProperty = 'Mosaic Hotel Noida'
}: StartFreeTrialModalProps) {
  const [propertyUrl, setPropertyUrl] = useState('');
  const [competitor1, setCompetitor1] = useState('');
  const [competitor2, setCompetitor2] = useState('');
  const [competitor3, setCompetitor3] = useState('');
  const [competitor1Url, setCompetitor1Url] = useState('');
  const [competitor2Url, setCompetitor2Url] = useState('');
  const [competitor3Url, setCompetitor3Url] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [thanksOpen, setThanksOpen] = useState(false);
  const pendingSuccessRef = useRef(false);
  const prevThanksOpenRef = useRef(false);

  const resetForm = useCallback(() => {
    setPropertyUrl('');
    setCompetitor1('');
    setCompetitor2('');
    setCompetitor3('');
    setCompetitor1Url('');
    setCompetitor2Url('');
    setCompetitor3Url('');
    setError(null);
  }, []);

  const finalizeAfterThanks = useCallback(() => {
    if (!pendingSuccessRef.current) return;
    pendingSuccessRef.current = false;
    onSuccess();
    resetForm();
  }, [onSuccess, resetForm]);

  useEffect(() => {
    if (!thanksOpen) return;
    const t = window.setTimeout(() => setThanksOpen(false), TRIAL_THANKS_AUTO_CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [thanksOpen]);

  useEffect(() => {
    if (prevThanksOpenRef.current && !thanksOpen) {
      finalizeAfterThanks();
    }
    prevThanksOpenRef.current = thanksOpen;
  }, [thanksOpen, finalizeAfterThanks]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const propertyUrlTrimmed = propertyUrl.trim();
    const c1 = competitor1.trim();
    const c1u = competitor1Url.trim();
    const c2 = competitor2.trim();
    const c2u = competitor2Url.trim();
    const c3 = competitor3.trim();
    const c3u = competitor3Url.trim();

    if (!propertyUrlTrimmed) {
      setError(ERR_PROPERTY_URL_EMPTY);
      return;
    }
    if (!isValidHttpUrl(propertyUrlTrimmed)) {
      setError(ERR_PROPERTY_URL_BAD);
      return;
    }
    if (!c1) {
      setError(ERR_C1_NAME);
      return;
    }
    if (!c1u) {
      setError(ERR_C1_URL_EMPTY);
      return;
    }
    if (!isValidHttpUrl(c1u)) {
      setError(ERR_C1_URL_BAD);
      return;
    }
    if ((c2 && !c2u) || (!c2 && c2u)) {
      setError(ERR_C2_PAIR);
      return;
    }
    if (c2 && c2u && !isValidHttpUrl(c2u)) {
      setError(ERR_C2_URL_BAD);
      return;
    }
    if ((c3 && !c3u) || (!c3 && c3u)) {
      setError(ERR_C3_PAIR);
      return;
    }
    if (c3 && c3u && !isValidHttpUrl(c3u)) {
      setError(ERR_C3_URL_BAD);
      return;
    }

    setError(null);
    pendingSuccessRef.current = true;
    onOpenChange(false);
    setThanksOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          hideClose
          className={cn(
            'flex max-h-[min(90vh,720px)] max-w-[calc(100%-1.5rem)] flex-col overflow-hidden gap-0 rounded-xl border border-[#e8eaed] p-0 shadow-2xl sm:max-w-[480px]'
          )}
        >
          <div className="shrink-0 border-b border-[#eceff3] px-6 pb-3 pt-3.5">
            <div className="flex items-start justify-between gap-3 pr-8">
              <img
                src={`${import.meta.env.BASE_URL}navigator-logo.svg`}
                alt="Navigator"
                className="h-6 w-auto max-w-[124px] object-contain"
                style={{ filter: NAVIGATOR_LOGO_BRAND_FILTER }}
              />
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="absolute right-3 top-3 rounded-md p-1.5 text-[#64748b] transition-colors hover:bg-[#f1f5f9] hover:text-[#334155]"
                aria-label="Close"
              >
                <span className="text-xl leading-none font-light">×</span>
              </button>
            </div>
            <DialogHeader className="mt-2.5 gap-1 p-0 text-left">
              <DialogTitle className="text-[18px] font-bold leading-snug tracking-tight text-[#111827]">
                Start your 30-day free trial
              </DialogTitle>
              <DialogDescription className="text-[13px] leading-snug text-[#6b7280]">
                Get accurate, real-time competitor rate insights during your 30-day trial.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="trial-brand" className="text-[13px] font-medium text-[#374151]">
                    Your Brand
                  </Label>
                  <Input
                    id="trial-brand"
                    readOnly
                    defaultValue={defaultBrand}
                    className="h-10 cursor-not-allowed border-[#e5e7eb] bg-[#f3f4f6] text-[13px] text-[#6b7280]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="trial-property" className="text-[13px] font-medium text-[#374151]">
                    Your Property
                  </Label>
                  <Input
                    id="trial-property"
                    readOnly
                    defaultValue={defaultProperty}
                    className="h-10 cursor-not-allowed border-[#e5e7eb] bg-[#f3f4f6] text-[13px] text-[#6b7280]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="trial-property-url" className="text-[13px] font-medium text-[#374151]">
                    Property URL<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="trial-property-url"
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    value={propertyUrl}
                    onChange={(e) => setPropertyUrl(e.target.value)}
                    placeholder="https://"
                    required
                    className="h-10 border-[#e5e7eb] bg-white text-[13px] placeholder:text-[#9ca3af]"
                    aria-invalid={error === ERR_PROPERTY_URL_EMPTY || error === ERR_PROPERTY_URL_BAD}
                    aria-describedby={error ? 'trial-comp-error' : undefined}
                  />
                  <p className="text-[12px] leading-relaxed text-[#9ca3af]">
                    Public listing or website URL for your property so we can match the correct listing.
                  </p>
                </div>

                <div className="border-t border-[#f1f5f9] pt-4">
                  <h3 className="text-[14px] font-bold text-[#374151]">Please add up to 3 competitors</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#9ca3af]">
                    We need each property’s name and a public listing or website URL so we can match the
                    correct competitor (names alone are often ambiguous).
                  </p>
                </div>

                <div className="space-y-2 rounded-lg border border-[#f1f5f9] bg-[#fafbfc] p-3">
                  <p className="text-[13px] font-medium text-[#374151]">
                    Competitor 1<span className="text-red-500">*</span>
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="trial-comp-1" className="text-[12px] font-medium text-[#64748b]">
                      Property name<span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="trial-comp-1"
                      value={competitor1}
                      onChange={(e) => setCompetitor1(e.target.value)}
                      placeholder="Enter competitor property name"
                      className="h-10 border-[#e5e7eb] bg-white text-[13px] placeholder:text-[#9ca3af]"
                      aria-invalid={error === ERR_C1_NAME}
                      aria-describedby={error ? 'trial-comp-error' : undefined}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="trial-comp-1-url" className="text-[12px] font-medium text-[#64748b]">
                      Website URL<span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="trial-comp-1-url"
                      type="text"
                      inputMode="url"
                      autoComplete="url"
                      value={competitor1Url}
                      onChange={(e) => setCompetitor1Url(e.target.value)}
                      placeholder="https://"
                      className="h-10 border-[#e5e7eb] bg-white text-[13px] placeholder:text-[#9ca3af]"
                      aria-invalid={error === ERR_C1_URL_EMPTY || error === ERR_C1_URL_BAD}
                      aria-describedby={error ? 'trial-comp-error' : undefined}
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-[#f1f5f9] bg-[#fafbfc] p-3">
                  <p className="text-[13px] font-medium text-[#374151]">
                    Competitor 2 <span className="font-normal text-[#9ca3af]">(optional)</span>
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="trial-comp-2" className="text-[12px] font-medium text-[#64748b]">
                      Property name
                    </Label>
                    <Input
                      id="trial-comp-2"
                      value={competitor2}
                      onChange={(e) => setCompetitor2(e.target.value)}
                      placeholder="Enter competitor property name"
                      className="h-10 border-[#e5e7eb] bg-white text-[13px] placeholder:text-[#9ca3af]"
                      aria-invalid={error === ERR_C2_PAIR || error === ERR_C2_URL_BAD}
                      aria-describedby={error ? 'trial-comp-error' : undefined}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="trial-comp-2-url" className="text-[12px] font-medium text-[#64748b]">
                      Website URL
                    </Label>
                    <Input
                      id="trial-comp-2-url"
                      type="text"
                      inputMode="url"
                      autoComplete="url"
                      value={competitor2Url}
                      onChange={(e) => setCompetitor2Url(e.target.value)}
                      placeholder="https://"
                      className="h-10 border-[#e5e7eb] bg-white text-[13px] placeholder:text-[#9ca3af]"
                      aria-invalid={error === ERR_C2_PAIR || error === ERR_C2_URL_BAD}
                      aria-describedby={error ? 'trial-comp-error' : undefined}
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-[#f1f5f9] bg-[#fafbfc] p-3">
                  <p className="text-[13px] font-medium text-[#374151]">
                    Competitor 3 <span className="font-normal text-[#9ca3af]">(optional)</span>
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="trial-comp-3" className="text-[12px] font-medium text-[#64748b]">
                      Property name
                    </Label>
                    <Input
                      id="trial-comp-3"
                      value={competitor3}
                      onChange={(e) => setCompetitor3(e.target.value)}
                      placeholder="Enter competitor property name"
                      className="h-10 border-[#e5e7eb] bg-white text-[13px] placeholder:text-[#9ca3af]"
                      aria-invalid={error === ERR_C3_PAIR || error === ERR_C3_URL_BAD}
                      aria-describedby={error ? 'trial-comp-error' : undefined}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="trial-comp-3-url" className="text-[12px] font-medium text-[#64748b]">
                      Website URL
                    </Label>
                    <Input
                      id="trial-comp-3-url"
                      type="text"
                      inputMode="url"
                      autoComplete="url"
                      value={competitor3Url}
                      onChange={(e) => setCompetitor3Url(e.target.value)}
                      placeholder="https://"
                      className="h-10 border-[#e5e7eb] bg-white text-[13px] placeholder:text-[#9ca3af]"
                      aria-invalid={error === ERR_C3_PAIR || error === ERR_C3_URL_BAD}
                      aria-describedby={error ? 'trial-comp-error' : undefined}
                    />
                  </div>
                </div>

                {error ? (
                  <p id="trial-comp-error" className="text-[12px] font-medium text-red-600">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 space-y-3 border-t border-[#eceff3] bg-white px-6 pb-5 pt-4">
              <Button
                type="submit"
                className="h-11 w-full rounded-lg bg-[#2563eb] text-[15px] font-semibold text-white shadow-md hover:bg-[#1d4ed8]"
              >
                Request 30-day free trial
              </Button>
              <p className="text-center text-[11px] leading-snug text-[#9ca3af]">
                You can add/modify competitors later anytime from the Navigator portal.
              </p>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={thanksOpen}
        onOpenChange={(next) => {
          setThanksOpen(next);
        }}
      >
        <DialogContent
          hideClose
          onPointerDownOutside={() => setThanksOpen(false)}
          onEscapeKeyDown={() => setThanksOpen(false)}
          className="max-w-[min(400px,calc(100%-2rem))] gap-0 border border-emerald-100/80 bg-white p-0 shadow-2xl sm:max-w-md"
          aria-describedby="trial-thanks-desc"
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
                Request received
              </DialogTitle>
              <DialogDescription id="trial-thanks-desc" className="text-[15px] leading-relaxed text-slate-600">
                Our team will contact you shortly to set up your 30-day trial and enable competitor insights.
              </DialogDescription>
            </DialogHeader>
            <p className="mt-4 text-xs text-slate-400">This window will close in a few seconds.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
