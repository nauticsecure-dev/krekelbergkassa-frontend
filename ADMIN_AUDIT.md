# Admin UI/UX source audit

Generated 2026-10-27 by `node scripts/audit-admin-pages.mjs`. 71 routes.

Conservative local component import/export closure, including modal components. Shared primitives and shell excluded from page signals; see sharedFiles. A module may contain unused exports. Source presence never proves runtime coverage or authorization.

All routes inherit the auth and admin shell from the admin layout. Counts below are source signals, **not browser passes**. Translation issues include unresolved dynamic keys; hardcoded copy is a review queue, including legitimate units and names. State columns record actual JSX use, not an import. Full file/line evidence and component paths: [source matrix](artifacts/admin-audit/source-matrix.json).

See [layout policy](ADMIN_LAYOUT_PATTERNS.md) and [verification ledger](ADMIN_VERIFICATION.md). Regenerate after extracting or moving components.

| Route | Source modules | i18n issues | Copy candidates | Custom grids | State JSX | Permission calls | Modals |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/admin/afspraken` | 4 | 0 | 0 | 0 | Loading, Error, Empty | 10 | 5 |
| `/admin/api-credentials` | 2 | 0 | 0 | 0 | Loading, Error, Empty | 0 | 3 |
| `/admin/audit` | 3 | 0 | 10 | 1 | Loading, Error, Empty | 2 | 2 |
| `/admin/beheer/dashboard-shortcuts` | 2 | 0 | 1 | 0 | Loading, Error | 0 | 0 |
| `/admin/beheer` | 4 | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/betalingen` | 2 | 0 | 0 | 0 | Loading, Error, Empty | 0 | 1 |
| `/admin/beveiliging` | 2 | 0 | 0 | 0 | Loading, Error | 0 | 0 |
| `/admin/boekhouding` | 2 | 0 | 2 | 0 | Loading, Error, Empty | 0 | 0 |
| `/admin/boten/[id]/[slug]` | 3 | 0 | 3 | 0 | Loading, Error | 0 | 4 |
| `/admin/boten/[id]` | 2 | 0 | 3 | 0 | Loading, Error | 0 | 4 |
| `/admin/boten` | 3 | 0 | 2 | 0 | Loading, Error, Empty | 3 | 2 |
| `/admin/bundels` | 2 | 0 | 0 | 0 | Loading, Error, Empty | 0 | 2 |
| `/admin/calculator/history` | 2 | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/calculator` | 2 | 0 | 0 | 0 | — | 0 | 3 |
| `/admin/calculator/pricing` | 2 | 0 | 1 | 0 | Loading, Error, Empty | 2 | 2 |
| `/admin/contracten` | redirect | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/diensten-prijzen` | 3 | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/diensten` | 2 | 0 | 20 | 0 | Loading, Error | 0 | 0 |
| `/admin/documenten` | redirect | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/facturen/[id]` | 3 | 0 | 0 | 0 | Loading, Error | 0 | 6 |
| `/admin/facturen/import/[id]` | 2 | 0 | 15 | 0 | Loading, Error | 0 | 4 |
| `/admin/facturen/import` | 2 | 0 | 4 | 0 | Loading, Error, Empty | 0 | 4 |
| `/admin/facturen/nieuw/handmatig` | 2 | 0 | 1 | 0 | Loading, Error | 6 | 0 |
| `/admin/facturen/nieuw` | 2 | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/facturen` | 4 | 0 | 1 | 0 | Loading, Error, Empty | 0 | 0 |
| `/admin/facturen/templates/editor` | 4 | 0 | 14 | 0 | Loading, Error | 0 | 0 |
| `/admin/facturen/templates/layout` | 2 | 0 | 0 | 0 | Loading, Error | 0 | 0 |
| `/admin/facturen/templates` | 2 | 0 | 7 | 0 | Loading, Error, Empty | 0 | 1 |
| `/admin/financieel` | 3 | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/forms/[id]` | 2 | 0 | 51 | 0 | Loading, Error, Empty | 0 | 3 |
| `/admin/forms` | 2 | 0 | 29 | 0 | Loading, Error, Empty | 0 | 2 |
| `/admin/gebruikers` | 2 | 0 | 29 | 0 | Loading, Error, Empty | 0 | 5 |
| `/admin/incidenten` | 2 | 0 | 0 | 0 | Loading, Error, Empty | 0 | 2 |
| `/admin/instellingen` | 7 | 0 | 2 | 0 | Loading, Error | 10 | 0 |
| `/admin/kalender` | 4 | 0 | 9 | 0 | Loading, Error, Empty | 4 | 5 |
| `/admin/kassa/dagafsluiting` | 2 | 0 | 0 | 0 | Loading, Empty | 0 | 0 |
| `/admin/kassa` | 3 | 0 | 15 | 2 | Loading, Empty | 4 | 9 |
| `/admin/klanten/[id]/[slug]` | 5 | 0 | 7 | 0 | Loading, Error, Empty | 2 | 8 |
| `/admin/klanten/[id]` | 4 | 0 | 7 | 0 | Loading, Error, Empty | 2 | 8 |
| `/admin/klanten/[id]/timeline` | 2 | 0 | 1 | 0 | Loading, Error, Empty | 0 | 0 |
| `/admin/klanten` | 3 | 0 | 16 | 0 | Loading, Error, Empty | 2 | 3 |
| `/admin/leveranciers/[id]/[slug]` | 3 | 0 | 0 | 0 | Loading, Error, Empty | 0 | 1 |
| `/admin/leveranciers/[id]` | 2 | 0 | 0 | 0 | Loading, Error, Empty | 0 | 1 |
| `/admin/leveranciers` | 3 | 0 | 0 | 0 | Loading, Error, Empty | 2 | 1 |
| `/admin/makelaardij` | 3 | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/ocr-review` | redirect | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/ocr/templates` | redirect | 0 | 0 | 0 | — | 0 | 0 |
| `/admin` | 4 | 0 | 2 | 0 | — | 5 | 0 |
| `/admin/planning` | 2 | 0 | 0 | 0 | Loading | 5 | 0 |
| `/admin/product-groepen` | 2 | 0 | 3 | 0 | Loading, Error, Empty | 0 | 2 |
| `/admin/product-stats` | 2 | 0 | 13 | 0 | Loading, Error, Empty | 0 | 0 |
| `/admin/producten/[id]/[slug]` | 5 | 0 | 2 | 0 | Loading, Error | 4 | 6 |
| `/admin/producten/[id]` | 4 | 0 | 2 | 0 | Loading, Error | 4 | 6 |
| `/admin/producten/nieuw` | 4 | 0 | 2 | 0 | — | 0 | 2 |
| `/admin/producten` | 2 | 0 | 0 | 0 | Loading, Error, Empty | 2 | 1 |
| `/admin/rapportages` | 2 | 0 | 4 | 0 | Loading, Error | 0 | 0 |
| `/admin/reminders` | 3 | 0 | 0 | 0 | Loading, Error, Empty | 0 | 2 |
| `/admin/scan-logs` | 2 | 0 | 5 | 0 | Loading, Error, Empty | 0 | 0 |
| `/admin/stalling/[id]/[slug]` | 3 | 0 | 43 | 0 | Loading, Error, Empty | 0 | 2 |
| `/admin/stalling/[id]` | 2 | 0 | 43 | 0 | Loading, Error, Empty | 0 | 2 |
| `/admin/stalling` | 4 | 0 | 5 | 0 | Loading, Error, Empty | 4 | 7 |
| `/admin/sync` | 2 | 0 | 0 | 0 | — | 0 | 2 |
| `/admin/systeem` | 3 | 0 | 0 | 0 | Loading, Error | 0 | 4 |
| `/admin/systeembeheer` | 4 | 0 | 0 | 0 | Loading, Error | 0 | 4 |
| `/admin/taken` | 2 | 0 | 0 | 0 | Loading, Error, Empty | 0 | 0 |
| `/admin/tarieven/makelaardij` | 2 | 0 | 0 | 0 | Loading, Error, Empty | 0 | 2 |
| `/admin/timeline` | 2 | 0 | 29 | 0 | Loading, Error, Empty | 0 | 1 |
| `/admin/verkopen/[id]` | 3 | 0 | 0 | 0 | Loading, Error | 0 | 0 |
| `/admin/verkopen` | 3 | 0 | 0 | 0 | Loading, Error, Empty | 0 | 0 |
| `/admin/werkorders/[id]` | 2 | 0 | 12 | 0 | Loading, Error | 0 | 5 |
| `/admin/werkorders` | 3 | 0 | 1 | 0 | Loading, Error, Empty | 0 | 1 |
