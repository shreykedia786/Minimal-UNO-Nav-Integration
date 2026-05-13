/**
 * Demo-only registry of dates where Navigator's independent scrape failed.
 *
 * Navigator crawls public-facing rates (your own and your compset) on a
 * schedule. When a scrape fails — site outage, captcha, rate-limit, parser
 * miss — Navigator has no rate to show for the affected date. The product
 * needs to communicate this clearly so users don't mistake "no data" for
 * "sold out" or "outside coverage".
 *
 * For the prototype we hard-code two non-consecutive mid-window date indices
 * so the failed state is visible alongside healthy dates, without dominating
 * the grid. These indices refer to the 14-date demo window in
 * `PropertyInventoryTable` (0 = Wed Jan 21, 4 = Sun Jan 25, 9 = Fri Jan 30).
 */
export const NAVIGATOR_SCRAPE_FAILED_DATE_INDICES: ReadonlyArray<number> = [4, 9];

/**
 * Returns `true` when Navigator's independent scrape failed to fetch any
 * rates (your own and compset) for the given global date index.
 *
 * Mutually exclusive in practice with "outside Navigator coverage" — the
 * UI should resolve coverage first, then check scrape status.
 */
export function isNavigatorScrapeFailed(globalDateIndex: number): boolean {
  return NAVIGATOR_SCRAPE_FAILED_DATE_INDICES.includes(globalDateIndex);
}
