import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { AppError } from './data.js';
let auth;
export const identity = new OAuth2Client();
export function required(name) { if (!process.env[name]) throw new AppError(503, `Server setup incomplete: ${name}`); return process.env[name]; }
export async function readSheets(names, spreadsheetId = required('GOOGLE_SHEET_ID')) {
  auth ||= new GoogleAuth({credentials:{client_email:required('GOOGLE_SERVICE_ACCOUNT_EMAIL'),private_key:required('GOOGLE_PRIVATE_KEY').replace(/\\n/g,'\n')}, scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']});
  const client = await auth.getClient();
  const params = new URLSearchParams({valueRenderOption:'FORMATTED_VALUE'});
  names.forEach(name => params.append('ranges', "'" + name.replace(/'/g,"''") + "'"));
  try {
    const {data} = await client.request({url:`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchGet?${params}`,timeout:15000});
    return data.valueRanges.map(r => r.values || []);
  } catch (e) {
    console.error('Sheets read failed', e.response?.status || 'network');
    throw new AppError(502, 'Google Sheets could not be read. Check the sheet ID, tab names and service-account Viewer access.');
  }
}
