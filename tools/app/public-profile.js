/* ---- public-profile.js ---- */
/* =========================================================================
   Açıq profil (public teacher / course profile) + admin review of requests.
   Flow: verification request -> admin approves -> owner fills profile ->
   yearly payment (manual for now, payment gateway later) -> public at /t/<slug>.
   Server-side rules live in Supabase RPCs (profile_* functions); the browser
   never writes the profile tables directly.
   ========================================================================= */
const PP_PRICE = { teacher: 9.99, course: 59.99 };
const PP_SITE = "https://edubbax.vercel.app";
const PP_MAIL = "edubbax@gmail.com";
const PP_COUNTRIES = ["AZ", "TR", "GE", "RU", "KZ", "UZ", "KG", "TM", "UA", "AE", "SA", "QA", "IQ", "IR", "DE", "GB", "US", "XX"];
const PP_ACCENTS = ["#c9a24a", "#2f6fb2", "#1e8a5a", "#b23a48", "#6b4bb8", "#1f2937"];

function ppMoney(a, cur) { const v = Number(a || 0).toFixed(2); return cur === "USD" ? `$${v}` : `${v} AZN`; }
function ppPrice(kind, country) { return ppMoney(PP_PRICE[kind] || PP_PRICE.teacher, (country || "AZ") === "AZ" ? "AZN" : "USD"); }
function ppUrl(slug) { return `${PP_SITE}/t/${slug}`; }
function ppImg(path) { const u = (window.EDUBBAX_CONFIG || {}).supabaseUrl; return path && u ? `${u}/storage/v1/object/public/profile-media/${String(path).split("/").map(encodeURIComponent).join("/")}` : ""; }
function ppToday() { return new Date().toISOString().slice(0, 10); }
function ppStatus(p) { if (!p) return null; if (p.status === "active" && p.plan_until && p.plan_until < ppToday()) return "expired"; return p.status; }
function ppCountryName(c) { if (c === "XX") return t("pp.otherCountry"); try { return new Intl.DisplayNames([locale()], { type: "region" }).of(c) || c; } catch (e) { return c; } }
function ppDay(iso) { return iso ? fmtDay(Date.parse(iso)) : "—"; }
function ppHandle(v) { let s = String(v || "").trim(); const m = /^(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|t\.me|telegram\.me|tiktok\.com)\/@?([^/?#]+)/i.exec(s); if (m) s = m[1]; return s.replace(/^@/, ""); }

TEACHER_ROUTES.push("pubprofile", "preq");
S.pp = { loaded: false, loading: false, profile: null, requests: [], leads: [], payments: [], admin: null, pending: 0, adminReqs: null, adminProfiles: null, draft: null, req: null, tab: "pending", polled: false };

/* ---------- backend (cloud only) ---------- */
Object.assign(SupabaseBackend.prototype, {
  async ppState() {
    await this._uid();
    const [p, r, l, m] = await Promise.all([
      this.sb.from("profiles").select("*").maybeSingle(),
      this.sb.from("profile_requests").select("*").order("created_at", { ascending: false }).limit(5),
      this.sb.from("profile_leads").select("*").order("created_at", { ascending: false }).limit(200),
      this.sb.from("profile_payments").select("*").order("paid_at", { ascending: false }).limit(20),
    ]);
    return { profile: this._chk(p), requests: this._chk(r) || [], leads: this._chk(l) || [], payments: this._chk(m) || [] };
  },
  async ppRequest(p) { return this._rpc("profile_request_submit", { p }); },
  async ppSave(p) { return this._rpc("profile_save", { p }); },
  async ppUpload(blob) {
    const uid = await this._uid();
    const path = `${uid}/${Date.now().toString(36)}.jpg`;
    const { error } = await this.sb.storage.from("profile-media").upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) throw new AppError("upload", error.message);
    return path;
  },
  async ppRemoveFile(path) { if (!path) return; try { await this.sb.storage.from("profile-media").remove([path]); } catch (e) { console.warn(e); } },
  async ppLeadSeen(id, seen) { this._chk(await this.sb.from("profile_leads").update({ seen }).eq("id", id)); },
  async ppLeadDelete(id) { this._chk(await this.sb.from("profile_leads").delete().eq("id", id)); },
  async ppIsAdmin() { return !!(await this._rpc("is_profile_admin", {})); },
  async ppAdminRequests() { return (await this._rpc("profile_admin_requests", {})) || []; },
  async ppAdminProfiles() { return (await this._rpc("profile_admin_profiles", {})) || []; },
  async ppAdminDecide(id, approve, note) { return this._rpc("profile_admin_decide", { p_id: id, p_approve: approve, p_note: note || null }); },
  async ppAdminSet(id, action, ref) { return this._rpc("profile_admin_set", { p_profile: id, p_action: action, p_ref: ref || null }); },
});

/* ---------- loading ---------- */
function ppDraftFrom(p) {
  p = p || {};
  const c = p.contacts || {};
  const keys = ["phone", "whatsapp", "email", "website", "instagram", "facebook", "youtube", "telegram", "tiktok"];
  return {
    display_name: p.display_name || "", headline: p.headline || "", slug: p.slug || "", city: p.city || "",
    bio: p.bio || "", experience: p.experience || "", education: p.education || "", subjects: (p.subjects || []).join(", "),
    price_note: p.price_note || "", groups: (p.groups || []).map(x => ({ ...x })), branches: (p.branches || []).map(x => ({ ...x })), team: (p.team || []).map(x => ({ ...x })),
    contacts: Object.fromEntries(keys.map(k => [k, c[k] || ""])), accent: p.accent || PP_ACCENTS[0],
    published: p.published !== false, consent: !!p.consent, image_path: p.image_path || "",
  };
}
async function ppLoad(force) {
  if (!api || api.mode !== "cloud") { S.pp.loaded = true; return; }
  if (!S.teacher || S.pp.loading) return;
  S.pp.loading = true;
  try {
    const st = await api.ppState();
    Object.assign(S.pp, st);
    if (!S.pp.draft || force) S.pp.draft = ppDraftFrom(st.profile);
    if (S.pp.admin == null) S.pp.admin = await api.ppIsAdmin().catch(() => false);
    if (S.pp.admin && S.route === "preq") {
      const [r, p] = await Promise.all([api.ppAdminRequests(), api.ppAdminProfiles()]);
      S.pp.adminReqs = r; S.pp.adminProfiles = p; S.pp.pending = r.filter(x => x.status === "pending").length;
    }
  } catch (e) { console.error(e); if (S.pp.adminReqs == null) S.pp.adminReqs = []; if (S.pp.adminProfiles == null) S.pp.adminProfiles = []; }
  S.pp.loading = false; S.pp.loaded = true;
  render(true);
}
/* Admin notification: badge in the menu and a toast when a new request arrives. */
async function ppPoll() {
  if (!api || api.mode !== "cloud" || !S.teacher || document.hidden) return;
  try {
    if (S.pp.adminFor !== S.teacher.id) { S.pp.admin = await api.ppIsAdmin(); S.pp.adminFor = S.teacher.id; S.pp.polled = false; render(true); }
    if (!S.pp.admin) return;
    const reqs = await api.ppAdminRequests();
    const n = reqs.filter(x => x.status === "pending").length, prev = S.pp.pending;
    S.pp.pending = n;
    if (S.route === "preq" && !S.pp.loading) S.pp.adminReqs = reqs;
    if (n > 0 && (!S.pp.polled || n > prev)) toast(t("preq.newToast", { n }));
    S.pp.polled = true;
    if (n !== prev) render(true);
  } catch (e) { console.warn("pp poll", e); }
}
setTimeout(ppPoll, 4000);
setInterval(ppPoll, 60000);

function ppErr(e) {
  const c = e && e.code;
  const k = "pp.e_" + c;
  const s = t(k);
  return s !== k ? s : errText(e);
}

/* ---------- owner views ---------- */
function ppHead() { return pageHead(tx("pp.title"), tx("pp.lead")); }
function pubProfileView() {
  if (api.mode !== "cloud") return `${ppHead()}<div class="panel notice">${I("eye")}<div><b>${tx("pp.cloudOnly")}</b><p class="small muted">${tx("pp.cloudOnlyText")}</p></div></div>${ppIntro()}`;
  if (!S.pp.loaded) { ppLoad(); return loadingView(); }
  const P = S.pp.profile, last = S.pp.requests[0];
  if (!P) {
    if (last && last.status === "pending") return ppHead() + ppPendingCard(last) + ppIntro();
    return ppHead() + (last && last.status === "rejected" ? ppRejectedCard(last) : "") + `<div class="grid-2 pp-top">${ppRequestForm()}${ppIntro()}</div>`;
  }
  return ppHead() + ppStatusCard(P) + ppEditor(P) + ppLeadsPanel();
}
function ppIntro() {
  return `<div class="panel pp-intro"><h3>${I("eye")}${tx("pp.introTitle")}</h3>
    <p class="small">${tx("pp.free")}</p>
    <ol class="pp-steps"><li>${tx("pp.step1")}</li><li>${tx("pp.step2")}</li><li>${tx("pp.step3")}</li><li>${tx("pp.step4")}</li></ol>
    <div class="pp-prices">
      <div><b>${tx("pp.kind_teacher")}</b><span>${esc(ppPrice("teacher", "AZ"))} / ${tx("pp.year")}</span><small class="muted">${tx("pp.abroad", { p: ppPrice("teacher", "US") })}</small></div>
      <div><b>${tx("pp.kind_course")}</b><span>${esc(ppPrice("course", "AZ"))} / ${tx("pp.year")}</span><small class="muted">${tx("pp.abroad", { p: ppPrice("course", "US") })}</small></div>
    </div>
    <p class="small muted">${tx("pp.whyCheck")}</p></div>`;
}
function ppRequestForm() {
  const R = S.pp.req || (S.pp.req = { kind: "teacher", country: "AZ", full_name: S.teacher.name || "", org_name: "", voen: "", phone: "", contact_email: S.teacher.email || "", link: "", note: "", agree: false });
  const course = R.kind === "course";
  return `<form id="pp-req-form" class="panel form" novalidate>
    <h3>${I("id")}${tx("pp.reqTitle")}</h3><p class="small muted">${tx("pp.reqText")}</p>
    <fieldset class="fld"><legend>${tx("pp.kind")}</legend><div class="check-grid">
      ${["teacher", "course"].map(k => `<label class="check"><input type="radio" name="pp-kind" data-ppr="kind" value="${k}" ${R.kind === k ? "checked" : ""}><span><b>${tx("pp.kind_" + k)}</b><small>${tx("pp.kind_" + k + "_t")} · ${esc(ppPrice(k, R.country))} / ${tx("pp.year")}</small></span></label>`).join("")}
    </div></fieldset>
    <div class="row-2">
      <label class="fld"><span>${tx("pp.fullName")}</span><input data-ppr="full_name" value="${esc(R.full_name)}" maxlength="120" autocomplete="name"></label>
      <label class="fld"><span>${tx("pp.country")}</span><select data-ppr="country">${PP_COUNTRIES.map(c => `<option value="${c}" ${R.country === c ? "selected" : ""}>${esc(ppCountryName(c))}</option>`).join("")}</select></label>
    </div>
    ${course ? `<div class="row-2">
      <label class="fld"><span>${tx("pp.orgName")}</span><input data-ppr="org_name" value="${esc(R.org_name)}" maxlength="160"></label>
      <label class="fld"><span>${tx(R.country === "AZ" ? "pp.voen" : "pp.taxId")}</span><input data-ppr="voen" value="${esc(R.voen)}" maxlength="20" ${R.country === "AZ" ? 'inputmode="numeric"' : ""}></label>
    </div>` : ""}
    <div class="row-2">
      <label class="fld"><span>${tx("pp.phone")}</span><input data-ppr="phone" type="tel" value="${esc(R.phone)}" maxlength="30" placeholder="+994 50 000 00 00" autocomplete="tel"></label>
      <label class="fld"><span>${tx("pp.email")}</span><input data-ppr="contact_email" type="email" value="${esc(R.contact_email)}" maxlength="120"></label>
    </div>
    <label class="fld"><span>${tx("pp.link")}</span><input data-ppr="link" type="url" value="${esc(R.link)}" maxlength="300" placeholder="https://instagram.com/..."><small>${tx("pp.linkHint")}</small></label>
    <label class="fld"><span>${tx(course ? "pp.noteCourse" : "pp.noteTeacher")}</span><textarea data-ppr="note" rows="4" maxlength="1500">${esc(R.note)}</textarea><small>${tx("pp.noteHint")}</small></label>
    <label class="check"><input type="checkbox" data-ppr="agree" ${R.agree ? "checked" : ""}><span>${tx("pp.agree")}</span></label>
    <p class="form-err" id="pp-req-err" role="alert"></p>
    <div><button class="btn gold" type="submit">${I("send")}${tx("pp.send")}</button></div>
  </form>`;
}
function ppPendingCard(r) {
  return `<div class="panel notice pp-state">${I("clock")}<div><b>${tx("pp.pendingTitle")}</b><p class="small muted">${tx("pp.pendingText")}</p>
    <p class="small">${tx("pp.kind_" + r.kind)} · ${esc(r.org_name || r.full_name)} · ${esc(fmtDate(Date.parse(r.created_at)))}</p></div>${pill("warn", tx("preq.st_pending"))}</div>`;
}
function ppRejectedCard(r) {
  return `<div class="panel notice pp-state">${I("x")}<div><b>${tx("pp.rejectedTitle")}</b><p class="small">${r.admin_note ? esc(r.admin_note) : tx("pp.rejectedNoReason")}</p></div></div>`;
}
function ppStatusCard(P) {
  const st = ppStatus(P), price = ppMoney(P.price_amount, P.price_currency);
  const tone = { active: "ok", awaiting_payment: "warn", expired: "bad", suspended: "bad" }[st] || "info";
  const mail = (subj) => `mailto:${PP_MAIL}?subject=${encodeURIComponent(subj + ": " + P.slug)}`;
  let body = "";
  if (st === "awaiting_payment") body = `<p><b>${tx("pp.payTitle")}</b></p><p class="small">${tx("pp.payText", { price })}</p>
    <p class="small muted">${tx("pp.paySoon")}</p><div class="row gap-s wrap-row"><a class="btn gold sm" href="${mail("Açıq profil ödənişi")}">${I("mail")}${tx("pp.payMail")}</a>${pill("info", tx("pp.payOnline"))}</div>`;
  else if (st === "active") {
    const left = Math.ceil((Date.parse(P.plan_until) - Date.now()) / 86400000);
    body = `<p class="small">${tx("pp.activeText", { date: ppDay(P.plan_until) })}</p>
      ${left <= 30 ? `<p class="small" style="color:var(--warn)">${tx("pp.renewSoon", { n: Math.max(0, left) })} <a href="${mail("Açıq profil uzadılması")}">${tx("pp.payMail")}</a></p>` : ""}
      <div class="row gap-s wrap-row">${codeChip(ppUrl(P.slug))}<a class="btn outline sm" href="${esc(ppUrl(P.slug))}" target="_blank" rel="noopener">${I("eye")}${tx("pp.open")}</a></div>`;
  } else if (st === "expired") body = `<p class="small">${tx("pp.expiredText")}</p><a class="btn gold sm" href="${mail("Açıq profil uzadılması")}">${I("mail")}${tx("pp.payMail")}</a>`;
  else body = `<p class="small">${tx("pp.suspendedText")}</p><a class="btn outline sm" href="${mail("Açıq profil")}">${I("mail")}${PP_MAIL}</a>`;
  const hidden = !P.consent ? tx("pp.hiddenConsent") : !P.published ? tx("pp.hiddenOff") : "";
  return `<div class="panel pp-state"><div class="panel-h"><h3>${I("eye")}${esc(P.display_name)}</h3><div class="row gap-s">${P.verified ? pill("ok", I("check") + tx("pp.verified")) : ""}${pill(tone, tx("pp.st_" + st))}</div></div>
    ${body}${hidden ? `<p class="small" style="color:var(--warn);margin-top:10px">${hidden}</p>` : ""}
    <p class="small muted" style="margin-top:10px">${tx("pp.kind_" + P.kind)} · ${esc(price)} / ${tx("pp.year")}</p></div>`;
}
function ppRepeater(list, fields, max, addKey) {
  const d = S.pp.draft, rows = d[list] || [];
  return `<div class="pp-rep">${rows.map((r, i) => `<div class="pp-rep-row" style="--cols:${fields.length}">
      ${fields.map(([k, lbl, ml, ph]) => `<label class="fld"><span>${tx(lbl)}</span><input data-pp="${list}.${i}.${k}" value="${esc(r[k] || "")}" maxlength="${ml}" ${ph ? `placeholder="${esc(ph)}"` : ""}></label>`).join("")}
      <button type="button" class="icon-btn sm" data-action="pp-row-del" data-list="${list}" data-i="${i}" aria-label="${tx("pp.removeImg")}">${I("trash")}</button></div>`).join("")}
    ${rows.length < max ? `<button type="button" class="btn outline sm" data-action="pp-row-add" data-list="${list}">${I("plus")}${tx(addKey)}</button>` : ""}</div>`;
}
function ppEditor(P) {
  const d = S.pp.draft, course = P.kind === "course", img = ppImg(d.image_path);
  const f = (key, lbl, ml, extra = "") => `<label class="fld"><span>${tx(lbl)}</span><input data-pp="${key}" value="${esc(key.split(".").reduce((o, k) => o[k], d) || "")}" maxlength="${ml}" ${extra}></label>`;
  const ta = (key, lbl, ml, rows = 4, hint = "", ph = "") => `<label class="fld"><span>${tx(lbl)}</span><textarea data-pp="${key}" rows="${rows}" maxlength="${ml}" ${ph ? `placeholder="${esc(ph)}"` : ""}>${esc(d[key] || "")}</textarea>${hint ? `<small>${hint}</small>` : ""}</label>`;
  return `<form id="pp-form" class="pp-form" novalidate>
  <div class="grid-2">
    <div class="panel form"><h3>${I("user")}${tx("pp.secMain")}</h3>
      <div class="pp-img-row">
        <div class="pp-img ${course ? "sq" : ""}" style="--acc:${esc(d.accent)}">${img ? `<img src="${esc(img)}" alt="">` : `<span>${esc(initials(d.display_name || "?"))}</span>`}</div>
        <div class="stack" style="gap:8px"><b class="small">${tx(course ? "pp.logo" : "pp.photo")}</b>
          <div class="row gap-s wrap-row"><label class="btn outline sm">${I("plus")}${tx("pp.upload")}<input type="file" accept="image/jpeg,image/png,image/webp" data-action="pp-image" hidden></label>
          ${d.image_path ? `<button type="button" class="btn ghost sm danger" data-action="pp-img-del">${I("trash")}${tx("pp.removeImg")}</button>` : ""}</div>
          <small class="muted">${tx("pp.imgHint")}</small></div>
      </div>
      ${f("display_name", "pp.displayName", 160)}
      ${f("headline", "pp.headline", 160, `placeholder="${tx(course ? "pp.headlinePhC" : "pp.headlinePh")}"`)}
      <label class="fld"><span>${tx("pp.slug")}</span><div class="pp-url"><span>edubbax.vercel.app/t/</span><input data-pp="slug" value="${esc(d.slug)}" maxlength="40" pattern="[a-z0-9-]{3,40}" autocapitalize="off" spellcheck="false"></div><small>${tx("pp.slugHint")}</small></label>
      <div class="row-2">${f("city", "pp.city", 80)}${f("subjects", "pp.subjects", 400, `placeholder="${tx("pp.subjectsHint")}"`)}</div>
    </div>
    <div class="panel form"><h3>${I("pen")}${tx("pp.secAbout")}</h3>
      ${ta("bio", course ? "pp.bioCourse" : "pp.bio", 3000, 5)}
      ${ta("experience", course ? "pp.expCourse" : "pp.experience", 1500, 3, tx("pp.claimsNote"))}
      ${ta("education", course ? "pp.eduCourse" : "pp.education", 1500, 3)}
    </div>
  </div>
  <div class="panel form"><h3>${I("calendar")}${tx("pp.secGroups")}</h3>
    ${ta("price_note", "pp.priceNote", 800, 2, "", t("pp.priceNotePh"))}
    ${ppRepeater("groups", [["name", "pp.gName", 80, "9-cu sinif"], ["schedule", "pp.gSchedule", 120, "B.e, Ç.a 18:00"], ["price", "pp.gPrice", 60, "80 AZN / ay"], ["note", "pp.gNote", 200, ""]], 12, "pp.addGroup")}
  </div>
  ${course ? `<div class="grid-2">
    <div class="panel form"><h3>${I("globe")}${tx("pp.secBranches")}</h3>${ppRepeater("branches", [["name", "pp.bName", 80, ""], ["address", "pp.bAddress", 160, ""], ["phone", "pp.bPhone", 30, ""]], 10, "pp.addBranch")}</div>
    <div class="panel form"><h3>${I("users")}${tx("pp.secTeam")}</h3>${ppRepeater("team", [["name", "pp.tName", 80, ""], ["subject", "pp.tSubject", 80, ""]], 30, "pp.addTeam")}</div>
  </div>` : ""}
  <div class="grid-2">
    <div class="panel form"><h3>${I("chat")}${tx("pp.secContacts")}</h3>
      <div class="row-2">${f("contacts.phone", "pp.phone", 30, 'type="tel" placeholder="+994 50 000 00 00"')}${f("contacts.whatsapp", "pp.whatsapp", 30, 'type="tel" placeholder="+994 50 000 00 00"')}</div>
      <div class="row-2">${f("contacts.email", "pp.email", 120, 'type="email"')}${f("contacts.website", "pp.website", 200, 'type="url" placeholder="https://"')}</div>
      <div class="row-2">${f("contacts.instagram", "pp.instagram", 60, `placeholder="${tx("pp.handleHint")}"`)}${f("contacts.facebook", "pp.facebook", 200, 'type="url" placeholder="https://facebook.com/..."')}</div>
      <div class="row-2">${f("contacts.youtube", "pp.youtube", 200, 'type="url" placeholder="https://youtube.com/@..."')}${f("contacts.telegram", "pp.telegram", 60, `placeholder="${tx("pp.handleHint")}"`)}</div>
      ${f("contacts.tiktok", "pp.tiktok", 60, `placeholder="${tx("pp.handleHint")}"`)}
    </div>
    <div class="panel form"><h3>${I("sun")}${tx("pp.secLook")}</h3>
      <fieldset class="fld"><legend>${tx("pp.accent")}</legend><div class="pp-sw">${PP_ACCENTS.map(c => `<label style="--c:${c}"><input type="radio" name="pp-acc" data-pp="accent" value="${c}" ${d.accent.toLowerCase() === c ? "checked" : ""}><i></i></label>`).join("")}
        <label class="pp-sw-c"><input type="color" data-pp="accent" value="${esc(d.accent)}" aria-label="${tx("pp.accent")}"></label></div></fieldset>
      <label class="check"><input type="checkbox" data-pp="published" ${d.published ? "checked" : ""}><span><b>${tx("pp.published")}</b><small>${tx("pp.publishedHint")}</small></span></label>
      <label class="check"><input type="checkbox" data-pp="consent" ${d.consent ? "checked" : ""}><span>${tx("pp.consent")}</span></label>
      <p class="small muted">${tx("pp.noStudents")}</p>
    </div>
  </div>
  <div class="pp-save"><p class="form-err" id="pp-err" role="alert"></p><button class="btn gold" type="submit">${I("check")}${tx("pp.save")}</button></div>
  </form>`;
}
function ppLeadsPanel() {
  const L = S.pp.leads || [];
  const wa = (p) => `https://wa.me/${String(p).replace(/\D/g, "")}`;
  return `<div class="panel"><div class="panel-h"><h3>${I("mail")}${tx("pp.leads")}</h3><span class="muted small">${num(L.filter(l => !l.seen).length)} ${tx("pp.leadNew").toLowerCase()} · ${num(L.length)}</span></div>
    ${L.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${tx("common.name")}</th><th>${tx("pp.phone")}</th><th>${tx("pp.message")}</th><th>${tx("common.date")}</th><th></th></tr></thead><tbody>
    ${L.map(l => `<tr class="${l.seen ? "" : "pp-new"}"><td><b>${esc(l.name)}</b>${l.seen ? "" : ` ${pill("warn", tx("pp.leadNew"))}`}</td>
      <td><a href="tel:${esc(l.phone.replace(/[^0-9+]/g, ""))}">${esc(l.phone)}</a> · <a href="${esc(wa(l.phone))}" target="_blank" rel="noopener">WhatsApp</a></td>
      <td class="pp-msg">${esc(l.message || "—")}</td><td class="muted small">${esc(fmtDate(Date.parse(l.created_at)))}</td>
      <td class="act">${l.seen ? "" : `<button class="btn ghost sm" data-action="pp-lead-seen" data-id="${l.id}">${I("check")}${tx("pp.markSeen")}</button>`}${confirmBtn("pl-" + l.id, "pp-lead-del", `data-id="${l.id}"`, I("trash"), "icon-btn sm")}</td></tr>`).join("")}
    </tbody></table></div>` : `<p class="small muted">${tx("pp.leadsEmpty")}</p>`}
    ${(S.pp.payments || []).length ? `<h3 style="margin-top:18px">${tx("pp.payments")}</h3><div class="tbl-wrap"><table class="tbl"><tbody>${S.pp.payments.map(p => `<tr><td>${esc(ppDay(p.paid_at))}</td><td class="num">${esc(ppMoney(p.amount, p.currency))}</td><td class="muted small">${tx("preq.until")}: ${esc(ppDay(p.valid_until))}</td></tr>`).join("")}</tbody></table></div>` : ""}
  </div>`;
}

/* ---------- admin view ---------- */
function preqView() {
  const head = pageHead(tx("preq.title"), tx("preq.lead"));
  if (api.mode !== "cloud") return head + `<div class="panel notice">${I("eye")}<div><b>${tx("pp.cloudOnly")}</b></div></div>`;
  if (!S.pp.loaded || (S.pp.admin && S.pp.adminReqs == null)) { ppLoad(); return loadingView(); }
  if (!S.pp.admin) return head + `<div class="panel notice">${I("x")}<div><b>${tx("preq.noAccess")}</b></div></div>`;
  const R = S.pp.adminReqs || [], PR = S.pp.adminProfiles || [], tab = S.pp.tab;
  const pending = R.filter(r => r.status === "pending");
  const tabs = `<div class="tabs-row"><div class="tabs" role="tablist">${[["pending", pending.length], ["all", R.length], ["profiles", PR.length]].map(([k, n]) => `<button role="tab" class="tab ${tab === k ? "on" : ""}" data-action="pp-tab" data-k="${k}">${tx("preq.tab_" + k)}<span class="tab-n">${num(n)}</span></button>`).join("")}</div>
    <button class="btn ghost sm" data-action="pp-refresh">${I("refresh")}${tx("preq.refresh")}</button></div>`;
  let body;
  if (tab === "profiles") body = PR.length ? `<div class="panel"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${tx("common.name")}</th><th>${tx("common.type")}</th><th>${tx("preq.status")}</th><th>${tx("preq.until")}</th><th class="num">${tx("preq.price")}</th><th>${tx("preq.owner")}</th><th></th></tr></thead><tbody>
    ${PR.map(p => { const st = ppStatus(p); return `<tr><td><b>${esc(p.display_name)}</b><div class="muted small"><a href="${esc(ppUrl(p.slug))}" target="_blank" rel="noopener">/t/${esc(p.slug)}</a></div></td>
      <td>${tx("pp.kind_" + p.kind)}<div class="muted small">${esc(ppCountryName(p.country))}</div></td>
      <td>${pill({ active: "ok", awaiting_payment: "warn" }[st] || "bad", tx("pp.st_" + st))}${p.published ? "" : `<div class="muted small">${tx("pp.hiddenShort")}</div>`}</td>
      <td>${esc(ppDay(p.plan_until))}</td><td class="num">${esc(ppMoney(p.price_amount, p.price_currency))}</td><td class="small">${esc(p.owner_email || "")}</td>
      <td class="act"><div class="row gap-s" style="justify-content:flex-end;flex-wrap:wrap"><input id="pq-ref-${p.id}" class="pp-ref" placeholder="${tx("preq.refPh")}" maxlength="120">
        ${confirmBtn("pqp-" + p.id, "pq-paid", `data-id="${p.id}"`, I("check") + tx("preq.paid"), "btn gold sm")}
        ${st === "suspended" ? `<button class="btn outline sm" data-action="pq-restore" data-id="${p.id}">${tx("preq.restore")}</button>` : confirmBtn("pqs-" + p.id, "pq-suspend", `data-id="${p.id}"`, tx("preq.suspend"), "btn ghost sm danger")}</div></td></tr>`; }).join("")}
    </tbody></table></div></div>` : empty("users", tx("preq.noProfiles"), "");
  else {
    const list = tab === "pending" ? pending : R;
    body = list.length ? list.map(preqCard).join("") : empty("check", tx("preq.none"), "");
  }
  return head + tabs + `<div class="stack" style="margin-top:14px">${body}</div>`;
}
function preqCard(r) {
  const tone = { pending: "warn", approved: "ok", rejected: "bad" }[r.status];
  const link = safeUrl(r.link || "");
  const row = (k, v) => v ? `<div><dt>${k}</dt><dd>${v}</dd></div>` : "";
  return `<div class="panel"><div class="panel-h"><h3>${I(r.kind === "course" ? "globe" : "user")}${esc(r.org_name || r.full_name)}</h3><div class="row gap-s">${pill("info", tx("pp.kind_" + r.kind))}${pill(tone, tx("preq.st_" + r.status))}</div></div>
    <dl class="pp-dl">
      ${row(tx("pp.fullName"), esc(r.full_name))}${row(tx("pp.orgName"), esc(r.org_name || ""))}${row(tx(r.country === "AZ" ? "pp.voen" : "pp.taxId"), r.voen ? `<span class="mono">${esc(r.voen)}</span>` : "")}
      ${row(tx("pp.country"), esc(ppCountryName(r.country)))}${row(tx("pp.phone"), `<a href="tel:${esc(String(r.phone).replace(/[^0-9+]/g, ""))}">${esc(r.phone)}</a>`)}
      ${row(tx("pp.email"), esc(r.contact_email || ""))}${row(tx("preq.account"), esc(r.owner_email || ""))}
      ${row(tx("pp.link"), link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer nofollow">${esc(r.link)}</a>` : "")}
      ${row(tx("preq.sent"), esc(fmtDate(Date.parse(r.created_at))))}${r.decided_at ? row(tx("preq.decided"), esc(fmtDate(Date.parse(r.decided_at)))) : ""}
    </dl>
    <p class="pp-note">${esc(r.note)}</p>
    ${r.admin_note ? `<p class="small muted">${tx("preq.noteLbl")}: ${esc(r.admin_note)}</p>` : ""}
    ${r.status === "pending" ? `<div class="pp-decide"><label class="fld"><span>${tx("preq.noteLbl")}</span><input id="pq-note-${r.id}" maxlength="500"></label>
      <div class="row gap-s wrap-row"><button class="btn gold sm" data-action="pq-approve" data-id="${r.id}">${I("check")}${tx("preq.approve")}</button>${confirmBtn("pqr-" + r.id, "pq-reject", `data-id="${r.id}"`, I("x") + tx("preq.reject"), "btn ghost sm danger")}</div></div>` : ""}
  </div>`;
}

/* ---------- events ---------- */
function ppSet(obj, path, value) {
  const p = path.split(".");
  let o = obj;
  for (let i = 0; i < p.length - 1; i++) o = o[isNaN(p[i]) ? p[i] : Number(p[i])];
  o[isNaN(p[p.length - 1]) ? p[p.length - 1] : Number(p[p.length - 1])] = value;
}
function ppVal(el) { return el.type === "checkbox" ? el.checked : el.value; }
document.addEventListener("input", (ev) => {
  const el = ev.target;
  if (el.dataset.pp && S.pp.draft && el.type !== "radio") ppSet(S.pp.draft, el.dataset.pp, ppVal(el));
  if (el.dataset.ppr && S.pp.req && el.type !== "radio") S.pp.req[el.dataset.ppr] = ppVal(el);
});
document.addEventListener("change", async (ev) => {
  const el = ev.target;
  if (el.dataset.pp && S.pp.draft) { ppSet(S.pp.draft, el.dataset.pp, ppVal(el)); if (el.dataset.pp === "accent") render(true); return; }
  if (el.dataset.ppr && S.pp.req) { S.pp.req[el.dataset.ppr] = ppVal(el); if (el.dataset.ppr === "kind" || el.dataset.ppr === "country") render(true); return; }
  if (el.dataset.action === "pp-image" && el.files && el.files[0]) await ppImagePicked(el.files[0]);
});
async function ppResize(file, max = 640) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    let blob = await new Promise(res => c.toBlob(res, "image/jpeg", 0.86));
    if (blob && blob.size > 900000) blob = await new Promise(res => c.toBlob(res, "image/jpeg", 0.7));
    return blob;
  } finally { URL.revokeObjectURL(url); }
}
async function ppImagePicked(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 15e6) return toast(t("pp.errImage"), "warn");
  try {
    toast(t("pp.uploading"));
    const blob = await ppResize(file);
    if (!blob) throw new AppError("image");
    const old = S.pp.draft.image_path;
    const path = await api.ppUpload(blob);
    await api.ppSave({ image_path: path });
    S.pp.draft.image_path = path; if (S.pp.profile) S.pp.profile.image_path = path;
    if (old) api.ppRemoveFile(old);
    toast(t("toast.saved")); render(true);
  } catch (e) { console.error(e); toast(e && e.code === "image" ? t("pp.errImage") : ppErr(e), "warn"); }
}
document.addEventListener("click", async (ev) => {
  const el = ev.target.closest("[data-action]");
  if (!el || el.tagName === "INPUT" || el.tagName === "SELECT") return;
  const a = el.dataset.action, id = el.dataset.id;
  if (!/^p[pq]-/.test(a)) return;
  try {
    switch (a) {
      case "pp-row-add": { const l = S.pp.draft[el.dataset.list] || (S.pp.draft[el.dataset.list] = []); l.push({}); render(true); break; }
      case "pp-row-del": { S.pp.draft[el.dataset.list].splice(Number(el.dataset.i), 1); render(true); break; }
      case "pp-img-del": { const old = S.pp.draft.image_path; await api.ppSave({ image_path: "" }); S.pp.draft.image_path = ""; if (S.pp.profile) S.pp.profile.image_path = null; api.ppRemoveFile(old); render(true); break; }
      case "pp-lead-seen": await api.ppLeadSeen(id, true); await ppLoad(); break;
      case "pp-lead-del": S.ui.confirm = null; await api.ppLeadDelete(id); await ppLoad(); break;
      case "pp-tab": S.pp.tab = el.dataset.k; render(true); break;
      case "pp-refresh": S.pp.adminReqs = null; await ppLoad(); break;
      case "pq-approve": { busy(el, true); const note = ($("#pq-note-" + id) || {}).value || ""; await api.ppAdminDecide(id, true, note); toast(t("preq.approved")); await ppLoad(); break; }
      case "pq-reject": { S.ui.confirm = null; const note = ($("#pq-note-" + id) || {}).value || ""; await api.ppAdminDecide(id, false, note); toast(t("preq.rejected")); await ppLoad(); break; }
      case "pq-paid": { S.ui.confirm = null; const ref = ($("#pq-ref-" + id) || {}).value || ""; await api.ppAdminSet(id, "paid", ref); toast(t("preq.paidOk")); await ppLoad(); break; }
      case "pq-suspend": S.ui.confirm = null; await api.ppAdminSet(id, "suspend"); await ppLoad(); break;
      case "pq-restore": await api.ppAdminSet(id, "restore"); await ppLoad(); break;
    }
  } catch (e) { console.error(e); toast(ppErr(e), "warn"); busy(el, false); render(true); }
});
document.addEventListener("submit", async (ev) => {
  const f = ev.target;
  if (f.id !== "pp-req-form" && f.id !== "pp-form") return;
  ev.preventDefault();
  const btn = ev.submitter || f.querySelector("[type=submit]");
  const errId = f.id === "pp-form" ? "pp-err" : "pp-req-err";
  setErr(errId);
  const phoneOk = (v) => !v || /^[0-9+ ()-]{5,30}$/.test(v.trim());
  try {
    if (f.id === "pp-req-form") {
      const R = S.pp.req;
      if ((R.full_name || "").trim().length < 2) return setErr(errId, t("pp.e_bad_name"));
      if (R.kind === "course" && !(R.org_name || "").trim()) return setErr(errId, t("pp.e_bad_org"));
      if (R.kind === "course" && R.country === "AZ" && !/^\d{10}$/.test((R.voen || "").replace(/\s/g, ""))) return setErr(errId, t("pp.e_bad_voen"));
      if (!R.phone || !phoneOk(R.phone)) return setErr(errId, t("pp.e_bad_phone"));
      if ((R.note || "").trim().length < 20) return setErr(errId, t("pp.e_bad_note"));
      if (!R.agree) return setErr(errId, t("pp.errAgree"));
      busy(btn, true);
      await api.ppRequest({ kind: R.kind, full_name: R.full_name, org_name: R.kind === "course" ? R.org_name : "", voen: R.kind === "course" ? R.voen : "", country: R.country, phone: R.phone, contact_email: R.contact_email, link: R.link, note: R.note });
      S.pp.req = null; toast(t("pp.sent")); await ppLoad(true);
    } else {
      const d = S.pp.draft, c = d.contacts;
      for (const k of ["website", "facebook", "youtube"]) if (c[k] && !/^https?:\/\/\S+$/i.test(c[k].trim())) return setErr(errId, t("pp.errUrl"));
      for (const k of ["phone", "whatsapp"]) if (!phoneOk(c[k])) return setErr(errId, t("pp.errPhone"));
      for (const k of ["instagram", "telegram", "tiktok"]) { c[k] = ppHandle(c[k]); if (c[k] && !/^[A-Za-z0-9._]{1,40}$/.test(c[k])) return setErr(errId, t("pp.errHandle")); }
      d.slug = (d.slug || "").trim().toLowerCase();
      busy(btn, true);
      await api.ppSave({
        display_name: d.display_name, headline: d.headline, slug: d.slug, city: d.city, bio: d.bio, experience: d.experience, education: d.education,
        subjects: d.subjects.split(",").map(s => s.trim()).filter(Boolean), price_note: d.price_note,
        groups: d.groups, branches: d.branches, team: d.team, contacts: c, accent: d.accent, published: d.published, consent: d.consent,
      });
      toast(t("toast.saved")); await ppLoad(true);
    }
  } catch (e) { console.error(e); const m = ppErr(e); setErr(errId, m); toast(m, "warn"); busy(btn, false); }
});

/* ---------- texts (az, en, tr; other languages fall back to English) ---------- */
Object.assign(I18N.az, {
  "tnav.pubprofile": "Açıq profil", "tnav.preq": "Profil istəkləri",
  "pp.title": "Açıq profil", "pp.lead": "Hər kəsə açıq vizit kartınız: haqqınızda, qruplarınız, qiymətləriniz və qeydiyyat forması.",
  "pp.cloudOnly": "Açıq profil yalnız bulud rejimində işləyir.", "pp.cloudOnlyText": "Demo rejimində məlumat yalnız bu brauzerdə saxlanılır, ona görə hər kəsə açıq səhifə yaratmaq olmur.",
  "pp.introTitle": "Necə işləyir?", "pp.free": "EdubbaX-i pulsuz işlətməyə davam edirsiniz. Ödəniş yalnız hər kəsə açıq profil üçündür.",
  "pp.step1": "Yoxlama formasını doldurursunuz.", "pp.step2": "EdubbaX komandası məlumatı yoxlayıb təsdiq edir.", "pp.step3": "İllik ödənişi edirsiniz.", "pp.step4": "Profiliniz hər kəsə açılır, altında «Powered by EdubbaX» yazılır.",
  "pp.abroad": "Xaricdə: {p} / il", "pp.whyCheck": "Yoxlama ona görədir ki, heç kim başqasının adı ilə profil aça bilməsin və kurs özünü fərdi müəllim kimi təqdim etməsin.",
  "pp.reqTitle": "Yoxlama forması", "pp.reqText": "Bu məlumatları yalnız EdubbaX komandası görür, açıq profilə düşmür.",
  "pp.kind": "Profil növü", "pp.kind_teacher": "Fərdi müəllim", "pp.kind_teacher_t": "Öz adınızla dərs deyirsiniz", "pp.kind_course": "Kurs və ya qurum", "pp.kind_course_t": "Tədris mərkəzi, kurs, məktəb", "pp.year": "il",
  "pp.fullName": "Ad və soyad", "pp.country": "Ölkə", "pp.otherCountry": "Digər ölkə", "pp.orgName": "Kursun və ya qurumun adı", "pp.voen": "VÖEN (10 rəqəm)", "pp.taxId": "Vergi nömrəsi",
  "pp.phone": "Telefon", "pp.email": "Əlaqə e-poçtu", "pp.link": "Sizi tanıdan link (istəyə görə)", "pp.linkHint": "Instagram, Facebook, sayt və ya LinkedIn səhifəsi.",
  "pp.noteTeacher": "Özünüz haqqında qısa yazın", "pp.noteCourse": "Kurs haqqında qısa yazın", "pp.noteHint": "Ən azı 20 simvol: hansı fənni, harada və neçə ildir dərs deyirsiniz.",
  "pp.agree": "Məlumatların doğru olduğunu təsdiq edirəm və EdubbaX komandasının onları yoxlamasına razıyam.", "pp.send": "Yoxlamaya göndər", "pp.sent": "İstək göndərildi",
  "pp.pendingTitle": "İstəyiniz yoxlanılır", "pp.pendingText": "Qərar veriləndə burada görünəcək. Lazım olsa, sizinlə telefonla əlaqə saxlayacağıq.",
  "pp.rejectedTitle": "Əvvəlki istək rədd edildi", "pp.rejectedNoReason": "Səbəb yazılmayıb. Məlumatı düzəldib yenidən göndərə bilərsiniz.",
  "pp.st_awaiting_payment": "Ödəniş gözlənilir", "pp.st_active": "Açıqdır", "pp.st_expired": "Müddəti bitib", "pp.st_suspended": "Dayandırılıb", "pp.verified": "Təsdiqlənib",
  "pp.payTitle": "Təsdiq olundu. Son addım: illik ödəniş.", "pp.payText": "Profiliniz ödənişdən sonra hər kəsə açılacaq: {price} / il. Profili indidən doldura bilərsiniz.",
  "pp.paySoon": "Onlayn ödəniş tezliklə qoşulacaq. Hələlik ödəniş üçün bizə yazın; ödəniş təsdiqlənən kimi profil açılır.", "pp.payMail": "Ödəniş üçün yaz", "pp.payOnline": "Onlayn ödəniş tezliklə",
  "pp.activeText": "Profiliniz {date} tarixinədək hər kəsə açıqdır.", "pp.renewSoon": "Müddətin bitməsinə {n} gün qalıb.",
  "pp.expiredText": "Profil gizlənib, məlumatlarınız silinməyib. Uzatmaq üçün ödəniş edin.", "pp.suspendedText": "Profil EdubbaX tərəfindən dayandırılıb. Ətraflı məlumat üçün bizə yazın.",
  "pp.hiddenConsent": "Profil açıq görünmür: aşağıda razılıq qutusunu işarələyin.", "pp.hiddenOff": "Profil açıq görünmür: «Profili göstər» söndürülüb.", "pp.hiddenShort": "gizli",
  "pp.open": "Səhifəni aç",
  "pp.secMain": "Əsas məlumat", "pp.secAbout": "Haqqında", "pp.secGroups": "Qruplar və qiymətlər", "pp.secBranches": "Filiallar", "pp.secTeam": "Müəllimlər", "pp.secContacts": "Əlaqə", "pp.secLook": "Görünüş və razılıq",
  "pp.photo": "Profil şəkli", "pp.logo": "Loqo", "pp.upload": "Şəkil seç", "pp.removeImg": "Sil", "pp.imgHint": "JPG, PNG və ya WebP. Şəkil avtomatik kiçildilir.",
  "pp.displayName": "Görünən ad", "pp.headline": "Qısa təqdimat", "pp.headlinePh": "Riyaziyyat müəllimi · 8 il təcrübə", "pp.headlinePhC": "Buraxılış və qəbul imtahanlarına hazırlıq",
  "pp.slug": "Səhifə ünvanı", "pp.slugHint": "Kiçik latın hərfləri, rəqəm və tire (3–40 simvol).", "pp.city": "Şəhər", "pp.subjects": "Fənlər", "pp.subjectsHint": "Vergüllə: Riyaziyyat, Həndəsə",
  "pp.bio": "Haqqımda", "pp.bioCourse": "Kurs haqqında", "pp.experience": "Təcrübə", "pp.expCourse": "Təcrübə və nəticələr", "pp.education": "Təhsil və sertifikatlar", "pp.eduCourse": "Lisenziya, sertifikat və tərəfdaşlıqlar",
  "pp.claimsNote": "Nəticə rəqəmlərini yalnız sübut edə biləcəyiniz halda yazın.", "pp.priceNote": "Qiymətlər haqqında", "pp.priceNotePh": "Fərdi dərs: 30 AZN / saat. Qrup dərsi: aylıq 80 AZN.",
  "pp.gName": "Qrup", "pp.gSchedule": "Cədvəl", "pp.gPrice": "Qiymət", "pp.gNote": "Qeyd", "pp.addGroup": "Qrup əlavə et",
  "pp.bName": "Filial", "pp.bAddress": "Ünvan", "pp.bPhone": "Telefon", "pp.addBranch": "Filial əlavə et", "pp.tName": "Müəllim", "pp.tSubject": "Fənn", "pp.addTeam": "Müəllim əlavə et",
  "pp.whatsapp": "WhatsApp", "pp.website": "Sayt", "pp.instagram": "Instagram", "pp.facebook": "Facebook", "pp.youtube": "YouTube", "pp.telegram": "Telegram", "pp.tiktok": "TikTok", "pp.handleHint": "istifadəçi adı",
  "pp.accent": "Əsas rəng", "pp.published": "Profili göstər", "pp.publishedHint": "Söndürsəniz, profil müvəqqəti gizlənir.",
  "pp.consent": "Bu məlumatların hər kəsə açıq göstərilməsinə razıyam. Yazdığım nəticə və iddiaların doğruluğuna mən cavabdehəm.",
  "pp.noStudents": "Açıq profildə şagird adları və nəticələri heç vaxt göstərilmir.", "pp.save": "Profili yadda saxla",
  "pp.leads": "Qeydiyyat istəkləri", "pp.leadsEmpty": "Hələ heç kim formu doldurmayıb. Linkinizi Instagram bio-ya və WhatsApp statusuna qoyun.",
  "pp.leadNew": "Yeni", "pp.markSeen": "Baxıldı", "pp.message": "Mesaj", "pp.payments": "Ödənişlər",
  "pp.errAgree": "Təsdiq qutusunu işarələyin.", "pp.errUrl": "Sayt, Facebook və YouTube linkləri https:// ilə başlamalıdır.", "pp.errPhone": "Telefon nömrəsini düzgün yazın.", "pp.errHandle": "İstifadəçi adı yalnız hərf, rəqəm, nöqtə və alt xətt ola bilər.",
  "pp.errImage": "Şəkil oxunmadı. JPG və ya PNG seçin.", "pp.uploading": "Şəkil yüklənir…",
  "pp.e_has_profile": "Sizin artıq profiliniz var.", "pp.e_pending_exists": "Sizin yoxlanılan istəyiniz var.", "pp.e_too_many": "Bu gün çox istək göndərmisiniz. Sabah yenidən cəhd edin.",
  "pp.e_bad_name": "Adı düzgün yazın.", "pp.e_bad_phone": "Telefon nömrəsini düzgün yazın.", "pp.e_bad_note": "Özünüz haqqında ən azı 20 simvol yazın.", "pp.e_bad_org": "Kursun və ya qurumun adını yazın.",
  "pp.e_bad_voen": "VÖEN 10 rəqəmdən ibarət olmalıdır.", "pp.e_bad_country": "Ölkəni seçin.", "pp.e_bad_slug": "Ünvan 3–40 simvol olmalıdır: kiçik latın hərfləri, rəqəm və tire.", "pp.e_slug_taken": "Bu ünvan artıq tutulub.",
  "pp.e_bad_image": "Şəkil yüklənmədi.", "pp.e_upload": "Şəkil yüklənmədi. Başqa şəkil seçin.", "pp.e_bad_color": "Rəng düzgün deyil.", "pp.e_forbidden": "Bu əməliyyat üçün icazəniz yoxdur.",
  "pp.e_already_decided": "Bu istək üzrə artıq qərar verilib.", "pp.e_not_found": "Tapılmadı.", "pp.e_no_profile": "Profil tapılmadı.",
  "preq.title": "Profil istəkləri", "preq.lead": "Müəllim və kursların yoxlama formaları. Təsdiq etdikdə profil yaranır, ödənişdən sonra hər kəsə açılır.",
  "preq.noAccess": "Bu bölmə yalnız EdubbaX adminləri üçündür.", "preq.tab_pending": "Gözləyənlər", "preq.tab_all": "Bütün istəklər", "preq.tab_profiles": "Profillər", "preq.refresh": "Yenilə",
  "preq.none": "Gözləyən istək yoxdur.", "preq.noProfiles": "Hələ profil yoxdur.", "preq.st_pending": "Gözləyir", "preq.st_approved": "Təsdiqlənib", "preq.st_rejected": "Rədd edilib",
  "preq.account": "Hesab e-poçtu", "preq.sent": "Göndərilib", "preq.decided": "Qərar", "preq.status": "Status", "preq.noteLbl": "Qeyd (rədd səbəbi müəllimə göstərilir)",
  "preq.approve": "Təsdiq et", "preq.reject": "Rədd et", "preq.approved": "Təsdiq edildi, profil yaradıldı", "preq.rejected": "Rədd edildi",
  "preq.paid": "Ödəniş alındı (+1 il)", "preq.refPh": "Qəbz / köçürmə nömrəsi", "preq.paidOk": "Ödəniş qeyd edildi, profil açıldı",
  "preq.suspend": "Dayandır", "preq.restore": "Bərpa et", "preq.until": "Bitmə tarixi", "preq.price": "Qiymət", "preq.owner": "Sahib", "preq.newToast": "{n} profil istəyi yoxlama gözləyir",
});
Object.assign(I18N.en, {
  "tnav.pubprofile": "Public profile", "tnav.preq": "Profile requests",
  "pp.title": "Public profile", "pp.lead": "Your public business card: about you, your groups, your prices and a sign-up form.",
  "pp.cloudOnly": "Public profiles work only in cloud mode.", "pp.cloudOnlyText": "In demo mode data stays in this browser, so a public page cannot be created.",
  "pp.introTitle": "How it works", "pp.free": "You keep using EdubbaX for free. The payment is only for the public profile.",
  "pp.step1": "You fill in the verification form.", "pp.step2": "The EdubbaX team checks and approves it.", "pp.step3": "You pay the yearly fee.", "pp.step4": "Your profile goes public with “Powered by EdubbaX”.",
  "pp.abroad": "Outside Azerbaijan: {p} / year", "pp.whyCheck": "We verify every request so nobody can open a profile in someone else's name and a centre cannot pose as a private teacher.",
  "pp.reqTitle": "Verification form", "pp.reqText": "Only the EdubbaX team sees these details; they are not shown on the public profile.",
  "pp.kind": "Profile type", "pp.kind_teacher": "Private teacher", "pp.kind_teacher_t": "You teach under your own name", "pp.kind_course": "Centre or institution", "pp.kind_course_t": "Learning centre, course, school", "pp.year": "year",
  "pp.fullName": "Full name", "pp.country": "Country", "pp.otherCountry": "Other country", "pp.orgName": "Centre / institution name", "pp.voen": "VÖEN (tax ID, 10 digits)", "pp.taxId": "Tax ID",
  "pp.phone": "Phone", "pp.email": "Contact email", "pp.link": "A link that identifies you (optional)", "pp.linkHint": "Instagram, Facebook, website or LinkedIn page.",
  "pp.noteTeacher": "A few words about you", "pp.noteCourse": "A few words about the centre", "pp.noteHint": "At least 20 characters: which subject, where and for how long you teach.",
  "pp.agree": "I confirm the details are correct and agree that the EdubbaX team may verify them.", "pp.send": "Send for verification", "pp.sent": "Request sent",
  "pp.pendingTitle": "Your request is being reviewed", "pp.pendingText": "The decision will appear here. We may call you if needed.",
  "pp.rejectedTitle": "Your previous request was declined", "pp.rejectedNoReason": "No reason was given. You can correct the details and send again.",
  "pp.st_awaiting_payment": "Awaiting payment", "pp.st_active": "Public", "pp.st_expired": "Expired", "pp.st_suspended": "Suspended", "pp.verified": "Verified",
  "pp.payTitle": "Approved. Last step: the yearly payment.", "pp.payText": "Your profile goes public after payment: {price} / year. You can fill it in now.",
  "pp.paySoon": "Online payment is coming soon. For now, write to us to pay; the profile opens as soon as the payment is confirmed.", "pp.payMail": "Write to pay", "pp.payOnline": "Online payment soon",
  "pp.activeText": "Your profile is public until {date}.", "pp.renewSoon": "{n} days left.",
  "pp.expiredText": "The profile is hidden; your details are kept. Pay to renew.", "pp.suspendedText": "The profile was suspended by EdubbaX. Write to us for details.",
  "pp.hiddenConsent": "Not public: tick the consent box below.", "pp.hiddenOff": "Not public: “Show profile” is off.", "pp.hiddenShort": "hidden", "pp.open": "Open page",
  "pp.secMain": "Main details", "pp.secAbout": "About", "pp.secGroups": "Groups and prices", "pp.secBranches": "Branches", "pp.secTeam": "Teachers", "pp.secContacts": "Contacts", "pp.secLook": "Look and consent",
  "pp.photo": "Profile photo", "pp.logo": "Logo", "pp.upload": "Choose image", "pp.removeImg": "Remove", "pp.imgHint": "JPG, PNG or WebP. Resized automatically.",
  "pp.displayName": "Display name", "pp.headline": "Short tagline", "pp.headlinePh": "Maths teacher · 8 years of experience", "pp.headlinePhC": "Exam preparation for school leavers",
  "pp.slug": "Page address", "pp.slugHint": "Lower-case Latin letters, digits and hyphens (3–40).", "pp.city": "City", "pp.subjects": "Subjects", "pp.subjectsHint": "Comma-separated: Maths, Geometry",
  "pp.bio": "About me", "pp.bioCourse": "About the centre", "pp.experience": "Experience", "pp.expCourse": "Experience and results", "pp.education": "Education and certificates", "pp.eduCourse": "Licences, certificates, partnerships",
  "pp.claimsNote": "Only state results you can prove.", "pp.priceNote": "About prices", "pp.priceNotePh": "Private lesson: 30 AZN / hour. Group: 80 AZN / month.",
  "pp.gName": "Group", "pp.gSchedule": "Schedule", "pp.gPrice": "Price", "pp.gNote": "Note", "pp.addGroup": "Add group",
  "pp.bName": "Branch", "pp.bAddress": "Address", "pp.bPhone": "Phone", "pp.addBranch": "Add branch", "pp.tName": "Teacher", "pp.tSubject": "Subject", "pp.addTeam": "Add teacher",
  "pp.whatsapp": "WhatsApp", "pp.website": "Website", "pp.instagram": "Instagram", "pp.facebook": "Facebook", "pp.youtube": "YouTube", "pp.telegram": "Telegram", "pp.tiktok": "TikTok", "pp.handleHint": "username",
  "pp.accent": "Main colour", "pp.published": "Show profile", "pp.publishedHint": "Turn off to hide the profile for a while.",
  "pp.consent": "I agree that these details are shown publicly. I am responsible for the accuracy of the results and claims I write.",
  "pp.noStudents": "Student names and results are never shown on a public profile.", "pp.save": "Save profile",
  "pp.leads": "Sign-up requests", "pp.leadsEmpty": "Nobody has filled in the form yet. Put your link in your Instagram bio and WhatsApp status.",
  "pp.leadNew": "New", "pp.markSeen": "Seen", "pp.message": "Message", "pp.payments": "Payments",
  "pp.errAgree": "Tick the confirmation box.", "pp.errUrl": "Website, Facebook and YouTube links must start with https://", "pp.errPhone": "Enter a valid phone number.", "pp.errHandle": "Usernames may contain only letters, digits, dots and underscores.",
  "pp.errImage": "The image could not be read. Choose a JPG or PNG.", "pp.uploading": "Uploading image…",
  "pp.e_has_profile": "You already have a profile.", "pp.e_pending_exists": "You already have a request under review.", "pp.e_too_many": "Too many requests today. Try again tomorrow.",
  "pp.e_bad_name": "Enter a valid name.", "pp.e_bad_phone": "Enter a valid phone number.", "pp.e_bad_note": "Write at least 20 characters about yourself.", "pp.e_bad_org": "Enter the centre name.",
  "pp.e_bad_voen": "VÖEN must be 10 digits.", "pp.e_bad_country": "Choose a country.", "pp.e_bad_slug": "Address: 3–40 lower-case Latin letters, digits and hyphens.", "pp.e_slug_taken": "This address is taken.",
  "pp.e_bad_image": "The image was not saved.", "pp.e_upload": "Upload failed. Try another image.", "pp.e_bad_color": "Invalid colour.", "pp.e_forbidden": "You are not allowed to do this.",
  "pp.e_already_decided": "This request was already decided.", "pp.e_not_found": "Not found.", "pp.e_no_profile": "Profile not found.",
  "preq.title": "Profile requests", "preq.lead": "Verification forms from teachers and centres. Approving creates the profile; it goes public after payment.",
  "preq.noAccess": "This section is for EdubbaX admins only.", "preq.tab_pending": "Pending", "preq.tab_all": "All requests", "preq.tab_profiles": "Profiles", "preq.refresh": "Refresh",
  "preq.none": "No pending requests.", "preq.noProfiles": "No profiles yet.", "preq.st_pending": "Pending", "preq.st_approved": "Approved", "preq.st_rejected": "Declined",
  "preq.account": "Account email", "preq.sent": "Sent", "preq.decided": "Decided", "preq.status": "Status", "preq.noteLbl": "Note (a decline reason is shown to the teacher)",
  "preq.approve": "Approve", "preq.reject": "Decline", "preq.approved": "Approved, profile created", "preq.rejected": "Declined",
  "preq.paid": "Payment received (+1 year)", "preq.refPh": "Receipt / transfer no.", "preq.paidOk": "Payment recorded, profile is public",
  "preq.suspend": "Suspend", "preq.restore": "Restore", "preq.until": "Valid until", "preq.price": "Price", "preq.owner": "Owner", "preq.newToast": "{n} profile request(s) waiting for review",
});
Object.assign(I18N.tr, {
  "tnav.pubprofile": "Açık profil", "tnav.preq": "Profil talepleri",
  "pp.title": "Açık profil", "pp.lead": "Herkese açık kartvizitiniz: hakkınızda, gruplarınız, ücretleriniz ve kayıt formu.",
  "pp.cloudOnly": "Açık profil yalnızca bulut modunda çalışır.", "pp.cloudOnlyText": "Demo modunda veriler yalnızca bu tarayıcıda tutulur, bu yüzden herkese açık sayfa oluşturulamaz.",
  "pp.introTitle": "Nasıl çalışır?", "pp.free": "EdubbaX'i ücretsiz kullanmaya devam edersiniz. Ödeme yalnızca açık profil içindir.",
  "pp.step1": "Doğrulama formunu doldurursunuz.", "pp.step2": "EdubbaX ekibi bilgileri kontrol edip onaylar.", "pp.step3": "Yıllık ödemeyi yaparsınız.", "pp.step4": "Profiliniz «Powered by EdubbaX» ile herkese açılır.",
  "pp.abroad": "Yurt dışında: {p} / yıl", "pp.whyCheck": "Doğrulama, kimsenin başkası adına profil açmaması ve bir kursun kendini özel öğretmen gibi göstermemesi içindir.",
  "pp.reqTitle": "Doğrulama formu", "pp.reqText": "Bu bilgileri yalnızca EdubbaX ekibi görür, açık profilde gösterilmez.",
  "pp.kind": "Profil türü", "pp.kind_teacher": "Özel öğretmen", "pp.kind_teacher_t": "Kendi adınızla ders veriyorsunuz", "pp.kind_course": "Kurs veya kurum", "pp.kind_course_t": "Eğitim merkezi, kurs, okul", "pp.year": "yıl",
  "pp.fullName": "Ad soyad", "pp.country": "Ülke", "pp.otherCountry": "Diğer ülke", "pp.orgName": "Kurs veya kurum adı", "pp.voen": "VÖEN (10 hane)", "pp.taxId": "Vergi numarası",
  "pp.phone": "Telefon", "pp.email": "İletişim e-postası", "pp.link": "Sizi tanıtan bağlantı (isteğe bağlı)", "pp.linkHint": "Instagram, Facebook, web sitesi veya LinkedIn sayfası.",
  "pp.noteTeacher": "Kendinizi kısaca anlatın", "pp.noteCourse": "Kursu kısaca anlatın", "pp.noteHint": "En az 20 karakter: hangi dersi, nerede ve kaç yıldır veriyorsunuz.",
  "pp.agree": "Bilgilerin doğru olduğunu onaylıyorum ve EdubbaX ekibinin bunları kontrol etmesini kabul ediyorum.", "pp.send": "Doğrulamaya gönder", "pp.sent": "Talep gönderildi",
  "pp.pendingTitle": "Talebiniz inceleniyor", "pp.pendingText": "Karar burada görünecek. Gerekirse sizi telefonla arayacağız.",
  "pp.rejectedTitle": "Önceki talep reddedildi", "pp.rejectedNoReason": "Gerekçe yazılmadı. Bilgileri düzeltip yeniden gönderebilirsiniz.",
  "pp.st_awaiting_payment": "Ödeme bekleniyor", "pp.st_active": "Yayında", "pp.st_expired": "Süresi doldu", "pp.st_suspended": "Durduruldu", "pp.verified": "Doğrulandı",
  "pp.payTitle": "Onaylandı. Son adım: yıllık ödeme.", "pp.payText": "Profiliniz ödemeden sonra herkese açılır: {price} / yıl. Profili şimdiden doldurabilirsiniz.",
  "pp.paySoon": "Online ödeme yakında. Şimdilik ödeme için bize yazın; ödeme onaylanınca profil hemen açılır.", "pp.payMail": "Ödeme için yaz", "pp.payOnline": "Online ödeme yakında",
  "pp.activeText": "Profiliniz {date} tarihine kadar herkese açık.", "pp.renewSoon": "Sürenin bitmesine {n} gün kaldı.",
  "pp.expiredText": "Profil gizlendi, bilgileriniz silinmedi. Uzatmak için ödeme yapın.", "pp.suspendedText": "Profil EdubbaX tarafından durduruldu. Ayrıntı için bize yazın.",
  "pp.hiddenConsent": "Profil açık değil: aşağıdaki onay kutusunu işaretleyin.", "pp.hiddenOff": "Profil açık değil: «Profili göster» kapalı.", "pp.hiddenShort": "gizli", "pp.open": "Sayfayı aç",
  "pp.secMain": "Temel bilgiler", "pp.secAbout": "Hakkında", "pp.secGroups": "Gruplar ve ücretler", "pp.secBranches": "Şubeler", "pp.secTeam": "Öğretmenler", "pp.secContacts": "İletişim", "pp.secLook": "Görünüm ve onay",
  "pp.photo": "Profil fotoğrafı", "pp.logo": "Logo", "pp.upload": "Görsel seç", "pp.removeImg": "Sil", "pp.imgHint": "JPG, PNG veya WebP. Otomatik küçültülür.",
  "pp.displayName": "Görünen ad", "pp.headline": "Kısa tanıtım", "pp.headlinePh": "Matematik öğretmeni · 8 yıl deneyim", "pp.headlinePhC": "Sınavlara hazırlık",
  "pp.slug": "Sayfa adresi", "pp.slugHint": "Küçük Latin harfleri, rakam ve tire (3–40).", "pp.city": "Şehir", "pp.subjects": "Dersler", "pp.subjectsHint": "Virgülle: Matematik, Geometri",
  "pp.bio": "Hakkımda", "pp.bioCourse": "Kurs hakkında", "pp.experience": "Deneyim", "pp.expCourse": "Deneyim ve sonuçlar", "pp.education": "Eğitim ve sertifikalar", "pp.eduCourse": "Lisans, sertifika ve ortaklıklar",
  "pp.claimsNote": "Sonuç rakamlarını yalnızca kanıtlayabiliyorsanız yazın.", "pp.priceNote": "Ücretler hakkında", "pp.priceNotePh": "Özel ders: saati 30 AZN. Grup: aylık 80 AZN.",
  "pp.gName": "Grup", "pp.gSchedule": "Program", "pp.gPrice": "Ücret", "pp.gNote": "Not", "pp.addGroup": "Grup ekle",
  "pp.bName": "Şube", "pp.bAddress": "Adres", "pp.bPhone": "Telefon", "pp.addBranch": "Şube ekle", "pp.tName": "Öğretmen", "pp.tSubject": "Ders", "pp.addTeam": "Öğretmen ekle",
  "pp.website": "Web sitesi", "pp.handleHint": "kullanıcı adı",
  "pp.accent": "Ana renk", "pp.published": "Profili göster", "pp.publishedHint": "Kapatırsanız profil geçici olarak gizlenir.",
  "pp.consent": "Bu bilgilerin herkese açık gösterilmesini kabul ediyorum. Yazdığım sonuç ve iddiaların doğruluğundan ben sorumluyum.",
  "pp.noStudents": "Açık profilde öğrenci adları ve sonuçları asla gösterilmez.", "pp.save": "Profili kaydet",
  "pp.leads": "Kayıt talepleri", "pp.leadsEmpty": "Henüz kimse formu doldurmadı. Bağlantınızı Instagram biyografinize ve WhatsApp durumunuza ekleyin.",
  "pp.leadNew": "Yeni", "pp.markSeen": "Görüldü", "pp.message": "Mesaj", "pp.payments": "Ödemeler",
  "pp.errAgree": "Onay kutusunu işaretleyin.", "pp.errUrl": "Web sitesi, Facebook ve YouTube bağlantıları https:// ile başlamalı.", "pp.errPhone": "Telefon numarasını doğru yazın.", "pp.errHandle": "Kullanıcı adı yalnızca harf, rakam, nokta ve alt çizgi içerebilir.",
  "pp.errImage": "Görsel okunamadı. JPG veya PNG seçin.", "pp.uploading": "Görsel yükleniyor…",
  "pp.e_has_profile": "Zaten bir profiliniz var.", "pp.e_pending_exists": "İncelenen bir talebiniz var.", "pp.e_too_many": "Bugün çok fazla talep gönderdiniz. Yarın tekrar deneyin.",
  "pp.e_bad_name": "Adı doğru yazın.", "pp.e_bad_phone": "Telefon numarasını doğru yazın.", "pp.e_bad_note": "Kendiniz hakkında en az 20 karakter yazın.", "pp.e_bad_org": "Kurs adını yazın.",
  "pp.e_bad_voen": "VÖEN 10 haneli olmalı.", "pp.e_bad_country": "Ülke seçin.", "pp.e_bad_slug": "Adres 3–40 karakter olmalı: küçük Latin harfleri, rakam ve tire.", "pp.e_slug_taken": "Bu adres alınmış.",
  "pp.e_bad_image": "Görsel kaydedilmedi.", "pp.e_upload": "Yükleme başarısız. Başka bir görsel deneyin.", "pp.e_bad_color": "Geçersiz renk.", "pp.e_forbidden": "Bu işlem için yetkiniz yok.",
  "pp.e_already_decided": "Bu talep için zaten karar verildi.", "pp.e_not_found": "Bulunamadı.", "pp.e_no_profile": "Profil bulunamadı.",
  "preq.title": "Profil talepleri", "preq.lead": "Öğretmen ve kursların doğrulama formları. Onaylayınca profil oluşur, ödemeden sonra yayına girer.",
  "preq.noAccess": "Bu bölüm yalnızca EdubbaX yöneticileri içindir.", "preq.tab_pending": "Bekleyenler", "preq.tab_all": "Tüm talepler", "preq.tab_profiles": "Profiller", "preq.refresh": "Yenile",
  "preq.none": "Bekleyen talep yok.", "preq.noProfiles": "Henüz profil yok.", "preq.st_pending": "Bekliyor", "preq.st_approved": "Onaylandı", "preq.st_rejected": "Reddedildi",
  "preq.account": "Hesap e-postası", "preq.sent": "Gönderildi", "preq.decided": "Karar", "preq.status": "Durum", "preq.noteLbl": "Not (red gerekçesi öğretmene gösterilir)",
  "preq.approve": "Onayla", "preq.reject": "Reddet", "preq.approved": "Onaylandı, profil oluşturuldu", "preq.rejected": "Reddedildi",
  "preq.paid": "Ödeme alındı (+1 yıl)", "preq.refPh": "Makbuz / havale no", "preq.paidOk": "Ödeme kaydedildi, profil yayında",
  "preq.suspend": "Durdur", "preq.restore": "Geri aç", "preq.until": "Bitiş tarihi", "preq.price": "Ücret", "preq.owner": "Sahip", "preq.newToast": "{n} profil talebi inceleme bekliyor",
});
/* ---- end public-profile.js ---- */
