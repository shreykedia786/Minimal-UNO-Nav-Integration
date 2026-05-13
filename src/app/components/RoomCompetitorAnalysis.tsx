import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info } from 'lucide-react';
import {
  DEFAULT_DETAILED_COMPETITOR_RATE_CURRENCY,
  DetailedCompetitorModal,
  type DetailedCompetitorRateCurrency
} from './DetailedCompetitorModal';
import { RateBreakdownTooltipBody } from './RateBreakdownTooltipBody';
import { isNavigatorScrapeFailed } from '../lib/navigatorScrapeStatus';
import { cn } from './ui/utils';

/** Room-level view: min/max across competitors (each at their cheapest rate plan for the room). */
export type RoomLevelCompetitorRates = {
  min: number;
  avg: number;
  max: number;
  competitorMinRatePlan: string;
  competitorMinChannel: string;
  competitorMaxRatePlan: string;
  competitorMaxChannel: string;
};

type DateCell = { day: string; date: string; month: string };

/** Per-date room-level snapshot. Replaces the candlestick chart’s rendering data. */
export type RoomChartDatum = RoomLevelCompetitorRates & {
  rate: number;
  date: DateCell;
  /**
   * `true` when Navigator's independent scrape returned no rates for this date.
   * Consumers should render a distinct "data unavailable" state — different
   * from "sold out" and from "outside Navigator coverage".
   */
  scrapeFailed: boolean;
};

type RoomEvent = {
  name: string;
  dateRange: string;
  importance: 'high' | 'medium' | 'low';
  demandLevel: string;
  demandIndex: number;
  demandMultiplier: string;
  confidenceScore: string;
} | null;

export interface UseRoomCompetitorAnalysisProps {
  dates: DateCell[];
  rates: number[];
  /** Per-day: which rate plan drives your cheapest grid rate, and channel. */
  myRateMeta?: Array<{ ratePlan: string; channel: string }>;
  /** When set, competitor min/max/avg use this baseline per date; `rates` only drives My Rate. */
  competitorBaseRates?: number[];
  getCompetitorRates: (dateIndex: number, baseRate: number) => RoomLevelCompetitorRates;
  roomType?: string;
  /** Shown in View Details drawer filters (inclusion = rate plan names after “Any”). */
  drawerInclusionPlanNames?: string[];
  ratePlan?: string;
  events?: RoomEvent[];
  rateCurrency?: DetailedCompetitorRateCurrency;
  /** When set, the View Details drawer allows editing Your Rates (Suite). Updates parent state so the main grid stays in sync. */
  onYourRatesChange?: (dateIndex: number, value: string) => void;
  /** First date column index (0-based) with no Navigator competitor data. `null` = all columns covered. */
  navigatorUnavailableFromIndex?: number | null;
}

/**
 * Replaces the per-room candlestick chart. The chart was rejected for performance —
 * this hook keeps the same computation but only emits lightweight per-date data
 * (consumed by `RoomDateInfoIcon`) plus the existing View Details drawer.
 */
export function useRoomCompetitorAnalysis({
  dates,
  rates,
  myRateMeta,
  competitorBaseRates,
  getCompetitorRates,
  roomType,
  drawerInclusionPlanNames,
  ratePlan,
  events,
  rateCurrency,
  onYourRatesChange,
  navigatorUnavailableFromIndex = null
}: UseRoomCompetitorAnalysisProps) {
  const [showDetailedView, setShowDetailedView] = useState(false);

  const chartData = useMemo<RoomChartDatum[]>(() => {
    return rates.map((rate, idx) => {
      const baseline = competitorBaseRates?.[idx] ?? rate;
      const comp = getCompetitorRates(idx, baseline);
      return {
        rate,
        ...comp,
        date: dates[idx],
        // Marked here so every downstream consumer (main-screen icon + drawer
        // chart cell + drawer table rows) reads the same source of truth.
        scrapeFailed: isNavigatorScrapeFailed(idx)
      };
    });
  }, [rates, competitorBaseRates, dates, getCompetitorRates]);

  const isCellNavigatorUnavailable = (idx: number) =>
    navigatorUnavailableFromIndex != null && idx >= navigatorUnavailableFromIndex;

  /** Same predicate as the shared helper, surfaced for grid cells that don't carry datum. */
  const isCellScrapeFailed = (idx: number) => isNavigatorScrapeFailed(idx);

  const modalElement = showDetailedView ? (
    <DetailedCompetitorModal
      dates={dates}
      rates={rates}
      chartData={chartData}
      roomType={roomType}
      inclusionPlanNames={drawerInclusionPlanNames}
      ratePlan={ratePlan}
      events={events}
      editableYourRates={!!onYourRatesChange}
      onYourRateChange={onYourRatesChange}
      onClose={() => setShowDetailedView(false)}
      rateCurrency={rateCurrency}
      navigatorUnavailableFromIndex={navigatorUnavailableFromIndex ?? null}
    />
  ) : null;

  return {
    chartData,
    myRateMeta,
    rateCurrency,
    roomType,
    isCellNavigatorUnavailable,
    isCellScrapeFailed,
    openDetails: () => setShowDetailedView(true),
    closeDetails: () => setShowDetailedView(false),
    modalElement
  };
}

/**
 * Compact info icon (top-right of a date cell). On hover/focus shows the same
 * per-date competitor min / max + your rate breakdown the chart tooltip used to.
 */
export function RoomDateInfoIcon({
  data,
  rateCurrency,
  roomTitle,
  dataTour
}: {
  data: RoomChartDatum;
  rateCurrency?: DetailedCompetitorRateCurrency;
  roomTitle?: string;
  dataTour?: string;
}) {
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState<{ left: number; top: number; placement: 'above' | 'below' } | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const symbol = (rateCurrency ?? DEFAULT_DETAILED_COMPETITOR_RATE_CURRENCY).symbol;

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 140);
  };

  useEffect(() => () => clearCloseTimer(), []);

  useLayoutEffect(() => {
    if (!open) {
      setLayout(null);
      return;
    }
    const update = () => {
      const anchor = anchorRef.current;
      const tip = tipRef.current;
      if (!anchor || !tip) return;
      const r = anchor.getBoundingClientRect();
      const tw = tip.offsetWidth;
      const th = tip.offsetHeight;
      const margin = 8;
      let left = r.left + r.width / 2 - tw / 2;
      left = Math.min(Math.max(left, margin), window.innerWidth - tw - margin);
      let top = r.top - th - 8;
      let placement: 'above' | 'below' = 'above';
      if (top < margin) {
        placement = 'below';
        top = r.bottom + 8;
        if (top + th > window.innerHeight - margin) {
          top = Math.max(margin, window.innerHeight - th - margin);
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
  }, [open]);

  // When Navigator's scrape failed, the icon swaps to a warning glyph and the
  // tooltip explains the situation. We keep the same trigger affordance so
  // users still get a hover surface they can investigate.
  const isScrapeFailed = data.scrapeFailed;

  return (
    <>
      <button
        type="button"
        ref={anchorRef}
        onMouseEnter={() => {
          clearCloseTimer();
          setOpen(true);
        }}
        onMouseLeave={scheduleClose}
        onFocus={() => {
          clearCloseTimer();
          setOpen(true);
        }}
        onBlur={scheduleClose}
        aria-label={
          isScrapeFailed
            ? `Competitor rates unavailable for ${data.date.day} ${data.date.date} ${data.date.month}`
            : `Competitor rates for ${data.date.day} ${data.date.date} ${data.date.month}`
        }
        data-tour={dataTour}
        className={cn(
          'absolute top-1 right-1 inline-flex h-[14px] w-[14px] items-center justify-center rounded-full border shadow-sm transition-colors',
          isScrapeFailed
            ? 'border-amber-300 bg-amber-50 text-amber-600 hover:border-amber-400 hover:bg-amber-100 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50'
            : 'border-slate-300/80 bg-white text-slate-500 hover:border-[#2196F3] hover:bg-[#e3f2fd] hover:text-[#1565C0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2196F3]/40'
        )}
      >
        {isScrapeFailed ? (
          <AlertTriangle className="h-[10px] w-[10px]" strokeWidth={2.5} aria-hidden />
        ) : (
          <Info className="h-[10px] w-[10px]" strokeWidth={2.5} aria-hidden />
        )}
      </button>

      {open && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tipRef}
            role="tooltip"
            onMouseEnter={() => {
              clearCloseTimer();
              setOpen(true);
            }}
            onMouseLeave={scheduleClose}
            className={cn(
              'pointer-events-auto relative w-[min(280px,calc(100vw-24px))] max-w-[calc(100vw-24px)] text-left text-slate-900',
              'rounded-2xl border border-slate-200/80 bg-white px-3.5 py-3 shadow-[0_20px_50px_-16px_rgba(15,23,42,0.28)] ring-1 ring-slate-950/[0.04]'
            )}
            style={
              layout
                ? { position: 'fixed', left: layout.left, top: layout.top, zIndex: 2147483000 }
                : { position: 'fixed', left: -9999, top: 0, zIndex: 2147483000, visibility: 'hidden' }
            }
          >
            {layout?.placement === 'below' && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-[1] mb-0 -translate-x-1/2">
                <div className="relative">
                  <div
                    className="h-0 w-0 border-b-[8px] border-l-[7px] border-r-[7px] border-l-transparent border-r-transparent border-b-[rgb(226_232_240/0.85)]"
                    aria-hidden
                  />
                  <div
                    className="absolute left-1/2 top-px h-0 w-0 -translate-x-1/2 border-b-[7px] border-l-[6px] border-r-[6px] border-l-transparent border-r-transparent border-b-white"
                    aria-hidden
                  />
                </div>
              </div>
            )}

            {isScrapeFailed ? (
              <ScrapeFailedTooltipBody date={data.date} roomTitle={roomTitle} />
            ) : (
              <RateBreakdownTooltipBody
                date={data.date}
                yourRate={data.rate}
                minRate={data.min}
                maxRate={data.max}
                currencySymbol={symbol}
                roomTitle={roomTitle}
              />
            )}

            {layout?.placement === 'above' && (
              <div className="pointer-events-none absolute top-full left-1/2 z-[1] -mt-px -translate-x-1/2">
                <div className="relative">
                  <div
                    className="h-0 w-0 border-l-[7px] border-r-[7px] border-t-[8px] border-l-transparent border-r-transparent border-t-[rgb(226_232_240/0.85)]"
                    aria-hidden
                  />
                  <div
                    className="absolute bottom-px left-1/2 h-0 w-0 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[7px] border-l-transparent border-r-transparent border-t-white"
                    aria-hidden
                  />
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

/**
 * Tooltip body shown on the main-screen info icon when Navigator has no rates
 * for that date. Your Rate is intentionally omitted — Navigator also sources
 * the user's public-facing rate, so when its scrape returns nothing there's
 * nothing trustworthy to display alongside the compset gap. Keeps the
 * messaging factual and short, matching the "Not Available" framing used in
 * the drawer.
 */
function ScrapeFailedTooltipBody({
  date,
  roomTitle
}: {
  date: DateCell;
  roomTitle?: string;
}) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold leading-tight tracking-tight text-slate-900">
          {date.day}, {date.date} {date.month}
        </span>
        {roomTitle ? (
          <span
            className="min-w-0 truncate text-[10.5px] font-medium text-slate-400"
            title={roomTitle}
          >
            {roomTitle}
          </span>
        ) : null}
      </div>

      <div className="mt-2 h-px w-full bg-slate-200/80" aria-hidden />

      <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200/70 bg-amber-50/70 px-2.5 py-2">
        <AlertTriangle
          aria-hidden
          className="mt-[1px] h-3.5 w-3.5 shrink-0 text-amber-600"
          strokeWidth={2.5}
        />
        <div className="min-w-0 space-y-0.5">
          <p className="m-0 text-[11.5px] font-semibold leading-snug text-amber-900">
            Rates not available
          </p>
          <p className="m-0 text-[10.5px] leading-snug text-amber-800/90">
            Rate data isn't available for this date right now.
          </p>
        </div>
      </div>
    </>
  );
}

/**
 * Minimal text-link button that opens the DetailedCompetitorModal.
 *
 * Lives inside the room header's Inventory cell, stacked below the "Inventory"
 * column label. Renders as a low-chrome text affordance (icon + label) so it
 * reads as a quiet secondary action rather than a pill / chip that competes
 * with the rate-plan rows around it. Hover state reveals a soft sky tint so
 * the affordance is still discoverable.
 */
export function RoomViewDetailsButton({
  onClick,
  dataTour,
  className,
  label = 'Compare',
  tooltipLabel = 'View competitor rate analysis'
}: {
  onClick: () => void;
  dataTour?: string;
  className?: string;
  /** Short visible label (must fit a 90px column). */
  label?: string;
  /** Full descriptive label exposed via aria-label / native tooltip. */
  tooltipLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tour={dataTour}
      aria-label={tooltipLabel}
      title={tooltipLabel}
      className={cn(
        // Negative left margin nudges the icon's left edge flush with the
        // "Inventory" label above (which has no padding) while preserving the
        // hover-bg breathing room on the inside.
        '-ml-1 inline-flex shrink-0 items-center gap-1 rounded-md px-1 py-0.5 text-[11px] font-semibold leading-none text-[#1565C0] transition-colors',
        'hover:bg-[#e3f2fd] hover:text-[#0f4a99] focus:outline-none focus-visible:bg-[#e3f2fd] focus-visible:ring-2 focus-visible:ring-[#2196F3]/40',
        className
      )}
    >
      <Info className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
