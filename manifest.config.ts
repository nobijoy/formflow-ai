import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

/**
 * Chrome MV3 manifest. Kept as TS (via @crxjs/vite-plugin) instead of raw JSON
 * so it can share the version number with package.json and get type checking.
 *
 * Permission notes (see PROJECT.md NFR-4 — strict MV3 CSP, no unsafe-eval):
 * - "storage": entitlement cache (NFR-6), saved flows (FR-5.1), encrypted BYOK keys (FR-3.3).
 * - "scripting" + host permissions: inject the content-script DOM inspector on demand.
 * - "activeTab": least-privilege alternative to broad host permissions where possible.
 * No "webRequest"/broad remote code permissions — all AI calls go through the
 * service worker via explicit fetch to allow-listed endpoints only.
 */
export default defineManifest({
  manifest_version: 3,
  name: 'FormFlow AI — QA Form Testing & Test Generator',
  version: pkg.version,
  description:
    'Fill forms with contextual/adversarial test data, record multi-step flows, and generate Playwright/Cypress tests.',
  // TODO: add real icon-16/48/128.png to public/icons/ before packaging for the
  // Chrome Web Store (see public/icons/README.md), then re-add the icons/default_icon fields.
  action: {
    default_popup: 'src/popup/index.html',
  },
  options_page: 'src/options/index.html',
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
      all_frames: false,
    },
  ],
  permissions: ['storage', 'scripting', 'activeTab', 'tabs'],
  host_permissions: [
    'https://generativelanguage.googleapis.com/*',
    'https://api.groq.com/*',
    'http://127.0.0.1:11434/*',
    'http://localhost:11434/*',
  ],
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'",
  },
});
