# Small V4 patch: public checklist links and rich text

Apply this to your existing V4 application. This is NOT a full application replacement. Keep all files not included in this patch.

## 1. Fix the feedback source (two Google tab renames)

The attached workbook has:
- Feedback: a source-list header and one setup row. These are NOT survey responses. This explains the false 1 response / 0 areas display.
- Back To school: the actual 32 feedback responses with an Area column.

In the live reporting Google workbook:
1. Rename **Feedback** to **Source Register**. Keep the contents for reference.
2. Rename **Back To school** to **Feedback - Back to School 2026**.
3. Open Feedback / Insights and click Refresh.

Do not name the old source-list tab Feedback Registry or Feedback Sources: those still begin with Feedback plus a space and are auto-discovered. Source Register avoids that.

No new Programmes row is needed for the renamed feedback tab. Your existing backToSchool row continues pointing at Response, which is correct for the report. Do not change that row to point at the feedback dataset.

The app should now read 32 feedback responses. One has a blank Area and remains visible only to admin until you identify and correct its genuine area. Do not guess the area.

Alternative if you must preserve the tab names: register the real tab in Programmes with a unique Key, Sheet Name=Back To school, Active=YES and Type=feedback; also register the setup-only Feedback tab with another unique Key, Active=NO and Type=feedback. The two-renames route above is simpler.

## 2. Apply only this patch

1. Extract the ZIP.
2. Open your existing reporting GitHub repository.
3. Choose Add file → Upload files.
4. Drag the **lib**, **public** and **tests** folders from inside this patch into the upload area. Keep their folder structure. Matching files are updated; the editor assets are added.
5. Commit with a message such as “Public checklist links and formatted editor”.
6. Let the connected Vercel project deploy the new commit. If deployment does not start, check that you uploaded to the branch connected to your Production project.
7. After deployment is Ready, hard-refresh the browser (Ctrl+Shift+R).

No package.json, environment-variable, service-account, workbook-header or database changes are required for this patch. Keep the Editor access already needed for readiness saves. Keep APP_ORIGIN matching your production domain.

Do not upload the ZIP itself as the application. Do not replace the entire repository with only these files. The patch depends on the rest of V4 already being present.

## 3. Test your existing checklist link

Open an existing, unexpired readiness.html?id=... link in a private/incognito window.
- It opens without Google login or a Users row.
- The respondent enters their full name, email and area, then the readiness answers.
- A successful save displays the thank-you message and Bro. Paul Sobande’s WhatsApp button.
- Area Readiness records the email and selected canonical area in the existing columns.
- Role is public_link_unverified, making it clear that the email and area were supplied by the respondent rather than verified through an account.

Anyone possessing an active link can use it, including if it is forwarded. Public respondents cannot browse response history, edit checklists, or access reports/feedback. Those pages retain the existing login and area restrictions.

Expiry and Close link now still apply on the server, including if someone left the form open before the deadline. No need to recreate an existing checklist. A closed or expired checklist must be republished by admin to reopen it.

As before, an uncertain network error can occur after Google has received an append. Check the sheet before retrying. This patch does not add an exactly-once submission guarantee or a full anti-spam service.

## 4. Use the improved editor

Sign in as admin → Admin · Checklist editor → select your saved checklist.

The guidance editor now provides headings, bold/italic/underline/strikethrough, numbered/bullet lists, indentation, alignment, text/highlight colours, quotations and web/email links. Undo, redo, word count and a leader-view preview are included. Images and embedded videos are not supported.

Select text and use the toolbar. Existing plain text loads automatically. Save draft keeps changes private; Publish link makes them visible and restarts the selected lifetime. As before, republishing requires readers with an already-open form to reload before submitting.

The “Load updates” view displays entered email addresses and identifies public submissions as unverified. Older signed-in submissions remain readable.

## 5. Understand the report warning

The first screenshot is a working reporting page with a data-quality warning, not a deployment error. The attached workbook reproduces exactly 89 nonnumeric attendance/blessing cells:
- 11 attendance cells.
- 78 blessing cells.

Examples include “22 Males”, “28 Females”, “Not recorded”, “Heaven's record” and other narrative answers. Original answers remain in details. The existing application excludes those cells from numeric totals; it does not assume that “Not recorded” means zero. This patch does not alter numeric parsing or silently change report totals.

Useful cells to review in Response:
- P29: 35 (including those above 19 and below 13).
- M36: 22 Males; N36: 28 Females; O36: 45 Parents (Both Male and Female); P36: 45 -Total Attendance. These appear inconsistent: the three category figures sum to 95, whereas Total says 45. Confirm with the reporter before correcting the numbers.
- O108: ... included above.
- O109: None, they were not present... (narrative).
- O123: Youth 55 Male, 70 Female, parent 86 (multiple categories in one cell).
- M156: gender breakdown not taken; N156: Children 28; O156: Adult: 76. Do not assume children=teenagers or all adults=parents without confirmation.

Enter confirmed numeric counts in count columns and retain explanations in a notes/narrative field. Do not bulk-convert unknown blessing records to zero merely to remove the warning.

## Files changed

Replaced: lib/handler.js, lib/readiness.js, public/readiness.html, public/readiness.js, public/readiness.css, public/readiness-admin.html, public/readiness-admin.js.

Added: public/modules/checklist-rich.js, public/vendor/quill.js, public/vendor/quill.snow.css, public/vendor/quill-LICENSE.txt, tests/checklist-patch.test.js.

The feedback handler now explains when a source-list tab is selected instead of treating a configuration row as a response. The existing report calculation files are unchanged.

## Validation and limits

43 automated tests pass. Browser checks passed for anonymous opening and submission, stored email/area, rich text save/reload/render, mobile width, success/WhatsApp flow, closed-link rejection and signed-in checklist listing. Script/build checks pass. Google Sheets reads/writes were mocked in browser tests; the supplied workbook was inspected locally. No production website, live workbook, credentials or uploaded source file was modified.

To roll back code, revert the patch commit in GitHub. Existing public submissions remain marked unverified in the sheet. Restore sheet names separately only if you intend to undo the feedback source correction too.
