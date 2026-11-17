// EdubbaX public profile page: /t/<slug>  (rewritten to /api/profile?slug=<slug> in vercel.json)
// Server-rendered so search engines and link previews see the real content.
// Data comes from the Supabase RPC public_profile(), which returns a profile only when it is
// approved, paid, not expired, published and the owner consented. HTML comes from lib/profile-render.js
// (the same renderer the app uses for its live preview).
const R = require("../lib/profile-render.js");
const SB_URL = "https://lgocimljvbxvlyjbyqxe.supabase.co";
const SB_KEY = "sb_publishable_4_lrkPN0L1xyz6u-d_01Tg_Syp7WslP"; // publishable key (public by design)

async function fetchProfile(slug) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/public_profile`, {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_slug: slug }),
  });
  if (!r.ok) throw new Error("supabase " + r.status);
  return r.json();
}

module.exports = async (req, res) => {
  const q = req.query || {};
  const slug = String(q.slug || "").toLowerCase().trim();
  const lang = R.L[q.lang] ? q.lang : "az";
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)) { res.statusCode = 404; res.setHeader("Cache-Control", "public, s-maxage=300"); return res.end(R.notFound(lang)); }
  let p = null;
  try { p = await fetchProfile(slug); } catch (e) {
    console.error("profile fetch", e);
    res.statusCode = 503; res.setHeader("Cache-Control", "no-store"); res.setHeader("Retry-After", "60");
    return res.end(R.notFound(lang));
  }
  if (!p) { res.statusCode = 404; res.setHeader("Cache-Control", "public, s-maxage=60"); return res.end(R.notFound(lang)); }
  res.statusCode = 200;
  res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=3600");
  return res.end(R.render(p, { lang }));
};
