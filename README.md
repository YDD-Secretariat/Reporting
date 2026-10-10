# MANCOM Reporting · Vercel edition

A read-only reporting portal for area leaders, area secretaries and secretariat administrators.

**Start with [DEPLOYMENT.md](DEPLOYMENT.md).** The package is ready to configure and deploy; it is not connected to your live Google Sheet yet. No live spreadsheet, account credentials or repository access was supplied.

## What changed

- Vercel serves the interface and a Node.js API at `/api/reporting`.
- The API reads Google Sheets directly using a Google Cloud service account. No Apps Script URL or JSONP is used.
- Google sign-in, signed eight-hour HttpOnly sessions, verified Google account IDs and server-side role/area filtering.
- The `Users` tab controls access. Disable or change a user and the next API request applies the change.
- The `Programmes` tab registers each report and its response tab; reports are fetched individually when selected.
- Optional column mapping supports forms with different field names.
- Preserved area cards, dashboard, area/submission filters, search, sorting, WhatsApp reminder links, PNG export, print/PDF and local XLSX import.
- Refreshed responsive green interface, signed-in identity and sign-out; full submitted-field table below the summaries.
- Removed the original 400-row/30-column read truncation. Empty reports with headers work normally.
- Local workbook import stays local and is filtered to the signed-in area. It does not update Google Sheets.

## Roles

| Role value in Users | Access |
| --- | --- |
| `admin` | All areas, all active reports; read-only |
| `area_leader` | Assigned area only, across active reports; read-only |
| `area_secretary` | Assigned area only, across active reports; read-only |

There is no public report access, self-registration, password storage or report-writing endpoint. Access is checked in the API, not just by hiding controls. The public HTML is an empty application shell; all report data requires a valid session.

## Architecture

Browser → Vercel API → Google Sheets API → private reporting workbook.

Google Identity verifies who is signing in. The Users tab verifies that person's role and area. The Google Cloud service account lets the **server** read the workbook. These are separate credentials.

A separate Cloud Run worker is not required for this design. The Vercel function performs the server-side work with the Google Cloud service account, matching the direct-API approach requested. Service-account tokens are reused by Google's auth library, related ranges are batch-read and only the selected report is sent to the browser. Live speed still depends on Google API latency, workbook size and concurrency; it has not been benchmarked against your PPE deployment.

## Files

- `public/`: the three original page routes plus login, shared styles and session UI.
- `api/reporting.js`: Vercel entry point.
- `lib/`: authorization, session verification, Google API access and report mapping.
- `templates/`: CSV examples for creating tabs; example users are disabled.
- `tests/security.test.js`: security and report routing tests.
- `DEPLOYMENT.md`: deployment, account enrolment, report setup and migration.
- `VALIDATION.md`: completed checks and live checks still required.

## Development

Use Node 22 or newer:

```bash
npm ci
npm test
npm run build
```

For live local development, fill `.env` from `.env.example`, set `APP_ORIGIN=http://localhost:3000`, add that origin to your Google OAuth client, then run:

```bash
node --env-file=.env scripts/dev.mjs
```

The local server uses the same real authentication and API handler. It does not contain a test login or production bypass. `NODE_ENV=development` only allows the session cookie over local HTTP. Do not set it on Vercel.

## Reporting assumptions

Each report/occurrence gets its own response tab and Programmes row. For example, use `Youth Camp 2026` and `Youth Camp 2027` as separate reports. If one form is reused monthly, separate/archive its response tabs per month before registering them; the app does not split one tab by date automatically.

As in the original app, summary attendance and blessings use the **first** submitted row per location, and repeated rows are flagged on the cards. Full details include every row. A total of zero is displayed when the mapped metric has no value. Attendance defaults to Total, falling back to teenage male + teenage female + parents. Other report-specific metrics remain visible in submission details; the app does not infer their meaning.

All reports share the Areas and Branches roster. Reporting scope filters central, zonal or branch-based activity. For different participation rosters, adjust the shared roster carefully; report-specific rosters are not included in this version.

## Official references

- [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js)
- [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json)
- [Google ID token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
- [Google Sheets batch reads](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchGet)
