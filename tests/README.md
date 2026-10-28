# Frontend verification

The component-aware admin inventory is [ADMIN_AUDIT.md](../ADMIN_AUDIT.md), with allowed layouts in [ADMIN_LAYOUT_PATTERNS.md](../ADMIN_LAYOUT_PATTERNS.md) and scenario results in [ADMIN_VERIFICATION.md](../ADMIN_VERIFICATION.md). The generated inventory records the current route count, including alias routes. Run `npm run audit:admin`, `npm run verify:admin`, then `npm run report:admin`. Browser batches restart an isolated Next server on 3047 and preserve JSON, screenshots and traces under `artifacts/admin-audit`. Passing batches are reused only when the source fingerprint matches. Run browser, backend and TypeScript checks serially on this host to avoid exhausting the Windows paging file.

For one scenario use `node node_modules/@playwright/test/cli.js test --config playwright.admin-audit.config.ts --grep "scenario title"`; set `ADMIN_AUDIT_OUTPUT` to a unique path under `artifacts/admin-audit`. The ledger distinguishes source findings, interrupted log results, browser fixtures and backend permissions. No route receives complete sign-off from a smoke test.

Run commands from the frontend directory after `npm ci` and installation of the Playwright Chromium browser. For browser tests, start `npm run dev` in a separate terminal on port 3030; keep that terminal available to stop the server afterward.

| Command | Boundary verified |
| --- | --- |
| `npm run test:i18n` | Translation-auditor regressions; no browser or API. |
| `npm run test:contracts` | Pure frontend permission contracts; no browser or API. |
| `npm run test:ui` | Chromium UI integration with intercepted HTTP against the running local Next server. |
| `npx playwright test --config playwright.cms-regression.config.ts` | Starts an isolated local server on 3042; checks every public-page editor on desktop/mobile and Verkoop image Cancel, Save, locale metadata, step text and CTA reloads with stateful HTTP fixtures. |
| `npm run test:e2e` | Real staff-login smoke against the configured backend. Requires `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD`. |
| `node scripts/test-isolated-live.mjs` | Provisions a fresh SQLite database and dummy staff/products, starts isolated Laravel/Next servers, then runs real login and employee tariff save/reload/permission checks. No existing database or live provider credentials are used. |
| `npm run check:admin-i18n:strict` | Missing/empty translations and unresolved runtime patterns fail the gate. |

Browser UI tests intercept API requests and abort non-local browser origins. They cover fixture data, responsive layout, form payloads, error/retry handling and selected permissions. They do not prove persistence, financial effects, provider behavior, or complete business E2E. Provider sandbox credentials must never be needed for this suite.

The real-login smoke reads the local configured backend and must use a designated test account. It does not exercise Stalling, checkout, import, CMS publishing, or paid/external actions. Add full business scenarios only after provisioning an isolated backend/database and provider fakes; keep those claims separate from the UI suite.

The isolated live runner writes fixture databases, server logs and test results to a fresh workspace `_audit/isolated-live-*` directory. It creates random temporary credentials in memory, restores its modified tariff, and stops only its own server processes in `finally`. The ordinary browser suite continues to skip `pricing-live.spec.ts`; use the isolated runner to opt into that test safely.

Run the broad browser suite and isolated live runner serially on this Windows host. Running their Next servers together exhausted Windows paging memory during verification.

UI screenshots and traces are under `test-results`; the HTML report is under `playwright-report/ui`. The strict i18n gate checks NL/EN/DE/FR, including every key in the bounded enum families used by admin screens. Do not remove that gate or waive missing translations with fallback text.

For API-supplied enum values, use `tEnum` with an explicit family in `src/i18n/admin-enums.json`. Add new supported values to that registry and all four dictionaries. Unknown values use their supplied display fallback without sending arbitrary keys to the translator. The audit rejects unknown or dynamic family names and checks every registered key; its unit tests cover missing locales and unresolved families.

The isolated CMS suite writes full-page screenshots, failure traces and a JSON report under workspace `_audit/cms-page-regression-results*`. Its reload checks clear session storage but use intercepted HTTP; database persistence is separately exercised by backend `php artisan test --filter=CmsMediaPersistenceTest` against SQLite in memory with fake public storage. Neither suite publishes changes to the live website.
