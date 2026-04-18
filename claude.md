# CLAUDE.md

---

## 0. Rule Priority

If rules conflict, follow this order:

1. Security & data integrity
2. Git safety
3. Architecture (API, data, pipelines)
4. Runtime behaviour
5. UI implementation
6. Styling

---

## 1. Project Overview

A lightweight invoice generator web app for freelancers and small business owners. Users can quickly create, edit, and download professional invoices as PDF without needing an account or backend. Everything runs client-side for speed, privacy, and simplicity.

---

## 2. Stack & Hosting

- Vanilla JavaScript · HTML · CSS · Cloudflare Pages · GitHub (version control)
- jsPDF (only if PDF export is needed)

---

## 3. Local Dev

- n/a

```bash
# command to start
```

---

## 4. Project Rules & Overrides

- No frameworks or build tools (no React, Vite, Webpack)
- Everything must run in a single static frontend
- No backend or database dependencies
- All data stored in localStorage unless explicitly exported
- PDF generation must remain optional and lightweight
- Keep UI minimal and print-friendly by default
- Auto-save invoice state on every input change

---

## 5. Watch Out For

- PDF formatting differences across browsers (test Chrome first)
- Mobile layout breaking on invoice tables (keep responsive early)
- Floating-point rounding errors in totals (use fixed decimals)
- LocalStorage limits if storing too many invoices
- Print styles (@media print) often break flex layouts — test early
- Avoid overly complex invoice templates (keep structure stable and reusable)

---

# General Standards

---

## 6. Rule Priority (reminder)

Security → Git safety → Architecture → Runtime → UI → Styling.

---

## 7. Git Identity (STRICT)

- Always use: Name `Farhan` · Email `auth@farhan.app`
- Verify with `git config user.name` / `git config user.email` before first commit.
- Never commit as Claude, add co-author lines, or mention AI in commits or metadata.
- Use imperative commit messages (e.g. "Add caching layer for API responses").

---

## 8. Committing & Pushing (STRICT)

- Never commit or push without explicit instruction.
- State exactly what will be committed and wait for approval before proceeding.
- Never batch or auto-commit at end of session.
- Never push to any remote (including `main`) without explicit instruction for that push.

---

## 9. Secrets & Environment

- All secrets in `.env` — never hardcoded.
- `.env` always in `.gitignore`.
- Always include `.env.example` with key names but no values.

---

## 10. .gitignore

Ignore: build artefacts, editor files, OS files (`.DS_Store`, `Thumbs.db`),
logs, `/screenshots`, `CHANGELOG.md`. Verify no junk files are tracked before committing.

---

## 11. Changelog

- Create `CHANGELOG.md` at project root if missing. Internal use only — gitignore it.
- Log every meaningful change with a date and short description.

### changelog.html (if the project has one)

- Do not confuse with `CHANGELOG.md`.
- Only log: new features, major UI changes, notable improvements, major refactors,
  user-facing bug fixes. Never log minor tweaks, copy changes, or invisible refactors.
- Tag every entry: **New Feature** · **Improvement** · **Bug Fix** · **Refactor**
- Plain, professional language. Moderately technical where it adds value.
- Never update without explicit instruction — always ask first.

---

## 12. Google Analytics

- Always ask before adding to a new project. Never add without explicit confirmation.

---

## 13. Technology Defaults

- Default to HTML, CSS, and vanilla JS.
- Only introduce a library if a well-established solution exists for the problem
  (e.g. Leaflet for maps, SheetJS for Excel, Chart.js for charts) or the feature
  complexity genuinely warrants it. Never add a library for convenience.
- Prefer CDN for libraries on static sites. No bundler unless explicitly required.

---

## 14. Frontend Design

- Before writing any UI code, read the frontend design skill at
  `/mnt/skills/public/frontend-design/SKILL.md` and commit to a clear aesthetic
  direction before touching code.
- Avoid generic aesthetics: no default system fonts, no purple-gradient-on-white,
  no cookie-cutter layouts.
- Use CSS custom properties (tokens) for all repeating values: colours, spacing,
  typography, radii, shadows, z-indices, breakpoints. Declare all tokens in `:root`.
- No inline styles — all styling through the token and class system.
- Use BEM (`block__element--modifier`) for all project-specific CSS class names.
- Always build in light mode by default with a dark mode toggle, unless explicitly told otherwise. Dark mode must be built into the token system from day one — never bolted on later.

---

## 15. API & Security

- Never call third-party APIs directly from the frontend.
- Route all external calls through a **Cloudflare Worker proxy**:
  - API keys in Worker env vars only — never exposed to the browser.
  - Validate all requests. Reject malformed input early.
  - Cache responses to reduce upstream load.
- Rate limit all Worker routes before going live (~100 req/min/IP default).
  Remind me to configure this before launch.
- Security headers on all responses: `Content-Security-Policy`, `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`.

---

## 16. Caching

- Explicit TTLs on all API responses (default 60–300s).
- Stale-while-revalidate where possible. Never cache sensitive or user-specific data.

---

## 17. Web Scraping

- Server-side only — never expose selectors or scraping logic in client code.
- Treat all scraped data as untrusted: strip HTML, normalise to UTF-8, trim
  whitespace, convert to strict types, validate formats.
- Never inject raw scraped content into the DOM.
- Use a stable internal schema — do not rely on upstream HTML structure.
- Cache results (default TTL 5–30 min). Prefer stale over a failed fresh request.
- Retry max 2 times. Return a safe fallback state on failure.
- Log failed requests, empty selectors, and validation failures.

---

## 18. Scheduled Pipelines

- Use a scheduled pipeline for data that needs regular refresh
  (GitHub Actions, cron, or Worker scheduled jobs).
- Pattern: **Fetch → Clean → Validate → Store → Serve**. Each step isolated.
- Deterministic and idempotent. No overlapping executions.
- Never overwrite valid data with invalid results — retain last known good dataset.
- Use ETag / `If-Modified-Since` where supported. Credentials in env vars only.

---

## 19. Error Handling & Fallbacks

- Never fail silently — always show a fallback state or message.
- Use cached data if live data fails. Never leave empty or broken UI states.
- Retry transient failures (max 2 attempts with delay).

---

## 20. Code Quality

- One responsibility per file or module. Co-locate state, logic, and handlers.
- If a function does more than one thing, split it.
- Files: `kebab-case`. No magic numbers — use named constants or tokens.
- No dead code, unused functions, or commented-out blocks committed.
- No stray `console.log` unless deliberate and documented.
- `async/await` only — do not mix with `.then()`.

---

## 21. Dependencies

- No npm packages for problems solvable with native browser APIs.
- Keep dependencies minimal and intentional.

---

## 22. Accessibility

- Semantic HTML throughout. All images must have descriptive `alt` text.
- Sufficient colour contrast on all text. No JS console errors in production.

---

## 23. Pre-Commit Checks

- Screenshot at Desktop `1280×800` and Mobile `390×844` using Puppeteer.
- No console errors before committing.
- Store screenshots in `/screenshots` (gitignored).

---

## 24. Production & Pre-Ship

- Minimise DOM updates. Lazy-load non-critical assets. Keep JS lean.
- No console spam in production.
- DevTools → Network tab check before shipping: no exposed secrets, no duplicate
  requests, caching behaves as expected.
- Test all logic paths including edge cases. For Workers: test invalid inputs,
  rate limiting, and caching.

---

## 25. Deployment Checklist

- [ ] Worker routes correctly configured
- [ ] Environment variables set in Cloudflare dashboard
- [ ] Rate limiting enabled
- [ ] Caching verified
- [ ] No secrets exposed (Network tab check)
- [ ] No duplicate or wasteful requests
- [ ] Security headers applied
- [ ] Analytics confirmed or explicitly skipped
- [ ] README up to date

---

## 26. README

Keep `README.md` updated with: project purpose, setup instructions, environment
variable names (no values), and deployment notes. Source of truth for picking
the project up cold.

---

## 27. Site Metadata (STRICT)

Every web app must include all of the following in `<head>`. No exceptions.

- **Title:** `<title>{App Name} — farhan.app</title>`. The `— farhan.app` suffix
  is mandatory.
- **Favicon:** Inline SVG via `data:image/svg+xml,...`. Must match the app's
  UI logo. If the app renders a logo, the favicon is the same design.
- **Author:** `<meta name="author" content="farhan.app" />`
- **Description:** `<meta name="description" content="{one-line description}. Built by Farhan — farhan.app" />`

### Open Graph

```html
<meta property="og:type" content="website" />
<meta property="og:site_name" content="{App Name}" />
<meta property="og:title" content="{App Name} — farhan.app" />
<meta property="og:description" content="{one-line description with key feature highlight}." />
<meta property="og:url" content="https://farhan.app" />
```

### Twitter / X

```html
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="{App Name} — farhan.app" />
<meta name="twitter:description" content="{one-line description}. Built by Farhan — farhan.app" />
```

- `{App Name}` and descriptions must reflect the specific app being built.
- `og:url` always points to `https://farhan.app`.
