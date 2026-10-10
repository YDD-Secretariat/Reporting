# Deploy MANCOM Reporting v2.1

## Repository

Place package contents at repo root (`api/`, `lib/`, `public/`, `package.json`, `vercel.json`). Remove old root HTML pages.

```bash
npm ci && npm test && npm run build
git add -A && git commit -m "mancom reporting 2.1" && git push
```

## Users (bulk enrolment)

| Email | Name | Role | Area | Active | Google Subject |
| --- | --- | --- | --- | --- | --- |
| admin@org.org | Admin | admin | | YES | |
| leader@org.org | Ada | area_leader | Anthony | YES | |

Paste all emails with Role + Area + Active=YES. **Leave Google Subject empty.** Sign-in works on verified email. Fill Google Subject later only if you need to lock an email to one Google account.

## Programmes

| Key | Sheet name | Label | Scope | Active | Column Map | Kind |
| --- | --- | --- | --- | --- | --- | --- |
| backToSchool | BACK TO SCHOOL 2026 | Back to School 2026 | all | YES | | report |

Sheet name = exact tab name. Column Map optional JSON override.

## Feedback tab (optional)

Same columns as Programmes; Kind=feedback. Or set Kind on Programmes rows.

## Branches aliases

| Area | Branch | Category | Alias |
| --- | --- | --- | --- |
| Enugu Area | Main | Branch | Enugu;ENUGU |

## Vercel environment

GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CLIENT_ID, SESSION_SECRET (≥32 chars), APP_ORIGIN (exact https origin).

Share workbook with service account as Viewer. Add APP_ORIGIN to OAuth authorized origins.

## Failures

| Symptom | Fix |
| --- | --- |
| Origin not allowed | APP_ORIGIN exact match, redeploy |
| Account not enabled | Email + Active=YES |
| Google account ID not enrolled | Clear Google Subject or paste matching sub |
| Missing Area | Ensure Area column or Column Map |
| 500 on API | Env vars, private key newlines, Node 22 |
