// EdubbaX public profile page: /t/<slug>  (rewritten to /api/profile?slug=<slug> in vercel.json)
// Server-rendered so search engines and link previews see the real content.
// Data comes from the Supabase RPC public_profile(), which returns a profile only when it is
// approved, paid, not expired, published and the owner consented. Everything is HTML-escaped.
const SB_URL = "https://lgocimljvbxvlyjbyqxe.supabase.co";
const SB_KEY = "sb_publishable_4_lrkPN0L1xyz6u-d_01Tg_Syp7WslP"; // publishable key (public by design)
const SITE = "https://edubbax.vercel.app";

const L = {
  az: { about: "Haqqında", aboutC: "Kurs haqqında", exp: "Təcrübə", expC: "Təcrübə və nəticələr", edu: "Təhsil və sertifikatlar", eduC: "Lisenziya və sertifikatlar", groups: "Qruplar və qiymətlər", branches: "Filiallar", team: "Müəllimlər", contacts: "Əlaqə",
    signup: "Dərsə yazıl", signupText: "Adınızı və telefonunuzu yazın, müəllim sizinlə əlaqə saxlayacaq.", signupTextC: "Adınızı və telefonunuzu yazın, kurs sizinlə əlaqə saxlayacaq.", name: "Ad, soyad", phone: "Telefon", msg: "Mesaj (istəyə görə)", msgPh: "Məsələn: 9-cu sinif, riyaziyyat, həftədə 2 dəfə",
    send: "Göndər", sent: "Göndərildi. Tezliklə sizinlə əlaqə saxlanılacaq.", err: "Göndərilmədi. Nömrəni yoxlayıb yenidən cəhd edin.", rate: "Çox sayda müraciət göndərilib. Bir az sonra yenidən cəhd edin.", consent: "Məlumatlarım yalnız bu müəllimə/kursa göndərilir.",
    call: "Zəng et", wa: "WhatsApp", verified: "EdubbaX tərəfindən təsdiqlənib", teacher: "Müəllim", course: "Tədris mərkəzi", schedule: "Cədvəl", price: "Qiymət", powered: "Powered by", report: "Profildə səhv və ya saxtakarlıq görürsünüz? Bizə yazın",
    nf: "Profil tapılmadı", nfText: "Bu ünvanda açıq profil yoxdur və ya müddəti bitib.", home: "EdubbaX ana səhifəsi", waText: "Salam! EdubbaX profilinizdən yazıram." },
  en: { about: "About", aboutC: "About the centre", exp: "Experience", expC: "Experience and results", edu: "Education and certificates", eduC: "Licences and certificates", groups: "Groups and prices", branches: "Branches", team: "Teachers", contacts: "Contacts",
    signup: "Sign up for lessons", signupText: "Leave your name and phone; the teacher will contact you.", signupTextC: "Leave your name and phone; the centre will contact you.", name: "Full name", phone: "Phone", msg: "Message (optional)", msgPh: "e.g. Grade 9, maths, twice a week",
    send: "Send", sent: "Sent. You will be contacted soon.", err: "Not sent. Check the number and try again.", rate: "Too many requests. Please try again later.", consent: "My details go only to this teacher/centre.",
    call: "Call", wa: "WhatsApp", verified: "Verified by EdubbaX", teacher: "Teacher", course: "Learning centre", schedule: "Schedule", price: "Price", powered: "Powered by", report: "See a mistake or a fake profile? Tell us",
    nf: "Profile not found", nfText: "There is no public profile at this address, or it has expired.", home: "EdubbaX home", waText: "Hello! I found you on EdubbaX." },
  tr: { about: "Hakkında", aboutC: "Kurs hakkında", exp: "Deneyim", expC: "Deneyim ve sonuçlar", edu: "Eğitim ve sertifikalar", eduC: "Lisans ve sertifikalar", groups: "Gruplar ve ücretler", branches: "Şubeler", team: "Öğretmenler", contacts: "İletişim",
    signup: "Derse kaydol", signupText: "Adınızı ve telefonunuzu bırakın, öğretmen sizinle iletişime geçecek.", signupTextC: "Adınızı ve telefonunuzu bırakın, kurs sizinle iletişime geçecek.", name: "Ad soyad", phone: "Telefon", msg: "Mesaj (isteğe bağlı)", msgPh: "Örn: 9. sınıf, matematik, haftada 2 kez",
    send: "Gönder", sent: "Gönderildi. Kısa süre içinde size dönülecek.", err: "Gönderilemedi. Numarayı kontrol edip tekrar deneyin.", rate: "Çok fazla talep gönderildi. Biraz sonra tekrar deneyin.", consent: "Bilgilerim yalnızca bu öğretmene/kursa gider.",
    call: "Ara", wa: "WhatsApp", verified: "EdubbaX tarafından doğrulandı", teacher: "Öğretmen", course: "Eğitim merkezi", schedule: "Program", price: "Ücret", powered: "Powered by", report: "Hata veya sahte profil mi gördünüz? Bize yazın",
    nf: "Profil bulunamadı", nfText: "Bu adreste açık profil yok ya da süresi dolmuş.", home: "EdubbaX ana sayfa", waText: "Merhaba! EdubbaX profilinizden yazıyorum." },
};

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const url = (v) => (/^https?:\/\/[^\s"<>]+$/i.test(String(v || "")) ? String(v) : "");
const handle = (v) => (/^[A-Za-z0-9._]{1,40}$/.test(String(v || "")) ? String(v) : "");
const digits = (v) => String(v || "").replace(/[^0-9]/g, "");
const paras = (t) => esc(t).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
const img = (path) => (path ? `${SB_URL}/storage/v1/object/public/profile-media/${String(path).split("/").map(encodeURIComponent).join("/")}` : "");
const initials = (n) => String(n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
const cut = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };

async function fetchProfile(slug) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/public_profile`, {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_slug: slug }),
  });
  if (!r.ok) throw new Error("supabase " + r.status);
  return r.json();
}

function css(acc) {
  return `:root{--acc:${acc};--bg:#f7f5f0;--fg:#1d1b17;--fg2:#4b463d;--muted:#7a7366;--line:#e6e0d4;--card:#fff;--soft:color-mix(in srgb,var(--acc) 12%,#fff)}
@media (prefers-color-scheme:dark){:root{--bg:#121110;--fg:#f3efe7;--fg2:#d2ccbf;--muted:#9a9384;--line:#2c2924;--card:#1b1916;--soft:color-mix(in srgb,var(--acc) 22%,#1b1916)}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 Onest,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
a{color:inherit}.wrap{max-width:960px;margin:0 auto;padding:0 16px}
.hero{background:linear-gradient(160deg,var(--acc),color-mix(in srgb,var(--acc) 55%,#000));color:#fff;padding:40px 0 72px}
.hero .wrap{display:flex;gap:24px;align-items:center;flex-wrap:wrap}
.ph{width:132px;height:132px;border-radius:50%;overflow:hidden;flex:none;border:4px solid rgba(255,255,255,.85);background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:2.6rem;font-weight:700}
.ph.sq{border-radius:24px;background:#fff;color:var(--acc)}.ph img{width:100%;height:100%;object-fit:cover;display:block}
.hero h1{font-family:"Cormorant Garamond",Georgia,serif;font-size:clamp(2rem,5vw,3rem);line-height:1.05;margin:0 0 6px;font-weight:600}
.hero p{margin:0;opacity:.95}.kind{font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;opacity:.85;margin-bottom:6px}
.badge{display:inline-flex;gap:6px;align-items:center;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);padding:3px 10px;border-radius:999px;font-size:.8rem;margin-top:10px}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.chip{background:rgba(255,255,255,.16);border-radius:999px;padding:3px 12px;font-size:.85rem}
.cta{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.btn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:12px;font-weight:600;text-decoration:none;border:0;cursor:pointer;font:inherit;font-weight:600}
.btn.w{background:#fff;color:var(--acc)}.btn.o{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.7)}.btn.a{background:var(--acc);color:#fff}
main.wrap{margin-top:-44px;display:grid;gap:16px;padding-bottom:40px}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px}
.card h2{font-family:"Cormorant Garamond",Georgia,serif;font-size:1.6rem;margin:0 0 10px;font-weight:600}
.card p{margin:0 0 10px;color:var(--fg2)}.card p:last-child{margin-bottom:0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
.g{border:1px solid var(--line);border-radius:14px;padding:14px;background:var(--soft)}.g b{display:block;font-size:1.05rem}.g small{display:block;color:var(--muted)}.g .pr{font-weight:700;color:var(--fg);margin-top:6px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.links{display:flex;gap:8px;flex-wrap:wrap}.links a{border:1px solid var(--line);border-radius:999px;padding:6px 14px;text-decoration:none;font-size:.92rem}
form{display:grid;gap:12px}label{display:grid;gap:6px;font-size:.88rem;font-weight:600;color:var(--fg2)}
input,textarea{font:inherit;padding:11px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--fg);width:100%}
input:focus,textarea:focus,.btn:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}.note{font-size:.82rem;color:var(--muted)}
.res{font-weight:600}.res.ok{color:#1e8a5a}.res.bad{color:#c23b34}
footer{padding:26px 0 40px;text-align:center;color:var(--muted);font-size:.88rem}footer a{color:var(--fg)}.pw{display:inline-flex;align-items:center;gap:6px;font-weight:600;text-decoration:none;border:1px solid var(--line);padding:6px 14px;border-radius:999px;background:var(--card)}
.pw b{font-family:"Cormorant Garamond",Georgia,serif;font-size:1.15rem;color:#b8902f}.pw b i{font-style:normal;color:var(--fg)}
@media (max-width:640px){.hero{padding:28px 0 64px}.ph{width:96px;height:96px;font-size:2rem}.two{grid-template-columns:1fr}.card{padding:18px}}`;
}

function page(p, lang) {
  const T = L[lang] || L.az, course = p.kind === "course", c = p.contacts || {};
  const acc = /^#[0-9a-fA-F]{6}$/.test(p.accent || "") ? p.accent : "#c9a24a";
  const pageUrl = `${SITE}/t/${p.slug}`;
  const photo = img(p.image_path);
  const desc = cut([p.headline, p.city, (p.subjects || []).join(", "), p.bio].filter(Boolean).join(" · "), 158);
  const title = `${p.name}${p.headline ? " — " + p.headline : ""} | EdubbaX`;
  const tel = digits(c.phone), wa = digits(c.whatsapp || c.phone);
  const social = [
    ["Instagram", handle(c.instagram) && `https://instagram.com/${handle(c.instagram)}`],
    ["Facebook", url(c.facebook)], ["YouTube", url(c.youtube)],
    ["Telegram", handle(c.telegram) && `https://t.me/${handle(c.telegram)}`],
    ["TikTok", handle(c.tiktok) && `https://www.tiktok.com/@${handle(c.tiktok)}`],
    [lang === "en" ? "Website" : lang === "tr" ? "Web sitesi" : "Sayt", url(c.website)],
  ].filter((x) => x[1]);
  const ld = {
    "@context": "https://schema.org", "@type": course ? "EducationalOrganization" : "Person",
    name: p.name, url: pageUrl, description: desc || undefined, image: photo || undefined,
    ...(course ? {} : { jobTitle: p.headline || undefined, knowsAbout: (p.subjects || []).length ? p.subjects : undefined }),
    address: p.city ? { "@type": "PostalAddress", addressLocality: p.city } : undefined,
    telephone: c.phone || undefined, email: c.email || undefined,
    sameAs: social.length ? social.map((x) => x[1]) : undefined,
  };
  const groups = (p.groups || []).map((g) => `<div class="g"><b>${esc(g.name)}</b>${g.schedule ? `<small>${esc(T.schedule)}: ${esc(g.schedule)}</small>` : ""}${g.price ? `<div class="pr">${esc(g.price)}</div>` : ""}${g.note ? `<small>${esc(g.note)}</small>` : ""}</div>`).join("");
  const branches = (p.branches || []).map((b) => `<div class="g"><b>${esc(b.name)}</b>${b.address ? `<small>${esc(b.address)}</small>` : ""}${b.phone ? `<small><a href="tel:+${esc(digits(b.phone))}">${esc(b.phone)}</a></small>` : ""}</div>`).join("");
  const team = (p.team || []).map((m) => `<div class="g"><b>${esc(m.name)}</b>${m.subject ? `<small>${esc(m.subject)}</small>` : ""}</div>`).join("");
  const sec = (h, body) => (body ? `<section class="card"><h2>${esc(h)}</h2>${body}</section>` : "");
  const waLink = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(T.waText)}` : "";
  const fontHref = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Onest:wght@400;600;700&display=swap";
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(pageUrl)}">
<meta property="og:type" content="profile"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:image" content="${esc(photo || SITE + "/assets/og-image.png")}"><meta property="og:site_name" content="EdubbaX"><meta name="twitter:card" content="${photo ? "summary" : "summary_large_image"}">
<meta name="theme-color" content="${acc}"><link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${fontHref}" media="print" onload="this.media='all'">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<style>${css(acc)}</style></head><body>
<header class="hero"><div class="wrap">
  <div class="ph ${course ? "sq" : ""}">${photo ? `<img src="${esc(photo)}" alt="${esc(p.name)}" width="132" height="132">` : esc(initials(p.name))}</div>
  <div style="flex:1;min-width:240px">
    <div class="kind">${esc(course ? T.course : T.teacher)}${p.city ? " · " + esc(p.city) : ""}</div>
    <h1>${esc(p.name)}</h1>${p.headline ? `<p>${esc(p.headline)}</p>` : ""}
    ${p.verified ? `<div class="badge">✓ ${esc(T.verified)}</div>` : ""}
    ${(p.subjects || []).length ? `<div class="chips">${p.subjects.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>` : ""}
    <div class="cta"><a class="btn w" href="#signup">${esc(T.signup)}</a>${waLink ? `<a class="btn o" href="${esc(waLink)}" target="_blank" rel="noopener">${esc(T.wa)}</a>` : ""}${tel ? `<a class="btn o" href="tel:+${esc(tel)}">${esc(T.call)}</a>` : ""}</div>
  </div></div></header>
<main class="wrap">
  ${sec(course ? T.aboutC : T.about, p.bio ? paras(p.bio) : "")}
  ${p.experience || p.education ? `<div class="two">${sec(course ? T.expC : T.exp, p.experience ? paras(p.experience) : "")}${sec(course ? T.eduC : T.edu, p.education ? paras(p.education) : "")}</div>` : ""}
  ${sec(T.groups, (p.price_note ? paras(p.price_note) : "") + (groups ? `<div class="grid">${groups}</div>` : ""))}
  ${sec(T.branches, branches ? `<div class="grid">${branches}</div>` : "")}
  ${sec(T.team, team ? `<div class="grid">${team}</div>` : "")}
  <div class="two">
  <section class="card" id="signup"><h2>${esc(T.signup)}</h2><p>${esc(course ? T.signupTextC : T.signupText)}</p>
    <form id="lead" novalidate><label>${esc(T.name)}<input name="name" required maxlength="80" autocomplete="name"></label>
    <label>${esc(T.phone)}<input name="phone" type="tel" required maxlength="30" placeholder="+994 50 000 00 00" autocomplete="tel"></label>
    <label>${esc(T.msg)}<textarea name="message" rows="3" maxlength="500" placeholder="${esc(T.msgPh)}"></textarea></label>
    <div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
    <button class="btn a" type="submit">${esc(T.send)}</button><div class="res" id="res" role="status"></div><div class="note">${esc(T.consent)}</div></form></section>
  ${sec(T.contacts, `${c.phone ? `<p><a href="tel:+${esc(tel)}">${esc(c.phone)}</a></p>` : ""}${c.email ? `<p><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>` : ""}${social.length ? `<div class="links">${social.map(([n, h]) => `<a href="${esc(h)}" target="_blank" rel="noopener nofollow">${esc(n)}</a>`).join("")}</div>` : ""}`) || "<div></div>"}
  </div>
</main>
<footer><a class="pw" href="${SITE}/?utm_source=profile&utm_medium=badge&utm_campaign=${encodeURIComponent(p.slug)}">${esc(T.powered)} <b>edubba<i>X</i></b></a>
<p><a href="mailto:edubbax@gmail.com?subject=${encodeURIComponent("Profil: " + p.slug)}">${esc(T.report)}</a></p></footer>
<script>(function(){var f=document.getElementById('lead'),r=document.getElementById('res');f.addEventListener('submit',function(e){e.preventDefault();var d=new FormData(f),n=String(d.get('name')||'').trim(),ph=String(d.get('phone')||'').trim();
if(n.length<2||!/^[0-9+ ()-]{5,30}$/.test(ph)){r.className='res bad';r.textContent=${JSON.stringify(T.err)};return}var b=f.querySelector('button');b.disabled=true;
fetch(${JSON.stringify(SB_URL)}+'/rest/v1/rpc/profile_lead',{method:'POST',headers:{apikey:${JSON.stringify(SB_KEY)},Authorization:'Bearer '+${JSON.stringify(SB_KEY)},'Content-Type':'application/json'},
body:JSON.stringify({p_slug:${JSON.stringify(p.slug)},p_name:n,p_phone:ph,p_message:String(d.get('message')||''),p_hp:String(d.get('website')||'')})}).then(function(x){return x.ok?null:x.json().then(function(j){throw j})})
.then(function(){f.reset();r.className='res ok';r.textContent=${JSON.stringify(T.sent)}}).catch(function(j){r.className='res bad';r.textContent=(j&&/EDX:rate/.test(j.message||''))?${JSON.stringify(T.rate)}:${JSON.stringify(T.err)}}).finally(function(){b.disabled=false})})})();</script>
</body></html>`;
}

function notFound(lang) {
  const T = L[lang] || L.az;
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(T.nf)} | EdubbaX</title><style>${css("#c9a24a")}</style></head><body><header class="hero"><div class="wrap"><div><h1>${esc(T.nf)}</h1><p>${esc(T.nfText)}</p><div class="cta"><a class="btn w" href="${SITE}/">${esc(T.home)}</a></div></div></div></header></body></html>`;
}

module.exports = async (req, res) => {
  const q = req.query || {};
  const slug = String(q.slug || "").toLowerCase().trim();
  const lang = L[q.lang] ? q.lang : "az";
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)) { res.statusCode = 404; res.setHeader("Cache-Control", "public, s-maxage=300"); return res.end(notFound(lang)); }
  let p = null;
  try { p = await fetchProfile(slug); } catch (e) {
    console.error("profile fetch", e);
    res.statusCode = 503; res.setHeader("Cache-Control", "no-store"); res.setHeader("Retry-After", "60");
    return res.end(notFound(lang));
  }
  if (!p) { res.statusCode = 404; res.setHeader("Cache-Control", "public, s-maxage=60"); return res.end(notFound(lang)); }
  res.statusCode = 200;
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  return res.end(page(p, lang));
};
module.exports.page = page; // for local tests
module.exports.notFound = notFound;
