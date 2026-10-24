# Admin UI/UX audit matrix

Code scan of `src/app/[locale]/admin/**/page.tsx` on 23 Oct 2026. Every admin route is already wrapped by `AdminShell` (and therefore `AdminPageShell`) in `src/app/[locale]/admin/layout.tsx`.

Regenerate the raw signals with `node scripts/audit-admin-pages.mjs`.

| Column | Meaning |
| --- | --- |
| Shell | Page renders inside the shared admin shell. Redirect-only routes are marked redirect. |
| No raw i18n | `static` means this file only calls `t()` with literal keys, and `npm run check:admin-i18n` confirms those keys exist in nl, en, de and fr. `dynamic` means the file still builds a key with a template string, so a missing enum value can render the raw key. |
| Responsive grid | `shared` means no one-off `grid-cols-[...]` template. `custom` means the page still owns a grid template. |
| Empty/Error | The page file imports `EmptyState`, `ErrorState` or `LoadingState`. A hub that only links elsewhere will not. |
| RBAC `can()` | The page calls `usePermission()` / `userCan()`. Navigation itself is permission-gated in `AdminSidebar`. |

| Page route | Shell | No raw i18n | Responsive grid | Empty/Error | RBAC `can()` |
| --- | --- | --- | --- | --- | --- |
| `/admin` | yes | static | shared | no | yes |
| `/admin/afspraken` | yes | static | shared | yes | no |
| `/admin/api-credentials` | yes | dynamic | shared | yes | no |
| `/admin/audit` | yes | dynamic | custom | yes | no |
| `/admin/beheer` | yes | dynamic | shared | no | no |
| `/admin/beheer/dashboard-shortcuts` | yes | static | shared | no | no |
| `/admin/betalingen` | yes | static | shared | yes | no |
| `/admin/beveiliging` | yes | dynamic | shared | yes | no |
| `/admin/boekhouding` | yes | dynamic | shared | yes | no |
| `/admin/boten` | yes | static | shared | yes | no |
| `/admin/boten/[id]` | yes | dynamic | shared | yes | no |
| `/admin/bundels` | yes | static | shared | yes | no |
| `/admin/calculator` | yes | dynamic | shared | no | no |
| `/admin/calculator/history` | redirect | static | shared | no | no |
| `/admin/calculator/pricing` | yes | static | shared | yes | no |
| `/admin/contracten` | yes | dynamic | shared | no | no |
| `/admin/diensten` | yes | static | shared | yes | no |
| `/admin/diensten-prijzen` | yes | dynamic | shared | no | no |
| `/admin/documenten` | redirect | dynamic | shared | no | no |
| `/admin/facturen` | yes | static | shared | yes | no |
| `/admin/facturen/[id]` | yes | dynamic | shared | yes | no |
| `/admin/facturen/import` | yes | dynamic | shared | yes | no |
| `/admin/facturen/import/[id]` | yes | static | shared | yes | no |
| `/admin/facturen/nieuw` | yes | static | shared | no | no |
| `/admin/facturen/nieuw/handmatig` | yes | static | custom | yes | no |
| `/admin/facturen/templates` | yes | static | shared | yes | no |
| `/admin/facturen/templates/editor` | yes | static | shared | yes | no |
| `/admin/facturen/templates/layout` | yes | static | shared | yes | no |
| `/admin/financieel` | yes | dynamic | shared | no | no |
| `/admin/forms` | yes | static | shared | yes | no |
| `/admin/forms/[id]` | yes | static | shared | yes | no |
| `/admin/gebruikers` | yes | static | shared | yes | no |
| `/admin/incidenten` | yes | dynamic | shared | yes | no |
| `/admin/instellingen` | yes | static | shared | yes | no |
| `/admin/kalender` | yes | dynamic | custom | yes | no |
| `/admin/kassa` | yes | dynamic | custom | yes | no |
| `/admin/kassa/dagafsluiting` | yes | static | shared | yes | no |
| `/admin/klanten` | yes | static | shared | yes | no |
| `/admin/klanten/[id]` | yes | dynamic | shared | yes | no |
| `/admin/klanten/[id]/timeline` | yes | static | shared | yes | no |
| `/admin/leveranciers` | yes | static | shared | yes | no |
| `/admin/leveranciers/[id]` | yes | static | shared | yes | no |
| `/admin/makelaardij` | yes | dynamic | shared | no | no |
| `/admin/ocr-review` | redirect | dynamic | shared | no | no |
| `/admin/ocr/templates` | redirect | dynamic | shared | no | no |
| `/admin/planning` | yes | dynamic | shared | no | no |
| `/admin/product-groepen` | yes | static | shared | yes | no |
| `/admin/product-stats` | yes | static | shared | yes | no |
| `/admin/producten` | yes | static | shared | yes | no |
| `/admin/producten/[id]` | yes | static | shared | yes | no |
| `/admin/producten/nieuw` | yes | static | shared | no | no |
| `/admin/rapportages` | yes | dynamic | shared | yes | no |
| `/admin/reminders` | yes | dynamic | shared | yes | no |
| `/admin/scan-logs` | yes | static | shared | yes | no |
| `/admin/stalling` | yes | dynamic | shared | yes | no |
| `/admin/stalling/[id]` | yes | dynamic | shared | yes | no |
| `/admin/sync` | yes | static | shared | no | no |
| `/admin/systeem` | yes | dynamic | shared | yes | no |
| `/admin/taken` | yes | dynamic | shared | yes | no |
| `/admin/tarieven/makelaardij` | yes | static | shared | yes | no |
| `/admin/timeline` | yes | dynamic | shared | yes | no |
| `/admin/verkopen` | yes | static | shared | yes | no |
| `/admin/werkorders` | yes | static | shared | yes | no |
| `/admin/werkorders/[id]` | yes | dynamic | shared | yes | no |

64 page files. This is not a click-through. A `static` mark does not prove the French copy reads well, and a `yes` on empty/error does not prove the failure state was exercised in the browser.

## Still open

- Custom page grids remain on `/admin/kassa`, `/admin/kalender`, `/admin/audit` and `/admin/facturen/nieuw/handmatig`.
- Dynamic `t(\`...\${}\`)` calls remain on the pages marked `dynamic`. Product category and visibility labels no longer do this.
- Page bodies do not yet call `can()` except the dashboard. The sidebar and the Nieuw menu do.
