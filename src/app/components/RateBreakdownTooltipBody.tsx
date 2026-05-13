import { cn } from './ui/utils';

type DateCell = { day: string; date: string; month: string };

interface RateBreakdownTooltipBodyProps {
  date: DateCell;
  yourRate: number;
  minRate: number;
  maxRate: number;
  currencySymbol: string;
  /** Optional sub-title shown right of the date (e.g., room name). */
  roomTitle?: string;
}

/**
 * Single rate row inside the breakdown tooltip. All three rows (yours / min /
 * max) share this structure so the eye can scan vertically — labels align on
 * the left edge, rates align on the right edge under each other.
 *
 *   [dot] [label]                              [value]
 */
function TooltipRateRow({
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
        <span className="truncate text-[11.5px] font-medium tracking-tight text-slate-700">
          {label}
        </span>
      </div>
      <span className="text-[15px] font-bold leading-none tabular-nums tracking-tight text-slate-900">
        {value}
      </span>
    </div>
  );
}

/**
 * Derives the "where am I in the compset" summary chip:
 *  - Above compset max → rose pill: "↑ +€X vs max"  (you're the highest)
 *  - Below compset min → emerald pill: "↓ −€X vs min"  (you're the cheapest)
 *  - Within range     → slate pill: "in range"
 * Returns null for malformed (min > max) data.
 */
function deriveCompsetComparison(
  rate: number,
  min: number,
  max: number,
  symbol: string
): { text: string; tone: 'over' | 'under' | 'in'; arrow: '↑' | '↓' | '•' } | null {
  if (!Number.isFinite(rate) || !Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    return null;
  }
  if (rate > max) {
    return { text: `+${symbol}${rate - max} vs max`, tone: 'over', arrow: '↑' };
  }
  if (rate < min) {
    return { text: `−${symbol}${min - rate} vs min`, tone: 'under', arrow: '↓' };
  }
  return { text: 'in range', tone: 'in', arrow: '•' };
}

const COMPARISON_CLASSES: Record<'over' | 'under' | 'in', string> = {
  over: 'bg-rose-50 text-rose-700 ring-rose-100',
  under: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  in: 'bg-slate-50 text-slate-600 ring-slate-200/70'
};

/**
 * Shared per-date rate-breakdown tooltip body. Used by:
 *  - The main-screen per-date info-icon tooltip (`RoomDateInfoIcon`).
 *  - The drawer's per-date Your-rates chart cell hover (`ChartCell`).
 *
 * The consumer is responsible for the wrapping card (positioning, width, arrow
 * tail, portal vs. absolute). This component only renders the body content —
 * header + 3 equal rate rows + comparison pill — so both call sites stay
 * pixel-consistent regardless of how they anchor the popover.
 */
export function RateBreakdownTooltipBody({
  date,
  yourRate,
  minRate,
  maxRate,
  currencySymbol,
  roomTitle
}: RateBreakdownTooltipBodyProps) {
  const comparison = deriveCompsetComparison(yourRate, minRate, maxRate, currencySymbol);

  return (
    <>
      {/* Header row — date hero + optional room context */}
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

      {/* Three equal-weight rate rows — identical structure so values align
          under each other and the eye can scan them in one sweep. */}
      <div className="mt-1 divide-y divide-slate-100">
        <TooltipRateRow
          dotColor="bg-sky-500"
          label="Your rate"
          value={`${currencySymbol}${yourRate}`}
        />
        <TooltipRateRow
          dotColor="bg-emerald-500"
          label="Competitor min"
          value={`${currencySymbol}${minRate}`}
        />
        <TooltipRateRow
          dotColor="bg-rose-500"
          label="Competitor max"
          value={`${currencySymbol}${maxRate}`}
        />
      </div>

      {/* Summary chip — tucked beneath the rate stack so it doesn't interfere
          with scanning the three values. */}
      {comparison ? (
        <div className="mt-2 flex items-center justify-end border-t border-slate-200/80 pt-2">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-[3px] text-[9.5px] font-semibold leading-none tabular-nums ring-1',
              COMPARISON_CLASSES[comparison.tone]
            )}
          >
            <span aria-hidden>{comparison.arrow}</span>
            <span>{comparison.text}</span>
          </span>
        </div>
      ) : null}
    </>
  );
}
