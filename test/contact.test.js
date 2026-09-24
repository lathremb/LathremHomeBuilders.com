import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FN = join(__dirname, "..", "api", "contact.js");

let sent = null;
let resendStatus = 200;
let resendBody = '{"id":"abc"}';

global.fetch = async (url, opts) => {
  sent = { url, opts, payload: JSON.parse(opts.body) };
  return {
    ok: resendStatus >= 200 && resendStatus < 300,
    status: resendStatus,
    text: async () => resendBody
  };
};

const handler = (await import(pathToFileURL(FN).href)).default;

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

(async () => {
  const origErr = console.error;
  console.error = () => {};   // silence expected error logs

  // 1. wrong method
  process.env.RESEND_API_KEY = 're_test';
  process.env.CONTACT_EMAIL = 'owner@example.com';
  let res = mockRes();
  await handler({ method: 'GET' }, res);
  check('GET rejected with 405', res.statusCode === 405 && res.headers.Allow === 'POST');

  // 2. missing config
  delete process.env.RESEND_API_KEY;
  res = mockRes();
  await handler({ method: 'POST', body: {} }, res);
  check('missing API key -> 503', res.statusCode === 503, JSON.stringify(res.body));
  process.env.RESEND_API_KEY = 're_test';

  const good = { name: 'Dana Reyes', email: 'dana@example.com', phone: '520-555-0100',
                 location: 'Oro Valley', project: 'Guest house', budget: '$150,000 – $400,000',
                 message: 'Guest house on an existing lot.\nTwo bedrooms.', _t: Date.now() - 30000 };

  // 3. honeypot
  sent = null; res = mockRes();
  await handler({ method: 'POST', body: Object.assign({}, good, { _gotcha: 'spam' }) }, res);
  check('honeypot -> silent 200, nothing sent', res.statusCode === 200 && res.body.ok === true && sent === null);

  // 4. too-fast submit
  sent = null; res = mockRes();
  await handler({ method: 'POST', body: Object.assign({}, good, { _t: Date.now() - 500 }) }, res);
  check('sub-3s submit -> silent 200, nothing sent', res.statusCode === 200 && sent === null);

  // 5. missing name
  sent = null; res = mockRes();
  await handler({ method: 'POST', body: Object.assign({}, good, { name: '' }) }, res);
  check('missing name -> 400', res.statusCode === 400 && /name/i.test(res.body.error), res.body && res.body.error);

  // 6. bad email
  sent = null; res = mockRes();
  await handler({ method: 'POST', body: Object.assign({}, good, { email: 'not-an-email' }) }, res);
  check('bad email -> 400', res.statusCode === 400, res.body && res.body.error);

  // 7. happy path
  sent = null; res = mockRes();
  await handler({ method: 'POST', body: good }, res);
  check('valid submit -> 200', res.statusCode === 200 && res.body.ok === true, JSON.stringify(res.body));
  check('  posts to Resend', sent && sent.url === 'https://api.resend.com/emails');
  check('  bearer auth header', sent && sent.opts.headers.Authorization === 'Bearer re_test');
  check('  to = CONTACT_EMAIL', sent && sent.payload.to[0] === 'owner@example.com', sent && JSON.stringify(sent.payload.to));
  check('  reply_to = visitor', sent && sent.payload.reply_to === 'dana@example.com');
  check('  subject names sender', sent && sent.payload.subject === 'Website inquiry — Dana Reyes', sent && sent.payload.subject);
  check('  phone hyphens preserved', sent && sent.payload.text.includes('520-555-0100'), sent && (sent.payload.text.match(/Phone: .*/)||[])[0]);
  check('  budget en-dash preserved', sent && sent.payload.text.includes('$150,000 – $400,000'));
  check('  message newlines kept', sent && sent.payload.text.includes('Two bedrooms.'));

  // 8. HTML injection
  sent = null; res = mockRes();
  await handler({ method: 'POST', body: Object.assign({}, good, {
    name: '<script>alert(1)</script>', message: '<img src=x onerror=alert(2)>' }) }, res);
  check('escapes HTML in name', sent && !sent.payload.html.includes('<script>') && sent.payload.html.includes('&lt;script&gt;'));
  check('escapes HTML in message', sent && !sent.payload.html.includes('<img src=x'));

  // 9. header injection via newline in name
  sent = null; res = mockRes();
  await handler({ method: 'POST', body: Object.assign({}, good, { name: 'Bad\r\nBcc: evil@x.com' }) }, res);
  check('subject is single-line', sent && !/[\r\n]/.test(sent.payload.subject), sent && JSON.stringify(sent.payload.subject));

  // 10. length cap
  sent = null; res = mockRes();
  await handler({ method: 'POST', body: Object.assign({}, good, { message: 'x'.repeat(9000) }) }, res);
  check('message capped at 5000', sent && sent.payload.text.split('-----------------\n')[1].length === 5000,
        sent && String(sent.payload.text.split('-----------------\n')[1].length));

  // 11. resend failure
  resendStatus = 401; sent = null; res = mockRes();
  await handler({ method: 'POST', body: good }, res);
  check('Resend 401 -> 502 to client', res.statusCode === 502 && !/re_test/.test(JSON.stringify(res.body)), JSON.stringify(res.body));
  resendStatus = 200;

  // 12. urlencoded string body
  sent = null; res = mockRes();
  await handler({ method: 'POST', body: 'name=Sam&email=sam%40example.com&_t=1' }, res);
  check('parses urlencoded body', res.statusCode === 200 && sent && sent.payload.to[0] === 'owner@example.com', JSON.stringify(res.body));

  console.error = origErr;
  console.log(results.join('\n'));
  const failed = results.filter(r => r.startsWith('FAIL')).length;
  console.log('\n' + (results.length - failed) + '/' + results.length + ' passed');
  process.exit(failed ? 1 : 0);
})();
