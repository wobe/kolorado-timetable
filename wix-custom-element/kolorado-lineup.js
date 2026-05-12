// ============================================================
// wix-custom-element/kolorado-lineup.js
// Kolorádó Festival — Artist Lineup Grid Custom Element v1
//
// Features:
//   - Responsive photo grid (2 cols mobile → 4 cols desktop)
//   - 1:1 square artist photos with SerialBlur name overlay (top-left)
//   - Round favourite button (bottom-right) — shared cookie with timetable
//   - Filter bar: by Stage and by Day
//   - Click → popup with artist details (to be refined later)
//   - Shared favourites cookie: "kolorado_favourites" (same as timetable)
//   - Loading skeleton
//   - CMS data via lineup-data attribute (JSON string from Velo)
//
// Fonts (served from Manus CDN):
//   SerialBlur — artist names (ALL CAPS)
//   Pacaembu  — everything else
//
// Usage in Wix:
//   1. Upload this file to Wix Public files (or serve via jsDelivr)
//   2. Add Custom Element with tag: kolorado-lineup
//   3. Set ID to: koloradoLineup
//   4. Add Velo page code from wix-velo-code/lineup-grid-page.js
// ============================================================

(function () {
  "use strict";

  // ── Font URLs ──────────────────────────────────────────────
  var SERIAL_BLUR_URL = "https://koloradotim-bqt3vb73.manus.space/manus-storage/SerialBlurTRIAL-Bleed_177bb821.ttf";
  var PACAEMBU_URL    = "https://koloradotim-bqt3vb73.manus.space/manus-storage/Pacaembu-Medium_86abdf90.ttf";

  // ── Constants ──────────────────────────────────────────────
  var FAV_COOKIE_NAME   = "kolorado_favourites";  // SAME as timetable
  var FAV_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

  var FESTIVAL_DAYS = [
    { id: "wed", label: "Szerda",    date: "2026-07-15" },
    { id: "thu", label: "Csütörtök", date: "2026-07-16" },
    { id: "fri", label: "Péntek",    date: "2026-07-17" },
    { id: "sat", label: "Szombat",   date: "2026-07-18" },
  ];

  var STAGES = [
    { id: "nagyszinpad",  name: "Nagyszínpad",  color: "#dcea75" },
    { id: "balterem",     name: "Bálterem",     color: "#5ab8e8" },
    { id: "toszinpad",    name: "Tószínpad",    color: "#e8a838" },
    { id: "hangar",       name: "Hangár",       color: "#a87be8" },
    { id: "platanos",     name: "Platános",     color: "#e86b5a" },
    { id: "listeningbar", name: "Listening Bar",color: "#5ae8a8" },
    { id: "healing",      name: "Healing",      color: "#e8c85a" },
    { id: "ring",         name: "Ring",         color: "#e85aab" },
  ];

  // ── Cookie helpers (identical to timetable) ────────────────
  function readFavCookie() {
    var s = document.cookie.split(";");
    for (var i = 0; i < s.length; i++) {
      var p = s[i].trim().split("=");
      if (p[0] === FAV_COOKIE_NAME && p[1]) {
        try { return new Set(JSON.parse(decodeURIComponent(p[1]))); } catch(e) {}
      }
    }
    return new Set();
  }
  function writeFavCookie(set) {
    var val = encodeURIComponent(JSON.stringify(Array.from(set)));
    document.cookie = FAV_COOKIE_NAME + "=" + val + ";max-age=" + FAV_COOKIE_MAX_AGE + ";path=/;SameSite=Lax";
  }

  // ── Stage helpers ──────────────────────────────────────────
  function stageId(name) {
    return (name || "").toLowerCase().replace(/\s+/g, "").replace(/á/g,"a").replace(/é/g,"e").replace(/í/g,"i").replace(/ó/g,"o").replace(/ö/g,"o").replace(/ő/g,"o").replace(/ú/g,"u").replace(/ü/g,"u").replace(/ű/g,"u");
  }
  function stageColor(name) {
    var sid = stageId(name);
    for (var i = 0; i < STAGES.length; i++) {
      if (STAGES[i].id === sid) return STAGES[i].color;
    }
    return "#7a9e9b";
  }

  // ── Day helper ─────────────────────────────────────────────
  function getDayId(startTime) {
    if (!startTime) return null;
    var d = startTime instanceof Date ? startTime : new Date(startTime);
    if (isNaN(d)) return null;
    // Events after midnight belong to the previous calendar day
    var h = d.getHours();
    var checkDate = new Date(d);
    if (h < 6) checkDate.setDate(checkDate.getDate() - 1);
    var iso = checkDate.toISOString().slice(0, 10);
    for (var i = 0; i < FESTIVAL_DAYS.length; i++) {
      if (FESTIVAL_DAYS[i].date === iso) return FESTIVAL_DAYS[i].id;
    }
    return null;
  }

  // ── Format time ────────────────────────────────────────────
  function fmt(d) {
    if (!d) return "";
    var t = d instanceof Date ? d : new Date(d);
    if (isNaN(t)) return "";
    var h = t.getHours(), m = t.getMinutes();
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }

  // ── Fallback mock data ──────────────────────────────────────
  function makeDate(dayDate, hour, minute) {
    minute = minute || 0;
    var d = new Date(dayDate + "T00:00:00");
    if (hour >= 24) { d.setDate(d.getDate() + 1); d.setHours(hour - 24, minute, 0, 0); }
    else { d.setHours(hour, minute, 0, 0); }
    return d;
  }

  var MOCK_ARTISTS = [
    { id:"w1",  name:"Analog Balaton",              stage:"Nagyszínpad",  startTime:makeDate("2026-07-15",19,15), endTime:makeDate("2026-07-15",20,15), genre:"elektronikus",            url:"/lineup/analog-balaton",  photo:"" },
    { id:"w2",  name:"Elefánt",                     stage:"Nagyszínpad",  startTime:makeDate("2026-07-15",21, 0), endTime:makeDate("2026-07-15",22,30), genre:"rock",                    url:"/lineup/elefant",         photo:"" },
    { id:"w3",  name:"Swim Swim Naked",              stage:"Nagyszínpad",  startTime:makeDate("2026-07-15",23, 0), endTime:makeDate("2026-07-16", 0,30), genre:"elektronikus-pop",        url:"/lineup/swim-swim-naked", photo:"" },
    { id:"w4",  name:"Decolonize Your Mind Society", stage:"Bálterem",    startTime:makeDate("2026-07-15",17, 0), endTime:makeDate("2026-07-15",18,30), genre:"pszichedelikus jazz-rock", url:"/lineup/decolonize",      photo:"" },
    { id:"w5",  name:"L.A. Suzi",                   stage:"Bálterem",    startTime:makeDate("2026-07-15",20, 0), endTime:makeDate("2026-07-15",21,30), genre:"dallamos punk-pop sanzon", url:"/lineup/la-suzi",         photo:"" },
    { id:"w6",  name:"Csinszka",                    stage:"Bálterem",    startTime:makeDate("2026-07-15",22,30), endTime:makeDate("2026-07-16", 0, 0), genre:"indie pop",               url:"/lineup/csinszka",        photo:"" },
    { id:"t1",  name:"Kovács András Péter",          stage:"Nagyszínpad",  startTime:makeDate("2026-07-16",19, 0), endTime:makeDate("2026-07-16",20,30), genre:"stand-up",               url:"/lineup/kovacs-andras-peter", photo:"" },
    { id:"t2",  name:"Blahalouisiana",               stage:"Nagyszínpad",  startTime:makeDate("2026-07-16",21, 0), endTime:makeDate("2026-07-16",22,30), genre:"soul",                   url:"/lineup/blahalouisiana",  photo:"" },
    { id:"f1",  name:"Quimby",                       stage:"Nagyszínpad",  startTime:makeDate("2026-07-17",20, 0), endTime:makeDate("2026-07-17",21,30), genre:"rock",                   url:"/lineup/quimby",          photo:"" },
    { id:"s1",  name:"Kiscsillag",                   stage:"Nagyszínpad",  startTime:makeDate("2026-07-18",20, 0), endTime:makeDate("2026-07-18",21,30), genre:"indie rock",             url:"/lineup/kiscsillag",      photo:"" },
  ];

  // ── SVG icons ──────────────────────────────────────────────
  var ICONS = {
    heart: function(filled, size) {
      size = size || 18;
      return filled
        ? '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="#e86b5a" stroke="#e86b5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'
        : '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
    },
    close: function(size) {
      size = size || 20;
      return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    },
    external: function(size) {
      size = size || 14;
      return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
    },
    filter: function(size) {
      size = size || 16;
      return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>';
    },
    chevronDown: function(size) {
      size = size || 14;
      return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
    },
  };

  // ── CSS ────────────────────────────────────────────────────
  var CSS = [
    "@font-face{font-family:'SerialBlur';src:url('"+SERIAL_BLUR_URL+"') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}",
    "@font-face{font-family:'Pacaembu';src:url('"+PACAEMBU_URL+"') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}",
    "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}",
    ":host{display:block;width:100%;font-family:'Pacaembu',sans-serif;}",

    // Root
    ".kl-root{background:#0E4B4D;min-height:100vh;color:#c8dedd;}",

    // Header / filter bar
    ".kl-header{position:sticky;top:0;z-index:40;background:rgba(6,35,34,0.97);border-bottom:1px solid rgba(26,107,102,0.2);backdrop-filter:blur(8px);padding:10px 16px;}",
    ".kl-filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}",

    // Filter dropdown wrapper
    ".kl-filter-wrap{position:relative;}",
    ".kl-filter-btn{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:9999px;border:1px solid rgba(26,107,102,0.4);background:transparent;color:#7a9e9b;font-family:'Pacaembu',sans-serif;font-size:12px;cursor:pointer;transition:all 0.2s;white-space:nowrap;}",
    ".kl-filter-btn.active{border-color:rgba(220,234,117,0.5);color:#dcea75;background:rgba(220,234,117,0.07);}",
    ".kl-filter-dropdown{position:absolute;left:0;top:calc(100% + 6px);z-index:60;min-width:200px;background:#062322;border:1px solid rgba(26,107,102,0.3);box-shadow:0 8px 24px rgba(0,0,0,0.5);}",
    ".kl-filter-item{display:flex;align-items:center;gap:10px;padding:9px 14px;font-size:12px;cursor:pointer;border:none;background:transparent;width:100%;text-align:left;font-family:'Pacaembu',sans-serif;color:#7a9e9b;transition:background 0.15s;}",
    ".kl-filter-item:hover{background:rgba(26,107,102,0.15);}",
    ".kl-filter-item.active{color:#dcea75;}",
    ".kl-filter-item .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}",
    ".kl-filter-item .check{width:14px;height:14px;border:1px solid rgba(26,107,102,0.5);border-radius:2px;flex-shrink:0;display:flex;align-items:center;justify-content:center;margin-left:auto;}",
    ".kl-filter-item.checked .check{background:#dcea75;border-color:#dcea75;color:#062322;}",
    ".kl-filter-sep{border:none;border-top:1px solid rgba(26,107,102,0.15);margin:2px 0;}",

    // Fav toggle button
    ".kl-fav-toggle{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:9999px;border:1px solid rgba(26,107,102,0.4);background:transparent;color:#7a9e9b;font-family:'Pacaembu',sans-serif;font-size:12px;cursor:pointer;transition:all 0.2s;position:relative;}",
    ".kl-fav-toggle.active{border-color:rgba(232,107,90,0.5);color:#e86b5a;background:rgba(232,107,90,0.08);}",
    ".kl-badge{position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:#e86b5a;color:#fff;font-size:9px;font-weight:bold;display:flex;align-items:center;justify-content:center;}",

    ".kl-spacer{flex:1;}",
    ".kl-count{font-size:11px;color:rgba(122,158,155,0.6);white-space:nowrap;}",

    // Grid
    ".kl-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:2px;padding:2px;}",
    "@media(min-width:480px){.kl-grid{grid-template-columns:repeat(3,1fr);}}",
    "@media(min-width:768px){.kl-grid{grid-template-columns:repeat(4,1fr);}}",
    "@media(min-width:1200px){.kl-grid{grid-template-columns:repeat(5,1fr);}}",

    // Card
    ".kl-card{position:relative;cursor:pointer;overflow:hidden;background:#062322;}",
    ".kl-card::before{content:'';display:block;padding-top:100%;}",  // 1:1 aspect ratio
    ".kl-card-inner{position:absolute;inset:0;}",
    ".kl-photo{width:100%;height:100%;object-fit:cover;display:block;transition:transform 0.35s ease;}",
    ".kl-card:hover .kl-photo{transform:scale(1.04);}",
    ".kl-photo-placeholder{width:100%;height:100%;background:linear-gradient(135deg,#0a3a3c 0%,#1a6b66 100%);display:flex;align-items:center;justify-content:center;}",
    ".kl-photo-placeholder span{font-family:'SerialBlur',sans-serif;font-size:28px;text-transform:uppercase;color:rgba(220,234,117,0.25);letter-spacing:0.05em;}",

    // Name overlay — top left
    ".kl-name-overlay{position:absolute;top:0;left:0;right:0;padding:10px 10px 28px;background:linear-gradient(to bottom,rgba(6,35,34,0.82) 0%,rgba(6,35,34,0) 100%);pointer-events:none;}",
    ".kl-name{font-family:'SerialBlur',sans-serif;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;color:#fff;line-height:1.25;text-shadow:0 1px 4px rgba(0,0,0,0.5);}",
    "@media(min-width:768px){.kl-name{font-size:14px;}}",

    // Bottom gradient for fav button
    ".kl-bottom-overlay{position:absolute;bottom:0;left:0;right:0;padding:28px 10px 10px;background:linear-gradient(to top,rgba(6,35,34,0.7) 0%,rgba(6,35,34,0) 100%);display:flex;align-items:flex-end;justify-content:flex-end;pointer-events:none;}",

    // Round fav button — bottom right
    ".kl-fav-circle{position:absolute;bottom:8px;right:8px;width:34px;height:34px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);background:rgba(6,35,34,0.65);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;z-index:5;}",
    ".kl-fav-circle:hover{border-color:rgba(232,107,90,0.8);background:rgba(232,107,90,0.15);}",
    ".kl-fav-circle.on{border-color:#e86b5a;background:rgba(232,107,90,0.2);}",

    // Hover overlay (genre + stage tag)
    ".kl-hover-overlay{position:absolute;inset:0;background:rgba(6,35,34,0.0);transition:background 0.2s;pointer-events:none;}",
    ".kl-card:hover .kl-hover-overlay{background:rgba(6,35,34,0.25);}",

    // Stage tag (bottom left, shows on hover)
    ".kl-stage-tag{position:absolute;bottom:10px;left:10px;padding:3px 8px;font-family:'Pacaembu',sans-serif;font-size:10px;color:#062322;font-weight:bold;opacity:0;transition:opacity 0.2s;pointer-events:none;}",
    ".kl-card:hover .kl-stage-tag{opacity:1;}",

    // Empty state
    ".kl-empty{text-align:center;padding:64px 24px;color:rgba(122,158,155,0.6);font-size:14px;}",
    ".kl-empty-title{font-family:'SerialBlur',sans-serif;font-size:20px;text-transform:uppercase;letter-spacing:0.05em;color:rgba(220,234,117,0.4);margin-bottom:8px;}",

    // Skeleton
    ".kl-skeleton{background:#0E4B4D;min-height:100vh;}",
    ".kl-skel-header{padding:10px 16px;background:rgba(6,35,34,0.97);display:flex;gap:8px;}",
    ".kl-skel-pill{height:34px;width:100px;border-radius:9999px;background:rgba(26,107,102,0.3);animation:kl-pulse 1.5s ease-in-out infinite;}",
    ".kl-skel-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:2px;padding:2px;}",
    "@media(min-width:480px){.kl-skel-grid{grid-template-columns:repeat(3,1fr);}}",
    "@media(min-width:768px){.kl-skel-grid{grid-template-columns:repeat(4,1fr);}}",
    ".kl-skel-card{background:rgba(26,107,102,0.18);animation:kl-pulse 1.5s ease-in-out infinite;}",
    ".kl-skel-card::before{content:'';display:block;padding-top:100%;}",
    "@keyframes kl-pulse{0%,100%{opacity:0.5}50%{opacity:1}}",

    // ── Popup overlay ──────────────────────────────────────────
    ".kl-popup-overlay{position:fixed;inset:0;z-index:100;background:rgba(6,35,34,0.85);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity 0.2s;}",
    ".kl-popup-overlay.open{opacity:1;}",
    ".kl-popup{background:#0E4B4D;border:1px solid rgba(26,107,102,0.3);max-width:520px;width:100%;max-height:90vh;overflow-y:auto;position:relative;box-shadow:0 24px 64px rgba(0,0,0,0.6);}",
    ".kl-popup-photo-wrap{position:relative;width:100%;}",
    ".kl-popup-photo-wrap::before{content:'';display:block;padding-top:56.25%;}",  // 16:9 in popup
    ".kl-popup-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}",
    ".kl-popup-photo-placeholder{position:absolute;inset:0;background:linear-gradient(135deg,#0a3a3c 0%,#1a6b66 100%);display:flex;align-items:center;justify-content:center;}",
    ".kl-popup-photo-placeholder span{font-family:'SerialBlur',sans-serif;font-size:40px;text-transform:uppercase;color:rgba(220,234,117,0.2);letter-spacing:0.05em;}",
    ".kl-popup-photo-gradient{position:absolute;inset:0;background:linear-gradient(to top,rgba(14,75,77,1) 0%,rgba(14,75,77,0) 60%);}",
    ".kl-popup-body{padding:20px 20px 24px;}",
    ".kl-popup-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;}",
    ".kl-popup-name{font-family:'SerialBlur',sans-serif;font-size:22px;text-transform:uppercase;letter-spacing:0.04em;color:#fff;line-height:1.2;}",
    ".kl-popup-actions{display:flex;align-items:center;gap:8px;flex-shrink:0;}",
    ".kl-popup-fav{width:38px;height:38px;border-radius:50%;border:1px solid rgba(26,107,102,0.4);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;color:#7a9e9b;}",
    ".kl-popup-fav.on{border-color:#e86b5a;color:#e86b5a;background:rgba(232,107,90,0.1);}",
    ".kl-popup-fav:hover{border-color:rgba(232,107,90,0.6);}",
    ".kl-popup-link{width:38px;height:38px;border-radius:50%;border:1px solid rgba(26,107,102,0.4);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;color:#7a9e9b;text-decoration:none;}",
    ".kl-popup-link:hover{border-color:rgba(220,234,117,0.5);color:#dcea75;}",
    ".kl-popup-close{position:absolute;top:12px;right:12px;width:34px;height:34px;border-radius:50%;border:1px solid rgba(26,107,102,0.4);background:rgba(6,35,34,0.7);cursor:pointer;display:flex;align-items:center;justify-content:center;color:#7a9e9b;transition:all 0.2s;z-index:10;}",
    ".kl-popup-close:hover{border-color:rgba(220,234,117,0.4);color:#dcea75;}",
    ".kl-popup-meta{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;}",
    ".kl-popup-tag{padding:4px 10px;font-family:'Pacaembu',sans-serif;font-size:11px;color:#062322;font-weight:bold;}",
    ".kl-popup-tag.stage{background:var(--stage-color,#dcea75);}",
    ".kl-popup-tag.day{background:rgba(200,222,221,0.15);color:#c8dedd;}",
    ".kl-popup-tag.genre{background:rgba(200,222,221,0.08);color:rgba(200,222,221,0.7);}",
    ".kl-popup-time{font-family:'Pacaembu',sans-serif;font-size:13px;color:rgba(200,222,221,0.7);margin-bottom:16px;}",
    ".kl-popup-desc{font-family:'Pacaembu',sans-serif;font-size:13px;color:rgba(200,222,221,0.75);line-height:1.65;margin-bottom:16px;}",
    ".kl-popup-placeholder-text{font-family:'Pacaembu',sans-serif;font-size:12px;color:rgba(122,158,155,0.5);font-style:italic;}",

    "svg{display:inline-block;vertical-align:middle;}",
  ].join("\n");

  // ── Web Component ──────────────────────────────────────────
  class KoloradoLineup extends HTMLElement {
    constructor() {
      super();
      this._artists = MOCK_ARTISTS;
      this._favourites = readFavCookie();
      this._filterFavourites = false;
      this._activeStages = new Set(STAGES.map(function(s){return s.id;}));
      this._activeDays = new Set(FESTIVAL_DAYS.map(function(d){return d.id;}));
      this._showStageFilter = false;
      this._showDayFilter = false;
      this._popupArtist = null;
      this._loading = true;
    }

    connectedCallback() {
      var self = this;
      this._shadow = this.attachShadow({ mode: "open" });
      this._render();
      // Close dropdowns on outside click
      document.addEventListener("click", function(e) {
        if (!self._shadow.contains(e.target)) {
          if (self._showStageFilter || self._showDayFilter) {
            self._showStageFilter = false;
            self._showDayFilter = false;
            self._render();
          }
        }
      });
      setTimeout(function(){ self._loading = false; self._render(); }, 300);
    }

    static get observedAttributes() { return ["lineup-data"]; }
    attributeChangedCallback(name, _old, val) {
      if (name === "lineup-data" && val) {
        try {
          var raw = JSON.parse(val);
          this._artists = raw.map(function(item) {
            return {
              id: item.id || item._id || String(Math.random()),
              name: item.title || item.name || "Ismeretlen",
              stage: item.sznpad || item.stage || "Nagyszínpad",
              startTime: new Date(item.id || item.startTime),
              endTime: new Date(item.id1 || item.endTime),
              genre: item.genre1 || item.genre || "",
              url: item.website || item.url || null,
              photo: item.photo || item.photoUrl || null,
              description: item.longDescription || item.description || null,
              nationality: item.jobTitle || item.nationality || null,
            };
          }).filter(function(a){ return !isNaN(a.startTime); });
          this._loading = false;
          this._render();
        } catch(e) {
          console.error("kolorado-lineup: failed to parse lineup-data", e);
        }
      }
    }

    // ── Helpers ──────────────────────────────────────────────
    _toggleFav(id) {
      if (this._favourites.has(id)) { this._favourites.delete(id); }
      else { this._favourites.add(id); }
      writeFavCookie(this._favourites);
      this._render();
    }

    _openPopup(artist) {
      this._popupArtist = artist;
      this._render();
    }

    _closePopup() {
      this._popupArtist = null;
      this._render();
    }

    _filteredArtists() {
      var self = this;
      return this._artists.filter(function(a) {
        var sid = stageId(a.stage);
        if (!self._activeStages.has(sid)) return false;
        var dayId = getDayId(a.startTime);
        if (dayId && !self._activeDays.has(dayId)) return false;
        if (self._filterFavourites && !self._favourites.has(a.id)) return false;
        return true;
      });
    }

    // ── Render skeleton ───────────────────────────────────────
    _renderSkeleton() {
      var cards = "";
      for (var i = 0; i < 12; i++) cards += '<div class="kl-skel-card"></div>';
      return '<div class="kl-skeleton">' +
        '<div class="kl-skel-header">' +
          '<div class="kl-skel-pill"></div>' +
          '<div class="kl-skel-pill" style="width:80px"></div>' +
          '<div class="kl-skel-pill" style="width:120px"></div>' +
        '</div>' +
        '<div class="kl-skel-grid">' + cards + '</div>' +
      '</div>';
    }

    // ── Render popup ──────────────────────────────────────────
    _renderPopup(a) {
      var self = this;
      var isFav = this._favourites.has(a.id);
      var color = stageColor(a.stage);
      var dayId = getDayId(a.startTime);
      var dayLabel = "";
      for (var i = 0; i < FESTIVAL_DAYS.length; i++) {
        if (FESTIVAL_DAYS[i].id === dayId) { dayLabel = FESTIVAL_DAYS[i].label; break; }
      }
      var timeStr = fmt(a.startTime) + (a.endTime ? " – " + fmt(a.endTime) : "");
      var artistUrl = a.url ? (a.url.startsWith("http") ? a.url : "https://www.kolorado.hu" + a.url) : null;

      var photoHtml = a.photo
        ? '<img class="kl-popup-photo" src="'+a.photo+'" alt="'+a.name+'" loading="lazy">'
        : '<div class="kl-popup-photo-placeholder"><span>'+a.name.charAt(0)+'</span></div>';

      var html = '<div class="kl-popup-overlay open" id="kl-popup-overlay">' +
        '<div class="kl-popup">' +
          '<button class="kl-popup-close" id="kl-popup-close">' + ICONS.close(16) + '</button>' +
          '<div class="kl-popup-photo-wrap">' +
            photoHtml +
            '<div class="kl-popup-photo-gradient"></div>' +
          '</div>' +
          '<div class="kl-popup-body">' +
            '<div class="kl-popup-header">' +
              '<div class="kl-popup-name">' + a.name + '</div>' +
              '<div class="kl-popup-actions">' +
                (artistUrl ? '<a class="kl-popup-link" href="'+artistUrl+'" target="_blank" rel="noopener">' + ICONS.external(14) + '</a>' : '') +
                '<button class="kl-popup-fav'+(isFav?" on":"")+'" id="kl-popup-fav" data-id="'+a.id+'">' + ICONS.heart(isFav, 16) + '</button>' +
              '</div>' +
            '</div>' +
            '<div class="kl-popup-meta">' +
              '<span class="kl-popup-tag stage" style="--stage-color:'+color+'">'+a.stage+'</span>' +
              (dayLabel ? '<span class="kl-popup-tag day">'+dayLabel+'</span>' : '') +
              (a.genre ? '<span class="kl-popup-tag genre">'+a.genre+'</span>' : '') +
            '</div>' +
            (timeStr ? '<div class="kl-popup-time">'+timeStr+'</div>' : '') +
            (a.description
              ? '<div class="kl-popup-desc">'+a.description+'</div>'
              : '<div class="kl-popup-placeholder-text">Részletek hamarosan...</div>') +
          '</div>' +
        '</div>' +
      '</div>';

      return html;
    }

    // ── Main render ───────────────────────────────────────────
    _render() {
      var self = this;
      var shadow = this._shadow;

      if (this._loading) {
        shadow.innerHTML = '<style>' + CSS + '</style>' + this._renderSkeleton();
        return;
      }

      var artists = this._filteredArtists();
      var favCount = this._favourites.size;

      // ── Filter bar ─────────────────────────────────────────
      var allStagesActive = STAGES.every(function(s){ return self._activeStages.has(s.id); });
      var allDaysActive = FESTIVAL_DAYS.every(function(d){ return self._activeDays.has(d.id); });

      var stageDropdown = this._showStageFilter
        ? '<div class="kl-filter-dropdown" id="kl-stage-dropdown">' +
            STAGES.map(function(s) {
              var checked = self._activeStages.has(s.id);
              return '<button class="kl-filter-item'+(checked?" checked":"")+'" data-stage="'+s.id+'">' +
                '<span class="dot" style="background:'+s.color+'"></span>' +
                s.name +
                '<span class="check">'+(checked?'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':'')+'</span>' +
              '</button>';
            }).join('') +
          '</div>'
        : '';

      var dayDropdown = this._showDayFilter
        ? '<div class="kl-filter-dropdown" id="kl-day-dropdown">' +
            FESTIVAL_DAYS.map(function(d) {
              var checked = self._activeDays.has(d.id);
              return '<button class="kl-filter-item'+(checked?" checked":"")+'" data-day="'+d.id+'">' +
                d.label +
                '<span class="check">'+(checked?'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':'')+'</span>' +
              '</button>';
            }).join('') +
          '</div>'
        : '';

      var filterBar = '<div class="kl-header">' +
        '<div class="kl-filters">' +
          // Stage filter
          '<div class="kl-filter-wrap">' +
            '<button class="kl-filter-btn'+((!allStagesActive)?" active":"")+'" id="kl-stage-btn">' +
              ICONS.filter(12) + ' Színpad' + (!allStagesActive ? ' ('+self._activeStages.size+')' : '') + ' ' + ICONS.chevronDown(11) +
            '</button>' +
            stageDropdown +
          '</div>' +
          // Day filter
          '<div class="kl-filter-wrap">' +
            '<button class="kl-filter-btn'+((!allDaysActive)?" active":"")+'" id="kl-day-btn">' +
              'Nap' + (!allDaysActive ? ' ('+self._activeDays.size+')' : '') + ' ' + ICONS.chevronDown(11) +
            '</button>' +
            dayDropdown +
          '</div>' +
          // Favourites toggle
          '<button class="kl-fav-toggle'+(this._filterFavourites?" active":"")+'" id="kl-fav-toggle">' +
            ICONS.heart(this._filterFavourites, 12) + ' Kedvencek' +
            (favCount > 0 ? '<span class="kl-badge">'+favCount+'</span>' : '') +
          '</button>' +
          '<span class="kl-spacer"></span>' +
          '<span class="kl-count">'+artists.length+' előadó</span>' +
        '</div>' +
      '</div>';

      // ── Grid ───────────────────────────────────────────────
      var gridHtml = '';
      if (artists.length === 0) {
        gridHtml = '<div class="kl-empty">' +
          '<div class="kl-empty-title">Nincs találat</div>' +
          '<div>Próbálj más szűrőt!</div>' +
        '</div>';
      } else {
        gridHtml = '<div class="kl-grid">';
        artists.forEach(function(a) {
          var isFav = self._favourites.has(a.id);
          var color = stageColor(a.stage);
          var initials = a.name.split(" ").slice(0,2).map(function(w){return w[0]||"";}).join("").toUpperCase();

          var photoHtml = a.photo
            ? '<img class="kl-photo" src="'+a.photo+'" alt="'+a.name+'" loading="lazy">'
            : '<div class="kl-photo-placeholder"><span>'+initials+'</span></div>';

          gridHtml +=
            '<div class="kl-card" data-id="'+a.id+'">' +
              '<div class="kl-card-inner">' +
                photoHtml +
                '<div class="kl-hover-overlay"></div>' +
                '<div class="kl-name-overlay"><div class="kl-name">'+a.name+'</div></div>' +
                '<div class="kl-bottom-overlay"></div>' +
                '<div class="kl-stage-tag" style="background:'+color+'">'+a.stage+'</div>' +
                '<button class="kl-fav-circle'+(isFav?" on":"")+'" data-fav="'+a.id+'">' +
                  ICONS.heart(isFav, 14) +
                '</button>' +
              '</div>' +
            '</div>';
        });
        gridHtml += '</div>';
      }

      // ── Popup ──────────────────────────────────────────────
      var popupHtml = this._popupArtist ? this._renderPopup(this._popupArtist) : '';

      // ── Assemble ───────────────────────────────────────────
      shadow.innerHTML = '<style>' + CSS + '</style>' +
        '<div class="kl-root">' +
          filterBar +
          gridHtml +
          popupHtml +
        '</div>';

      // ── Event listeners ────────────────────────────────────
      // Stage filter button
      var stageBtn = shadow.getElementById("kl-stage-btn");
      if (stageBtn) stageBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        self._showStageFilter = !self._showStageFilter;
        self._showDayFilter = false;
        self._render();
      });

      // Stage filter items
      var stageItems = shadow.querySelectorAll("[data-stage]");
      stageItems.forEach(function(btn) {
        btn.addEventListener("click", function(e) {
          e.stopPropagation();
          var sid = btn.getAttribute("data-stage");
          if (self._activeStages.has(sid)) { self._activeStages.delete(sid); }
          else { self._activeStages.add(sid); }
          self._render();
          // Re-open dropdown after re-render
          self._showStageFilter = true;
          self._render();
        });
      });

      // Day filter button
      var dayBtn = shadow.getElementById("kl-day-btn");
      if (dayBtn) dayBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        self._showDayFilter = !self._showDayFilter;
        self._showStageFilter = false;
        self._render();
      });

      // Day filter items
      var dayItems = shadow.querySelectorAll("[data-day]");
      dayItems.forEach(function(btn) {
        btn.addEventListener("click", function(e) {
          e.stopPropagation();
          var did = btn.getAttribute("data-day");
          if (self._activeDays.has(did)) { self._activeDays.delete(did); }
          else { self._activeDays.add(did); }
          self._render();
          self._showDayFilter = true;
          self._render();
        });
      });

      // Favourites toggle
      var favToggle = shadow.getElementById("kl-fav-toggle");
      if (favToggle) favToggle.addEventListener("click", function() {
        self._filterFavourites = !self._filterFavourites;
        self._render();
      });

      // Card clicks → open popup
      var cards = shadow.querySelectorAll(".kl-card");
      cards.forEach(function(card) {
        card.addEventListener("click", function(e) {
          // Don't open popup if fav button was clicked
          if (e.target.closest("[data-fav]")) return;
          var id = card.getAttribute("data-id");
          var artist = self._artists.find(function(a){ return a.id === id; });
          if (artist) self._openPopup(artist);
        });
      });

      // Fav circle buttons on cards
      var favBtns = shadow.querySelectorAll("[data-fav]");
      favBtns.forEach(function(btn) {
        btn.addEventListener("click", function(e) {
          e.stopPropagation();
          self._toggleFav(btn.getAttribute("data-fav"));
        });
      });

      // Popup close
      var popupClose = shadow.getElementById("kl-popup-close");
      if (popupClose) popupClose.addEventListener("click", function() { self._closePopup(); });

      var popupOverlay = shadow.getElementById("kl-popup-overlay");
      if (popupOverlay) popupOverlay.addEventListener("click", function(e) {
        if (e.target === popupOverlay) self._closePopup();
      });

      // Popup fav button
      var popupFav = shadow.getElementById("kl-popup-fav");
      if (popupFav) popupFav.addEventListener("click", function() {
        var id = popupFav.getAttribute("data-id");
        self._toggleFav(id);
        // Update popup artist reference and re-render
        self._popupArtist = self._artists.find(function(a){ return a.id === id; }) || self._popupArtist;
        self._render();
      });

      // Close dropdowns when clicking inside shadow but outside dropdowns
      shadow.addEventListener("click", function(e) {
        var inStage = e.target.closest("#kl-stage-btn") || e.target.closest("#kl-stage-dropdown");
        var inDay = e.target.closest("#kl-day-btn") || e.target.closest("#kl-day-dropdown");
        if (!inStage && self._showStageFilter) { self._showStageFilter = false; self._render(); }
        if (!inDay && self._showDayFilter) { self._showDayFilter = false; self._render(); }
      });
    }
  }

  if (!customElements.get("kolorado-lineup")) {
    customElements.define("kolorado-lineup", KoloradoLineup);
  }

})();
