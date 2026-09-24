/* Tests for the Supabase storage path in /api/contact.
   The function reads its env at module load, so this file sets the
   Supabase vars BEFORE requiring it and runs in its own process. */

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

process.env.RESEND_API_KEY = 're_test';
process.env.CONTACT_EMAIL = 'owner@example.com';
process.env.SUPABASE_URL = 'https://proj.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc_secret_key';

const calls = [];
let supabaseInsertStatus = 201;
let supabasePatchStatus = 204;
let resendStatus = 200;
let insertedRowId = 'row-123';

global.fetch = async (url, opts) => {
  const u = String(url);
  calls.push({ url: u, method: (opts && opts.method) || 'GET', opts });

  if (u.indexOf('api.resend.com') !== -1) {
    return {
      ok: resendStatus >= 200 && resendStatus < 300,
      status: resendStatus,
      text: async () => 'resend body',
      json: async () => ({})
    };
  }
  if (u.indexOf('supabase.co') !== -1) {
    const isPatch = (opts && opts.method) === 'PATCH';
    const st = isPatch ? supabasePatchStatus : supabaseInsertStatus;
    return {
      ok: st >= 200 && st < 300,
      status: st,
      text: async () => 'supabase body',
      json: async () => (isPatch ? {} : [{ id: insertedRowId }])
    };
  }
  throw new Error('unexpected fetch to ' + u);
};

const handler = (await import(pathToFileURL(join(__dirname, '..', 'api', 'contact.js')).href)).default;

function mockRes() {
  const r = { statusCode: null, body: null, headers: {} };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}

const results = [];
function check(name, cond, extra) {
  results.push((cond ? 'PASS  ' : 'FAIL  ') + name + (extra ? '  -> ' + extra : ''));
}
const reset = () => { calls.length = 0; };
const good = () => ({
  name: 'Dana Reyes', email: 'dana@example.com', phone: '520-555-0100',
  location: 'Oro Valley', project: 'Guest house', budget: '$150,000 - $400,000',
  message: 'Guest house on an existing lot.', _t: Date.now() - 30000
});
const supabaseCalls = () => calls.filter(c => c.url.indexOf('supabase.co') !== -1);
const resendCalls  = () => calls.filter(c => c.url.indexOf('api.resend.com') !== -1);

(async () => {
  const origErr = console.error;
  console.error = () => {};

  // 1. happy path stores then emails
  reset(); let res = mockRes();
  await handler({ method: 'POST', body: good() }, res);
  check('valid submit -> 200', res.statusCode === 200 && res.body.ok === true, JSON.stringify(res.body));
  const ins = supabaseCalls().filter(c => c.method === 'POST')[0];
  check('  inserts into contact_submissions', !!ins && ins.url.indexOf('/rest/v1/contact_submissions') !== -1, ins && ins.url);
  check('  insert happens BEFORE the email', calls[0] && calls[0].url.indexOf('supabase.co') !== -1, calls[0] && calls[0].url);
  check('  sends service key as apikey header', ins && ins.opts.headers.apikey === 'svc_secret_key');

  const payload = ins ? JSON.parse(ins.opts.body) : {};
  check('  maps project -> project_type', payload.project_type === 'Guest house', payload.project_type);
  check('  stores name/email', payload.name === 'Dana Reyes' && payload.email === 'dana@example.com');
  check('  stores phone intact', payload.phone === '520-555-0100', payload.phone);
  check('  does not send email_sent on insert', payload.email_sent === undefined);

  const patch = supabaseCalls().filter(c => c.method === 'PATCH')[0];
  check('  patches the row after sending', !!patch && patch.url.indexOf('id=eq.row-123') !== -1, patch && patch.url);
  check('  marks email_sent true', patch && JSON.parse(patch.opts.body).email_sent === true);

  // 2. email fails, storage works -> lead is still captured, visitor sees success
  reset(); resendStatus = 401; res = mockRes();
  await handler({ method: 'POST', body: good() }, res);
  check('email fails but row stored -> 200', res.statusCode === 200 && res.body.ok === true, JSON.stringify(res.body));
  const p2 = supabaseCalls().filter(c => c.method === 'PATCH')[0];
  const b2 = p2 ? JSON.parse(p2.opts.body) : {};
  check('  marks email_sent false', b2.email_sent === false);
  check('  records the failure reason', typeof b2.email_error === 'string' && b2.email_error.length > 0, b2.email_error);

  // 3. storage fails, email works -> still 200
  reset(); resendStatus = 200; supabaseInsertStatus = 500; res = mockRes();
  await handler({ method: 'POST', body: good() }, res);
  check('storage fails but email sent -> 200', res.statusCode === 200 && res.body.ok === true, JSON.stringify(res.body));
  check('  skips the patch when there is no row', supabaseCalls().filter(c => c.method === 'PATCH').length === 0);

  // 4. both fail -> 502
  reset(); resendStatus = 401; supabaseInsertStatus = 500; res = mockRes();
  await handler({ method: 'POST', body: good() }, res);
  check('both fail -> 502', res.statusCode === 502, JSON.stringify(res.body));
  check('  never leaks the service key to the client',
        JSON.stringify(res.body).indexOf('svc_secret_key') === -1, JSON.stringify(res.body));

  // 5. bot traps still short-circuit before any storage
  reset(); resendStatus = 200; supabaseInsertStatus = 201; res = mockRes();
  await handler({ method: 'POST', body: Object.assign(good(), { _gotcha: 'spam' }) }, res);
  check('honeypot stores nothing', res.statusCode === 200 && calls.length === 0, 'calls=' + calls.length);

  reset(); res = mockRes();
  await handler({ method: 'POST', body: Object.assign(good(), { _t: Date.now() - 500 }) }, res);
  check('sub-3s submit stores nothing', res.statusCode === 200 && calls.length === 0, 'calls=' + calls.length);

  // 6. validation failures never reach storage
  reset(); res = mockRes();
  await handler({ method: 'POST', body: Object.assign(good(), { email: 'nope' }) }, res);
  check('invalid email stores nothing', res.statusCode === 400 && calls.length === 0, 'calls=' + calls.length);

  console.error = origErr;
  console.log(results.join('\n'));
  const failed = results.filter(r => r.startsWith('FAIL')).length;
  console.log('\n' + (results.length - failed) + '/' + results.length + ' passed');
  process.exit(failed ? 1 : 0);
})();
