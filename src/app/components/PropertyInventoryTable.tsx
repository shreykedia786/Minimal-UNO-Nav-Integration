import { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Lock, Zap } from 'lucide-react';
import svgPaths from "../../imports/svg-eqrmta6hqq";
import {
  RoomDateInfoIcon,
  RoomViewDetailsButton,
  useRoomCompetitorAnalysis,
  type RoomLevelCompetitorRates
} from './RoomCompetitorAnalysis';
import { NavigatorIntelligenceLockedRow } from './NavigatorIntelligenceLockedRow';
import { demoNavigatorUnavailableFromColumnIndex } from '@/app/lib/navigatorDateCoverage';

interface DateCell {
  day: string;
  date: string;
  month: string;
}

/** Initial Suite rates — competitor analysis stays fixed to these baselines when rates are edited. */
const SUITE_GDS_BASELINE: number[] = [425, 430, 428, 435, 440, 438, 445, 450, 448, 455, 460, 458, 465, 470];
const SUITE_BAR_BASELINE: number[] = [445, 450, 448, 455, 460, 458, 465, 470, 468, 475, 480, 478, 485, 490];

const SUITE_ROOM_COMPETITOR_BASELINE = SUITE_GDS_BASELINE.map((g, i) => Math.min(g, SUITE_BAR_BASELINE[i]));

const STANDARD_CLUB_RATES = [315, 315, 315, 315, 315, 315, 315, 315, 315, 350, 350, 350, 350, 350];
const STANDARD_BAR_RATES = [320, 345, 310, 335, 340, 330, 325, 355, 315, 340, 345, 330, 325, 335];
/** Additional Standard Room plans — realistic industry-style names (14 nights). */
const STANDARD_ADVANCE_RATES = [299, 301, 302, 298, 304, 300, 296, 308, 294, 312, 315, 308, 305, 301];
const STANDARD_MOBILE_RATES = [302, 299, 305, 301, 306, 303, 299, 310, 298, 315, 318, 312, 308, 304];
const STANDARD_MEMBER_RATES = [305, 304, 308, 303, 310, 306, 302, 315, 300, 318, 322, 315, 310, 308];
const STANDARD_CORPORATE_RATES = [328, 330, 322, 325, 332, 326, 320, 338, 318, 342, 345, 335, 330, 332];
const STANDARD_BNB_RATES = [348, 350, 352, 345, 358, 352, 348, 362, 340, 365, 368, 358, 355, 352];

const STANDARD_SYSTEM_CHEAPEST = buildCheapestAcrossPlans([
  { rates: STANDARD_ADVANCE_RATES, ratePlanName: 'Advance Purchase (Non-Refundable)', channel: 'Brand.com' },
  { rates: STANDARD_MOBILE_RATES, ratePlanName: 'Mobile App Exclusive', channel: 'Brand.com app' },
  { rates: STANDARD_MEMBER_RATES, ratePlanName: 'Member Exclusive Rate', channel: 'Brand.com' },
  { rates: STANDARD_CLUB_RATES, ratePlanName: 'Club Only Special Rates', channel: 'GDS / Brand.com' },
  { rates: STANDARD_BAR_RATES, ratePlanName: 'Best Available Rate (BAR)', channel: 'Brand.com' },
  { rates: STANDARD_CORPORATE_RATES, ratePlanName: 'Corporate Negotiated BAR', channel: 'GDS' },
  { rates: STANDARD_BNB_RATES, ratePlanName: 'Bed & Breakfast Package', channel: 'Brand.com' }
]);

const DELUXE_CLUB_RATES = [355, 358, 360, 362, 365, 368, 370, 372, 375, 378, 380, 382, 385, 388];
const DELUXE_BAR_RATES = [375, 378, 380, 382, 385, 388, 390, 392, 395, 398, 400, 402, 405, 408];

const COMP_MIN_PLANS = ['BAR', 'Advance Purchase', 'Member rate', 'Non-refundable', 'Breakfast incl.'];
const COMP_MAX_PLANS = ['Flexible BAR', 'Corporate BAR', 'Package + breakfast', 'Suite upgrade', 'Advance saver'];
const COMP_CHANNELS = ['Booking.com', 'Expedia', 'Agoda', 'Hotels.com', 'Priceline', 'Google Hotel Ads', 'Kayak'];

function buildCheapestAcrossPlans(
  plans: Array<{ rates: number[]; ratePlanName: string; channel: string }>
): { rates: number[]; meta: Array<{ ratePlan: string; channel: string }> } {
  const len = plans[0].rates.length;
  const rates: number[] = [];
  const meta: Array<{ ratePlan: string; channel: string }> = [];
  for (let i = 0; i < len; i++) {
    let best = { v: Infinity, ratePlan: '', channel: '' };
    for (const p of plans) {
      const v = p.rates[i];
      if (v < best.v) best = { v, ratePlan: p.ratePlanName, channel: p.channel };
    }
    rates.push(best.v);
    meta.push({ ratePlan: best.ratePlan, channel: best.channel });
  }
  return { rates, meta };
}

const DELUXE_ROOM_CHEAPEST = buildCheapestAcrossPlans([
  { rates: DELUXE_CLUB_RATES, ratePlanName: 'Deluxe Club Special Rates', channel: 'GDS / Brand.com' },
  { rates: DELUXE_BAR_RATES, ratePlanName: 'BAR', channel: 'Brand.com' }
]);

const DRAWER_INCLUSIONS_STANDARD = [
  'Advance Purchase (Non-Refundable)',
  'Member Exclusive Rate',
  'Mobile App Exclusive',
  'Corporate Negotiated BAR',
  'Bed & Breakfast Package',
  'Club Only Special Rates',
  'Best Available Rate (BAR)'
];

const DRAWER_INCLUSIONS_SUITE = ['GDS Only Special Rates', 'Best Available Rate (BAR)'];

const DRAWER_INCLUSIONS_DELUXE = ['Deluxe Club Special Rates', 'Best Available Rate (BAR)'];

function parseSuiteRateInput(raw: string): number {
  const digits = raw.replace(/\D/g, '');
  if (digits === '') return 0;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Demo: first N columns keep Navigator competitor data; rest simulate “past 365-day” limit. */
const NAVIGATOR_DEMO_COVERED_COLUMNS = 10;

export function PropertyInventoryTable({
  navigatorIntelligenceUnlocked = false,
  extendedUnoBeyondNavigator = false,
  onRequestNavigatorTrial,
  lockedNavigatorPreviewDismissed = false,
  onDismissLockedNavigatorPreview,
  navigatorTrialRequestSubmitted = false,
  navigatorUpgradeRequestSubmitted = false,
  onNavigatorUpgradeRequestAcknowledged,
  navigatorUpsellContext = 'limited'
}: {
  /** When false, the competitor preview row shows an upsell to Navigator trial. */
  navigatorIntelligenceUnlocked?: boolean;
  /** Subscribed: UNO range extends beyond Navigator’s 1-year market-data window (demo). */
  extendedUnoBeyondNavigator?: boolean;
  onRequestNavigatorTrial?: () => void;
  /** Limited flow only: user hid the locked Navigator preview block for all room types. */
  lockedNavigatorPreviewDismissed?: boolean;
  onDismissLockedNavigatorPreview?: () => void;
  /** Limited flow: user submitted the trial request form; trial is pending activation (not instant). */
  navigatorTrialRequestSubmitted?: boolean;
  /** Post–trial: user acknowledged the upgrade request; trial-ended CTAs show sent state. */
  navigatorUpgradeRequestSubmitted?: boolean;
  onNavigatorUpgradeRequestAcknowledged?: () => void;
  /** Locked-row messaging: never subscribed vs 30-day preview ended. */
  navigatorUpsellContext?: 'limited' | 'trial_expired';
} = {}) {
  const [isPropertyDetailsExpanded, setIsPropertyDetailsExpanded] = useState(false);
  const [isStandardRoomExpanded, setIsStandardRoomExpanded] = useState(false);
  const [isSuiteExpanded, setIsSuiteExpanded] = useState(false);
  const [isDeluxeRoomExpanded, setIsDeluxeRoomExpanded] = useState(false);
  
  const [suiteGdsRates, setSuiteGdsRates] = useState<number[]>(() => [...SUITE_GDS_BASELINE]);
  const [suiteBarRates, setSuiteBarRates] = useState<number[]>(() => [...SUITE_BAR_BASELINE]);
  /** Indices where user committed a change (blur/Enter) that differs from baseline — orange highlight */
  const [suiteGdsEditedCells, setSuiteGdsEditedCells] = useState<Set<number>>(new Set());
  const [suiteBarEditedCells, setSuiteBarEditedCells] = useState<Set<number>>(new Set());

  const applySuiteGdsRate = (index: number, value: string) => {
    const n = parseSuiteRateInput(value);
    setSuiteGdsRates((prev) => {
      const next = [...prev];
      next[index] = n;
      return next;
    });
  };

  const applySuiteBarRate = (index: number, value: string) => {
    const n = parseSuiteRateInput(value);
    setSuiteBarRates((prev) => {
      const next = [...prev];
      next[index] = n;
      return next;
    });
  };

  const syncSuiteGdsEditedFlag = (index: number, value: string) => {
    const n = parseSuiteRateInput(value);
    setSuiteGdsEditedCells((prev) => {
      const next = new Set(prev);
      if (n !== SUITE_GDS_BASELINE[index]) next.add(index);
      else next.delete(index);
      return next;
    });
  };

  const syncSuiteBarEditedFlag = (index: number, value: string) => {
    const n = parseSuiteRateInput(value);
    setSuiteBarEditedCells((prev) => {
      const next = new Set(prev);
      if (n !== SUITE_BAR_BASELINE[index]) next.add(index);
      else next.delete(index);
      return next;
    });
  };

  /** Table: call on blur / after Enter (blur) */
  const commitSuiteGdsCell = (index: number, value: string) => {
    applySuiteGdsRate(index, value);
    syncSuiteGdsEditedFlag(index, value);
  };

  const commitSuiteBarCell = (index: number, value: string) => {
    applySuiteBarRate(index, value);
    syncSuiteBarEditedFlag(index, value);
  };

  /** Drawer: keep chart in sync and mark edited when value ≠ baseline */
  const updateSuiteGdsRateFromDrawer = (index: number, value: string) => {
    applySuiteGdsRate(index, value);
    syncSuiteGdsEditedFlag(index, value);
  };

  const updateSuiteBarRateFromDrawer = (index: number, value: string) => {
    applySuiteBarRate(index, value);
    syncSuiteBarEditedFlag(index, value);
  };

  /** Drawer edits the row that currently drives the room-level cheapest rate for that date. */
  const updateSuiteCheapestFromDrawer = (index: number, value: string) => {
    const g = suiteGdsRates[index];
    const b = suiteBarRates[index];
    if (g <= b) updateSuiteGdsRateFromDrawer(index, value);
    else updateSuiteBarRateFromDrawer(index, value);
  };

  const suiteRoomCheapest = useMemo(() => {
    const rates: number[] = [];
    const meta: Array<{ ratePlan: string; channel: string }> = [];
    for (let i = 0; i < suiteGdsRates.length; i++) {
      const g = suiteGdsRates[i];
      const b = suiteBarRates[i];
      if (g <= b) {
        rates.push(g);
        meta.push({ ratePlan: 'GDS Only Special Rates', channel: 'GDS' });
      } else {
        rates.push(b);
        meta.push({ ratePlan: 'BAR', channel: 'Brand.com' });
      }
    }
    return { rates, meta };
  }, [suiteGdsRates, suiteBarRates]);

  // Generate competitor rate data (min, avg, max) + demo rate plan / channel labels for room-level tooltips
  const getCompetitorRatesForDate = (dateIndex: number, baseRate: number): RoomLevelCompetitorRates => {
    // Create varied scenarios - some rates will be above max, below min, and in between
    const scenarios = [
      // Scenario 1: Rate within range
      { minVariance: -0.15, maxVariance: 0.20, avgOffset: 0.02 },
      // Scenario 2: Rate BELOW minimum (aggressive pricing)
      { minVariance: 0.10, maxVariance: 0.35, avgOffset: 0.22 },
      // Scenario 3: Rate within range
      { minVariance: -0.12, maxVariance: 0.18, avgOffset: 0.03 },
      // Scenario 4: Rate ABOVE maximum (premium pricing)
      { minVariance: -0.25, maxVariance: -0.05, avgOffset: -0.15 },
      // Scenario 5: Rate within range
      { minVariance: -0.10, maxVariance: 0.22, avgOffset: 0.06 },
      // Scenario 6: Rate within range
      { minVariance: -0.18, maxVariance: 0.15, avgOffset: -0.01 },
      // Scenario 7: Rate BELOW minimum
      { minVariance: 0.08, maxVariance: 0.28, avgOffset: 0.18 },
      // Scenario 8: Rate ABOVE maximum
      { minVariance: -0.30, maxVariance: -0.08, avgOffset: -0.19 },
      // Scenario 9: Rate within range
      { minVariance: -0.14, maxVariance: 0.16, avgOffset: 0.01 },
      // Scenario 10: Rate within range (weekend)
      { minVariance: -0.20, maxVariance: 0.25, avgOffset: 0.02 },
      // Scenario 11: Rate ABOVE maximum
      { minVariance: -0.28, maxVariance: -0.10, avgOffset: -0.19 },
      // Scenario 12: Rate within range
      { minVariance: -0.15, maxVariance: 0.20, avgOffset: 0.02 },
      // Scenario 13: Rate BELOW minimum
      { minVariance: 0.12, maxVariance: 0.32, avgOffset: 0.22 },
      // Scenario 14: Rate within range (last date)
      { minVariance: -0.10, maxVariance: 0.18, avgOffset: 0.04 }
    ];
    
    // Get scenario for this date, or use a default if index out of range
    const scenario = scenarios[dateIndex] || scenarios[0];
    
    // Calculate competitor rates based on scenario
    const min = Math.round(baseRate * (1 + scenario.minVariance));
    const max = Math.round(baseRate * (1 + scenario.maxVariance));
    const avg = Math.round(baseRate * (1 + scenario.avgOffset));

    const h = dateIndex * 47 + (Math.round(baseRate) % 17);
    return {
      min,
      avg,
      max,
      competitorMinRatePlan: COMP_MIN_PLANS[h % COMP_MIN_PLANS.length],
      competitorMinChannel: COMP_CHANNELS[(h + 2) % COMP_CHANNELS.length],
      competitorMaxRatePlan: COMP_MAX_PLANS[(h + 5) % COMP_MAX_PLANS.length],
      competitorMaxChannel: COMP_CHANNELS[(h + 1) % COMP_CHANNELS.length]
    };
  };

  const dates: DateCell[] = [
    { day: 'Wed', date: '21', month: 'Jan' },
    { day: 'Thu', date: '22', month: 'Jan' },
    { day: 'Fri', date: '23', month: 'Jan' },
    { day: 'Sat', date: '24', month: 'Jan' },
    { day: 'Sun', date: '25', month: 'Jan' },
    { day: 'Mon', date: '26', month: 'Jan' },
    { day: 'Tue', date: '27', month: 'Jan' },
    { day: 'Wed', date: '28', month: 'Jan' },
    { day: 'Thu', date: '29', month: 'Jan' },
    { day: 'Fri', date: '30', month: 'Jan' },
    { day: 'Sat', date: '31', month: 'Jan' },
    { day: 'Sun', date: '01', month: 'Feb' },
    { day: 'Mon', date: '02', month: 'Feb' },
    { day: 'Tue', date: '03', month: 'Feb' },
  ];

  const navigatorUnavailableFromIndex = useMemo(() => {
    if (!navigatorIntelligenceUnlocked || !extendedUnoBeyondNavigator) return null;
    return demoNavigatorUnavailableFromColumnIndex(dates.length, NAVIGATOR_DEMO_COVERED_COLUMNS);
  }, [navigatorIntelligenceUnlocked, extendedUnoBeyondNavigator, dates.length]);
  
  // Event data for each date - red: important, amber: medium, green: less important
  const events = [
    null, // Jan 21
    null, // Jan 22
    null, // Jan 23
    { 
      name: 'Winter Festival', 
      dateRange: 'Jan 24 - Jan 26', 
      importance: 'medium',
      demandLevel: 'High Demand',
      demandIndex: 38,
      demandMultiplier: '2.0x',
      confidenceScore: '95%'
    }, // Jan 24
    { 
      name: 'Winter Festival', 
      dateRange: 'Jan 24 - Jan 26', 
      importance: 'high',
      demandLevel: 'Very High Demand',
      demandIndex: 45,
      demandMultiplier: '2.5x',
      confidenceScore: '98%'
    }, // Jan 25
    { 
      name: 'Winter Festival', 
      dateRange: 'Jan 24 - Jan 26', 
      importance: 'medium',
      demandLevel: 'High Demand',
      demandIndex: 40,
      demandMultiplier: '2.2x',
      confidenceScore: '96%'
    }, // Jan 26
    null, // Jan 27
    { 
      name: 'Business Conference', 
      dateRange: 'Jan 28 - Jan 29', 
      importance: 'low',
      demandLevel: 'Medium Demand',
      demandIndex: 28,
      demandMultiplier: '1.5x',
      confidenceScore: '89%'
    }, // Jan 28
    { 
      name: 'Business Conference', 
      dateRange: 'Jan 28 - Jan 29', 
      importance: 'low',
      demandLevel: 'Medium Demand',
      demandIndex: 30,
      demandMultiplier: '1.6x',
      confidenceScore: '90%'
    }, // Jan 29
    { 
      name: 'Weekend Market', 
      dateRange: 'Jan 30 - Feb 01', 
      importance: 'medium',
      demandLevel: 'High Demand',
      demandIndex: 42,
      demandMultiplier: '2.3x',
      confidenceScore: '94%'
    }, // Jan 30
    { 
      name: 'Weekend Market', 
      dateRange: 'Jan 30 - Feb 01', 
      importance: 'high',
      demandLevel: 'Very High Demand',
      demandIndex: 48,
      demandMultiplier: '2.8x',
      confidenceScore: '99%'
    }, // Jan 31
    { 
      name: 'Weekend Market', 
      dateRange: 'Jan 30 - Feb 01', 
      importance: 'medium',
      demandLevel: 'High Demand',
      demandIndex: 39,
      demandMultiplier: '2.1x',
      confidenceScore: '93%'
    }, // Feb 01
    null, // Feb 02
    null, // Feb 03
  ];

  /**
   * Per-room competitor analysis. Replaces the heavy candlestick chart with a
   * lightweight per-date info icon plus an on-demand drawer. Hooks must be unconditional;
   * the derived data is only surfaced visually when Navigator is unlocked.
   */
  const standardAnalysis = useRoomCompetitorAnalysis({
    dates,
    rates: STANDARD_SYSTEM_CHEAPEST.rates,
    myRateMeta: STANDARD_SYSTEM_CHEAPEST.meta,
    getCompetitorRates: getCompetitorRatesForDate,
    roomType: 'Standard Room',
    drawerInclusionPlanNames: DRAWER_INCLUSIONS_STANDARD,
    ratePlan: 'Room aggregate (cheapest rate plan per day)',
    events,
    navigatorUnavailableFromIndex
  });

  const suiteAnalysis = useRoomCompetitorAnalysis({
    dates,
    rates: suiteRoomCheapest.rates,
    myRateMeta: suiteRoomCheapest.meta,
    competitorBaseRates: SUITE_ROOM_COMPETITOR_BASELINE,
    getCompetitorRates: getCompetitorRatesForDate,
    onYourRatesChange: updateSuiteCheapestFromDrawer,
    roomType: 'Suite',
    drawerInclusionPlanNames: DRAWER_INCLUSIONS_SUITE,
    ratePlan: 'Room aggregate (cheapest rate plan per day)',
    events,
    navigatorUnavailableFromIndex
  });

  const deluxeAnalysis = useRoomCompetitorAnalysis({
    dates,
    rates: DELUXE_ROOM_CHEAPEST.rates,
    myRateMeta: DELUXE_ROOM_CHEAPEST.meta,
    getCompetitorRates: getCompetitorRatesForDate,
    roomType: 'Deluxe Room',
    drawerInclusionPlanNames: DRAWER_INCLUSIONS_DELUXE,
    ratePlan: 'Room aggregate (cheapest rate plan per day)',
    events,
    navigatorUnavailableFromIndex
  });

  // Icon components matching Figma exactly
  const IconLock = () => (
    <div className="relative shrink-0 size-[12px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
        <g>
          <path d={svgPaths.p2b283480} stroke="#FF5E01" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.pbc77700} stroke="#FF5E01" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );

  const IconZap = () => (
    <div className="relative shrink-0 size-[14px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g>
          <path d={svgPaths.p27661e00} stroke="#D500FF" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );

  return (
    <div className="space-y-0">
      {/* Scrollable container wrapping all sections */}
      <div className="relative">
        <button className="absolute left-[298px] top-[14.5px] z-10 w-7 h-10 flex items-center justify-center bg-white border border-[#e0e0e0] hover:bg-gray-50">
          <ChevronLeft className="w-4 h-4 text-[#999999]" />
        </button>
        <button className="absolute right-0 top-[14.5px] z-10 w-7 h-10 flex items-center justify-center bg-white border border-[#e0e0e0] hover:bg-gray-50">
          <ChevronRight className="w-4 h-4 text-[#999999]" />
        </button>

        <div className="overflow-x-auto">
          {/* Date Header Row - Shared */}
          <div className="bg-white shadow-sm">
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed', minWidth: '1450px' }}>
              <colgroup>
                <col style={{ width: '240px' }} />
                <col style={{ width: '90px' }} />
                {dates.map((_, idx) => (
                  <col key={idx} style={{ width: '80px' }} />
                ))}
              </colgroup>
              <thead>
                <tr className="bg-[#fafafa] h-[69px]">
                  <th className="border-b border-[#e0e0e0] px-4 py-2"></th>
                  <th className="border-r border-b border-[#e0e0e0] px-3 py-2"></th>
                  {dates.map((date, idx) => (
                    <th key={idx} className="border-r border-b border-[#e0e0e0] px-3 py-2 relative group/date">
                      <div className="flex flex-col items-center justify-center h-[52.5px] relative">
                        <span className="text-[10px] font-bold text-[#999999] leading-[15px]">{date.day}</span>
                        <span className="text-[15px] font-semibold text-[#333333] leading-[22.5px]">{date.date}</span>
                        <span className="text-[10px] font-bold text-[#999999] leading-[15px]">{date.month}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>

          {/* Property Details Section */}
          <div className="bg-white shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1),0px_2px_4px_0px_rgba(0,0,0,0.1)] mb-3">
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed', minWidth: '1450px' }}>
              <colgroup>
                <col style={{ width: '240px' }} />
                <col style={{ width: '90px' }} />
                {dates.map((_, idx) => (
                  <col key={idx} style={{ width: '80px' }} />
                ))}
              </colgroup>
              <tbody>
                <tr className="border-b border-[#e0e0e0] h-[48.5px]">
                  <td className="px-4 py-3 bg-white border-r-0">
                    <button
                      onClick={() => setIsPropertyDetailsExpanded(!isPropertyDetailsExpanded)}
                      className="flex items-center gap-2 w-full text-left"
                    >
                      {isPropertyDetailsExpanded ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 14 14">
                          <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                          <path d="M6 12L10 8L6 4" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                        </svg>
                      )}
                      <span className="text-[13px] font-semibold text-[#333333] leading-[19.5px]">Property Details</span>
                    </button>
                  </td>
                  <td className="px-2 py-3 border-r border-[#e0e0e0] bg-white align-top">
                    <div className="flex flex-col items-start">
                      <span className="text-[11px] font-medium text-[#666666] leading-[16.5px]">Inventory</span>
                    </div>
                  </td>
                  {dates.map((_, idx) => (
                    <td key={idx} className="px-3 py-3 text-center border-r border-[#e0e0e0] bg-white">
                      <span className="text-[13px] font-semibold text-[#333333] leading-[19.5px]">44</span>
                    </td>
                  ))}
                </tr>

                {isPropertyDetailsExpanded && (
                  <>
                    {/* Sold Row */}
                    <tr className="border-b border-[#e0e0e0]">
                      <td className="px-4 py-3 bg-white border-r-0">
                        <span className="text-[13px] text-[#333333] pl-6">Sold</span>
                      </td>
                      <td className="px-3 py-3 text-center border-r border-[#e0e0e0] bg-white"></td>
                      {dates.map((_, idx) => (
                        <td key={idx} className="px-3 py-3 text-center border-r border-[#e0e0e0] bg-white">
                          <span className="text-[13px] text-[#999999]">-</span>
                        </td>
                      ))}
                    </tr>

                    {/* Over Booking Row */}
                    <tr className="border-b border-[#e0e0e0]">
                      <td className="px-4 py-3 bg-white border-r-0">
                        <span className="text-[13px] text-[#333333] pl-6">Over Booking</span>
                      </td>
                      <td className="px-3 py-3 text-center border-r border-[#e0e0e0] bg-white"></td>
                      {dates.map((_, idx) => (
                        <td key={idx} className="px-3 py-3 text-center border-r border-[#e0e0e0] bg-white">
                          <span className="text-[13px] text-[#999999]">-</span>
                        </td>
                      ))}
                    </tr>

                    {/* Occupancy Row */}
                    <tr className="border-b border-[#e0e0e0]">
                      <td className="px-4 py-3 bg-white border-r-0">
                        <span className="text-[13px] text-[#333333] pl-6">Occupancy</span>
                      </td>
                      <td className="px-3 py-3 text-center border-r border-[#e0e0e0] bg-white"></td>
                      {dates.map((_, idx) => (
                        <td key={idx} className="px-3 py-3 text-center border-r border-[#e0e0e0] bg-white">
                          <span className="text-[13px] text-[#999999]">-</span>
                        </td>
                      ))}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Standard Room Section */}
          <div className="bg-white shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1),0px_2px_4px_0px_rgba(0,0,0,0.1)] mb-3">
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed', minWidth: '1450px' }}>
              <colgroup>
                <col style={{ width: '240px' }} />
                <col style={{ width: '90px' }} />
                {dates.map((_, idx) => (
                  <col key={idx} style={{ width: '80px' }} />
                ))}
              </colgroup>
              <tbody>
                {/* Standard Room Header Row */}
                <tr className="border-b border-[#e0e0e0] h-[57.5px]" data-tour="room-accordion">
                  <td className="px-4 py-3 bg-white border-r-0">
                    <button
                      onClick={() => setIsStandardRoomExpanded(!isStandardRoomExpanded)}
                      className="flex w-full min-w-0 items-center gap-2 text-left"
                      data-tour="room-chevron"
                    >
                      <span
                        className="flex shrink-0 items-center justify-center"
                        data-tour="room-chevron-icon"
                        aria-hidden
                      >
                        {isStandardRoomExpanded ? (
                          <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 14 14">
                            <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                            <path d="M6 12L10 8L6 4" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                          </svg>
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 break-words text-[12px] font-semibold text-[#333333] leading-[18px]">
                          Standard Room
                        </div>
                        <div className="truncate text-[10px] font-medium italic text-[#999999] leading-[15px]">STD</div>
                      </div>
                    </button>
                  </td>
                  <td className="px-2 py-3 border-r border-[#e0e0e0] bg-white align-top">
                    <div className="flex flex-col items-start gap-1.5">
                      <span className="text-[11px] font-medium text-[#666666] leading-[16.5px]">Inventory</span>
                      {navigatorIntelligenceUnlocked && (
                        <RoomViewDetailsButton
                          onClick={standardAnalysis.openDetails}
                          dataTour="view-details-button"
                        />
                      )}
                    </div>
                  </td>
                  {dates.map((_, idx) => {
                    const cellUnavailable = standardAnalysis.isCellNavigatorUnavailable(idx);
                    const showCompetitorInfo = navigatorIntelligenceUnlocked && !cellUnavailable;
                    const datum = standardAnalysis.chartData[idx];
                    return (
                      <td
                        key={idx}
                        className="px-3 py-3 text-center border-r border-[#e0e0e0] bg-white relative"
                        data-tour={navigatorIntelligenceUnlocked && idx === 0 ? 'rate-chart' : undefined}
                      >
                        <span className="text-[13px] font-normal text-[#333333] leading-[19.5px]">5</span>
                        <div className="absolute bottom-0 left-[0.5px] right-0 h-[3px] bg-[#4ecdc4] w-[79px]"></div>
                        {showCompetitorInfo && (
                          <RoomDateInfoIcon
                            data={datum}
                            roomTitle="Standard Room"
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>

                {isStandardRoomExpanded && (
                  <>
                    {!navigatorIntelligenceUnlocked && !lockedNavigatorPreviewDismissed && (
                      <NavigatorIntelligenceLockedRow
                        dates={dates}
                        onRequestTrial={() => onRequestNavigatorTrial?.()}
                        onDismissPreview={onDismissLockedNavigatorPreview}
                        trialRequestSubmitted={navigatorTrialRequestSubmitted}
                        navigatorUpgradeRequestSubmitted={navigatorUpgradeRequestSubmitted}
                        onNavigatorUpgradeRequestAcknowledged={onNavigatorUpgradeRequestAcknowledged}
                        navigatorUpsellContext={navigatorUpsellContext}
                      />
                    )}

                    {/* Club Only Special Rates */}
                    <tr className="border-b border-[#e0e0e0]">
                      <td className="px-4 py-2.5 bg-white border-r-0">
                        <div className="pl-4 pr-2 py-1">
                          <div className="text-[11px] font-medium text-[#333333]">
                            Club Only Special Rates With Breakfast And Complementary...
                          </div>
                          <div className="text-[10px] font-medium italic text-[#999999]">GDSR</div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center border-r border-[#e0e0e0] bg-white">
                        <span className="text-[10px] font-normal text-[#666666]">Rates (EUR)</span>
                      </td>
                      <td className="px-3 py-2.5 text-center border-r border-[#e0e0e0] bg-white">
                        <span className="text-[12px] font-normal text-[#333333]">{STANDARD_CLUB_RATES[0]}</span>
                      </td>
                      {STANDARD_CLUB_RATES.slice(1).map((rate, idx) => (
                        <td key={idx} className="px-3 py-2.5 text-center border-r border-[#e0e0e0] bg-white">
                          <span className="text-[12px] font-normal text-[#333333]">{rate}</span>
                        </td>
                      ))}
                    </tr>

                    {/* BAR */}
                    <tr className="border-b border-[#e0e0e0]">
                      <td className="px-4 py-2.5 bg-white border-r-0">
                        <div className="pl-4 pr-2 py-1">
                          <div className="text-[11px] font-semibold text-[#333333]">BAR</div>
                          <div className="text-[10px] font-medium italic text-[#999999]">BAR</div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center border-r border-[#e0e0e0] bg-white">
                        <span className="text-[10px] font-normal text-[#666666]">Rates (EUR)</span>
                      </td>
                      {STANDARD_BAR_RATES.map((rate, idx) => (
                        <td key={idx} className="px-3 py-2.5 text-center border-r border-[#e0e0e0] bg-white">
                          <span className="text-[12px] font-normal text-[#333333]">{rate}</span>
                        </td>
                      ))}
                    </tr>

                    {/* Standard Room rate plans (Advance / Member / Mobile / Corporate / B&B) */}
                    {[
                      {
                        id: 'std-advance',
                        title: 'Advance Purchase (Non-Refundable)',
                        code: 'ADV-NR',
                        rates: STANDARD_ADVANCE_RATES
                      },
                      {
                        id: 'std-member',
                        title: 'Member Exclusive Rate',
                        code: 'MEM',
                        rates: STANDARD_MEMBER_RATES
                      },
                      {
                        id: 'std-mobile',
                        title: 'Mobile App Exclusive',
                        code: 'MOB',
                        rates: STANDARD_MOBILE_RATES
                      },
                      {
                        id: 'std-corporate',
                        title: 'Corporate Negotiated BAR',
                        code: 'CORP',
                        rates: STANDARD_CORPORATE_RATES
                      },
                      {
                        id: 'std-bnb',
                        title: 'Bed & Breakfast Package',
                        code: 'BBPKG',
                        rates: STANDARD_BNB_RATES
                      }
                    ].map((plan) => (
                      <tr key={plan.id} className="border-b border-[#e0e0e0]">
                        <td className="px-4 py-2.5 bg-white border-r-0">
                          <div className="pl-4 pr-2 py-1">
                            <div className="text-[11px] font-medium text-[#333333]">{plan.title}</div>
                            <div className="text-[10px] font-medium italic text-[#999999]">{plan.code}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center border-r border-[#e0e0e0] bg-white">
                          <span className="text-[10px] font-normal text-[#666666]">Rates (EUR)</span>
                        </td>
                        {plan.rates.map((rate, idx) => (
                          <td key={idx} className="px-3 py-2.5 text-center border-r border-[#e0e0e0] bg-white">
                            <span className="text-[12px] font-normal text-[#333333]">{rate}</span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
            {standardAnalysis.modalElement}
          </div>

          {/* Suite Section */}
          <div className="bg-white shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1),0px_2px_4px_0px_rgba(0,0,0,0.1)] mb-3">
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed', minWidth: '1450px' }}>
              <colgroup>
                <col style={{ width: '240px' }} />
                <col style={{ width: '90px' }} />
                {dates.map((_, idx) => (
                  <col key={idx} style={{ width: '80px' }} />
                ))}
              </colgroup>
              <tbody>
                {/* Suite Header Row */}
                <tr className="border-b border-[#e0e0e0] bg-[#dde9f7]">
                  <td className="px-4 py-3 border-r-0">
                    <button
                      onClick={() => setIsSuiteExpanded(!isSuiteExpanded)}
                      className="flex w-full min-w-0 items-center gap-2 text-left"
                    >
                      {isSuiteExpanded ? (
                        <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 14 14">
                          <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                          <path d="M6 12L10 8L6 4" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                        </svg>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 break-words text-[12px] font-semibold text-[#333333] leading-[18px]">
                          Suite
                        </div>
                        <div className="truncate text-[10px] font-medium italic text-[#666666] leading-[15px]">SUI7</div>
                      </div>
                    </button>
                  </td>
                  <td className="px-2 py-3 border-r border-[#e0e0e0] align-top">
                    <div className="flex flex-col items-start gap-1.5">
                      <span className="text-[11px] font-medium text-[#666666] leading-[16.5px]">Inventory</span>
                      {navigatorIntelligenceUnlocked && (
                        <RoomViewDetailsButton onClick={suiteAnalysis.openDetails} />
                      )}
                    </div>
                  </td>
                  {dates.map((_, idx) => {
                    const cellUnavailable = suiteAnalysis.isCellNavigatorUnavailable(idx);
                    const showCompetitorInfo = navigatorIntelligenceUnlocked && !cellUnavailable;
                    const datum = suiteAnalysis.chartData[idx];
                    return (
                      <td
                        key={idx}
                        className="px-3 py-3 text-center border-r border-[#e0e0e0] relative"
                      >
                        <span className="text-[13px] font-normal text-[#333333] leading-[19.5px]">19</span>
                        {showCompetitorInfo && (
                          <RoomDateInfoIcon
                            data={datum}
                            roomTitle="Suite"
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>

                {isSuiteExpanded && (
                  <>
                    {!navigatorIntelligenceUnlocked && !lockedNavigatorPreviewDismissed && (
                      <NavigatorIntelligenceLockedRow
                        dates={dates}
                        onRequestTrial={() => onRequestNavigatorTrial?.()}
                        onDismissPreview={onDismissLockedNavigatorPreview}
                        trialRequestSubmitted={navigatorTrialRequestSubmitted}
                        navigatorUpgradeRequestSubmitted={navigatorUpgradeRequestSubmitted}
                        onNavigatorUpgradeRequestAcknowledged={onNavigatorUpgradeRequestAcknowledged}
                        navigatorUpsellContext={navigatorUpsellContext}
                      />
                    )}

                    {/* GDS Only Special Rates */}
                    <tr className="border-b border-[#e0e0e0]">
                      <td className="px-4 py-2.5 bg-white border-r-0">
                        <div className="pl-4 pr-2 py-1">
                          <div className="text-[11px] font-medium text-[#333333]">
                            GDS Only Special Rates With Breakfast And Complementary...
                          </div>
                          <div className="text-[10px] font-medium italic text-[#999999]">GDSN</div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center border-r border-[#e0e0e0] bg-white">
                        <span className="text-[10px] font-normal text-[#666666]">Rates (EUR)</span>
                      </td>
                      {suiteGdsRates.map((rate, idx) => {
                        const isEdited = suiteGdsEditedCells.has(idx);
                        return (
                        <td
                          key={idx}
                          className="px-2 py-2 text-center border-r border-[#e0e0e0] bg-white"
                        >
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            aria-label={`Suite GDS rate ${dates[idx]?.day} ${dates[idx]?.date} ${dates[idx]?.month}`}
                            value={rate === 0 ? '' : String(rate)}
                            onChange={(e) => applySuiteGdsRate(idx, e.target.value)}
                            onBlur={(e) => commitSuiteGdsCell(idx, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            className={`mx-auto block w-[3.25rem] h-7 text-center text-[11px] rounded-full tabular-nums border ${
                              isEdited
                                ? 'border-orange-400 text-orange-700 bg-orange-50'
                                : 'border-[#d0d0d0] text-[#333333] bg-white'
                            }`}
                          />
                        </td>
                        );
                      })}
                    </tr>

                    {/* BAR under Suite */}
                    <tr className="border-b border-[#e0e0e0]">
                      <td className="px-4 py-2.5 bg-white border-r-0">
                        <div className="pl-4 pr-2 py-1">
                          <div className="text-[11px] font-semibold text-[#333333]">BAR</div>
                          <div className="text-[10px] font-medium italic text-[#999999]">BAR</div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center border-r border-[#e0e0e0] bg-white">
                        <span className="text-[10px] font-normal text-[#666666]">Rates (EUR)</span>
                      </td>
                      {suiteBarRates.map((rate, idx) => {
                        const isEdited = suiteBarEditedCells.has(idx);
                        return (
                        <td key={idx} className="px-2 py-2 text-center border-r border-[#e0e0e0] bg-white">
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            aria-label={`Suite BAR rate ${dates[idx]?.day} ${dates[idx]?.date} ${dates[idx]?.month}`}
                            value={rate === 0 ? '' : String(rate)}
                            onChange={(e) => applySuiteBarRate(idx, e.target.value)}
                            onBlur={(e) => commitSuiteBarCell(idx, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            className={`mx-auto block w-[3.25rem] h-7 text-center text-[11px] rounded-full tabular-nums border ${
                              isEdited
                                ? 'border-orange-400 text-orange-700 bg-orange-50'
                                : 'border-[#d0d0d0] text-[#333333] bg-white'
                            }`}
                          />
                        </td>
                        );
                      })}
                    </tr>

                  </>
                )}
              </tbody>
            </table>
            {suiteAnalysis.modalElement}
          </div>

          {/* Deluxe Room Section */}
          <div className="bg-white shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1),0px_2px_4px_0px_rgba(0,0,0,0.1)] mb-3">
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed', minWidth: '1450px' }}>
              <colgroup>
                <col style={{ width: '240px' }} />
                <col style={{ width: '90px' }} />
                {dates.map((_, idx) => (
                  <col key={idx} style={{ width: '80px' }} />
                ))}
              </colgroup>
              <tbody>
                {/* Deluxe Room Header Row */}
                <tr className="h-[57.5px]">
                  <td className="px-4 py-3 bg-white border-r-0">
                    <button
                      onClick={() => setIsDeluxeRoomExpanded(!isDeluxeRoomExpanded)}
                      className="flex w-full min-w-0 items-center gap-2 text-left"
                    >
                      {isDeluxeRoomExpanded ? (
                        <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 14 14">
                          <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                          <path d="M6 12L10 8L6 4" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                        </svg>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 break-words text-[12px] font-semibold text-[#333333] leading-[18px]">
                          Deluxe Room
                        </div>
                        <div className="truncate text-[10px] font-medium italic text-[#999999] leading-[15px]">DLX</div>
                      </div>
                    </button>
                  </td>
                  <td className="px-2 py-3 border-r border-[#e0e0e0] bg-white align-top">
                    <div className="flex flex-col items-start gap-1.5">
                      <span className="text-[11px] font-medium text-[#666666] leading-[16.5px]">Inventory</span>
                      {navigatorIntelligenceUnlocked && (
                        <RoomViewDetailsButton onClick={deluxeAnalysis.openDetails} />
                      )}
                    </div>
                  </td>
                  {dates.map((_, idx) => {
                    const cellUnavailable = deluxeAnalysis.isCellNavigatorUnavailable(idx);
                    const showCompetitorInfo = navigatorIntelligenceUnlocked && !cellUnavailable;
                    const datum = deluxeAnalysis.chartData[idx];
                    return (
                      <td
                        key={idx}
                        className="px-3 py-3 text-center border-r border-[#e0e0e0] bg-white relative"
                      >
                        <span className="text-[13px] font-normal text-[#333333] leading-[19.5px]">5</span>
                        <div className="absolute bottom-0 left-[0.5px] right-0 h-[3px] bg-[#4ecdc4] w-[79px]"></div>
                        {showCompetitorInfo && (
                          <RoomDateInfoIcon
                            data={datum}
                            roomTitle="Deluxe Room"
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>

                {isDeluxeRoomExpanded && (
                  <>
                    {!navigatorIntelligenceUnlocked && !lockedNavigatorPreviewDismissed && (
                      <NavigatorIntelligenceLockedRow
                        dates={dates}
                        onRequestTrial={() => onRequestNavigatorTrial?.()}
                        onDismissPreview={onDismissLockedNavigatorPreview}
                        trialRequestSubmitted={navigatorTrialRequestSubmitted}
                        navigatorUpgradeRequestSubmitted={navigatorUpgradeRequestSubmitted}
                        onNavigatorUpgradeRequestAcknowledged={onNavigatorUpgradeRequestAcknowledged}
                        navigatorUpsellContext={navigatorUpsellContext}
                      />
                    )}

                    {/* Deluxe special rates */}
                    <tr className="border-b border-[#e0e0e0]">
                      <td className="px-4 py-2.5 bg-white border-r-0">
                        <div className="pl-4 pr-2 py-1">
                          <div className="text-[11px] font-medium text-[#333333]">
                            Deluxe Club Special Rates With Breakfast And Complementary...
                          </div>
                          <div className="text-[10px] font-medium italic text-[#999999]">DLXR</div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center border-r border-[#e0e0e0] bg-white">
                        <span className="text-[10px] font-normal text-[#666666]">Rates (EUR)</span>
                      </td>
                      <td className="px-3 py-2.5 text-center border-r border-[#e0e0e0] bg-white">
                        <span className="text-[12px] font-normal text-[#333333]">{DELUXE_CLUB_RATES[0]}</span>
                      </td>
                      {DELUXE_CLUB_RATES.slice(1).map((rate, idx) => (
                        <td key={idx} className="px-3 py-2.5 text-center border-r border-[#e0e0e0] bg-white">
                          <span className="text-[12px] font-normal text-[#333333]">{rate}</span>
                        </td>
                      ))}
                    </tr>

                    {/* BAR — Deluxe */}
                    <tr className="border-b border-[#e0e0e0]">
                      <td className="px-4 py-2.5 bg-white border-r-0">
                        <div className="pl-4 pr-2 py-1">
                          <div className="text-[11px] font-semibold text-[#333333]">BAR</div>
                          <div className="text-[10px] font-medium italic text-[#999999]">BAR</div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center border-r border-[#e0e0e0] bg-white">
                        <span className="text-[10px] font-normal text-[#666666]">Rates (EUR)</span>
                      </td>
                      {DELUXE_BAR_RATES.map((rate, idx) => (
                        <td key={idx} className="px-3 py-2.5 text-center border-r border-[#e0e0e0] bg-white">
                          <span className="text-[12px] font-normal text-[#333333]">{rate}</span>
                        </td>
                      ))}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
            {deluxeAnalysis.modalElement}
          </div>
        </div>
      </div>
    </div>
  );
}