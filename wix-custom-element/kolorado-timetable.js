// ============================================================
// Kolorádó Festival Timetable — Wix Custom Element v2
// Self-contained Web Component. Drop into Wix as a Custom Element.
// Receives lineup data via the "lineup-data" attribute (JSON array).
//
// Features:
//   - Day tabs (SerialBlur ALL CAPS, pill-shaped, lime active)
//   - Stage filter pills
//   - Search bar (filters across all days, hides empty columns)
//   - Favourites with cookie persistence (1 year)
//   - Listám panel: click jumps to slot, opens artist page, bulk ICS export
//   - Shareable link via URL hash (#fav:base64url)
//   - Mobile list view toggle
//   - MOST (now) line
//   - Typography: SerialBlur for artist names/headlines, Pacaembu for everything else
//   - Sharp corners on event blocks, no left-side colour border
//
// CMS attribute interface (same as v1):
//   lineup-data = JSON.stringify([{ id, name, stage, startTime (ISO), endTime (ISO), genre?, url? }])
// ============================================================

const KOLORADO_BASE_URL = "https://www.kolorado.hu";

// Font URLs — served from the Kolorádó timetable hosted site
const SERIAL_BLUR_URL = "https://koloradotim-bqt3vb73.manus.space/manus-storage/SerialBlurTRIAL-Bleed_177bb821.ttf";
const PACAEMBU_URL    = "https://koloradotim-bqt3vb73.manus.space/manus-storage/Pacaembu-Medium_86abdf90.ttf";

const STAGES = [
  { id: "nagyszinpad",  name: "Nagyszínpad",  color: "#dcea75" },
  { id: "balterem",     name: "Bálterem",     color: "#5ab8e8" },
  { id: "toszinpad",    name: "Tószínpad",    color: "#e8a838" },
  { id: "hangar",       name: "Hangár",       color: "#a87be8" },
  { id: "platanos",     name: "Platános",     color: "#e86b5a" },
  { id: "listeningbar", name: "Listening Bar",color: "#5ae8a8" },
  { id: "healing",      name: "Healing",      color: "#e8c85a" },
  { id: "ring",         name: "Ring",         color: "#e85aab" },
];

const FESTIVAL_DAYS = [
  { id: "wed", label: "Szerda",    shortLabel: "Sze",  date: "2026-07-15" },
  { id: "thu", label: "Csütörtök", shortLabel: "Csüt", date: "2026-07-16" },
  { id: "fri", label: "Péntek",    shortLabel: "Pén",  date: "2026-07-17" },
  { id: "sat", label: "Szombat",   shortLabel: "Szo",  date: "2026-07-18" },
];

const DAY_START_HOUR    = 10;
const DAY_END_HOUR      = 31;
const HOUR_HEIGHT       = 80;
const MOBILE_HOUR_HEIGHT = 60;
const FAV_COOKIE        = "kolorado_favourites";
const FAV_MAX_AGE       = 60 * 60 * 24 * 365;

// ---- Utilities ----

function toFestivalHour(date) {
  const h = date.getHours(), m = date.getMinutes();
  return h < DAY_START_HOUR ? 24 + h + m / 60 : h + m / 60;
}

function formatTime(date) {
  return date.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function getFestivalDayId(date) {
  const h = date.getHours();
  const d = new Date(date);
  if (h < DAY_START_HOUR) d.setDate(d.getDate() - 1);
  const str = d.toISOString().split("T")[0];
  const day = FESTIVAL_DAYS.find(fd => fd.date === str);
  return day ? day.id : null;
}

function getArtistPageUrl(artist) {
  if (artist.url) return KOLORADO_BASE_URL + artist.url;
  const slug = artist.name.toLowerCase()
    .replace(/[áà]/g,"a").replace(/[éè]/g,"e").replace(/[íì]/g,"i")
    .replace(/[óòö]/g,"o").replace(/[őô]/g,"o").replace(/[úùü]/g,"u")
    .replace(/[űû]/g,"u").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  return `${KOLORADO_BASE_URL}/lineup/${slug}`;
}

function readFavCookie() {
  try {
    const m = document.cookie.split("; ").find(r => r.startsWith(FAV_COOKIE + "="));
    if (!m) return new Set();
    const ids = JSON.parse(decodeURIComponent(m.split("=")[1]));
    return new Set(Array.isArray(ids) ? ids : []);
  } catch { return new Set(); }
}

function writeFavCookie(ids) {
  document.cookie = `${FAV_COOKIE}=${encodeURIComponent(JSON.stringify([...ids]))}; path=/; max-age=${FAV_MAX_AGE}; SameSite=Lax`;
}

function encodeFavHash(ids) {
  if (!ids.size) return "";
  return btoa([...ids].join(",")).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");
}

function decodeFavHash(h) {
  try {
    const p = h + "=".repeat((4 - h.length % 4) % 4);
    return atob(p.replace(/-/g,"+").replace(/_/g,"/")).split(",").filter(Boolean);
  } catch { return []; }
}

function generateAllICS(artists) {
  const pad = n => String(n).padStart(2,"0");
  const fmt = d => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const now = new Date();
  const events = artists.map(a => [
    "BEGIN:VEVENT",
    `DTSTART:${fmt(a.startTime)}`,
    `DTEND:${fmt(a.endTime)}`,
    `DTSTAMP:${fmt(now)}`,
    `UID:${a.id}@kolorado.hu`,
    `SUMMARY:${a.name}`,
    `DESCRIPTION:${a.name} @ ${a.stage} - Kolorádó Fesztivál 2026`,
    `LOCATION:${a.stage}\\, Kolorádó Fesztivál\\, Káloz`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
  ].join("\r\n")).join("\r\n");
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Kolorádó Fesztivál//Timetable//HU","CALSCALE:GREGORIAN","METHOD:PUBLISH",events,"END:VCALENDAR"].join("\r\n");
}

function downloadAllICS(artists) {
  const blob = new Blob([generateAllICS(artists)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "kolorado_kedvencek.ics";
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function showToast(root, msg, type = "success") {
  const t = document.createElement("div");
  t.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:${type==="success"?"#dcea75":"#e86b5a"};color:#062322;
    padding:10px 20px;font-family:'Pacaembu',sans-serif;font-size:13px;
    z-index:9999;pointer-events:none;opacity:1;transition:opacity 0.4s;
  `;
  t.textContent = msg;
  (root.shadowRoot || root).appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 400); }, 2500);
}

// ---- Styles ----

function getStyles() {
  return `
    @font-face {
      font-family: 'SerialBlur';
      src: url('${SERIAL_BLUR_URL}') format('truetype');
      font-weight: normal; font-style: normal; font-display: swap;
    }
    @font-face {
      font-family: 'Pacaembu';
      src: url('${PACAEMBU_URL}') format('truetype');
      font-weight: 500; font-style: normal; font-display: swap;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :host { display: block; width: 100%; font-family: 'Pacaembu', sans-serif; }

    /* ---- Root ---- */
    .root { background: #062322; color: #c8dbd9; min-height: 100vh; }

    /* ---- Header ---- */
    .header {
      position: sticky; top: 0; z-index: 40;
      background: #062322; border-bottom: 1px solid #1a6b6620;
      backdrop-filter: blur(8px);
    }
    .header-inner { max-width: 1280px; margin: 0 auto; padding: 10px 16px 8px; }

    /* ---- Day tabs ---- */
    .day-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
    .day-tab {
      font-family: 'SerialBlur', sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: 13px;
      padding: 6px 18px;
      border: 1.5px solid transparent;
      border-radius: 9999px;
      cursor: pointer;
      background: transparent;
      color: rgba(220,234,117,0.8);
      transition: all 0.15s;
      position: relative;
    }
    .day-tab:hover { color: #dcea75; border-color: #dcea7540; }
    .day-tab.active { background: #dcea75; color: #062322; border-color: #dcea75; }

    /* ---- Row 2: Kedvencek + Listám ---- */
    .ctrl-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; flex-wrap: wrap; }
    .pill-btn {
      font-family: 'Pacaembu', sans-serif;
      font-size: 12px;
      padding: 5px 14px;
      border-radius: 9999px;
      border: 1.5px solid #1a6b6660;
      background: transparent;
      color: #7a9e9b;
      cursor: pointer;
      display: flex; align-items: center; gap: 6px;
      transition: all 0.15s;
      position: relative;
    }
    .pill-btn:hover { border-color: #dcea7540; color: #dcea75; }
    .pill-btn.active-fav { border-color: #e86b5a88; color: #e86b5a; background: #e86b5a18; }
    .pill-btn.active-listam { border-color: #dcea7566; color: #dcea75; background: #dcea7518; }
    .pill-btn.active-search { border-color: #dcea7566; color: #dcea75; background: #dcea7518; }
    .badge {
      position: absolute; top: -4px; right: -4px;
      width: 16px; height: 16px; border-radius: 9999px;
      background: #e86b5a; color: #fff;
      font-size: 9px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }

    /* ---- Stage filters ---- */
    .stage-filters { display: flex; gap: 6px; flex-wrap: wrap; }
    .stage-btn {
      font-family: 'Pacaembu', sans-serif;
      font-size: 11px; padding: 3px 10px;
      border-radius: 9999px;
      border: 1.5px solid transparent;
      background: transparent; cursor: pointer;
      display: flex; align-items: center; gap: 5px;
      transition: all 0.15s; color: #7a9e9b;
    }
    .stage-dot { width: 7px; height: 7px; border-radius: 9999px; }
    .stage-btn.active { color: #c8dbd9; }

    /* ---- Dropdown panels ---- */
    .panel {
      border-bottom: 1px solid #1a6b6620;
      background: rgba(6,35,34,0.98);
      backdrop-filter: blur(8px);
      padding: 16px;
      max-width: 1280px; margin: 0 auto;
    }
    .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .panel-title {
      font-family: 'SerialBlur', sans-serif;
      text-transform: uppercase; font-size: 12px;
      letter-spacing: 0.08em; color: #dcea75;
    }
    .panel-actions { display: flex; align-items: center; gap: 6px; }
    .icon-btn {
      background: transparent; border: none; cursor: pointer;
      color: #7a9e9b; padding: 4px; display: flex; align-items: center;
      transition: color 0.15s;
    }
    .icon-btn:hover { color: #dcea75; }
    .share-btn {
      font-family: 'Pacaembu', sans-serif; font-size: 11px;
      padding: 3px 10px; border: 1px solid #1a6b6630;
      background: transparent; cursor: pointer; color: #7a9e9b;
      display: flex; align-items: center; gap: 5px;
      transition: all 0.15s;
    }
    .share-btn:hover { border-color: #dcea7540; color: #dcea75; }

    /* ---- Search ---- */
    .search-input {
      width: 100%; padding: 8px 12px;
      background: #0a3533; border: 1px solid #1a6b6640;
      color: #c8dbd9; font-family: 'Pacaembu', sans-serif; font-size: 13px;
      outline: none; margin-bottom: 10px;
    }
    .search-input::placeholder { color: #7a9e9b; }
    .search-results { max-height: 260px; overflow-y: auto; }
    .search-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 10px; border-bottom: 1px solid #1a6b6615; cursor: pointer;
      transition: background 0.1s;
    }
    .search-item:hover { background: #0a3533; }
    .search-name { font-family: 'SerialBlur', sans-serif; text-transform: uppercase; font-size: 13px; color: #c8dbd9; }
    .search-meta { font-size: 11px; color: #7a9e9b; margin-top: 2px; }
    .search-item-actions { display: flex; gap: 4px; }

    /* ---- Listám ---- */
    .listam-scroll { max-height: 280px; overflow-y: auto; margin-bottom: 12px; }
    .listam-day-label {
      font-family: 'SerialBlur', sans-serif; text-transform: uppercase;
      font-size: 10px; letter-spacing: 0.1em; color: #7a9e9b;
      padding: 6px 0 4px; border-bottom: 1px solid #1a6b6620; margin-bottom: 4px;
    }
    .listam-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 4px; border-bottom: 1px solid #1a6b6615; cursor: pointer;
      transition: background 0.1s;
    }
    .listam-item:hover { background: #0a3533; }
    .listam-name { font-family: 'SerialBlur', sans-serif; text-transform: uppercase; font-size: 13px; }
    .listam-meta { font-size: 11px; color: #7a9e9b; margin-top: 1px; }
    .listam-link { color: #7a9e9b; padding: 4px; display: flex; align-items: center; transition: color 0.15s; }
    .listam-link:hover { color: #dcea75; }
    .export-btn {
      width: 100%; padding: 10px; border: 1px solid #1a6b6630;
      background: transparent; color: #7a9e9b; cursor: pointer;
      font-family: 'Pacaembu', sans-serif; font-size: 13px;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: all 0.15s;
    }
    .export-btn:hover { border-color: #dcea7540; color: #dcea75; }
    .empty-msg { font-size: 13px; color: #7a9e9b; text-align: center; padding: 20px 0; }

    /* ---- View toggle ---- */
    .view-toggle {
      display: flex; gap: 4px; align-items: center;
      margin-left: auto;
    }
    .view-btn {
      background: transparent; border: 1px solid #1a6b6640;
      color: #7a9e9b; padding: 4px 8px; cursor: pointer;
      border-radius: 4px; display: flex; align-items: center;
      transition: all 0.15s;
    }
    .view-btn.active { border-color: #dcea7566; color: #dcea75; background: #dcea7518; }

    /* ---- Grid ---- */
    .grid-container { max-width: 1280px; margin: 0 auto; padding: 0 16px 32px; }
    .grid-scroll { overflow-x: auto; }
    .grid-flex { display: flex; }
    .time-axis { flex-shrink: 0; width: 56px; }
    .corner { height: 40px; }
    .time-labels { position: relative; }
    .time-label {
      position: absolute; left: 0; right: 0;
      font-size: 11px; color: #1a6b66; text-align: right; padding-right: 8px;
      transform: translateY(-50%);
    }
    .stages-area { flex: 1; position: relative; min-width: 0; }
    .stage-columns { display: flex; height: 100%; }
    .stage-col { flex: 1; min-width: 120px; position: relative; border-right: 1px solid #1a6b6620; }
    .stage-col:last-child { border-right: none; }
    .stage-header {
      height: 40px; display: flex; align-items: center; justify-content: center;
      font-family: 'SerialBlur', sans-serif; text-transform: uppercase;
      font-size: 11px; letter-spacing: 0.08em; border-bottom: 1px solid #1a6b6620;
      position: sticky; top: 0; background: #062322; z-index: 2;
    }
    .events-area { position: relative; }
    .grid-line { position: absolute; left: 0; right: 0; border-top: 1px solid #1a6b6615; }

    /* ---- Artist block ---- */
    .artist-block {
      position: absolute; left: 2px; right: 2px;
      overflow: hidden; cursor: pointer;
      transition: filter 0.15s;
    }
    .artist-block:hover { filter: brightness(1.15); z-index: 10; }
    .artist-block:hover .fav-overlay { opacity: 1; }
    .artist-inner { padding: 4px 6px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; }
    .artist-name-text {
      font-family: 'SerialBlur', sans-serif; text-transform: uppercase;
      font-size: 12px; line-height: 1.2; overflow: hidden;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    }
    .artist-genre { font-size: 10px; color: #7a9e9b; margin-top: 2px; }
    .artist-time { font-size: 10px; margin-top: auto; }
    .fav-overlay {
      position: absolute; inset: 0; opacity: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(6,35,34,0.5); transition: opacity 0.15s;
    }
    .fav-btn-overlay {
      background: #e86b5a; color: #fff; border: none; cursor: pointer;
      padding: 4px 10px; font-family: 'Pacaembu', sans-serif; font-size: 11px;
      display: flex; align-items: center; gap: 4px;
    }
    .fav-btn-overlay.is-fav { background: #062322; border: 1px solid #e86b5a; color: #e86b5a; }

    /* ---- NOW line ---- */
    .now-line {
      position: absolute; left: 0; right: 0; z-index: 20;
      display: flex; align-items: center; pointer-events: none;
    }
    .now-dot { width: 10px; height: 10px; border-radius: 9999px; background: #dcea75; flex-shrink: 0; }
    .now-label {
      font-family: 'SerialBlur', sans-serif; text-transform: uppercase;
      font-size: 10px; color: #062322; background: #dcea75;
      padding: 1px 5px; margin-left: 2px; flex-shrink: 0;
    }
    .now-bar { flex: 1; height: 1px; background: #dcea75; }

    /* ---- Mobile list view ---- */
    .list-container { max-width: 1280px; margin: 0 auto; padding: 0 16px 32px; }
    .list-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 0; border-bottom: 1px solid #1a6b6620; cursor: pointer;
    }
    .list-item:hover { background: #0a3533; }
    .list-name { font-family: 'SerialBlur', sans-serif; text-transform: uppercase; font-size: 14px; }
    .list-meta { font-size: 11px; color: #7a9e9b; margin-top: 2px; }
    .list-fav-btn { background: transparent; border: none; cursor: pointer; padding: 8px; }

    /* ---- Empty state ---- */
    .empty-state { padding: 60px 16px; text-align: center; color: #7a9e9b; font-size: 13px; }

    /* ---- Responsive ---- */
    @media (max-width: 767px) {
      .ctrl-row { gap: 6px; }
      .pill-btn { font-size: 11px; padding: 5px 10px; }
      .stage-filters { display: none; }
      .stage-filters.show { display: flex; }
      .day-tab { font-size: 12px; padding: 5px 12px; }
    }
  `;
}

// ---- SVG icons (inline) ----
const SVG = {
  heart: (filled, color="#7a9e9b", size=14) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled?color:"none"}" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  x: (size=14) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  search: (size=13) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  star: (filled, size=13) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled?"#dcea75":"none"}" stroke="#dcea75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  share: (size=13) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
  external: (size=12) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  calendar: (size=13) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  grid: (size=14) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  list: (size=14) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
};

// ============================================================
// Web Component
// ============================================================

class KoloradoTimetable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._artists = [];
    this._activeDay = FESTIVAL_DAYS[0].id;
    this._activeStages = new Set(STAGES.map(s => s.id));
    this._favourites = readFavCookie();
    this._filterFavourites = false;
    this._searchQuery = "";
    this._showSearch = false;
    this._showListam = false;
    this._viewMode = "grid"; // "grid" | "list"
    this._isMobile = window.innerWidth < 768;
    this._resizeHandler = () => {
      const was = this._isMobile;
      this._isMobile = window.innerWidth < 768;
      if (was !== this._isMobile) this.render();
    };
    // Map artistId → block element for scroll-to
    this._blockEls = new Map();
  }

  static get observedAttributes() { return ["lineup-data"]; }

  attributeChangedCallback(name, _, newVal) {
    if (name === "lineup-data" && newVal) {
      try {
        const raw = JSON.parse(newVal);
        this._artists = raw.map(a => ({
          ...a,
          startTime: new Date(a.startTime),
          endTime: new Date(a.endTime),
        }));
        this.render();
      } catch(e) { console.error("Kolorádó Timetable: parse error", e); }
    }
  }

  connectedCallback() {
    window.addEventListener("resize", this._resizeHandler);
    // Handle shared favourites from URL hash
    this._handleHashImport();
    this.render();
  }

  disconnectedCallback() {
    window.removeEventListener("resize", this._resizeHandler);
  }

  _handleHashImport() {
    const hash = window.location.hash.slice(1);
    if (!hash.startsWith("fav:")) return;
    const ids = decodeFavHash(hash.slice(4));
    const valid = ids.filter(id => this._artists.some(a => a.id === id) || true); // accept all, validate later
    if (!valid.length) return;
    valid.forEach(id => this._favourites.add(id));
    writeFavCookie(this._favourites);
    history.replaceState(null, "", window.location.pathname + window.location.search);
    showToast(this, `${valid.length} kedvenc betöltve a megosztott listából!`);
  }

  // ---- State helpers ----

  _toggleFav(id) {
    if (this._favourites.has(id)) this._favourites.delete(id);
    else this._favourites.add(id);
    writeFavCookie(this._favourites);
    this.render();
  }

  _toggleStage(id) {
    if (this._activeStages.has(id)) {
      if (this._activeStages.size > 1) this._activeStages.delete(id);
    } else {
      this._activeStages.add(id);
    }
    this.render();
  }

  _getSearchResults() {
    if (!this._searchQuery.trim()) return [];
    const q = this._searchQuery.toLowerCase();
    return this._artists.filter(a =>
      a.name.toLowerCase().includes(q) ||
      (a.genre && a.genre.toLowerCase().includes(q)) ||
      a.stage.toLowerCase().includes(q)
    ).slice(0, 20);
  }

  _getVisibleArtists() {
    const searchIds = this._searchQuery.trim()
      ? new Set(this._getSearchResults().map(a => a.id))
      : null;
    return this._artists.filter(a => {
      if (getFestivalDayId(a.startTime) !== this._activeDay) return false;
      const stage = STAGES.find(s => s.name === a.stage);
      if (!stage || !this._activeStages.has(stage.id)) return false;
      if (this._filterFavourites && !this._favourites.has(a.id)) return false;
      if (searchIds && !searchIds.has(a.id)) return false;
      return true;
    });
  }

  _getVisibleStages() {
    const isFiltering = this._filterFavourites || this._searchQuery.trim();
    if (!isFiltering) return STAGES.filter(s => this._activeStages.has(s.id));
    const visible = this._getVisibleArtists();
    return STAGES.filter(s =>
      this._activeStages.has(s.id) && visible.some(a => a.stage === s.name)
    );
  }

  // ---- Render ----

  render() {
    const hourHeight = this._isMobile ? MOBILE_HOUR_HEIGHT : HOUR_HEIGHT;
    const totalHeight = (DAY_END_HOUR - DAY_START_HOUR) * hourHeight;
    const visibleArtists = this._getVisibleArtists();
    const visibleStages = this._getVisibleStages();
    const searchResults = this._getSearchResults();
    const favArtists = this._artists
      .filter(a => this._favourites.has(a.id))
      .sort((a,b) => a.startTime - b.startTime);

    // Time labels
    const timeLabels = [];
    for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
      const dh = h >= 24 ? h - 24 : h;
      timeLabels.push({ hour: h, label: `${String(dh).padStart(2,"0")}:00` });
    }

    // NOW line
    const now = new Date();
    const nowH = toFestivalHour(now);
    const showNow = nowH >= DAY_START_HOUR && nowH < DAY_END_HOUR;
    const nowTop = showNow ? (nowH - DAY_START_HOUR) * hourHeight + 40 : -100;

    // Listám grouped by day
    const byDay = new Map();
    for (const day of FESTIVAL_DAYS) {
      const da = favArtists.filter(a => getFestivalDayId(a.startTime) === day.id);
      if (da.length) byDay.set(day.id, da);
    }

    const sr = this.shadowRoot;
    sr.innerHTML = `
      <style>${getStyles()}</style>
      <div class="root">

        <!-- HEADER -->
        <header class="header">
          <div class="header-inner">

            <!-- Row 1: Day tabs -->
            <div class="day-tabs">
              ${FESTIVAL_DAYS.map(d => `
                <button class="day-tab${this._activeDay===d.id?" active":""}" data-day="${d.id}">
                  <span class="day-full">${d.label}</span>
                </button>
              `).join("")}
            </div>

            <!-- Row 2: Kedvencek + Listám + view toggle -->
            <div class="ctrl-row">
              <button class="pill-btn${this._filterFavourites?" active-fav":""}" data-action="toggle-fav">
                ${SVG.heart(this._filterFavourites,"#e86b5a",14)}
                Kedvencek
                ${this._favourites.size > 0 ? `<span class="badge">${this._favourites.size}</span>` : ""}
              </button>
              <button class="pill-btn${this._showListam?" active-listam":""}" data-action="toggle-listam">
                ${SVG.star(this._showListam,13)}
                Listám
                ${this._favourites.size > 0 ? `<span class="badge">${this._favourites.size}</span>` : ""}
              </button>
              <button class="pill-btn${this._showSearch?" active-search":""}" data-action="toggle-search">
                ${SVG.search(13)}
                Keresés
              </button>
              <div class="view-toggle" style="margin-left:auto">
                <button class="view-btn${this._viewMode==="grid"?" active":""}" data-action="view-grid" title="Rács nézet">${SVG.grid(14)}</button>
                <button class="view-btn${this._viewMode==="list"?" active":""}" data-action="view-list" title="Lista nézet">${SVG.list(14)}</button>
              </div>
            </div>

            <!-- Row 3: Stage filters -->
            <div class="stage-filters">
              ${STAGES.map(s => `
                <button class="stage-btn${this._activeStages.has(s.id)?" active":""}" data-stage="${s.id}" style="border-color:${this._activeStages.has(s.id)?s.color+"60":"#1a6b6630"}">
                  <span class="stage-dot" style="background:${s.color}"></span>
                  <span style="color:${this._activeStages.has(s.id)?s.color:"#7a9e9b"}">${s.name}</span>
                </button>
              `).join("")}
            </div>

            <!-- Search panel -->
            ${this._showSearch ? `
              <div class="panel" style="margin-top:8px">
                <div class="panel-header">
                  <span class="panel-title">Keresés</span>
                  <button class="icon-btn" data-action="close-search">${SVG.x(14)}</button>
                </div>
                <input class="search-input" type="text" placeholder="Előadó, műfaj, színpad..." value="${this._escHtml(this._searchQuery)}" data-action="search-input" />
                <div class="search-results">
                  ${searchResults.length === 0 && this._searchQuery.trim() ? `<div class="empty-msg">Nincs találat.</div>` : ""}
                  ${searchResults.map(a => {
                    const stage = STAGES.find(s => s.name === a.stage);
                    const isFav = this._favourites.has(a.id);
                    return `
                      <div class="search-item" data-jump="${a.id}">
                        <div>
                          <div class="search-name" style="color:${stage?stage.color:"#c8dbd9"}">${this._escHtml(a.name)}</div>
                          <div class="search-meta">${this._escHtml(a.stage)}${a.genre?" · "+this._escHtml(a.genre):""} · ${formatTime(a.startTime)}</div>
                        </div>
                        <div class="search-item-actions">
                          <button class="icon-btn" data-fav="${a.id}" title="${isFav?"Eltávolítás":"Kedvencnek"}">${SVG.heart(isFav,"#e86b5a",14)}</button>
                        </div>
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>
            ` : ""}

            <!-- Listám panel -->
            ${this._showListam ? `
              <div class="panel" style="margin-top:8px">
                <div class="panel-header">
                  <span class="panel-title">Listám</span>
                  <div class="panel-actions">
                    ${this._favourites.size > 0 ? `
                      <button class="share-btn" data-action="share">${SVG.share(12)} Megosztás</button>
                    ` : ""}
                    <button class="icon-btn" data-action="close-listam">${SVG.x(14)}</button>
                  </div>
                </div>
                ${favArtists.length === 0 ? `
                  <div class="empty-msg">Még nincs kedvenc. Kattints a ♥ gombra egy előadónál.</div>
                ` : `
                  <div class="listam-scroll">
                    ${[...byDay.entries()].map(([dayId, artists]) => {
                      const day = FESTIVAL_DAYS.find(d => d.id === dayId);
                      return `
                        <div class="listam-day-label">${day ? day.label : dayId}</div>
                        ${artists.map(a => {
                          const stage = STAGES.find(s => s.name === a.stage);
                          return `
                            <div class="listam-item" data-jump="${a.id}">
                              <div>
                                <div class="listam-name" style="color:${stage?stage.color:"#c8dbd9"}">${this._escHtml(a.name)}</div>
                                <div class="listam-meta">${this._escHtml(a.stage)} · ${formatTime(a.startTime)}–${formatTime(a.endTime)}</div>
                              </div>
                              <div style="display:flex;align-items:center;gap:4px">
                                <a class="listam-link" href="${getArtistPageUrl(a)}" target="_blank" rel="noopener" title="Kolorádó oldal">${SVG.external(12)}</a>
                                <button class="icon-btn" data-fav="${a.id}">${SVG.heart(true,"#e86b5a",14)}</button>
                              </div>
                            </div>
                          `;
                        }).join("")}
                      `;
                    }).join("")}
                  </div>
                  <button class="export-btn" data-action="export-ics">${SVG.calendar(14)} Mentés naptárba</button>
                `}
              </div>
            ` : ""}

          </div>
        </header>

        <!-- MOBILE LIST VIEW -->
        ${this._viewMode === "list" ? `
          <div class="list-container">
            ${visibleArtists.length === 0 ? `
              <div class="empty-state">Ezen a napon nincs${this._filterFavourites?" kedvenc":""} program.</div>
            ` : visibleArtists.sort((a,b)=>a.startTime-b.startTime).map(a => {
              const stage = STAGES.find(s => s.name === a.stage);
              const isFav = this._favourites.has(a.id);
              return `
                <div class="list-item" data-artist-url="${getArtistPageUrl(a)}">
                  <div>
                    <div class="list-name" style="color:${stage?stage.color:"#c8dbd9"}">${this._escHtml(a.name)}</div>
                    <div class="list-meta">${this._escHtml(a.stage)} · ${formatTime(a.startTime)}–${formatTime(a.endTime)}${a.genre?" · "+this._escHtml(a.genre):""}</div>
                  </div>
                  <button class="list-fav-btn" data-fav="${a.id}">${SVG.heart(isFav,"#e86b5a",18)}</button>
                </div>
              `;
            }).join("")}
          </div>
        ` : `
        <!-- GRID VIEW -->
        <div class="grid-container">
          <div class="grid-scroll">
            <div class="grid-flex">
              <!-- Time axis -->
              <div class="time-axis">
                <div class="corner"></div>
                <div class="time-labels" style="height:${totalHeight}px">
                  ${timeLabels.map(t => `
                    <div class="time-label" style="top:${(t.hour-DAY_START_HOUR)*hourHeight}px">${t.label}</div>
                  `).join("")}
                </div>
              </div>
              <!-- Stages -->
              <div class="stages-area">
                ${showNow ? `
                  <div class="now-line" style="top:${nowTop}px">
                    <div class="now-dot"></div>
                    <span class="now-label">MOST</span>
                    <div class="now-bar"></div>
                  </div>
                ` : ""}
                <div class="stage-columns">
                  ${visibleStages.map(stage => {
                    const stageArtists = visibleArtists.filter(a => a.stage === stage.name);
                    return `
                      <div class="stage-col">
                        <div class="stage-header" style="color:${stage.color}">${stage.name}</div>
                        <div class="events-area" style="height:${totalHeight}px">
                          ${timeLabels.map(t => `
                            <div class="grid-line" style="top:${(t.hour-DAY_START_HOUR)*hourHeight}px"></div>
                          `).join("")}
                          ${stageArtists.map(artist => {
                            const startH = toFestivalHour(artist.startTime);
                            const endH = toFestivalHour(artist.endTime);
                            const top = (startH - DAY_START_HOUR) * hourHeight;
                            const height = Math.max((endH - startH) * hourHeight - 2, 24);
                            const isShort = height < 52;
                            const isTiny = height < 36;
                            const isFav = this._favourites.has(artist.id);
                            return `
                              <div class="artist-block"
                                   data-artist-id="${artist.id}"
                                   data-artist-url="${getArtistPageUrl(artist)}"
                                   style="top:${top}px;height:${height}px;background:${stage.color}18;">
                                <div class="artist-inner">
                                  <div>
                                    <div class="artist-name-text" style="color:${stage.color}">${this._escHtml(artist.name)}</div>
                                    ${!isShort && artist.genre ? `<div class="artist-genre">${this._escHtml(artist.genre)}</div>` : ""}
                                  </div>
                                  ${!isTiny ? `<div class="artist-time" style="color:${stage.color}99">${formatTime(artist.startTime)}–${formatTime(artist.endTime)}</div>` : ""}
                                </div>
                                <div class="fav-overlay">
                                  <button class="fav-btn-overlay${isFav?" is-fav":""}" data-fav="${artist.id}">
                                    ${SVG.heart(isFav,"#fff",12)}
                                    ${isFav ? "Kedvenc" : "Kedvencnek"}
                                  </button>
                                </div>
                              </div>
                            `;
                          }).join("")}
                        </div>
                      </div>
                    `;
                  }).join("")}
                </div>
                ${visibleStages.length === 0 ? `
                  <div class="empty-state">Nincs megjelenítendő program.</div>
                ` : ""}
              </div>
            </div>
          </div>
        </div>
        `}

      </div>
    `;

    this._attachEvents();
  }

  _escHtml(str) {
    return String(str||"")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  _attachEvents() {
    const sr = this.shadowRoot;

    // Day tabs
    sr.querySelectorAll("[data-day]").forEach(btn => {
      btn.addEventListener("click", () => {
        this._activeDay = btn.dataset.day;
        this._showSearch = false; this._searchQuery = "";
        this._showListam = false;
        this.render();
      });
    });

    // Stage filters
    sr.querySelectorAll("[data-stage]").forEach(btn => {
      btn.addEventListener("click", () => this._toggleStage(btn.dataset.stage));
    });

    // Action buttons
    sr.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const a = btn.dataset.action;
        if (a === "toggle-fav") {
          this._filterFavourites = !this._filterFavourites;
          this.render();
        } else if (a === "toggle-listam") {
          this._showListam = !this._showListam;
          if (this._showListam) this._showSearch = false;
          this.render();
        } else if (a === "toggle-search") {
          this._showSearch = !this._showSearch;
          if (this._showSearch) { this._showListam = false; }
          else { this._searchQuery = ""; }
          this.render();
          if (this._showSearch) {
            setTimeout(() => sr.querySelector(".search-input")?.focus(), 50);
          }
        } else if (a === "close-search") {
          this._showSearch = false; this._searchQuery = "";
          this.render();
        } else if (a === "close-listam") {
          this._showListam = false; this.render();
        } else if (a === "view-grid") {
          this._viewMode = "grid"; this.render();
        } else if (a === "view-list") {
          this._viewMode = "list"; this.render();
        } else if (a === "export-ics") {
          const favs = this._artists.filter(a => this._favourites.has(a.id))
            .sort((a,b) => a.startTime - b.startTime);
          if (favs.length) downloadAllICS(favs);
        } else if (a === "share") {
          const encoded = encodeFavHash(this._favourites);
          if (!encoded) return;
          const url = `${window.location.origin}${window.location.pathname}#fav:${encoded}`;
          if (navigator.clipboard) {
            navigator.clipboard.writeText(url)
              .then(() => showToast(this, "Link másolva a vágólapra!"))
              .catch(() => window.prompt("Másold ki ezt a linket:", url));
          } else {
            window.prompt("Másold ki ezt a linket:", url);
          }
        }
      });
    });

    // Search input
    const searchInput = sr.querySelector(".search-input");
    if (searchInput) {
      searchInput.addEventListener("input", e => {
        this._searchQuery = e.target.value;
        this.render();
        // Re-focus after re-render
        setTimeout(() => {
          const inp = this.shadowRoot.querySelector(".search-input");
          if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
        }, 10);
      });
    }

    // Favourite toggles (all [data-fav] buttons)
    sr.querySelectorAll("[data-fav]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        this._toggleFav(btn.dataset.fav);
      });
    });

    // Artist block click → open page
    sr.querySelectorAll(".artist-block[data-artist-url]").forEach(el => {
      el.addEventListener("click", () => {
        window.open(el.dataset.artistUrl, "_blank", "noopener,noreferrer");
      });
    });

    // List item click → open page
    sr.querySelectorAll(".list-item[data-artist-url]").forEach(el => {
      el.addEventListener("click", e => {
        if (e.target.closest("[data-fav]")) return;
        window.open(el.dataset.artistUrl, "_blank", "noopener,noreferrer");
      });
    });

    // Jump to artist (from search or listám)
    sr.querySelectorAll("[data-jump]").forEach(el => {
      el.addEventListener("click", e => {
        if (e.target.closest("[data-fav]") || e.target.closest("a")) return;
        const artistId = el.dataset.jump;
        const artist = this._artists.find(a => a.id === artistId);
        if (!artist) return;
        const dayId = getFestivalDayId(artist.startTime);
        if (dayId) this._activeDay = dayId;
        this._showListam = false; this._showSearch = false; this._searchQuery = "";
        this._viewMode = "grid";
        this.render();
        // Scroll to block after render
        setTimeout(() => {
          const block = this.shadowRoot.querySelector(`[data-artist-id="${artistId}"]`);
          if (block) {
            block.scrollIntoView({ behavior: "smooth", block: "center" });
            block.style.outline = "2px solid #dcea75";
            setTimeout(() => { block.style.outline = ""; }, 1200);
          }
        }, 80);
      });
    });
  }
}

customElements.define("kolorado-timetable", KoloradoTimetable);
