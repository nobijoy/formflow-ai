# FormFlow AI

AI-assisted QA form testing and multi-framework test generator — a Chrome
Manifest V3 extension. See [`PROJECT.md`](PROJECT.md) for the full product
spec (SRS) and [`docs/`](docs/README.md) for per-feature implementation
plans.

## Stack

- **Extension:** Manifest V3, TypeScript, [Vite](https://vitejs.dev/) +
  [`@crxjs/vite-plugin`](https://crxjs.dev/vite-plugin) for HMR during
  development.
- **UI (popup/options):** React + Tailwind CSS.
- **Testing:** Vitest (unit) + a fixed cross-framework fixture matrix under
  `tests/fixtures/` (see `docs/07-testing-strategy.md`).

## Project Structure

```
src/
├── background/        # Service worker: ledger, compiler, AI router, licensing (Modules 3–5)
│   ├── ledger/         # Neutral action ledger — persists across navigation (FR-4.4)
│   ├── compiler/       # Playwright/Cypress/Puppeteer/Selenium code generation (FR-4.3)
│   ├── ai-router/       # Static heuristics, BYOK, managed inference (Module 3)
│   └── licensing/      # Entitlement cache + paywall gating (FR-5.2)
├── content/            # Content script: DOM inspection (Module 1)
│   ├── dom-inspector/   # Orchestrates a fill pass
│   ├── setter-interceptor.ts   # Native setter interception (FR-1.1)
│   ├── event-dispatcher.ts     # Framework event sequence (FR-1.2)
│   ├── shadow-dom.ts           # Shadow DOM traversal (FR-1.3)
│   └── locator-resolver.ts     # Accessibility-first locator resolution (FR-4.1)
├── data-generators/    # Module 2 preset engine (happy-path, boundary, validation, security)
├── popup/              # Extension action popup (React)
├── options/            # Extension options page (React)
├── shared/             # Cross-cutting types, the neutral action-ledger schema, tier constants
└── styles/             # Tailwind entry point

tests/
├── fixtures/           # Cross-phase fixture matrix (vanilla HTML, React, Vue, Angular, Svelte, shadow DOM)
├── unit/               # Vitest unit tests
└── e2e/                # Generated-code execution tests (NFR-5)

docs/                   # Per-feature/per-module plan files
public/icons/           # Extension icons (add before packaging)
```

## Getting Started

```bash
npm install
npm run dev     # Vite dev server with HMR; load dist/ as an unpacked extension
npm run build   # Production build to dist/
npm run test    # Unit tests (Vitest)
npm run lint    # ESLint
```

To load the unpacked extension in Chrome: `chrome://extensions` → enable
**Developer mode** → **Load unpacked** → select the `dist/` folder (after
`npm run dev` or `npm run build`).

## Where to Start Reading

1. [`PROJECT.md`](PROJECT.md) — the full SRS (modules, pricing, roadmap).
2. [`docs/README.md`](docs/README.md) — index of per-feature plan docs.
3. [`docs/roadmap.md`](docs/roadmap.md) — phase-by-phase build sequence and exit criteria.
