# Admin UI/UX source audit

Generated 2026-11-13 by `node scripts/audit-admin-pages.mjs`. 73 routes.

Conservative local component import/export closure, including modal components. Shared primitives and shell excluded from page signals; see sharedFiles. A module may contain unused exports. Source presence never proves runtime coverage or authorization.

All routes inherit the auth and admin shell from the admin layout. Counts below are source signals, **not browser passes**. Translation issues include unresolved dynamic keys; hardcoded copy is a review queue, including legitimate units and names. State columns record actual JSX use, not an import. Full file/line evidence and component paths: [source matrix](artifacts/admin-audit/source-matrix.json).

See [layout policy](ADMIN_LAYOUT_PATTERNS.md) and [verification ledger](ADMIN_VERIFICATION.md). Regenerate after extracting or moving components.

| Route | Source modules | i18n issues | Copy candidates | Custom grids | State JSX | Permission calls | Modals |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/admin/afspraken` | 16 | 9 | 2 | 0 | Loading, Error, Empty | 10 | 10 |
| `/admin/api-credentials` | 13 | 9 | 2 | 0 | Loading, Error, Empty | 0 | 8 |
| `/admin/audit` | 14 | 9 | 2 | 1 | Loading, Error, Empty | 2 | 7 |
| `/admin/beheer/dashboard-shortcuts` | 13 | 9 | 3 | 0 | Loading, Error | 0 | 5 |
| `/admin/beheer` | 4 | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/betalingen` | 13 | 9 | 2 | 0 | Loading, Error, Empty | 0 | 6 |
| `/admin/beveiliging` | 13 | 9 | 2 | 0 | Loading, Error | 0 | 5 |
| `/admin/boekhouding` | 13 | 9 | 4 | 0 | Loading, Error, Empty | 0 | 5 |
| `/admin/boten/[id]/[slug]` | 14 | 9 | 5 | 0 | Loading, Error | 2 | 9 |
| `/admin/boten/[id]` | 13 | 9 | 5 | 0 | Loading, Error | 2 | 9 |
| `/admin/boten` | 14 | 9 | 2 | 0 | Loading, Error, Empty | 3 | 7 |
| `/admin/bundels` | 13 | 9 | 2 | 0 | Loading, Error, Empty | 0 | 7 |
| `/admin/calculator/history` | redirect | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/calculator` | 13 | 9 | 3 | 0 | — | 0 | 8 |
| `/admin/calculator/pricing` | 13 | 9 | 7 | 0 | Loading, Error, Empty | 2 | 7 |
| `/admin/contracten` | redirect | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/diensten-prijzen` | 3 | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/diensten` | 13 | 9 | 6 | 0 | Loading, Error | 0 | 5 |
| `/admin/documenten` | redirect | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/facturen/[id]` | 14 | 9 | 2 | 0 | Loading, Error | 0 | 11 |
| `/admin/facturen/import/[id]` | 13 | 9 | 6 | 0 | Loading, Error | 0 | 9 |
| `/admin/facturen/import` | 13 | 9 | 2 | 0 | Loading, Error, Empty | 0 | 9 |
| `/admin/facturen/nieuw/handmatig` | 13 | 9 | 2 | 0 | Loading, Error | 6 | 5 |
| `/admin/facturen/nieuw` | 13 | 9 | 2 | 0 | Loading | 2 | 5 |
| `/admin/facturen` | 15 | 9 | 2 | 0 | Loading, Error, Empty | 0 | 5 |
| `/admin/facturen/templates/editor` | 15 | 9 | 5 | 0 | Loading, Error | 0 | 5 |
| `/admin/facturen/templates/layout` | 13 | 9 | 2 | 0 | Loading, Error | 0 | 5 |
| `/admin/facturen/templates` | 13 | 9 | 7 | 0 | Loading, Error, Empty | 0 | 6 |
| `/admin/financieel` | 3 | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/forms/[id]` | 13 | 9 | 19 | 0 | Loading, Error, Empty | 0 | 8 |
| `/admin/forms` | 13 | 9 | 14 | 0 | Loading, Error, Empty | 0 | 7 |
| `/admin/gebruikers` | 13 | 9 | 2 | 0 | Loading, Error, Empty | 0 | 10 |
| `/admin/incidenten` | 13 | 9 | 2 | 0 | Loading, Error, Empty | 0 | 7 |
| `/admin/instellingen` | 14 | 9 | 12 | 0 | Loading, Error | 9 | 5 |
| `/admin/kalender` | 17 | 9 | 2 | 0 | Loading, Error, Empty | 5 | 10 |
| `/admin/kassa/analytics` | 14 | 9 | 2 | 1 | Loading | 2 | 6 |
| `/admin/kassa/dagafsluiting` | 13 | 9 | 2 | 0 | Loading, Empty | 0 | 5 |
| `/admin/kassa` | 14 | 9 | 5 | 4 | Loading | 18 | 18 |
| `/admin/klanten/[id]/[slug]` | 16 | 9 | 3 | 0 | Loading, Error, Empty | 2 | 13 |
| `/admin/klanten/[id]` | 15 | 9 | 3 | 0 | Loading, Error, Empty | 2 | 13 |
| `/admin/klanten/[id]/timeline` | 13 | 9 | 3 | 0 | Loading, Error, Empty | 0 | 5 |
| `/admin/klanten` | 14 | 9 | 2 | 0 | Loading, Error, Empty | 2 | 8 |
| `/admin/leveranciers/[id]/[slug]` | 14 | 9 | 2 | 0 | Loading, Error, Empty | 2 | 6 |
| `/admin/leveranciers/[id]` | 13 | 9 | 2 | 0 | Loading, Error, Empty | 2 | 6 |
| `/admin/leveranciers` | 14 | 9 | 2 | 0 | Loading, Error, Empty | 2 | 6 |
| `/admin/makelaardij` | 3 | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/ocr-review` | redirect | 0 | 0 | 0 | — | 0 | 0 |
| `/admin/ocr/templates` | redirect | 0 | 0 | 0 | — | 0 | 0 |
| `/admin` | 14 | 9 | 2 | 0 | — | 5 | 5 |
| `/admin/planning` | 21 | 9 | 3 | 0 | Loading, Error, Empty | 20 | 16 |
| `/admin/product-groepen` | 13 | 9 | 5 | 0 | Loading, Error, Empty | 0 | 7 |
| `/admin/product-stats` | 13 | 9 | 3 | 0 | Loading, Error, Empty | 0 | 5 |
| `/admin/producten/[id]/[slug]` | 16 | 9 | 4 | 0 | Loading, Error | 4 | 11 |
| `/admin/producten/[id]` | 15 | 9 | 4 | 0 | Loading, Error | 4 | 11 |
| `/admin/producten/nieuw` | 15 | 9 | 4 | 0 | Error | 2 | 7 |
| `/admin/producten` | 13 | 9 | 2 | 0 | Loading, Error, Empty | 2 | 6 |
| `/admin/rapportages` | 13 | 9 | 4 | 0 | Loading, Error | 0 | 5 |
| `/admin/reminders` | 13 | 9 | 2 | 0 | Loading, Error, Empty | 0 | 7 |
| `/admin/scan-logs` | 13 | 9 | 2 | 0 | Loading, Error, Empty | 0 | 5 |
| `/admin/stalling/[id]/[slug]` | 15 | 9 | 14 | 0 | Loading, Error, Empty | 2 | 7 |
| `/admin/stalling/[id]` | 14 | 9 | 14 | 0 | Loading, Error, Empty | 2 | 7 |
| `/admin/stalling` | 16 | 9 | 2 | 0 | Loading, Error, Empty | 4 | 12 |
| `/admin/stalling/werfcanvas` | 30 | 9 | 211 | 4 | — | 7 | 5 |
| `/admin/sync` | 13 | 9 | 2 | 0 | — | 0 | 7 |
| `/admin/systeem` | 14 | 9 | 2 | 0 | Loading, Error | 0 | 9 |
| `/admin/systeembeheer` | 15 | 9 | 2 | 0 | Loading, Error | 0 | 9 |
| `/admin/taken` | 16 | 9 | 2 | 0 | Loading, Error, Empty | 2 | 5 |
| `/admin/tarieven/makelaardij` | 13 | 9 | 2 | 0 | Loading, Error, Empty | 0 | 7 |
| `/admin/timeline` | 13 | 9 | 8 | 0 | Loading, Error, Empty | 0 | 6 |
| `/admin/verkopen/[id]` | 14 | 9 | 2 | 0 | Loading, Error | 0 | 5 |
| `/admin/verkopen` | 14 | 9 | 2 | 0 | Loading, Error, Empty | 0 | 5 |
| `/admin/werkorders/[id]` | 15 | 9 | 8 | 0 | Loading, Error | 2 | 10 |
| `/admin/werkorders` | 14 | 9 | 3 | 0 | Loading, Error, Empty | 0 | 6 |
