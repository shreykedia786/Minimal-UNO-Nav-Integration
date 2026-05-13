import { ArrowUpRight, BarChart3, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Info, Sparkles, X } from 'lucide-react';
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from 'react';
import { createPortal } from 'react-dom';
import { LegendIconMax, LegendIconMin, LegendIconMyRate } from './CompetitorChartLegendIcons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { cn } from './ui/utils';
import { PARITY_COLUMN_TINT, PARITY_PALETTE, PARITY_SEGMENT_PERCENT_CLASS } from '@/app/lib/parityPalette';
import { navigatorOutsideCoverageTooltipBody } from '@/app/lib/navigatorDateCoverage';
import { isNavigatorScrapeFailed } from '@/app/lib/navigatorScrapeStatus';
import { RateBreakdownTooltipBody } from './RateBreakdownTooltipBody';

const DEFAULT_INCLUSION_PLAN_NAMES = [
  'Advance Purchase (Non-Refundable)',
  'Best Available Rate (BAR)',
  'Member Exclusive Rate',
  'Bed & Breakfast Package'
];

function strHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Default: every compset included (“All” in the picker). */
function initialCompsetSelection(count: number): boolean[] {
  return Array.from({ length: count }, () => true);
}

function formatInsightDate(d: { day: string; date: string; month: string }) {
  return `${d.day}, ${d.date} ${d.month}`;
}

/** In-table date window controls — keeps chevrons aligned to first/last date columns at any width. */
function DateColumnNavButton({
  direction,
  onClick,
  disabled,
  label,
  className
}: {
  direction: 'prev' | 'next';
  onClick: () => void;
  disabled: boolean;
  label: string;
  /** Extra classes on the button (e.g. absolute positioning in parity header). */
  className?: string;
}) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'shrink-0 w-7 h-10 flex items-center justify-center bg-white border border-[#e0e0e0] hover:bg-gray-50 transition-colors',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <Icon className="w-4 h-4 text-[#999999]" />
    </button>
  );
}

function getScrollableAncestors(el: HTMLElement | null): HTMLElement[] {
  const out: HTMLElement[] = [];
  let p: HTMLElement | null = el?.parentElement ?? null;
  while (p) {
    const st = getComputedStyle(p);
    if (/(auto|scroll|overlay)/.test(st.overflowY) || /(auto|scroll|overlay)/.test(st.overflowX)) {
      out.push(p);
    }
    p = p.parentElement;
  }
  return out;
}

const INSIGHT_TOOLTIP_Z = 100600;

/**
 * Fixed + portaled tooltip so drawer `overflow` does not clip it.
 * Arrow is offset so its tip stays over the hovered column when the card is edge-clamped.
 */
function InsightHoverTooltip({
  title,
  dateLabel,
  body,
  disabled,
  triggerClassName,
  children,
  panelWidth = 260,
  estimatedHeight = 230,
  visual = 'default',
  headerEnd
}: {
  title: string;
  dateLabel: string;
  body: ReactNode;
  disabled?: boolean;
  triggerClassName?: string;
  children: ReactNode;
  /** Tooltip width in px — used for viewport clamping and positioning. */
  panelWidth?: number;
  /** Estimated tooltip height — improves flip above/below when content is tall. */
  estimatedHeight?: number;
  /** Elevated = softer shadow, larger radius (parity / premium tooltips). */
  visual?: 'default' | 'elevated';
  /** Optional right column in the header (e.g. parity rate violation + label). */
  headerEnd?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    centerX: number;
    top: number;
    anchorCx: number;
    placement: 'above' | 'below';
  } | null>(null);

  const recalc = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const anchorCx = r.left + r.width / 2;
    const tooltipW = panelWidth;
    const margin = 10;
    const centerX = Math.min(
      window.innerWidth - tooltipW / 2 - margin,
      Math.max(tooltipW / 2 + margin, anchorCx)
    );
    const gap = 8;
    const estH = estimatedHeight;
    const spaceAbove = r.top;
    const spaceBelow = window.innerHeight - r.bottom;
    const preferAbove = spaceAbove >= estH + margin || spaceAbove >= spaceBelow;
    const placement: 'above' | 'below' = preferAbove ? 'above' : 'below';
    const top = placement === 'above' ? r.top - gap : r.bottom + gap;
    setPos({ centerX, top, anchorCx, placement });
  }, [panelWidth, estimatedHeight]);

  useLayoutEffect(() => {
    if (!open || disabled) {
      setPos(null);
      return;
    }
    recalc();
    const el = anchorRef.current;
    const scrollHosts = el ? getScrollableAncestors(el) : [];
    const onMove = () => recalc();
    scrollHosts.forEach((n) => n.addEventListener('scroll', onMove, { passive: true }));
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      scrollHosts.forEach((n) => n.removeEventListener('scroll', onMove));
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, disabled, recalc]);

  const arrowShift = pos ? pos.anchorCx - pos.centerX : 0;

  return (
    <>
      <div
        ref={anchorRef}
        className={
          triggerClassName ??
          'relative flex min-h-[1.25rem] w-full min-w-0 items-center justify-center py-0.5'
        }
        onMouseEnter={() => !disabled && setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {children}
      </div>
      {open &&
        !disabled &&
        pos &&
        createPortal(
          <div
            className="pointer-events-none fixed max-w-[calc(100vw-16px)]"
            style={{
              zIndex: INSIGHT_TOOLTIP_Z,
              left: pos.centerX,
              top: pos.top,
              width: panelWidth,
              transform: pos.placement === 'above' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)'
            }}
          >
            <div
              className={cn(
                'relative text-left',
                visual === 'elevated'
                  ? 'rounded-2xl border border-slate-200/80 bg-white px-3.5 py-3 shadow-[0_20px_50px_-16px_rgba(15,23,42,0.28)] ring-1 ring-slate-950/[0.04]'
                  : 'rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-xl'
              )}
            >
              {pos.placement === 'below' && (
                <>
                  <div
                    className="absolute z-10 h-0 w-0"
                    style={{
                      left: `calc(50% + ${arrowShift}px)`,
                      top: 0,
                      transform: 'translate(-50%, -100%)',
                      borderLeft: '7px solid transparent',
                      borderRight: '7px solid transparent',
                      borderBottom: visual === 'elevated' ? '8px solid rgb(226 232 240 / 0.85)' : '8px solid #e5e7eb'
                    }}
                    aria-hidden
                  />
                  <div
                    className="absolute z-10 h-0 w-0"
                    style={{
                      left: `calc(50% + ${arrowShift}px)`,
                      top: 1,
                      transform: 'translate(-50%, -100%)',
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderBottom: '7px solid white'
                    }}
                    aria-hidden
                  />
                </>
              )}
              {headerEnd ? (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 pr-1">
                    <div
                      className={cn(
                        'font-semibold leading-tight',
                        visual === 'elevated'
                          ? 'text-[12px] tracking-tight text-slate-900'
                          : 'text-[11px] text-[#333333]'
                      )}
                    >
                      {title}
                    </div>
                    {dateLabel ? (
                      <div
                        className={cn(
                          'mt-0.5 leading-snug',
                          visual === 'elevated'
                            ? 'text-[11px] font-medium text-slate-500'
                            : 'text-[10px] text-gray-500'
                        )}
                      >
                        {dateLabel}
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0 pt-px">{headerEnd}</div>
                </div>
              ) : (
                <>
                  <div
                    className={cn(
                      'font-semibold leading-tight',
                      visual === 'elevated'
                        ? 'text-[12px] tracking-tight text-slate-900'
                        : 'text-[11px] text-[#333333]'
                    )}
                  >
                    {title}
                  </div>
                  {dateLabel ? (
                    <div
                      className={cn(
                        'leading-snug',
                        visual === 'elevated'
                          ? 'mt-0.5 text-[11px] font-medium text-slate-500'
                          : 'mt-0.5 text-[10px] text-gray-500'
                      )}
                    >
                      {dateLabel}
                    </div>
                  ) : null}
                </>
              )}
              {visual === 'elevated' ? (
                <div
                  className="mt-2.5 h-px w-full bg-gradient-to-r from-transparent via-slate-200/90 to-transparent"
                  aria-hidden
                />
              ) : null}
              {body}
              {pos.placement === 'above' && (
                <>
                  <div
                    className="absolute z-10 h-0 w-0"
                    style={{
                      left: `calc(50% + ${arrowShift}px)`,
                      bottom: 0,
                      transform: 'translate(-50%, calc(100% - 1px))',
                      borderLeft: '7px solid transparent',
                      borderRight: '7px solid transparent',
                      borderTop: visual === 'elevated' ? '8px solid rgb(226 232 240 / 0.85)' : '8px solid #e5e7eb'
                    }}
                    aria-hidden
                  />
                  <div
                    className="absolute z-10 h-0 w-0"
                    style={{
                      left: `calc(50% + ${arrowShift}px)`,
                      bottom: 1,
                      transform: 'translate(-50%, 100%)',
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: '7px solid white'
                    }}
                    aria-hidden
                  />
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

/** Explains em dashes when a column is past Navigator’s 365-day window — same chrome as other drawer tooltips. */
function NavigatorOutsideCoverageTooltip({
  title,
  dateLabel,
  children,
  triggerClassName
}: {
  title: string;
  dateLabel: string;
  children: ReactNode;
  triggerClassName?: string;
}) {
  return (
    <InsightHoverTooltip
      title={title}
      dateLabel={dateLabel}
      visual="elevated"
      panelWidth={300}
      estimatedHeight={175}
      triggerClassName={
        triggerClassName ??
        'relative flex min-h-[1.25rem] w-full min-w-0 items-center justify-center py-0.5'
      }
      body={
        <p className="m-0 whitespace-pre-line text-[11px] leading-snug text-slate-600">
          {navigatorOutsideCoverageTooltipBody()}
        </p>
      }
    >
      {children}
    </InsightHoverTooltip>
  );
}

function parityPillPercent(
  myRate: number,
  channelRate: number,
  status: 'Win' | 'Meet' | 'Loss'
): number {
  if (myRate <= 0 || channelRate <= 0) return 0;
  if (status === 'Loss') return Math.min(999, Math.round(((myRate - channelRate) / channelRate) * 100));
  if (status === 'Win') return Math.min(999, Math.round(((channelRate - myRate) / channelRate) * 100));
  return Math.min(999, Math.round((Math.abs(channelRate - myRate) / myRate) * 100));
}

function ParityRateViolationBadgeIcon({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 12 : 14;
  return (
    <svg width={dim} height={dim} viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden>
      <circle cx="8" cy="8" r="7" stroke="#dc2626" strokeWidth="1.5" fill="none" />
      <text x="8" y="11" textAnchor="middle" fontSize="10" fontWeight="600" fill="#dc2626">
        R
      </text>
    </svg>
  );
}

/** Header chip — flat surface, no gradients (reads cleaner at small sizes). */
function ParityTooltipHeaderRateViolation() {
  return (
    <div
      role="status"
      aria-label="Rate violation"
      title="Channel rate diverges from your benchmark beyond tolerance."
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-rose-200/90 bg-rose-50 py-1 pl-1 pr-2.5 shadow-sm"
    >
      <span
        className="flex size-[15px] shrink-0 items-center justify-center rounded-full bg-rose-600 text-[8px] font-bold leading-none text-white"
        aria-hidden
      >
        R
      </span>
      <span className="text-[11px] font-semibold leading-none tracking-tight text-rose-900">Rate violation</span>
    </div>
  );
}

function ParityAvailabilityViolationBadgeIcon({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 12 : 14;
  return (
    <svg width={dim} height={dim} viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden>
      <circle cx="8" cy="8" r="7" stroke="#dc2626" strokeWidth="1.5" fill="none" />
      <text x="8" y="11" textAnchor="middle" fontSize="10" fontWeight="600" fill="#dc2626">
        A
      </text>
    </svg>
  );
}

/** Parity tooltip header — direct sold out while an OTA still lists rooms (same chrome as rate violation, red). */
function ParityTooltipHeaderAvailabilityViolation() {
  return (
    <div
      role="status"
      aria-label="Availability violation"
      title="Direct channel shows no availability, but at least one OTA still sells this room."
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-rose-200/90 bg-rose-50 py-1 pl-1 pr-2.5 shadow-sm"
    >
      <span
        className="flex size-[15px] shrink-0 items-center justify-center rounded-full bg-rose-600 text-[8px] font-bold leading-none text-white"
        aria-hidden
      >
        A
      </span>
      <span className="text-[11px] font-semibold leading-none tracking-tight text-rose-900">
        Availability violation
      </span>
    </div>
  );
}

/** Parity OTA tooltip: one label tier + one body tier so copy stays visually consistent. */
export const PARITY_OTA_TT_LABEL = 'text-[10px] font-semibold uppercase tracking-wide text-slate-500';
export const PARITY_OTA_TT_META = 'text-[10px] font-medium text-slate-500';
export const PARITY_OTA_TT_BODY = 'text-[11px] font-medium leading-snug text-slate-800';

/** Left “Your rate” tile — shared by OTA parity tooltips and Parity tab Your Rates hover. */
function ParityTooltipYourRateColumn({
  myRate,
  currencySymbol,
  yourPlan,
  showPlans,
  soldOut
}: {
  myRate: number;
  currencySymbol: string;
  yourPlan: string;
  showPlans: boolean;
  /** No published rate / direct unavailable — same treatment as availability-violation OTA tooltip. */
  soldOut: boolean;
}) {
  return (
    <div className="rounded-xl bg-gradient-to-b from-slate-50 to-white p-2.5 shadow-sm ring-1 ring-slate-200/70">
      <div className={PARITY_OTA_TT_LABEL}>Your rate</div>
      <div className="mt-0.5 text-[17px] font-semibold tabular-nums tracking-tight text-slate-900">
        {soldOut ? (
          <span className="text-[16px] font-semibold tracking-tight text-slate-500">Sold out</span>
        ) : (
          <>
            {currencySymbol}
            {myRate}
          </>
        )}
      </div>
      <div className={cn(PARITY_OTA_TT_META, 'mt-0.5')}>Brand.com</div>
      {showPlans ? (
        <div className="mt-1.5 border-t border-slate-200/70 pt-1.5">
          <div className={PARITY_OTA_TT_LABEL}>Inclusion</div>
          <p className={cn('m-0 mt-0.5 line-clamp-2', PARITY_OTA_TT_BODY)}>{yourPlan}</p>
        </div>
      ) : null}
    </div>
  );
}

/** Right “Channel” tile — parity OTA tooltips and Competitor tab compset cell hovers. */
function ParityTooltipChannelRateColumn({
  channelRate,
  currencySymbol,
  channelSiteLabel,
  channelPlan,
  showPlans
}: {
  channelRate: number;
  currencySymbol: string;
  channelSiteLabel: string;
  channelPlan: string;
  showPlans: boolean;
}) {
  return (
    <div className="rounded-xl bg-gradient-to-b from-slate-50 to-white p-2.5 shadow-sm ring-1 ring-slate-200/70">
      <div className={PARITY_OTA_TT_LABEL}>Channel</div>
      <div className="mt-0.5 text-[17px] font-semibold tabular-nums tracking-tight text-slate-900">
        {currencySymbol}
        {channelRate}
      </div>
      <div className={cn(PARITY_OTA_TT_META, 'mt-0.5 line-clamp-1')}>{channelSiteLabel}</div>
      {showPlans ? (
        <div className="mt-1.5 border-t border-slate-200/70 pt-1.5">
          <div className={PARITY_OTA_TT_LABEL}>Inclusion</div>
          <p className={cn('m-0 mt-0.5 line-clamp-2', PARITY_OTA_TT_BODY)}>{channelPlan}</p>
        </div>
      ) : null}
    </div>
  );
}

/** Parity tab OTA cell — two-column rates + outcome strip (rate violation lives in tooltip header). */
function ParityTooltipModernBody({
  myRate,
  channelRate,
  channelSiteLabel,
  yourPlan,
  channelPlan,
  showPlans,
  status,
  gapPct,
  isLoss,
  lossAmount,
  isWin,
  winAmount,
  currencySymbol,
  availabilityViolation = false
}: {
  myRate: number;
  channelRate: number;
  /** Shown under channel price (same role as Brand.com under your rate). */
  channelSiteLabel: string;
  yourPlan: string;
  channelPlan: string;
  showPlans: boolean;
  status: 'Win' | 'Meet' | 'Loss';
  gapPct: number;
  isLoss: boolean;
  lossAmount: number;
  isWin: boolean;
  /** Channel rate − your rate when Win (favourable spread). */
  winAmount: number;
  currencySymbol: string;
  /** Direct sold out while channel still lists a rate — only the “Your rate” tile shows Sold out; Loss strip matches rate violation layout. */
  availabilityViolation?: boolean;
}) {
  const statusChip =
    status === 'Loss'
      ? 'bg-[#FEE2E2] text-[#991B1B] ring-1 ring-[#E52E2E]/35'
      : status === 'Win'
        ? 'bg-[#DCFCE7] text-[#14532D] ring-1 ring-[#4BCE64]/40'
        : 'bg-[#FEF9C3] text-[#713F12] ring-1 ring-[#FFC51E]/55';

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <ParityTooltipYourRateColumn
          myRate={myRate}
          currencySymbol={currencySymbol}
          yourPlan={yourPlan}
          showPlans={showPlans}
          soldOut={availabilityViolation}
        />
        <ParityTooltipChannelRateColumn
          channelRate={channelRate}
          currencySymbol={currencySymbol}
          channelSiteLabel={channelSiteLabel}
          channelPlan={channelPlan}
          showPlans={showPlans}
        />
      </div>

      <div
        className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200/70"
        role="status"
      >
        <span className={cn('rounded-lg px-2.5 py-1 text-[11px] font-semibold', statusChip)}>{status}</span>
        {!availabilityViolation ? (
          <span className="text-[11px] font-medium text-slate-600">
            Gap <span className="tabular-nums font-semibold text-slate-900">{gapPct}%</span>
          </span>
        ) : null}
        {isLoss ? (
          <span className="ml-auto text-[11px] font-semibold tabular-nums text-rose-600">
            {currencySymbol}
            {lossAmount}
          </span>
        ) : null}
        {isWin && winAmount > 0 ? (
          <span className="ml-auto text-[11px] font-semibold tabular-nums text-emerald-900">
            {currencySymbol}
            {winAmount}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Same as main chart panel (`RateCandlestickChart` onboarding blue on logo). */
const NAVIGATOR_LOGO_BRAND_FILTER =
  'brightness(0) saturate(100%) invert(29%) sepia(90%) saturate(6194%) hue-rotate(225deg) brightness(98%) contrast(101%)';

/**
 * Inline metadata chip surfacing the two pieces of data context (methodology +
 * source) as a single glanceable pill. Hovering / focusing the chip reveals a
 * popover with the detailed methodology note and the UNO-vs-Navigator caveat —
 * progressive disclosure so the header stays calm but the rationale is always
 * one beat away. Pattern is modelled on metadata pills in Linear / Stripe.
 */
function RateDataContextChip({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex ${className ?? ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label="About this data — methodology and source"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-[5px] text-[11px] font-medium leading-none text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden />
        <span>Lowest rate plan</span>
        <span className="text-slate-300" aria-hidden>·</span>
        <span className="text-slate-500">via</span>
        <span className="font-semibold text-slate-700">Navigator</span>
        <Info
          className="ml-0.5 h-3 w-3 text-slate-400 transition-colors group-hover:text-slate-600"
          strokeWidth={2.25}
          aria-hidden
        />
      </button>

      {/* Popover — outer wrapper holds the hover bridge so the mouse can move
          between trigger and popover without closing it. */}
      <div
        className={`absolute left-0 top-full z-50 pt-2 transition-all duration-150 ${
          open
            ? 'pointer-events-auto opacity-100 translate-y-0'
            : 'pointer-events-none -translate-y-1 opacity-0'
        }`}
        role="tooltip"
      >
        <div className="w-[18rem] max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white p-3 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18),0_2px_6px_-2px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden />
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              About this data
            </p>
          </div>
          <dl className="m-0 space-y-2 pt-2">
            <div>
              <dt className="m-0 text-[12px] font-semibold text-slate-800">Lowest rate plan</dt>
              <dd className="m-0 mt-0.5 text-[11px] leading-relaxed text-slate-600">
                All prices — yours and your competitors' — reflect the lowest publicly available rate plan for each day.
              </dd>
            </div>
            <div>
              <dt className="m-0 text-[12px] font-semibold text-slate-800">Data sourced from Navigator</dt>
              <dd className="m-0 mt-0.5 text-[11px] leading-relaxed text-slate-600">
                Your Rates shown here may differ from UNO (ARI), as they are independently sourced by Navigator.
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

/**
 * Feature list shown inside the Navigator upsell info popover. Kept short and
 * verb-led so the popover stays scannable. Mirrors the value cards in the
 * onboarding "Access Navigator" step but adapted to the drawer context.
 */
const NAVIGATOR_UPSELL_BENEFITS: readonly string[] = [
  'Track rate trends across your compset',
  'View demand forecasts for upcoming dates',
  'Monitor OTA rankings and visibility',
  'Catch parity issues across channels'
];

/**
 * Right-hand upsell cluster in the drawer's room-title row. Two affordances:
 *  1. Subtle info icon → on hover/focus reveals a popover listing what else
 *     the full Navigator app offers beyond this drawer's compset view.
 *  2. Branded "Open in Navigator" CTA → primary action that hands the user
 *     off to the full Navigator app for deeper analysis.
 *
 * The pair pattern keeps the chrome calm (info button is neutral) while still
 * surfacing a clear primary action (the branded blue button).
 */
function NavigatorUpsellCTA({
  onOpenNavigator
}: {
  /** Hook for parent to wire navigation (UNO menu open, deep link, etc). Optional during demo / preview. */
  onOpenNavigator?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const handleOpenNavigator = () => {
    if (onOpenNavigator) {
      onOpenNavigator();
      return;
    }
    // Demo fallback — keeps the click visible without throwing if no handler is wired yet.
    // eslint-disable-next-line no-console
    console.info('[NavigatorUpsell] Open Navigator clicked');
  };

  return (
    <div className="ml-auto flex shrink-0 items-center gap-1.5">
      {/* Info trigger + benefits popover */}
      <div
        className="relative inline-flex"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.stopPropagation();
            setOpen(false);
          }
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          aria-label="Want more insights? See what else Navigator offers"
          aria-expanded={open}
          aria-haspopup="dialog"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[#2753eb]/40"
        >
          <Info className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
          <span>Want more insights?</span>
        </button>

        {/* Popover: hover bridge (pt-2) keeps mouse travel from chip → card from closing it */}
        <div
          className={`absolute right-0 top-full z-50 pt-2 transition-all duration-150 ${
            open
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none -translate-y-1 opacity-0'
          }`}
          role="tooltip"
        >
          <div className="w-[19rem] max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white p-3 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18),0_2px_6px_-2px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Sparkles className="h-3.5 w-3.5 text-[#2753eb]" strokeWidth={2.25} aria-hidden />
              <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                With Navigator, you can:
              </p>
            </div>
            <ul className="m-0 list-none space-y-1.5 p-0 pt-2">
              {NAVIGATOR_UPSELL_BENEFITS.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-start gap-2 text-[12px] leading-relaxed text-slate-700"
                >
                  <Check
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Primary CTA — "Go to" framing (rather than "Open in") so it reads
          as a directional action: this drawer is a window into Navigator;
          clicking takes you to the full Navigator app. */}
      <button
        type="button"
        onClick={handleOpenNavigator}
        className="inline-flex items-center gap-1 rounded-md bg-[#2753eb] px-2.5 py-[7px] text-[11.5px] font-semibold text-white shadow-[0_2px_8px_-2px_rgba(39,83,235,0.45)] transition-all hover:bg-[#1d3fb8] hover:shadow-[0_4px_12px_-2px_rgba(39,83,235,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2753eb]/40 focus-visible:ring-offset-1"
      >
        Go to Navigator
        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}

/** Parity “Your Rates” sticky column — compact glass pill, top-right. */
function ParityBenchmarkChip() {
  return (
    <span
      className="absolute right-2 top-2 z-[1] inline-flex items-center gap-1 rounded-full border border-white/90 bg-gradient-to-br from-white via-white to-sky-50/70 py-1 pl-1.5 pr-2 shadow-[0_2px_12px_rgba(14,116,194,0.14),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-sky-500/20 backdrop-blur-sm"
      role="note"
      title="Your published rates are the benchmark for parity comparison across channels."
    >
      <span
        className="size-1.5 shrink-0 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 shadow-[0_0_10px_rgba(56,189,248,0.55)]"
        aria-hidden
      />
      <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-600">
        Benchmark
      </span>
      <span className="sr-only">: your rates are the reference for parity comparison.</span>
    </span>
  );
}

/** Parity tab only — Win/Meet/Loss and violation glyphs; lives in drawer footer next to Navigator branding. */
function ParityStatusLegendFooter({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex min-w-0 max-w-full flex-wrap items-center justify-end gap-x-4 gap-y-1.5 sm:gap-x-5',
        className
      )}
      aria-label="Parity legend"
    >
      <div className="flex items-center gap-1.5">
        <div
          className="h-3 w-4 shrink-0 rounded-sm"
          style={{ backgroundColor: PARITY_PALETTE.meet }}
        />
        <span className="text-[10px] text-[#666666] sm:text-[11px]">Meet</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div
          className="h-3 w-4 shrink-0 rounded-sm"
          style={{ backgroundColor: PARITY_PALETTE.win }}
        />
        <span className="text-[10px] text-[#666666] sm:text-[11px]">Win</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div
          className="h-3 w-4 shrink-0 rounded-sm"
          style={{ backgroundColor: PARITY_PALETTE.loss }}
        />
        <span className="text-[10px] text-[#666666] sm:text-[11px]">Loss</span>
      </div>
      <div className="flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 sm:h-4 sm:w-4">
          <circle cx="8" cy="8" r="7" stroke={PARITY_PALETTE.loss} strokeWidth="1.5" fill="none" />
          <text x="8" y="11" textAnchor="middle" fontSize="10" fontWeight="600" fill={PARITY_PALETTE.loss}>
            R
          </text>
        </svg>
        <span className="text-[10px] text-[#666666] sm:text-[11px]">Rate violation</span>
      </div>
      <div className="flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 sm:h-4 sm:w-4">
          <circle cx="8" cy="8" r="7" stroke="#dc2626" strokeWidth="1.5" fill="none" />
          <text x="8" y="11" textAnchor="middle" fontSize="10" fontWeight="600" fill="#dc2626">
            A
          </text>
        </svg>
        <span className="text-[10px] text-[#666666] sm:text-[11px]">Availability violation</span>
      </div>
    </div>
  );
}

/**
 * Per-competitor cell tooltip — used on every competitor × date cell in the drawer.
 *
 * Replaces the old Channel/Inclusion stack with a 3-row comparison so users can
 * instantly see how this competitor's price sits relative to (a) their own
 * rate and (b) the compset average. Methodology ("Lowest rate plan") is shown
 * as a small badge so users know what they're comparing without burying it in
 * a long footer.
 */
function CompetitorRateInsightCell({
  compRate,
  yourRate,
  avgCompsetRate,
  competitorName,
  dateLabel,
  currencySymbol,
  /** When true, null rate means outside Navigator window — show em dash (not “Sold Out”). */
  navigatorUnavailableForDate = false,
  /** When true, null rate means Navigator's scrape failed — show amber em dash. */
  scrapeFailedForDate = false,
  children
}: {
  compRate: number | null;
  yourRate: number;
  avgCompsetRate: number | null;
  competitorName: string;
  dateLabel: string;
  currencySymbol: string;
  navigatorUnavailableForDate?: boolean;
  scrapeFailedForDate?: boolean;
  children: ReactNode;
}) {
  if (compRate === null) {
    if (navigatorUnavailableForDate) {
      return (
        <NavigatorOutsideCoverageTooltip title={competitorName} dateLabel={dateLabel}>
          <span className="cursor-default text-[13px] font-normal text-slate-500">—</span>
        </NavigatorOutsideCoverageTooltip>
      );
    }
    if (scrapeFailedForDate) {
      // Rate isn't available for this date — render a calm "NA" placeholder
      // (matches the Your Rates / Avg compset rows) rather than calling out
      // the underlying scrape outcome.
      return (
        <span
          className="cursor-default text-[13px] font-normal text-slate-400"
          title="Rate not available for this date."
        >
          NA
        </span>
      );
    }
    return <span className="text-gray-400 text-[13px]">Sold Out</span>;
  }

  return (
    <InsightHoverTooltip
      title={competitorName}
      dateLabel={dateLabel}
      visual="elevated"
      panelWidth={280}
      estimatedHeight={200}
      triggerClassName="relative flex min-h-[1.5rem] w-full min-w-0 items-center justify-center py-0.5"
      body={
        <CompetitorCellComparisonBody
          competitorName={competitorName}
          competitorRate={compRate}
          yourRate={yourRate}
          avgCompsetRate={avgCompsetRate}
          currencySymbol={currencySymbol}
        />
      }
    >
      {children}
    </InsightHoverTooltip>
  );
}

/**
 * Three-row scannable comparison used inside the per-competitor cell tooltip.
 *
 * Order (This competitor → Avg compset → Your rate) leads with the subject of
 * the hover, follows with the market context, and lands on the user's own
 * rate as the closing reference. The "lowest rate plan" disclosure is a
 * deliberately quiet footnote — present enough to set expectations, soft
 * enough that the prices remain the visual hero.
 */
function CompetitorCellComparisonBody({
  competitorName,
  competitorRate,
  yourRate,
  avgCompsetRate,
  currencySymbol
}: {
  competitorName: string;
  competitorRate: number;
  yourRate: number;
  avgCompsetRate: number | null;
  currencySymbol: string;
}) {
  return (
    <div className="space-y-2">
      {/* Three equal-weight rate rows — identical row structure so prices
          stack into a clean column the eye can scan in one sweep. */}
      <div className="divide-y divide-slate-100">
        <CompetitorCellRateRow
          dotColor="bg-indigo-500"
          label={competitorName}
          value={`${currencySymbol}${competitorRate}`}
        />
        <CompetitorCellRateRow
          dotColor="bg-slate-400"
          label="Avg. compset rate"
          value={avgCompsetRate !== null ? `${currencySymbol}${avgCompsetRate}` : '—'}
        />
        <CompetitorCellRateRow
          dotColor="bg-sky-500"
          label="Your rate"
          value={`${currencySymbol}${yourRate}`}
        />
      </div>

      {/* Methodology footnote — kept intentionally subtle so users are aware
          that all three values are "lowest rate plan" without it competing
          with the prices for attention. */}
      <p className="m-0 flex items-center gap-1 border-t border-slate-100 pt-1.5 text-[10px] font-normal leading-none text-slate-400">
        <Info aria-hidden className="h-2.5 w-2.5 shrink-0" strokeWidth={2} />
        Showing lowest rate plan
      </p>
    </div>
  );
}

function CompetitorCellRateRow({
  dotColor,
  label,
  value
}: {
  dotColor: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotColor)} />
        <span className="truncate text-[11.5px] font-medium text-slate-700" title={label}>
          {label}
        </span>
      </div>
      <span className="text-[14px] font-bold leading-none tabular-nums tracking-tight text-slate-900">
        {value}
      </span>
    </div>
  );
}

/** Tooltip for the blue "Your Rates" row — competitor tab uses compact list; parity tab matches OTA elevated cards. */
function YourRatesRowTooltipCell({
  roomTitle,
  dateLabel,
  yourRate,
  soldOut,
  inclusionPlanName,
  currencySymbol,
  detailSlot,
  children,
  elevatedTooltip = false,
  showTooltipRatePlanNames = true,
  /** Outside Navigator coverage: your rate is not sourced — show dash, no rate tooltip. */
  navigatorNoData = false
}: {
  roomTitle: string;
  dateLabel: string;
  yourRate: number;
  soldOut: boolean;
  inclusionPlanName: string;
  currencySymbol: string;
  /** Optional extra block (e.g. summary) — styled like parity OTA footer strip when elevated. */
  detailSlot?: ReactNode;
  children: ReactNode;
  /** Parity + Competitor tabs: same elevated shell and “Your rate” card as parity channel tooltips. */
  elevatedTooltip?: boolean;
  /** When elevated: show inclusion block under rate (same rule as OTA tooltips). */
  showTooltipRatePlanNames?: boolean;
  navigatorNoData?: boolean;
}) {
  if (navigatorNoData) {
    return (
      <NavigatorOutsideCoverageTooltip
        title={roomTitle}
        dateLabel={dateLabel}
        triggerClassName="relative flex min-h-[1.75rem] w-full min-w-0 items-center justify-center py-0.5"
      >
        <span className="cursor-default font-normal tabular-nums text-slate-500">—</span>
      </NavigatorOutsideCoverageTooltip>
    );
  }

  if (elevatedTooltip) {
    return (
      <InsightHoverTooltip
        title={roomTitle}
        dateLabel={dateLabel}
        visual="elevated"
        panelWidth={300}
        estimatedHeight={detailSlot ? 240 : showTooltipRatePlanNames ? 200 : 150}
        triggerClassName="relative flex min-h-[1.75rem] w-full min-w-0 items-center justify-center py-0.5"
        body={
          <div className="space-y-2">
            <ParityTooltipYourRateColumn
              myRate={yourRate}
              currencySymbol={currencySymbol}
              yourPlan={inclusionPlanName}
              showPlans={showTooltipRatePlanNames}
              soldOut={soldOut}
            />
            {detailSlot ? (
              <div
                className="rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] leading-snug text-slate-600 ring-1 ring-slate-200/70"
                role="note"
              >
                {detailSlot}
              </div>
            ) : null}
          </div>
        }
      >
        {children}
      </InsightHoverTooltip>
    );
  }

  return (
    <InsightHoverTooltip
      title={roomTitle}
      dateLabel={dateLabel}
      triggerClassName="relative flex min-h-[1.75rem] w-full min-w-0 items-center justify-center py-0.5"
      body={
        <>
          <dl className="m-0 mt-1.5 space-y-1.5 border-t border-gray-100 pt-1.5 text-[10px] leading-snug text-gray-700">
            <div className="flex gap-3">
              <dt className="shrink-0 text-gray-500">Rate</dt>
              <dd className="min-w-0 flex-1 text-right font-medium tabular-nums text-[#333333]">
                {soldOut ? '—' : `${currencySymbol}${yourRate}`}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="shrink-0 text-gray-500">Inclusion</dt>
              <dd className="min-w-0 flex-1 text-right font-medium text-[#333333]">{inclusionPlanName}</dd>
            </div>
          </dl>
          {detailSlot ? (
            <div className="mt-2 border-t border-gray-100 pt-2 text-[10px] leading-snug text-gray-600">
              {detailSlot}
            </div>
          ) : null}
        </>
      }
    >
      {children}
    </InsightHoverTooltip>
  );
}

interface EventData {
  name: string;
  dateRange: string;
  importance: 'high' | 'medium' | 'low';
  demandLevel: string;
  demandIndex: number;
  demandMultiplier: string;
  confidenceScore: string;
}

/** Currency for all amounts in the drawer — use full `displayName` when the symbol is ambiguous (e.g. $). */
export type DetailedCompetitorRateCurrency = {
  /** ISO 4217, e.g. EUR, USD, AUD */
  code: string;
  /** Human-readable name, e.g. "US Dollars", "Australian Dollars", "Euro" */
  displayName: string;
  /** Prefix shown before numeric amounts, e.g. €, $, A$ */
  symbol: string;
};

export const DEFAULT_DETAILED_COMPETITOR_RATE_CURRENCY: DetailedCompetitorRateCurrency = {
  code: 'EUR',
  displayName: 'Euro',
  symbol: '€'
};

interface DetailedCompetitorModalProps {
  dates: Array<{ day: string; date: string; month: string }>;
  rates: number[];
  chartData: Array<{ rate: number; min: number; max: number; date: { day: string; date: string; month: string } }>;
  roomType?: string;
  /** Plan names listed in the Inclusion dropdown after "Any (Lowest Rateplan)". */
  inclusionPlanNames?: string[];
  ratePlan?: string;
  events?: Array<EventData | null>;
  /** Suite: editable Your Rates on Competitor tab only; Parity tab always shows read-only rates. */
  editableYourRates?: boolean;
  onYourRateChange?: (globalDateIndex: number, rawValue: string) => void;
  onClose: () => void;
  /** When omitted, defaults to Euro — pass explicit USD/AUD etc. so "$" is not ambiguous. */
  rateCurrency?: DetailedCompetitorRateCurrency;
  /** First global date index with no Navigator market data (`null` = entire range covered). */
  navigatorUnavailableFromIndex?: number | null;
}

/** Compset rows in the Competitor tab table — same list powers the Compsets dropdown. */
const competitors = [
  { name: 'Central Hotel', color: '#4caf50' },
  { name: 'Hotel Palermitano by DecO', color: '#2196F3' },
  { name: 'The Belgrove Hotel', color: '#9c27b0' },
  { name: 'Fairway Hotel', color: '#ff9800' },
  { name: 'Princess Hotel', color: '#f44336' },
  { name: 'Jesmond Dene Hotel', color: '#795548' },
  { name: 'Scandic Stavanger Airport', color: '#607d8b' },
  { name: 'Scandic Flesland Airport', color: '#009688' },
  { name: 'Oceanview Suites', color: '#e91e63' },
  { name: 'Harbor Grand Hotel', color: '#3f51b5' },
  { name: 'City Inn Express', color: '#9e9d24' },
  { name: 'Bayfront Plaza', color: '#00bcd4' },
  { name: 'Marina Bay Resort', color: '#ff5722' },
  { name: 'Old Town Boutique', color: '#673ab7' },
  { name: 'Airport Express Inn', color: '#8bc34a' },
  { name: 'Grand Plaza Suites', color: '#ffc107' }
];

/** Custom portal picker — Radix Popover/Dropdown conflict with the slide-over backdrop + overflow; fixed layer avoids that. */
const COMPSET_PICKER_Z_INDEX = 200000;

type CompsetRowDef = { name: string; color: string };

function CompsetPickerDropdown({
  competitors: compsetRows,
  compsetSelection,
  toggleCompset,
  selectedCompsetCount,
  selectAllCompsets,
  resetCompsetsToFirstOnly
}: {
  competitors: CompsetRowDef[];
  compsetSelection: boolean[];
  toggleCompset: (index: number) => void;
  selectedCompsetCount: number;
  selectAllCompsets: () => void;
  resetCompsetsToFirstOnly: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);

  const place = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 16);
    let left = r.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    setBox({ top: r.bottom + 6, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    place();
    const t = () => place();
    window.addEventListener('resize', t);
    window.addEventListener('scroll', t, true);
    return () => {
      window.removeEventListener('resize', t);
      window.removeEventListener('scroll', t, true);
    };
  }, [open, place]);

  useLayoutEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      const n = e.target as Node;
      if (wrapRef.current?.contains(n) || panelRef.current?.contains(n)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', down, true);
    return () => document.removeEventListener('mousedown', down, true);
  }, [open]);

  const total = compsetRows.length;
  const allSelected = total > 0 && selectedCompsetCount === total;
  const partialSelected = selectedCompsetCount > 0 && selectedCompsetCount < total;
  const allRowChecked: boolean | 'indeterminate' = allSelected
    ? true
    : partialSelected
      ? 'indeterminate'
      : false;

  return (
    <div ref={wrapRef} className="inline-flex w-[min(220px,42vw)] max-w-[260px] min-w-0">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 min-w-0 flex-1 justify-between gap-1 border-[#d0d0d0] bg-white px-2 text-[12px] font-semibold text-[#333333]"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <span className="min-w-0 truncate">
          {selectedCompsetCount === compsetRows.length
            ? 'All Competitors'
            : `${selectedCompsetCount} of ${compsetRows.length}`}
        </span>
        <ChevronDown className="size-4 shrink-0 opacity-50" />
      </Button>
      {open &&
        box &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            className="fixed max-h-[min(380px,65vh)] overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 shadow-xl"
            style={{
              zIndex: COMPSET_PICKER_Z_INDEX,
              top: box.top,
              left: box.left,
              width: box.width
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ul className="m-0 max-h-[min(300px,52vh)] list-none space-y-2 overflow-y-auto p-0 pr-0.5">
              <li className="flex items-start gap-2 border-b border-gray-100 pb-2">
                <Checkbox
                  id="compset-picker-all"
                  checked={allRowChecked}
                  onCheckedChange={(v) => {
                    if (v === true) selectAllCompsets();
                    else if (v === false) resetCompsetsToFirstOnly();
                  }}
                />
                <Label
                  htmlFor="compset-picker-all"
                  className="cursor-pointer text-left text-[12px] font-semibold leading-tight text-[#333333]"
                >
                  All Competitors
                </Label>
              </li>
              {compsetRows.map((c, idx) => {
                return (
                  <li key={c.name} className="flex items-start gap-2">
                    <Checkbox
                      id={`compset-picker-${idx}`}
                      checked={compsetSelection[idx]}
                      onCheckedChange={() => toggleCompset(idx)}
                    />
                    <Label
                      htmlFor={`compset-picker-${idx}`}
                      className="cursor-pointer text-left text-[12px] font-normal leading-tight text-[#333333]"
                    >
                      {c.name}
                    </Label>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}

/**
 * Choose `dateOffset` so the first visible window includes both days inside and outside Navigator coverage
 * (before and from `navigatorUnavailableFromIndex`), when the drawer opens on an extended UNO range demo.
 */
function initialDrawerOffsetStraddlingNavigatorLimit(
  totalDates: number,
  navigatorUnavailableFromIndex: number,
  datesToShow: number
): number {
  if (totalDates <= 0 || datesToShow <= 0 || datesToShow >= totalDates) return 0;
  const u = navigatorUnavailableFromIndex;
  if (u <= 0 || u >= totalDates) return 0;
  const minO = Math.max(0, u - datesToShow + 1);
  const maxO = Math.max(0, totalDates - datesToShow);
  return Math.min(Math.max(minO, 0), maxO);
}

export function DetailedCompetitorModal({
  dates,
  rates,
  chartData,
  roomType = 'Standard Room',
  inclusionPlanNames,
  ratePlan = 'Best Available Rate (BAR)',
  events,
  editableYourRates = false,
  onYourRateChange,
  onClose,
  rateCurrency: rateCurrencyProp,
  navigatorUnavailableFromIndex = null
}: DetailedCompetitorModalProps) {
  const rateCurrency = rateCurrencyProp ?? DEFAULT_DETAILED_COMPETITOR_RATE_CURRENCY;
  const currencySymbol = rateCurrency.symbol;

  const [dateOffset, setDateOffset] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [inclusionFilter, setInclusionFilter] = useState('any');
  const [channelFilter, setChannelFilter] = useState('any');
  const [compsetSelection, setCompsetSelection] = useState(() => initialCompsetSelection(competitors.length));
  /**
   * Deeper-analysis rows (avg compset rates + per-competitor table) are gated
   * behind an explicit CTA so the drawer's initial paint stays light. The
   * per-competitor table renders a CompetitorRateInsightCell + tooltip per cell
   * (≈ compsets × visible dates) which dominates the first-paint cost when
   * always-on. The avg row depends on the same data, so they reveal together.
   */
  const [showCompetitorRates, setShowCompetitorRates] = useState(false);

  const inclusionPlans = inclusionPlanNames?.length ? inclusionPlanNames : DEFAULT_INCLUSION_PLAN_NAMES;

  /** Tooltip: rate plan driving the subscriber value (specific plan, or simulated cheapest when filter is Any). */
  const resolveTooltipInclusionPlan = useCallback(
    (compIdx: number, globalDateIdx: number) => {
      if (inclusionFilter !== 'any') return inclusionFilter;
      if (inclusionPlans.length === 0) return DEFAULT_INCLUSION_PLAN_NAMES[0];
      const i = (compIdx * 19 + globalDateIdx * 13 + 7) % inclusionPlans.length;
      return inclusionPlans[i];
    },
    [inclusionFilter, inclusionPlans]
  );

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match animation duration
  };

  /** Number of dates visible in the competitor table at once. */
  const DATES_TO_SHOW = 10;

  useLayoutEffect(() => {
    if (navigatorUnavailableFromIndex == null) return;
    setDateOffset(
      initialDrawerOffsetStraddlingNavigatorLimit(dates.length, navigatorUnavailableFromIndex, DATES_TO_SHOW)
    );
  }, [navigatorUnavailableFromIndex, dates.length]);

  // Calculate visible data based on offset
  const visibleDates = dates.slice(dateOffset, dateOffset + DATES_TO_SHOW);
  const visibleRates = rates.slice(dateOffset, dateOffset + DATES_TO_SHOW);
  const visibleChartData = chartData.slice(dateOffset, dateOffset + DATES_TO_SHOW);
  /** Used so stacked header + compset tables share width and one horizontal scroll track. */
  const competitorTableMinWidthPx = 180 + 110 * visibleDates.length;

  // Navigation handlers
  const canGoPrevious = dateOffset > 0;
  const canGoNext = dateOffset + DATES_TO_SHOW < dates.length;
  
  const handlePrevious = () => {
    if (canGoPrevious) {
      setDateOffset(Math.max(0, dateOffset - DATES_TO_SHOW));
    }
  };
  
  const handleNext = () => {
    if (canGoNext) {
      setDateOffset(dateOffset + DATES_TO_SHOW);
    }
  };

  /**
   * Demo rates: default (Inclusion = Any (Lowest Rateplan), Channels = Any) biases toward the cheapest offers across compsets.
   * Specific inclusion/channel shifts rates for apple-to-apple comparison.
   */
  const getCompetitorRateForDate = useCallback(
    (competitorIndex: number, dateIndex: number, _myRate: number) => {
      if (navigatorUnavailableFromIndex != null && dateIndex >= navigatorUnavailableFromIndex) {
        return null;
      }
      // Navigator's scrape failed for this date — no rates to surface.
      // Downstream renderers distinguish "scrape failed" from "sold out" by
      // checking `isNavigatorScrapeFailed` again at the cell level so the
      // empty-state copy can be tailored.
      if (isNavigatorScrapeFailed(dateIndex)) {
        return null;
      }
      const seed = competitorIndex * 1000 + dateIndex;
      const dateData = chartData[dateIndex];
      if (!dateData) return null;

      if (seed % 29 === 0) return null;

      const minRate = dateData.min;
      const maxRate = dateData.max;
      const range = maxRate - minRate;
      const variance = (seed % 97) / 97;

      const channelKey = channelFilter;
      const broadView = inclusionFilter === 'any' && channelKey === 'any';
      const t = broadView ? variance * 0.42 : variance;
      let rate = Math.round(minRate + range * t);

      if (!broadView) {
        const incAdj = inclusionFilter !== 'any' ? (strHash(inclusionFilter) % 11) - 5 : 0;
        const chAdj = channelKey !== 'any' ? (strHash(channelKey) % 9) - 4 : 0;
        rate = Math.round(rate + incAdj + chAdj);
        rate = Math.min(maxRate + 25, Math.max(minRate - 25, rate));
      }

      return rate;
    },
    [chartData, inclusionFilter, channelFilter, navigatorUnavailableFromIndex]
  );

  const competitorRatesMatrix = useMemo(() => {
    const matrix: Array<Array<number | null>> = [];
    for (let dateIdx = 0; dateIdx < visibleRates.length; dateIdx++) {
      const row: Array<number | null> = [];
      for (let compIdx = 0; compIdx < competitors.length; compIdx++) {
        row.push(getCompetitorRateForDate(compIdx, dateOffset + dateIdx, visibleRates[dateIdx]));
      }
      matrix.push(row);
    }
    return matrix;
  }, [visibleRates, dateOffset, getCompetitorRateForDate, competitors.length]);

  /** Min/max for highlighting — among selected compsets only. */
  const actualMinMaxPerDate = useMemo(() => {
    return competitorRatesMatrix.map((row) => {
      let actualMin: number | null = null;
      let actualMax: number | null = null;
      for (let compIdx = 0; compIdx < row.length; compIdx++) {
        if (!compsetSelection[compIdx]) continue;
        const rate = row[compIdx];
        if (rate !== null) {
          if (actualMin === null || rate < actualMin) actualMin = rate;
          if (actualMax === null || rate > actualMax) actualMax = rate;
        }
      }
      return { min: actualMin, max: actualMax };
    });
  }, [competitorRatesMatrix, compsetSelection]);

  const avgCompsetPerDate = useMemo(() => {
    return competitorRatesMatrix.map((row) => {
      const vals = row.filter((r, i) => compsetSelection[i] && r !== null) as number[];
      if (vals.length === 0) return null;
      return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    });
  }, [competitorRatesMatrix, compsetSelection]);

  const selectedCompsetCount = useMemo(
    () => compsetSelection.filter(Boolean).length,
    [compsetSelection]
  );

  const toggleCompset = (index: number) => {
    setCompsetSelection((prev) => {
      const count = prev.filter(Boolean).length;
      const next = [...prev];
      if (next[index]) {
        if (count <= 1) return prev;
        next[index] = false;
        return next;
      }
      next[index] = true;
      return next;
    });
  };

  const selectAllCompsets = useCallback(() => {
    setCompsetSelection(Array.from({ length: competitors.length }, () => true));
  }, []);

  /** Master “All” unchecked from full selection — keep a single compset so the table stays valid. */
  const resetCompsetsToFirstOnly = useCallback(() => {
    setCompsetSelection((prev) => prev.map((_, i) => i === 0));
  }, []);

  // Check if date has events/holidays
  const hasEvent = (dateIndex: number) => {
    return dateIndex % 4 === 2; // Random events on some dates
  };

  // Use same Y-axis range as main chart
  const chartMin = 200;
  const chartMax = 500;
  const chartRange = chartMax - chartMin;

  // Match main grid chart: clamp to axis, map into inset band so strokes never bleed into "Your Rates"
  const valueToY = (value: number) => {
    if (chartRange === 0) return 50;
    const clamped = Math.min(chartMax, Math.max(chartMin, value));
    const raw = 100 - ((clamped - chartMin) / chartRange) * 100;
    return 6 + (raw / 100) * 88;
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex justify-end"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={handleClose}
    >
      <div
        className={`bg-white shadow-2xl w-full max-w-[1300px] h-full overflow-hidden flex flex-col ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white">
          {/* Close button - positioned absolutely */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-6 z-10 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Drawer header — single-view since Parity Analysis was retired.
              Currency indicator was moved down to the room-title row so it can
              sit beside the data-context chip as related metadata. */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 pt-4 pr-14">
            <h2 className="m-0 shrink-0 text-[14px] font-semibold leading-tight text-[#333333] pb-3 pt-3">
              Competitor Rate Analysis
            </h2>
          </div>

          {/* Room name + inline data-context chip + currency indicator + Navigator
              upsell CTA on the same row. Data-context chip and currency are
              grouped as related metadata (separated by a pipe rule); the upsell
              cluster pushes right via ml-auto inside NavigatorUpsellCTA. */}
          <div className="px-6 py-3 border-t border-gray-200">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
              <h2 className="m-0 min-w-0 text-[16px] font-semibold leading-tight text-[#333333]">
                {roomType}
              </h2>
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <RateDataContextChip />
                {/* Pipe rule — quiet visual separator between two related pieces of metadata. */}
                <span aria-hidden className="h-3.5 w-px shrink-0 bg-slate-300/80" />
                <p
                  className="m-0 text-[11px] leading-snug text-[#666666]"
                  title={`All rates in this view are in ${rateCurrency.displayName} (${rateCurrency.code}).`}
                >
                  <span className="sr-only">Currency: </span>
                  <span className="font-semibold text-[#333333]">{rateCurrency.displayName}</span>
                  <span className="tabular-nums"> ({rateCurrency.code})</span>
                  <span className="text-[#888888]"> · rates below</span>
                </p>
              </div>
              <NavigatorUpsellCTA />
            </div>
          </div>
        </div>

        {/* Content — date window prev/next live in first/last date header cells so layout is resolution-safe */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Competitor Rate Analysis: dates / your rates / chart / avg stay fixed; compset rows scroll vertically */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
                <div className="shrink-0 bg-white">
                  <table
                    className="w-full border-collapse"
                    style={{ tableLayout: 'fixed', minWidth: competitorTableMinWidthPx }}
                  >
                    <colgroup>
                      <col style={{ width: '180px' }} />
                      {visibleDates.map((_, idx) => (
                        <col key={idx} style={{ width: '110px' }} />
                      ))}
                    </colgroup>
                    {/* Date headers — no vertical scroll in this block */}
                    <thead>
                      <tr className="border-b border-[#e0e0e0]">
                        <th className="px-4 py-3 text-left border-r border-[#e0e0e0] bg-[#f5f5f5]">
                          {/* Empty cell for the first column */}
                        </th>
                        {visibleDates.map((date, idx) => {
                          const isFirst = idx === 0;
                          const isLast = idx === visibleDates.length - 1;
                          const g = dateOffset + idx;
                          const navOut =
                            navigatorUnavailableFromIndex != null && g >= navigatorUnavailableFromIndex;
                          return (
                            <th
                              key={idx}
                              title={
                                navOut
                                  ? 'No Navigator competitor data for this date — outside the 365-day coverage window.'
                                  : undefined
                              }
                              className={cn(
                                'px-3 py-2.5 border-r border-[#e0e0e0]',
                                navOut ? 'bg-slate-200/95' : 'bg-[#f5f5f5]'
                              )}
                            >
                              <div
                                className={cn(
                                  'flex items-center justify-center gap-1',
                                  (isFirst || isLast) && 'relative'
                                )}
                              >
                                {isFirst && (
                                  <DateColumnNavButton
                                    direction="prev"
                                    label="Show earlier dates"
                                    onClick={handlePrevious}
                                    disabled={!canGoPrevious}
                                    className="absolute left-[-9px] top-1/2 z-10 -translate-y-1/2"
                                  />
                                )}
                                <div className="min-w-0 text-center">
                                  <div className="text-[12px] font-semibold text-[#333333]">{date.day}</div>
                                  <div className="mt-0.5 flex items-center justify-center gap-1">
                                    <span className="text-[11px] text-gray-600">
                                      {date.date} {date.month}
                                    </span>
                                  </div>
                                </div>
                                {isLast && (
                                  <DateColumnNavButton
                                    direction="next"
                                    label="Show later dates"
                                    onClick={handleNext}
                                    disabled={!canGoNext}
                                    className="absolute right-[-2px] top-1/2 z-10 -translate-y-1/2"
                                  />
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody>
                      {/* Your Rates Row */}
                      <tr className="border-b border-[#e0e0e0] bg-[#e3f2fd]">
                        <td className="sticky left-0 z-10 border-r border-[#e0e0e0] bg-[#e3f2fd] px-4 py-3 text-[13px] font-bold text-[#333333]">
                          Your Rates
                        </td>
                {visibleRates.map((rate, idx) => {
                  const globalIdx = dateOffset + idx;
                  const soldOut = rate === 0 || !rate;
                  const navOut =
                    navigatorUnavailableFromIndex != null && globalIdx >= navigatorUnavailableFromIndex;
                  // Navigator-sourced "Your Rate" is also affected when the
                  // scrape returned no data; render as a calm "NA" instead of
                  // calling out the system limitation.
                  const scrapeFailedHere = !navOut && isNavigatorScrapeFailed(globalIdx);

                  return (
                    <td
                      key={idx}
                      className={cn(
                        'px-3 py-2 text-center text-[13px] font-semibold border-r border-[#e0e0e0]',
                        navOut && 'bg-slate-50/90'
                      )}
                    >
                      {navOut ? (
                        <span className="cursor-default text-[13px] font-normal text-slate-500">
                          —
                        </span>
                      ) : scrapeFailedHere ? (
                        <span className="cursor-default text-[13px] font-normal text-slate-400">
                          NA
                        </span>
                      ) : editableYourRates && onYourRateChange ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          aria-label={`Your rate ${visibleDates[idx]?.day} ${visibleDates[idx]?.date} ${visibleDates[idx]?.month}`}
                          value={rate === 0 ? '' : String(rate)}
                          onChange={(e) => onYourRateChange(globalIdx, e.target.value)}
                          className="mx-auto block w-[3.25rem] h-7 text-center text-[11px] border border-[#d0d0d0] rounded-full bg-white tabular-nums font-semibold text-[#333333]"
                        />
                      ) : soldOut ? (
                        <span className="text-gray-400 font-normal">Sold Out</span>
                      ) : (
                        <span className="text-[#333333]">
                          {currencySymbol}
                          {rate}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>

                      {/* Chart row with legend */}
                      <tr className="border-b border-[#e0e0e0]">
                        <td className="sticky left-0 z-10 border-r border-[#e0e0e0] bg-white px-3 py-3 align-top">
                  <p className="sr-only">
                    Legend — Competitor chart: max and min OTA range, your rate on the spine.
                  </p>
                  <div
                    className="rounded-lg border border-slate-200/70 bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                    role="group"
                    aria-label="Competitor chart legend"
                  >
                    <div className="mb-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Competitor
                    </div>
                    <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[10px] leading-none text-slate-600">
                      <li className="flex items-center gap-1.5">
                        <LegendIconMax className="h-[18px] w-[14px] shrink-0" />
                        <span className="font-medium text-slate-700">Max</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <LegendIconMyRate className="h-[18px] w-[14px] shrink-0" />
                        <span className="font-medium text-slate-700">My rate</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <LegendIconMin className="h-[18px] w-[14px] shrink-0" />
                        <span className="font-medium text-slate-700">Min</span>
                      </li>
                    </ul>
                  </div>
                </td>
                {visibleChartData.map((data, idx) => {
                  const globalIdx = dateOffset + idx;
                  const isNavUnavailableAt = (g: number) =>
                    navigatorUnavailableFromIndex != null && g >= navigatorUnavailableFromIndex;
                  const navUnavail = isNavUnavailableAt(globalIdx);

                  const myRateY = valueToY(data.rate);
                  const maxY = valueToY(data.max);
                  const minY = valueToY(data.min);

                  const prevData = idx > 0 ? visibleChartData[idx - 1] : null;
                  const nextData = visibleChartData[idx + 1];
                  const prevMyRateY = prevData ? valueToY(prevData.rate) : null;
                  const nextMyRateY = nextData ? valueToY(nextData.rate) : null;

                  const scrapeFailedHere = !navUnavail && isNavigatorScrapeFailed(globalIdx);
                  // Scrape-failed neighbours act as chart discontinuities so we
                  // don't draw a trend line into an empty amber tile.
                  const prevScrapeFailed = isNavigatorScrapeFailed(globalIdx - 1);
                  const nextScrapeFailed = isNavigatorScrapeFailed(globalIdx + 1);
                  return (
                    <td key={idx} className="px-0 py-2 border-r border-[#e0e0e0] bg-white relative align-middle w-full overflow-visible">
                      <div className="flex items-center justify-center w-full pt-1 pb-2">
                        <ChartCell
                          date={data.date}
                          myRate={data.rate}
                          minRate={data.min}
                          maxRate={data.max}
                          myRateY={myRateY}
                          maxY={maxY}
                          minY={minY}
                          prevMyRateY={prevMyRateY}
                          nextMyRateY={nextMyRateY}
                          hasPrev={
                            !!prevData &&
                            !isNavUnavailableAt(globalIdx) &&
                            !isNavUnavailableAt(globalIdx - 1) &&
                            !scrapeFailedHere &&
                            !prevScrapeFailed
                          }
                          hasNext={
                            !!nextData &&
                            !isNavUnavailableAt(globalIdx) &&
                            !isNavUnavailableAt(globalIdx + 1) &&
                            !scrapeFailedHere &&
                            !nextScrapeFailed
                          }
                          hasEvent={hasEvent(idx)}
                          currencySymbol={currencySymbol}
                          navigatorUnavailable={navUnavail}
                          scrapeFailed={scrapeFailedHere}
                        />
                      </div>
                    </td>
                  );
                })}
                      </tr>

                      {/* Average competitor rates — selected compsets only. Gated
                          behind the "View competitor rates" CTA along with the
                          per-competitor table below for first-paint performance. */}
                      {showCompetitorRates && (
                      <tr className="border-b-2 border-[#d4d8de] bg-[#e2e5ea]">
                        <td className="sticky left-0 z-10 border-r border-[#d4d8de] bg-[#e2e5ea] px-4 py-3 text-[13px] font-semibold text-[#333333]">
                          <div className="flex items-center justify-between gap-2">
                            <span>Avg. Compset Rates</span>
                            <button
                              type="button"
                              onClick={() => setShowCompetitorRates(false)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2753eb]/40"
                              aria-label="Hide competitor rates"
                            >
                              <ChevronUp className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                              Hide
                            </button>
                          </div>
                        </td>
                        {visibleRates.map((_myRate, dateIdx) => {
                          const avgRate = avgCompsetPerDate[dateIdx];
                          const g = dateOffset + dateIdx;
                          const navOut =
                            navigatorUnavailableFromIndex != null && g >= navigatorUnavailableFromIndex;
                          const scrapeFailedHere = !navOut && isNavigatorScrapeFailed(g);
                          const avgDateLabel = visibleDates[dateIdx]
                            ? formatInsightDate(visibleDates[dateIdx])
                            : '';

                          return (
                            <td
                              key={dateIdx}
                              className="border-r border-[#d4d8de] bg-[#e2e5ea] px-3 py-3 text-center text-[14px] font-semibold"
                            >
                              {avgRate === null ? (
                                navOut ? (
                                  <NavigatorOutsideCoverageTooltip
                                    title="Avg. Compset Rates"
                                    dateLabel={avgDateLabel}
                                  >
                                    <span className="cursor-default text-[13px] font-normal text-slate-500">
                                      —
                                    </span>
                                  </NavigatorOutsideCoverageTooltip>
                                ) : scrapeFailedHere ? (
                                  <span className="cursor-default text-[13px] font-normal text-slate-400">
                                    NA
                                  </span>
                                ) : (
                                  <span className="text-[13px] font-normal text-slate-500">—</span>
                                )
                              ) : (
                                <span className="text-black">
                                  {currencySymbol}
                                  {avgRate}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {showCompetitorRates ? (
                <div className="min-h-0 flex-1 overflow-y-auto border-t border-[#e8eaed] bg-white">
                  <table
                    className="w-full border-collapse"
                    style={{ tableLayout: 'fixed', minWidth: competitorTableMinWidthPx }}
                  >
                    <colgroup>
                      <col style={{ width: '180px' }} />
                      {visibleDates.map((_, idx) => (
                        <col key={`compset-scroll-${idx}`} style={{ width: '110px' }} />
                      ))}
                    </colgroup>
                    <tbody>
                      {/* Competitor rows — shown compsets only (this block scrolls vertically) */}
                      {competitors.map((competitor, compIdx) => {
                        if (!compsetSelection[compIdx]) return null;
                        return (
                          <tr key={compIdx} className="border-b border-[#e0e0e0] hover:bg-gray-50">
                            <td className="sticky left-0 z-20 border-r border-[#e0e0e0] bg-white px-4 py-3 text-[13px] text-[#333333] hover:bg-gray-50">
                              {competitor.name}
                            </td>
                            {visibleRates.map((myRate, dateIdx) => {
                              const compRate = competitorRatesMatrix[dateIdx][compIdx];
                              const actualMinMax = actualMinMaxPerDate[dateIdx];
                              const g = dateOffset + dateIdx;
                              const navUnavail =
                                navigatorUnavailableFromIndex != null && g >= navigatorUnavailableFromIndex;
                              const scrapeFailedHere = !navUnavail && isNavigatorScrapeFailed(g);
                              const isMaxRate =
                                compRate !== null &&
                                actualMinMax.max !== null &&
                                compRate === actualMinMax.max;
                              const isMinRate =
                                compRate !== null &&
                                actualMinMax.min !== null &&
                                compRate === actualMinMax.min;

                              return (
                                <td
                                  key={dateIdx}
                                  className="border-r border-[#e0e0e0] px-2 py-2 text-center text-[14px]"
                                >
                                  <CompetitorRateInsightCell
                                    compRate={compRate}
                                    yourRate={myRate}
                                    avgCompsetRate={avgCompsetPerDate[dateIdx]}
                                    competitorName={competitor.name}
                                    dateLabel={
                                      visibleDates[dateIdx]
                                        ? formatInsightDate(visibleDates[dateIdx])
                                        : ''
                                    }
                                    currencySymbol={currencySymbol}
                                    navigatorUnavailableForDate={navUnavail}
                                    scrapeFailedForDate={scrapeFailedHere}
                                  >
                                    {compRate === null ? null : isMaxRate ? (
                                      <span className="text-[14px] font-bold text-[#f44336]">
                                        {currencySymbol}
                                        {compRate}
                                      </span>
                                    ) : isMinRate ? (
                                      <span className="text-[14px] font-bold text-[#4caf50]">
                                        {currencySymbol}
                                        {compRate}
                                      </span>
                                    ) : (
                                      <span className="text-[14px] text-[#333333]">
                                        {currencySymbol}
                                        {compRate}
                                      </span>
                                    )}
                                  </CompetitorRateInsightCell>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                ) : (
                  /**
                   * Default state: per-competitor table + avg row hidden behind
                   * this CTA so the drawer first-paints with just date/your-rates.
                   * Anchored near the top of its flex region (right under the
                   * Your-rates row) instead of vertically centered, so the user
                   * doesn't have to scan past empty space to find the action.
                   */
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-start gap-2.5 border-t border-[#e8eaed] bg-gradient-to-br from-slate-50/80 via-white to-blue-50/40 px-6 pt-6 pb-10">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#2753eb] shadow-[0_4px_10px_-4px_rgba(39,83,235,0.25)] ring-1 ring-blue-100">
                      <BarChart3 className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </div>
                    <div className="max-w-md text-center">
                      <h3 className="m-0 text-[14px] font-semibold leading-tight text-slate-900">
                        See detailed competitor pricing
                      </h3>
                      <p className="mt-1 m-0 text-[12px] leading-relaxed text-slate-500">
                        You're currently viewing the market range. Open the detailed view to see individual competitor prices for each date.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCompetitorRates(true)}
                      className="mt-1 inline-flex items-center gap-2 rounded-lg bg-[#2753eb] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_12px_-2px_rgba(39,83,235,0.45)] transition-all hover:bg-[#1d3fb8] hover:shadow-[0_6px_16px_-2px_rgba(39,83,235,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2753eb]/40 focus-visible:ring-offset-2"
                    >
                      <BarChart3 className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                      View detailed competitor rates
                    </button>
                    <p className="m-0 text-[10px] font-medium text-slate-400">
                      Loads compset data on demand to keep the drawer fast.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>{/* /relative content wrapper */}

        {/* Footer — Navigator branding (parity legend retired with the Parity tab). */}
        <footer className="shrink-0 border-t border-gray-200 bg-white px-6 py-3 flex flex-wrap items-center justify-end gap-x-6 gap-y-2">
          <div
            className="flex items-center gap-1 shrink-0"
            aria-label="Powered by Navigator"
          >
            <span className="shrink-0 text-[10px] font-medium leading-none text-slate-400/85">
              Powered by
            </span>
            <img
              src={`${import.meta.env.BASE_URL}navigator-logo.svg`}
              alt="Navigator"
              className="h-[22px] w-auto max-h-[24px] max-w-[min(240px,calc(100%-5rem))] shrink-0 object-contain"
              style={{ filter: NAVIGATOR_LOGO_BRAND_FILTER }}
              loading="lazy"
              decoding="async"
            />
          </div>
        </footer>
      </div>
    </div>
  );
}

/** Parity demo: sold-out direct + one OTA still listing — anchored to this calendar column when visible. */
function indexOfSat24JanInWindow(
  dates: Array<{ day: string; date: string; month: string }>
): number | null {
  const i = dates.findIndex((d) => d.day === 'Sat' && d.date === '24' && d.month === 'Jan');
  return i === -1 ? null : i;
}

// Parity Analysis Component
function ParityAnalysisContent({
  visibleDates,
  visibleRates,
  dateOffset,
  roomType,
  getCompetitorRateForDate,
  resolveParityCellRatePlan,
  resolveParityYourRatePlan,
  showTooltipRatePlanNames,
  rateCurrency,
  onDateNavigatePrevious,
  onDateNavigateNext,
  canNavigatePrevious,
  canNavigateNext,
  navigatorUnavailableFromIndex = null
}: {
  visibleDates: Array<{ day: string; date: string; month: string }>;
  visibleRates: number[];
  dateOffset: number;
  roomType: string;
  getCompetitorRateForDate: (competitorIndex: number, dateIndex: number, myRate: number) => number | null;
  resolveParityCellRatePlan: (channelIdx: number, globalDateIdx: number) => string;
  resolveParityYourRatePlan: (globalDateIdx: number) => string;
  /** When false, OTA rate tooltips omit rate plan names (specific plan filter = apple-to-apple). */
  showTooltipRatePlanNames: boolean;
  rateCurrency: DetailedCompetitorRateCurrency;
  onDateNavigatePrevious: () => void;
  onDateNavigateNext: () => void;
  canNavigatePrevious: boolean;
  canNavigateNext: boolean;
  navigatorUnavailableFromIndex?: number | null;
}) {
  const currencySymbol = rateCurrency.symbol;

  const isNavUnavailableAt = (globalIdx: number) =>
    navigatorUnavailableFromIndex != null && globalIdx >= navigatorUnavailableFromIndex;

  // Channel names matching the screenshot structure
  const channelNames = [
    'MakeMyTrip',
    'Trivago',
    'Booking.com Super...',
    'Google Hotel Ads',
    'Expedia',
    'Trip Advisor',
    'Agoda',
    'Hotels.com',
    'Priceline',
    'Kayak'
  ];

  /**
   * Parity tab only: one illustrative night where Brand.com is sold out but Hotels.com still lists a rate —
   * scored as Loss + availability violation (inventory parity), not a price-only rate violation.
   */
  const availabilityDemo = useMemo(() => {
    const dateIdx = indexOfSat24JanInWindow(visibleDates);
    if (dateIdx === null) return null;
    return { dateIdx, channelIdx: 7, otaRate: 289 } as const;
  }, [visibleDates]);

  const parityRates = useMemo(() => {
    if (!availabilityDemo) return visibleRates;
    const next = [...visibleRates];
    if (next.length > availabilityDemo.dateIdx) {
      next[availabilityDemo.dateIdx] = 0;
    }
    return next;
  }, [visibleRates, availabilityDemo]);

  const getParityChannelRate = useCallback(
    (channelIdx: number, dateIdx: number): number | null => {
      if (availabilityDemo && dateIdx === availabilityDemo.dateIdx) {
        if (channelIdx === availabilityDemo.channelIdx) return availabilityDemo.otaRate;
        return null;
      }
      return getCompetitorRateForDate(
        channelIdx,
        dateOffset + dateIdx,
        parityRates[dateIdx] ?? 0
      );
    },
    [availabilityDemo, dateOffset, getCompetitorRateForDate, parityRates]
  );

  // Calculate parity status for a channel rate vs your rate
  const getParityStatus = (channelRate: number, myRate: number) => {
    // If channel is selling at higher rate = Win (good)
    // If channel is selling at lower rate = Loss (bad)
    // If same or very close (within 3%) = Meet

    const diff = channelRate - myRate;
    const diffPercent = Math.abs((diff / myRate) * 100);

    if (diffPercent <= 3) {
      return 'Meet';
    } else if (channelRate > myRate) {
      return 'Win';
    } else {
      return 'Loss';
    }
  };

  // Calculate parity distribution for a channel across visible dates
  const getChannelParityDistribution = (channelIdx: number) => {
    let winCount = 0;
    let meetCount = 0;
    let lossCount = 0;
    let totalCount = 0;

    for (let dateIdx = 0; dateIdx < parityRates.length; dateIdx++) {
      const myRate = parityRates[dateIdx];
      const channelRate = getParityChannelRate(channelIdx, dateIdx);

      if (channelRate === null) continue;

      if (myRate > 0) {
        totalCount++;
        const status = getParityStatus(channelRate, myRate);
        if (status === 'Win') winCount++;
        else if (status === 'Meet') meetCount++;
        else lossCount++;
      } else {
        totalCount++;
        lossCount++;
      }
    }

    const winPercent = totalCount > 0 ? (winCount / totalCount) * 100 : 0;
    const meetPercent = totalCount > 0 ? (meetCount / totalCount) * 100 : 0;
    const lossPercent = totalCount > 0 ? (lossCount / totalCount) * 100 : 0;
    const parityScore = Math.round(winPercent + meetPercent);

    return { winPercent, meetPercent, lossPercent, parityScore };
  };

  // Calculate overall parity percentage for a date
  const getDateParityPercentage = (dateIdx: number) => {
    let goodCount = 0;
    let totalCount = 0;

    for (let i = 0; i < channelNames.length; i++) {
      const myRate = parityRates[dateIdx];
      const channelRate = getParityChannelRate(i, dateIdx);

      if (channelRate === null) continue;

      if (myRate > 0) {
        totalCount++;
        const status = getParityStatus(channelRate, myRate);
        if (status === 'Win' || status === 'Meet') {
          goodCount++;
        }
      } else {
        totalCount++;
      }
    }

    return totalCount > 0 ? Math.round((goodCount / totalCount) * 100) : 0;
  };

  /** Per visible date: Win / Meet / Loss counts across all channels (drives Your Rates column tint). */
  const getDateParityCounts = (dateIdx: number) => {
    let winCount = 0;
    let meetCount = 0;
    let lossCount = 0;
    let totalCount = 0;

    for (let i = 0; i < channelNames.length; i++) {
      const myRate = parityRates[dateIdx];
      const channelRate = getParityChannelRate(i, dateIdx);

      if (channelRate === null) continue;

      if (myRate > 0) {
        totalCount++;
        const status = getParityStatus(channelRate, myRate);
        if (status === 'Win') winCount++;
        else if (status === 'Meet') meetCount++;
        else lossCount++;
      } else {
        totalCount++;
        lossCount++;
      }
    }

    return { winCount, meetCount, lossCount, totalCount };
  };

  /** Cell background for Your Rates date columns — dominant outcome vs same overall-parity logic. */
  const getYourRateParityColumnTint = (dateIdx: number, myRate: number) => {
    if (!myRate || myRate === 0) {
      const { lossCount, totalCount } = getDateParityCounts(dateIdx);
      if (totalCount > 0 && lossCount === totalCount) {
        return { bg: PARITY_COLUMN_TINT.loss.bg, text: PARITY_COLUMN_TINT.loss.text };
      }
      return { bg: '#f3f4f6', text: '#6b7280' as const };
    }
    const { winCount, meetCount, lossCount, totalCount } = getDateParityCounts(dateIdx);
    if (totalCount === 0) {
      return { bg: '#e5e7eb', text: '#4b5563' as const };
    }
    const dominant: 'Win' | 'Meet' | 'Loss' =
      lossCount >= winCount && lossCount >= meetCount
        ? 'Loss'
        : winCount >= meetCount && winCount >= lossCount
          ? 'Win'
          : 'Meet';
    if (dominant === 'Win') return PARITY_COLUMN_TINT.win;
    if (dominant === 'Meet') return PARITY_COLUMN_TINT.meet;
    return PARITY_COLUMN_TINT.loss;
  };

  /** Win/Meet/Loss mix and parity score (Win% + Meet%) across every channel × visible date with data. */
  const overallParityDistribution = useMemo(() => {
    let winCount = 0;
    let meetCount = 0;
    let lossCount = 0;
    let totalCount = 0;

    const channelCount = channelNames.length;
    for (let channelIdx = 0; channelIdx < channelCount; channelIdx++) {
      for (let dateIdx = 0; dateIdx < parityRates.length; dateIdx++) {
        const myRate = parityRates[dateIdx];
        const channelRate = getParityChannelRate(channelIdx, dateIdx);
        if (channelRate === null) continue;

        if (myRate > 0) {
          totalCount++;
          const status = getParityStatus(channelRate, myRate);
          if (status === 'Win') winCount++;
          else if (status === 'Meet') meetCount++;
          else lossCount++;
        } else {
          totalCount++;
          lossCount++;
        }
      }
    }

    const winPercent = totalCount > 0 ? (winCount / totalCount) * 100 : 0;
    const meetPercent = totalCount > 0 ? (meetCount / totalCount) * 100 : 0;
    const lossPercent = totalCount > 0 ? (lossCount / totalCount) * 100 : 0;
    const parityScore = Math.round(winPercent + meetPercent);

    return { winPercent, meetPercent, lossPercent, parityScore };
  }, [channelNames.length, parityRates, getParityChannelRate]);

  // Determine cell display type
  const getCellDisplay = (channelRate: number | null, myRate: number, channelIdx: number, dateIdx: number) => {
    const seed1 = (channelIdx * 17 + dateIdx * 23) % 100;

    if (myRate === 0 && channelRate !== null) {
      return { type: 'availability-violation' as const, rate: channelRate, status: 'Loss' as const };
    }

    /** Sat 24 Jan sold-out direct: other channels have no listing — green Sold out (not parity compare). */
    if (
      availabilityDemo &&
      dateIdx === availabilityDemo.dateIdx &&
      myRate === 0 &&
      channelRate === null &&
      channelIdx !== availabilityDemo.channelIdx
    ) {
      return { type: 'sold-out' as const, rate: null, status: null };
    }

    if (channelRate === null || myRate === 0) {
      return { type: 'no-data' as const, rate: null, status: null };
    }

    const status = getParityStatus(channelRate, myRate);

    // Simulate OTA sold out on channel (green cell) — not a parity loss row
    if (seed1 < 15) {
      return { type: 'sold-out' as const, rate: channelRate, status };
    }

    // R (rate violation) badge + header chip only on Loss — not Win or Meet
    if (status === 'Loss') {
      return { type: 'rate-variation' as const, rate: channelRate, status };
    }

    return { type: 'normal' as const, rate: channelRate, status };
  };

  const parityTableMinWidthPx = 320 + 90 * visibleDates.length;
  const parityTableStyle: CSSProperties = { tableLayout: 'fixed', minWidth: parityTableMinWidthPx };

  const parityColgroup = (
    <colgroup>
      <col style={{ width: '140px' }} />
      <col style={{ width: '100px' }} />
      <col style={{ width: '80px' }} />
      {visibleDates.map((_, idx) => (
        <col key={idx} style={{ width: '90px' }} />
      ))}
    </colgroup>
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      {/* Same pattern as competitor tab: one horizontal scroll for both bands; channel rows scroll vertically only. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
        <div className="shrink-0 bg-white">
          <table className="w-full border-collapse" style={parityTableStyle}>
            {parityColgroup}

        {/* Date Headers + Overall Parity % + Your Rates — fixed while channel rows scroll */}
        <thead>
          <tr className="border-b border-[#e0e0e0]">
            <th className="sticky left-0 z-[25] border-r border-[#e0e0e0] bg-[#f5f5f5] px-3 py-3 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)]">
              <div className="text-left text-[12px] font-semibold text-[#333333]">Channels</div>
            </th>
            <th className="px-2 py-3 border-r border-[#e0e0e0] bg-[#f5f5f5]">
              <div className="text-[12px] font-semibold text-[#333333]">Meet / Win / Loss</div>
            </th>
            <th className="px-2 py-3 border-r border-[#e0e0e0] bg-[#f5f5f5]">
              <div className="text-[12px] font-semibold text-[#333333]">Parity Score</div>
            </th>
            {visibleDates.map((date, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === visibleDates.length - 1;
              const g = dateOffset + idx;
              const navOut = isNavUnavailableAt(g);
              return (
                <th
                  key={idx}
                  title={
                    navOut
                      ? 'No Navigator parity for this date — past the 365-day market-data window from your range start.'
                      : undefined
                  }
                  className={cn(
                    'px-2 py-3 border-r border-[#e0e0e0]',
                    navOut ? 'bg-slate-200/95' : 'bg-[#f5f5f5]'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center gap-1',
                      (isFirst || isLast) && 'relative'
                    )}
                  >
                    {isFirst && (
                      <DateColumnNavButton
                        direction="prev"
                        label="Show earlier dates"
                        onClick={onDateNavigatePrevious}
                        disabled={!canNavigatePrevious}
                        className="absolute left-[-9px] top-1/2 z-10 -translate-y-1/2"
                      />
                    )}
                    <div className="min-w-0 text-center">
                      <div className="text-[11px] font-bold text-[#333333]">{date.day}</div>
                      <div className="text-[11px] font-semibold text-[#333333] mt-0.5">
                        {date.date} {date.month}
                      </div>
                    </div>
                    {isLast && (
                      <DateColumnNavButton
                        direction="next"
                        label="Show later dates"
                        onClick={onDateNavigateNext}
                        disabled={!canNavigateNext}
                        className="absolute right-[-2px] top-1/2 z-10 -translate-y-1/2"
                      />
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {/* Overall parity % — first summary row under date headers */}
          <tr className="border-b border-[#d4d8de] bg-[#e2e5ea]">
            <td className="sticky left-0 z-[24] border-r border-[#d4d8de] bg-[#e2e5ea] px-3 py-3.5 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)]">
              <div className="text-left text-[13px] font-semibold leading-tight text-[#333333]">Overall Parity %</div>
            </td>
            <td className="border-r border-[#d4d8de] bg-[#e2e5ea] px-2 py-3.5">
              <div className="flex h-6 overflow-hidden rounded-lg border border-[#c8ccd2]">
                {overallParityDistribution.meetPercent > 0 && (
                  <div
                    className="flex min-w-0 items-center justify-center"
                    style={{
                      width: `${overallParityDistribution.meetPercent}%`,
                      backgroundColor: PARITY_PALETTE.meet
                    }}
                  >
                    {overallParityDistribution.meetPercent >= 10 && (
                      <span className={PARITY_SEGMENT_PERCENT_CLASS.meet}>
                        {Math.round(overallParityDistribution.meetPercent)}%
                      </span>
                    )}
                  </div>
                )}
                {overallParityDistribution.winPercent > 0 && (
                  <div
                    className="flex min-w-0 items-center justify-center"
                    style={{
                      width: `${overallParityDistribution.winPercent}%`,
                      backgroundColor: PARITY_PALETTE.win
                    }}
                  >
                    {overallParityDistribution.winPercent >= 10 && (
                      <span className={PARITY_SEGMENT_PERCENT_CLASS.win}>
                        {Math.round(overallParityDistribution.winPercent)}%
                      </span>
                    )}
                  </div>
                )}
                {overallParityDistribution.lossPercent > 0 && (
                  <div
                    className="flex min-w-0 items-center justify-center"
                    style={{
                      width: `${overallParityDistribution.lossPercent}%`,
                      backgroundColor: PARITY_PALETTE.loss
                    }}
                  >
                    {overallParityDistribution.lossPercent >= 10 && (
                      <span className={PARITY_SEGMENT_PERCENT_CLASS.loss}>
                        {Math.round(overallParityDistribution.lossPercent)}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            </td>
            <td className="border-r border-[#d4d8de] bg-[#e2e5ea] px-2 py-3.5 text-center">
              <div className="text-[13px] font-semibold tabular-nums text-[#333333]">
                {overallParityDistribution.parityScore}%
              </div>
            </td>
            {visibleDates.map((_, idx) => {
              const g = dateOffset + idx;
              const navOut = isNavUnavailableAt(g);
              const parityPercent = navOut ? null : getDateParityPercentage(idx);
              return (
                <td
                  key={idx}
                  className={cn(
                    'px-2 py-3.5 border-r border-[#d4d8de]',
                    navOut ? 'bg-slate-200/85' : 'bg-[#e2e5ea]'
                  )}
                >
                  <div className="text-center text-[13px] font-semibold tabular-nums text-[#333333]">
                    {navOut ? (
                      <NavigatorOutsideCoverageTooltip
                        title="Overall Parity %"
                        dateLabel={
                          visibleDates[idx] ? formatInsightDate(visibleDates[idx]) : ''
                        }
                      >
                        <span className="cursor-default font-normal text-slate-500">—</span>
                      </NavigatorOutsideCoverageTooltip>
                    ) : (
                      `${parityPercent}%`
                    )}
                  </div>
                </td>
              );
            })}
          </tr>

          {/* Your Rates — label column stays benchmark blue; date columns tint from overall parity that day */}
          <tr className="border-b-2 border-[#2196F3]">
            <td className="relative sticky left-0 z-[24] align-top border-r border-[#e0e0e0] bg-[#E3F2FD] px-3 py-3 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)]">
              <ParityBenchmarkChip />
              <div className="min-w-0 max-w-[min(100%,14rem)] pr-[5.25rem]">
                <div className="text-[13px] font-bold leading-tight text-[#333333]">Your Rates</div>
                <p className="m-0 mt-0.5 text-[10px] font-normal leading-snug text-[#5c6c7c]">Brand.com</p>
              </div>
            </td>
            <td className="px-2 py-3.5 border-r border-[#e0e0e0] bg-[#E3F2FD]" colSpan={2}>
              {/* Empty cells for Win/Meet/Loss and Parity Score columns */}
            </td>
            {parityRates.map((rate, idx) => {
              const globalIdx = dateOffset + idx;
              const soldOut = rate === 0 || !rate;
              const navOut = isNavUnavailableAt(globalIdx);
              const { bg, text } = navOut
                ? { bg: '#f1f5f9', text: '#475569' as const }
                : getYourRateParityColumnTint(idx, rate);
              const dateLabel = visibleDates[idx] ? formatInsightDate(visibleDates[idx]) : '';

              return (
                <td
                  key={idx}
                  className="px-2 py-3.5 text-center text-[13px] font-semibold border-r border-[#e0e0e0]"
                  style={{ backgroundColor: bg }}
                >
                  {navOut ? (
                    <YourRatesRowTooltipCell
                      roomTitle={roomType}
                      dateLabel={dateLabel}
                      yourRate={rate}
                      soldOut={false}
                      inclusionPlanName={resolveParityYourRatePlan(globalIdx)}
                      currencySymbol={currencySymbol}
                      elevatedTooltip
                      showTooltipRatePlanNames={showTooltipRatePlanNames}
                      navigatorNoData
                    >
                      —
                    </YourRatesRowTooltipCell>
                  ) : (
                    <YourRatesRowTooltipCell
                      roomTitle={roomType}
                      dateLabel={dateLabel}
                      yourRate={rate}
                      soldOut={soldOut}
                      inclusionPlanName={resolveParityYourRatePlan(globalIdx)}
                      currencySymbol={currencySymbol}
                      elevatedTooltip
                      showTooltipRatePlanNames={showTooltipRatePlanNames}
                    >
                      {soldOut ? (
                        <span className="font-normal" style={{ color: text }}>
                          Sold Out
                        </span>
                      ) : (
                        <span style={{ color: text }}>
                          {currencySymbol}
                          {rate}
                        </span>
                      )}
                    </YourRatesRowTooltipCell>
                  )}
                </td>
              );
            })}
          </tr>
        </tbody>
          </table>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-[#e8eaed] bg-white">
          <table className="w-full border-collapse" style={parityTableStyle}>
            {parityColgroup}
            <tbody>
          {/* Channel Rows */}
          {channelNames.map((channelName, channelIdx) => {
            const distribution = getChannelParityDistribution(channelIdx);

            return (
              <tr key={channelIdx} className="border-b border-[#e0e0e0]">
                {/* Channel Name */}
                <td className="sticky left-0 z-[23] border-r border-[#e0e0e0] bg-white px-3 py-4 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)] hover:bg-gray-50">
                  <div className="text-[13px] font-medium text-[#333333]">
                    {channelName}
                  </div>
                </td>

                {/* Win/Meet/Loss — flat colors, single row; % inside segment when wide enough */}
                <td className="border-r border-[#e0e0e0] bg-white px-2 py-4">
                  <div className="flex h-6 overflow-hidden rounded-lg border border-[#e8e8e8]">
                    {distribution.meetPercent > 0 && (
                      <div
                        className="flex min-w-0 items-center justify-center"
                        style={{
                          width: `${distribution.meetPercent}%`,
                          backgroundColor: PARITY_PALETTE.meet
                        }}
                      >
                        {distribution.meetPercent >= 10 && (
                          <span className={PARITY_SEGMENT_PERCENT_CLASS.meet}>
                            {Math.round(distribution.meetPercent)}%
                          </span>
                        )}
                      </div>
                    )}
                    {distribution.winPercent > 0 && (
                      <div
                        className="flex min-w-0 items-center justify-center"
                        style={{
                          width: `${distribution.winPercent}%`,
                          backgroundColor: PARITY_PALETTE.win
                        }}
                      >
                        {distribution.winPercent >= 10 && (
                          <span className={PARITY_SEGMENT_PERCENT_CLASS.win}>
                            {Math.round(distribution.winPercent)}%
                          </span>
                        )}
                      </div>
                    )}
                    {distribution.lossPercent > 0 && (
                      <div
                        className="flex min-w-0 items-center justify-center"
                        style={{
                          width: `${distribution.lossPercent}%`,
                          backgroundColor: PARITY_PALETTE.loss
                        }}
                      >
                        {distribution.lossPercent >= 10 && (
                          <span className={PARITY_SEGMENT_PERCENT_CLASS.loss}>
                            {Math.round(distribution.lossPercent)}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </td>

                {/* Parity Score */}
                <td className="px-2 py-4 text-center border-r border-[#e0e0e0] bg-white">
                  <div className="text-[11px] font-semibold text-[#333333]">{distribution.parityScore}%</div>
                </td>

                {/* Date Cells */}
                {parityRates.map((myRate, dateIdx) => {
                  const globalDateIdx = dateOffset + dateIdx;
                  if (isNavUnavailableAt(globalDateIdx)) {
                    const dl = visibleDates[dateIdx] ? formatInsightDate(visibleDates[dateIdx]) : '';
                    return (
                      <td
                        key={dateIdx}
                        className="border-r border-[#e0e0e0] bg-slate-100/90 px-2 py-4 text-center"
                      >
                        <NavigatorOutsideCoverageTooltip title={channelName} dateLabel={dl}>
                          <span className="cursor-default text-[11px] font-normal text-slate-500">
                            —
                          </span>
                        </NavigatorOutsideCoverageTooltip>
                      </td>
                    );
                  }

                  const channelRate = getParityChannelRate(channelIdx, dateIdx);
                  const cellDisplay = getCellDisplay(channelRate, myRate, channelIdx, dateIdx);

                  const dateLabel = visibleDates[dateIdx] ? formatInsightDate(visibleDates[dateIdx]) : '';
                  const channelRatePlan = resolveParityCellRatePlan(channelIdx, globalDateIdx);

                  // No data available
                  if (cellDisplay.type === 'no-data') {
                    return (
                      <td
                        key={dateIdx}
                        className="px-2 py-4 text-center border-r border-[#e0e0e0] bg-gray-50"
                      >
                        <span className="text-[11px] text-gray-400">—</span>
                      </td>
                    );
                  }

                  // Sold out - green background, special text
                  if (cellDisplay.type === 'sold-out') {
                    return (
                      <td
                        key={dateIdx}
                        className="px-2 py-4 text-center border-r border-[#e0e0e0] bg-[#dcfce7]"
                      >
                        <span className="text-[12px] font-semibold text-[#166534]">Sold Out</span>
                      </td>
                    );
                  }

                  if (cellDisplay.type === 'availability-violation' && cellDisplay.rate !== null) {
                    const ch = cellDisplay.rate;

                    return (
                      <td
                        key={dateIdx}
                        className="px-2 py-4 text-center border-r border-[#e0e0e0]"
                        style={{ backgroundColor: '#fee2e2' }}
                      >
                        <InsightHoverTooltip
                          title={channelName}
                          dateLabel={dateLabel}
                          panelWidth={300}
                          estimatedHeight={220}
                          visual="elevated"
                          headerEnd={<ParityTooltipHeaderAvailabilityViolation />}
                          triggerClassName="relative flex min-h-[1.5rem] w-full min-w-0 items-center justify-center py-0.5"
                          body={
                            <ParityTooltipModernBody
                              myRate={myRate}
                              channelRate={ch}
                              channelSiteLabel={channelName}
                              yourPlan={resolveParityYourRatePlan(globalDateIdx)}
                              channelPlan={channelRatePlan}
                              showPlans={showTooltipRatePlanNames}
                              status="Loss"
                              gapPct={0}
                              isLoss
                              lossAmount={ch}
                              isWin={false}
                              winAmount={0}
                              currencySymbol={currencySymbol}
                              availabilityViolation
                            />
                          }
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[13px] font-semibold text-[#991b1b]">
                              {currencySymbol}
                              {cellDisplay.rate}
                            </span>
                            <ParityAvailabilityViolationBadgeIcon />
                          </div>
                        </InsightHoverTooltip>
                      </td>
                    );
                  }

                  // rate-variation (R) only when parity status is Loss
                  const isWin = cellDisplay.status === 'Win';
                  const isMeet = cellDisplay.status === 'Meet';
                  const isLoss = cellDisplay.status === 'Loss';
                  const bgColor = isWin
                    ? PARITY_COLUMN_TINT.win.bg
                    : isMeet
                      ? PARITY_COLUMN_TINT.meet.bg
                      : PARITY_COLUMN_TINT.loss.bg;
                  const textColor = isWin
                    ? PARITY_COLUMN_TINT.win.text
                    : isMeet
                      ? PARITY_COLUMN_TINT.meet.text
                      : PARITY_COLUMN_TINT.loss.text;

                  const lossAmount = isLoss && cellDisplay.rate ? myRate - cellDisplay.rate : 0;

                  const winAmount =
                    isWin && cellDisplay.rate != null ? Math.max(0, cellDisplay.rate - myRate) : 0;

                  const status = cellDisplay.status as 'Win' | 'Meet' | 'Loss';
                  const pillPct =
                    cellDisplay.rate != null ? parityPillPercent(myRate, cellDisplay.rate, status) : 0;

                  const showRateViolationNote = cellDisplay.type === 'rate-variation';

                  return (
                    <td
                      key={dateIdx}
                      className="px-2 py-4 text-center border-r border-[#e0e0e0]"
                      style={{ backgroundColor: bgColor }}
                    >
                      <InsightHoverTooltip
                        title={channelName}
                        dateLabel={dateLabel}
                        panelWidth={300}
                        estimatedHeight={220}
                        visual="elevated"
                        headerEnd={showRateViolationNote ? <ParityTooltipHeaderRateViolation /> : undefined}
                        triggerClassName="relative flex min-h-[1.5rem] w-full min-w-0 items-center justify-center py-0.5"
                        body={
                          <ParityTooltipModernBody
                            myRate={myRate}
                            channelRate={cellDisplay.rate}
                            channelSiteLabel={channelName}
                            yourPlan={resolveParityYourRatePlan(globalDateIdx)}
                            channelPlan={channelRatePlan}
                            showPlans={showTooltipRatePlanNames}
                            status={status}
                            gapPct={pillPct}
                            isLoss={isLoss}
                            lossAmount={lossAmount}
                            isWin={isWin}
                            winAmount={winAmount}
                            currencySymbol={currencySymbol}
                          />
                        }
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-[13px] font-semibold" style={{ color: textColor }}>
                            {currencySymbol}
                            {cellDisplay.rate}
                          </span>
                          {cellDisplay.type === 'rate-variation' ? <ParityRateViolationBadgeIcon /> : null}
                        </div>
                      </InsightHoverTooltip>
                    </td>
                  );
                })}
              </tr>
            );
          })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ChartCell({
  date,
  myRate,
  minRate,
  maxRate,
  myRateY,
  maxY,
  minY,
  prevMyRateY,
  nextMyRateY,
  hasPrev,
  hasNext,
  hasEvent,
  currencySymbol,
  navigatorUnavailable = false,
  scrapeFailed = false
}: {
  date: { day: string; date: string; month: string };
  myRate: number;
  minRate: number;
  maxRate: number;
  myRateY: number;
  maxY: number;
  minY: number;
  prevMyRateY: number | null;
  nextMyRateY: number | null;
  hasPrev: boolean;
  hasNext: boolean;
  hasEvent: boolean;
  currencySymbol: string;
  navigatorUnavailable?: boolean;
  /** Navigator's independent scrape returned no rates for this date. */
  scrapeFailed?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const chartHeight = 112;
  /** Trigger + tooltip refs power the portalled positioning below. */
  const triggerRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ left: number; top: number; placement: 'above' | 'below' } | null>(null);

  /**
   * Portal-based positioning (mirrors `RoomDateInfoIcon`). Without this the
   * tooltip was clipped by the drawer's scrollable region — the chart cells
   * live inside an `overflow: hidden / auto` flex container. Rendering the
   * tooltip to `document.body` lets it escape every ancestor clip + stacking
   * context, and the manual placement keeps it snug to the chart cell.
   */
  useLayoutEffect(() => {
    if (!isHovered) {
      setLayout(null);
      return;
    }
    const update = () => {
      const trigger = triggerRef.current;
      const tip = tipRef.current;
      if (!trigger || !tip) return;
      const r = trigger.getBoundingClientRect();
      const tw = tip.offsetWidth;
      const th = tip.offsetHeight;
      const viewportMargin = 8;
      /** Vertical distance from the chart cell — tight so the tail "kisses" the chart. */
      const gap = 4;
      let left = r.left + r.width / 2 - tw / 2;
      left = Math.min(Math.max(left, viewportMargin), window.innerWidth - tw - viewportMargin);
      let top = r.top - th - gap;
      let placement: 'above' | 'below' = 'above';
      if (top < viewportMargin) {
        placement = 'below';
        top = r.bottom + gap;
        if (top + th > window.innerHeight - viewportMargin) {
          top = Math.max(viewportMargin, window.innerHeight - th - viewportMargin);
        }
      }
      setLayout({ left, top, placement });
    };
    update();
    const ro = new ResizeObserver(update);
    if (tipRef.current) ro.observe(tipRef.current);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isHovered]);

  if (navigatorUnavailable) {
    return (
      <div
        className="relative w-full"
        title="Navigator competitor and parity data are not available for this date."
      >
        <div
          className="flex w-full flex-col items-center justify-center gap-0.5 rounded border border-slate-200/80 bg-[repeating-linear-gradient(-45deg,#e2e8f0,#e2e8f0_4px,#f8fafc_4px,#f8fafc_8px)] px-1 py-2 text-center"
          style={{ minHeight: chartHeight }}
        >
          <span className="text-[8px] font-semibold uppercase leading-tight text-slate-600">
            No Navigator data
          </span>
          <span className="text-[8px] text-slate-500">Outside coverage</span>
        </div>
      </div>
    );
  }

  if (scrapeFailed) {
    /**
     * No system-blame framing — the user shouldn't feel like Navigator broke.
     * No border either: the column borders + row padding already define the
     * cell, so a muted centered label reads as a benign empty state without
     * looking like a "broken" tile.
     */
    return (
      <div className="relative w-full" title="Rates are not available for this date.">
        <div
          className="flex w-full items-center justify-center px-1 py-2 text-center"
          style={{ minHeight: chartHeight }}
        >
          <span className="text-[10px] font-medium leading-tight text-slate-400">Not Available</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={triggerRef}
      className="relative w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Per-cell rate breakdown tooltip — portalled to body and absolutely
          positioned so the drawer's scroll/overflow can't clip it. Uses the
          shared body so this stays pixel-consistent with the main-screen
          RoomDateInfoIcon tooltip. */}
      {isHovered && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tipRef}
            role="tooltip"
            className="pointer-events-none relative w-[260px] rounded-2xl border border-slate-200/80 bg-white px-3.5 py-3 text-left text-slate-900 shadow-[0_20px_50px_-16px_rgba(15,23,42,0.28)] ring-1 ring-slate-950/[0.04]"
            style={
              layout
                ? { position: 'fixed', left: layout.left, top: layout.top, zIndex: 2147483000 }
                : { position: 'fixed', left: -9999, top: 0, zIndex: 2147483000, visibility: 'hidden' }
            }
          >
            {/* Pointer tail above when tooltip is placed below the cell */}
            {layout?.placement === 'below' && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-[1] mb-0 -translate-x-1/2">
                <div className="relative">
                  <div
                    aria-hidden
                    className="h-0 w-0 border-b-[8px] border-l-[7px] border-r-[7px] border-b-[rgb(226_232_240/0.85)] border-l-transparent border-r-transparent"
                  />
                  <div
                    aria-hidden
                    className="absolute left-1/2 top-px h-0 w-0 -translate-x-1/2 border-b-[7px] border-l-[6px] border-r-[6px] border-b-white border-l-transparent border-r-transparent"
                  />
                </div>
              </div>
            )}

            <RateBreakdownTooltipBody
              date={date}
              yourRate={myRate}
              minRate={minRate}
              maxRate={maxRate}
              currencySymbol={currencySymbol}
            />

            {/* Pointer tail below when tooltip is placed above the cell */}
            {layout?.placement === 'above' && (
              <div className="pointer-events-none absolute left-1/2 top-full z-[1] -mt-px -translate-x-1/2">
                <div className="relative">
                  <div
                    aria-hidden
                    className="h-0 w-0 border-l-[7px] border-r-[7px] border-t-[8px] border-l-transparent border-r-transparent border-t-[rgb(226_232_240/0.85)]"
                  />
                  <div
                    aria-hidden
                    className="absolute bottom-px left-1/2 h-0 w-0 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[7px] border-l-transparent border-r-transparent border-t-white"
                  />
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
      <svg
        width="100%"
        height={chartHeight}
        className="block max-w-full overflow-hidden"
        preserveAspectRatio="none"
      >
        {/* Vertical range line from min to max */}
        <line
          x1="50%"
          y1={`${minY}%`}
          x2="50%"
          y2={`${maxY}%`}
          stroke="#90a4ae"
          strokeWidth="2"
        />

        {/* Max rate T-marker */}
        <line
          x1="calc(50% - 8px)"
          y1={`${maxY}%`}
          x2="calc(50% + 8px)"
          y2={`${maxY}%`}
          stroke="#f44336"
          strokeWidth="2.5"
        />
        <circle cx="50%" cy={`${maxY}%`} r="3" fill="#f44336" />

        {/* Min rate T-marker */}
        <line
          x1="calc(50% - 8px)"
          y1={`${minY}%`}
          x2="calc(50% + 8px)"
          y2={`${minY}%`}
          stroke="#4caf50"
          strokeWidth="2.5"
        />
        <circle cx="50%" cy={`${minY}%`} r="3" fill="#4caf50" />

        {/* Line from previous column to this column center */}
        {hasPrev && prevMyRateY !== null && (
          <line
            x1="0%"
            y1={`${prevMyRateY}%`}
            x2="50%"
            y2={`${myRateY}%`}
            stroke="#2196F3"
            strokeWidth="2.5"
          />
        )}

        {/* Line from this column center to next column (edge of this cell) */}
        {hasNext && nextMyRateY !== null && (
          <line
            x1="50%"
            y1={`${myRateY}%`}
            x2="100%"
            y2={`${myRateY}%`}
            stroke="#2196F3"
            strokeWidth="2.5"
          />
        )}

        {/* My rate dot */}
        <circle
          cx="50%"
          cy={`${myRateY}%`}
          r="4"
          fill="#2196F3"
          stroke="white"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}