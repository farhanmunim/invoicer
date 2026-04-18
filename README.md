# Invoicer

A lightweight, client-side invoice generator for freelancers and small businesses. Create, edit, and download professional invoices as PDF — no account, no backend, no tracking.

**Live:** [invoicer.farhan.app](https://invoicer.farhan.app/)

## Features

- Single-page editor with live invoice preview
- Auto-save to `localStorage` on every keystroke
- "Remember my details & notes" option — keeps your business info + notes across new invoices
- GBP / USD currency with locale-aware formatting
- Discount and tax support with totals rounded at each step (no floating-point drift)
- Native-print PDF export — works in Chrome, Edge, Firefox, Safari
- Light / dark mode, baked into the token system
- Fully responsive down to 360px

## Privacy

Everything runs client-side. Invoice data is stored only in your browser's `localStorage`. No accounts, no servers, no analytics, no cookies. Close the tab and nothing leaves your machine.

## Stack

Vanilla HTML, CSS, and JavaScript. No frameworks, no build step, no dependencies. Hosted on Cloudflare Pages.

## Local use

Open `index.html` directly, or serve the folder with any static server:

```bash
python -m http.server 5173
# then open http://127.0.0.1:5173
```

## Deploy

Drop the folder onto Cloudflare Pages. No build command, no environment variables.

## PDF export

Uses the browser's native print pipeline (`window.print()`) with a dedicated `@media print` stylesheet that hides the editor chrome and renders only the invoice. In Chrome's print dialog, untick **"Headers and footers"** to remove the browser-injected date / URL lines.

## Roadmap

- Saved invoices list (history sidebar)
- Logo upload
- Additional currencies

## License

[MIT](./LICENSE) © Farhan Munim
