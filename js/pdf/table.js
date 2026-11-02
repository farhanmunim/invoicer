/* The line-items table: header row (repeated on every page) and the rows. */
import { BAND_TINT, COL, COLOR, CONTENT_W, MARGIN, RIGHT, ROW_PAD, SIZE } from "./constants.js";
import { tint } from "./colors.js";

export function drawTable(ctx) {
  const { put, wrap, line, fill, hair, lh, ensure, theme, accent, state, data } = ctx;
  const descX = MARGIN + ctx.inset;
  const amountX = RIGHT - ctx.inset;

  const tableHead = () => {
    const labelH = lh(SIZE.small);
    const kind = theme.tableHead;
    const labelColor = kind === "filled" ? COLOR.white : kind === "accent" ? accent : COLOR.muted;
    const bold = kind === "accent";
    let top = ctx.y;
    if (kind === "filled") {
      fill(MARGIN, ctx.y, CONTENT_W, labelH + 6, accent);
      top = ctx.y + 3;
    }
    put("DESCRIPTION", descX, top, SIZE.small, bold, labelColor);
    put("QTY", COL.qtyX, top, SIZE.small, bold, labelColor, "right");
    put("RATE", COL.rateX, top, SIZE.small, bold, labelColor, "right");
    put("AMOUNT", amountX, top, SIZE.small, bold, labelColor, "right");
    if (kind === "filled") ctx.y += labelH + 6;
    else {
      ctx.y += labelH + 2;
      line(MARGIN, ctx.y, RIGHT, kind === "accent" ? 0.5 : 0.2, kind === "rule" || kind === "accent" ? accent : COLOR.rule);
    }
  };

  ensure(20);
  tableHead();
  const band = tint(accent, BAND_TINT);
  state.items.forEach((item, index) => {
    const lines = wrap(item.description || "-", COL.descW, SIZE.body, false);
    const height = lines.length * lh(SIZE.body) + ROW_PAD * 2;
    ensure(height, tableHead);
    if (theme.banded && index % 2 === 1) fill(MARGIN, ctx.y, CONTENT_W, height, band);
    const top = ctx.y + ROW_PAD;
    put(lines, descX, top, SIZE.body, false, COLOR.ink);
    const qty = String(+(Number(item.quantity) || 0).toFixed(2));
    put(qty, COL.qtyX, top, SIZE.body, false, COLOR.ink, "right");
    put(data.rate(Number(item.rate) || 0), COL.rateX, top, SIZE.body, false, COLOR.ink, "right");
    put(data.money(data.lineAmount(item)), amountX, top, SIZE.body, false, COLOR.ink, "right");
    ctx.y += height;
    if (!theme.banded) hair(ctx.y);
  });
  if (theme.banded) hair(ctx.y);
  ctx.y += 8;
}
