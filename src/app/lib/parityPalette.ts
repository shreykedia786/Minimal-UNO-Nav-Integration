/**
 * Retired parity palette — Win / Meet / Loss. The product no longer surfaces parity,
 * but these constants stay so the (now-dead) parity helpers inside
 * `DetailedCompetitorModal` still type-check. Tree-shaken from the production bundle.
 */
export const PARITY_WIN_HEX = '#4BCE64';
export const PARITY_MEET_HEX = '#FFC51E';
export const PARITY_LOSS_HEX = '#E52E2E';

export const PARITY_PALETTE = {
  win: PARITY_WIN_HEX,
  meet: PARITY_MEET_HEX,
  loss: PARITY_LOSS_HEX
} as const;

/**
 * Your Rates column backgrounds when a date’s dominant outcome is Win / Meet / Loss.
 * Matches `DetailedCompetitorModal` `getYourRateParityColumnTint` (amber = Meet, not PARITY_MEET_HEX).
 */
export const PARITY_COLUMN_TINT = {
  win: { bg: '#ecfdf5', text: '#14532d' },
  meet: { bg: '#fffbeb', text: '#78350f' },
  loss: { bg: '#fee2e2', text: '#991b1b' }
} as const;

/** Stacked bar: Meet | Win | Loss (left → right). % labels: dark on meet/win, white on loss. */
export const PARITY_SEGMENT_PERCENT_CLASS = {
  meet: 'text-[10px] font-semibold tabular-nums text-[#1a1a1a]',
  win: 'text-[10px] font-semibold tabular-nums text-[#1a1a1a]',
  loss: 'text-[10px] font-semibold tabular-nums text-white'
} as const;
