/* Vector PDF renderer — draws the invoice directly from state with jsPDF,
   so the export is identical on every device, contains real selectable text,
   and only ever includes actual invoice data (no placeholders, no UI chrome). */
(() => {
  "use strict";

  const PAGE = { width: 210, height: 297 }; // A4 mm
  const MARGIN = { top: 20, right: 18, bottom: 22, left: 18 };
  const ACCENT = [67, 56, 202];
  const TEXT = [15, 23, 42];
  const MUTED = [100, 116, 139];
  const SUBTLE = [148, 163, 184];
  const BORDER = [229, 231, 235];
  const LINE = 4.6; // baseline step for 9pt body text, in mm

  function generate(state, totals, fmt) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const left = MARGIN.left;
    const right = PAGE.width - MARGIN.right;
    const contentW = right - left;
    let y = MARGIN.top;

    const color = (c) => doc.setTextColor(c[0], c[1], c[2]);
    const draw = (c) => doc.setDrawColor(c[0], c[1], c[2]);

    function newPage() {
      doc.addPage();
      y = MARGIN.top;
    }

    function ensure(height) {
      if (y + height > PAGE.height - MARGIN.bottom) newPage();
    }

    function sectionLabel(text, x, align) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      color(SUBTLE);
      doc.text(text, x, y, align ? { align } : undefined);
    }

    function rule(width, colorArr) {
      draw(colorArr || BORDER);
      doc.setLineWidth(width || 0.3);
      doc.line(left, y, right, y);
    }

    /* ---------- Accent bar ---------- */
    doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.rect(0, 0, PAGE.width, 3, "F");

    /* ---------- Header: title + number left, from-details right ---------- */
    let yLeft = y;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    color(ACCENT);
    doc.text("INVOICE", left, yLeft);
    yLeft += 9;

    const title = (state.from.name || "").trim();
    if (title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      color(TEXT);
      const titleLines = doc.splitTextToSize(title, contentW - 72);
      doc.text(titleLines, left, yLeft);
      yLeft += titleLines.length * 8.5;
    }

    const number = (state.number || "").trim();
    if (number) {
      doc.setFont("courier", "normal");
      doc.setFontSize(9.5);
      color(MUTED);
      doc.text(number, left, yLeft);
      yLeft += 6;
    }

    let yRight = y;
    const fromDetails = (state.from.details || "").trim();
    if (fromDetails) {
      const saved = y;
      y = yRight;
      sectionLabel("FROM", right, "right");
      y = saved;
      yRight += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      color(MUTED);
      const lines = fromDetails
        .split("\n")
        .flatMap((l) => doc.splitTextToSize(l || " ", 70));
      doc.text(lines, right, yRight, { align: "right" });
      yRight += lines.length * LINE;
    }

    y = Math.max(yLeft, yRight) + 8;

    /* ---------- Meta: billed-to left, dates right ---------- */
    const metaTop = y;
    let yBill = metaTop;
    const toName = (state.to.name || "").trim();
    const toDetails = (state.to.details || "").trim();
    if (toName || toDetails) {
      y = yBill;
      sectionLabel("BILLED TO", left);
      yBill += 5;
      if (toName) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        color(TEXT);
        const lines = doc.splitTextToSize(toName, 92);
        doc.text(lines, left, yBill);
        yBill += lines.length * 5;
      }
      if (toDetails) {
        yBill += 0.5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        color(MUTED);
        const lines = toDetails
          .split("\n")
          .flatMap((l) => doc.splitTextToSize(l || " ", 92));
        doc.text(lines, left, yBill);
        yBill += lines.length * LINE;
      }
    }

    let yDates = metaTop;
    const issued = fmt.date(state.issueDate);
    const due = fmt.date(state.dueDate);
    if (issued || due) {
      const cols = [];
      if (issued) cols.push({ label: "ISSUED", value: issued });
      if (due) cols.push({ label: "DUE", value: due });
      const colW = 34;
      cols.forEach((c, i) => {
        const x = right - (cols.length - i) * colW;
        y = yDates;
        sectionLabel(c.label, x);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        color(TEXT);
        doc.text(c.value, x, yDates + 5);
      });
      yDates += 10;
    }

    y = Math.max(yBill, yDates) + 6;
    rule();
    y += 9;

    /* ---------- Items table ---------- */
    const col = {
      desc: { x: left, w: contentW - 72 },
      qty: { r: right - 48 },
      rate: { r: right - 25 },
      amount: { r: right },
    };

    function tableHeader() {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      color(SUBTLE);
      doc.text("DESCRIPTION", col.desc.x, y);
      doc.text("QTY", col.qty.r, y, { align: "right" });
      doc.text("RATE", col.rate.r, y, { align: "right" });
      doc.text("AMOUNT", col.amount.r, y, { align: "right" });
      y += 2.5;
      rule();
      y += 6;
    }

    tableHeader();

    state.items.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const desc = (item.description || "").trim();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const descLines = desc ? doc.splitTextToSize(desc, col.desc.w) : ["—"];
      const rowH = descLines.length * LINE + 7;
      if (y + rowH > PAGE.height - MARGIN.bottom) {
        newPage();
        tableHeader();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
      }
      color(TEXT);
      doc.text(descLines, col.desc.x, y);
      color(MUTED);
      doc.text(String(qty), col.qty.r, y, { align: "right" });
      doc.text(fmt.money(rate), col.rate.r, y, { align: "right" });
      color(TEXT);
      doc.text(fmt.money(qty * rate), col.amount.r, y, { align: "right" });
      y += (descLines.length - 1) * LINE + 3.5;
      rule();
      y += 6;
    });

    /* ---------- Totals ---------- */
    const totalsLeft = right - 74;
    const showDiscount = Number(state.discount) > 0;
    const showTax = Number(state.tax) > 0;
    const totalsRows = 1 + (showDiscount ? 1 : 0) + (showTax ? 1 : 0);
    ensure(totalsRows * 6 + 16);

    function totalsRow(label, value) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      color(MUTED);
      doc.text(label, totalsLeft, y);
      color(TEXT);
      doc.text(value, right, y, { align: "right" });
      y += 6;
    }

    y += 1;
    totalsRow("Subtotal", fmt.money(totals.subtotal));
    if (showDiscount) totalsRow("Discount", "- " + fmt.money(totals.discountAmount));
    if (showTax) totalsRow("Tax", fmt.money(totals.taxAmount));

    y += 1;
    draw(TEXT);
    doc.setLineWidth(0.6);
    doc.line(totalsLeft, y, right, y);
    y += 6.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    color(TEXT);
    doc.text("Total", totalsLeft, y);
    doc.text(fmt.money(totals.total), right, y, { align: "right" });
    y += 6;

    /* ---------- Notes ---------- */
    const notes = (state.notes || "").trim();
    if (notes) {
      ensure(20);
      y += 8;
      rule();
      y += 7;
      sectionLabel("NOTES", left);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      color(MUTED);
      const lines = notes
        .split("\n")
        .flatMap((l) => doc.splitTextToSize(l || " ", contentW));
      lines.forEach((line) => {
        ensure(LINE);
        doc.text(line, left, y);
        y += LINE;
      });
    }

    return doc;
  }

  window.InvoicePDF = { generate };
})();
