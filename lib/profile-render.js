/* EdubbaX public profile renderer — shared by the Vercel function (server-side page at /t/<slug>)
   and by the app (live preview while the teacher edits). Pure string templating, no dependencies.
   Every value coming from the profile is HTML-escaped; links are re-validated here. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.EdxProfile = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const SITE = "https://edubbax.vercel.app";
  const SB_URL = "https://lgocimljvbxvlyjbyqxe.supabase.co";
  const SB_KEY = "sb_publishable_4_lrkPN0L1xyz6u-d_01Tg_Syp7WslP"; // publishable key (public by design)

  /* ---------- themes, fonts ---------- */
  const THEMES = [
    { id: "zirve", az: "Zirvə", en: "Summit", tr: "Zirve", d: { az: "Rəngli başlıq, kartlar", en: "Colour header, cards", tr: "Renkli başlık, kartlar" }, accent: "#2f6fb2", font: "elegant" },
    { id: "sade", az: "Sadə", en: "Minimal", tr: "Sade", d: { az: "Ağ, sakit, çox boşluq", en: "White, calm, airy", tr: "Beyaz, sakin, ferah" }, accent: "#1f2937", font: "modern" },
    { id: "kart", az: "Vizit kartı", en: "Link card", tr: "Kartvizit", d: { az: "Instagram bio üçün", en: "Made for Instagram bio", tr: "Instagram biyografisi için" }, accent: "#b23a48", font: "friendly" },
    { id: "gece", az: "Gecə", en: "Night", tr: "Gece", d: { az: "Tünd və parlaq", en: "Dark with glow", tr: "Koyu ve parlak" }, accent: "#c9a24a", font: "elegant" },
    { id: "canli", az: "Canlı", en: "Playful", tr: "Canlı", d: { az: "Uşaq və gənclər üçün", en: "For kids and teens", tr: "Çocuk ve gençler için" }, accent: "#e0662b", font: "friendly" },
    { id: "akademik", az: "Akademik", en: "Academic", tr: "Akademik", d: { az: "Klassik, iki sütun", en: "Classic, two columns", tr: "Klasik, iki sütun" }, accent: "#7a2e2e", font: "classic" },
    { id: "korporativ", az: "Kurs", en: "Centre", tr: "Kurum", d: { az: "Menyu, banner, rəqəmlər", en: "Nav bar, banner, stats", tr: "Menü, banner, sayılar" }, accent: "#1e8a5a", font: "modern" },
    { id: "bolunmus", az: "Bölünmüş", en: "Split", tr: "Bölünmüş", d: { az: "Böyük şəkil, iki tərəf", en: "Big photo, two halves", tr: "Büyük fotoğraf, iki taraf" }, accent: "#6b4bb8", font: "classic" },
  ];
  const FONTS = {
    elegant: { az: "Zərif", en: "Elegant", tr: "Zarif", h: '"Cormorant Garamond",Georgia,serif', b: 'Onest,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif', q: "family=Cormorant+Garamond:wght@600;700&family=Onest:wght@400;600;700", hw: 600 },
    modern: { az: "Müasir", en: "Modern", tr: "Modern", h: 'Onest,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif', b: 'Onest,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif', q: "family=Onest:wght@400;600;700;800", hw: 800 },
    friendly: { az: "Mehriban", en: "Friendly", tr: "Samimi", h: 'Nunito,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif', b: 'Nunito,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif', q: "family=Nunito:wght@400;600;700;800", hw: 800 },
    classic: { az: "Klassik", en: "Classic", tr: "Klasik", h: '"Playfair Display",Georgia,serif', b: '"Source Sans 3",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif', q: "family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@400;600;700", hw: 700 },
  };
  const MODES = ["auto", "light", "dark"];

  /* ---------- labels ---------- */
  const L = {
    az: { about: "Haqqında", aboutC: "Kurs haqqında", exp: "Təcrübə", expC: "Təcrübə və nəticələr", edu: "Təhsil və sertifikatlar", eduC: "Lisenziya və sertifikatlar", groups: "Qruplar və qiymətlər", branches: "Filiallar", team: "Müəllimlər", contacts: "Əlaqə",
      signup: "Dərsə yazıl", signupText: "Adınızı və telefonunuzu yazın, müəllim sizinlə əlaqə saxlayacaq.", signupTextC: "Adınızı və telefonunuzu yazın, kurs sizinlə əlaqə saxlayacaq.", name: "Ad, soyad", phone: "Telefon", msg: "Mesaj (istəyə görə)", msgPh: "Məsələn: 9-cu sinif, riyaziyyat, həftədə 2 dəfə",
      send: "Göndər", sent: "Göndərildi. Tezliklə sizinlə əlaqə saxlanılacaq.", err: "Göndərilmədi. Nömrəni yoxlayıb yenidən cəhd edin.", rate: "Çox sayda müraciət göndərilib. Bir az sonra yenidən cəhd edin.", consent: "Məlumatlarım yalnız bu müəllimə/kursa göndərilir.",
      call: "Zəng et", wa: "WhatsApp", verified: "EdubbaX tərəfindən təsdiqlənib", teacher: "Müəllim", course: "Tədris mərkəzi", schedule: "Cədvəl", price: "Qiymət", powered: "Powered by", report: "Profildə səhv və ya saxtakarlıq görürsünüz? Bizə yazın",
      nf: "Profil tapılmadı", nfText: "Bu ünvanda açıq profil yoxdur və ya müddəti bitib.", home: "EdubbaX ana səhifəsi", waText: "Salam! EdubbaX profilinizdən yazıram.", website: "Sayt",
      sSubjects: "fənn", sGroups: "qrup", sBranches: "filial", sTeam: "müəllim", preview: "Ön baxış: forma burada göndərilmir.", menu: "Bölmələr" },
    en: { about: "About", aboutC: "About the centre", exp: "Experience", expC: "Experience and results", edu: "Education and certificates", eduC: "Licences and certificates", groups: "Groups and prices", branches: "Branches", team: "Teachers", contacts: "Contacts",
      signup: "Sign up for lessons", signupText: "Leave your name and phone; the teacher will contact you.", signupTextC: "Leave your name and phone; the centre will contact you.", name: "Full name", phone: "Phone", msg: "Message (optional)", msgPh: "e.g. Grade 9, maths, twice a week",
      send: "Send", sent: "Sent. You will be contacted soon.", err: "Not sent. Check the number and try again.", rate: "Too many requests. Please try again later.", consent: "My details go only to this teacher/centre.",
      call: "Call", wa: "WhatsApp", verified: "Verified by EdubbaX", teacher: "Teacher", course: "Learning centre", schedule: "Schedule", price: "Price", powered: "Powered by", report: "See a mistake or a fake profile? Tell us",
      nf: "Profile not found", nfText: "There is no public profile at this address, or it has expired.", home: "EdubbaX home", waText: "Hello! I found you on EdubbaX.", website: "Website",
      sSubjects: "subjects", sGroups: "groups", sBranches: "branches", sTeam: "teachers", preview: "Preview: the form is not sent from here.", menu: "Sections" },
    tr: { about: "Hakkında", aboutC: "Kurs hakkında", exp: "Deneyim", expC: "Deneyim ve sonuçlar", edu: "Eğitim ve sertifikalar", eduC: "Lisans ve sertifikalar", groups: "Gruplar ve ücretler", branches: "Şubeler", team: "Öğretmenler", contacts: "İletişim",
      signup: "Derse kaydol", signupText: "Adınızı ve telefonunuzu bırakın, öğretmen sizinle iletişime geçecek.", signupTextC: "Adınızı ve telefonunuzu bırakın, kurs sizinle iletişime geçecek.", name: "Ad soyad", phone: "Telefon", msg: "Mesaj (isteğe bağlı)", msgPh: "Örn: 9. sınıf, matematik, haftada 2 kez",
      send: "Gönder", sent: "Gönderildi. Kısa süre içinde size dönülecek.", err: "Gönderilemedi. Numarayı kontrol edip tekrar deneyin.", rate: "Çok fazla talep gönderildi. Biraz sonra tekrar deneyin.", consent: "Bilgilerim yalnızca bu öğretmene/kursa gider.",
      call: "Ara", wa: "WhatsApp", verified: "EdubbaX tarafından doğrulandı", teacher: "Öğretmen", course: "Eğitim merkezi", schedule: "Program", price: "Ücret", powered: "Powered by", report: "Hata veya sahte profil mi gördünüz? Bize yazın",
      nf: "Profil bulunamadı", nfText: "Bu adreste açık profil yok ya da süresi dolmuş.", home: "EdubbaX ana sayfa", waText: "Merhaba! EdubbaX profilinizden yazıyorum.", website: "Web sitesi",
      sSubjects: "ders", sGroups: "grup", sBranches: "şube", sTeam: "öğretmen", preview: "Önizleme: form buradan gönderilmez.", menu: "Bölümler" },
  };

  /* ---------- helpers ---------- */
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const url = (v) => (/^https?:\/\/[^\s"<>]+$/i.test(String(v || "")) ? String(v) : "");
  const handle = (v) => (/^[A-Za-z0-9._]{1,40}$/.test(String(v || "")) ? String(v) : "");
  const digits = (v) => String(v || "").replace(/[^0-9]/g, "");
  const paras = (t) => esc(t).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
  const img = (path) => (path ? `${SB_URL}/storage/v1/object/public/profile-media/${String(path).split("/").map(encodeURIComponent).join("/")}` : "");
  const initials = (n) => String(n || "?").trim().split(/\s+/).slice(0, 2).map((w) => Array.from(w)[0] || "").join("").toLocaleUpperCase("az");
  const cut = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };

  /* colour maths: keep text readable on any accent the teacher picks (WCAG contrast) */
  function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function hex(c) { return "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join(""); }
  function lum(c) { const a = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; }
  function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function mix(a, b, t) { return a.map((v, i) => v + (b[i] - v) * t); }
  /* move the accent towards black (light bg) or white (dark bg) until it reaches 4.5:1 against bg */
  function ink(acc, bg) { const a = rgb(acc), g = rgb(bg), to = lum(g) > 0.4 ? [0, 0, 0] : [255, 255, 255]; for (let t = 0; t <= 1; t += 0.05) { const c = mix(a, to, t); if (contrast(c, g) >= 4.5) return hex(c); } return hex(to); }
  function onColor(acc) { const a = rgb(acc); return contrast(a, [255, 255, 255]) >= 3 ? "#ffffff" : "#16140f"; }
  const okHex = (v, d) => (/^#[0-9a-fA-F]{6}$/.test(v || "") ? v.toLowerCase() : d);

  /* ---------- CSS ---------- */
  function palette(theme, dark) {
    if (theme === "gece") return { bg: "#0d0c0b", fg: "#f4efe6", fg2: "#cfc8bb", muted: "#958e80", line: "#2a2722", card: "#16140f" };
    if (dark) return { bg: "#121110", fg: "#f3efe7", fg2: "#d2ccbf", muted: "#9a9384", line: "#2c2924", card: "#1b1916" };
    if (theme === "akademik") return { bg: "#f6f1e7", fg: "#1f1a14", fg2: "#40382d", muted: "#7a6f60", line: "#ddd2bf", card: "#fffdf8" };
    if (theme === "sade") return { bg: "#ffffff", fg: "#15161a", fg2: "#3d4049", muted: "#6b6f7a", line: "#e7e8ec", card: "#ffffff" };
    if (theme === "canli") return { bg: "#fffaf3", fg: "#1d1b17", fg2: "#4b463d", muted: "#7a7366", line: "#eee4d4", card: "#ffffff" };
    return { bg: "#f7f5f0", fg: "#1d1b17", fg2: "#4b463d", muted: "#7a7366", line: "#e6e0d4", card: "#ffffff" };
  }
  function vars(theme, acc, dark) {
    const P = palette(theme, dark);
    return `--acc:${acc};--on-acc:${onColor(acc)};--ink:${ink(acc, P.bg)};--ink-card:${ink(acc, P.card)};--bg:${P.bg};--fg:${P.fg};--fg2:${P.fg2};--muted:${P.muted};--line:${P.line};--card:${P.card};--soft:color-mix(in srgb,${acc} ${dark || theme === "gece" ? 20 : 11}%,${P.card})`;
  }
  function css(theme, acc, font, mode) {
    const F = FONTS[font] || FONTS.elegant;
    const lightV = vars(theme, acc, false), darkV = vars(theme, acc, true);
    const root = mode === "dark" ? `:root{${darkV}}` : mode === "light" || theme === "gece" ? `:root{${lightV}}` : `:root{${lightV}}@media (prefers-color-scheme:dark){:root{${darkV}}}`;
    const base = `${root}
:root{--fh:${F.h};--fb:${F.b};--hw:${F.hw};--r:18px}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 var(--fb)}
a{color:var(--ink)}img{max-width:100%}.wrap{max-width:980px;margin:0 auto;padding:0 16px}
h1,h2,h3{font-family:var(--fh);font-weight:var(--hw);line-height:1.1}h1{font-size:clamp(2rem,5vw,3.1rem);margin:0 0 6px}
.ph{width:132px;height:132px;border-radius:50%;overflow:hidden;flex:none;display:flex;align-items:center;justify-content:center;font-size:2.6rem;font-weight:700;background:var(--acc);color:var(--on-acc);font-family:var(--fh)}
.ph.sq{border-radius:24px}.ph img{width:100%;height:100%;object-fit:cover;display:block}
.kind{font-size:.76rem;letter-spacing:.14em;text-transform:uppercase;font-weight:600;margin-bottom:8px;opacity:.85}
.head p.hl{margin:0;font-size:1.08rem}
.badge{align-self:flex-start;display:inline-flex;gap:6px;align-items:center;padding:4px 11px;border-radius:999px;font-size:.8rem;font-weight:600;margin-top:12px;border:1px solid currentColor}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.chip{border-radius:999px;padding:4px 12px;font-size:.86rem;background:var(--soft);color:var(--fg)}
.cta{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 20px;border-radius:12px;text-decoration:none;border:0;cursor:pointer;font:inherit;font-weight:700;line-height:1.2}
.btn.a{background:var(--acc);color:var(--on-acc)}.btn.l{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--line)}
main{display:grid;gap:16px;padding-bottom:40px}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:22px;min-width:0}
.card h2{font-size:1.6rem;margin:0 0 12px}.card p{margin:0 0 10px;color:var(--fg2)}.card p:last-child{margin-bottom:0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.g{border:1px solid var(--line);border-radius:calc(var(--r) - 4px);padding:14px;background:var(--soft)}.g b{display:block;font-size:1.05rem}.g small{display:block;color:var(--muted)}.g .pr{font-weight:800;color:var(--fg);margin-top:6px;font-size:1.05rem}
.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.links{display:flex;gap:8px;flex-wrap:wrap}.links a{border:1px solid var(--line);border-radius:999px;padding:7px 15px;text-decoration:none;font-size:.92rem;font-weight:600}
form{display:grid;gap:12px}label{display:grid;gap:6px;font-size:.88rem;font-weight:600;color:var(--fg2)}
input,textarea{font:inherit;padding:11px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--fg);width:100%}
input:focus,textarea:focus,.btn:focus-visible,a:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}.note{font-size:.82rem;color:var(--muted)}
.res{font-weight:600}.res.ok{color:#1e8a5a}.res.bad{color:#c23b34}
footer{padding:28px 16px 44px;text-align:center;color:var(--muted);font-size:.88rem}footer p a{color:var(--fg2)}
.pw{display:inline-flex;align-items:center;gap:6px;font-weight:600;text-decoration:none;border:1px solid var(--line);padding:7px 15px;border-radius:999px;background:var(--card);color:var(--fg)}
.pw b{font-family:"Cormorant Garamond",Georgia,serif;font-size:1.18rem;color:#b8902f;font-weight:700}.pw b i{font-style:normal;color:var(--fg)}
.stats{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.stat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px 16px;color:var(--fg)}.stat b{font-size:1.4rem;display:block;font-family:var(--fh)}.stat span{font-size:.8rem;color:var(--muted)}
.pv{position:sticky;top:0;z-index:9;background:#1d1b17;color:#fff;text-align:center;font-size:.85rem;padding:6px 10px}
@media (max-width:680px){.two{grid-template-columns:1fr}.card{padding:18px}.ph{width:100px;height:100px;font-size:2.1rem}.cta .btn{flex:1 1 auto}}`;
    const T = {
      zirve: `.head{background:linear-gradient(160deg,var(--acc),color-mix(in srgb,var(--acc) 58%,#000));color:var(--on-acc);padding:44px 0 80px}
.head .wrap{display:flex;gap:26px;align-items:center;flex-wrap:wrap}.head .ph{border:4px solid color-mix(in srgb,var(--on-acc) 80%,transparent);background:color-mix(in srgb,var(--on-acc) 18%,transparent);color:var(--on-acc)}
.head .chip{background:color-mix(in srgb,var(--on-acc) 16%,transparent);color:var(--on-acc)}.head .btn.a{background:var(--on-acc);color:var(--acc)}.head .btn.l{color:var(--on-acc);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--on-acc) 65%,transparent)}
main.wrap{margin-top:-48px}`,
      sade: `.head{padding:64px 0 28px}.head .wrap{display:flex;gap:28px;align-items:center;flex-wrap:wrap}.head .ph{width:120px;height:120px}
.head h1{letter-spacing:-.02em}.head .kind{color:var(--ink)}.badge{color:var(--ink)}.head::after{content:"";display:block;max-width:948px;margin:34px auto 0;height:3px;background:linear-gradient(90deg,var(--acc) 0 64px,var(--line) 64px)}
:root{--r:4px}.card{border:0;border-bottom:1px solid var(--line);border-radius:0;padding:26px 0;background:transparent}.card h2{font-size:1.25rem;text-transform:uppercase;letter-spacing:.08em;color:var(--ink)}
main{gap:0}.g{background:transparent}.two{gap:32px}`,
      kart: `.wrap{max-width:560px}.head{padding:44px 0 10px;text-align:center}.head .wrap{display:flex;flex-direction:column;align-items:center}
.head .ph{width:120px;height:120px;box-shadow:0 0 0 6px var(--soft)}.head h1{margin-top:16px;font-size:2.1rem}.chips,.cta{justify-content:center}
.cta{flex-direction:column;align-self:stretch}.cta .btn{width:100%;padding:15px 20px;border-radius:999px}.badge{color:var(--ink)}
body{background:radial-gradient(circle at 50% -10%,var(--soft),var(--bg) 60%)}.card{border-radius:24px}.two{grid-template-columns:1fr}
.lk{display:grid;gap:10px}.lk a{display:block;text-align:center;padding:13px;border-radius:999px;background:var(--card);border:1px solid var(--line);text-decoration:none;font-weight:700;color:var(--fg)}`,
      gece: `body{background:radial-gradient(900px 500px at 15% -10%,color-mix(in srgb,var(--acc) 30%,transparent),transparent 60%),var(--bg)}
.head{padding:60px 0 30px}.head .wrap{display:flex;gap:28px;align-items:center;flex-wrap:wrap}.head .ph{box-shadow:0 0 0 3px var(--acc),0 0 60px color-mix(in srgb,var(--acc) 55%,transparent)}
.head .kind,.badge{color:var(--ink)}.card{background:color-mix(in srgb,var(--card) 88%,transparent);backdrop-filter:blur(6px)}.card h2{color:var(--ink)}.g{background:color-mix(in srgb,var(--acc) 10%,var(--card))}`,
      canli: `:root{--r:28px}body{background:radial-gradient(600px 300px at 90% 0,color-mix(in srgb,var(--acc) 22%,transparent),transparent 70%),radial-gradient(500px 300px at 0 30%,color-mix(in srgb,var(--acc) 12%,transparent),transparent 70%),var(--bg)}
.head{padding:52px 0 26px}.head .wrap{display:flex;gap:26px;align-items:center;flex-wrap:wrap}.head .ph{border-radius:36% 64% 52% 48%/48% 42% 58% 52%;width:148px;height:148px}
.head h1{font-size:clamp(2.2rem,6vw,3.4rem)}.head .kind{color:var(--ink)}.badge{color:var(--ink)}.btn{border-radius:999px}
.card{border:0;box-shadow:0 10px 30px color-mix(in srgb,var(--acc) 14%,transparent)}.card h2{color:var(--ink)}
.g{border:0;background:color-mix(in srgb,var(--acc) 14%,var(--card))}.g:nth-child(3n+2){background:color-mix(in srgb,var(--acc) 7%,#ffd166 18%)}.g:nth-child(3n){background:color-mix(in srgb,var(--acc) 6%,#9ad1d4 22%)}
@media (prefers-color-scheme:dark){.g:nth-child(n){background:color-mix(in srgb,var(--acc) 18%,var(--card))}}`,
      akademik: `.lay{display:grid;grid-template-columns:300px 1fr;gap:28px;max-width:1060px;margin:0 auto;padding:36px 16px}
.head{position:sticky;top:20px;align-self:start;background:var(--card);border:1px solid var(--line);border-top:5px solid var(--acc);padding:24px;border-radius:6px}
.head .ph{width:100%;height:auto;aspect-ratio:1;border-radius:4px;font-size:3.4rem}.head h1{font-size:2rem;margin-top:16px}.head .kind{color:var(--ink)}.badge{color:var(--ink)}
.cta{flex-direction:column}.cta .btn{width:100%;border-radius:4px}.chip{border-radius:4px}:root{--r:6px}main{padding-bottom:0}
.card h2{border-bottom:1px solid var(--line);padding-bottom:10px;font-size:1.7rem}.card{border-radius:6px}
@media (max-width:820px){.lay{grid-template-columns:1fr}.head{position:static}.head .ph{width:140px;height:140px;aspect-ratio:auto}}`,
      korporativ: `.bar{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--card) 92%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.bar .wrap{display:flex;align-items:center;gap:12px;height:64px}.bar .ph{width:40px;height:40px;font-size:1rem;border-radius:10px}.bar b{flex:1;font-family:var(--fh);font-size:1.1rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bar .btn{padding:9px 16px}
.bar nav{display:flex;gap:16px}.bar nav a{text-decoration:none;color:var(--fg2);font-weight:600;font-size:.92rem}
.head{background:linear-gradient(120deg,color-mix(in srgb,var(--acc) 16%,var(--bg)),var(--bg));border-bottom:1px solid var(--line);padding:56px 0}
.head .ph{display:none}.head h1{font-size:clamp(2.2rem,5.5vw,3.6rem);max-width:760px}.head .kind{color:var(--ink)}.badge{color:var(--ink)}.head p.hl{font-size:1.25rem;color:var(--fg2);max-width:700px}
:root{--r:14px}main.wrap{margin-top:28px}.card h2{color:var(--fg)}
@media (max-width:760px){.bar nav{display:none}}`,
      bolunmus: `.head{padding:0;background:var(--card);border-bottom:1px solid var(--line)}.head .sp{display:grid;grid-template-columns:1.1fr .9fr;min-height:440px;max-width:1180px;margin:0 auto}
.head .tx{padding:56px 40px;display:flex;flex-direction:column;justify-content:center}.head .kind{color:var(--ink)}.badge{color:var(--ink)}
.head .pic{background:var(--acc);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center}.head .pic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.head .pic span{font-family:var(--fh);font-size:7rem;color:var(--on-acc);font-weight:700}.head .pic::after{content:"";position:absolute;left:-60px;bottom:-60px;width:180px;height:180px;border-radius:50%;background:color-mix(in srgb,var(--on-acc) 22%,transparent)}
main.wrap{margin-top:28px}
@media (max-width:760px){.head .sp{grid-template-columns:1fr}.head .pic{min-height:260px;order:-1}.head .tx{padding:28px 18px}}`,
    };
    return base + "\n" + (T[theme] || T.zirve);
  }

  /* ---------- page ---------- */
  function normalize(p) {
    const theme = THEMES.some((t) => t.id === p.theme) ? p.theme : "zirve";
    return { theme, font: FONTS[p.font] ? p.font : "elegant", mode: MODES.includes(p.mode) ? p.mode : "auto", accent: okHex(p.accent, "#c9a24a") };
  }
  function render(p, opt) {
    opt = opt || {};
    const lang = L[opt.lang] ? opt.lang : "az", T = L[lang], preview = !!opt.preview;
    const S = normalize(p), course = p.kind === "course", c = p.contacts || {};
    const pageUrl = `${SITE}/t/${p.slug}`, photo = img(p.image_path);
    const name = p.name || p.display_name || "";
    const subjects = Array.isArray(p.subjects) ? p.subjects : String(p.subjects || "").split(",").map((s) => s.trim()).filter(Boolean);
    const groups = p.groups || [], branches = p.branches || [], team = p.team || [];
    const desc = cut([p.headline, p.city, subjects.join(", "), p.bio].filter(Boolean).join(" · "), 158);
    const title = `${name}${p.headline ? " — " + p.headline : ""} | EdubbaX`;
    const tel = digits(c.phone), wa = digits(c.whatsapp || c.phone);
    const social = [
      ["Instagram", handle(c.instagram) && `https://instagram.com/${handle(c.instagram)}`], ["Facebook", url(c.facebook)], ["YouTube", url(c.youtube)],
      ["Telegram", handle(c.telegram) && `https://t.me/${handle(c.telegram)}`], ["TikTok", handle(c.tiktok) && `https://www.tiktok.com/@${handle(c.tiktok)}`], [T.website, url(c.website)],
    ].filter((x) => x[1]);
    const waLink = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(T.waText)}` : "";
    const ld = {
      "@context": "https://schema.org", "@type": course ? "EducationalOrganization" : "Person", name, url: pageUrl,
      description: desc || undefined, image: photo || undefined,
      ...(course ? {} : { jobTitle: p.headline || undefined, knowsAbout: subjects.length ? subjects : undefined }),
      address: p.city ? { "@type": "PostalAddress", addressLocality: p.city } : undefined,
      telephone: c.phone || undefined, email: c.email || undefined, sameAs: social.length ? social.map((x) => x[1]) : undefined,
    };
    const ph = (cls = "") => `<div class="ph ${course ? "sq" : ""} ${cls}">${photo ? `<img src="${esc(photo)}" alt="${esc(name)}" width="132" height="132">` : esc(initials(name))}</div>`;
    const ctas = `<div class="cta"><a class="btn a" href="#signup">${esc(T.signup)}</a>${waLink ? `<a class="btn l" href="${esc(waLink)}" target="_blank" rel="noopener">${esc(T.wa)}</a>` : ""}${tel ? `<a class="btn l" href="tel:+${esc(tel)}">${esc(T.call)}</a>` : ""}</div>`;
    const info = `<div class="kind">${esc(course ? T.course : T.teacher)}${p.city ? " · " + esc(p.city) : ""}</div>
      <h1>${esc(name)}</h1>${p.headline ? `<p class="hl">${esc(p.headline)}</p>` : ""}
      ${p.verified ? `<div class="badge">✓ ${esc(T.verified)}</div>` : ""}
      ${subjects.length ? `<div class="chips">${subjects.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>` : ""}`;
    const stats = [[subjects.length, T.sSubjects], [groups.length, T.sGroups], [branches.length, T.sBranches], [team.length, T.sTeam]].filter((x) => x[0] > 0)
      .map(([n, l]) => `<div class="stat"><b>${n}</b><span>${esc(l)}</span></div>`).join("");

    let head;
    if (S.theme === "akademik") head = `<header class="head">${ph()}${info}${ctas}</header>`;
    else if (S.theme === "korporativ") head = `<div class="bar"><div class="wrap">${ph()}<b>${esc(name)}</b><nav aria-label="${esc(T.menu)}">${groups.length ? `<a href="#groups">${esc(T.groups)}</a>` : ""}${branches.length ? `<a href="#branches">${esc(T.branches)}</a>` : ""}<a href="#contacts">${esc(T.contacts)}</a></nav><a class="btn a" href="#signup">${esc(T.signup)}</a></div></div>
      <header class="head"><div class="wrap">${info}${stats ? `<div class="stats">${stats}</div>` : ""}${ctas}</div></header>`;
    else if (S.theme === "bolunmus") head = `<header class="head"><div class="sp"><div class="tx">${info}${ctas}</div><div class="pic">${photo ? `<img src="${esc(photo)}" alt="${esc(name)}">` : `<span>${esc(initials(name))}</span>`}</div></div></header>`;
    else head = `<header class="head"><div class="wrap">${ph()}<div style="flex:1;min-width:240px">${info}${ctas}</div></div></header>`;

    const sec = (h, body, id) => (body ? `<section class="card"${id ? ` id="${id}"` : ""}><h2>${esc(h)}</h2>${body}</section>` : "");
    const gHtml = groups.map((g) => `<div class="g"><b>${esc(g.name)}</b>${g.schedule ? `<small>${esc(T.schedule)}: ${esc(g.schedule)}</small>` : ""}${g.price ? `<div class="pr">${esc(g.price)}</div>` : ""}${g.note ? `<small>${esc(g.note)}</small>` : ""}</div>`).join("");
    const bHtml = branches.map((b) => `<div class="g"><b>${esc(b.name)}</b>${b.address ? `<small>${esc(b.address)}</small>` : ""}${b.phone ? `<small><a href="tel:+${esc(digits(b.phone))}">${esc(b.phone)}</a></small>` : ""}</div>`).join("");
    const tHtml = team.map((m) => `<div class="g"><b>${esc(m.name)}</b>${m.subject ? `<small>${esc(m.subject)}</small>` : ""}</div>`).join("");
    const contactBody = `${c.phone ? `<p><a href="tel:+${esc(tel)}">${esc(c.phone)}</a></p>` : ""}${c.email ? `<p><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>` : ""}${social.length ? `<div class="${S.theme === "kart" ? "lk" : "links"}">${social.map(([n, h]) => `<a href="${esc(h)}" target="_blank" rel="noopener nofollow">${esc(n)}</a>`).join("")}</div>` : ""}`;
    const form = `<section class="card" id="signup"><h2>${esc(T.signup)}</h2><p>${esc(course ? T.signupTextC : T.signupText)}</p>
      <form id="lead" novalidate><label>${esc(T.name)}<input name="name" required maxlength="80" autocomplete="name"></label>
      <label>${esc(T.phone)}<input name="phone" type="tel" required maxlength="30" placeholder="+994 50 000 00 00" autocomplete="tel"></label>
      <label>${esc(T.msg)}<textarea name="message" rows="3" maxlength="500" placeholder="${esc(T.msgPh)}"></textarea></label>
      <div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
      <button class="btn a" type="submit">${esc(T.send)}</button><div class="res" id="res" role="status"></div><div class="note">${esc(T.consent)}</div></form></section>`;
    const body = `${sec(course ? T.aboutC : T.about, p.bio ? paras(p.bio) : "")}
      ${p.experience || p.education ? `<div class="two">${sec(course ? T.expC : T.exp, p.experience ? paras(p.experience) : "")}${sec(course ? T.eduC : T.edu, p.education ? paras(p.education) : "")}</div>` : ""}
      ${sec(T.groups, (p.price_note ? paras(p.price_note) : "") + (gHtml ? `<div class="grid">${gHtml}</div>` : ""), "groups")}
      ${sec(T.branches, bHtml ? `<div class="grid">${bHtml}</div>` : "", "branches")}
      ${sec(T.team, tHtml ? `<div class="grid">${tHtml}</div>` : "")}
      <div class="two">${form}${sec(T.contacts, contactBody, "contacts") || "<div></div>"}</div>`;
    const footer = `<footer><a class="pw" href="${SITE}/?utm_source=profile&amp;utm_medium=badge&amp;utm_campaign=${encodeURIComponent(p.slug || "")}" target="${preview ? "_blank" : "_self"}">${esc(T.powered)} <b>edubba<i>X</i></b></a>
      <p><a href="mailto:edubbax@gmail.com?subject=${encodeURIComponent("Profil: " + (p.slug || ""))}">${esc(T.report)}</a></p></footer>`;
    const layout = S.theme === "akademik" ? `<div class="lay">${head}<main>${body}</main></div>` : `${head}<main class="wrap">${body}</main>`;
    const F = FONTS[S.font];
    const script = preview
      ? `<script>document.getElementById('lead').addEventListener('submit',function(e){e.preventDefault();var r=document.getElementById('res');r.className='res bad';r.textContent=${JSON.stringify(T.preview)}});document.addEventListener('click',function(e){var a=e.target.closest('a[href^="#"]');if(a){e.preventDefault();var t=document.querySelector(a.getAttribute('href'));if(t)t.scrollIntoView({behavior:'smooth'})}})</script>`
      : `<script>(function(){var f=document.getElementById('lead'),r=document.getElementById('res');f.addEventListener('submit',function(e){e.preventDefault();var d=new FormData(f),n=String(d.get('name')||'').trim(),ph=String(d.get('phone')||'').trim();
if(n.length<2||!/^[0-9+ ()-]{5,30}$/.test(ph)){r.className='res bad';r.textContent=${JSON.stringify(T.err)};return}var b=f.querySelector('button');b.disabled=true;
fetch(${JSON.stringify(SB_URL)}+'/rest/v1/rpc/profile_lead',{method:'POST',headers:{apikey:${JSON.stringify(SB_KEY)},Authorization:'Bearer '+${JSON.stringify(SB_KEY)},'Content-Type':'application/json'},
body:JSON.stringify({p_slug:${JSON.stringify(p.slug)},p_name:n,p_phone:ph,p_message:String(d.get('message')||''),p_hp:String(d.get('website')||'')})}).then(function(x){return x.ok?null:x.json().then(function(j){throw j})})
.then(function(){f.reset();r.className='res ok';r.textContent=${JSON.stringify(T.sent)}}).catch(function(j){r.className='res bad';r.textContent=(j&&/EDX:rate/.test(j.message||''))?${JSON.stringify(T.rate)}:${JSON.stringify(T.err)}}).finally(function(){b.disabled=false})})})();</script>`;
    return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">${preview ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${esc(pageUrl)}">`}
<meta property="og:type" content="profile"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:image" content="${esc(photo || SITE + "/assets/og-image.png")}"><meta property="og:site_name" content="EdubbaX"><meta name="twitter:card" content="${photo ? "summary" : "summary_large_image"}">
<meta name="theme-color" content="${S.accent}"><link rel="icon" href="${SITE}/favicon.ico" sizes="any">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${F.q}&display=swap">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<style>${css(S.theme, S.accent, S.font, S.mode)}</style></head><body class="t-${S.theme}">
${preview ? `<div class="pv">${esc(T.preview)}</div>` : ""}${layout}${footer}${script}</body></html>`;
  }
  function notFound(lang) {
    const T = L[lang] || L.az;
    return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(T.nf)} | EdubbaX</title><style>${css("zirve", "#c9a24a", "modern", "auto")}</style></head><body><header class="head"><div class="wrap"><div><h1>${esc(T.nf)}</h1><p class="hl">${esc(T.nfText)}</p><div class="cta"><a class="btn a" href="${SITE}/">${esc(T.home)}</a></div></div></div></header></body></html>`;
  }
  return { render, notFound, THEMES, FONTS, MODES, L, ink, onColor };
});
