/* Notifications Manhwa — diffusion en direct de notifications « Système / Constellations » (style ORV)
   Foundry VTT v12 / v13 */
const MID = "notifications-manhwa";
const SOCK = `module.${MID}`;
const SOUNDS = ["neutre", "systeme", "doux", "cloche", "upbeat", "victoire", "mystique", "alerte", "danger", "echec", "ominous", "sombre", "abysse", "tambour", "glitch"];
const THEMES = ["rouge", "cramoisi", "sang", "orange-alerte", "orange", "jaune", "or", "vert", "toxique", "emeraude", "cyan", "bleu", "bleu-roi", "turquoise", "acier", "violet", "violet-doux", "plasma", "nebula", "rose", "blanc", "noir"];
const FONTS = ["system", "cosmic", "classic", "mono", "impact"];
const ApplicationV2 = foundry.applications.api.ApplicationV2;
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const uid = () => (foundry.utils.randomID ? foundry.utils.randomID(12) : Math.random().toString(36).slice(2, 14));

/* ───────────────── Couleurs personnalisées (identique à l'outil) ───────────────── */
function nmHex2rgb(h){ h=String(h||"#1e7ae8").replace("#",""); if(h.length===3) h=h.split("").map(c=>c+c).join(""); const n=parseInt(h.slice(0,6),16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function nmRgb2hsl(r,g,b){ r/=255;g/=255;b/=255; const mx=Math.max(r,g,b),mn=Math.min(r,g,b); let h=0,s=0; const l=(mx+mn)/2; if(mx!==mn){ const d=mx-mn; s=l>.5?d/(2-mx-mn):d/(mx+mn); if(mx===r) h=(g-b)/d+(g<b?6:0); else if(mx===g) h=(b-r)/d+2; else h=(r-g)/d+4; h/=6; } return [h,s,l]; }
function nmHsl2rgb(h,s,l){ if(s===0){ const v=Math.round(l*255); return [v,v,v]; } const q=l<.5?l*(1+s):l+s-l*s, p=2*l-q; const f=t=>{ if(t<0)t+=1; if(t>1)t-=1; if(t<1/6) return p+(q-p)*6*t; if(t<1/2) return q; if(t<2/3) return p+(q-p)*(2/3-t)*6; return p; }; return [Math.round(f(h+1/3)*255),Math.round(f(h)*255),Math.round(f(h-1/3)*255)]; }
function nmShade(hex,dl,ds){ const [h,s,l]=nmRgb2hsl(...nmHex2rgb(hex)); const [r,g,b]=nmHsl2rgb(h,Math.max(0,Math.min(1,s+(ds||0))),Math.max(0,Math.min(1,l+dl))); return "#"+[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join(""); }
function nmRgba(hex,a){ const [r,g,b]=nmHex2rgb(hex); return `rgba(${r},${g},${b},${a})`; }
function nmCustomVars(main, glow){
  main = main || "#1e7ae8"; glow = glow || nmShade(main, .28, .1);
  return { "--t-bar1": nmShade(main,-.14), "--t-bar2": nmShade(main,-.10), "--t-bar3": nmShade(main,-.07), "--t-main1": nmShade(main,-.03), "--t-main2": main, "--t-main3": nmShade(main,.05),
    "--t-glow": nmRgba(glow,.9), "--t-border": nmRgba(glow,.4), "--t-corner": nmRgba(nmShade(glow,.15),.8), "--t-side": nmShade(glow,.06), "--t-hline": nmRgba(glow,.6), "--t-hcenter": nmRgba(nmShade(glow,.3),.97),
    "--t-card-border": nmRgba(glow,.67), "--t-card-border2": nmRgba(nmShade(main,-.12),.27), "--t-card-inset": nmRgba(nmShade(glow,.1),.53), "--t-botbar-txt": nmRgba(nmShade(glow,.15),.45), "--t-scan": nmRgba(nmShade(glow,.25),.4), "--t-deco": nmRgba(nmShade(glow,.15),.55) };
}
const VAR_KEYS = Object.keys(nmCustomVars("#000"));

/* ───────────────── Réglages ───────────────── */
Hooks.once("init", () => {
  const S = (k, o) => game.settings.register(MID, k, o);
  S("registry", { scope: "world", config: false, type: Object, default: {} });
  S("library", { scope: "world", config: false, type: Object, default: { cats: [], presets: [] } });
  S("defaults", { scope: "world", config: false, type: Object, default: {} });
  S("history", { scope: "world", config: false, type: Array, default: [] });
  S("journal", { scope: "client", config: false, type: Array, default: [] }); /* ancien journal par navigateur : migré une fois vers le drapeau du User */
  S("playersJournal", { name: "Journal pour les joueurs", hint: "Les joueurs peuvent rouvrir le journal des notifications reçues (bouton dans les contrôles de scène).", scope: "world", config: true, type: Boolean, default: true });
  S("journalSize", { name: "Taille du journal", hint: "Nombre de notifications conservées dans le journal de chaque compte (stocké sur le serveur, suit le joueur d'un navigateur à l'autre).", scope: "world", config: true, type: Number, default: 100, range: { min: 10, max: 500, step: 10 } });
  S("maxStack", { name: "Notifications simultanées", hint: "Au-delà, les suivantes attendent en file.", scope: "world", config: true, type: Number, default: 3, range: { min: 1, max: 6, step: 1 } });
  S("allowModuleApi", { name: "API ouverte aux joueurs", hint: "Autorise les diffusions déclenchées côté joueur par d'autres modules (ex. paliers de statistiques de Fiche Manhwa). Les joueurs n'ont jamais accès à l'outil de diffusion lui-même.", scope: "world", config: true, type: Boolean, default: true });
  S("chatAlias", { name: "Nom d'expéditeur dans le chat", scope: "world", config: true, type: String, default: "Système" });
  S("muteSounds", { name: "Couper les sons (ce client)", scope: "client", config: true, type: Boolean, default: false });
  S("volumeScale", { name: "Volume des notifications (ce client)", hint: "Multiplicateur appliqué au volume choisi par le MJ.", scope: "client", config: true, type: Number, default: 100, range: { min: 0, max: 100, step: 5 } });
  S("windowWidth", { scope: "client", config: false, type: Number, default: 1420 });
  S("windowHeight", { scope: "client", config: false, type: Number, default: 940 });
  game.keybindings?.register(MID, "openTool", { name: "Ouvrir l'outil de diffusion (MJ)", editable: [], onDown: () => { if (game.user.isGM) openTool(); return true; } });
  game.keybindings?.register(MID, "openJournal", { name: "Ouvrir le journal des notifications", editable: [], onDown: () => { openJournal(); return true; } });
});

/* ───────────────── Fenêtre MJ (iframe) ───────────────── */
class NotifTool extends ApplicationV2 {
  static DEFAULT_OPTIONS = { id: "nm-tool", classes: ["nm-frame"], window: { title: "Notifications Manhwa", icon: "fa-solid fa-satellite-dish", resizable: true, minimizable: true }, position: { width: 1420, height: 940 } };
  async _prepareContext() { return {}; }
  async _renderHTML() { const f = document.createElement("iframe"); f.className = "nm-iframe"; f.src = `modules/${MID}/app/notif.html`; this.frame = f; return f; }
  _replaceHTML(result, content) { content.replaceChildren(result); }
  _onClose(o) { super._onClose?.(o); if (this.position?.width) { game.settings.set(MID, "windowWidth", Math.round(this.position.width)); game.settings.set(MID, "windowHeight", Math.round(this.position.height)); } tool = null; }
}
let tool = null;
function openTool() {
  if (!game.user.isGM) return ui.notifications.warn("L'outil de diffusion est réservé au MJ.");
  if (!tool) tool = new NotifTool({ position: { width: game.settings.get(MID, "windowWidth"), height: game.settings.get(MID, "windowHeight") } });
  tool.render({ force: true }); return tool;
}
function usersList() { return game.users.map(u => ({ id: u.id, name: u.name, color: (u.color?.css ?? u.color ?? "#38e0ff").toString(), active: u.active, isGM: u.isGM })); }
function post(msg) { tool?.frame?.contentWindow?.postMessage(msg, "*"); }
function initFrame(win) {
  win.postMessage({ type: "nm-init", registry: game.settings.get(MID, "registry"), library: game.settings.get(MID, "library"), defaults: game.settings.get(MID, "defaults"), history: game.settings.get(MID, "history"), users: usersList(), sub: `Monde : ${game.world.title} · ${game.users.filter(u => u.active && !u.isGM).length} joueur(s) en ligne` }, "*");
}
function FP() { return foundry.applications?.apps?.FilePicker?.implementation ?? foundry.applications?.apps?.FilePicker ?? globalThis.FilePicker; }
window.addEventListener("message", async ev => {
  const m = ev.data || {}; if (!m || typeof m.type !== "string" || !m.type.startsWith("nm-")) return;
  const win = ev.source; if (win !== tool?.frame?.contentWindow) return;
  if (!game.user.isGM) return;
  if (m.type === "nm-ready") initFrame(win);
  else if (m.type === "nm-save") { if (["registry", "library", "defaults"].includes(m.key)) await game.settings.set(MID, m.key, m.value ?? {}); }
  else if (m.type === "nm-broadcast") await broadcast(m.payload);
  else if (m.type === "nm-replay") { const h = game.settings.get(MID, "history").find(x => x.id === m.id); if (h) await broadcast(foundry.utils.deepClone(h), true); }
  else if (m.type === "nm-history-clear") await game.settings.set(MID, "history", []);
  else if (m.type === "nm-preview") playSound(m, true);
  else if (m.type === "nm-tokens") { const ids = new Set(); for (const t of canvas?.tokens?.controlled ?? []) for (const u of game.users) if (!u.isGM && t.actor?.testUserPermission(u, "OWNER")) ids.add(u.id); win.postMessage({ type: "nm-tokens", ids: [...ids] }, "*"); }
  else if (m.type === "nm-pick") { const Cls = FP(); if (!Cls) return; new Cls({ type: m.what === "sound" ? "audio" : "image", callback: path => win.postMessage({ type: "nm-picked", what: m.what, path }, "*") }).browse(); }
});
Hooks.on("userConnected", () => post({ type: "nm-users", users: usersList() }));
Hooks.on("updateSetting", (s, c, o, userId) => { if (s.key === `${MID}.history`) post({ type: "nm-history", history: game.settings.get(MID, "history") }); if (s.key === `${MID}.registry` && userId !== game.user.id) post({ type: "nm-registry", registry: game.settings.get(MID, "registry") }); });

/* ───────────────── Charge utile ───────────────── */
function renderMarkup(txt) { let h = esc(txt); h = h.replace(/\{(or|sang|cyan|violet|vert|bleu|rose|argent)\}([\s\S]*?)\{\/(?:\1)?\}/g, '<span class="mk-$1">$2</span>'); return h.replace(/\n/g, "<br>"); }
function normalize(p) {
  const o = {};
  o.id = typeof p.id === "string" ? p.id.slice(0, 24) : uid();
  o.text = String(p.text ?? "").slice(0, 2000);
  o.font = FONTS.includes(p.font) ? p.font : "system";
  o.theme = THEMES.includes(p.theme) ? p.theme : (p.theme === "custom" ? "custom" : "bleu");
  if (p.colors?.main) o.vars = nmCustomVars(p.colors.main, p.colors.glow);
  else if (p.vars && typeof p.vars === "object") { o.vars = {}; for (const k of VAR_KEYS) if (typeof p.vars[k] === "string" && /^(#[0-9a-f]{3,8}|rgba?\([\d.,\s]+\))$/i.test(p.vars[k])) o.vars[k] = p.vars[k]; }
  else o.vars = null;
  if (o.theme === "custom" && !o.vars) o.theme = "bleu";
  o.cat = p.cat && typeof p.cat === "object" ? { ic: String(p.cat.ic ?? "").slice(0, 4), nom: String(p.cat.nom ?? "").slice(0, 40) } : null;
  o.top = String(p.top ?? "SYS::CONSTELLATION_LINK").slice(0, 60); o.bot = String(p.bot ?? "CONSTELLATION.NETWORK · NOTIFICATION.SYS").slice(0, 80);
  o.image = typeof p.image === "string" && /^(https?:\/\/|[\w\-./ ]+\.(png|jpe?g|webp|gif|svg))/i.test(p.image) ? p.image.slice(0, 500) : "";
  o.duration = Math.max(0, Math.min(3600, Number(p.duration ?? 8) || 0)); o.dismiss = p.dismiss !== false;
  o.position = ["top", "center", "bottom"].includes(p.position) ? p.position : "center";
  o.width = Math.max(320, Math.min(1600, Number(p.width) || 760)); o.zoom = Math.max(50, Math.min(200, Number(p.zoom) || 100));
  o.sound = SOUNDS.includes(p.sound) ? p.sound : (p.sound === "custom" ? "custom" : "");
  o.soundPath = o.sound === "custom" && typeof p.soundPath === "string" ? p.soundPath.slice(0, 500) : "";
  o.volume = Math.max(0, Math.min(100, Number(p.volume ?? 80) || 0)); o.chat = !!p.chat;
  o.targets = p.targets === "all" || !Array.isArray(p.targets) ? "all" : p.targets.filter(x => typeof x === "string").slice(0, 50);
  o.gmToo = p.gmToo !== false; o.seed = Number(p.seed) || 0; o.mode = String(p.mode ?? "une"); o.name = String(p.name ?? "").slice(0, 120);
  return o;
}
async function broadcast(raw, replay = false) {
  const p = normalize(raw); p.from = game.user.id; p.ts = Date.now(); if (replay) p.id = uid();
  if (!p.text) return;
  game.socket.emit(SOCK, { type: "show", payload: p });
  receive(p);
  if (p.chat) await chatCopy(p);
  if (game.user.isGM) { const h = game.settings.get(MID, "history"); h.unshift({ ...p, scope: jScope(p) }); /* cibles + portée : alimente l'onglet « Globales » */ await game.settings.set(MID, "history", h.slice(0, 60)); }
  Hooks.callAll("notificationsManhwa.broadcast", p);
}
async function chatCopy(p) {
  const style = p.vars ? Object.entries(p.vars).map(([k, v]) => `${k}:${v}`).join(";") : "";
  const content = `<div class="nm-chat theme-${p.theme === "custom" ? "bleu" : p.theme}" style="${style}"><div class="nm-chat-top"><span>${esc(p.top)}</span><span>${p.cat ? esc(p.cat.ic + " " + p.cat.nom) : ""}</span></div>${p.image ? `<img src="${esc(p.image)}" style="display:block;max-width:100%;margin:6px auto 0;border-radius:3px">` : ""}<div class="nm-chat-txt font-${p.font}">${renderMarkup(p.text)}</div><button type="button" class="nm-chat-replay" data-nm="${p.id}">RÉAFFICHER</button></div>`;
  const whisper = p.targets === "all" ? [] : [...new Set([...p.targets, ...game.users.filter(u => u.isGM).map(u => u.id)])];
  await ChatMessage.create({ content, whisper, speaker: { alias: game.settings.get(MID, "chatAlias") || "Système" }, flags: { [MID]: { payload: p } } });
}
/* clic « RÉAFFICHER » dans le chat */
document.addEventListener("click", ev => {
  const b = ev.target?.closest?.(".nm-chat-replay"); if (!b) return;
  const li = b.closest("[data-message-id]"); const msg = li && game.messages.get(li.dataset.messageId);
  const p = msg?.getFlag(MID, "payload"); if (p) showCard(Object.assign({}, normalize(p), { dismiss: true, targets: "all" }), true);
});

/* ───────────────── Réception ───────────────── */
function receive(p) {
  const me = game.user.id;
  if (p.from === me) { if (!p.gmToo) { if (game.user.isGM) journalAdd(p, true); return; } } /* le MJ garde une trace de ses diffusions même sans « gmToo » */
  else if (p.targets !== "all" && !p.targets.includes(me)) return;
  showCard(p); playSound(p); journalAdd(p, p.from === me);
  Hooks.callAll("notificationsManhwa.received", p);
}
function playSound(p, preview = false) {
  if (game.settings.get(MID, "muteSounds") && !preview) return;
  const src = p.sound === "custom" ? p.soundPath : (p.sound ? `modules/${MID}/sounds/${p.sound}.ogg` : "");
  if (!src) return;
  const volume = Math.max(0, Math.min(1, (Number(p.volume ?? 80) / 100) * (game.settings.get(MID, "volumeScale") / 100)));
  const AH = foundry.audio?.AudioHelper ?? globalThis.AudioHelper;
  try { AH.play({ src, volume, autoplay: true, loop: false }, false); } catch (e) { console.warn(`${MID} | son`, e); }
}
/* ───────────────── Journal par compte (drapeau du document User, côté serveur) ─────────────────
   flags.notifications-manhwa.journal = [{ id, ts, from, read, scope:"global"|"perso", text, theme, vars, font, cat, top, bot, image, duration, position, width, zoom, seed, mode, name, targets }]
   flags.notifications-manhwa.jsync   = ts de la dernière diffusion de l'historique du monde déjà fusionnée */
const J_KEYS = ["id", "ts", "from", "text", "theme", "vars", "font", "cat", "top", "bot", "image", "duration", "position", "width", "zoom", "seed", "mode", "name", "targets"];
const jKey = e => `${e.id}|${e.ts}`;
const jScope = p => p.targets === "all" || !Array.isArray(p.targets) ? "global" : "perso";
function jEntry(p, read = false) { const e = {}; for (const k of J_KEYS) if (p[k] !== undefined && p[k] !== null) e[k] = p[k]; e.ts = Number(p.ts) || Date.now(); e.id = String(p.id || uid()); e.read = !!read; e.scope = jScope(p); return e; }
function jGet(user = game.user) { const j = user?.getFlag?.(MID, "journal"); return Array.isArray(j) ? j : []; }
function jUnread(user = game.user) { return jGet(user).filter(e => !e.read).length; }
function jSize() { return Math.max(10, Number(game.settings.get(MID, "journalSize")) || 100); }
/* écritures sérialisées : chaque modification part de l'état déjà confirmé par le serveur */
let jChain = Promise.resolve();
function jEdit(user, fn, extra = {}) {
  jChain = jChain.then(async () => {
    if (!user || !(user.id === game.user.id || game.user.isGM)) return;
    const next = fn(jGet(user).map(e => ({ ...e }))); if (!Array.isArray(next)) return;
    const seen = new Set(); const out = next.filter(e => e && !seen.has(jKey(e)) && seen.add(jKey(e))).sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, jSize());
    await user.update({ [`flags.${MID}.journal`]: out, ...extra });
  }).catch(e => console.warn(`${MID} | journal`, e));
  return jChain;
}
function journalAdd(p, read = false) { return jEdit(game.user, j => { const e = jEntry(p, read); return j.some(x => jKey(x) === jKey(e)) ? false : [e, ...j]; }); }
/* migration de l'ancien journal « client » + rattrapage des diffusions manquées (historique du monde) */
async function journalSync() {
  const me = game.user, old = game.settings.get(MID, "journal") ?? [], hist = game.settings.get(MID, "history") ?? [];
  const since = Number(me.getFlag(MID, "jsync")) || 0;
  const mine = h => me.isGM || h.targets === "all" || (Array.isArray(h.targets) && h.targets.includes(me.id));
  const add = [...(Array.isArray(old) ? old : []).map(p => jEntry(p, true)), ...hist.filter(h => (h.ts || 0) > since && mine(h)).map(h => jEntry(h, !since || h.from === me.id))];
  const top = Math.max(since, ...hist.map(h => Number(h.ts) || 0));
  if (add.length || top !== since) await jEdit(me, j => [...j, ...add], { [`flags.${MID}.jsync`]: top });
  if (Array.isArray(old) && old.length) await game.settings.set(MID, "journal", []);
}
/* mise à jour d'un drapeau journal → rafraîchit fenêtre, pastille et prévient les autres modules */
Hooks.on("updateUser", (user, changes) => {
  if (!changes?.flags?.[MID] || !("journal" in changes.flags[MID])) return;
  if (journal?.rendered && journal.viewId === user.id) journal.refresh();
  if (user.id === game.user.id) jBadge();
  Hooks.callAll("notificationsManhwa.journal", { userId: user.id, mine: user.id === game.user.id, total: jGet(user).length, unread: jUnread(user) });
});

/* ───────────────── Calque d'affichage ───────────────── */
const active = []; const queue = [];
function layer() {
  let l = document.getElementById("nm-layer");
  if (!l) { l = document.createElement("div"); l.id = "nm-layer"; l.innerHTML = '<div class="nm-stack"></div>'; document.body.appendChild(l); }
  return l;
}
function starsSvg(seed) {
  let a = (seed >>> 0) || 7; const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  const pts = []; for (let i = 0; i < 22; i++) pts.push([rnd() * 1000, rnd() * 260]);
  let h = ""; pts.forEach((p, i) => { h += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(0.6 + rnd() * 1.4).toFixed(2)}"/>`; if (i && rnd() < .55) { const q = pts[i - 1]; h += `<path d="M${q[0].toFixed(1)} ${q[1].toFixed(1)} L${p[0].toFixed(1)} ${p[1].toFixed(1)}"/>`; } });
  return h;
}
function cardHTML(p) {
  const style = p.vars ? Object.entries(p.vars).map(([k, v]) => `${k}:${v}`).join(";") : "";
  const cls = p.vars ? "" : ` theme-${p.theme}`;
  return `<div class="notif-card${cls}" style="${style}">
    <div class="notif-topbar"><div class="notif-topbar-deco"><div class="deco-corner"></div><div class="deco-corner2"></div></div>
      <div class="notif-topbar-txt"><i></i><span>${esc(p.top)}</span></div>
      ${p.cat ? `<div class="notif-cat on"><b>${esc(p.cat.ic)}</b>${esc(p.cat.nom)}</div>` : ""}
      <div class="win-btn">—</div><div class="win-btn">□</div><div class="win-btn">✕</div></div>
    <div class="notif-main"><div class="n-hex"></div><div class="n-sheen"></div><div class="n-lines"></div>
      <svg class="n-stars" viewBox="0 0 1000 260" preserveAspectRatio="none">${starsSvg(p.seed)}</svg>
      <div class="n-ticks l"></div><div class="n-ticks r"></div><div class="scan"></div>
      <div class="notif-body"><div class="corner-tl"></div><div class="corner-tr"></div><div class="corner-bl"></div><div class="corner-br"></div>
        <div class="h-line"></div>${p.image ? `<img class="nm-img" src="${esc(p.image)}" alt="">` : ""}<div class="notif-text font-${p.font}">${renderMarkup(p.text)}</div><div class="h-line"></div></div></div>
    <div class="notif-botbar"><div class="notif-botbar-left"><i></i><i></i><i></i><i></i></div><div class="notif-botbar-txt">${esc(p.bot)}</div><div class="notif-botbar-deco"></div></div>
  </div>`;
}
function showCard(p, local = false) {
  if (active.length >= game.settings.get(MID, "maxStack")) { queue.push(p); return; }
  const l = layer(); l.className = `pos-${p.position}`; const stack = l.querySelector(".nm-stack");
  stack.style.setProperty("--nm-w", p.width + "px");
  const item = document.createElement("div"); item.className = "nm-item" + (p.dismiss || !p.duration ? " clickable" : ""); item.style.setProperty("--nm-zoom", p.zoom / 100);
  item.innerHTML = cardHTML(p) + (p.duration ? '<div class="nm-timer"></div>' : "") + (p.dismiss || !p.duration ? '<div class="nm-hint">CLIQUER POUR FERMER</div>' : "");
  stack.appendChild(item); active.push(item);
  let done = false;
  const close = () => { if (done) return; done = true; item.classList.add("out"); setTimeout(() => { item.remove(); const i = active.indexOf(item); if (i >= 0) active.splice(i, 1); if (queue.length) showCard(queue.shift()); }, 380); };
  if (p.dismiss || !p.duration) item.addEventListener("click", close);
  if (p.duration) { const bar = item.querySelector(".nm-timer"); requestAnimationFrame(() => { bar.style.transition = `transform ${p.duration}s linear`; bar.style.transform = "scaleX(0)"; }); setTimeout(close, p.duration * 1000); }
  return close;
}

/* ───────────────── Journal (par compte : joueurs & MJ) — fenêtre système façon ORV ───────────────── */
const J_TABS = [["all", "TOUTES"], ["global", "GLOBALES"], ["perso", "PERSONNELLES"]];
/* couleur d'accent lisible sur fond marine (les thèmes sombres « noir », « nebula »… sont éclaircis) */
function jAccent(e) {
  if (e.vars?.["--t-side"]) return e.vars["--t-side"];
  const [h, s, l] = nmRgb2hsl(...nmHex2rgb(themeColor(e.theme)));
  const [r, g, b] = nmHsl2rgb(h, Math.min(1, s + .08), Math.max(l, s < .15 ? .72 : .6));
  return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
}
function jDay(ts) {
  const d = new Date(ts || 0), t = new Date(), day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(t) - day(d)) / 864e5);
  if (diff === 0) return "AUJOURD'HUI"; if (diff === 1) return "HIER";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", ...(d.getFullYear() === t.getFullYear() ? {} : { year: "numeric" }) }).toUpperCase();
}
const jTime = ts => new Date(ts || 0).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
class NotifJournal extends ApplicationV2 {
  static DEFAULT_OPTIONS = { id: "nm-journal", classes: ["nm-journal"], window: { title: "Journal des notifications", icon: "fa-solid fa-book-open", resizable: true, minimizable: true }, position: { width: 900, height: 780 } };
  tab = "all"; q = ""; sel = null; viewId = game.user?.id;
  get viewUser() { return game.users.get(this.viewId) ?? game.user; }
  get own() { return this.viewUser.id === game.user.id; }
  async _prepareContext() { return {}; }
  async _renderHTML() {
    if (!game.user.isGM) this.viewId = game.user.id; /* un joueur ne voit que son propre journal */
    const w = document.createElement("div"); w.className = "nm-jwrap";
    const users = game.user.isGM ? `<label class="nm-juser"><span>CANAL</span><select>${game.users.map(u => `<option value="${u.id}"${u.id === this.viewId ? " selected" : ""}>${esc(u.name)}${u.isGM ? " (MJ)" : ""}${u.id === game.user.id ? " — moi" : ""}</option>`).join("")}</select></label>` : "";
    w.innerHTML = `<header class="nm-jtop"><div class="nm-jbrand"><i class="nm-jdot"></i><b>SYSTÈME</b><span class="nm-jname"></span></div>
        <div class="nm-jannounce"></div>
        <div class="nm-jstats"><span class="k tot"><b></b>REÇUES</span><span class="k unr"><b></b>NON LUES</span></div>${users}</header>
      <section class="nm-jside">
        <label class="nm-jsearch"><i class="fa-solid fa-magnifying-glass"></i><input type="search" placeholder="Rechercher une notification…" value="${esc(this.q)}"><button type="button" class="x" title="Effacer la recherche">✕</button></label>
        <nav class="nm-jtabs">${J_TABS.map(([k, l]) => `<button type="button" data-tab="${k}">${l}<i></i><em></em></button>`).join("")}</nav>
        <div class="nm-journal-list"></div>
        <div class="nm-jtally"></div>
      </section>
      <section class="nm-jprev"></section>
      <footer class="nm-journal-foot"><button type="button" class="hot" data-a="read"><i class="fa-solid fa-check-double"></i>TOUT MARQUER LU</button>${game.user.isGM ? '<button type="button" data-a="tool"><i class="fa-solid fa-satellite-dish"></i>OUTIL DE DIFFUSION</button>' : ""}<button type="button" class="danger" data-a="clear"><i class="fa-solid fa-trash"></i>VIDER LE JOURNAL</button></footer>`;
    w.querySelector(".nm-juser select")?.addEventListener("change", ev => { this.viewId = ev.target.value; this.sel = null; this.refresh(true); });
    w.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => { this.tab = b.dataset.tab; this.refresh(true); }));
    const inp = w.querySelector(".nm-jsearch input");
    inp.addEventListener("input", ev => { this.q = ev.target.value; this.refresh(true); });
    w.querySelector(".nm-jsearch .x").addEventListener("click", ev => { ev.preventDefault(); this.q = ""; inp.value = ""; inp.focus(); this.refresh(); });
    w.querySelector('[data-a="read"]').addEventListener("click", () => jEdit(this.viewUser, j => j.some(e => !e.read) ? j.map(e => ({ ...e, read: true })) : false));
    w.querySelector('[data-a="clear"]').addEventListener("click", async () => {
      const u = this.viewUser, msg = this.own ? "Vider votre journal des notifications ?" : `Vider le journal de ${esc(u.name)} ?`;
      const D = foundry.applications?.api?.DialogV2;
      const ok = D ? await D.confirm({ window: { title: "Journal des notifications" }, content: `<p>${msg}</p>` }) : window.confirm(msg);
      if (ok) jEdit(u, () => []);
    });
    w.querySelector('[data-a="tool"]')?.addEventListener("click", () => openTool());
    this.root = w; this.refresh(); return w;
  }
  /* réaffiche la carte et marque l'entrée lue (son propre journal) */
  replay(e, show = true) {
    const u = this.viewUser;
    if (show) showCard(Object.assign({}, normalize(e), { dismiss: true }), true);
    if (this.own && !e.read) jEdit(u, j => j.map(x => jKey(x) === jKey(e) ? { ...x, read: true } : x));
  }
  remove(e) { if (this.sel === jKey(e)) this.sel = null; jEdit(this.viewUser, j => j.filter(x => jKey(x) !== jKey(e))); }
  /* reconstruit compteurs, liste et aperçu sans toucher au champ de recherche (garde le focus) */
  refresh(top = false) {
    const w = this.root; if (!w) return;
    const u = this.viewUser, all = jGet(u), unread = all.filter(e => !e.read).length;
    const q = this.q.trim().toLowerCase(), name = id => game.users.get(id)?.name ?? "";
    const inTab = (e, k) => k === "all" || e.scope === k;
    const rows = all.filter(e => inTab(e, this.tab) && (!q || `${e.text} ${e.cat?.nom ?? ""} ${e.name ?? ""} ${name(e.from)}`.toLowerCase().includes(q)));
    w.querySelector(".nm-jname").textContent = this.own ? "MON JOURNAL" : `JOURNAL · ${u.name.toUpperCase()}`;
    w.querySelector(".nm-jannounce").textContent = `[ ${unread ? `${unread} notification${unread > 1 ? "s" : ""} non lue${unread > 1 ? "s" : ""} en attente.` : "Aucune notification en attente."} ${all.length ? "Le canal des constellations reste ouvert." : "Le canal est silencieux."} ]`;
    w.querySelector(".nm-jstats .tot b").textContent = all.length;
    w.querySelector(".nm-jstats .unr b").textContent = unread;
    w.querySelector(".nm-jstats .unr").classList.toggle("on", !!unread);
    w.querySelector(".nm-jsearch").classList.toggle("has", !!this.q);
    w.querySelectorAll("[data-tab]").forEach(b => { const k = b.dataset.tab, sub = all.filter(e => inTab(e, k)), n = sub.filter(e => !e.read).length; b.classList.toggle("on", k === this.tab); b.querySelector("i").textContent = sub.length; b.querySelector("em").textContent = n || ""; });
    w.querySelector('[data-a="read"]').disabled = !unread;
    w.querySelector('[data-a="clear"]').disabled = !all.length;
    const t = this.window?.title; if (t instanceof HTMLElement) t.textContent = `Journal des notifications${unread && this.own ? ` (${unread})` : ""}`;
    if (!rows.some(e => jKey(e) === this.sel)) this.sel = rows[0] ? jKey(rows[0]) : null;
    w.querySelector(".nm-jtally").textContent = `${rows.length} / ${all.length} NOTIFICATION${all.length > 1 ? "S" : ""}`;
    const list = w.querySelector(".nm-journal-list"), y = top ? 0 : list.scrollTop; list.replaceChildren();
    if (!rows.length) list.innerHTML = `<div class="nm-journal-empty"><i class="fa-solid fa-satellite-dish"></i>${all.length ? "AUCUN RÉSULTAT" : "AUCUNE NOTIFICATION REÇUE"}<small>${all.length ? "[ Modifiez la recherche ou l'onglet. ]" : "[ Le canal des constellations est silencieux. ]"}</small></div>`;
    let day = null;
    for (const e of rows) {
      const dl = jDay(e.ts); if (dl !== day) { day = dl; const g = document.createElement("div"); g.className = "nm-jgroup"; g.textContent = dl; list.appendChild(g); }
      const row = document.createElement("div"), from = name(e.from), glob = e.scope === "global";
      row.className = "nm-jrow" + (e.read ? "" : " unread") + (jKey(e) === this.sel ? " on" : ""); row.style.setProperty("--jc", jAccent(e));
      row.innerHTML = `<div class="nm-jic">${esc(e.cat?.ic || "✦")}</div>
        <div class="nm-jbody"><div class="nm-jt">${renderMarkup(e.text)}</div>
          <small class="nm-jmeta">${e.read ? "" : '<b class="nm-jnew">NOUVELLE</b>'}<span class="nm-jcat">${esc(e.cat?.nom || "Système")}</span>${from ? `<span class="nm-jfrom">${esc(from)}</span>` : ""}</small></div>
        <div class="nm-je"><time>${esc(jTime(e.ts))}</time><span class="st-chip ${glob ? "g" : "p"}">${glob ? "GLOBALE" : "PERSO"}</span></div>
        <button type="button" class="nm-jdel" title="Supprimer cette entrée"><i class="fa-solid fa-xmark"></i></button>`;
      row.title = "Cliquer pour réafficher";
      row.addEventListener("click", () => { this.sel = jKey(e); list.querySelectorAll(".nm-jrow.on").forEach(r => r.classList.remove("on")); row.classList.add("on"); this.preview(e); this.replay(e, !this.root.querySelector(".nm-jprev")?.offsetParent); });   /* aperçu visible : la carte s'y affiche (RÉAFFICHER la rejoue à l'écran) ; fenêtre étroite : rejouée directement */
      row.querySelector(".nm-jdel").addEventListener("click", ev => { ev.stopPropagation(); this.remove(e); });
      list.appendChild(row);
    }
    list.scrollTop = y;
    this.preview(all.find(e => jKey(e) === this.sel));
  }
  /* volet de droite : carte complète (visible quand la fenêtre est assez large — requête de conteneur) */
  preview(e) {
    const p = this.root?.querySelector(".nm-jprev"); if (!p) return;
    const k = e ? `${this.viewId}|${jKey(e)}` : "";
    if (p.dataset.k !== k || !p.firstChild) {
      p.dataset.k = k;
      if (!e) { p.innerHTML = `<div class="nm-jnone"><i class="fa-regular fa-window-maximize"></i>AUCUNE NOTIFICATION SÉLECTIONNÉE</div>`; return; }
      const n = normalize(e), d = new Date(e.ts || 0), glob = e.scope === "global", from = game.users.get(e.from)?.name;
      const dest = e.targets === "all" || !Array.isArray(e.targets) ? "TOUS LES JOUEURS" : e.targets.map(id => game.users.get(id)?.name).filter(Boolean).join(", ") || "—";
      p.innerHTML = `<div class="nm-jwin" style="--jc:${esc(jAccent(e))}">
          <div class="nm-jwin-bar"><i class="dot"></i><span class="id">SYS::NOTIFICATION · ID#${esc(String(e.id).slice(-6).toUpperCase())}</span><span class="st-chip ${glob ? "g" : "p"}">${glob ? "GLOBALE" : "PERSONNELLE"}</span><span class="nm-jst"></span></div>
          <div class="nm-jhead"><div class="hex"><b>${esc(e.cat?.ic || "✦")}</b></div><div class="hd"><div class="kind">${esc((e.cat?.nom || "Système").toUpperCase())}</div>
            <div class="meta"><span><i class="fa-regular fa-clock"></i>${esc(d.toLocaleDateString("fr-FR"))} · ${esc(jTime(e.ts))}</span>${from ? `<span><i class="fa-solid fa-tower-broadcast"></i>${esc(from)}</span>` : ""}<span><i class="fa-solid fa-user-group"></i>${esc(dest)}</span></div></div></div>
        </div>
        <div class="nm-jview"><div class="nm-jcardview" title="Cliquer pour réafficher">${cardHTML(n)}</div></div>
        <div class="nm-jcard-act"><button type="button" data-p="replay"><i class="fa-solid fa-expand"></i>RÉAFFICHER</button><button type="button" class="danger" data-p="del"><i class="fa-solid fa-trash"></i>SUPPRIMER</button></div>`;
      const view = p.querySelector(".nm-jview"); this._ro?.disconnect(); this._ro = new ResizeObserver(() => this.fit()); this._ro.observe(view);
      p.querySelector('[data-p="replay"]').addEventListener("click", () => this.replay(e));
      p.querySelector(".nm-jcardview").addEventListener("click", () => this.replay(e));
      p.querySelector('[data-p="del"]').addEventListener("click", () => this.remove(e));
    }
    const st = p.querySelector(".nm-jst"); if (st && e) { st.className = "nm-jst st-chip " + (e.read ? "read" : "new"); st.textContent = e.read ? "LUE" : "NON LUE"; }
  }
  /* la carte garde ses proportions (rendu à 620 px) et est mise à l'échelle dans le volet */
  fit() {
    const v = this.root?.querySelector(".nm-jview"), f = v?.querySelector(".nm-jcardview"); if (!f || !v.clientWidth) return;
    f.style.zoom = 1; const s = Math.max(.3, Math.min(1.15, (v.clientWidth - 44) / f.offsetWidth, (v.clientHeight - 44) / f.offsetHeight));
    f.style.zoom = s.toFixed(3);
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }
  _onRender(c, o) { super._onRender?.(c, o); this.refresh(); }
  _onClose(o) { super._onClose?.(o); this._ro?.disconnect(); journal = null; }
}
let journal = null;
function openJournal() {
  if (!game.user.isGM && !game.settings.get(MID, "playersJournal")) return ui.notifications.warn("Le journal des notifications est désactivé par le MJ.");
  if (!journal) journal = new NotifJournal({ position: { width: Math.round(Math.max(420, Math.min(900, window.innerWidth * .7))), height: Math.round(Math.max(420, Math.min(780, window.innerHeight * .85))) } });
  journal.render({ force: true }); return journal;
}
/* pastille « non lues » sur le bouton des contrôles de scène */
function jBadge() {
  const n = jUnread();
  document.querySelectorAll('[data-tool="nm-journal"]').forEach(b => {
    let s = b.querySelector(".nm-badge"); if (!n) return s?.remove();
    if (!s) { s = document.createElement("span"); s.className = "nm-badge"; b.appendChild(s); }
    s.textContent = n > 99 ? "99+" : String(n);
  });
}
Hooks.on("renderSceneControls", () => jBadge());
const THEME_COLORS = { rouge: "#d42020", cramoisi: "#920018", sang: "#480008", "orange-alerte": "#b83c00", orange: "#cc5800", jaune: "#cc9e00", or: "#906800", vert: "#18a030", toxique: "#008800", emeraude: "#005c38", cyan: "#00b8cc", bleu: "#1e7ae8", "bleu-roi": "#141c80", turquoise: "#009278", acier: "#2a3440", violet: "#2a0080", "violet-doux": "#5820b8", plasma: "#440070", nebula: "#241050", rose: "#d820a0", blanc: "#888898", noir: "#181818" };
function themeColor(t) { return THEME_COLORS[t] || "#1e7ae8"; }

/* ───────────────── Contrôles & API ───────────────── */
Hooks.on("getSceneControlButtons", controls => {
  const tools = [];
  if (game.user.isGM) tools.push({ name: "nm-tool", title: "Notifications Manhwa — diffuser", icon: "fa-solid fa-satellite-dish", button: true, order: 90, onChange: () => openTool() });
  if (game.user.isGM || game.settings.get(MID, "playersJournal")) tools.push({ name: "nm-journal", title: "Journal des notifications", icon: "fa-solid fa-book-open", button: true, order: 91, onChange: () => openJournal() });
  if (Array.isArray(controls)) { const c = controls.find(c => c.name === "notes") || controls[0]; for (const t of tools) c.tools.push({ ...t, onClick: t.onChange }); }
  else { const c = controls.notes || controls.tokens; if (c) for (const t of tools) c.tools[t.name] = t; }
});

Hooks.once("ready", () => {
  game.socket.on(SOCK, data => {
    if (data?.type !== "show" || !data.payload) return;
    const p = normalize(data.payload); p.from = data.payload.from; p.ts = data.payload.ts || Date.now();
    const sender = game.users.get(p.from);
    if (!sender?.isGM && !game.settings.get(MID, "allowModuleApi")) return;
    receive(p);
  });
  layer();
  journalSync().then(jBadge);
  const mod = game.modules.get(MID);
  mod.api = {
    /** Diffuse une notification. opts : {text, theme, colors:{main,glow}, font, duration, dismiss, position, width, zoom, sound, soundPath, volume, chat, targets:'all'|[userIds], gmToo, top, bot, cat:{ic,nom}, image} */
    notify: opts => broadcast(Object.assign({ chat: false }, opts)),
    /** Affiche localement uniquement (aucune diffusion). */
    show: opts => showCard(Object.assign({}, normalize(opts), { dismiss: true }), true),
    open: openTool, openJournal,
    /** Journal par compte (drapeau du User). userId facultatif (défaut : soi ; le MJ peut lire/vider celui d'un joueur). */
    journal: { entries: id => jGet(id ? game.users.get(id) : game.user).map(e => ({ ...e })), unread: id => jUnread(id ? game.users.get(id) : game.user), markAllRead: id => jEdit(id ? game.users.get(id) : game.user, j => j.map(e => ({ ...e, read: true }))), clear: id => jEdit(id ? game.users.get(id) : game.user, () => []) },
    themes: THEMES, sounds: SOUNDS, fonts: FONTS, customVars: nmCustomVars
  };
  console.log(`${MID} | prêt`);
});
