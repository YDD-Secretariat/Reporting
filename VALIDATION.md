# Validation record

Validated locally on 9 October 2026. Live workbook and Google account credentials were not supplied.

## Automated backend checks — 16 passed

`npm test` verifies the real request handler with mock Google services:

1. Unauthenticated data request is rejected.
2. Area-scoped responses exclude other-area rows across all private datasets; query role/area spoofing has no effect.
3. Administrator sees all areas.
4. Switching reports changes the response sheet; unknown keys fail.
5. Disabling a user revokes an already-issued session at the next request.
6. Missing area assignment and unknown roles fail closed.
7. Verified Google account subject must match the enrolled subject.
8. Missing Area headers do not fall through to unfiltered data.
9. Headers-only reports represent zero submissions correctly.
10. Tampered and expired sessions fail.
11. Sensitive system sheets and duplicate report keys cannot enter the report registry.
12. Alternate report headings can map to Area and Total before filtering.
13. Cross-origin login/logout fail.
14. Verified login with the correct nonce issues an HttpOnly secure cookie.
15. Wrong nonce fails.
16. API responses disable caching; report writes are rejected.

`npm run build` parses every HTML inline script and checks that legacy Apps Script URLs/password parameters are absent from the public pages.

## Browser checks — passed with synthetic API fixtures

Actual headless Chromium loaded the updated pages and exercised:

- Area cards and missing-branch display.
- Switching from Back to School to a second programme with different totals.
- Switching to a report with zero submissions.
- Keeping selected report across navigation to the dashboard.
- Dashboard attendance aggregation.
- Mobile width of 390 px without page overflow.
- PNG export producing a downloadable PNG file using bundled html2canvas.
- Local XLSX import containing two areas: only the signed-in area rendered.
- Returning to live data after importing a workbook with a different report key.
- Sign-out and redirect of protected page data access.
- No uncaught page JavaScript errors in these flows.

Desktop cards, dashboard, login and mobile dashboard screenshots were visually inspected. Browser fixtures replaced Google sign-in and Sheets API responses; they did not exercise a real Google account or spreadsheet. Print controls and WhatsApp links are preserved, but no printer output or actual WhatsApp delivery was attempted.

## Deployment acceptance still required

- Real Google OAuth client/domain configuration and real user enrolment.
- Real service-account read permissions and actual reporting workbook schemas.
- Vercel deployment/build and routing in the user's project.
- Real-account area-isolation checks and disabling the old public Apps Script access path.
- Phone/device-specific print behaviour and export experience.
- Production traffic/load, Google API quotas and very large workbook behaviour.

The Google Sheet itself was not attached. Column mappings derive from the supplied HTML and Code.gs, so new or differing form layouts must be registered in Programmes as described in DEPLOYMENT.md.
