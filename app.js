// SignBack: relearn ASL five minutes a day.
// Sign videos: ASL Signbank (CC BY-NC-SA 4.0). Everything else in this file is original.

const STORE_KEY = "signback.v1";
const INTERVALS = [0, 1, 2, 4, 7, 14, 30, 60, 120];
const SPEEDS = [1, 0.6, 0.35];
const SPEED_LABEL = { 1: "Normal", 0.6: "Slow", 0.35: "Slower" };
const REMINDER_TIMES = ["1800", "1830", "1900", "1930", "2000", "2030", "2100", "2130", "2200"];
const SIGNBANK = "https://aslsignbank.com/dictionary/gloss/";

let DATA, ITEMS = [], BYID = new Map(), DECKS = [], DECK_BY = new Map(), GRAMMAR = [];
let S = null;
let session = null;

/* ---------------- helpers ---------------- */
const app = document.getElementById("app");
const sheetRoot = document.getElementById("sheet-root");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function today() { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); }
function dayDate(n) { const d = new Date(n * 86400000); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); }
function plural(n, one, many) { return `${n} ${n === 1 ? one : many}`; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const ICON = {
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  slow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16c0-4 3-7 7-7s7 3 7 7H4z"/><path d="M18 14h1.5a2 2 0 0 0 0-4H18"/><path d="M7 16v2M15 16v2"/></svg>',
  mirror: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M8 7l-4 5 4 5V7zM16 7l4 5-4 5V7z"/></svg>',
  replay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4h4"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 2L4 14h6.5L9.5 22 20 9.5h-6.6L13.5 2z"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="11" fill="rgba(0,0,0,.45)"/><path d="M10 8l6 4-6 4z" fill="#fff"/></svg>',
  hand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 11.5V4a1.5 1.5 0 0 1 3 0v8"/><path d="M14 11.5V5.5a1.5 1.5 0 0 1 3 0V14"/><path d="M8 12.5l-1.4-1.4a1.6 1.6 0 0 0-2.3 2.2L8 17.6A6 6 0 0 0 12.4 20h.6a5 5 0 0 0 5-5v-2"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  face: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 9.5l2-.8M15.5 9.5l-2-.8M9 15.5c1.8 1.3 4.2 1.3 6 0"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
};

function logo(size = 26) {
  // A hand inside a return arrow: signing it again.
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="12" style="fill:var(--brand)"/><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M37.5 30.5 A15 15 0 1 1 30.5 10.8" stroke="#f2b33d" stroke-width="3.6"/><path d="M29.2 6.6 L31.2 11.2 L26.4 12.6" stroke="#f2b33d" stroke-width="3.6"/><g transform="translate(24.2 26) scale(0.98) translate(-11.2 -11.6)" stroke="#f4fbf9" stroke-width="2.2"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 11.5V4a1.5 1.5 0 0 1 3 0v8"/><path d="M14 11.5V5.5a1.5 1.5 0 0 1 3 0V14"/><path d="M8 12.5l-1.4-1.4a1.6 1.6 0 0 0-2.3 2.2L8 17.6A6 6 0 0 0 12.4 20h.6a5 5 0 0 0 5-5v-2"/></g></g></svg>`;
}

/* ---------------- faces (facial grammar illustrations) ---------------- */
function face(kind, size = 96) {
  const skin = "var(--marigold)", ink = "#2b1d02";
  let brows = '<path d="M30 40 q8 -4 15 0" /><path d="M55 40 q8 -4 15 0" />';
  let eyes = '<circle cx="38" cy="50" r="3.6" fill="' + ink + '"/><circle cx="62" cy="50" r="3.6" fill="' + ink + '"/>';
  let mouth = '<path d="M41 70 q9 5 18 0" />';
  let extra = "", tilt = 0;
  const wide = '<ellipse cx="38" cy="50" rx="5" ry="6" fill="#fff"/><ellipse cx="62" cy="50" rx="5" ry="6" fill="#fff"/><circle cx="38" cy="51" r="3.2" fill="' + ink + '"/><circle cx="62" cy="51" r="3.2" fill="' + ink + '"/>';
  switch (kind) {
    case "browsUp": brows = '<path d="M29 33 q8 -7 16 -1" /><path d="M55 32 q8 -6 16 1" />'; eyes = wide; tilt = -4; extra = '<path d="M84 22 v-9 M80 17 l4 -4 4 4" style="stroke:var(--text-soft)"/>'; break;
    case "browsDown": brows = '<path d="M30 40 q8 1 15 5" /><path d="M55 45 q7 -4 15 -5" />'; eyes = '<path d="M34 51 h8 M58 51 h8" stroke-width="3.5"/>'; tilt = 6; extra = '<path d="M84 13 v9 M80 18 l4 4 4 -4" style="stroke:var(--text-soft)"/>'; break;
    case "headShake": brows = '<path d="M30 41 q8 1 15 3" /><path d="M55 44 q7 -2 15 -3" />'; mouth = '<path d="M41 72 q9 -5 18 0" />'; extra = '<path d="M4 50 l-0 0 M10 38 q-8 12 0 24 M90 38 q8 12 0 24" style="stroke:var(--text-soft)"/>'; break;
    case "topic": brows = '<path d="M29 34 q8 -6 16 -1" /><path d="M55 33 q8 -5 16 1" />'; eyes = wide; tilt = -8; mouth = '<path d="M43 70 h14" />'; break;
    case "rhetorical": brows = '<path d="M29 34 q8 -6 16 -1" /><path d="M55 33 q8 -5 16 1" />'; eyes = wide; tilt = -3; extra = '<text x="80" y="24" font-size="22" font-weight="800" style="fill:var(--text-soft)" stroke="none">?</text>'; mouth = '<path d="M43 70 h14" />'; break;
    case "conditional": brows = '<path d="M29 34 q8 -6 16 -1" /><path d="M55 33 q8 -5 16 1" />'; eyes = wide; tilt = -6; mouth = '<path d="M43 70 h14" />'; extra = '<text x="74" y="22" font-size="15" font-weight="800" style="fill:var(--text-soft)" stroke="none">if</text>'; break;
    case "mouth": mouth = '<ellipse cx="50" cy="71" rx="9" ry="6.5" fill="' + ink + '"/>'; break;
    case "mm": mouth = '<path d="M40 70 q10 4 20 0" stroke-width="4"/><path d="M42 67 q8 -3 16 0" />'; break;
    case "oo": mouth = '<circle cx="50" cy="70" r="4.6" fill="' + ink + '"/>'; break;
    case "cha": mouth = '<path d="M38 66 q12 -3 24 0 q-2 14 -12 14 q-10 0 -12 -14z" fill="' + ink + '"/>'; brows = '<path d="M29 35 q8 -6 16 -1" /><path d="M55 34 q8 -5 16 1" />'; break;
    case "cs": mouth = '<rect x="38" y="65" width="24" height="9" rx="3" fill="#fff"/><path d="M44 65 v9 M50 65 v9 M56 65 v9" stroke-width="1.6"/>'; tilt = 12; break;
    case "th": mouth = '<path d="M40 68 h20" /><path d="M45 68 q5 9 10 0" fill="#d9677e" stroke="#d9677e"/>'; break;
    case "puff": mouth = '<path d="M44 70 h12" />'; extra = '<circle cx="27" cy="63" r="9" fill="none" stroke="' + ink + '" stroke-width="2.2"/><circle cx="73" cy="63" r="9" fill="none" stroke="' + ink + '" stroke-width="2.2"/>'; break;
    case "pah": mouth = '<ellipse cx="50" cy="71" rx="6" ry="7" fill="' + ink + '"/>'; extra = '<path d="M37 82 l-4 4 M50 85 v5 M63 82 l4 4" style="stroke:var(--text-soft)"/>'; break;
  }
  return `<svg class="face" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><g fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><g transform="rotate(${tilt} 50 55)"><circle cx="50" cy="55" r="36" style="fill:${skin}" stroke="none"/>${brows}${eyes}${mouth}</g>${extra}</g></svg>`;
}

/* ---------------- storage ---------------- */
function freshState() {
  return { v: 1, cards: {}, days: {}, grammar: {}, onboarded: false, installTipHidden: false,
    settings: { name: "", minutes: 5, newCap: 8, speed: 1, mirror: false, theme: "auto", reminder: "2000" } };
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      const f = freshState();
      return { ...f, ...s, settings: { ...f.settings, ...(s.settings || {}) } };
    }
  } catch (e) { /* storage unavailable */ }
  return freshState();
}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
function applyTheme() {
  const t = S.settings.theme;
  if (t === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
}

/* ---------------- scheduling ---------------- */
function cardOf(id) { return S.cards[id]; }
function statusOf(id) {
  const c = S.cards[id];
  if (!c) return "unseen";
  if (c.b >= 4) return "solid";
  return "learning";
}
function grade(id, g) {
  const t = today();
  const c = S.cards[id] || (S.cards[id] = { b: 0, due: t, first: t, reps: 0, lapses: 0 });
  c.last = t; c.reps = (c.reps || 0) + 1;
  if (g === "again") { c.lapses = (c.lapses || 0) + 1; c.b = 1; c.due = t + 1; }
  else if (g === "good") { c.b = Math.min(8, Math.max(1, c.b + 1)); c.due = t + INTERVALS[c.b]; }
  else if (g === "easy") { c.b = Math.min(8, Math.max(2, c.b + 2)); c.due = t + INTERVALS[c.b]; }
  logActivity();
  save();
}
function placeKnown(id) { const t = today(); S.cards[id] = { b: 4, due: t + INTERVALS[4], first: t, last: t, reps: 1, lapses: 0, placed: 1 }; logActivity(); save(); }
function placeUnknown(id) { const t = today(); S.cards[id] = { b: 0, due: t, first: t, last: t, reps: 0, lapses: 0 }; logActivity(); save(); }
function markLearned(id) { const t = today(); const c = S.cards[id] || (S.cards[id] = { first: t, reps: 0, lapses: 0 }); c.b = Math.max(1, c.b || 0); c.due = t + 1; c.last = t; save(); }
function nextLabel(id, g) {
  const c = S.cards[id] || { b: 0 };
  if (g === "again") return "tomorrow";
  const b = g === "easy" ? Math.min(8, Math.max(2, c.b + 2)) : Math.min(8, Math.max(1, c.b + 1));
  const d = INTERVALS[b];
  if (d <= 1) return "tomorrow";
  if (d < 14) return `in ${d} days`;
  if (d < 60) return `in ${Math.round(d / 7)} weeks`;
  return `in ${Math.round(d / 30)} months`;
}
function logActivity(secs = 0) {
  const t = today();
  const d = S.days[t] || (S.days[t] = { n: 0, s: 0 });
  if (!secs) d.n += 1; else d.s += secs;
}
function streak() {
  let t = today(), n = 0;
  if (!(S.days[t] && S.days[t].n > 0)) t -= 1;
  while (S.days[t] && S.days[t].n > 0) { n++; t--; }
  return n;
}
function counts(list = ITEMS) {
  let solid = 0, learning = 0, unseen = 0;
  for (const it of list) { const s = statusOf(it.id); if (s === "solid") solid++; else if (s === "learning") learning++; else unseen++; }
  return { solid, learning, unseen, total: list.length };
}
function dueList(deckKey) {
  const t = today();
  return ITEMS.filter((it) => (!deckKey || it.d === deckKey) && S.cards[it.id] && S.cards[it.id].b >= 1 && S.cards[it.id].due <= t)
    .sort((a, b) => S.cards[a.id].due - S.cards[b.id].due || S.cards[a.id].b - S.cards[b.id].b);
}
function toLearnList(deckKey) { return ITEMS.filter((it) => (!deckKey || it.d === deckKey) && S.cards[it.id] && S.cards[it.id].b === 0); }
function unseenList(deckKey) { return ITEMS.filter((it) => (!deckKey || it.d === deckKey) && !S.cards[it.id]); }

/* ---------------- video ---------------- */
const blobURLs = new Map();
function videoBlobURL(id) {
  if (blobURLs.has(id)) return blobURLs.get(id);
  const p = fetch(`videos/${id}.mp4`).then((r) => { if (!r.ok) throw new Error("missing"); return r.blob(); })
    .then((b) => URL.createObjectURL(new Blob([b], { type: "video/mp4" })));
  p.catch(() => blobURLs.delete(id));
  blobURLs.set(id, p);
  if (blobURLs.size > 60) {
    const [oldId, oldP] = blobURLs.entries().next().value;
    blobURLs.delete(oldId);
    oldP.then((u) => setTimeout(() => URL.revokeObjectURL(u), 30000)).catch(() => {});
  }
  return p;
}
function prefetch(id) { if (id) videoBlobURL(id).catch(() => {}); }

function stage(id, { hidden = false, badge = "" } = {}) {
  const wrap = el(`<div class="stage ${S.settings.mirror ? "mirror" : ""} ${hidden ? "stage-hidden" : ""}">
      ${hidden ? '<div class="veil">Sign it yourself first,<br>then check.</div>' : '<video muted playsinline loop autoplay preload="auto" aria-label="Sign video"></video><div class="loading">Loading sign…</div><button class="tapzone" aria-label="Replay sign"></button>'}
      ${badge ? `<span class="badge">${esc(badge)}</span>` : ""}
    </div>`);
  if (!hidden) setStageVideo(wrap, id);
  return wrap;
}
function setStageVideo(wrap, id) {
  const v = wrap.querySelector("video");
  const loading = wrap.querySelector(".loading");
  if (!v) return;
  wrap.dataset.id = id;
  if (loading) { loading.hidden = false; loading.textContent = "Loading sign…"; }
  videoBlobURL(id).then((u) => {
    if (wrap.dataset.id != String(id)) return;
    v.src = u;
    v.playbackRate = S.settings.speed;
    v.defaultPlaybackRate = S.settings.speed;
    const p = v.play(); if (p && p.catch) p.catch(() => {});
    v.addEventListener("loadeddata", () => { if (loading) loading.hidden = true; v.playbackRate = S.settings.speed; }, { once: true });
  }).catch(() => { if (loading) loading.textContent = "This video didn't load. Check your connection."; });
  const tz = wrap.querySelector(".tapzone");
  if (tz) tz.onclick = () => { v.currentTime = 0; v.play().catch(() => {}); };
}
function revealStage(wrap, id) {
  const fresh = stage(id);
  wrap.replaceWith(fresh);
  return fresh;
}
function videoControls(getStage) {
  const row = el(`<div class="vcontrols">
    <button class="chip" data-a="speed">${ICON.slow}<span>${SPEED_LABEL[S.settings.speed] || "Normal"}</span></button>
    <button class="chip" data-a="mirror" aria-pressed="${S.settings.mirror}">${ICON.mirror}<span>Mirror</span></button>
    <button class="chip" data-a="replay">${ICON.replay}<span>Replay</span></button>
  </div>`);
  row.onclick = (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const st = getStage(); const v = st && st.querySelector("video");
    if (b.dataset.a === "speed") {
      const i = (SPEEDS.indexOf(S.settings.speed) + 1) % SPEEDS.length;
      S.settings.speed = SPEEDS[i]; save();
      b.querySelector("span").textContent = SPEED_LABEL[S.settings.speed];
      if (v) { v.playbackRate = S.settings.speed; v.defaultPlaybackRate = S.settings.speed; }
    } else if (b.dataset.a === "mirror") {
      S.settings.mirror = !S.settings.mirror; save();
      b.setAttribute("aria-pressed", S.settings.mirror);
      if (st) st.classList.toggle("mirror", S.settings.mirror);
    } else if (b.dataset.a === "replay" && v) { v.currentTime = 0; v.play().catch(() => {}); }
  };
  return row;
}
function altsRow(item, getStage) {
  if (!item.a || !item.a.length) return null;
  const row = el(`<div class="alts"><span>Other ways:</span></div>`);
  const ids = [item.id, ...item.a];
  ids.forEach((vid, i) => {
    const b = el(`<button class="chip" aria-pressed="${i === 0}">${i === 0 ? "Main" : "Version " + (i + 1)}</button>`);
    b.onclick = () => {
      row.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      const st = getStage(); if (st) setStageVideo(st, vid);
    };
    row.append(b);
  });
  return row;
}

/* ---------------- routing ---------------- */
function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
window.addEventListener("hashchange", () => render());
function render() {
  closeSheet();
  if (session && !location.hash.startsWith("#/session")) endSessionSilently();
  const h = location.hash || "#/";
  window.scrollTo(0, 0);
  if (!S.onboarded && !h.startsWith("#/settings")) return renderWelcome();
  if (h.startsWith("#/deck/")) return renderDeck(decodeURIComponent(h.slice(7)));
  if (h.startsWith("#/grammar/")) return renderBite(decodeURIComponent(h.slice(10)));
  if (h.startsWith("#/settings")) return renderSettings();
  if (h.startsWith("#/session")) return session ? renderCard() : go("#/");
  if (h.startsWith("#/done")) return renderDone();
  return renderHome();
}

/* ---------------- welcome ---------------- */
function renderWelcome() {
  app.innerHTML = "";
  const v = el(`<div class="welcome">
    <div class="topbar"><div class="wordmark">${logo()}SignBack</div></div>
    <div class="art">${welcomeArt()}</div>
    <h1>Get your ASL back.</h1>
    <p class="lead">Five minutes a day with real signers on video. SignBack finds what you still remember and spends your time on what you don't.</p>
    <ul class="steps">
      <li>${ICON.check}<div><b>Check what you know.</b>Watch a sign and say whether you know it. Signs you remember get set aside.</div></li>
      <li>${ICON.hand}<div><b>Relearn the rest.</b>Copy each new sign with your hands, then see it again right before you'd forget it.</div></li>
      <li>${ICON.face}<div><b>Get the face right.</b>Short lessons on the eyebrows, head shakes and mouth shapes that carry ASL grammar.</div></li>
    </ul>
    <div class="push">
      <label class="sr-only" for="nm">Your first name</label>
      <input id="nm" class="textin" placeholder="Your first name (optional)" autocomplete="given-name">
      <button class="btn btn-primary btn-wide" id="go">Start my first 5 minutes</button>
    </div>
  </div>`);
  app.append(v);
  const hello = ITEMS.find((i) => i.l === "hello");
  if (hello) {
    const vid = el(`<video muted playsinline loop autoplay preload="auto" aria-label="A signer signs hello"></video>`);
    videoBlobURL(hello.id).then((u) => { vid.src = u; vid.play().catch(() => {}); v.querySelector(".art").append(vid); }).catch(() => {});
  }
  v.querySelector("#go").onclick = () => {
    S.settings.name = v.querySelector("#nm").value.trim().slice(0, 30);
    S.onboarded = true; save();
    startSession("daily");
  };
}
function welcomeArt() {
  return `<svg viewBox="0 0 240 180" aria-hidden="true"><g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M62 132c14 22 54 30 82 14" stroke="#f2b33d" stroke-width="7"/><path d="M140 140l8 9-11 5" stroke="#f2b33d" stroke-width="7"/>
    <g stroke="#f4fbf9" stroke-width="6"><path d="M78 108V52a9 9 0 0 1 18 0v44m0-50a9 9 0 0 1 18 0v50m0-40a9 9 0 0 1 18 0v52c0 22-14 36-35 36-13 0-22-6-29-15L64 102a11 11 0 0 1 16-15"/></g>
    <circle cx="176" cy="58" r="22" fill="#f2b33d" stroke="none"/><path d="M167 52q4-3 8 0M181 52q4-3 8 0" stroke="#2b1d02" stroke-width="3"/><path d="M168 66q8 6 16 0" stroke="#2b1d02" stroke-width="3"/>
  </g></svg>`;
}

/* ---------------- home ---------------- */
function partOfDay() { const h = new Date().getHours(); return h < 4 || h >= 17 ? "evening" : h < 12 ? "morning" : "afternoon"; }
function renderHome() {
  app.innerHTML = "";
  const t = today();
  const due = dueList().length, learnN = toLearnList().length, unseen = unseenList();
  const doneToday = S.days[t] && S.days[t].n > 0;
  const name = S.settings.name ? `, ${esc(S.settings.name)}` : "";
  const pod = partOfDay();
  const title = doneToday ? "Done for today" : pod === "evening" ? "Tonight's 5 minutes" : pod === "morning" ? "This morning's 5 minutes" : "Today's 5 minutes";
  let plan;
  const nextDeck = unseen.length ? DECK_BY.get(unseen[0].d) : null;
  if (due && unseen.length) plan = `${plural(due, "sign", "signs")} to review, then new signs from ${nextDeck.title}.`;
  else if (due) plan = `${plural(due, "sign", "signs")} to review.`;
  else if (learnN) plan = `${plural(learnN, "sign", "signs")} waiting to be relearned.`;
  else if (unseen.length) plan = `New signs from ${nextDeck.title}.`;
  else plan = "You're caught up. Practice a topic or a grammar lesson.";
  if (doneToday) plan = `You practiced today. ${due ? "There's more to review if you want it." : "Extra rounds still help."}`;

  const c = counts();
  const st = streak();
  const view = el(`<div>
    <div class="topbar"><div class="wordmark">${logo()}SignBack</div><button class="icon-btn" id="gear" aria-label="Settings">${ICON.gear}</button></div>
    <p class="greeting">Good ${pod}${name}.</p>
    <section class="tonight">
      <h1>${title}</h1>
      <p class="plan">${esc(plan)}</p>
      <button class="btn btn-primary" id="start">${doneToday ? "Go another 5 minutes" : "Start"}</button>
    </section>
    ${unseen.length > 40 ? `<button class="speedcheck" id="speed">${ICON.bolt}<div><b>Speed check</b><span>Fly through signs to mark the ones you already know. ${unseen.length} left to check.</span></div></button>` : ""}
    ${installTip()}
    <section class="section">
      <div class="section-head"><h2>This week</h2></div>
      ${weekStrip()}
      <p class="streak-line">${st ? `${plural(st, "day", "days")} in a row.` : "Practice today to start a streak."}</p>
    </section>
    <section class="section">
      <div class="section-head"><h2>Your signs</h2><span class="small soft">${c.total} total</span></div>
      <div class="meter" role="img" aria-label="${c.solid} solid, ${c.learning} learning, ${c.unseen} not checked yet"><i class="m-solid" style="width:${(c.solid / c.total) * 100}%"></i><i class="m-learning" style="width:${(c.learning / c.total) * 100}%"></i></div>
      <div class="legend"><span class="l-solid">${c.solid} solid</span><span class="l-learning">${c.learning} learning</span><span>${c.unseen} not checked yet</span></div>
    </section>
    <section class="section">
      <div class="section-head"><h2>Topics</h2></div>
      <div class="search">${ICON.search}<input id="q" type="search" placeholder="Look up a sign" aria-label="Look up a sign" autocomplete="off"></div>
      <ul class="rows" id="results" hidden></ul>
      <ul class="rows" id="decks"></ul>
    </section>
    <section class="section">
      <div class="section-head"><h2>Facial grammar</h2></div>
      <ul class="rows" id="bites"></ul>
    </section>
    <p class="credits" style="margin-top:34px">Sign videos from <a href="https://aslsignbank.com" target="_blank" rel="noopener">ASL Signbank</a>, shared under CC BY-NC-SA 4.0. Details in settings.</p>
  </div>`);
  app.append(view);
  view.querySelector("#gear").onclick = () => go("#/settings");
  view.querySelector("#start").onclick = () => startSession("daily");
  const sp = view.querySelector("#speed"); if (sp) sp.onclick = () => startSession("speed");
  const it = view.querySelector("#install-x"); if (it) it.onclick = () => { S.installTipHidden = true; save(); it.closest(".speedcheck").remove(); };

  const decksUl = view.querySelector("#decks");
  for (const d of DECKS) {
    const list = ITEMS.filter((i) => i.d === d.key);
    const k = counts(list);
    const li = el(`<li><button class="row"><span class="t">${esc(d.title)}</span><span class="s">${esc(d.sub)}</span>
      <span class="n"><span class="bar"><i class="m-solid" style="width:${(k.solid / k.total) * 100}%;background:var(--solid)"></i><i style="width:${(k.learning / k.total) * 100}%;background:var(--learning)"></i></span>${k.solid}/${k.total}</span></button></li>`);
    li.querySelector("button").onclick = () => go(`#/deck/${d.key}`);
    decksUl.append(li);
  }
  const bitesUl = view.querySelector("#bites");
  for (const b of GRAMMAR) {
    const done = (S.grammar[b.id] && S.grammar[b.id].best) || 0;
    const li = el(`<li><button class="row with-face">${face(b.face, 42)}<span class="t">${esc(b.title)}</span><span class="s">${esc(b.short)}</span><span class="n">${done}/${b.drills.length}</span></button></li>`);
    li.querySelector("button").onclick = () => go(`#/grammar/${b.id}`);
    bitesUl.append(li);
  }
  const q = view.querySelector("#q"), res = view.querySelector("#results");
  q.oninput = () => {
    const s = q.value.trim().toLowerCase();
    if (!s) { res.hidden = true; decksUl.hidden = false; return; }
    const hits = ITEMS.filter((i) => i.l.toLowerCase().includes(s) || (i.k || []).some((k) => k.toLowerCase().startsWith(s)))
      .sort((a, b) => (a.l.toLowerCase().startsWith(s) ? 0 : 1) - (b.l.toLowerCase().startsWith(s) ? 0 : 1)).slice(0, 30);
    res.innerHTML = "";
    if (!hits.length) res.append(el(`<li><p class="soft" style="padding:12px 0">No sign for “${esc(q.value.trim())}” in SignBack yet. Try a simpler word.</p></li>`));
    for (const i of hits) {
      const li = el(`<li><button class="row"><span class="t">${esc(i.l)}</span><span class="s">${esc(DECK_BY.get(i.d).title)}</span><span class="n">${statusWord(i.id)}</span></button></li>`);
      li.querySelector("button").onclick = () => openSignSheet(i.id);
      res.append(li);
    }
    res.hidden = false; decksUl.hidden = true;
  };
}
function statusWord(id) { const s = statusOf(id); return s === "solid" ? "Solid" : s === "learning" ? "Learning" : "New"; }
function weekStrip() {
  const t = today();
  let out = '<div class="week" role="list">';
  for (let i = 6; i >= 0; i--) {
    const n = t - i, d = dayDate(n);
    const done = S.days[n] && S.days[n].n > 0;
    const lbl = d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2);
    out += `<div class="day ${done ? "done" : ""} ${i === 0 ? "today" : ""}" role="listitem" aria-label="${d.toLocaleDateString(undefined, { weekday: "long" })}${done ? ", practiced" : ""}"><span class="dot">${done ? ICON.check : ""}</span>${lbl}</div>`;
  }
  return out + "</div>";
}
function isStandalone() { return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; }
function installTip() {
  if (isStandalone() || S.installTipHidden) return "";
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const how = ios ? "In Safari, tap the Share button, then Add to Home Screen." : "In Chrome, open the menu, then tap Install app or Add to Home screen.";
  return `<div class="speedcheck" style="margin-top:12px">${ICON.hand}<div><b>Put SignBack on your home screen</b><span>${how} It opens like an app and works offline.</span></div><button class="icon-btn" id="install-x" aria-label="Hide this tip">${ICON.close}</button></div>`;
}

/* ---------------- sessions ---------------- */
function startSession(kind, deckKey = null) {
  const t = today();
  const s = { kind, deck: deckKey, queue: [], inserts: [], n: 0, learned: 0, checked: 0, known: 0, reviewed: 0,
    limit: (kind === "speed" ? 3 : S.settings.minutes) * 60, elapsed: 0, lastTick: performance.now(), cap: S.settings.newCap, ended: false };
  if (kind === "speed") {
    s.queue = unseenList(deckKey).slice(0, 250).map((i) => ({ type: "check", id: i.id }));
  } else {
    const due = dueList(deckKey).slice(0, 60).map((i) => {
      const c = S.cards[i.id];
      const type = c.b <= 2 ? "recv" : (c.reps % 2 ? "expr" : "recv");
      return { type, id: i.id };
    });
    shuffle(due);
    const learns = toLearnList(deckKey).slice(0, s.cap).map((i) => ({ type: "learn", id: i.id }));
    const checks = unseenList(deckKey).slice(0, 200).map((i) => ({ type: "check", id: i.id }));
    // learn first, then mix: four reviews, one new check
    const q = [...learns];
    let r = 0, c = 0;
    while (r < due.length || c < checks.length) {
      for (let k = 0; k < 4 && r < due.length; k++) q.push(due[r++]);
      if (c < checks.length) q.push(checks[c++]);
      if (r >= due.length) { while (c < checks.length) q.push(checks[c++]); }
    }
    s.queue = q;
  }
  if (!s.queue.length) { toast("Nothing to practice here right now."); return; }
  session = s;
  go("#/session");
}
function tick() {
  if (!session) return;
  const now = performance.now();
  if (document.visibilityState === "visible") session.elapsed += (now - session.lastTick) / 1000;
  session.lastTick = now;
  const bar = document.querySelector(".timebar i");
  if (bar) bar.style.width = Math.min(100, (session.elapsed / session.limit) * 100) + "%";
}
setInterval(tick, 1000);
document.addEventListener("visibilitychange", () => { if (session) session.lastTick = performance.now(); });

function isNewWork(card) { return card.type === "check" || card.type === "learn"; }
function nextCard() {
  const s = session;
  if (s.elapsed >= s.limit && s.n > 0) return null;
  const ready = s.inserts.findIndex((x) => x.at <= s.n);
  if (ready >= 0) return s.inserts.splice(ready, 1)[0].card;
  while (s.queue.length) {
    const c = s.queue[0];
    if (c.type === "check" && S.cards[c.id]) { s.queue.shift(); continue; }
    if (c.type === "learn" && s.learned >= s.cap) { s.queue.shift(); continue; }
    return s.queue.shift();
  }
  if (s.inserts.length) return s.inserts.shift().card;
  return null;
}
function peekId() {
  const s = session; if (!s) return null;
  const ready = s.inserts.find((x) => x.at <= s.n + 1);
  if (ready) return ready.card.id;
  return s.queue[0] ? s.queue[0].id : null;
}
function endSessionSilently() { if (session && !session.ended) { logActivity(Math.round(session.elapsed)); save(); } session = null; }
function finishSession() {
  const s = session; if (!s) return go("#/");
  s.ended = true;
  logActivity(Math.round(s.elapsed)); save();
  lastSummary = { checked: s.checked, known: s.known, learned: s.learned, reviewed: s.reviewed, kind: s.kind, deck: s.deck };
  session = null;
  go("#/done");
}
let lastSummary = null;
let current = null;

function renderCard() {
  const s = session;
  current = nextCard();
  if (!current) return finishSession();
  app.innerHTML = "";
  const item = BYID.get(current.id);
  const top = el(`<div class="session-top"><button class="icon-btn" id="x" aria-label="End session">${ICON.close}</button><div class="timebar" role="progressbar" aria-label="Session time"><i style="width:${Math.min(100, (s.elapsed / s.limit) * 100)}%"></i></div><span class="count">${s.n + 1}</span></div>`);
  top.querySelector("#x").onclick = () => finishSession();
  app.append(top);
  const view = el(`<div class="flash"></div>`);
  app.append(view);
  const type = current.type;
  if (type === "check") renderCheck(view, item);
  else if (type === "learn") renderLearn(view, item, "New to you. Copy it twice with your hands.");
  else if (type === "recv" || type === "recheck") renderRecv(view, item, type === "recheck");
  else if (type === "expr") renderExpr(view, item);
  prefetch(peekId());
}
function advance() { session.n++; renderCard(); }
function insertLater(card, gap) { session.inserts.push({ at: session.n + gap, card }); }

function renderCheck(view, item) {
  let st = stage(item.id);
  view.append(st, videoControls(() => st));
  const prompt = el(`<p class="prompt">Know this one?</p>`);
  const zone = el(`<div class="answer-zone"></div>`);
  const actions = el(`<div class="actions"><div class="grade"><button class="btn btn-quiet" data-g="none">No idea</button><button class="btn btn-quiet" data-g="unsure">Not sure</button><button class="btn btn-primary" data-g="know">I know it</button></div></div>`);
  view.append(prompt, zone, actions);
  actions.onclick = (e) => {
    const b = e.target.closest("button"); if (!b) return;
    session.checked++;
    if (b.dataset.g === "know") {
      zone.innerHTML = `<div class="word flash">${esc(item.l)}</div>`;
      prompt.textContent = "Were you right?";
      actions.innerHTML = `<div class="grade two"><button class="btn btn-missed" data-g="no">No</button><button class="btn btn-primary" data-g="yes">Yes</button></div>`;
      actions.onclick = (e2) => {
        const b2 = e2.target.closest("button"); if (!b2) return;
        if (b2.dataset.g === "yes") { placeKnown(item.id); session.known++; advance(); }
        else { failCheck(view, item, st); }
      };
    } else {
      failCheck(view, item, st);
    }
  };
}
function failCheck(view, item, st) {
  placeUnknown(item.id);
  if (session.kind === "speed") { advance(); return; }
  view.innerHTML = "";
  if (session.learned >= session.cap) {
    view.append(st, videoControls(() => st));
    const v = st.querySelector("video"); if (v) v.play().catch(() => {});
    view.append(el(`<div class="answer-zone"><div class="word ${item.l.length > 14 ? "mid" : ""}">${esc(item.l)}</div><p class="prompt" style="margin-top:12px">Saved for your next session. You've learned enough new signs for one sitting.</p></div>`));
    const actions = el(`<div class="actions"><button class="btn btn-primary btn-wide">Next</button></div>`);
    actions.querySelector("button").onclick = () => advance();
    view.append(actions);
    return;
  }
  renderLearn(view, item, "Here it is. Copy it twice with your hands.", st);
}
function renderLearn(view, item, msg, existingStage) {
  let st = existingStage || stage(item.id);
  view.append(st, videoControls(() => st));
  if (existingStage) { const v = st.querySelector("video"); if (v) v.play().catch(() => {}); }
  const alts = altsRow(item, () => st);
  if (alts) view.append(alts);
  view.append(el(`<div class="answer-zone"><div class="word ${item.l.length > 14 ? "mid" : ""}">${esc(item.l)}</div><p class="prompt" style="margin-top:12px">${esc(msg)}</p></div>`));
  const actions = el(`<div class="actions"><button class="btn btn-primary btn-wide">Got it</button></div>`);
  view.append(actions);
  actions.querySelector("button").onclick = () => {
    markLearned(item.id);
    session.learned++;
    insertLater({ type: "recheck", id: item.id }, 4);
    advance();
  };
}
function gradeButtons(item, twoOnly, onGrade) {
  const wrap = el(`<div class="grade ${twoOnly ? "two" : ""}">
    <button class="btn btn-missed" data-g="again">Missed<small>see it again</small></button>
    <button class="btn btn-primary" data-g="good">Got it<small>${twoOnly ? "nice" : nextLabel(item.id, "good")}</small></button>
    ${twoOnly ? "" : `<button class="btn btn-easy" data-g="easy">Easy<small>${nextLabel(item.id, "easy")}</small></button>`}
  </div>`);
  wrap.onclick = (e) => { const b = e.target.closest("button"); if (b) onGrade(b.dataset.g); };
  return wrap;
}
function renderRecv(view, item, isRecheck) {
  let st = stage(item.id);
  view.append(st, videoControls(() => st));
  const prompt = el(`<p class="prompt">What does this mean?</p>`);
  const zone = el(`<div class="answer-zone"></div>`);
  const actions = el(`<div class="actions"><button class="btn btn-primary btn-wide">Show answer</button></div>`);
  view.append(prompt, zone, actions);
  actions.querySelector("button").onclick = () => {
    zone.innerHTML = `<div class="word flash ${item.l.length > 14 ? "mid" : ""}">${esc(item.l)}</div>`;
    const alts = altsRow(item, () => st); if (alts) zone.append(alts);
    prompt.textContent = "Did you know it?";
    actions.innerHTML = "";
    actions.append(gradeButtons(item, isRecheck, (g) => onGraded(item, g, isRecheck)));
  };
}
function renderExpr(view, item) {
  let st = stage(item.id, { hidden: true });
  view.append(st);
  const zone = el(`<div class="answer-zone"><p class="prompt">How do you sign</p><div class="word ${item.l.length > 14 ? "mid" : ""}">${esc(item.l)}</div></div>`);
  const actions = el(`<div class="actions"><button class="btn btn-primary btn-wide">Show the sign</button></div>`);
  view.append(zone, actions);
  actions.querySelector("button").onclick = () => {
    st = revealStage(st, item.id);
    st.after(videoControls(() => st));
    const alts = altsRow(item, () => st); if (alts) zone.append(alts);
    actions.innerHTML = "";
    actions.append(gradeButtons(item, false, (g) => onGraded(item, g, false)));
  };
}
function onGraded(item, g, isRecheck) {
  if (isRecheck) {
    if (g === "again") { session.inserts.unshift({ at: session.n + 1, card: { type: "learn", id: item.id } }); }
    advance();
    return;
  }
  grade(item.id, g);
  session.reviewed++;
  if (g === "again") insertLater({ type: "recheck", id: item.id }, 3);
  advance();
}

function renderDone() {
  const s = lastSummary || { checked: 0, known: 0, learned: 0, reviewed: 0 };
  app.innerHTML = "";
  const pod = partOfDay();
  const head = pod === "evening" ? "Done for tonight." : "Nice work.";
  const bits = [];
  if (s.checked) bits.push(`You checked ${plural(s.checked, "sign", "signs")} and already knew ${s.known}.`);
  if (s.learned) bits.push(`${plural(s.learned, "sign", "signs")} relearned. They'll come back tomorrow.`);
  if (s.reviewed) bits.push(`${plural(s.reviewed, "review", "reviews")} done.`);
  const view = el(`<div>
    <div class="topbar"><div class="wordmark">${logo()}SignBack</div></div>
    <div class="done-hero"><h1>${head}</h1><p class="soft" style="margin-top:10px">${esc(bits.join(" ") || "Every minute counts.")}</p></div>
    <div class="stats"><div class="stat"><b>${s.known}</b><span>knew already</span></div><div class="stat"><b>${s.learned}</b><span>relearned</span></div><div class="stat"><b>${s.reviewed}</b><span>reviewed</span></div></div>
    <section class="section" style="margin-top:8px">${weekStrip()}<p class="streak-line">${streak() ? `${plural(streak(), "day", "days")} in a row.` : ""}</p></section>
    <div class="actions" style="position:static;background:none"><button class="btn btn-primary btn-wide" id="home">Back to home</button><button class="btn btn-ghost btn-wide" id="more">Go another 5 minutes</button></div>
  </div>`);
  app.append(view);
  view.querySelector("#home").onclick = () => go("#/");
  view.querySelector("#more").onclick = () => startSession(s.kind === "speed" ? "speed" : "daily", s.deck || null);
}

/* ---------------- decks & sign sheet ---------------- */
function renderDeck(key) {
  const d = DECK_BY.get(key); if (!d) return go("#/");
  const list = ITEMS.filter((i) => i.d === key);
  const k = counts(list);
  app.innerHTML = "";
  const view = el(`<div>
    <div class="topbar"><button class="back" id="back">${ICON.back}Home</button></div>
    <h1>${esc(d.title)}</h1>
    <p class="soft" style="margin-top:6px">${esc(d.sub)}. ${k.solid} solid, ${k.learning} learning, ${k.unseen} not checked yet.</p>
    <button class="btn btn-primary btn-wide" id="practice" style="margin-top:18px">Practice this topic</button>
    <ul class="rows" id="list" style="margin-top:14px"></ul>
  </div>`);
  app.append(view);
  view.querySelector("#back").onclick = () => go("#/");
  view.querySelector("#practice").onclick = () => startSession("daily", key);
  const ul = view.querySelector("#list");
  for (const i of list) {
    const stt = statusOf(i.id);
    const dot = stt === "solid" ? "var(--solid)" : stt === "learning" ? "var(--learning)" : "var(--unseen)";
    const li = el(`<li><button class="row"><span class="t">${esc(i.l)}</span><span class="n"><span style="width:10px;height:10px;border-radius:50%;background:${dot};display:inline-block"></span>${statusWord(i.id)}</span></button></li>`);
    li.querySelector("button").onclick = () => openSignSheet(i.id);
    ul.append(li);
  }
}
function closeSheet() { sheetRoot.innerHTML = ""; document.body.style.overflow = ""; }
function openSheet(content) {
  closeSheet();
  const scrim = el(`<div class="scrim"></div>`);
  const sh = el(`<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div></div>`);
  sh.append(content);
  scrim.onclick = closeSheet;
  sheetRoot.append(scrim, sh);
  document.body.style.overflow = "hidden";
  const onKey = (e) => { if (e.key === "Escape") { closeSheet(); document.removeEventListener("keydown", onKey); } };
  document.addEventListener("keydown", onKey);
  return sh;
}
function openSignSheet(id) {
  const item = BYID.get(id); if (!item) return;
  const c = S.cards[id];
  let status = "Not checked yet.";
  if (c) {
    const days = c.due - today();
    status = (c.b >= 4 ? "Solid. " : "Learning. ") + (c.b === 0 ? "Waiting to be relearned." : days <= 0 ? "Due for review now." : days === 1 ? "Next review tomorrow." : `Next review in ${days} days.`);
  }
  const box = el(`<div></div>`);
  let st = stage(id);
  box.append(st, videoControls(() => st));
  const alts = altsRow(item, () => st);
  box.append(el(`<div class="word">${esc(item.l)}</div>`));
  box.append(el(`<p class="soft small">${esc(DECK_BY.get(item.d).title)}. ${esc(status)}</p>`));
  if (alts) box.append(alts);
  box.append(el(`<p class="credits" style="margin-top:16px"><a href="${SIGNBANK}${id}.html" target="_blank" rel="noopener">See this sign on ASL Signbank</a></p>`));
  const closeBtn = el(`<button class="btn btn-quiet btn-wide" style="margin-top:16px">Close</button>`);
  closeBtn.onclick = closeSheet;
  box.append(closeBtn);
  openSheet(box);
}

/* ---------------- grammar ---------------- */
function glossHTML(nodes) {
  return nodes.map((n) => {
    if (n.tag) return `<span class="seg nmm" data-tag="${esc(n.tag)}">${glossHTML(n.parts)}</span>`;
    if (n.id) return `<button class="gw" data-id="${n.id}">${esc(n.w)}</button>`;
    return `<span class="gw point" title="Point or fingerspell">${esc(n.w)}</span>`;
  }).join("");
}
function renderBite(id) {
  const b = GRAMMAR.find((x) => x.id === id); if (!b) return go("#/");
  app.innerHTML = "";
  const view = el(`<div>
    <div class="topbar"><button class="back" id="back">${ICON.back}Home</button></div>
    <div class="bite-hero">${face(b.face, 96)}<div><h1>${esc(b.title)}</h1><p>${esc(b.short)}</p></div></div>
    <p class="rule">${esc(b.rule)}</p>
    ${b.shapes ? `<div class="shapes">${b.shapes.map((sh) => `<div class="shape">${face(sh.k, 52)}<div><b>${esc(sh.name)}<em>${esc(sh.means)}</em></b><span>${esc(sh.how)}</span></div></div>`).join("")}</div>` : ""}
    <p class="tip">${esc(b.tip)}</p>
    ${b.clips.length ? `<section class="section"><div class="section-head"><h2>Watch it</h2></div><div class="clips" id="clips"></div><p class="credits" style="margin-top:10px">Videos by Dr. Bill Vicars, <a href="https://www.lifeprint.com" target="_blank" rel="noopener">Lifeprint.com</a>, played from YouTube.</p></section>` : ""}
    <section class="section"><div class="section-head"><h2>Your turn</h2><span class="small soft" id="dcount"></span></div><div id="drill"></div></section>
  </div>`);
  app.append(view);
  view.querySelector("#back").onclick = () => go("#/");
  const clips = view.querySelector("#clips");
  if (clips) for (const c of b.clips) {
    const card = el(`<button class="clip"><div class="thumb" style="background-image:url('https://i.ytimg.com/vi/${esc(c.yt)}/hqdefault.jpg')">${ICON.play}</div><div class="cap">${esc(c.cap)}</div></button>`);
    card.onclick = () => {
      const fr = el(`<div class="clip"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(c.yt)}?autoplay=1&playsinline=1&rel=0&modestbranding=1" title="${esc(c.cap)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe><div class="cap">${esc(c.cap)}</div></div>`);
      card.replaceWith(fr);
    };
    clips.append(card);
  }
  runDrills(b, view.querySelector("#drill"), view.querySelector("#dcount"));
}
function runDrills(b, host, countEl) {
  const order = shuffle(b.drills.map((_, i) => i));
  let i = 0, nailed = 0;
  const show = () => {
    countEl.textContent = i < order.length ? `${i + 1} of ${order.length}` : "";
    host.innerHTML = "";
    if (i >= order.length) {
      const g = S.grammar[b.id] || (S.grammar[b.id] = { best: 0, runs: 0 });
      g.runs++; g.best = Math.max(g.best, nailed); g.last = today(); logActivity(); save();
      host.append(el(`<div><p class="drill-en">${nailed} of ${order.length} with the right face.</p><p class="soft" style="margin-top:8px">Run it again tomorrow. Faces stick with repetition, same as hands.</p></div>`));
      const again = el(`<button class="btn btn-ghost btn-wide" style="margin-top:16px">Run these again</button>`);
      again.onclick = () => runDrills(b, host, countEl);
      host.append(again);
      return;
    }
    const d = b.drills[order[i]];
    const box = el(`<div class="flash"><p class="soft">Sign this, with the face:</p><p class="drill-en">${esc(d.en)}</p><div class="gloss-wrap"></div></div>`);
    const btn = el(`<button class="btn btn-primary btn-wide" style="margin-top:20px">Show the ASL</button>`);
    btn.onclick = () => {
      const gw = box.querySelector(".gloss-wrap");
      gw.innerHTML = `<div class="gloss">${glossHTML(d.g)}</div><p class="gloss-help">The gold line shows where the face goes. Tap a sign to see it.</p>`;
      gw.querySelectorAll("button.gw").forEach((x) => (x.onclick = () => openSignSheet(Number(x.dataset.id))));
      btn.replaceWith(gradeRow);
    };
    const gradeRow = el(`<div class="grade two" style="margin-top:20px"><button class="btn btn-missed" data-g="miss">Missed the face</button><button class="btn btn-primary" data-g="nail">Nailed it</button></div>`);
    gradeRow.onclick = (e) => { const x = e.target.closest("button"); if (!x) return; if (x.dataset.g === "nail") nailed++; i++; show(); };
    box.append(btn);
    host.append(box);
  };
  show();
}

/* ---------------- settings ---------------- */
function fmtTime(hhmm) { const h = +hhmm.slice(0, 2), m = hhmm.slice(2); const h12 = ((h + 11) % 12) + 1; return `${h12}:${m} ${h < 12 ? "AM" : "PM"}`; }
function segCtrl(name, options, value) {
  return `<div class="seg-ctrl" data-name="${name}">${options.map(([v, l]) => `<button data-v="${v}" aria-pressed="${String(v) === String(value)}">${l}</button>`).join("")}</div>`;
}
function renderSettings() {
  app.innerHTML = "";
  const st = S.settings;
  const view = el(`<div>
    <div class="topbar"><button class="back" id="back">${ICON.back}${S.onboarded ? "Home" : "Back"}</button></div>
    <h1>Settings</h1>
    <section class="section">
      <div class="field"><label for="nm">Your name</label><input id="nm" class="textin" value="${esc(st.name)}" placeholder="Optional" autocomplete="given-name"></div>
      <div class="field"><span class="lbl">Daily session</span>${segCtrl("minutes", [[3, "3 min"], [5, "5 min"], [10, "10 min"]], st.minutes)}</div>
      <div class="field"><span class="lbl">New signs per session</span>${segCtrl("newCap", [[5, "5"], [8, "8"], [12, "12"]], st.newCap)}<span class="hint">How many unfamiliar signs to teach in one sitting. Signs you already know don't count.</span></div>
      <div class="field"><span class="lbl">Video speed</span>${segCtrl("speed", SPEEDS.map((v) => [v, SPEED_LABEL[v]]), st.speed)}</div>
      <div class="field"><span class="lbl">Mirror videos</span>${segCtrl("mirror", [["false", "Off"], ["true", "On"]], String(st.mirror))}<span class="hint">Flips the signer so it works like looking in a mirror.</span></div>
      <div class="field"><span class="lbl">Look</span>${segCtrl("theme", [["auto", "Match phone"], ["dark", "Evening"], ["light", "Daylight"]], st.theme)}</div>
    </section>
    <section class="section">
      <h2>Evening reminder</h2>
      <div class="field"><label for="rt">Remind me at</label>
        <select id="rt" class="textin">${REMINDER_TIMES.map((t) => `<option value="${t}" ${t === st.reminder ? "selected" : ""}>${fmtTime(t)}</option>`).join("")}</select>
        <a class="btn btn-quiet btn-wide" id="ics" href="reminders/signback-${st.reminder}.ics">${ICON.calendar}Add to my calendar</a>
        <span class="hint">Adds a daily 5-minute event with an alert to your phone's calendar, with a link back here. It follows your phone's local time, so it works when you travel too.</span></div>
    </section>
    <section class="section">
      <h2>Offline and backup</h2>
      <div class="field"><span class="lbl">Save every video on this phone</span><button class="btn btn-quiet btn-wide" id="dl">Save all ${DATA.videoCount} videos (${DATA.videoMB} MB)</button><span class="hint">Videos you've watched are already saved. This grabs the rest so SignBack works with no signal.</span></div>
      <div class="field"><span class="lbl">Backup</span><button class="btn btn-quiet btn-wide" id="bk">Copy backup code</button><span class="hint">Your progress lives on this phone. Paste the code into a note to keep a copy, or to move to a new phone.</span>
        <textarea id="rs" class="textin" placeholder="Paste a backup code to restore"></textarea><button class="btn btn-ghost btn-wide" id="rsb">Restore from code</button></div>
      <div class="field"><button class="btn btn-ghost btn-wide" id="reset">Erase my progress</button></div>
    </section>
    <section class="section credits">
      <h2 style="color:var(--text);margin-bottom:8px">Credits</h2>
      <p>Sign videos: <a href="https://aslsignbank.com" target="_blank" rel="noopener">ASL Signbank</a> (Hochgesang, Crasborn &amp; Lillo-Martin), licensed <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener">CC BY-NC-SA 4.0</a>. Each sign links to its Signbank entry. Clips are cropped around the signer and compressed for phones; this non-commercial adaptation is shared under the same license.</p>
      <p style="margin-top:8px">Grammar example videos: Dr. Bill Vicars, <a href="https://www.lifeprint.com" target="_blank" rel="noopener">Lifeprint.com</a>, played through YouTube.</p>
      <p style="margin-top:8px">Typeface: Bricolage Grotesque, SIL Open Font License. Lessons, drills and app by SignBack.</p>
    </section>
  </div>`);
  app.append(view);
  view.querySelector("#back").onclick = () => go("#/");
  view.querySelector("#nm").onchange = (e) => { st.name = e.target.value.trim().slice(0, 30); save(); };
  view.querySelectorAll(".seg-ctrl").forEach((sc) => sc.onclick = (e) => {
    const b = e.target.closest("button"); if (!b) return;
    sc.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true");
    const name = sc.dataset.name, v = b.dataset.v;
    st[name] = name === "theme" ? v : name === "mirror" ? v === "true" : Number(v);
    save(); if (name === "theme") applyTheme();
  });
  const rt = view.querySelector("#rt"), ics = view.querySelector("#ics");
  rt.onchange = () => { st.reminder = rt.value; save(); ics.href = `reminders/signback-${rt.value}.ics`; };
  view.querySelector("#dl").onclick = (e) => saveAllVideos(e.currentTarget);
  view.querySelector("#bk").onclick = async () => {
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
    try { await navigator.clipboard.writeText(code); toast("Backup code copied."); }
    catch (err) { view.querySelector("#rs").value = code; toast("Copy the code from the box below."); }
  };
  view.querySelector("#rsb").onclick = () => {
    const raw = view.querySelector("#rs").value.trim(); if (!raw) return toast("Paste a backup code first.");
    let data; try { data = JSON.parse(decodeURIComponent(escape(atob(raw)))); } catch (err) { return toast("That code isn't a SignBack backup."); }
    if (!data || !data.cards) return toast("That code isn't a SignBack backup.");
    confirmSheet("Replace your progress on this phone with the backup?", "Replace progress", () => { S = { ...freshState(), ...data }; save(); applyTheme(); toast("Progress restored."); go("#/"); });
  };
  view.querySelector("#reset").onclick = () => confirmSheet("Erase all progress on this phone? Your signs go back to not checked.", "Erase progress", () => {
    const keep = S.settings; S = freshState(); S.settings = keep; S.onboarded = true; save(); toast("Progress erased."); go("#/");
  });
}
function confirmSheet(msg, action, fn) {
  const box = el(`<div><p style="font-size:18px;margin:6px 0 18px">${esc(msg)}</p><div class="grade two"><button class="btn btn-quiet" data-a="no">Cancel</button><button class="btn btn-primary" data-a="yes">${esc(action)}</button></div></div>`);
  box.onclick = (e) => { const b = e.target.closest("button"); if (!b) return; closeSheet(); if (b.dataset.a === "yes") fn(); };
  openSheet(box);
}
async function saveAllVideos(btn) {
  const ids = [...new Set(ITEMS.flatMap((i) => [i.id, ...(i.a || [])]))];
  let done = 0, failed = 0;
  btn.disabled = true;
  const cache = "caches" in window ? await caches.open("signback-videos-v1") : null;
  const work = async () => {
    while (ids.length) {
      const id = ids.pop();
      const url = new URL(`videos/${id}.mp4`, location.href).href;
      try {
        if (cache && (await cache.match(url))) { done++; continue; }
        const r = await fetch(url); if (!r.ok) throw new Error();
        if (cache) await cache.put(url, r.clone());
        done++;
      } catch (e) { failed++; }
      btn.textContent = `Saving… ${done} of ${DATA.videoCount}`;
    }
  };
  await Promise.all([work(), work(), work(), work()]);
  btn.disabled = false;
  btn.textContent = failed ? `Saved ${done}. ${failed} didn't download, try again on Wi-Fi.` : "All videos saved on this phone";
}
function toast(msg) {
  const t = el(`<div class="toast" role="status">${esc(msg)}</div>`);
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}

/* ---------------- boot ---------------- */
async function boot() {
  S = load();
  applyTheme();
  try {
    const r = await fetch("data/app-data.json");
    DATA = await r.json();
  } catch (e) {
    app.innerHTML = `<div style="padding:40px 0"><h1>SignBack couldn't load.</h1><p class="soft" style="margin-top:10px">Check your connection and reopen the app.</p></div>`;
    return;
  }
  if (DATA.stage) { document.documentElement.style.setProperty("--stage", DATA.stage); }
  DECKS = DATA.decks; DECKS.forEach((d) => DECK_BY.set(d.key, d));
  ITEMS = DATA.items; ITEMS.forEach((i) => BYID.set(i.id, i));
  GRAMMAR = DATA.grammar;
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  render();
}
boot();
