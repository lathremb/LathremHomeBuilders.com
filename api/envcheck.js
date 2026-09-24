/* TEMPORARY DIAGNOSTIC - delete after use.
   Reports which environment variable NAMES exist and what KIND of key each
   holds. Never returns a value. Token-gated so it is not discoverable. */

const TOKEN = "b217ab78615feee624c3837542df6b53";

function classify(v) {
  if (!v) return "empty";
  if (v.indexOf("sb_secret_") === 0) return "SECRET key (correct)";
  if (v.indexOf("sb_publishable_") === 0) return "PUBLISHABLE key (wrong - cannot write)";
  if (v.indexOf("eyJ") === 0) {
    try {
      const parts = v.split(".");
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
      return "JWT role=" + payload.role +
        (payload.role === "service_role" ? " (correct)" : " (wrong - cannot write)");
    } catch (e) { return "JWT (unreadable payload)"; }
  }
  if (v.indexOf("http") === 0) return "URL";
  return "unrecognised format";
}

module.exports = async function handler(req, res) {
  if ((req.query && req.query.t) !== TOKEN) {
    return res.status(404).json({ error: "Not found." });
  }
  const interesting = Object.keys(process.env)
    .filter(function (k) { return /supabase|lathrem|postgres/i.test(k); })
    .sort()
    .map(function (k) {
      const v = process.env[k] || "";
      return { name: k, length: v.length, kind: classify(v) };
    });

  const READS = [
    "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_KEY",
    "client_lathremhomebuiler_supabase", "CLIENT_LATHREMHOMEBUILER_SUPABASE"
  ];
  return res.status(200).json({
    matching_env_vars: interesting,
    names_the_function_checks: READS,
    which_one_resolves: READS.filter(function (k) { return !!process.env[k]; })[0] || null
  });
};
