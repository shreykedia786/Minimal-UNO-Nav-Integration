/**
 * Product rule: Navigator supplies competitor data for at most one year from the start of the
 * user’s selected date range. UNO Rates & Inventory can show pricing for a longer window.
 */
export const NAVIGATOR_COVERAGE_MAX_DAYS = 365;
export const UNO_DATE_RANGE_MAX_DAYS = 730;

/**
 * Demo: user picked a UNO range longer than Navigator’s limit; this table view is positioned so
 * trailing columns fall outside Navigator coverage. Returns null when the full visible grid is covered.
 */
export function demoNavigatorUnavailableFromColumnIndex(
  visibleColumnCount: number,
  /** Number of leading columns that still have Navigator data (must be < visibleColumnCount to activate). */
  navigatorCoversFirstColumns: number
): number | null {
  if (visibleColumnCount <= 0) return null;
  if (navigatorCoversFirstColumns >= visibleColumnCount) return null;
  return Math.max(0, Math.min(visibleColumnCount, navigatorCoversFirstColumns));
}

/** Copy for em-dash hovers when a date is outside Navigator’s coverage window (drawer + tables). */
export function navigatorOutsideCoverageTooltipBody(): string {
  return 'No data available for these dates.\nNavigator data is available for up to 1 year.';
}
