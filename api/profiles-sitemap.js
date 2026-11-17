// Sitemap of public EdubbaX profiles (/t/<slug>), rewritten from /profiles-sitemap.xml.
const SB_URL = "https://lgocimljvbxvlyjbyqxe.supabase.co";
const SB_KEY = "sb_publishable_4_lrkPN0L1xyz6u-d_01Tg_Syp7WslP";
const SITE = "https://edubbax.vercel.app";
module.exports = async (req, res) => {
  let list = [];
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/public_profile_slugs`, { method: "POST", headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" }, body: "{}" });
    if (r.ok) list = (await r.json()) || [];
  } catch (e) { console.error("sitemap", e); }
  const items = list.filter((x) => /^[a-z0-9-]{3,40}$/.test(x.slug)).map((x) => `<url><loc>${SITE}/t/${x.slug}</loc><lastmod>${String(x.updated_at || "").slice(0, 10)}</lastmod><changefreq>weekly</changefreq></url>`).join("");
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600");
  res.end(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`);
};
