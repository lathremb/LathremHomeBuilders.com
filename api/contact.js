/* =========================================================
   POST /api/contact
   Receives the contact-form JSON, validates it, and sends the
   enquiry on by email via Resend.

   The destination address lives ONLY in Vercel's environment
   variables — it is never sent to the browser, so there is
   nothing in the page source for a scraper to harvest.

   Required environment variables (Vercel > Project > Settings > Environment Variables):
     RESEND_API_KEY   re_xxxxxxxx        from resend.com/api-keys
     CONTACT_EMAIL    where enquiries should land
   Optional:
     CONTACT_FROM     defaults to "Lathrem Website <onboarding@resend.dev>".
                      Resend's shared sender only delivers to the address that
                      owns the Resend account. Once a domain is verified, set
                      this to something like "Website <website@yourdomain.com>".
   ========================================================= */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/* Cap every field so an oversized POST can't be used to stuff the inbox. */
const LIMITS = {
  name: 120,
  email: 200,
  phone: 60,
  location: 160,
  project: 80,
  budget: 80,
  message: 5000
};

const LABELS = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  location: "Project location",
  project: "Project type",
  budget: "Budget range",
  message: "About the project"
};

function clean(value, max, allowNewlines) {
  if (typeof value !== "string") return "";
  // Collapse control characters to spaces (header-injection safety). Only the
  // free-text message keeps its line breaks; every single-line field — the one
  // that becomes the subject especially — is flattened.
  var out = value
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, " ")
    .replace(/\r\n?/g, "\n");
  out = allowNewlines
    ? out.replace(/\n{3,}/g, "\n\n")
    : out.replace(/\n+/g, " ").replace(/ {2,}/g, " ");
  return out.trim().slice(0, max);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function looksLikeEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

function parseBody(req) {
  var body = req.body;
  if (body && typeof body === "object") return body;
  if (typeof body === "string" && body.length) {
    try {
      return JSON.parse(body);
    } catch (e) {
      return Object.fromEntries(new URLSearchParams(body));
    }
  }
  return {};
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_EMAIL;
  const from = process.env.CONTACT_FROM || "Lathrem Website <onboarding@resend.dev>";

  if (!apiKey || !to) {
    console.error("contact: missing RESEND_API_KEY or CONTACT_EMAIL");
    return res.status(503).json({ error: "Email delivery isn't configured yet." });
  }

  const body = parseBody(req);

  /* --- bot traps -------------------------------------------------
     Both are answered with a 200 so a bot gets no signal that it was
     caught and doesn't come back to probe for the real path. */
  if (clean(body._gotcha, 200)) {
    return res.status(200).json({ ok: true });
  }
  const elapsed = Date.now() - Number(body._t || 0);
  if (Number(body._t) && elapsed < 3000) {
    return res.status(200).json({ ok: true });
  }

  /* --- validation ------------------------------------------------ */
  const data = {};
  Object.keys(LIMITS).forEach(function (k) {
    data[k] = clean(body[k], LIMITS[k], k === "message");
  });

  const errors = [];
  if (!data.name) errors.push("Please tell us your name.");
  if (!data.email) errors.push("Please give us an email address.");
  else if (!looksLikeEmail(data.email)) errors.push("That email address doesn't look right.");

  if (errors.length) {
    return res.status(400).json({ error: errors.join(" ") });
  }

  /* --- compose --------------------------------------------------- */
  const order = ["name", "email", "phone", "location", "project", "budget"];
  const rows = order
    .filter(function (k) { return data[k]; })
    .map(function (k) {
      return (
        '<tr>' +
        '<td style="padding:6px 18px 6px 0;color:#857c6f;font:500 11px/1.5 Arial,sans-serif;' +
        'letter-spacing:.12em;text-transform:uppercase;vertical-align:top;white-space:nowrap">' +
        escapeHtml(LABELS[k]) +
        "</td>" +
        '<td style="padding:6px 0;color:#1b1916;font:400 15px/1.6 Arial,sans-serif">' +
        escapeHtml(data[k]) +
        "</td></tr>"
      );
    })
    .join("");

  const html =
    '<div style="background:#f8f6f2;padding:28px">' +
    '<div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #e4dfd6;padding:30px 32px">' +
    '<p style="margin:0 0 4px;color:#a8874e;font:500 11px/1.5 Arial,sans-serif;letter-spacing:.24em;text-transform:uppercase">' +
    "New website enquiry</p>" +
    '<h1 style="margin:0 0 24px;color:#1b1916;font:400 26px/1.25 Georgia,serif">' +
    escapeHtml(data.name) +
    "</h1>" +
    '<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">' +
    rows +
    "</table>" +
    (data.message
      ? '<div style="margin-top:24px;padding-top:20px;border-top:1px solid #e4dfd6">' +
        '<p style="margin:0 0 8px;color:#857c6f;font:500 11px/1.5 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase">' +
        escapeHtml(LABELS.message) +
        "</p>" +
        '<div style="color:#1b1916;font:400 15px/1.7 Arial,sans-serif;white-space:pre-wrap">' +
        escapeHtml(data.message) +
        "</div></div>"
      : "") +
    '<p style="margin:26px 0 0;padding-top:18px;border-top:1px solid #e4dfd6;color:#857c6f;' +
    'font:400 12px/1.6 Arial,sans-serif">Sent from the contact form at lathremhomebuilders.' +
    " Reply directly to this message to answer " +
    escapeHtml(data.name) +
    ".</p>" +
    "</div></div>";

  const text = order
    .filter(function (k) { return data[k]; })
    .map(function (k) { return LABELS[k] + ": " + data[k]; })
    .concat(data.message ? ["", LABELS.message, "-----------------", data.message] : [])
    .join("\n");

  /* --- send ------------------------------------------------------ */
  try {
    const resend = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: from,
        to: [to],
        reply_to: data.email,
        subject: "Website enquiry — " + data.name,
        html: html,
        text: text
      })
    });

    if (!resend.ok) {
      const detail = await resend.text();
      console.error("contact: resend returned " + resend.status + " " + detail);
      return res.status(502).json({ error: "We couldn't send that just now." });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("contact: " + (err && err.message));
    return res.status(502).json({ error: "We couldn't send that just now." });
  }
};
