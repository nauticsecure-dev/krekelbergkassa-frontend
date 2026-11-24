# Desktop browser verification

## Observed Windows results — 19 November 2026

The camera no longer rerenders the fleet workspace on every zoom event. Boat photographs use transparent overview rasters and return to their original source at close zoom. The complete SVG artwork has an overview raster cache; mutations invalidate it immediately, active boat drags use the live SVG, and detail zoom or keyboard focus restores SVG rendering. The interactive SVG retains its hit targets and accessible boat names. Boat labels remain visible above the scene.

| Browser target | Version | Passed | Skipped | Failed |
| --- | --- | ---: | ---: | ---: |
| Chromium | 148.0.7778.96 | 23 | 0 | 0 |
| Google Chrome | 157.0.8103.79 | 23 | 0 | 0 |
| Microsoft Edge | 157.0.4341.60 | 23 | 0 | 0 |
| Firefox | 150.0.2 | 19 | 4 | 0 |
| WebKit | 26.4 | 19 | 4 | 0 |

The accepted daily result combines a 115-case run with a fresh 10-case recheck: **107 passed, eight skipped, zero outstanding failures**. The first run had 102 passes, eight skips and five failures in the new cache test. That test incorrectly assumed selection left zoom at 100%; selection deliberately fits the boat at 250%. After resetting the view before the overview/detail round trip, the cache test and benchmark passed on all five targets. This is a combined result, not one uninterrupted green run. CMS text/session cases were not rerun for this zoom change; complete matrix discovery found 235 cases.

The final recheck met the unchanged budgets with 250 boats, 50 loaded photographs, 250 labels, an aerial photograph and planned-move arrows. These are local Windows x64 results with tracing off and foreground visibility verified:

| Target | Load | Viewport updates/second | p95 input-to-frame |
| --- | ---: | ---: | ---: |
| WebKit | 8,996 ms | 15.59 | 99 ms |
| Firefox | 9,055 ms | 27.05 | 54 ms |
| Chromium | 8,542 ms | 30.00 | 34.1 ms |
| Google Chrome | 9,866 ms | 29.45 | 37.9 ms |
| Microsoft Edge | 8,684 ms | 30.00 | 33.8 ms |
| Required budget | < 12,000 ms | >= 8 | < 180 ms |

All five targets also pass 2× pixel-density emulation, cache refresh after selection, detail zoom and keyboard-focus restoration. Raster allocation is limited to 16,777,216 pixels and 8,192 pixels per dimension; unsupported imagery/CORS or larger allocations retain live SVG rendering. These Windows results do not establish macOS or native Safari results. This workspace has no connected Mac execution host or configured remote Mac runner; the macOS workflow has not been executed in this session.

The separate real-Laravel run passed the two-instance authenticated API race and browser save/database-readback/reload in WebKit, Firefox and Chromium. Its disposable 250-boat SQLite fixture and evidence are retained at backend `storage/yard-local-9XTgyW/result.json` and `browser-results.json`. Browser HTTP is forwarded unchanged across both single-threaded PHP development instances; a focused proxy check also verified body/authorization preservation, upstream queue limits, and rejection of external targets. The earlier Firefox loading timeout is retained at `storage/yard-local-J4rxxU`.

Evidence: `test-results/zoom-final-daily/results.json`, `test-results/zoom-final-recheck/results.json`, and the case-by-case combined `test-results/zoom-verification-summary.json`. Rendering diagnostics are separate and do not count as passing checks. Overview screenshots in the final recheck are taken after performance measurement. The earlier 220-case CMS/daily matrix was recorded in the preceding work; its frontend raw reports were removed by a default Playwright output-directory cleanup and are not used as current evidence. The backend SQLite evidence above survives.

TypeScript (`npm run check:types`), seven camera/calibration/allocation/performance-budget contracts, and the backend signed-photo CORS test (nine assertions) pass. Photo checks cover transparency, original detail, preview URL cleanup and denied-CORS fallback. Local signed top-view storage permits the configured frontend origins; unsigned URLs remain denied and unrelated storage paths receive no added CORS access.

## Browser matrix

The history/concurrency runner now requires a real content-process startup in all three engines before seeding its private database. A restricted Windows process token can launch Firefox while blocking tab creation, producing `browserContext.newPage` errors; run the local integration runner with browser child processes permitted. The Firefox sandbox remains enabled. The runner enables available PHP bytecode caching for its two local servers and explicitly activates each browser client during UI checks.

`npm run test:werfcanvas:local` requires one API race plus nine browser cases (history filtering, save/readback/reload, and a two-client race/recovery/replan in each engine). Skips, missing tests, retries and failures cannot produce its PASS result. Each browser client is pinned to a distinct real PHP process for the race, and response headers identify the transport target. API replay uses the same actor/key through the other backend, and both backends are checked for persisted state. Reports are retained separately for startup, API and browser phases under backend `storage/yard-local-*`.

Keyboard editing now follows drag permissions for existing plans: planned/assigned work can be replanned from its planned destination; work already in progress remains protected. Position requests for geometry checks, safety approvals and saves contain only `x`, `y`, `rotation`, `scale` and `location_code`. Task/appointment metadata stays outside that object, matching Laravel's field allowlist. History coverage controls remain mounted while a filter loads, and the coverage panel retains its open state.

Fresh history/concurrency verification on 19 November 2026 passed one two-backend API race and all nine real browser cases in one uninterrupted run, with zero skips or retries. Evidence: backend `storage/yard-local-CCqi75/verification.json`, `api-race/results.json` and `browser/results.json`. Six focused keyboard cases also passed in `test-results/keyboard-replan-final/results.json`. The backend yard suite passed 44 tests with 775 assertions; TypeScript and syntax/diff checks passed. Earlier diagnostic failures remain in the preceding `storage/yard-local-*` folders. Missing historical archives and deployment-specific concurrency remain external requirements.

`npm run test:cross-browser` runs the CMS text, CMS session-safety and daily Werfcanvas suites in Chromium, Firefox, WebKit, installed Google Chrome and installed Microsoft Edge. Reports record each engine version, channel, host OS and architecture. This matrix covers these workflows, not every website route or every historic browser version.

Playwright WebKit is engine coverage, not the branded Safari application. A Windows WebKit pass is not a macOS pass. The workflow configuration defines macOS and Windows jobs; a local Windows run does not certify those jobs or the tester's particular Mac/Safari version.

## Run on the tester's Mac

Use Node.js 24 and run from this frontend repository:

```text
npm ci
npm run install:cross-browser
npm run test:cross-browser
```

Chrome and Edge must be installed for the two branded-channel projects. On a disposable CI runner, `npx playwright install chrome msedge` installs them. For engine-only checks use `CROSS_BROWSER_CHANNELS=0 npm run test:cross-browser`; for a focused WebKit run use `npm run test:cross-browser -- --project=webkit`. A selected subset is not a complete matrix pass.

The browser installer reuses the installed Playwright Chromium revision when available and stores additional engines under `.playwright-browsers/`, outside the test-output tree. Contract output is isolated under `test-results/contracts/`. Reports default to `test-results/cross-browser/`; set `CROSS_BROWSER_REPORT_DIR` to retain a separate run.

## Coverage boundaries

- Desktop keyboard, mouse/wheel, CMS edit/save/reload, expired-session recovery, permissions, conflicts, print layout, calendar navigation and populated-map checks run on every engine.
- The keyboard suite tests Command-Z and Command-Shift-Z explicitly. Save shortcuts use `ControlOrMeta`, so they use Command on macOS.
- Four native multi-touch scenarios use Chromium CDP. They run in Chromium/Chrome/Edge and are explicitly skipped in Firefox/WebKit. These skips are visible in the report and do not count as passes. Desktop Mac interactions have separate browser-independent coverage.
- Print-layout assertions and a screenshot run in every engine. Automated PDF generation runs only in Chromium, where Playwright supports it. Branded Safari print/PDF still requires native Safari validation.
- HTTP in the cross-browser UI matrix is intercepted, and development HMR is disabled to prevent compiler-driven page reloads. Real Laravel save/readback/reload is a separate suite: after installing the engines, run `npm run test:werfcanvas:local` from the frontend repository to exercise each engine against isolated local backend processes. The API race runs once because it is browser-independent.
- Live performance uses engine-independent cache control and records the actual engine/host. Narrow viewport/touch profiles are emulation; they do not establish physical-device performance.
- The daily-yard test worker disables trace recording because it includes the populated-map benchmark; failure screenshots and JSON evidence remain enabled. The matrix uses one test worker and the isolated Next server uses one compiler worker without persistent webpack cache. Numeric performance budgets are unchanged. Shared-host resource contention can still invalidate a target-device performance conclusion.

## Native Safari sign-off

The 20 November live-performance measurement counts observed viewport style changes per second and p95 intervals between those changes, rather than idle animation callbacks. It drives zoom every frame for three seconds, requires a foreground document, and rejects non-finite FPS or invalid update counts. The readiness/API/image/zoom budgets remain enforced without relaxed defaults. Desktop and narrow/touch browser profiles report their host and engine; they do not establish physical target-device performance. A representative live URL, authenticated storage state and actual target device/runner are still required for that sign-off.

Run the isolated site in the tester's actual Safari version, then confirm text editing and reload, Command undo/redo/save, wheel/trackpad zoom, draft recovery after a conflict, and print layout. Record the macOS/Safari versions and outcomes. This remaining native-application check must not be replaced by a WebKit-on-Windows result.

References: [Playwright browser support](https://playwright.dev/docs/browsers), [workflow](.github/workflows/cross-browser.yml).
