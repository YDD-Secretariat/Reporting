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
    if (e.response?.status === 400) throw new AppError(422, 'Google Sheets rejected a configured range. Check these exact tab names in the configured workbook: ' + names.join(', ') + '. For report tabs, correct Programmes → Sheet Name.');
    throw new AppError(502, 'Google Sheets could not be read. Check the sheet ID, tab names and service-account Viewer access.');
  }
}

export async function listSheets() {
  // Authorize through the same configured read-only client.
  if(!auth)await readSheets(['Programmes']);
  const client = await auth.getClient();
  try {
    const {data}=await client.request({url:`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(required('GOOGLE_SHEET_ID'))}?fields=sheets.properties.title`,timeout:15000});
    return (data.sheets||[]).map(s=>s.properties.title);
  } catch { throw new AppError(502,'Could not inspect workbook tab names. Check spreadsheet access.'); }
}

let writeAuth;
// Writes are restricted to these two readiness stores, never arbitrary report/user tabs.
export async function appendReadiness(name, headers, values) {
 if(!['Programme Checklists','Area Readiness'].includes(name))throw new AppError(403,'Unsupported write destination.');
 const [rows]=await readSheets([name]);
 if(rows.length&&JSON.stringify(rows[0])!==JSON.stringify(headers))throw new AppError(422,`${name}: use the exact header template, or leave this new tab completely blank.`);
 writeAuth ||= new GoogleAuth({credentials:{client_email:required('GOOGLE_SERVICE_ACCOUNT_EMAIL'),private_key:required('GOOGLE_PRIVATE_KEY').replace(/\\n/g,'\n')},scopes:['https://www.googleapis.com/auth/spreadsheets']});
 const client=await writeAuth.getClient();const base=`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(required('GOOGLE_SHEET_ID'))}/values/`;
 try{
  if(!rows.length)await client.request({url:base+encodeURIComponent("'"+name+"'!A1")+'?valueInputOption=RAW',method:'PUT',data:{values:[headers]},timeout:15000});
  await client.request({url:base+encodeURIComponent("'"+name+"'!A:K")+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',method:'POST',data:{values},timeout:15000});
 }catch(e){console.error('Readiness write failed',e.response?.status||'network');throw new AppError(502,'Could not confirm the save. Check the sheet before retrying to avoid duplicate updates. Ensure the service account has Editor access.');}
}
