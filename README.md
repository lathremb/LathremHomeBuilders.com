# Lathrem Homebuilders

Marketing site for Lathrem Homebuilders, LLC — a licensed Arizona general
contractor in Tucson. Static HTML/CSS/JS with one serverless function for the
contact form. No build step, no framework, no dependencies.

**Live:** deployed from `main` via Vercel.

## Layout

```
index.html          Landing page — hero, statement, featured project, portfolio grid
portfolio.html      Full portfolio, five projects, filterable, lightbox
about.html          Company, principles, credentials, services
contact.html        Inquiry form, direct details, typical investment
api/contact.js      Serverless function — validates and relays the form by email
assets/css/site.css All styling
assets/js/site.js   Header, mobile menu, scroll reveal, lightbox, filter, form
assets/img/         88 web-optimised images (large + 800px variants)
test/contact.test.js Tests for the contact function
vercel.json         Cache and security headers
```

## Running locally

Any static file server works, but `/api/contact` only runs under Vercel:

```bash
npx vercel dev
```

Or serve the folder with anything (`npx serve`, Python's `http.server`) if you
only need the pages — the form will report a send failure and point visitors at
the phone number, which is the intended fallback.

## Environment variables

Set these in Vercel under **Settings → Environment Variables**. They are read
only by `api/contact.js` on the server, so the destination address is never
exposed in the page source where scrapers could harvest it.

| Variable | Required | Purpose |
|---|---|---|
| `RESEND_API_KEY` | yes | API key from [resend.com/api-keys](https://resend.com/api-keys) |
| `CONTACT_EMAIL` | yes | Inbox that receives inquiries |
| `CONTACT_FROM` | no | Sender identity. Defaults to `Lathrem Website <onboarding@resend.dev>` |
| `SUPABASE_URL` | no | `https://yguoqmqmoizzfiaqragi.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | no | Service role key. Server-side only - it bypasses row level security |

Without the required two, `/api/contact` returns 503 and the form tells the
visitor to call instead. It fails politely, but no email is sent.

**On `CONTACT_FROM`:** Resend's shared `onboarding@resend.dev` sender only
delivers to the address that owns the Resend account, and mail from a shared
domain lands in spam more often. Once a domain is verified in Resend, set this
to something like `Website <website@lathremhomebuilders.com>`.

Environment variables apply at build time — after changing one, redeploy.

## Where submissions go

Every valid submission is written to the `contact_submissions` table in the
`client-Lathrem-Homebuilders` Supabase project **before** the notification
email is attempted, then the row is updated with whether that email actually
sent. So a lead survives a Resend outage, a bounced address, or a message lost
to a spam folder — check the table, not just the inbox.

The visitor sees success if **either** the row was stored or the email went
out; they only see an error if both failed.

The table has row level security enabled with no policies and no grants to
`anon` or `authenticated`, so nothing but the service role can read or write
it. It is not reachable from the browser.

To read leads: Supabase dashboard → Table Editor → `contact_submissions`.
A row with `email_sent = false` is a lead that never reached the inbox.

## Tests

```bash
node test/contact.test.js
node test/contact-supabase.test.js
```

41 tests. The first file covers validation, both bot traps, HTML and header
injection, length caps, and confirms the API key never leaks into an error
response. The second covers the storage path: that the row is written before
the email, that a lead is still captured when the email fails, that the
service key never reaches the client, and that bot traps and validation
failures store nothing.

## Deploying

Vercel builds automatically from this repo. Pushing to `main` deploys to
production; any other branch gets its own preview URL.

```bash
git add -A
git commit -m "Describe the change"
git push
```

## Notes for whoever edits this next

- **Images** carry explicit `width`/`height` attributes so the browser reserves
  their space before they load. The portfolio uses a CSS column layout, which
  re-flows badly if images arrive without known dimensions — keep the attributes
  when adding photographs.
- **The logo has two variants.** `logo.png` is the original colouring for solid
  white headers; `logo-light.png` knocks the wordmark to cream for the
  transparent header over the dark hero, where the taupe would disappear. They
  cross-fade on scroll. Change one, change both.
- **No `backdrop-filter` on the header at mobile widths.** It makes the header a
  containing block for `position: fixed` children, which collapses the
  full-screen menu into the header bar. There is a comment in the CSS at that
  rule.
- **Project names** — "Desert Contemporary", "Territorial Residence", "Stone &
  Glass", "Old World Estate" — are descriptive placeholders, not the real
  project names. Swap them when the actual names are confirmed.
