# MANCOM Reporting Portal v2.1

Lightweight, long-lived reporting and feedback portal.

## What changed in 2.1

1. **Email-first enrolment** — leave Google Subject blank; Active + verified email is enough. Optional subject lock when filled.
2. **Header synonym map** — varied form headers (Teenage Male vs Male, Baptism of the Holy Ghost, multi-line labels) normalise without Column Map.
3. **Area aliases** — Branches.Alias maps `Enugu` → `Enugu Area`.
4. **Feedback mode** — Feedback tab or Kind=feedback; UI mode toggle; chart dashboard.
5. **Deployment hardening** — API rewrite, memory limit, clearer errors.

## Stack

Vercel Node 22+, static `public/`, one dependency (`google-auth-library`), Sheets read-only.

## Commands

```bash
npm ci && npm test && npm run build
cp .env.example .env   # fill; APP_ORIGIN exact
node --env-file=.env scripts/dev.mjs
```

See DEPLOYMENT.md for sheet setup and Vercel env.
