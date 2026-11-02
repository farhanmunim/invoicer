/* Header + parties. The arrangement depends on the design's layout. */
import { COL, COLOR, CONTENT_W, MARGIN, META_GAP, META_MAX_W, PAGE_W, RIGHT, SIZE } from "./constants.js";

function party(ctx, label, p, x, startY, nameSize = SIZE.name) {
  const { put, wrap, lh } = ctx;
  let py = startY;
  if (label) {
    put(label, x, py, SIZE.small, false, COLOR.muted);
    py += lh(SIZE.small) + 1;
  }
  if (p.name) {
    const lines = wrap(p.name, COL.partyW, nameSize, true);
    put(lines, x, py, nameSize, true, COLOR.ink);
    py += lines.length * lh(nameSize);
  }
  if (p.details) {
    const lines = wrap(p.details, COL.partyW, SIZE.body, false);
    put(lines, x, py + 0.5, SIZE.body, false, COLOR.muted);
    py += lines.length * lh(SIZE.body) + 0.5;
  }
  return py;
}

function parties(ctx) {
  const { state } = ctx;
  const fromEnd = party(ctx, "FROM", state.from, MARGIN, ctx.y);
  const toEnd = party(ctx, "BILL TO", state.to, MARGIN + COL.partyGap, ctx.y);
  ctx.y = Math.max(fromEnd, toEnd) + 10;
}

function headRule(ctx) {
  if (ctx.theme.headRule === "heavy") ctx.fill(MARGIN, ctx.y, CONTENT_W, 1.1, ctx.accent);
  else if (ctx.theme.headRule === "hair") ctx.hair(ctx.y);
}

/* Letterhead: From top-left, title top-right, Bill to left, meta stacked right */
function letterhead(ctx, metaItems) {
  const { put, lh, state, title, titleColor, titleH, theme } = ctx;
  const fromEnd = party(ctx, null, state.from, MARGIN, ctx.y, 14);
  put(title, RIGHT, ctx.y, theme.titleSize, true, titleColor, "right");
  ctx.y = Math.max(fromEnd, ctx.y + titleH) + 10;
  const toEnd = party(ctx, "BILL TO", state.to, MARGIN, ctx.y);
  let my = ctx.y;
  metaItems.forEach(([label, value]) => {
    put(label[0] + label.slice(1).toLowerCase(), RIGHT - 56, my, SIZE.body, false, COLOR.muted);
    put(value, RIGHT, my, SIZE.body, false, COLOR.ink, "right");
    my += lh(SIZE.body) + 1.5;
  });
  ctx.y = Math.max(toEnd, my) + 10;
}

/* Hero: title + amount due, heavy rule, meta strip, parties */
function hero(ctx, metaItems) {
  const { put, lh, state, data, title, titleColor, titleH, theme } = ctx;
  put(title, MARGIN, ctx.y, theme.titleSize, true, titleColor);
  put("AMOUNT DUE", RIGHT, ctx.y + 1, SIZE.small, false, COLOR.muted, "right");
  put(data.money(data.totals.total), RIGHT, ctx.y + 4.5, 20, true, COLOR.ink, "right");
  put(`Due ${data.date(state.dueDate) || "-"}`, RIGHT, ctx.y + 4.5 + lh(20) + 0.5, SIZE.body, false, COLOR.muted, "right");
  ctx.y += Math.max(titleH, 4.5 + lh(20) + lh(SIZE.body)) + 6;
  headRule(ctx);
  ctx.y += 7;
  metaItems.forEach(([label, value], i) => {
    const x = MARGIN + i * 58;
    put(label, x, ctx.y, SIZE.small, false, COLOR.muted);
    put(value, x, ctx.y + 4, SIZE.body, false, COLOR.ink);
  });
  ctx.y += 17;
  parties(ctx);
}

/* Centered: title and meta centred, rule, parties */
function centered(ctx, metaItems) {
  const { put, title, titleColor, titleH, theme } = ctx;
  put(title, PAGE_W / 2, ctx.y, theme.titleSize, true, titleColor, "center");
  ctx.y += titleH + 5;
  metaItems.forEach(([label, value], i) => {
    const x = PAGE_W / 2 + (i - 1) * META_GAP;
    put(label, x, ctx.y, SIZE.small, false, COLOR.muted, "center");
    put(value, x, ctx.y + 4, SIZE.body, false, COLOR.ink, "center");
  });
  ctx.y += 15;
  headRule(ctx);
  ctx.y += 8;
  parties(ctx);
}

/* Standard: title left, meta right, rule, parties side by side */
function standard(ctx, metaItems) {
  const { put, title, titleColor, titleH, theme } = ctx;
  put(title, MARGIN, ctx.y, theme.titleSize, true, titleColor);
  const metaY = ctx.y + Math.max(0, titleH - 10);
  metaItems.forEach(([label, value], i) => {
    const x = RIGHT - META_GAP * (metaItems.length - 1 - i);
    put(label, x, metaY + 1, SIZE.small, false, COLOR.muted, "right");
    put(value, x, metaY + 5, SIZE.body, false, COLOR.ink, "right");
  });
  ctx.y += Math.max(titleH, 10) + 6;
  headRule(ctx);
  ctx.y += 8;
  parties(ctx);
}

const LAYOUTS = { letterhead, hero, centered, standard };

export function drawHeader(ctx) {
  const { state, data, fit } = ctx;
  ctx.drawTopBar();
  const metaItems = [
    ["NUMBER", fit(state.number || "-", META_MAX_W, SIZE.body, false)],
    ["ISSUED", data.date(state.issueDate) || "-"],
    ["DUE", data.date(state.dueDate) || "-"],
  ];
  (LAYOUTS[ctx.theme.layout] || standard)(ctx, metaItems);
}
