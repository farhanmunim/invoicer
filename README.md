# Invoicer

A lightweight, client-side invoice generator for freelancers and small businesses. Create, edit, and download professional invoices as PDF — no account, no backend.

**Live:** [invoicer.farhan.app](https://invoicer.farhan.app/)

## Features

- Editor panel with live invoice preview on a dot-grid canvas
- Auto-save to `localStorage` on every keystroke
- "Remember my details & notes" option — keeps your business info + notes across new invoices
- GBP / USD currency with locale-aware formatting
- Discount and tax support with totals rounded at each step (no floating-point drift)
- PDF export via html2canvas + jsPDF, with a native-print fallback
- Light / dark mode, follows the OS preference until you choose, no flash on load
- Collapsible editor on desktop; off-canvas editor drawer with bottom navigation on mobile
- Fully responsive down to 360px

## Design

The UI is benchmarked against the [App Blueprint](https://app-blueprint.farhan.app/) design system: Geist / Geist Mono type, the shadcn neutral HSL token set, a 52px topbar, collapsible side panel, dot-grid canvas, slim app footer, and a bottom nav with off-canvas drawer on mobile. All colours, spacing, radii, heights and z-indices are CSS custom properties declared on `:root`; class names follow BEM.

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

Vanilla HTML, CSS, and JavaScript. No frameworks, no build step. html2canvas and jsPDF are loaded from a CDN for PDF export. Hosted on Cloudflare Pages.

## Local use

Open `index.html` directly, or serve the folder with any static server:

```bash
python -m http.server 5173
# then open http://127.0.0.1:5173
```

## Deploy

Drop the folder onto Cloudflare Pages. No build command, no environment variables.

## PDF export

The preview is rasterised with html2canvas (always in the light theme) and written to an A4 PDF with jsPDF. If either library fails to load, the app falls back to the browser's native print pipeline (`window.print()`) with a dedicated `@media print` stylesheet that hides the app chrome and renders only the invoice. In Chrome's print dialog, untick **"Headers and footers"** to remove the browser-injected date / URL lines.

## Roadmap

- Saved invoices list (history sidebar)
- Logo upload
- Additional currencies

## License

[MIT](./LICENSE) © Farhan Munim
