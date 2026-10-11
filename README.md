> **Version 4 includes Programme Checklists. Start with READINESS-SETUP.md for the two new tabs and Editor access required for readiness saves.** Existing reporting/feedback instructions follow.

# MANCOM Reporting and Feedback v3

**Read START-HERE.md first.** This ZIP is the complete deployable app.

Existing routes: `/`, `/submissions.html`, `/dashboard.html`.
New route: `/feedback.html`.

Includes preapproved Google email login, read-only Google Sheets access, server-enforced area permissions, robust report-field matching, safe area aliases, multi-activity report summaries, feedback analytics, Microsoft Excel preview and editable PowerPoint export.

Use the existing Vercel configuration and environment variables. No new cloud keys are required. Users/Programmes changes do not need redeployment. New Feedback-prefixed tabs are discovered when the source list is refreshed.

## Development

Node 22 or newer:

```bash
npm ci
npm test
npm run build
```

For authenticated local development, fill `.env` from `.env.example`, set APP_ORIGIN=http://localhost:3000, add that origin to the Google OAuth client, then:

```bash
node --env-file=.env scripts/dev.mjs
```

No auth bypass or bundled real response data is present. The service account uses Google Sheets read-only scope. Microsoft Forms live synchronisation requires an external integration; downloaded Excel files are snapshots.

## Source layout

- api/reporting.js: Vercel function entry point.
- lib/: authenticated API, Google connection and sessions.
- public/modules/schema.js: shared schema detection and safe area canonicalisation.
- public/modules/feedback-model.js: disclosed rating/topic calculations.
- public/modules/feedback-export.js: browser PowerPoint generation.
- public/feedback.html, feedback.js, feedback.css: new dashboard.
- tests/: permission, schema and analytics tests.
- templates/: examples, not live data.

Bundled third-party libraries: html2canvas and PptxGenJS, each with its license in public/vendor. Google auth dependencies are locked in package-lock.json.

## References

- https://vercel.com/docs/functions/runtimes/node-js
- https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchGet
- https://gitbrent.github.io/PptxGenJS/docs/integration/
