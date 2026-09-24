# Lathrem Homebuilders

Marketing site for Lathrem Homebuilders, LLC — a licensed Arizona general
contractor in Tucson. Static HTML/CSS/JS with one serverless function for the
contact form. No build step, no framework, no dependencies.

**Live:** deployed from `main` via Vercel.

## Layout

Astro, static output. No client framework: the only JavaScript shipped is the
same ~6KB of vanilla `site.js` the hand-written site used.

```
src/pages/           One .astro file per route, output as /name.html
src/layouts/Base     <head>, header, footer - every page goes through it
src/components/      Header, Footer, Photo, Cta
src/data/site.js     Phone, address, licence, nav. Single source of truth.
src/data/*.json      Testimonials and portfolio tiles as data, not markup
src/assets/img/      43 photographs, optimised at build time
src/styles/site.css  All styling
public/              Files served as-is: hero set, logos, favicon, site.js,
                     robots.txt, sitemap.xml
api/contact.js       Vercel Function. Validates, stores, relays the form.
scripts/             Post-build prune (see below)
test/                Tests for the contact function
```

### Why a port at all

Astro's usual selling point is stripping framework JavaScript, and there was
none to strip. Two things did justify it:

- **Images.** 89 fixed-size JPEGs became 43 sources that build into AVIF and
  WebP at the widths each layout actually uses. A phone loading the portfolio
  went from ~3.5MB to ~560KB.
- **Duplication.** The header and footer were copy-pasted into 8 files. Adding
  a nav item meant a regex across all of them.

### A note on build size

`dist/` is around 25MB, larger than the old `assets/img`. That is expected and
not a regression: it stores every format and width, and a visitor downloads
exactly one per image. Per-page transfer is what improved.

The JPEG copies (~11MB) only serve browsers supporting neither AVIF nor WebP.

### The prune step

`npm run build` runs `scripts/prune-assets.mjs` afterwards. `Photo.astro` globs
the whole photo directory for ergonomics, and Vite emits every matched asset
whether a page renders it or not - about 13MB of untouched originals nothing
links to. The script deletes files from `_astro` whose names appear nowhere in
the built output, so it cannot remove something live.

## Running locally

```bash
npm install
npm run dev      # http://localhost:4338
```

Port 4338 is deliberate: LT Studio already uses Astro's default 4321 and
M1 Off Road uses 4330.

`/api/contact` does not run under `astro dev`; it is a Vercel Function. Use
`npx vercel dev` to exercise it locally, or rely on the tests.

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
