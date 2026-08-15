# Invoicer

A lightweight, client-side invoice generator for freelancers and small businesses. Create, edit, and download professional invoices as PDF — no account, no backend, no tracking.

**Live:** [invoicer.farhan.app](https://invoicer.farhan.app/)

## Features

- Single-page editor with live invoice preview
- Auto-save to `localStorage` on every keystroke
- "Remember my details & notes" option — keeps your business info + notes across new invoices
- GBP / USD currency with locale-aware formatting
- Discount and tax support with totals rounded at each step (no floating-point drift)
- Vector PDF export (real selectable text, identical on every device) with native-print fallback
- Light / dark mode, baked into the token system
- Fully responsive down to 360px

## Privacy

Everything runs client-side. Invoice data is stored only in your browser's `localStorage` and is never sent anywhere — no accounts, no servers. The site uses Google Analytics for aggregate page-view statistics only; no personal data or invoice content is collected.

## Stack

Vanilla HTML, CSS, and JavaScript. No frameworks, no build step. jsPDF (via CDN) for PDF export. Hosted on Cloudflare Pages.

## Local use

Open `index.html` directly, or serve the folder with any static server:

```bash
python -m http.server 5173
# then open http://127.0.0.1:5173
```

## Deploy

Drop the folder onto Cloudflare Pages. No build command, no environment variables.

## PDF export

The PDF is drawn as vectors directly from the invoice data with jsPDF (`invoice-pdf.js`) — not screenshotted from the DOM. That means real selectable text, small files, clean page breaks between line items, an identical layout on every device and screen size, and nothing in the PDF that isn't actual invoice data (empty fields and placeholders are omitted).

If the jsPDF CDN is unavailable, export falls back to the browser's native print pipeline with a dedicated `@media print` stylesheet that renders only the invoice. In that fallback, untick **"Headers and footers"** in Chrome's print dialog to remove the browser-injected date / URL lines.

## Roadmap

- Saved invoices list (history sidebar)
- Logo upload
- Additional currencies

## License

[MIT](./LICENSE) © Farhan Munim
