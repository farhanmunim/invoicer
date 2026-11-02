/* Notes: short ones sit beside the totals (like the sheet), longer ones flow below across pages. */
import { COL, COLOR, CONTENT_W, MARGIN, NOTES_SIDE_MAX_LINES, SIZE } from "./constants.js";

export function planNotes(ctx) {
  const { state, wrap, lh } = ctx;
  const notes = String(state.notes || "").trim();
  const sideLines = notes ? wrap(notes, COL.descW, SIZE.body, false) : [];
  const sideBySide = sideLines.length > 0 && sideLines.length <= NOTES_SIDE_MAX_LINES;
  const height = lh(SIZE.small) + 1.5 + sideLines.length * lh(SIZE.body);
  return { notes, sideLines, sideBySide, height };
}

export function drawSideNotes(ctx, plan, top) {
  if (!plan.sideBySide) return;
  ctx.put("NOTES", MARGIN, top, SIZE.small, false, COLOR.muted);
  ctx.put(plan.sideLines, MARGIN, top + ctx.lh(SIZE.small) + 1.5, SIZE.body, false, COLOR.ink);
  ctx.y = Math.max(ctx.y, top + plan.height);
}

/* Longer notes flow across pages below the totals, line by line */
export function drawFlowNotes(ctx, plan) {
  if (!plan.notes || plan.sideBySide) return;
  const { put, wrap, lh, ensure } = ctx;
  const lines = wrap(plan.notes, CONTENT_W, SIZE.body, false);
  ensure(lh(SIZE.small) + lh(SIZE.body) * 2 + 2);
  put("NOTES", MARGIN, ctx.y, SIZE.small, false, COLOR.muted);
  ctx.y += lh(SIZE.small) + 1.5;
  lines.forEach((text) => {
    ensure(lh(SIZE.body));
    put(text, MARGIN, ctx.y, SIZE.body, false, COLOR.ink);
    ctx.y += lh(SIZE.body);
  });
}
