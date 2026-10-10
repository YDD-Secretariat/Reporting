import { randomBytes } from 'node:crypto';
import {
  AppError, userFromRows, programmes, feedbackProgrammes,
  scopeRows, mappedRows, mapFeedbackRows, buildAreaAliases
} from './data.js';
import { readSheets, identity, required } from './google.js';
import { readSession, signSession, setCookie, sameOrigin } from './session.js';

const send = (res, status, data) => res.status(status).json(data);

export function createHandler(deps = {}) {
  const read = deps.readSheets || readSheets;
  const verifier = deps.identity || identity;

  async function authorized(email, sub) {
    const [rows] = await read(['Users'], process.env.GOOGLE_USERS_SHEET_ID || required('GOOGLE_SHEET_ID'));
    return userFromRows(rows, email, sub);
  }

  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    try {
      const action = String(req.query?.action || '').trim();

      if (action === 'config') {
        return send(res, 200, {
          ok: true,
          clientId: required('GOOGLE_CLIENT_ID'),
          nonce: randomBytes(16).toString('base64url')
        });
      }

      if (action === 'login') {
        if (req.method !== 'POST') throw new AppError(405, 'Method not allowed.');
        sameOrigin(req);
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const credential = body.credential;
        if (!credential) throw new AppError(400, 'Missing credential.');
        const ticket = await verifier.verifyIdToken({
          idToken: credential,
          audience: required('GOOGLE_CLIENT_ID')
        });
        const payload = ticket.getPayload();
        if (!payload?.email || !payload.email_verified || !payload.sub) {
          throw new AppError(401, 'Google sign-in could not be verified.');
        }
        try {
          const user = await authorized(payload.email, payload.sub);
          setCookie(res, signSession(user));
          return send(res, 200, { ok: true, user: { name: user.name, role: user.role, area: user.area } });
        } catch (e) {
          if (e.status === 403) {
            return send(res, 403, {
              ok: false,
              error: e.message,
              email: payload.email,
              accountId: payload.sub
            });
          }
          throw e;
        }
      }

      if (action === 'logout') {
        if (req.method !== 'POST') throw new AppError(405, 'Method not allowed.');
        sameOrigin(req);
        setCookie(res, '', true);
        return send(res, 200, { ok: true });
      }

      if (req.method !== 'GET') throw new AppError(405, 'Method not allowed.');
      if (!['me', 'data'].includes(action)) throw new AppError(404, 'Unknown action.');

      const session = readSession(req);

      if (action === 'me') {
        return send(res, 200, { ok: true, user: await authorized(session.email, session.sub) });
      }

      let user, registryRows, feedbackRows = null;
      const mode = String(req.query.mode || 'reports').toLowerCase() === 'feedback' ? 'feedback' : 'reports';

      if (!process.env.GOOGLE_USERS_SHEET_ID || process.env.GOOGLE_USERS_SHEET_ID === required('GOOGLE_SHEET_ID')) {
        let users, programs, feedbackTab;
        try {
          [users, programs, feedbackTab] = await read(['Users', 'Programmes', 'Feedback']);
          feedbackRows = feedbackTab;
        } catch {
          [users, programs] = await read(['Users', 'Programmes']);
        }
        user = userFromRows(users, session.email, session.sub);
        registryRows = programs;
      } else {
        user = await authorized(session.email, session.sub);
        try {
          const pair = await read(['Programmes', 'Feedback']);
          registryRows = pair[0];
          feedbackRows = pair[1];
        } catch {
          [registryRows] = await read(['Programmes']);
        }
      }

      const allReports = programmes(registryRows);
      const allFeedback = feedbackProgrammes(feedbackRows, registryRows);
      const catalogue = mode === 'feedback'
        ? (allFeedback.length ? allFeedback : allReports.filter(p => p.kind === 'feedback'))
        : allReports.filter(p => p.kind !== 'feedback');

      if (!catalogue.length) {
        throw new AppError(404, mode === 'feedback'
          ? 'No active feedback sources. Add rows to the Feedback tab (or Programmes with Kind=feedback).'
          : 'No active reports in Programmes.');
      }

      const p = req.query.report
        ? catalogue.find(x => x.key === req.query.report)
        : catalogue[0];
      if (!p) throw new AppError(404, 'Report not found or inactive for this mode.');

      const [areas, branches, raw] = await read(['Areas', 'Branches', p.sheet]);
      const aliasMap = buildAreaAliases(branches);

      const records = mode === 'feedback'
        ? mapFeedbackRows(raw, p.mapping, aliasMap)
        : mappedRows(raw, p.mapping, aliasMap);

      return send(res, 200, {
        ok: true,
        user,
        mode,
        generatedAt: new Date().toISOString(),
        selectedReport: p.key,
        programmes: [
          ['Key', 'Sheet name', 'Label', 'Scope', 'Active', 'Kind'],
          ...catalogue.map(x => [x.key, x.sheet, x.label, x.scope, 'YES', x.kind || mode])
        ],
        areas: scopeRows(areas, user, 'Areas', 'Area', aliasMap),
        branches: scopeRows(branches, user, 'Branches', 'Area', aliasMap),
        records: scopeRows(records, user, p.label, 'Area', aliasMap)
      });
    } catch (e) {
      if (!e.status) console.error('Reporting request failed', e.name, e.message);
      return send(res, e.status || 500, {
        ok: false,
        error: e.status ? e.message : 'Something went wrong. Please retry or contact the administrator.'
      });
    }
  };
}
