# Invoicer

A lightweight, client-side invoice generator for freelancers and small businesses. Create, edit, and download professional invoices as PDF — no account, no backend.

**Live:** [invoicer.farhan.app](https://invoicer.farhan.app/)

## Features

- Edit the invoice in place: one A4-proportioned sheet (page-break guides on desktop), fluid single-column layout on phones
- Auto-save to `localStorage` on every keystroke
- "Remember my details & notes" option — keeps your business info + notes across new invoices
- GBP / USD currency with locale-aware formatting
- Discount and tax support with totals rounded at each step (no floating-point drift)
- Vector A4 PDF (selectable text, multi-page with repeated table header and page numbers); native share sheet on phones
- Light / dark mode, follows the OS preference until you choose, no flash on load
- Four print-friendly designs with different layouts (Minimal; Modern letterhead; Bold with an amount-due header; Centered), monotone by default with one optional accent colour; the choice applies to both the sheet and the PDF and is kept across new invoices
- Sticky bottom bar with live total + Download on mobile
- Fully responsive down to 360px

## Design

Benchmarked on the [farhan.app UI library](https://ui-library.farhan.app/): the same token set (4px spacing scale with density / roundness / type knobs, semantic light and dark colours, radii, motion, control heights), Geist + JetBrains Mono, mono uppercase eyebrow labels, press-scale buttons, soft-halo inputs, a blurred sticky nav and a dot-grid canvas. Light is the default with a dark toggle. The A4 sheet stays light in both themes so it matches the PDF. Class names follow BEM.

## Accessibility

- Semantic landmarks (`header`, `aside`, `main`, `nav`, `footer`), a single `h1`, fieldsets with legends, a real `<form>`, `<ul>` line items, a captioned table with column headers, `<dl>` totals and `<time>` dates
- Skip link, visible high-contrast focus rings, keyboard-operable dialog (native `<dialog>`) and drawer (Escape closes, focus is moved in and restored, the rest of the page is made `inert`)
- Every control has an accessible name; line-item inputs are labelled per row
- Text ≥ 4.5:1 and input borders / focus rings ≥ 3:1 in both themes; touch targets ≥ 24px; `prefers-reduced-motion` respected
- Zero axe-core violations (WCAG 2.2 AA + best-practice) across light, dark, dialog, mobile and drawer states

## SEO

Descriptive title and meta description, canonical URL, robots meta, Open Graph and Twitter cards, `theme-color`, JSON-LD `WebApplication` structured data, `robots.txt` and `sitemap.xml`.

## Privacy

Everything runs client-side. Invoice data is stored only in your browser's `localStorage` and is never sent anywhere. No accounts, no servers. Google Analytics is used for aggregate page-view statistics only — no personal data or invoice content is collected.

## Stack

Vanilla HTML, CSS, and JavaScript. No frameworks, no build step. jsPDF is loaded from a CDN for PDF export. Hosted on Cloudflare Pages.

## Local use

Open `index.html` directly, or serve the folder with any static server:

```bash
python -m http.server 5173
# then open http://127.0.0.1:5173
```

## Deploy

Drop the folder onto Cloudflare Pages. No build command, no environment variables.

## PDF export

`invoice-pdf.js` (designs are defined in its `DESIGNS` map and mirrored by the `[data-design]` rules in `styles.css`) draws the invoice directly with jsPDF at exactly 210×297 mm (not a screenshot), so text is sharp and selectable and no browser header/footer text can appear. Long invoices paginate automatically. On touch devices the file is handed to the native share sheet (Save to Files / Open in…); elsewhere it downloads. jsPDF's built-in font covers Latin/WinAnsi characters; other scripts are transliterated or shown as `?`. Ctrl/Cmd+P also prints just the sheet with `@page { margin: 0 }`.

## Roadmap

- Saved invoices list (history sidebar)
- Logo upload
- Additional currencies

## License

[MIT](./LICENSE) © Farhan Munim
