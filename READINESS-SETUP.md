# Programme checklist & area readiness — v4

This ZIP is the complete application. Existing reports, feedback and email login are included.

## One-time setup (required before publishing)

1. In the same Google workbook identified by GOOGLE_SHEET_ID, create two **blank tabs** with these exact names:
   - Area Readiness
   - Programme Checklists
2. Share this workbook with the existing service-account email as **Editor**, rather than Viewer. No new Google key or OAuth client is needed. Keep the Users sheet and checklist configuration protected from ordinary leaders. If Users is in a separate workbook, that workbook can remain Viewer access for the service account.
3. Replace the application files in the existing repository with this folder's contents, preserving api, lib and public. Keep existing environment variables. Deploy through your connected Vercel project.
4. APP_ORIGIN must exactly match the production origin, such as https://your-project.vercel.app, without a trailing slash. This protects all writes. Visit that domain when publishing/submitting.
5. Sign in as admin. Choose **Admin · Checklist editor** from the navigation.

The app fills the blank tabs' headers on first save. CSV header templates are supplied if you prefer to add them yourself. Do not register these tabs in Programmes as reporting/feedback sources. The backend rejects these two system tabs as report sources.

## Prepare and publish

- Start with the consolidated retreat template, or change its title, guidance and questions.
- The template merges the two supplied documents, removes duplicated material, and keeps the critical requirements in the reading section. Six grouped readiness questions keep the form compact; select Ready only when all items in that group are ready.
- The original programme dates are 23–25 October 2026 and the source submission deadline is 14 October. Edit those dates when reusing it. Written deadlines do not configure expiry automatically.
- Add/remove questions; edit their labels, types, options and required status. Supported types are short answer, long answer, whole number, date and choice.
- **Save draft** keeps work private. It does not change a published page.
- Choose a lifetime of 1–90 whole days: for example 2, 4 or 10. **Publish link** starts the window immediately and shows the exact closing time in Lagos time.
- Copy the generated link and share it yourself. The application does not send WhatsApp messages or invitations.
- **Close link now** blocks new submissions immediately. Publishing again reopens the same link with the current content and a new expiry. To issue a different link, start a new checklist.
- Readers who opened an older version before republication must reload before submitting. The server checks the revision and expiry on submission, not only when the page loads.
- Edit one checklist in one admin session at a time. The most recently appended publication controls the live link; simultaneous editors do not get a conflict-resolution screen.

## Leader experience

The shared link opens the programme guidance with the YDD logo and “Fill your readiness now” buttons at both ends. Leaders use their existing approved Google sign-in and are returned to the shared checklist. A link does not grant anonymous access or override user permissions.

Area and identity are taken from the authorised account. Leaders cannot submit on behalf of another area. Admins can select an area from the roster when recording an update. Unknown area assignments must be resolved before submission.

On a confirmed save, the page thanks the leader and shows a reference number. A WhatsApp button opens a conversation with Bro. Paul Sobande, Secretariat Head, at +234 813 192 7116. Clicking does not automatically send a message.

An expired or closed link shows a closed message and the server rejects submissions. The page is guidance and readiness reporting, not event approval. A “Not ready” update is accepted so gaps can be escalated.

## How sheets store the information

Area Readiness has one row per update:

Submitted at | Submission ID | Page ID | Revision | Programme | Area | Name | Email | Role | Answers JSON | Answers

The Answers column contains readable question-and-answer lines. Answers JSON retains stable question IDs. This fixed layout supports different admin-edited forms without moving old answers under new column headings. Every update preserves the original programme title and question labels. Earlier updates are retained; a later update does not overwrite them.

Programme Checklists stores draft/publication/closure versions, their expiry and the form definitions. It is an internal configuration tab; do not manually reorder or delete its version rows. Saving a new draft preserves the live publication until Publish is selected.

Admin → Load updates shows the selected checklist’s submissions, newest first, plus distinct responding-area count. Ordinary users do not have access to this response listing. Existing reports and feedback keep their prior area restrictions.

## Failure handling and limits

- Missing tabs, unexpected header changes or insufficient write permission produce an error instead of a success acknowledgement.
- If a network error occurs after submitting, check with the administrator before retrying: Sheets append is not a transactional exactly-once service, and a save might have reached Google before the response was lost.
- Double-clicks are blocked in the current browser while saving. Intentional later updates create another dated row.
- Guidance: 18,000 characters. Questions: 1–40. Answers: 20,000 characters total. Links: up to 90 days.
- This version does not upload supporting documents, send reminders, or automatically approve events.
- Existing service-account reads remain read-only; a separate write-scoped client appends only to the two hard-coded readiness destinations using RAW values, so answers are not evaluated as spreadsheet formulas.

## Go-live check

Publish a two-day test page as admin. Open its link in an area account, confirm the assigned area, submit once and verify the new Area Readiness row. Close the link and confirm that further submissions fail. Then publish your final page with the required deadline. No live workbook or Vercel project was changed while preparing this package.
