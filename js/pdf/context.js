/* The drawing context shared by every PDF section: painting primitives plus a page cursor (ctx.y).
   Sections read helpers from here and advance ctx.y as they draw. */
import { COLOR, FOOTER_RESERVE, INSET, LINE_HEIGHT, MARGIN, PAGE_H, PAGE_W, PT_TO_MM, RIGHT, SIZE, TOP_BAR_H, TOTALS_INSET } from "./constants.js";
import { hexToRgb } from "./colors.js";
import { DESIGNS } from "./designs.js";
import { PX_PER_MM, RASTER_BASELINE, RASTER_LINE, RASTER_SCALE, clean, needsRaster, normalize, rasterFont, rasterWidth, wrapRaster } from "./text.js";

export function createContext(doc, data) {
  const { state } = data;
  const theme = DESIGNS[state.design] || DESIGNS.minimal;
  const accent = hexToRgb(state.accent);
  const lh = (size) => size * PT_TO_MM * LINE_HEIGHT;

  const style = (size = SIZE.body, bold = false, color = COLOR.ink) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const rasterLine = (text, x, atY, size, bold, color, align) => {
    const widthMm = rasterWidth(text, size, bold);
    const heightMm = size * PT_TO_MM * RASTER_LINE;
    const px = (mm) => Math.ceil(mm * PX_PER_MM * RASTER_SCALE);
    const canvas = document.createElement("canvas");
    canvas.width = px(widthMm) + 2;
    canvas.height = px(heightMm);
    const c2d = canvas.getContext("2d");
    c2d.scale(RASTER_SCALE, RASTER_SCALE);
    c2d.font = rasterFont(size, bold);
    c2d.fillStyle = `rgb(${color.join(",")})`;
    c2d.textBaseline = "alphabetic";
    c2d.fillText(text, 0, heightMm * PX_PER_MM * RASTER_BASELINE);
    const left = align === "right" ? x - widthMm : align === "center" ? x - widthMm / 2 : x;
    doc.addImage(canvas.toDataURL("image/png"), "PNG", left, atY, canvas.width / (PX_PER_MM * RASTER_SCALE), heightMm);
  };

  const put = (str, x, atY, size, bold, color, align = "left") => {
    const lines = Array.isArray(str) ? str : [str];
    if (!lines.some(needsRaster)) {
      style(size, bold, color);
      doc.text(lines.map(clean), x, atY, { align, baseline: "top", lineHeightFactor: LINE_HEIGHT });
      return;
    }
    lines.forEach((text, i) => {
      const top = atY + i * lh(size);
      if (needsRaster(text)) rasterLine(normalize(text), x, top, size, bold, color, align);
      else put(text, x, top, size, bold, color, align);
    });
  };

  const wrap = (str, width, size, bold) => {
    if (needsRaster(str)) return wrapRaster(str, width, size, bold);
    style(size, bold);
    return doc.splitTextToSize(clean(str), width);
  };

  const fit = (str, maxW, size, bold) => {
    const full = clean(str);
    const raster = needsRaster(full);
    const width = (t) => { if (raster) return rasterWidth(t, size, bold); style(size, bold); return doc.getTextWidth(t); };
    let s = full;
    while (s.length > 1 && width(s) > maxW) s = s.slice(0, -1);
    return s === full ? s : `${s.trimEnd()}…`;
  };

  const line = (x1, atY, x2, width, color) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    doc.line(x1, atY, x2, atY);
  };

  const fill = (x, atY, w, h, color) => {
    doc.setFillColor(...color);
    doc.rect(x, atY, w, h, "F");
  };

  const ctx = {
    doc,
    data,
    state,
    theme,
    accent,
    y: MARGIN,
    limitY: PAGE_H - MARGIN - FOOTER_RESERVE,
    // table cell inset (banded / filled rows are padded), totals inset (solid total block)
    inset: theme.tableHead === "filled" || theme.banded ? INSET : 0,
    totalsInset: theme.total === "block" ? TOTALS_INSET : 0,
    title: theme.upper ? "INVOICE" : "Invoice",
    titleColor: theme.titleAccent ? accent : COLOR.ink,
    titleH: theme.titleSize * PT_TO_MM,
    lh,
    style,
    put,
    wrap,
    fit,
    line,
    fill,
    hair: (atY) => line(MARGIN, atY, RIGHT, 0.2, COLOR.rule),
  };

  ctx.drawTopBar = () => { if (theme.topBar) fill(0, 0, PAGE_W, TOP_BAR_H, accent); };
  ctx.newPage = () => { doc.addPage(); ctx.drawTopBar(); ctx.y = MARGIN; };
  ctx.ensure = (height, redraw) => {
    if (ctx.y + height <= ctx.limitY) return;
    ctx.newPage();
    if (redraw) redraw();
  };
  return ctx;
}
