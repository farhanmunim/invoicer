/* Geometry, type sizes and colours for the A4 PDF. All lengths are millimetres unless noted. */

export const PAGE_W = 210;
export const PAGE_H = 297;
export const MARGIN = 18;
export const FOOTER_RESERVE = 10;
export const RIGHT = PAGE_W - MARGIN;
export const CONTENT_W = PAGE_W - MARGIN * 2;

export const PT_TO_MM = 0.3528;
export const LINE_HEIGHT = 1.45;
export const ROW_PAD = 2.5;

export const COLOR = { ink: [24, 24, 27], muted: [98, 98, 107], rule: [228, 228, 231], white: [255, 255, 255] };
export const SIZE = { name: 11, body: 10, small: 7.5, total: 13 };

// Table / party / totals column positions
export const COL = {
  descW: 94,
  qtyX: 134,
  rateX: 162,
  partyGap: 94,
  partyW: 80,
  totalsX: 118,
};

export const META_GAP = 38;
export const META_MAX_W = 36;
export const TOP_BAR_H = 5;
export const BAND_TINT = 0.07;
export const INSET = 2;
export const TOTALS_INSET = 3;
export const NOTES_SIDE_MAX_LINES = 6;
