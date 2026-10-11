> **Version 4 includes Programme Checklists. Start with READINESS-SETUP.md for the two new tabs and Editor access required for readiness saves.** Existing reporting/feedback instructions follow.

# Existing Google Cloud and Vercel setup

**For this v3 update, follow START-HERE.md.** The setup details below are for establishing credentials on a new deployment. Existing users keep their credentials. Feedback discovery and automatic area matching are described in START-HERE.md.

# Deploy the reporting portal

You will work in three places: your GitHub reporting repository, Google Cloud / Google Sheets, and Vercel. You do **not** paste the new JavaScript into Apps Script.

## 1. Prepare the existing Git repository

Keep a copy or branch of the current repository first. Extract this ZIP. Upload the **contents of `Reporting-main`** to the root of your existing reporting repository, keeping folders intact.

The repository root must contain:

```text
api/reporting.js
lib/
public/index.html
public/submissions.html
public/dashboard.html
public/login.html
package.json
package-lock.json
vercel.json
```

Remove the old root-level `index.html`, `submissions.html`, and `dashboard.html` after replacing them with this folder structure. The new versions belong under `public/`. Do not leave the entire ZIP as the only repository file. Do not flatten `api` or `lib` into the root. Do not upload `node_modules`, `.env` or any service-account key JSON.

If using your Cloud Shell terminal, run commands **inside the cloned reporting repository**. For example, after replacing its files:

```bash
npm ci
npm test
npm run build
git status
```

Review the listed changes, then commit and push through your usual Git workflow. Your Vercel project will follow this repository.

## 2. Prepare the reporting Google Sheet

Use the reporting workbook that contains Programmes, Areas, Branches and response tabs. The PPE inventory workbooks are unrelated and are not changed by this package.

Keep your existing response data. Row 1 of every relevant tab must contain headers. No title rows or merged headings above them.

### Programmes

Keep the existing Programmes tab and add/edit rows using these headers:

| Key | Sheet name | Label | Scope | Active | Column Map |
| --- | --- | --- | --- | --- | --- |
| backToSchool | BACK TO SCHOOL 2026 | Back to School 2026 | all | YES | |
| youthCamp2026 | YOUTH CAMP 2026 | Youth Camp 2026 | all | YES | |

The first Sheet name must be the **actual tab name**: if yours is `Form responses 1`, enter that instead of `BACK TO SCHOOL 2026`. The new app never guesses or falls back to another report's tab.

- Key: unique letters, digits, underscores or hyphens, with no spaces.
- Sheet name: exact response-tab name, including spaces.
- Label: the readable report name; include a year/month where useful.
- Scope: `all`, `central`, `zonal`, or `branch`.
- Active: `YES` to appear in the dropdown; `NO` to hide. Leave prior-year reports at YES when people should still be able to view them.
- Column Map: optional JSON, explained below.
- System sheets such as Users and Credentials cannot be registered as reports.

You only need to register each new report once. No code change or redeployment is required when adding another Programmes row and response tab.

### Areas

Preserve these existing columns where present:

`Area, Area leader, Leader phone, Rep, Rep phone, Expected`

`Area` is required and must identify the area consistently across all tabs. `Expected` is an optional overall expected submission count; leave blank to derive it from the roster and received submissions. Area leader / Rep and their phone columns support the original WhatsApp buttons.

### Branches

Use:

`Area, Branch, Category, Alias`

Category values can be `Area Headquarters`, `Zone`, or `Branch`. The original misspelling `Area Headquaters` is also recognised by the interface. Alias is optional and matches one alternate response name.

### Response tabs

At minimum, include `Area` and `Branch location` (or map another field to these names). Include `Category` when using the reporting-scope filter. Other recognised columns include:

`Name, Phone, Date held, Teenage male, Teenage female, Parents, Total, Salvation, Sanctification, Holy ghost, Healing, Re-anointing, Other blessings`

Extra columns appear in the expandable submission-details table. Tabs containing just the headers correctly show that nobody has submitted yet. A missing Area header stops the request instead of returning unfiltered information.

If your form uses different labels, put a mapping in that report's Column Map cell. The left side is the standard field; the right side is your actual column heading:

```json
{"Area":"Select your area","Branch location":"Church / venue","Total":"Attendance","Name":"Submitted by"}
```

The mapped source headings must exist and must not create duplicate standard headers. Supported standard names are the response field names listed above. Mapping is also supported for locally imported workbooks.

### Users

Create a **new** tab named `Users` with these exact headers:

`Email, Name, Role, Area, Active` (optional extra column: `Google Subject`)

Google Subject is **optional**. You can omit the column or leave it blank for Gmail and Google Workspace accounts. Existing populated values continue to restrict access to that specific Google account.

| Email | Name | Role | Area | Active |
| --- | --- | --- | --- | --- |
| your-google-email | Your name | admin | | YES |
| leader-google-email | Area leader name | area_leader | Anthony | YES |
| secretary-google-email | Secretary name | area_secretary | Anthony | YES |

Only one active row may exist per email. Area leaders and secretaries require one nonblank Area. Do not create an admin row for an ordinary viewer. Roles and areas are set by the workbook administrator, not selected by the person logging in.

Protect Users and Programmes against edits by report viewers. A person with direct edit access to Users can change privileges. Prefer keeping Users in a separate restricted workbook and setting `GOOGLE_USERS_SHEET_ID` when multiple people edit the reporting workbook.

The old Credentials tab is not used. Do not migrate its plaintext passwords to the new app.

## 3. Set up Google Cloud service-account access

You may use your existing Google Cloud project if appropriate. A dedicated reporting service account keeps this system separate from PPE.

1. Open [Google Cloud Console](https://console.cloud.google.com/), select your project, and enable **Google Sheets API** under APIs & Services → Library.
2. Under IAM & Admin → Service Accounts, create or select a service account for reporting. Its email ends with `iam.gserviceaccount.com`; your personal Gmail address is not a service account.
3. If creating a new account, it does not need a project-wide Editor or Owner role just to read a shared spreadsheet.
4. Open its Keys tab → Add key → Create new key → JSON. Keep the downloaded key private. If your organisation blocks service-account keys, ask the project administrator for an approved credential setup rather than disabling that policy.
5. In Google Sheets, Share the reporting workbook with that service-account email as **Viewer**. Also share the separate Users workbook if using one.
6. Copy the spreadsheet ID from the part between `/d/` and `/edit` in its URL. Do not use the `gid` number.

The JSON key supplies `client_email` and `private_key` for Vercel. Do not paste it into public HTML, GitHub or chat. The entire `private_key` value, including BEGIN/END lines, belongs in the environment variable. Actual line breaks and literal `\n` sequences are both supported. Do not include enclosing JSON quotation marks.

## 4. Import the Git repository into Vercel

1. Open Vercel → Add New → Project → import your reporting GitHub repository.
2. Framework Preset: **Other**.
3. Root Directory: the directory containing `package.json` and `vercel.json`. Normally leave it at the repository root. If you kept a wrapper folder, select that folder.
4. Build command: `npm run build`.
5. Output directory: `public`.
6. Install command: `npm ci` (or Vercel's detected npm install).
7. Node.js: 22.x or newer supported LTS. The project was tested with Node 24.
8. You may deploy initially to obtain the stable production domain. Until environment variables are supplied, the app displays a setup error and exposes no report data.

The `api` folder remains at repository root, **outside** public. Vercel deploys it as server functions; the static output directory is just the UI.

## 5. Set up Google sign-in

The OAuth client is separate from the service account. The client ID is public identification for the sign-in button; the service-account private key is a server secret.

1. In the same Google Cloud project, open Google Auth Platform / APIs & Services → OAuth consent settings.
2. Set the app name, support email and contact details. Choose an audience that permits your intended users. Internal audience works only for members of that Workspace organisation.
3. If the consent app is in Testing, add the people who will test as test users. Before broader rollout, configure the appropriate publishing/audience status.
4. Create an OAuth client with application type **Web application**.
5. Add your exact stable Vercel production origin under **Authorized JavaScript origins**, e.g. `https://your-reporting-project.vercel.app`. Add your custom domain as a separate origin if used. No trailing path or slash.
6. Copy the client ID ending with `.apps.googleusercontent.com`.

The implementation uses the Google Identity Services JavaScript callback flow. It does not need an OAuth client secret or a redirect-URI endpoint. Each account used for login must be a Google account; this version does not provide email/password login.

Avoid testing login on a random Vercel preview URL unless you separately configure its exact OAuth origin and APP_ORIGIN. Use the stable production domain for the initial setup.

## 6. Add Vercel environment variables

Project → Settings → Environment Variables. Add these for Production:

| Variable | Value / where to obtain it |
| --- | --- |
| `GOOGLE_SHEET_ID` | Reporting spreadsheet ID from its URL |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` from service-account JSON |
| `GOOGLE_PRIVATE_KEY` | Complete `private_key` from the same JSON |
| `GOOGLE_CLIENT_ID` | OAuth Web application client ID |
| `SESSION_SECRET` | A new cryptographically random secret, at least 32 characters |
| `APP_ORIGIN` | Exact production origin, e.g. `https://your-reporting-project.vercel.app`, without trailing slash |
| `GOOGLE_USERS_SHEET_ID` | Optional ID of a separate restricted workbook containing Users; otherwise omit |

To generate a SESSION_SECRET, run this in your Cloud Shell terminal or another trusted terminal with Node installed:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Copy the generated value into Vercel, not into Git. Do not set `NODE_ENV=development` in Vercel.

After setting variables, **redeploy**. Environment-variable changes do not alter an already-built deployment automatically. Whenever the production domain changes, update APP_ORIGIN and the OAuth authorized origin together, then redeploy.

## 7. Approve users in advance

1. Add all authorised users to Users in one batch: Email, Name, Role, Area, Active.
2. Use their Gmail or Google Workspace sign-in email, set the correct role and area, and set Active to YES.
3. Leave Google Subject blank or omit that column. No subject collection is required.
4. Send users the portal link. They select Sign in with Google and are admitted immediately if their verified account matches an active row.
5. To revoke access, set Active to NO. Changes apply on the next API request. No redeploy is needed for adding or changing users.

Only addresses approved in Users can enter. Google Workspace ownership is checked using Google's verified hosted-domain claim. An external email such as Yahoo linked to a Google account does not qualify for email-only approval; ask the person for their Gmail/Workspace account instead. Existing subject-bound accounts remain supported, but collecting subjects is no longer the standard onboarding process.

After installing this update, sign out and sign in again to refresh the session with the new email-verification claim.

## 8. Verify before rollout

- Admin: see all areas in cards and dashboard.
- Area A secretary: see only Area A, including summary totals, branch list and details.
- Area B leader: see only Area B.
- Signed out: visiting any page redirects to login; visiting `/api/reporting?action=data` returns 401.
- Change `report=` in the API URL: only active registered reports are accepted and each remains area-filtered.
- Switch between at least two real reports and confirm the counts differ as expected.
- New report with headers but no rows: see outstanding locations, not an error.
- Disable a signed-in user: clicking Refresh redirects them to sign-in.
- Try PNG, print/PDF, sorting, search and WhatsApp links on your own devices. WhatsApp links open a draft; nothing is sent automatically.
- Upload a local workbook: reports remain area-scoped; live Sheets data is not overwritten. Click Refresh live to return to Sheets.

## 9. Close the old public routes

**The new login cannot protect the old Apps Script URL.** The supplied Code.gs allows anonymous full reads and anonymous status updates. Once this portal is verified:

- Disable/archive or secure the old public Apps Script deployment so it no longer exposes the reporting workbook.
- Check GitHub Pages or other old deployments for copies of the previous public frontend.
- Remove public "anyone with link" or "Publish to web" access on the workbook if enabled; retain necessary Google Form submission access.
- If other MANCOM pages still depend on that same Apps Script deployment, migrate or secure those consumers before disabling it. The ZIP supplied only index, submissions and dashboard; no strategy/directory/task-editing pages were provided. This reporting portal intentionally has no write endpoint for their task-management operations.

Keep a source-code backup for rollback, but do not restore the old anonymous data endpoint as part of normal access-controlled operation.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Vercel 404 for the page/API | Correct root, public folder and root-level api folder; upload folder contents, not just the ZIP |
| Sign-in button says origin not allowed | Exact production origin in Google OAuth settings; correct Web client ID; wait for Google settings propagation |
| Request origin is not allowed | APP_ORIGIN matches the browser origin exactly; redeploy after changing it |
| Account not enabled | Users row email, Active YES, no duplicate active rows |
| External email not supported | Approve the person’s Gmail or Google Workspace address in Users |
| Google Sheets could not be read | API enabled; correct spreadsheet ID; service account shared as Viewer; exact tab names; matching email/private key |
| Missing Area column | Use the Area header or configure Column Map for that report |
| Wrong report or no report | Unique Key; Sheet name matches actual tab; Active YES; no fallback to Form responses 1 |
| Area has no results | Area spelling matches across Users, Areas, Branches and response sheet; check Scope filter |
| Counts differ from form rows | Cards deduplicate by location; details show all rows; summaries retain the first submitted record per location |
| PNG does not download | Confirm public/vendor was uploaded; the browser may ask permission for multiple downloads |
| Google Sheets quota/slow response | Check workbook size and concurrency; this version batches reads but uses live authorization and no persistent report cache |

## Operational boundaries

This package does not change your Google Forms, upload reports, alter sheet data, manage users through the website or deploy a separate Cloud Run service. Sheet owners administer rosters and access in Google Sheets. The backend uses read-only API scope. Session cookies last eight hours, and changing SESSION_SECRET forces all users to sign in again.
