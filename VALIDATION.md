# Version 4 readiness validation — 11 October 2026

Chromium browser checks passed for publishing, page and logo loading, mobile width (390 px), area submission, success acknowledgement, WhatsApp target and closed-link rejection. The leader page was visually inspected. No uncaught page errors occurred in these flows.

37 automated tests pass. Six added tests cover template validation, draft/publication separation, exact expiry, closure, stale revisions, area spoofing, private admin responses, invalid answers, role checks, authentication, origin checks and JSON content type. Build checks and JavaScript syntax checks pass. Google writes are mocked in automated tests; real service-account Editor access and Vercel deployment still require the go-live check in READINESS-SETUP.md.

# Version 3 validation — 10 October 2026

## Automated checks

`npm test`: 31 tests passed. `npm run build`: all page scripts parse and no legacy Apps Script endpoints remain in public pages.

Tests cover authentication, verified email-only enrolment, session integrity, revocation, role spoofing, server-side area isolation, report switching, protected system tabs, header mapping, safe area aliases and collisions, ambiguous/missing area fields, unknown numeric values, feedback denominators, inactive feedback discovery, and malicious response rows that resemble headings.

## Supplied-file and browser checks

During this build, the supplied master report, Teenage Weekend and Youth Weekend datasets were inspected and exercised with the shared schema normaliser. The two Teenage Weekend response datasets were duplicates.

All six Microsoft Forms exports were exercised through the browser importer and feedback API fixtures with these response counts:

| Feedback | Rows |
| --- | ---: |
| Beyond Butterflies | 92 |
| Back to School | 32 |
| Saturday Night With Jesus | 7 |
| Power of Giving | 29 |
| International Youth Camp | 78 |
| Apopreneur & Youth Weekend | 15 |

Chromium checks used the real request handler with mocked Google services and the supplied datasets. They covered source switching, all six local XLSX imports, report cards, activity filtering, report dashboard, administrator and Enugu-only feedback, area-restricted local imports, PowerPoint downloads, and desktop/mobile layouts at 390 px without horizontal overflow. No uncaught page errors occurred in these exercised flows.

Administrator and area-user PowerPoint files were generated. Export XML was checked for area isolation, and representative scorecard and heatmap slides were rendered using LibreOffice and visually inspected. Microsoft PowerPoint itself was not available for a native application check. The later addition of comparison-table slides has not received a separate visual render review.

These checks establish compatibility with the supplied formats; they do not guarantee semantic recognition of every future survey. Unknown questions stay inspectable, while ambiguous area assignments are withheld from area users. See START-HERE.md for mappings and aliases.

## Production acceptance still required

No live Vercel project, Google OAuth account, or production Google workbook was modified. Browser fixtures do not verify real credentials or deployment configuration.

After deployment, verify Google sign-in, service-account sheet access, the exact source-tab names, one administrator account and one area account, disabled-user revocation, and exports on your target devices. Review unresolved area names and retire any old publicly accessible reporting endpoint.

Google Sheets refresh and Microsoft Forms synchronisation are separate: this build polls its selected Google source; an Excel export remains a snapshot until you import or externally synchronise newer responses. No Microsoft Forms connector is included.

Private source workbooks, browser screenshots, generated sample decks, credentials and node_modules are excluded from the distributed ZIP.
