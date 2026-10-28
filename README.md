# Invoicer

A lightweight, client-side invoice generator for freelancers and small businesses. Create, edit, and download professional invoices as PDF — no account, no backend.

**Live:** [invoicer.farhan.app](https://invoicer.farhan.app/)

## Features

- Edit the invoice in place: one A4-proportioned sheet (page-break guides on desktop), fluid single-column layout on phones
- Auto-save to `localStorage` on every keystroke
- "New" starts the next invoice (number auto-increments) with a 8-second **Undo**; no blocking confirm dialog
- "Remember my details & notes" option — keeps your business info + notes across new invoices
- GBP / USD currency with locale-aware formatting
- Discount and tax support with totals rounded at each step (no floating-point drift)
- Vector A4 PDF (selectable text, multi-page with repeated table header and page numbers); native share sheet on phones
- Light / dark mode, follows the OS preference until you choose, no flash on load
- Four print-friendly designs with different layouts (Minimal; Modern letterhead; Bold with an amount-due header; Centered), monotone by default with one optional accent colour; the choice applies to both the sheet and the PDF and is kept across new invoices
- Sticky bottom bar with live total + Download on mobile
- Fully responsive down to 320px, with 44px touch targets and 16px inputs on phones (no iOS zoom)

## Design

Benchmarked on the [farhan.app UI library](https://ui-library.farhan.app/): the same token set (4px spacing scale with density / roundness / type knobs, semantic light and dark colours, radii, motion, control heights), Geist + JetBrains Mono, mono uppercase eyebrow labels, press-scale buttons, soft-halo inputs, a blurred sticky nav and a dot-grid canvas. Light is the default with a dark toggle. The A4 sheet stays light in both themes so it matches the PDF. Class names follow BEM.

## Accessibility

- Semantic landmarks (`header`, `main`, `footer`, a labelled mobile action bar), a single `h1`, a real `<form>`, `<ul>` line items, `<dl>` totals
- Skip link, visible focus rings, native `<dialog>` for Design and About (Escape closes, focus returns, page scroll is locked)
- Every control has an accessible name; line-item inputs are labelled per row; design and accent pickers are real radio groups
- `prefers-reduced-motion` respected; the sheet itself is always light so contrast is the same in both themes
- Checked with axe-core (WCAG 2.2 AA + best practices): 0 violations on desktop and 390px mobile across light, dark, Design dialog, About dialog and the Bold / Modern designs

## SEO

Descriptive title and meta description, canonical URL, robots meta, Open Graph and Twitter cards, `theme-color`, JSON-LD `WebApplication` structured data, `robots.txt` and `sitemap.xml`.

## Privacy

Everything runs client-side. Invoice data is stored only in your browser's `localStorage` and is never sent anywhere. No accounts, no servers. Fonts load from Google Fonts and Google Analytics is used for aggregate page-view statistics only — no invoice content is collected.

## Security

`_headers` (Cloudflare Pages) sets a strict Content-Security-Policy (no inline scripts, only jsPDF's CDN, Google Fonts and Analytics are allowed), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy`. The jsPDF script is pinned to an exact version with a Subresource Integrity hash. Saved data is validated and coerced on load, so corrupted `localStorage` can't break the app.

## Stack

Vanilla HTML, CSS, and JavaScript. No frameworks, no build step. jsPDF (pinned, SRI-checked) is loaded from a CDN for PDF export, so the app needs a network connection on first load. Hosted on Cloudflare Pages.

## Local use

Serve the folder with any static server:

```bash
python -m http.server 5173
# then open http://127.0.0.1:5173
```

## Deploy

Drop the folder onto Cloudflare Pages. No build command, no environment variables. `_headers` is picked up automatically; keep scripts as external files so the CSP stays strict.

## PDF export

`invoice-pdf.js` (designs are defined in its `DESIGNS` map and mirrored by the `[data-design]` rules in `styles.css`) draws the invoice directly with jsPDF at exactly 210×297 mm (not a screenshot), so text is sharp and selectable and no browser header/footer text can appear. Long invoices paginate automatically. On touch devices the file is handed to the native share sheet (Save to Files / Open in…); elsewhere it downloads. jsPDF's built-in font covers Latin/WinAnsi characters; any line containing other characters (Cyrillic, Greek, Polish ł, CJK, Arabic, emoji…) is drawn as an image of the glyphs using the device's fonts, so it always renders correctly (those lines are not selectable). Rates keep up to 4 decimals so rate × quantity is checkable on paper. Ctrl/Cmd+P also prints just the sheet with `@page { margin: 0 }`.

## Roadmap

- Saved invoices list (history sidebar)
- Logo upload
- Additional currencies

## License

[MIT](./LICENSE) © Farhan Munim
