# Allowed admin layout patterns

Decision, 27 October 2026: five KPI columns start at `2xl` (1536px), not `xl` (1280px). At 1280px the 240px expanded sidebar plus page/card padding leaves cards below 190px in a five-column row. Retain three at xl for readable values/hints in DE/FR. Collapsing the sidebar does not change the viewport breakpoint. At 2xl use five; mobile uses one, sm uses two. This is a deliberate product default; do not change it per route.

| Pattern | Use and constraints |
| --- | --- |
| AdminPageHeader + AdminContent | Every rendered route; 1440px content cap, shared gutters. Redirects have no body. |
| PageHeaderStatsGrid | Header KPIs; 1/2/3/5 columns for five cards. Values wrap; hints must remain readable. |
| AdminContentGrid | Equal or proportional content sections; base stack, optional sm/lg column counts; min-w-0 children. |
| AdminSplitLayout | Main/aside workflows; stack below lg or xl, explicit sidebarWidth, minmax(0,1fr). |
| AdminFormGrid | Forms stack on mobile, two columns from sm; no fixed widths on inputs. |
| AdminTable | Horizontal scroll stays inside the table wrapper, never the main/page. |
| AdminDetailGrid / AdminSectionCard | Detail fields and panels; long IDs, emails, keys must wrap. |
| Domain canvas/editor | Local grid permitted for charts, invoice diff, POS keypad, document canvas. Must have a purpose, shrinkable tracks, and responsive evidence. Never another page shell. |

## Custom grid review

| Source | Decision | Runtime evidence still required |
| --- | --- | --- |
| AdminUi / AdminSplitLayout | Shared primitive; allowed four responsive templates with minmax(0,1fr). | Both sidebar positions and lg/xl at populated widths. |
| DocumentZoneEditor | Replaced fixed 1fr/18rem template with AdminSplitLayout, 18rem side. | Loaded document/zone drag and edit on mobile and desktop. |
| KassaAnalyticsDashboard | Allowed chart ratio 1.4:1. Both tracks now minmax(0,...) with min-w-0 children. | Long payment labels and populated charts. |
| audit/page | Allowed before/key/arrow/after diff, stacked below sm; shrinkable tracks. | Long populated before/after values in modal. |
| kassa/page | Two compact amount/keypad rows (1fr/7rem and 8rem/1fr). Domain pattern allowed, but pending populated/mobile verification. | Long amount, discount and payment flows at 390px. |

Equal-column grids are allowed only when their children fit; source approval is not a responsive pass. The generated source matrix lists route-to-component ownership, including delegated modals. Any new arbitrary grid requires an entry here and browser evidence at 390, 1280, 1536px with desktop sidebar expanded/collapsed. Form, table and modal evidence must use realistic long data, not just an empty page.
