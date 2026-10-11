> **Version 4 includes Programme Checklists. Start with READINESS-SETUP.md for the two new tabs and Editor access required for readiness saves.** Existing reporting/feedback instructions follow.

# MANCOM Reporting and Feedback v3

This is the **complete application**, including the simplified email-based login, report cards, reporting dashboard, feedback dashboard and PowerPoint export. It is not a patch that needs the earlier ZIP.

## 1. Update the same GitHub / Vercel project

1. Extract the ZIP and open the `Reporting-main` folder.
2. Upload the **contents** of that folder to your existing reporting repository, replacing the matching files and preserving the folder structure. Do not upload only the ZIP and do not put everything into public.
3. The repository root should contain `api`, `lib`, `public`, `scripts`, `tests`, `package.json`, `package-lock.json` and `vercel.json`.
4. Keep your existing Vercel project and environment variables. This update needs no new Google project, service-account key or OAuth client.
5. Let Vercel deploy the new commit. Use Framework Other, build `npm run build`, output `public`, Node 22 or newer, and the repository root as Root Directory.
6. Sign out and back in. Use the new navigation dropdown at the top to choose Reports / Area cards, Reports / Dashboard, or Feedback / Insights.

The page is `/feedback.html`. All sources remain in the Google workbook selected by `GOOGLE_SHEET_ID`. Optional `GOOGLE_USERS_SHEET_ID` still supports a separate restricted Users workbook.

## 2. Login: approve everyone in one batch

Use the Users tab with row 1 headers:

| Email | Name | Role | Area | Active |
| --- | --- | --- | --- | --- |
| their Gmail or Workspace address | Person's name | area_leader | Enugu Area | YES |
| their Gmail or Workspace address | Person's name | area_secretary | Anthony | YES |

For an administrator, Role is `admin` and Area may be blank. Only administrators can view all areas. Other users see their own area in reports, feedback, charts, comments and exports.

Google Subject is optional. Leave it blank or omit the column for Gmail/Google Workspace users. Existing nonblank subjects continue to restrict the row to that account. No deliberate failed login or ID collection is required. External addresses linked to Google, such as Yahoo addresses, should use an approved Gmail/Workspace account instead.

Set Active=NO to disable a user; the next API request applies the change. Adding 20–30 users means adding their rows, with no new deployment. Keep Users editing restricted to trusted administrators.

## 3. Report sources

Keep the existing Programmes, Areas and Branches tabs. Use Programmes to register report tabs:

| Key | Sheet Name | Label | Scope | Active | Type |
| --- | --- | --- | --- | --- | --- |
| backToSchool | Response | Back to School 2026 | all | YES | report |
| teenage2026 | Report - Teenage 2026 | Teenage Weekend and Concert 2026 | all | YES | report |
| youth2026 | Report - Youth 2026 | Youth Weekend 2026 | all | YES | report |

Use only rows whose response tabs actually exist. Sheet Name must match the live Google tab. Type may be omitted for existing report rows. Scope supports all, branch, central and zonal. Use all to see all location categories by default.

Your attached master workbook calls the Back to School response tab `Response`. Set Programmes B2 to Response unless you have renamed that live tab. The earlier value BACK TO SCHOOL 2026 points at a different name.

The two Teenage Weekend files contain the same 123 response records. Import one, not both. Copy only Form responses 1; the source files' ReportLog and Leaders tabs are not programme response datasets.

The app now recognises male/female as well as teenage male/female, different case/punctuation/spacing, standard location/header variants and optional title rows. Extra narrative fields stay in Submission details. An Activity / session filter separates multi-activity reports.

Report summaries use the first row per location and activity. Different activities at one location contribute to attendance totals; repeated records for the same location/activity are not added again. These totals measure attendance/participations, not necessarily unique people across activities. All original submission rows remain in details.

## 4. Add feedback without changing the code

The simplest convention is one tab per programme:

- `Feedback - IYC 2026`
- `Feedback - Back to School 2026`
- `Feedback - Beyond Butterflies`
- `Feedback - Apopreneur 2026`
- `Feedback - Power of Giving`
- `Feedback - Saturday Night`

A single tab named `Feedback` also works. The application discovers Feedback tabs automatically. Prefixes `Feedback -`, `Feedback_` and `Feedback ` are supported. Keep each source's original question headings and response rows.

To import a Microsoft Forms export into the shared Google workbook:

1. Open the existing Google reporting workbook.
2. Use File → Import → Upload and select the exported Excel file.
3. Choose **Insert new sheet(s)**. Do not replace the whole workbook.
4. Rename the imported response tab to one of the Feedback names above. Each Microsoft sample uses Sheet1.
5. Open Feedback / Insights and click Refresh. The new source appears.

If you prefer an existing tab name, register it in Programmes with Type=feedback, a unique Key, exact Sheet Name, Label and Active=YES. Optional Audience can say Participants or Leaders. To hide a discovered feedback source, register its exact Sheet Name with Type=feedback and Active=NO; explicit inactive rows override discovery.

For leaders and participants in the same source, add a Respondent type column to the combined response table. The dashboard offers group filtering. It does not invent leader responses when only participants' data are present.

### Live versus exported data

- The dashboard refreshes its selected Google Sheets source every 60 seconds while visible. Refresh also discovers newly added tabs.
- Google Forms can continue writing to their linked Google response tabs.
- A Microsoft Forms Excel export is a **snapshot**. Importing it into Google Sheets does not create an automatic Microsoft-to-Google connection.
- For ongoing Microsoft updates, use your organisation's existing integration or a separately configured Power Automate flow to append/update the corresponding Google feedback tab. This build does not include Microsoft Graph credentials or a Forms connector.
- When replacing a full Microsoft export, replace that feedback tab's dataset rather than appending the same responses again. Each nonblank feedback row counts as one response; the app does not guess which submissions are duplicates.

## 5. Local feedback preview

The Feedback page includes a Microsoft Excel upload control. Choose a file, then its worksheet. The same question detection and area rules apply. It accepts the six supplied Microsoft Forms formats, including their unusual worksheet dimensions.

The status explicitly says LOCAL SNAPSHOT. The upload does **not** save into the shared Google workbook. Use the import procedure above for shared access. Local previews still need an authenticated portal session and the current area roster. Click Refresh or select a live source to return to Google Sheets.

## 6. Area names and access

The Areas tab is the authoritative roster. At minimum it needs an Area column. Keep your existing leader/representative fields. The Branches tab still supplies the expected locations.

Safe variants match automatically: Enugu / Enugu Area, Amechi / Amechi Area, punctuation, case and spacing. Original sheet values are not overwritten.

For additional confirmed variants, add an **Aliases** column to Areas:

| Area | Aliases |
| --- | --- |
| Lagos North | LNA |

Separate multiple approved aliases with `|`. Each alias must belong to only one area. Ambiguous aliases are withheld, not shared between accounts.

Do not guess mappings for entries such as Lagos, a phone number, a local branch name, or a misspelling that could mean another place. Administrators see an Area names that need confirmation list. These rows are excluded from area-user datasets until resolved. A missing or ambiguous Area column also results in no rows for area accounts; administrators can inspect the source and configure a mapping.

Faith City occurs in the IYC feedback but is absent from the supplied Areas roster. Add it as its own genuine area if appropriate. It is not automatically merged with Anthony even though the old presentation combined them. Access boundaries come from Areas/Users, not from a presentation grouping.

The existing roster also needs administrative review where Areas and Branches have genuinely missing entries (for example Calabar, URUK ATA and Benin Republic). Automatic naming rules do not invent missing roster records.

## 7. Unusual columns

For a heading the app cannot recognise, add a Column Map cell to its Programmes row:

```json
{"Area":"Which district do you belong to?","Branch location":"Church / venue","Total":"Attendance this year"}
```

This maps standard field names to the source's actual headings. Do not put prose such as Every branch reports in Column Map. Put it in a Notes column. For compatibility, old prose mapping cells now produce a warning and use automatic matching instead of stopping the page.

The app preserves original headings and extra fields. It cannot reliably infer the meaning of every arbitrary survey question. Unrecognised questions remain available in the question explorer. Unknown/ambiguous area assignments are withheld from area accounts rather than guessed.

Missing numeric report values are not counted as attendance or blessings. Invalid values produce a warning. Blank headers and unknown schemas show an empty/review state instead of exposing another area's data. A single bad selected source does not erase your spreadsheet or prevent switching to another source.

## 8. Feedback visuals and calculations

- Overall rating distribution and mean, with valid answer count.
- Ranked session/experience scorecard with the full response distribution.
- Feedback counts by area.
- One area versus other currently visible areas.
- Area-by-question heatmap with mean and n in each cell.
- Keep / tune / redesign / other recommendation counts.
- Recorded blessings from Yes/check-box fields or a Record of Blessings field.
- Topics mentioned in written feedback, using disclosed keyword rules.
- Searchable, paginated original answers for every non-identity question.

Rating scale: Excellent=5, Good=4, Satisfactory=3, Fair=2, Poor=1. Explicit numeric 1–5 rating questions are supported. Blank and unrecognised values are excluded from that question's denominator. Numeric scales outside 1–5 are not automatically rescaled. Rating questions require predominantly recognisable values; unknown questions remain available as original answers.

Keyword topics are not AI sentiment analysis and do not establish causes. The app does not generate invented quotes, recommendations or attendance from a feedback form. Counts refer to feedback responses, not event attendees. Sparse samples show their actual n, without claims of representativeness.

## 9. Export PowerPoint

Choose the feedback programme, area and respondent filters, then click **Export PowerPoint**. The presentation includes current-view response counts, overall/session ratings, area counts, recommendations, area comparison where applicable, heatmaps, blessings and topic counts. It uses editable charts/tables and the navy/green visual direction from your reference.

Long scorecards and heatmaps are paginated across slides. Free-text comments stay in the dashboard; they are not automatically quoted out of context in the deck. The export is a snapshot and does not update after download.

The browser receives only authorised data, so area users cannot export another area's feedback. Administrator exports can include unassigned rows, clearly labelled. PowerPoint generation happens in the browser; no extra Vercel or Google environment variables are needed.

## 10. Deployment checks

After replacing the code:

- Sign in as admin and verify all feedback/report sources.
- Sign in as an area user and check that the area dropdown, comparisons, question explorer and exported slides only contain that area.
- Check one local Excel preview and one live source.
- Verify area aliases and review unresolved values.
- Confirm the old public Apps Script endpoint and previous public frontend no longer expose the reporting data. The new login cannot protect those old URLs.

Report and feedback calls remain read-only. Readiness adds writes to its two dedicated tabs. This build does not modify Users or response cells remotely. Protect the Google workbook itself; direct public sharing bypasses application-level area restrictions.

## Limits and troubleshooting

The local feedback importer accepts XLSX files up to 15 MB. Live API responses are limited to about 3.9 MB before the app asks you to split a large dataset into programme/period tabs. No application can promise to understand every future heading or corrupted file; this build handles unknown layouts with review messages and safe empty states.

Missing sources: check naming, Active and Type in Programmes, the exact live tab name and the correct GOOGLE_SHEET_ID. A Feedback tab explicitly marked NO is deliberately hidden.

No rows for an area: check the Areas roster, the user's assigned area and the administrator unmatched-area list. Area aliases must be unique.

Unexpected duplicates: confirm you did not import the same export twice. The two Teenage Weekend attachments are duplicate datasets.

Old build still visible: verify Vercel deployed the new commit and you are visiting that project's production domain. Keep Output Directory=public and api at the repository root.
