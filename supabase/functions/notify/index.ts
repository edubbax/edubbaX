// EdubbaX notifications (Telegram + email).
// Called in three ways:
//  1. By the database (pg_net) with {id, secret}: sends one queued notification.
//  2. By the app (signed-in admin, Authorization: Bearer <user JWT>) with {action: "setup" | "test" | "status"}.
// Secrets (set in Supabase → Edge Functions → Secrets): TELEGRAM_BOT_TOKEN, RESEND_API_KEY, EMAIL_FROM (optional).
// Nothing is sent when a secret is missing; the queue keeps the reason in its "error" column.
// Deploy with verify_jwt = false (this function checks the shared secret / the user's JWT itself).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(SB_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
const TG = (Deno.env.get("TELEGRAM_BOT_TOKEN") || "").trim();
const RESEND = (Deno.env.get("RESEND_API_KEY") || "").trim();
const FROM = (Deno.env.get("EMAIL_FROM") || "EdubbaX <onboarding@resend.dev>").trim();
const APP = "https://edubbax.vercel.app";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const money = (a: unknown, c: unknown) => (c === "USD" ? `$${Number(a || 0).toFixed(2)}` : `${Number(a || 0).toFixed(2)} AZN`);

type Msg = { subject: string; lines: string[]; link: string; button: string };
type P = Record<string, unknown>;
const TX: Record<string, Record<string, (p: P) => Msg>> = {
  az: {
    request_new: (p) => ({ subject: "Yeni profil istəyi", lines: [`<b>Yeni profil istəyi</b>`, `${p.kind === "course" ? "Kurs" : "Müəllim"}: ${esc(p.name)}`, `Telefon: ${esc(p.phone)} · Ölkə: ${esc(p.country)}`], link: `${APP}/#preq`, button: "İstəyə bax" }),
    request_approved: (p) => ({ subject: "Profil istəyiniz təsdiqləndi", lines: [`<b>İstəyiniz təsdiqləndi ✓</b>`, `Profilinizi indi doldura bilərsiniz. Ödənişdən sonra hər kəsə açılacaq: ${money(p.price, p.currency)} / il.`], link: `${APP}/#pubprofile`, button: "Profili doldur" }),
    request_rejected: (p) => ({ subject: "Profil istəyiniz rədd edildi", lines: [`<b>İstəyiniz rədd edildi</b>`, p.note ? `Səbəb: ${esc(p.note)}` : "Məlumatı düzəldib yenidən göndərə bilərsiniz."], link: `${APP}/#pubprofile`, button: "Yenidən göndər" }),
    lead_new: (p) => ({ subject: `Yeni qeydiyyat: ${p.name}`, lines: [`<b>Yeni qeydiyyat istəyi</b>`, `Ad: ${esc(p.name)}`, `Telefon: ${esc(p.phone)}`, p.message ? `Mesaj: ${esc(p.message)}` : ""], link: `${APP}/#pubprofile`, button: "İstəklərə bax" }),
    paid: (p) => ({ subject: "Profiliniz açıldı", lines: [`<b>Ödəniş qəbul edildi, profiliniz açıqdır ✓</b>`, `Bitmə tarixi: ${esc(p.until)}`, `Link: ${APP}/t/${esc(p.slug)}`], link: `${APP}/t/${p.slug}`, button: "Profilə bax" }),
    expiring: (p) => ({ subject: `Profilin bitməsinə ${p.days} gün qalıb`, lines: [`<b>Profilinizin müddəti ${esc(p.until)} tarixində bitir</b>`, `Uzatmaq üçün: ${money(p.price, p.currency)} / il.`], link: `${APP}/#pubprofile`, button: "Uzat" }),
    expired: () => ({ subject: "Profilin müddəti bitdi", lines: [`<b>Profilinizin müddəti bitdi</b>`, "Profil gizləndi, məlumatlarınız silinmədi. Ödənişdən sonra yenidən açılacaq."], link: `${APP}/#pubprofile`, button: "Uzat" }),
    test: () => ({ subject: "EdubbaX test bildirişi", lines: ["<b>Test bildirişi ✓</b>", "Bu kanal işləyir."], link: `${APP}/#preq`, button: "EdubbaX-i aç" }),
  },
  en: {
    request_new: (p) => ({ subject: "New profile request", lines: [`<b>New profile request</b>`, `${p.kind === "course" ? "Centre" : "Teacher"}: ${esc(p.name)}`, `Phone: ${esc(p.phone)} · Country: ${esc(p.country)}`], link: `${APP}/#preq`, button: "Open request" }),
    request_approved: (p) => ({ subject: "Your profile request was approved", lines: [`<b>Your request was approved ✓</b>`, `You can fill in your profile now. It goes public after payment: ${money(p.price, p.currency)} / year.`], link: `${APP}/#pubprofile`, button: "Fill in profile" }),
    request_rejected: (p) => ({ subject: "Your profile request was declined", lines: [`<b>Your request was declined</b>`, p.note ? `Reason: ${esc(p.note)}` : "You can correct the details and send again."], link: `${APP}/#pubprofile`, button: "Send again" }),
    lead_new: (p) => ({ subject: `New sign-up: ${p.name}`, lines: [`<b>New sign-up request</b>`, `Name: ${esc(p.name)}`, `Phone: ${esc(p.phone)}`, p.message ? `Message: ${esc(p.message)}` : ""], link: `${APP}/#pubprofile`, button: "Open requests" }),
    paid: (p) => ({ subject: "Your profile is public", lines: [`<b>Payment received, your profile is public ✓</b>`, `Valid until: ${esc(p.until)}`, `Link: ${APP}/t/${esc(p.slug)}`], link: `${APP}/t/${p.slug}`, button: "View profile" }),
    expiring: (p) => ({ subject: `${p.days} days left on your profile`, lines: [`<b>Your profile expires on ${esc(p.until)}</b>`, `Renewal: ${money(p.price, p.currency)} / year.`], link: `${APP}/#pubprofile`, button: "Renew" }),
    expired: () => ({ subject: "Your profile has expired", lines: [`<b>Your profile has expired</b>`, "It is hidden; your details are kept. It reopens after payment."], link: `${APP}/#pubprofile`, button: "Renew" }),
    test: () => ({ subject: "EdubbaX test notification", lines: ["<b>Test notification ✓</b>", "This channel works."], link: `${APP}/#preq`, button: "Open EdubbaX" }),
  },
  tr: {
    request_new: (p) => ({ subject: "Yeni profil talebi", lines: [`<b>Yeni profil talebi</b>`, `${p.kind === "course" ? "Kurs" : "Öğretmen"}: ${esc(p.name)}`, `Telefon: ${esc(p.phone)} · Ülke: ${esc(p.country)}`], link: `${APP}/#preq`, button: "Talebi aç" }),
    request_approved: (p) => ({ subject: "Profil talebiniz onaylandı", lines: [`<b>Talebiniz onaylandı ✓</b>`, `Profilinizi şimdi doldurabilirsiniz. Ödemeden sonra yayına girer: ${money(p.price, p.currency)} / yıl.`], link: `${APP}/#pubprofile`, button: "Profili doldur" }),
    request_rejected: (p) => ({ subject: "Profil talebiniz reddedildi", lines: [`<b>Talebiniz reddedildi</b>`, p.note ? `Gerekçe: ${esc(p.note)}` : "Bilgileri düzeltip yeniden gönderebilirsiniz."], link: `${APP}/#pubprofile`, button: "Yeniden gönder" }),
    lead_new: (p) => ({ subject: `Yeni kayıt: ${p.name}`, lines: [`<b>Yeni kayıt talebi</b>`, `Ad: ${esc(p.name)}`, `Telefon: ${esc(p.phone)}`, p.message ? `Mesaj: ${esc(p.message)}` : ""], link: `${APP}/#pubprofile`, button: "Taleplere bak" }),
    paid: (p) => ({ subject: "Profiliniz yayında", lines: [`<b>Ödeme alındı, profiliniz yayında ✓</b>`, `Bitiş tarihi: ${esc(p.until)}`, `Bağlantı: ${APP}/t/${esc(p.slug)}`], link: `${APP}/t/${p.slug}`, button: "Profili gör" }),
    expiring: (p) => ({ subject: `Profilin bitmesine ${p.days} gün kaldı`, lines: [`<b>Profiliniz ${esc(p.until)} tarihinde bitiyor</b>`, `Uzatma: ${money(p.price, p.currency)} / yıl.`], link: `${APP}/#pubprofile`, button: "Uzat" }),
    expired: () => ({ subject: "Profilin süresi doldu", lines: [`<b>Profilinizin süresi doldu</b>`, "Profil gizlendi, bilgileriniz silinmedi. Ödemeden sonra yeniden açılır."], link: `${APP}/#pubprofile`, button: "Uzat" }),
    test: () => ({ subject: "EdubbaX test bildirimi", lines: ["<b>Test bildirimi ✓</b>", "Bu kanal çalışıyor."], link: `${APP}/#preq`, button: "EdubbaX'i aç" }),
  },
};
function message(kind: string, lang: string, p: P): Msg | null {
  const set = TX[lang] || TX.az;
  const f = set[kind] || TX.az[kind];
  return f ? f(p || {}) : null;
}

async function sendTelegram(chat: number, m: Msg) {
  if (!TG) throw new Error("telegram_not_configured");
  const text = m.lines.filter(Boolean).join("\n");
  const r = await fetch(`https://api.telegram.org/bot${TG}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: { inline_keyboard: [[{ text: m.button, url: m.link }]] } }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error("telegram_" + r.status + ":" + (await r.text()).slice(0, 160));
}
async function sendEmail(to: string, m: Msg) {
  if (!RESEND) throw new Error("email_not_configured");
  const body = m.lines.filter(Boolean).map((l) => `<p style="margin:0 0 10px">${l}</p>`).join("");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1d1b17">
    <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#b8902f;margin-bottom:18px">edubba<span style="color:#1d1b17">X</span></div>
    ${body}<p style="margin:22px 0"><a href="${m.link}" style="background:#c9a24a;color:#1d1b17;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">${esc(m.button)}</a></p>
    <p style="font-size:12px;color:#7a7366">EdubbaX · <a href="${APP}/#pubprofile" style="color:#7a7366">bildiriş ayarları</a></p></div>`;
  const text = m.lines.filter(Boolean).map((l) => l.replace(/<[^>]+>/g, "")).join("\n") + `\n\n${m.link}`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject: m.subject, html, text }), signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error("email_" + r.status + ":" + (await r.text()).slice(0, 160));
}

async function runJob(id: string, secret: string) {
  const { data: job, error } = await admin.rpc("notify_job", { p_id: id, p_secret: secret });
  if (error || !job) return reply(error ? 500 : 404, { error: error ? "db" : "not_found" });
  const m = message(job.kind, job.lang, job.payload);
  if (!m) { await admin.rpc("notify_done", { p_id: id, p_secret: secret, p_email: false, p_tg: false, p_error: null }); return reply(200, { skipped: true }); }
  const errs: string[] = []; let okE = false, okT = false;
  if (job.tg_on && job.tg_chat_id && !job.sent_tg) { try { await sendTelegram(job.tg_chat_id, m); okT = true; } catch (e) { errs.push(String(e instanceof Error ? e.message : e)); } }
  if (job.email_on && job.email && !job.sent_email) { try { await sendEmail(job.email, m); okE = true; } catch (e) { errs.push(String(e instanceof Error ? e.message : e)); } }
  // "not configured" is not worth retrying
  const real = errs.filter((e) => !/not_configured/.test(e));
  const note = real.length ? real.join(" | ") : errs.length ? "skip: " + errs.join(" | ") : (!job.tg_chat_id || !job.tg_on) && !(job.email_on && job.email) ? "skip: no_channel" : null;
  await admin.rpc("notify_done", { p_id: id, p_secret: secret, p_email: okE, p_tg: okT, p_error: note });
  return reply(200, { email: okE, telegram: okT, errors: errs });
}

async function adminAction(req: Request, action: string) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return reply(401, { error: "auth" });
  const user = createClient(SB_URL, Deno.env.get("SUPABASE_ANON_KEY") || req.headers.get("apikey") || "", { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u } = await user.auth.getUser(auth.slice(7));
  if (!u?.user) return reply(401, { error: "auth" });
  const { data: isAdmin } = await user.rpc("is_profile_admin");
  if (!isAdmin) return reply(403, { error: "forbidden" });
  const { data: secret } = await admin.rpc("notify_secret");
  const out: Record<string, unknown> = { telegram: { configured: !!TG }, email: { configured: !!RESEND, from: FROM } };
  if (action === "setup" && TG) {
    const me = await fetch(`https://api.telegram.org/bot${TG}/getMe`).then((r) => r.json()).catch(() => null);
    if (!me?.ok) return reply(200, { ...out, telegram: { configured: true, ok: false, error: "bad_token" } });
    const hook = await fetch(`https://api.telegram.org/bot${TG}/setWebhook`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `${SB_URL}/functions/v1/telegram-bot`, secret_token: secret, allowed_updates: ["message"], drop_pending_updates: true }),
    }).then((r) => r.json()).catch(() => null);
    await admin.rpc("notify_config_set", { p_secret: secret, p_key: "tg_bot", p_value: me.result.username });
    out.telegram = { configured: true, ok: !!hook?.ok, bot: me.result.username };
  }
  if (action === "test") {
    const { data: ns } = await admin.from("notify_settings").select("*").eq("owner_id", u.user.id).maybeSingle();
    const m = message("test", ns?.lang || "az", {})!;
    const res: Record<string, string> = {};
    if (ns?.tg_chat_id) { try { await sendTelegram(ns.tg_chat_id, m); res.telegram = "ok"; } catch (e) { res.telegram = String(e instanceof Error ? e.message : e); } } else res.telegram = "not_linked";
    const to = ns?.email || u.user.email;
    if (to) { try { await sendEmail(to, m); res.email = "ok"; } catch (e) { res.email = String(e instanceof Error ? e.message : e); } }
    out.test = res;
  }
  return reply(200, out);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply(405, { error: "method" });
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return reply(400, { error: "bad_json" }); }
  try {
    if (typeof body.id === "string" && typeof body.secret === "string") return await runJob(body.id, body.secret);
    if (typeof body.action === "string" && ["setup", "test", "status"].includes(body.action)) return await adminAction(req, body.action);
    return reply(400, { error: "bad_request" });
  } catch (e) {
    console.error("notify", e);
    return reply(500, { error: "server" });
  }
});
