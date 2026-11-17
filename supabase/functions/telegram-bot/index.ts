// EdubbaX Telegram bot webhook. Telegram calls this URL for every message to the bot.
// /start <token>  -> links the chat to the EdubbaX account that created the token (app: Açıq profil → Bildirişlər).
// /stop           -> unlinks the chat.
// The webhook is registered by the "setup" action of the notify function with secret_token = the shared secret,
// and Telegram sends it back in X-Telegram-Bot-Api-Secret-Token, which is checked here.
// Deploy with verify_jwt = false.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
const TG = (Deno.env.get("TELEGRAM_BOT_TOKEN") || "").trim();
let secretCache = "";

const T: Record<string, Record<string, string>> = {
  az: { ok: "✓ Bağlandı. EdubbaX bildirişləri bu çata gələcək: yeni qeydiyyatlar, istəyin nəticəsi, ödəniş və müddət xatırlatmaları.\n\nDayandırmaq üçün /stop yazın.", bad: "Bu link köhnədir və ya artıq istifadə olunub. EdubbaX-də «Açıq profil → Bildirişlər → Telegram-ı qoş» düyməsini yenidən basın.", stop: "Bildirişlər dayandırıldı. Yenidən qoşmaq üçün EdubbaX-də «Telegram-ı qoş» düyməsini basın.", help: "Salam! Bu, EdubbaX bildiriş botudur. Qoşulmaq üçün EdubbaX-də «Açıq profil → Bildirişlər → Telegram-ı qoş» düyməsini basın." },
  en: { ok: "✓ Connected. EdubbaX notifications will come to this chat: new sign-ups, request decisions, payment and renewal reminders.\n\nSend /stop to turn them off.", bad: "This link has expired or was already used. In EdubbaX open “Public profile → Notifications → Connect Telegram” again.", stop: "Notifications stopped. To reconnect, press “Connect Telegram” in EdubbaX.", help: "Hello! This is the EdubbaX notification bot. To connect, press “Public profile → Notifications → Connect Telegram” in EdubbaX." },
  tr: { ok: "✓ Bağlandı. EdubbaX bildirimleri bu sohbete gelecek: yeni kayıtlar, talep sonuçları, ödeme ve süre hatırlatmaları.\n\nDurdurmak için /stop yazın.", bad: "Bu bağlantının süresi dolmuş veya kullanılmış. EdubbaX'te «Açık profil → Bildirimler → Telegram'ı bağla» düğmesine yeniden basın.", stop: "Bildirimler durduruldu. Yeniden bağlamak için EdubbaX'te «Telegram'ı bağla» düğmesine basın.", help: "Merhaba! Bu, EdubbaX bildirim botudur. Bağlanmak için EdubbaX'te «Açık profil → Bildirimler → Telegram'ı bağla» düğmesine basın." },
};
async function say(chat: number, text: string) {
  await fetch(`https://api.telegram.org/bot${TG}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chat, text }) }).catch(() => {});
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  if (!secretCache) { const { data } = await admin.rpc("notify_secret"); secretCache = data || ""; }
  if (!secretCache || req.headers.get("X-Telegram-Bot-Api-Secret-Token") !== secretCache) return new Response("forbidden", { status: 403 });
  let u: Record<string, any> = {};
  try { u = await req.json(); } catch { return new Response("ok"); }
  const msg = u.message;
  if (!msg || !msg.chat || msg.chat.type !== "private" || typeof msg.text !== "string") return new Response("ok");
  const chat = msg.chat.id as number;
  const ulang = String(msg.from?.language_code || "az").slice(0, 2);
  const text = msg.text.trim();
  try {
    if (text.startsWith("/start")) {
      const token = text.split(/\s+/)[1] || "";
      if (!/^[a-f0-9]{16,64}$/.test(token)) { await say(chat, (T[ulang] || T.az).help); return new Response("ok"); }
      const { data: lang } = await admin.rpc("notify_tg_bind", { p_secret: secretCache, p_token: token, p_chat: chat, p_username: msg.from?.username || "" });
      await say(chat, (T[lang || ulang] || T.az)[lang ? "ok" : "bad"]);
    } else if (text.startsWith("/stop")) {
      await admin.rpc("notify_tg_stop", { p_secret: secretCache, p_chat: chat });
      await say(chat, (T[ulang] || T.az).stop);
    } else {
      await say(chat, (T[ulang] || T.az).help);
    }
  } catch (e) { console.error("tg", e); }
  return new Response("ok");
});
