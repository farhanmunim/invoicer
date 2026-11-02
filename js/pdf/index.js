/* Builds a vector A4 PDF (selectable text, no browser header/footer) with jsPDF.
   data = { state, totals, money, rate, date, lineAmount } — formatters are injected so this
   module has no dependency on app state. Requires the jsPDF UMD build (window.jspdf). */
import { COLOR, MARGIN, PAGE_H, PAGE_W, SIZE } from "./constants.js";
import { createContext } from "./context.js";
import { drawHeader } from "./header.js";
import { drawFlowNotes, planNotes } from "./notes.js";
import { drawTable } from "./table.js";
import { clean } from "./text.js";
import { drawTotals } from "./totals.js";

/* Page numbers on multi-page invoices */
function drawPageNumbers(ctx) {
  const pages = ctx.doc.getNumberOfPages();
  if (pages <= 1) return;
  for (let i = 1; i <= pages; i++) {
    ctx.doc.setPage(i);
    ctx.put(`Page ${i} of ${pages}`, PAGE_W / 2, PAGE_H - MARGIN, SIZE.small, false, COLOR.muted, "center");
  }
}

export function buildInvoicePdf(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const ctx = createContext(doc, data);

  drawHeader(ctx);
  drawTable(ctx);
  const notes = planNotes(ctx);
  drawTotals(ctx, notes);
  drawFlowNotes(ctx, notes);
  drawPageNumbers(ctx);

  doc.setProperties({ title: clean(data.state.number || "Invoice"), subject: "Invoice", creator: "Invoicer" });
  return doc;
}
