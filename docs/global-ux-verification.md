# Global UX and product architecture verification

## Implemented behavior

- Product, customer, boat, storage and supplier detail links use the stable public ID with a descriptive slug. Existing UUID links remain valid. Reserved child-page names are omitted from descriptive slug segments to avoid navigation collisions. Direct API detail lookups, route model binding, nested resources, global search, invoice provenance and product statistics carry the corresponding identifiers.
- Dashboard shortcuts use the existing database model and CRUD endpoints. Role restrictions and destination permissions are both enforced. Management still requires settings.update. PATCH preserves omitted fields. Reordering requires every existing ID exactly once and updates order transactionally. Custom URLs must use the named destination path.
- A successful empty shortcut response stays empty after reload. API failures display an explicit message with permission-filtered defaults. The editor reports failed mutations and retains the prior order after a failed reorder.
- Backend employee and finance role names survive session normalization. Unknown roles become guest. Authoritative empty permission lists deny access. Operational routes and demonstrated create/edit/delete, checkout and refund controls use the existing API permissions. Technical surfaces and global audit search remain restricted to super_admin; authorized record-level business feeds retain their scoped access. Token abilities now match the pre-existing seeded role permissions; role grants were not changed.
- The services overview discovers groups and links from the public catalog. New catalog slugs use a dynamic service route. Catalog requests preserve the active locale. The existing editorial overview is retained for API failure only; an empty catalog has an explicit empty state.
- Service copy, FAQs, pricing controls and product tariff controls are translated in NL/EN/DE/FR. Catalog tariff units and on-request labels follow the requested locale.
- Pricing product selection searches the server with a debounce and retains the selected record. It no longer preloads a fixed first 200 products. Pricing forms stack on small screens; the product tariff editor distinguishes API errors from empty data.

## Verification

- Backend focused regressions: 19 tests / 202 assertions for public catalog, pricing permissions and the new global UX contracts.
- Additional linked-resource regressions: 19 tests / 176 assertions for invoice registers, customer timeline feeds and token-ability parity.
- Follow-up regressions also cover malformed custom shortcut URLs, the actual first-200-product search boundary and technical versus scoped audit access.
- Frontend contracts: 23 passed, including creation links in all four locales, readable URLs, role access, shortcut empty/failure states and complete service/pricing translations.
- Browser integration: 3 passed. Empty shortcuts survived reload; API failure showed defaults explicitly; mobile pricing searched and saved the selected product; a newly discovered service preserved French locale through navigation.
- Source and test TypeScript checks passed using a configuration that excludes generated Next build directories.
- Strict translation audit passed with zero missing entries and zero unresolved runtime key patterns across NL/EN/DE/FR.
- The 390px pricing form screenshot was visually inspected and the browser test verified no horizontal page overflow. Evidence: ../../_audit/global-ux/pricing-mobile.png.

Backend tests use SQLite in memory and fake outbound HTTP. Browser tests intercept application HTTP and do not prove provider behavior or database persistence; the backend tests cover persistence independently. No deployment, production build or live database backfill was performed.

## Reproduce

From the frontend: npm run check:types; npm run test:contracts; npm run check:admin-i18n:strict; npm run test:global-ux.

From the backend: php vendor/phpunit/phpunit/phpunit --filter 'GlobalUxTest|PublicServiceCatalogTest|PricingRulePermissionsTest|InvoiceRegisterTest|CustomerTimelineFeedTest'.

Existing public-ID and shortcut migrations must be present. The existing public-ids:backfill command now repairs missing slugs while retaining already assigned public IDs.
