# Admin UI/UX source audit

Generated 2026-11-09 by `node scripts/audit-admin-pages.mjs`. 73 routes.

Conservative local component import/export closure, including modal components. Shared primitives and shell excluded from page signals; see sharedFiles. A module may contain unused exports. Source presence never proves runtime coverage or authorization.

All routes inherit the auth and admin shell from the admin layout. Counts below are source signals, **not browser passes**. Translation issues include unresolved dynamic keys; hardcoded copy is a review queue, including legitimate units and names. State columns record actual JSX use, not an import. Full file/line evidence and component paths: [source matrix](artifacts/admin-audit/source-matrix.json).

See [layout policy](ADMIN_LAYOUT_PATTERNS.md) and [verification ledger](ADMIN_VERIFICATION.md). Regenerate after extracting or moving components.

| Route | Source modules | i18n issues | Copy candidates | Custom grids | State JSX | Permission calls | Modals |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/admin/afspraken` | 14 | 12 | 8 | 0 | Loading, Error, Empty | 10 | 10 |
| `/admin/api-credentials` | 11 | 12 | 3 | 0 | Loading, Error, Empty | 0 | 8 |
| `/admin/audit` | 12 | 12 | 3 | 1 | Loading, Error, Empty | 2 | 7 |
| `/admin/beheer/dashboard-shortcuts` | 11 | 12 | 4 | 0 | Loading, Error | 0 | 5 |
| `/admin/beheer` | 4 | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/betalingen` | 11 | 12 | 3 | 0 | Loading, Error, Empty | 0 | 6 |
| `/admin/beveiliging` | 11 | 12 | 3 | 0 | Loading, Error | 0 | 5 |
| `/admin/boekhouding` | 11 | 12 | 5 | 0 | Loading, Error, Empty | 0 | 5 |
| `/admin/boten/[id]/[slug]` | 12 | 12 | 6 | 0 | Loading, Error | 2 | 9 |
| `/admin/boten/[id]` | 11 | 12 | 6 | 0 | Loading, Error | 2 | 9 |
| `/admin/boten` | 12 | 12 | 3 | 0 | Loading, Error, Empty | 3 | 7 |
| `/admin/bundels` | 11 | 12 | 3 | 0 | Loading, Error, Empty | 0 | 7 |
| `/admin/calculator/history` | redirect | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/calculator` | 11 | 12 | 4 | 0 | — | 0 | 8 |
| `/admin/calculator/pricing` | 11 | 12 | 8 | 0 | Loading, Error, Empty | 2 | 7 |
| `/admin/contracten` | redirect | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/diensten-prijzen` | 3 | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/diensten` | 11 | 12 | 7 | 0 | Loading, Error | 0 | 5 |
| `/admin/documenten` | redirect | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/facturen/[id]` | 12 | 12 | 3 | 0 | Loading, Error | 0 | 11 |
| `/admin/facturen/import/[id]` | 11 | 12 | 7 | 0 | Loading, Error | 0 | 9 |
| `/admin/facturen/import` | 11 | 12 | 3 | 0 | Loading, Error, Empty | 0 | 9 |
| `/admin/facturen/nieuw/handmatig` | 11 | 12 | 3 | 0 | Loading, Error | 6 | 5 |
| `/admin/facturen/nieuw` | 11 | 12 | 3 | 0 | Loading | 2 | 5 |
| `/admin/facturen` | 13 | 12 | 3 | 0 | Loading, Error, Empty | 0 | 5 |
| `/admin/facturen/templates/editor` | 13 | 12 | 6 | 0 | Loading, Error | 0 | 5 |
| `/admin/facturen/templates/layout` | 11 | 12 | 3 | 0 | Loading, Error | 0 | 5 |
| `/admin/facturen/templates` | 11 | 12 | 8 | 0 | Loading, Error, Empty | 0 | 6 |
| `/admin/financieel` | 3 | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/forms/[id]` | 11 | 12 | 20 | 0 | Loading, Error, Empty | 0 | 8 |
| `/admin/forms` | 11 | 12 | 15 | 0 | Loading, Error, Empty | 0 | 7 |
| `/admin/gebruikers` | 11 | 12 | 3 | 0 | Loading, Error, Empty | 0 | 10 |
| `/admin/incidenten` | 11 | 12 | 3 | 0 | Loading, Error, Empty | 0 | 7 |
| `/admin/instellingen` | 12 | 12 | 12 | 0 | Loading, Error | 8 | 5 |
| `/admin/kalender` | 15 | 12 | 37 | 0 | Loading, Error, Empty | 5 | 10 |
| `/admin/kassa/analytics` | 12 | 12 | 3 | 1 | Loading | 2 | 6 |
| `/admin/kassa/dagafsluiting` | 11 | 12 | 3 | 0 | Loading, Empty | 0 | 5 |
| `/admin/kassa` | 12 | 13 | 6 | 4 | Loading | 15 | 17 |
| `/admin/klanten/[id]/[slug]` | 14 | 12 | 4 | 0 | Loading, Error, Empty | 2 | 13 |
| `/admin/klanten/[id]` | 13 | 12 | 4 | 0 | Loading, Error, Empty | 2 | 13 |
| `/admin/klanten/[id]/timeline` | 11 | 12 | 4 | 0 | Loading, Error, Empty | 0 | 5 |
| `/admin/klanten` | 12 | 12 | 3 | 0 | Loading, Error, Empty | 2 | 8 |
| `/admin/leveranciers/[id]/[slug]` | 12 | 12 | 3 | 0 | Loading, Error, Empty | 0 | 6 |
| `/admin/leveranciers/[id]` | 11 | 12 | 3 | 0 | Loading, Error, Empty | 0 | 6 |
| `/admin/leveranciers` | 12 | 12 | 3 | 0 | Loading, Error, Empty | 2 | 6 |
| `/admin/makelaardij` | 3 | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/ocr-review` | redirect | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/ocr/templates` | redirect | 0 | 0 | 0 | — | 0 | 0 |
| `/admin` | 12 | 12 | 3 | 0 | — | 5 | 5 |
| `/admin/planning` | 19 | 12 | 43 | 0 | Loading, Error, Empty | 20 | 16 |
| `/admin/product-groepen` | 11 | 12 | 6 | 0 | Loading, Error, Empty | 0 | 7 |
| `/admin/product-stats` | 11 | 12 | 4 | 0 | Loading, Error, Empty | 0 | 5 |
| `/admin/producten/[id]/[slug]` | 14 | 12 | 5 | 0 | Loading, Error | 4 | 11 |
| `/admin/producten/[id]` | 13 | 12 | 5 | 0 | Loading, Error | 4 | 11 |
| `/admin/producten/nieuw` | 13 | 12 | 5 | 0 | Error | 2 | 7 |
| `/admin/producten` | 11 | 12 | 3 | 0 | Loading, Error, Empty | 2 | 6 |
| `/admin/rapportages` | 11 | 12 | 5 | 0 | Loading, Error | 0 | 5 |
| `/admin/reminders` | 11 | 12 | 3 | 0 | Loading, Error, Empty | 0 | 7 |
| `/admin/scan-logs` | 11 | 12 | 3 | 0 | Loading, Error, Empty | 0 | 5 |
| `/admin/stalling/[id]/[slug]` | 13 | 12 | 15 | 0 | Loading, Error, Empty | 2 | 7 |
| `/admin/stalling/[id]` | 12 | 12 | 15 | 0 | Loading, Error, Empty | 2 | 7 |
| `/admin/stalling` | 14 | 12 | 4 | 0 | Loading, Error, Empty | 4 | 12 |
| `/admin/stalling/werfcanvas` | 9 | 1 | 333 | 4 | — | 4 | 0 |
| `/admin/sync` | 11 | 12 | 3 | 0 | — | 0 | 7 |
| `/admin/systeem` | 12 | 12 | 3 | 0 | Loading, Error | 0 | 9 |
| `/admin/systeembeheer` | 13 | 12 | 3 | 0 | Loading, Error | 0 | 9 |
| `/admin/taken` | 12 | 12 | 4 | 0 | Loading, Error, Empty | 0 | 5 |
| `/admin/tarieven/makelaardij` | 11 | 12 | 3 | 0 | Loading, Error, Empty | 0 | 7 |
| `/admin/timeline` | 11 | 12 | 9 | 0 | Loading, Error, Empty | 0 | 6 |
| `/admin/verkopen/[id]` | 12 | 12 | 3 | 0 | Loading, Error | 0 | 5 |
| `/admin/verkopen` | 12 | 12 | 3 | 0 | Loading, Error, Empty | 0 | 5 |
| `/admin/werkorders/[id]` | 11 | 12 | 9 | 0 | Loading, Error | 0 | 10 |
| `/admin/werkorders` | 12 | 12 | 4 | 0 | Loading, Error, Empty | 0 | 6 |
