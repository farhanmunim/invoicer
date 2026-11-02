/* Subtotal / discount / tax / total, with the short-notes block drawn alongside. */
import { COL, COLOR, RIGHT, SIZE } from "./constants.js";
import { drawSideNotes } from "./notes.js";

export function drawTotals(ctx, notesPlan) {
  const { put, fill, line, lh, ensure, theme, accent, state, data, totalsInset } = ctx;
  const { money, totals } = data;

  const rows = [["Subtotal", money(totals.subtotal)]];
  if (Number(state.discount) > 0) rows.push([`Discount (${Number(state.discount)}%)`, `-${money(totals.discountAmount)}`]);
  if (Number(state.tax) > 0) rows.push([`Tax (${Number(state.tax)}%)`, money(totals.taxAmount)]);
  const rowH = lh(SIZE.body) + 1.5;
  const blockH = lh(SIZE.total) + 6;
  const totalsH = rows.length * rowH + 1 + (theme.total === "block" ? blockH : lh(SIZE.total) + 3);
  ensure(Math.max(totalsH, notesPlan.sideBySide ? notesPlan.height : 0) + 8);

  const blockTop = ctx.y;
  rows.forEach(([label, value]) => {
    put(label, COL.totalsX + totalsInset, ctx.y, SIZE.body, false, COLOR.muted);
    put(value, RIGHT - totalsInset, ctx.y, SIZE.body, false, COLOR.ink, "right");
    ctx.y += rowH;
  });
  ctx.y += 1;

  if (theme.total === "block") {
    fill(COL.totalsX, ctx.y, RIGHT - COL.totalsX, blockH, accent);
    put("Total", COL.totalsX + totalsInset, ctx.y + 3.5, SIZE.total, true, COLOR.white);
    put(money(totals.total), RIGHT - totalsInset, ctx.y + 3.5, SIZE.total, true, COLOR.white, "right");
    ctx.y += blockH;
  } else {
    line(COL.totalsX, ctx.y, RIGHT, theme.total === "accent" ? 0.5 : 0.3, accent);
    ctx.y += 3;
    const totalColor = theme.total === "accent" ? accent : COLOR.ink;
    put("Total", COL.totalsX, ctx.y, SIZE.total, true, totalColor);
    put(money(totals.total), RIGHT, ctx.y, SIZE.total, true, totalColor, "right");
    ctx.y += lh(SIZE.total);
  }

  drawSideNotes(ctx, notesPlan, blockTop);
  ctx.y += 10;
}
