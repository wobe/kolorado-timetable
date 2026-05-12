// ============================================================
// wix-custom-element/kolorado-lineup.js
// Kolorádó Festival — Artist Lineup Grid Custom Element v2
//
// Changes in v2:
//   - Checkbox-style multi-select dropdowns for Stage and Day filters
//   - Artists sorted alphabetically (A→Z)
//   - Name label moved to bottom-left, aligned with the heart button
//   - Yellow (#FEFFC0) background, purple (#642CFF) accents
//
// Features:
//   - Responsive photo grid (2 cols mobile → 5 cols desktop)
//   - 1:1 square artist photos with SerialBlur name overlay (bottom-left)
//   - Round favourite button (bottom-right) — shared cookie with timetable
//   - Multi-select checkbox filter bar: by Stage and by Day
//   - Click → popup with artist details
//   - Shared favourites cookie: "kolorado_favourites" (same as timetable)
//   - Loading skeleton
//   - CMS data via lineup-data attribute (JSON string from Velo)
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
    { id: "nagyszinpad",  name: "Nagyszínpad" },
    { id: "balterem",     name: "Bálterem" },
    { id: "toszinpad",    name: "Tószínpad" },
    { id: "hangar",       name: "Hangár" },
    { id: "platanos",     name: "Platános" },
    { id: "listeningbar", name: "Listening Bar" },
    { id: "healing",      name: "Healing" },
    { id: "ring",         name: "Ring" },
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

  // ── Day helper ─────────────────────────────────────────────
  function getDayId(startTime) {
    if (!startTime) return null;
    var d = startTime instanceof Date ? startTime : new Date(startTime);
    if (isNaN(d)) return null;
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
        ? '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="#e53e3e" stroke="#e53e3e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'
        : '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="#642CFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
    },
    close: function(size) {
      size = size || 20;
      return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    },
    external: function(size) {
      size = size || 14;
      return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
    },
    chevronDown: function(size) {
      size = size || 14;
      return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
    },
    check: function() {
      return '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2" stroke="#FEFFC0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    },
  };

  // ── CSS ────────────────────────────────────────────────────
  var CSS = [
    "@font-face{font-family:'SerialBlur';src:url('"+SERIAL_BLUR_URL+"') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}",
    "@font-face{font-family:'Pacaembu';src:url('"+PACAEMBU_URL+"') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}",
    "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}",
    ":host{display:block;width:100%;font-family:'Pacaembu',sans-serif;}",

    // Root — yellow background
    ".kl-root{background:#FEFFC0;min-height:100vh;color:#642CFF;}",

    // Header / filter bar
    ".kl-header{position:sticky;top:0;z-index:40;background:#FEFFC0;border-bottom:2px solid rgba(100,44,255,0.15);padding:10px 16px;}",
    ".kl-filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}",

    // Filter dropdown wrapper
    ".kl-filter-wrap{position:relative;}",

    // Filter pill button
    ".kl-filter-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:9999px;border:none;background:rgba(100,44,255,0.12);color:#642CFF;font-family:'Pacaembu',sans-serif;font-size:13px;cursor:pointer;transition:all 0.15s;white-space:nowrap;}",
    ".kl-filter-btn.active{background:#642CFF;color:#FEFFC0;}",

    // Clear × inside pill
    ".kl-filter-clear{margin-left:2px;width:16px;height:16px;border-radius:50%;background:rgba(255,255,255,0.3);display:inline-flex;align-items:center;justify-content:center;font-size:11px;line-height:1;cursor:pointer;}",

    // Checkbox dropdown panel
    ".kl-filter-dropdown{position:absolute;left:0;top:calc(100% + 6px);z-index:60;min-width:210px;background:#FEFFC0;border:2px solid rgba(100,44,255,0.2);box-shadow:0 8px 24px rgba(100,44,255,0.15);}",

    // Checkbox row
    ".kl-filter-item{display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;border:none;background:transparent;width:100%;text-align:left;font-family:'Pacaembu',sans-serif;font-size:13px;color:#642CFF;transition:background 0.1s;}",
    ".kl-filter-item:hover{background:rgba(100,44,255,0.06);}",
    ".kl-filter-item.checked{background:rgba(100,44,255,0.08);}",

    // Custom checkbox box
    ".kl-checkbox{width:16px;height:16px;border:2px solid #642CFF;border-radius:3px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:transparent;transition:all 0.1s;}",
    ".kl-filter-item.checked .kl-checkbox{background:#642CFF;border-color:#642CFF;}",
    ".kl-item-label{font-weight:400;}",
    ".kl-filter-item.checked .kl-item-label{font-weight:700;}",

    // Fav toggle button
    ".kl-fav-toggle{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:9999px;border:none;background:rgba(100,44,255,0.12);color:#642CFF;font-family:'Pacaembu',sans-serif;font-size:13px;cursor:pointer;transition:all 0.15s;position:relative;}",
    ".kl-fav-toggle.active{background:#e53e3e;color:#fff;}",
    ".kl-badge{background:#642CFF;color:#FEFFC0;border-radius:9999px;padding:1px 7px;font-size:11px;font-weight:700;margin-left:2px;}",
    ".kl-fav-toggle.active .kl-badge{background:rgba(255,255,255,0.3);color:#fff;}",

    ".kl-spacer{flex:1;}",
    ".kl-count{font-size:12px;color:rgba(100,44,255,0.5);white-space:nowrap;}",

    // Grid — 16px gap, yellow bg
    ".kl-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;padding:16px;background:#FEFFC0;}",
    "@media(min-width:480px){.kl-grid{grid-template-columns:repeat(3,1fr);}}",
    "@media(min-width:768px){.kl-grid{grid-template-columns:repeat(4,1fr);}}",
    "@media(min-width:1200px){.kl-grid{grid-template-columns:repeat(5,1fr);}}",

    // Card — square aspect ratio
    ".kl-card{position:relative;cursor:pointer;overflow:hidden;background:#e8e9a0;}",
    ".kl-card::before{content:'';display:block;padding-top:100%;}",
    ".kl-card-inner{position:absolute;inset:0;}",
    ".kl-photo{width:100%;height:100%;object-fit:cover;display:block;transition:transform 0.35s ease;}",
    ".kl-card:hover .kl-photo{transform:scale(1.04);}",
    ".kl-photo-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;}",
    ".kl-photo-placeholder span{font-family:'SerialBlur',sans-serif;font-size:28px;text-transform:uppercase;color:rgba(100,44,255,0.2);letter-spacing:0.05em;}",

    // Name label — bottom-left, yellow bg, aligned with heart button
    ".kl-name-label{position:absolute;bottom:10px;left:10px;right:56px;padding:4px 8px;background:#FEFFC0;z-index:3;}",
    ".kl-name{font-family:'SerialBlur',sans-serif;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;color:#642CFF;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;}",
    "@media(min-width:768px){.kl-name{font-size:14px;}}",

    // Round fav button — bottom right
    ".kl-fav-circle{position:absolute;bottom:10px;right:10px;width:36px;height:36px;border-radius:50%;border:none;background:rgba(254,255,192,0.95);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;z-index:4;box-shadow:0 2px 10px rgba(0,0,0,0.25);}",
    ".kl-fav-circle.on{background:#e53e3e;}",

    // Hover overlay
    ".kl-hover-overlay{position:absolute;inset:0;background:rgba(100,44,255,0.0);transition:background 0.2s;pointer-events:none;}",
    ".kl-card:hover .kl-hover-overlay{background:rgba(100,44,255,0.08);}",

    // Empty state
    ".kl-empty{text-align:center;padding:64px 24px;color:rgba(100,44,255,0.4);font-size:14px;}",
    ".kl-empty-title{font-family:'SerialBlur',sans-serif;font-size:20px;text-transform:uppercase;letter-spacing:0.05em;color:rgba(100,44,255,0.3);margin-bottom:8px;}",

    // Skeleton
    ".kl-skeleton{background:#FEFFC0;min-height:100vh;}",
    ".kl-skel-header{padding:10px 16px;background:#FEFFC0;display:flex;gap:8px;border-bottom:2px solid rgba(100,44,255,0.15);}",
    ".kl-skel-pill{height:34px;width:100px;border-radius:9999px;background:rgba(100,44,255,0.12);animation:kl-pulse 1.5s ease-in-out infinite;}",
    ".kl-skel-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;padding:16px;}",
    "@media(min-width:480px){.kl-skel-grid{grid-template-columns:repeat(3,1fr);}}",
    "@media(min-width:768px){.kl-skel-grid{grid-template-columns:repeat(4,1fr);}}",
    ".kl-skel-card{background:rgba(100,44,255,0.1);animation:kl-pulse 1.5s ease-in-out infinite;}",
    ".kl-skel-card::before{content:'';display:block;padding-top:100%;}",
    "@keyframes kl-pulse{0%,100%{opacity:0.5}50%{opacity:1}}",

    // ── Popup overlay ──────────────────────────────────────────
    ".kl-popup-overlay{position:fixed;inset:0;z-index:100;background:rgba(14,75,77,0.88);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px;}",
    ".kl-popup{background:#FEFFC0;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;position:relative;box-shadow:0 24px 64px rgba(0,0,0,0.4);}",
    ".kl-popup-photo-wrap{position:relative;width:100%;padding-bottom:100%;}",
    ".kl-popup-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}",
    ".kl-popup-photo-placeholder{position:absolute;inset:0;background:#e8e9a0;display:flex;align-items:center;justify-content:center;}",
    ".kl-popup-photo-placeholder span{font-family:'SerialBlur',sans-serif;font-size:48px;text-transform:uppercase;color:#642CFF;letter-spacing:0.05em;}",
    ".kl-popup-close{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;background:rgba(254,255,192,0.9);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#642CFF;font-size:20px;font-weight:700;z-index:10;line-height:1;}",
    ".kl-popup-body{padding:20px 24px 24px;}",
    ".kl-popup-name{font-family:'SerialBlur',sans-serif;font-size:24px;text-transform:uppercase;letter-spacing:0.04em;color:#642CFF;line-height:1.1;margin-bottom:8px;}",
    ".kl-popup-meta{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}",
    ".kl-popup-tag{padding:3px 10px;font-family:'Pacaembu',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;}",
    ".kl-popup-tag.stage{background:#642CFF;color:#FEFFC0;}",
    ".kl-popup-tag.genre{background:rgba(100,44,255,0.12);color:#642CFF;}",
    ".kl-popup-tag.nat{background:rgba(100,44,255,0.08);color:#642CFF;text-transform:none;}",
    ".kl-popup-time{font-family:'Pacaembu',sans-serif;font-size:13px;color:#0E4B4D;margin-bottom:10px;}",
    ".kl-popup-desc{font-family:'Pacaembu',sans-serif;font-size:13px;color:#333;line-height:1.65;margin-bottom:16px;}",
    ".kl-popup-placeholder-text{font-family:'Pacaembu',sans-serif;font-size:13px;color:rgba(0,0,0,0.35);margin-bottom:16px;}",
    ".kl-popup-actions{display:flex;gap:10px;flex-wrap:wrap;}",
    ".kl-popup-fav-btn{display:inline-flex;align-items:center;gap:7px;padding:8px 18px;border-radius:9999px;border:none;cursor:pointer;font-family:'Pacaembu',sans-serif;font-size:13px;transition:all 0.15s;}",
    ".kl-popup-fav-btn.off{background:#642CFF;color:#fff;}",
    ".kl-popup-fav-btn.on{background:#e53e3e;color:#fff;}",
    ".kl-popup-ext-link{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:9999px;background:rgba(100,44,255,0.1);color:#642CFF;font-family:'Pacaembu',sans-serif;font-size:13px;text-decoration:none;}",

    "svg{display:inline-block;vertical-align:middle;}",
  ].join("\n");

  // ── Web Component ──────────────────────────────────────────
  class KoloradoLineup extends HTMLElement {
    constructor() {
      super();
      this._artists = MOCK_ARTISTS;
      this._favourites = readFavCookie();
      this._filterFavourites = false;
      // Multi-select: empty set = no filter (show all)
      this._selectedStages = new Set();
      this._selectedDays = new Set();
      this._showStageFilter = false;
      this._showDayFilter = false;
      this._popupArtist = null;
      this._loading = true;
    }

    connectedCallback() {
      var self = this;
      this._shadow = this.attachShadow({ mode: "open" });
      this._render();
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
      // Sort alphabetically first
      var sorted = this._artists.slice().sort(function(a, b) {
        return a.name.localeCompare(b.name, "hu", { sensitivity: "base" });
      });
      return sorted.filter(function(a) {
        // Stage filter: empty set = show all
        if (self._selectedStages.size > 0) {
          var sid = stageId(a.stage);
          if (!self._selectedStages.has(sid)) return false;
        }
        // Day filter: empty set = show all
        if (self._selectedDays.size > 0) {
          var dayId = getDayId(a.startTime);
          if (!dayId || !self._selectedDays.has(dayId)) return false;
        }
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

    // ── Render checkbox dropdown ──────────────────────────────
    _renderCheckboxDropdown(id, options, selectedSet) {
      return '<div class="kl-filter-dropdown" id="'+id+'">' +
        options.map(function(opt) {
          var checked = selectedSet.has(opt.id);
          return '<button class="kl-filter-item'+(checked?" checked":"")+'" data-opt-id="'+opt.id+'" data-dropdown="'+id+'">' +
            '<span class="kl-checkbox">'+(checked ? ICONS.check() : '')+'</span>' +
            '<span class="kl-item-label">'+opt.name+'</span>' +
          '</button>';
        }).join('') +
      '</div>';
    }

    // ── Render popup ──────────────────────────────────────────
    _renderPopup(a) {
      var isFav = this._favourites.has(a.id);
      var timeStr = fmt(a.startTime) + (a.endTime ? " – " + fmt(a.endTime) : "");
      var artistUrl = a.url ? (a.url.startsWith("http") ? a.url : "https://www.kolorado.hu" + a.url) : null;

      var photoHtml = a.photo
        ? '<img class="kl-popup-photo" src="'+a.photo+'" alt="'+a.name+'" loading="lazy">'
        : '<div class="kl-popup-photo-placeholder"><span>'+a.name.charAt(0)+'</span></div>';

      return '<div class="kl-popup-overlay" id="kl-popup-overlay">' +
        '<div class="kl-popup">' +
          '<div class="kl-popup-photo-wrap">' +
            photoHtml +
            '<button class="kl-popup-close" id="kl-popup-close">×</button>' +
          '</div>' +
          '<div class="kl-popup-body">' +
            '<div class="kl-popup-name">'+a.name+'</div>' +
            '<div class="kl-popup-meta">' +
              (a.stage ? '<span class="kl-popup-tag stage">'+a.stage+'</span>' : '') +
              (a.genre ? '<span class="kl-popup-tag genre">'+a.genre+'</span>' : '') +
              (a.nationality ? '<span class="kl-popup-tag nat">'+a.nationality+'</span>' : '') +
            '</div>' +
            (timeStr ? '<div class="kl-popup-time">'+timeStr+'</div>' : '') +
            (a.description
              ? '<div class="kl-popup-desc">'+a.description+'</div>'
              : '<div class="kl-popup-placeholder-text">Részletek hamarosan...</div>') +
            '<div class="kl-popup-actions">' +
              '<button class="kl-popup-fav-btn '+(isFav?"on":"off")+'" id="kl-popup-fav" data-id="'+a.id+'">' +
                ICONS.heart(isFav, 16) +
                (isFav ? " Kedvenc" : " Kedvencnek") +
              '</button>' +
              (artistUrl ? '<a class="kl-popup-ext-link" href="'+artistUrl+'" target="_blank" rel="noopener">↗ Kolorádó oldal</a>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
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

      // ── Stage filter pill label ────────────────────────────
      var stageLabel = "Színpad";
      if (this._selectedStages.size === 1) {
        var sid = Array.from(this._selectedStages)[0];
        for (var i = 0; i < STAGES.length; i++) {
          if (STAGES[i].id === sid) { stageLabel = STAGES[i].name; break; }
        }
      } else if (this._selectedStages.size > 1) {
        stageLabel = this._selectedStages.size + " kiválasztva";
      }

      // ── Day filter pill label ──────────────────────────────
      var dayLabel = "Nap";
      if (this._selectedDays.size === 1) {
        var did = Array.from(this._selectedDays)[0];
        for (var j = 0; j < FESTIVAL_DAYS.length; j++) {
          if (FESTIVAL_DAYS[j].id === did) { dayLabel = FESTIVAL_DAYS[j].label; break; }
        }
      } else if (this._selectedDays.size > 1) {
        dayLabel = this._selectedDays.size + " kiválasztva";
      }

      var stageActive = this._selectedStages.size > 0;
      var dayActive = this._selectedDays.size > 0;

      // Clear × button inside pill
      var stageClear = stageActive ? '<span class="kl-filter-clear" id="kl-stage-clear">×</span>' : '';
      var dayClear = dayActive ? '<span class="kl-filter-clear" id="kl-day-clear">×</span>' : '';

      var stageDropdownHtml = this._showStageFilter
        ? this._renderCheckboxDropdown("kl-stage-dropdown", STAGES, this._selectedStages)
        : '';
      var dayDropdownHtml = this._showDayFilter
        ? this._renderCheckboxDropdown("kl-day-dropdown", FESTIVAL_DAYS, this._selectedDays)
        : '';

      var filterBar = '<div class="kl-header">' +
        '<div class="kl-filters">' +
          '<div class="kl-filter-wrap">' +
            '<button class="kl-filter-btn'+(stageActive?" active":"")+'" id="kl-stage-btn">' +
              '<span style="font-size:10px">▼</span> '+stageLabel+stageClear +
            '</button>' +
            stageDropdownHtml +
          '</div>' +
          '<div class="kl-filter-wrap">' +
            '<button class="kl-filter-btn'+(dayActive?" active":"")+'" id="kl-day-btn">' +
              '<span style="font-size:10px">▼</span> '+dayLabel+dayClear +
            '</button>' +
            dayDropdownHtml +
          '</div>' +
          '<button class="kl-fav-toggle'+(this._filterFavourites?" active":"")+'" id="kl-fav-toggle">' +
            ICONS.heart(this._filterFavourites, 14) + ' Kedvencek' +
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
          var initials = a.name.split(" ").slice(0,2).map(function(w){return w[0]||"";}).join("").toUpperCase();

          var photoHtml = a.photo
            ? '<img class="kl-photo" src="'+a.photo+'" alt="'+a.name+'" loading="lazy">'
            : '<div class="kl-photo-placeholder"><span>'+initials+'</span></div>';

          gridHtml +=
            '<div class="kl-card" data-id="'+a.id+'">' +
              '<div class="kl-card-inner">' +
                photoHtml +
                '<div class="kl-hover-overlay"></div>' +
                // Heart button — bottom right
                '<button class="kl-fav-circle'+(isFav?" on":"")+'" data-fav="'+a.id+'">' +
                  ICONS.heart(isFav, 16) +
                '</button>' +
                // Name label — bottom left, aligned with heart button
                '<div class="kl-name-label"><span class="kl-name">'+a.name+'</span></div>' +
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
        // If click was on the clear button, clear and close
        if (e.target.id === "kl-stage-clear") {
          self._selectedStages = new Set();
          self._showStageFilter = false;
          self._render();
          return;
        }
        self._showStageFilter = !self._showStageFilter;
        self._showDayFilter = false;
        self._render();
      });

      // Day filter button
      var dayBtn = shadow.getElementById("kl-day-btn");
      if (dayBtn) dayBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        if (e.target.id === "kl-day-clear") {
          self._selectedDays = new Set();
          self._showDayFilter = false;
          self._render();
          return;
        }
        self._showDayFilter = !self._showDayFilter;
        self._showStageFilter = false;
        self._render();
      });

      // Checkbox items — stage
      var stageItems = shadow.querySelectorAll('[data-dropdown="kl-stage-dropdown"]');
      stageItems.forEach(function(btn) {
        btn.addEventListener("click", function(e) {
          e.stopPropagation();
          var id = btn.getAttribute("data-opt-id");
          if (self._selectedStages.has(id)) { self._selectedStages.delete(id); }
          else { self._selectedStages.add(id); }
          self._showStageFilter = true;
          self._render();
        });
      });

      // Checkbox items — day
      var dayItems = shadow.querySelectorAll('[data-dropdown="kl-day-dropdown"]');
      dayItems.forEach(function(btn) {
        btn.addEventListener("click", function(e) {
          e.stopPropagation();
          var id = btn.getAttribute("data-opt-id");
          if (self._selectedDays.has(id)) { self._selectedDays.delete(id); }
          else { self._selectedDays.add(id); }
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
