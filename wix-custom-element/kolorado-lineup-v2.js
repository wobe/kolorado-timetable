// ============================================================
// wix-custom-element/kolorado-lineup-v2.js
// Kolorádó Festival — Artist Lineup Grid  v2
//
// Rewritten to exactly match LineupGrid.tsx + ArtistPopup.tsx
//
// Header (all screen sizes):
//   [ZENE | NEMZENE]  [♥ Kedvencek]  ... [🔍]
//   Mobile: split pill compact, Kedvencek = heart icon only
//   No funnel / dropdown button
//
// Popup:
//   Mobile: 4:3 image top, name top-left, fav bottom-right,
//           genre, description, SoundCloud/YouTube player
//   Desktop (≥640px): landscape — image left 38%, info right scrollable
//   Navigation: swipe (touch), ‹ › arrows (desktop), keyboard ← → Esc
//
// CMS field mapping (from lineupApi.jsw):
//   id, name, photo, stage, startTime, endTime,
//   genre, longDescription, soundcloudLink, youtubeLink,
//   programtipus, nationality, url
//
// Usage in Wix:
//   1. Host this file (CDN / Wix Public Files)
//   2. Add Custom Element with tag: kolorado-lineup
//   3. Set ID to: koloradoLineup
//   4. Add Velo page code from wix-velo-code/lineup-grid-page.js
// ============================================================

(function () {
  "use strict";

  // ── Constants ───────────────────────────────────────────────
  var SERIAL_BLUR_URL = "https://cdn.jsdelivr.net/gh/wobe/kolorado-timetable@main/wix-custom-element/SerialBlurTRIAL-Bleed.ttf";
  var PACAEMBU_URL    = "https://cdn.jsdelivr.net/gh/wobe/kolorado-timetable@main/wix-custom-element/Pacaembu-Medium.ttf";

  var FESTIVAL_DAYS = [
    { id: "wed", label: "Szerda",    date: "2026-07-15" },
    { id: "thu", label: "Csütörtök", date: "2026-07-16" },
    { id: "fri", label: "Péntek",    date: "2026-07-17" },
    { id: "sat", label: "Szombat",   date: "2026-07-18" },
  ];
  var DAY_START_HOUR = 10; // festival day boundary (same as React app)

  var FAV_COOKIE = "kolorado_favourites";

  // Detect language: check <html lang>, URL param ?lang=, or navigator.language
  function detectLang() {
    try {
      var p = new URLSearchParams(window.location.search);
      var q = (p.get("lang") || "").toLowerCase();
      if (q) return q.startsWith("hu") ? "hu" : "en";
    } catch (e) {}
    var htmlLang = (document.documentElement.lang || "").toLowerCase();
    if (htmlLang) return htmlLang.startsWith("hu") ? "hu" : "en";
    var nav = ((navigator.language || navigator.userLanguage) || "").toLowerCase();
    return nav.startsWith("hu") ? "hu" : "en";
  }
  var LANG = detectLang();

  var I18N = {
    hu: {
      zene:          "ZENE",
      nemzene:       "NEMZENE",
      favourites:    "Kedvencek",
      search:        "Keresés...",
      noResults:     "Nincs találat",
      tryOtherFilter:"Próbálj más szűrőt!",
      detailsSoon:   "Részletek hamarosan...",
      timetable:     "→ Menetrend",
      favToast:      "A kedvenceid a böngésződben tárolódnak. Itt megtalálod később is, azonban más eszközeidre nem szinkronizálódnak.",
    },
    en: {
      zene:          "MUSIC",
      nemzene:       "NON-MUSIC",
      favourites:    "Favourites",
      search:        "Search...",
      noResults:     "No results",
      tryOtherFilter:"Try a different filter!",
      detailsSoon:   "Details coming soon...",
      timetable:     "→ Timetable",
      favToast:      "Your favourites are stored in this browser. They'll be here when you return, but won't sync to other devices.",
    },
  };
  var i18n = I18N[LANG] || I18N.en;

  // ── Helpers ─────────────────────────────────────────────────
  function esc(s) {
    var str = Array.isArray(s) ? s.join(", ") : (s == null ? "" : String(s));
    return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function fmtTime(d) {
    if (!d) return "";
    var t = d instanceof Date ? d : new Date(d);
    if (isNaN(t)) return "";
    var h = t.getHours(), m = t.getMinutes();
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }

  function getDayId(startTime) {
    if (!startTime) return null;
    var d = startTime instanceof Date ? startTime : new Date(startTime);
    if (isNaN(d)) return null;
    var check = new Date(d);
    if (d.getHours() < DAY_START_HOUR) check.setDate(check.getDate() - 1);
    var ds = check.toISOString().slice(0, 10);
    for (var i = 0; i < FESTIVAL_DAYS.length; i++) {
      if (FESTIVAL_DAYS[i].date === ds) return FESTIVAL_DAYS[i].id;
    }
    return null;
  }

  function getDayLabel(startTime) {
    var id = getDayId(startTime);
    if (!id) return null;
    for (var i = 0; i < FESTIVAL_DAYS.length; i++) {
      if (FESTIVAL_DAYS[i].id === id) return FESTIVAL_DAYS[i].label;
    }
    return null;
  }

  // ── Cookie helpers ───────────────────────────────────────────
  function readFavCookie() {
    try {
      var m = document.cookie.match(new RegExp("(?:^|; )" + FAV_COOKIE + "=([^;]*)"));
      if (m) return new Set(JSON.parse(decodeURIComponent(m[1])));
    } catch (e) {}
    return new Set();
  }

  function writeFavCookie(favSet) {
    try {
      var exp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = FAV_COOKIE + "=" + encodeURIComponent(JSON.stringify(Array.from(favSet))) +
        "; expires=" + exp + "; path=/; SameSite=Lax";
    } catch (e) {}
  }

  // ── SVG icons ────────────────────────────────────────────────
  var ICONS = {
    heart: function (filled, size, color) {
      size = size || 18; color = color || "#642CFF";
      return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="' + (filled ? color : "none") + '" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
    },
    heartWhite: function (filled, size) {
      size = size || 18;
      return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="' + (filled ? "white" : "none") + '" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
    },
    search: function (size) {
      size = size || 16;
      return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    },
    close: function (size) {
      size = size || 12;
      return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    },
  };

  // ── CSS ──────────────────────────────────────────────────────
  var CSS = [
    "@font-face{font-family:'SerialBlur';src:url('" + SERIAL_BLUR_URL + "') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}",
    "@font-face{font-family:'Pacaembu';src:url('" + PACAEMBU_URL + "') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}",
    "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}",
    ":host{display:block;width:100%;font-family:'Pacaembu',sans-serif;}",
    "svg{display:inline-block;vertical-align:middle;}",

    // Root
    ".kl-root{background:#FEFFC0;min-height:100vh;color:#642CFF;}",

    // ── Header ──
    ".kl-header{position:sticky;top:0;z-index:40;background:#FEFFC0;border-bottom:1.5px solid rgba(100,44,255,0.1);padding:10px 16px;display:flex;align-items:center;gap:8px;flex-wrap:nowrap;transition:border-color 0.2s;}",
    ".kl-header.scrolled{border-bottom:1.5px solid rgba(100,44,255,0.2);}",

    // ZENE/NEMZENE split pill
    ".kl-split-pill{display:inline-flex;border-radius:9999px;overflow:hidden;border:1.5px solid rgba(100,44,255,0.25);flex-shrink:0;}",
    ".kl-split-half{padding:6px 14px;border:none;background:transparent;color:#642CFF;font-family:'Pacaembu',sans-serif;font-size:13px;cursor:pointer;transition:all 0.15s;white-space:nowrap;}",
    ".kl-split-half:first-child{border-right:1px solid rgba(100,44,255,0.2);}",
    ".kl-split-half.active{background:#642CFF;color:#FEFFC0;}",
    ".kl-split-half:hover:not(.active){background:rgba(100,44,255,0.08);}",

    // Fav toggle
    ".kl-fav-toggle{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:9999px;border:none;background:rgba(100,44,255,0.12);color:#642CFF;font-family:'Pacaembu',sans-serif;font-size:13px;cursor:pointer;transition:all 0.15s;flex-shrink:0;}",
    ".kl-fav-toggle.active{background:#e53e3e;color:#fff;}",
    ".kl-badge{background:#642CFF;color:#FEFFC0;border-radius:9999px;padding:1px 7px;font-size:11px;font-weight:700;margin-left:2px;}",
    ".kl-fav-toggle.active .kl-badge{background:rgba(255,255,255,0.3);color:#fff;}",

    // Mobile: Kedvencek icon-only, split pill compact
    "@media(max-width:639px){.kl-fav-label{display:none;}.kl-badge{display:none;}.kl-fav-toggle{padding:6px 10px;}.kl-split-half{padding:5px 10px;}}",

    // Search
    ".kl-search-row{display:flex;align-items:center;margin-left:auto;flex-shrink:0;}",
    ".kl-search-pill{display:flex;align-items:center;gap:6px;height:36px;border-radius:9999px;border:1.5px solid rgba(100,44,255,0.25);background:transparent;overflow:hidden;width:36px;transition:width 0.2s ease,background 0.15s ease,border-color 0.15s ease,padding 0.2s ease;cursor:pointer;padding:0;justify-content:center;flex-shrink:0;}",
    ".kl-search-pill.open{width:200px;background:rgba(100,44,255,0.07);border-color:rgba(100,44,255,0.35);padding:0 10px;justify-content:flex-start;cursor:default;}",
    ".kl-search-icon{display:flex;align-items:center;flex-shrink:0;}",
    ".kl-search-input{flex:1;background:transparent;border:none;outline:none;color:#642CFF;font-family:'Pacaembu',sans-serif;font-size:13px;min-width:0;display:none;width:0;}",
    ".kl-search-pill.open .kl-search-input{display:block;width:100%;}",
    ".kl-search-clear{background:none;border:none;cursor:pointer;color:rgba(100,44,255,0.5);display:none;align-items:center;padding:0;flex-shrink:0;}",
    ".kl-search-pill.open .kl-search-clear{display:flex;}",

    // ── Grid ──
    ".kl-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;padding:16px;background:#FEFFC0;}",
    "@media(min-width:480px){.kl-grid{grid-template-columns:repeat(3,1fr);}}",
    "@media(min-width:768px){.kl-grid{grid-template-columns:repeat(4,1fr);}}",
    "@media(min-width:1200px){.kl-grid{grid-template-columns:repeat(5,1fr);}}",

    // Card
    ".kl-card{position:relative;cursor:pointer;overflow:hidden;background:#e8e9a0;}",
    ".kl-card::before{content:'';display:block;padding-top:100%;}",
    ".kl-card-inner{position:absolute;inset:0;}",
    ".kl-photo{width:100%;height:100%;object-fit:cover;display:block;transition:transform 0.35s ease;}",
    ".kl-card:hover .kl-photo{transform:scale(1.04);}",
    ".kl-photo-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;}",
    ".kl-photo-placeholder span{font-family:'SerialBlur',sans-serif;font-size:28px;text-transform:uppercase;color:rgba(100,44,255,0.2);}",
    // Name label — top-left, per-line yellow bg
    ".kl-name-wrap{position:absolute;top:0;left:0;padding:6px 8px 4px;z-index:3;}",
    ".kl-name{font-family:'SerialBlur',sans-serif;font-size:13px;text-transform:uppercase;letter-spacing:0.02em;color:#642CFF;line-height:1.3;background:#FEFFC0;display:inline;-webkit-box-decoration-break:clone;box-decoration-break:clone;padding:2px 6px;}",
    "@media(min-width:768px){.kl-name{font-size:14px;}}",
    // Fav circle — bottom-right
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

    // ── Toast ──
    ".kl-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:#642CFF;color:#FEFFC0;font-family:'Pacaembu',sans-serif;font-size:13px;padding:10px 18px;border-radius:9999px;z-index:9999;max-width:320px;text-align:center;line-height:1.4;opacity:0;transition:opacity 0.3s,transform 0.3s;pointer-events:none;}",
    ".kl-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}",

    // ── Popup ──
    "@keyframes kl-fade-in{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}",
    ".kl-overlay{position:fixed;inset:0;background:rgba(14,75,77,0.88);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;}",
    ".kl-popup-card{position:relative;width:100%;max-width:480px;background:#FEFFC0;box-shadow:0 24px 60px rgba(0,0,0,0.3);animation:kl-fade-in 0.18s ease;}",
    ".kl-popup-close{position:absolute;top:10px;right:10px;width:30px;height:30px;border-radius:50%;background:rgba(254,255,192,0.9);border:none;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;color:#642CFF;font-weight:700;z-index:10;line-height:1;}",
    // Mobile layout
    ".kl-popup-mobile{display:flex;flex-direction:column;max-height:90vh;overflow-y:auto;-webkit-overflow-scrolling:touch;}",
    ".kl-popup-img-wrap{position:relative;width:100%;padding-top:75%;flex-shrink:0;overflow:hidden;}",
    ".kl-popup-img-inner{position:absolute;inset:0;}",
    ".kl-popup-desktop{display:none;}",
    // Desktop layout
    "@media(min-width:640px){",
    "  .kl-popup-card{max-width:720px;}",
    "  .kl-popup-mobile{display:none;}",
    "  .kl-popup-desktop{display:flex;align-items:stretch;}",
    "  .kl-popup-img-col{flex-shrink:0;width:clamp(240px,38%,420px);position:relative;align-self:stretch;}",
    "  .kl-popup-info-col{flex:1;overflow-y:auto;max-height:90vh;display:flex;flex-direction:column;}",
    "}",
    // Shared image panel
    ".kl-popup-photo{width:100%;height:100%;object-fit:cover;display:block;}",
    ".kl-popup-photo-ph{width:100%;height:100%;background:#e8e9a0;display:flex;align-items:center;justify-content:center;font-family:'SerialBlur',sans-serif;font-size:48px;color:#642CFF;text-transform:uppercase;}",
    ".kl-popup-name-wrap{position:absolute;top:0;left:0;padding:8px 10px 4px;right:52px;}",
    ".kl-popup-name{font-family:'SerialBlur',sans-serif;font-size:22px;color:#642CFF;background:#FEFFC0;display:inline;padding:2px 8px;-webkit-box-decoration-break:clone;box-decoration-break:clone;line-height:1.3;text-transform:uppercase;letter-spacing:0.02em;}",
    ".kl-popup-fav{position:absolute;bottom:10px;right:10px;width:40px;height:40px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.25);transition:all 0.15s;z-index:5;}",
    ".kl-popup-fav.off{background:rgba(254,255,192,0.95);}",
    ".kl-popup-fav.on{background:#e53e3e;}",
    // Info body
    ".kl-popup-body{padding:20px 22px 24px;display:flex;flex-direction:column;gap:12px;flex:1;}",
    ".kl-popup-genre{font-family:'Pacaembu',sans-serif;font-size:13px;color:rgba(100,44,255,0.6);text-transform:lowercase;margin:0;}",
    ".kl-popup-desc{font-family:'Pacaembu',sans-serif;font-size:13px;color:#333;line-height:1.65;margin:0;}",
    ".kl-popup-placeholder{font-family:'Pacaembu',sans-serif;font-size:13px;color:rgba(0,0,0,0.3);margin:0;}",
    ".kl-popup-player{margin-top:4px;}",
    ".kl-popup-player iframe{display:block;width:100%;}",
    ".kl-popup-yt-wrap{position:relative;width:100%;padding-bottom:56.25%;}",
    ".kl-popup-yt-wrap iframe{position:absolute;inset:0;width:100%;height:100%;display:block;}",
    // Nav arrows (desktop only)
    ".kl-nav-btn{flex-shrink:0;align-self:center;z-index:20;width:40px;height:40px;border-radius:50%;background:rgba(254,255,192,0.92);border:none;cursor:pointer;display:none;align-items:center;justify-content:center;color:#642CFF;font-size:24px;font-weight:700;box-shadow:0 2px 10px rgba(0,0,0,0.2);margin:0 8px;transition:opacity 0.15s;}",
    ".kl-nav-btn.disabled{opacity:0.2;pointer-events:none;cursor:default;}",
    "@media(min-width:640px){.kl-nav-btn{display:flex;}}",


  ].join("\n");

  // ── Web Component ────────────────────────────────────────────
  class KoloradoLineup extends HTMLElement {
    constructor() {
      super();
      this._artists = [];
      this._favourites = readFavCookie();
      this._filterFavourites = false;
      this._musicType = "zene"; // "zene" | "nemzene" | "" (all)
      this._searchOpen = false;
      this._searchQuery = "";
      this._popupArtist = null;
      this._popupNavIdx = -1;
      this._loading = true;
      this._favToastSeen = false;
      // Touch swipe state
      this._touchStartX = 0;
      this._touchStartY = 0;
      this._navDir = 1; // 1 = forward, -1 = backward
      // Read initial music type from URL
      try {
        var p = new URLSearchParams(window.location.search);
        var t = (p.get("tipus") || "").toLowerCase();
        this._musicType = t === "nemzene" ? "nemzene" : t === "all" ? "" : "zene";
      } catch (e) {}
    }

    connectedCallback() {
      var self = this;
      // Inject fonts into main document head
      if (!document.getElementById("kl-fonts")) {
        var style = document.createElement("style");
        style.id = "kl-fonts";
        style.textContent =
          "@font-face{font-family:'SerialBlur';src:url('" + SERIAL_BLUR_URL + "') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}" +
          "@font-face{font-family:'Pacaembu';src:url('" + PACAEMBU_URL + "') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}";
        document.head.appendChild(style);
      }
      this._render();
      this._bindEvents();
    }

    static get observedAttributes() { return ["lineup-data"]; }

    attributeChangedCallback(name, oldVal, newVal) {
      if (name === "lineup-data" && newVal) {
        try {
          var data = JSON.parse(newVal);
          this._artists = Array.isArray(data) ? data : [];
        } catch (e) {
          this._artists = [];
        }
        this._loading = false;
        this._render();
        this._bindEvents();
      }
    }

    // ── Filtered + sorted artist list ─────────────────────────
    _filtered() {
      var self = this;
      var list = this._artists.slice().sort(function (a, b) {
        return (a.name || "").localeCompare(b.name || "", "hu", { sensitivity: "base" });
      });
      return list.filter(function (a) {
        if (self._filterFavourites && !self._favourites.has(a.id)) return false;
        // programtipus is a Tags array; normalize to lowercase string for comparison
        var pt = Array.isArray(a.programtipus)
          ? a.programtipus.map(function(v){ return (v||'').toLowerCase().trim(); })
          : [(a.programtipus||'').toLowerCase().trim()];
        var isNemzene = pt.some(function(v){ return v === 'nemzene'; });
        if (self._musicType === "zene" && isNemzene) return false;
        if (self._musicType === "nemzene" && !isNemzene) return false;
        if (self._searchQuery.trim()) {
          var q = self._searchQuery.toLowerCase();
          if (
            !(a.name || "").toLowerCase().includes(q) &&
            !(a.genre || "").toLowerCase().includes(q)
          ) return false;
        }
        return true;
      });
    }

    // ── Render ────────────────────────────────────────────────
    _render() {
      var self = this;
      var artists = this._filtered();
      var favCount = this._favourites.size;
      var zeActive = this._musicType === "zene";
      var nzActive = this._musicType === "nemzene";

      // ── Header ──
      var headerHtml =
        '<div class="kl-header" id="kl-header">' +
          // ZENE / NEMZENE split pill
          '<div class="kl-split-pill">' +
            '<button class="kl-split-half' + (zeActive ? " active" : "") + '" id="kl-zene-btn">' + i18n.zene + '</button>' +
            '<button class="kl-split-half' + (nzActive ? " active" : "") + '" id="kl-nemzene-btn">' + i18n.nemzene + '</button>' +
          '</div>' +
          // Kedvencek toggle
          '<button class="kl-fav-toggle' + (this._filterFavourites ? " active" : "") + '" id="kl-fav-toggle">' +
            ICONS.heart(this._filterFavourites, 18, this._filterFavourites ? "white" : "#642CFF") +
            '<span class="kl-fav-label"> ' + i18n.favourites + '</span>' +
            (favCount > 0 ? '<span class="kl-badge">' + favCount + '</span>' : '') +
          '</button>' +
          // Search
          '<div class="kl-search-row">' +
            '<div class="kl-search-pill' + (this._searchOpen ? " open" : "") + '" id="kl-search-pill">' +
              '<span class="kl-search-icon">' + ICONS.search(this._searchOpen ? 13 : 15) + '</span>' +
              '<input class="kl-search-input" id="kl-search-input" type="text" placeholder="' + i18n.search + '" value="' + esc(this._searchQuery) + '">' +
              '<button class="kl-search-clear" id="kl-search-clear">' + ICONS.close(12) + '</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      // ── Grid ──
      var gridHtml = "";
      if (this._loading) {
        gridHtml =
          '<div class="kl-skel-header">' +
            '<div class="kl-skel-pill"></div>' +
            '<div class="kl-skel-pill" style="width:70px"></div>' +
          '</div>' +
          '<div class="kl-skel-grid">' +
            new Array(12).fill('<div class="kl-skel-card"></div>').join("") +
          '</div>';
      } else if (artists.length === 0) {
        gridHtml =
          '<div class="kl-empty">' +
            '<div class="kl-empty-title">' + i18n.noResults + '</div>' +
            '<div>' + i18n.tryOtherFilter + '</div>' +
          '</div>';
      } else {
        gridHtml = '<div class="kl-grid">';
        artists.forEach(function (a) {
          var isFav = self._favourites.has(a.id);
          var initials = (a.name || "").split(" ").slice(0, 2).map(function (w) { return w[0] || ""; }).join("").toUpperCase();
          var photoHtml = a.photo
            ? '<img class="kl-photo" src="' + esc(a.photo) + '" alt="' + esc(a.name) + '" loading="lazy">'
            : '<div class="kl-photo-placeholder"><span>' + esc(initials) + '</span></div>';
          gridHtml +=
            '<div class="kl-card" data-id="' + esc(a.id) + '">' +
              '<div class="kl-card-inner">' +
                photoHtml +
                '<div class="kl-hover-overlay"></div>' +
                '<div class="kl-name-wrap"><span class="kl-name">' + esc(a.name) + '</span></div>' +
                '<button class="kl-fav-circle' + (isFav ? " on" : "") + '" data-fav="' + esc(a.id) + '">' +
                  (isFav ? ICONS.heartWhite(true, 16) : ICONS.heart(false, 16)) +
                '</button>' +
              '</div>' +
            '</div>';
        });
        gridHtml += '</div>';
      }

      // ── Popup ──
      var popupHtml = this._popupArtist ? this._renderPopup(this._popupArtist) : "";

      // ── Toast ──
      var toastHtml = '<div class="kl-toast" id="kl-toast"></div>';



      // ── Assemble ──
      this.innerHTML =
        '<style>' + CSS + '</style>' +
        '<div class="kl-root" id="kl-root">' +
          headerHtml +
          gridHtml +
          popupHtml +
          toastHtml +
  
        '</div>';
    }

    // ── Popup renderer ────────────────────────────────────────
    _renderPopup(a) {
      var self = this;
      var isFav = this._favourites.has(a.id);
      var artists = this._filtered();
      var idx = artists.findIndex(function (x) { return x.id === a.id; });
      var hasPrev = idx > 0;
      var hasNext = idx < artists.length - 1;

      // Image panel HTML (shared between mobile and desktop)
      var photoHtml = a.photo
        ? '<img class="kl-popup-photo" src="' + esc(a.photo) + '" alt="' + esc(a.name) + '" loading="lazy">'
        : '<div class="kl-popup-photo-ph"><span>' + esc((a.name || "").slice(0, 2)) + '</span></div>';
      var imagePanelHtml =
        photoHtml +
        '<div class="kl-popup-name-wrap"><span class="kl-popup-name">' + esc(a.name) + '</span></div>' +
        '<button class="kl-popup-fav ' + (isFav ? "on" : "off") + '" id="kl-popup-fav" data-id="' + esc(a.id) + '">' +
          (isFav ? ICONS.heartWhite(true, 18) : ICONS.heart(false, 18)) +
        '</button>';

      // Info body
      var genre = esc(a.genre || "");
      var desc = esc(a.longDescription || a.description || "");
      var hasSC = !!a.soundcloudLink;
      var hasYT = !hasSC && !!a.youtubeLink;
      var playerHtml = "";
      if (hasSC) {
        playerHtml =
          '<div class="kl-popup-player">' +
            '<iframe width="100%" height="125" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=' +
              encodeURIComponent(a.soundcloudLink) +
              '&color=%23642CFF&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false"></iframe>' +
          '</div>';
      } else if (hasYT) {
        var ytUrl = a.youtubeLink;
        var mEmbed = ytUrl.match(/\/embed\/([A-Za-z0-9_-]{11})/);
        var mWatch = ytUrl.match(/[?&]v=([A-Za-z0-9_-]{11})/);
        var mShort = ytUrl.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
        var ytId = (mEmbed && mEmbed[1]) || (mWatch && mWatch[1]) || (mShort && mShort[1]);
        var ytSrc = ytId ? "https://www.youtube.com/embed/" + ytId : ytUrl;
        playerHtml =
          '<div class="kl-popup-player">' +
            '<div class="kl-popup-yt-wrap">' +
              '<iframe src="' + esc(ytSrc) + '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>' +
            '</div>' +
          '</div>';
      }
      var infoBodyHtml =
        '<div class="kl-popup-body">' +
          (genre ? '<p class="kl-popup-genre">' + genre + '</p>' : '') +
          (desc
            ? '<p class="kl-popup-desc">' + desc + '</p>'
            : '<p class="kl-popup-placeholder">' + i18n.detailsSoon + '</p>') +
          playerHtml +
        '</div>';

      return (
        '<div class="kl-overlay" id="kl-overlay">' +
          // Prev arrow
          '<button class="kl-nav-btn' + (!hasPrev ? " disabled" : "") + '" id="kl-nav-prev">&#8249;</button>' +
          // Card
          '<div class="kl-popup-card" id="kl-popup-card">' +
            '<button class="kl-popup-close" id="kl-popup-close">&#215;</button>' +
            // Mobile layout
            '<div class="kl-popup-mobile">' +
              '<div class="kl-popup-img-wrap"><div class="kl-popup-img-inner">' + imagePanelHtml + '</div></div>' +
              infoBodyHtml +
            '</div>' +
            // Desktop layout
            '<div class="kl-popup-desktop">' +
              '<div class="kl-popup-img-col"><div style="position:relative;width:100%;height:100%;">' + imagePanelHtml + '</div></div>' +
              '<div class="kl-popup-info-col">' + infoBodyHtml + '</div>' +
            '</div>' +
          '</div>' +
          // Next arrow
          '<button class="kl-nav-btn' + (!hasNext ? " disabled" : "") + '" id="kl-nav-next">&#8250;</button>' +
        '</div>'
      );
    }

    // ── Navigate popup ────────────────────────────────────────
    _popupNav(dir) {
      var artists = this._filtered();
      var idx = artists.findIndex(function (x) { return x.id === this._popupArtist.id; }.bind(this));
      var next = idx + dir;
      if (next >= 0 && next < artists.length) {
        this._navDir = dir;
        this._popupArtist = artists[next];
        this._render();
        this._bindEvents();
      }
    }

    // ── Show toast ────────────────────────────────────────────
    _showToast(msg) {
      var el = this.querySelector("#kl-toast");
      if (!el) return;
      el.textContent = msg;
      el.classList.add("show");
      setTimeout(function () { el.classList.remove("show"); }, 6000);
    }

    // ── Bind events ───────────────────────────────────────────
    _bindEvents() {
      var self = this;
      var root = this;

      // ── ZENE / NEMZENE ──
      var zeneBtn = root.querySelector("#kl-zene-btn");
      var nzBtn   = root.querySelector("#kl-nemzene-btn");
      if (zeneBtn) zeneBtn.addEventListener("click", function () {
        self._musicType = self._musicType === "zene" ? "" : "zene";
        self._render(); self._bindEvents();
      });
      if (nzBtn) nzBtn.addEventListener("click", function () {
        self._musicType = self._musicType === "nemzene" ? "" : "nemzene";
        self._render(); self._bindEvents();
      });

      // ── Kedvencek ──
      var favToggle = root.querySelector("#kl-fav-toggle");
      if (favToggle) favToggle.addEventListener("click", function () {
        self._filterFavourites = !self._filterFavourites;
        self._render(); self._bindEvents();
      });

      // ── Search ──
      var searchPill  = root.querySelector("#kl-search-pill");
      var searchInput = root.querySelector("#kl-search-input");
      var searchClear = root.querySelector("#kl-search-clear");
      if (searchPill) searchPill.addEventListener("click", function () {
        if (!self._searchOpen) {
          self._searchOpen = true;
          self._render(); self._bindEvents();
          var inp = root.querySelector("#kl-search-input");
          if (inp) inp.focus();
        }
      });
      if (searchInput) {
        searchInput.addEventListener("input", function () {
          self._searchQuery = searchInput.value;
          self._render(); self._bindEvents();
          var inp = root.querySelector("#kl-search-input");
          if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
        });
        searchInput.addEventListener("keydown", function (e) {
          if (e.key === "Escape") {
            self._searchOpen = false; self._searchQuery = "";
            self._render(); self._bindEvents();
          }
        });
      }
      if (searchClear) searchClear.addEventListener("click", function (e) {
        e.stopPropagation();
        self._searchOpen = false; self._searchQuery = "";
        self._render(); self._bindEvents();
      });

      // ── Grid cards ──
      root.querySelectorAll(".kl-card").forEach(function (card) {
        card.addEventListener("click", function (e) {
          var id = card.getAttribute("data-id");
          var artists = self._filtered();
          var a = artists.find(function (x) { return x.id === id; });
          if (a) { self._popupArtist = a; self._render(); self._bindEvents(); }
        });
      });

      // ── Fav circle on card ──
      root.querySelectorAll(".kl-fav-circle").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          var id = btn.getAttribute("data-fav");
          if (!id) return;
          var isNew = !self._favourites.has(id);
          if (isNew) {
            self._favourites.add(id);
            if (!self._favToastSeen) {
              self._favToastSeen = true;
              self._showToast(i18n.favToast);
            }
          } else {
            self._favourites.delete(id);
          }
          writeFavCookie(self._favourites);
          self._render(); self._bindEvents();
        });
      });

      // ── Popup events ──
      var overlay = root.querySelector("#kl-overlay");
      if (overlay) {
        // Close on overlay click
        overlay.addEventListener("click", function (e) {
          if (e.target === overlay) { self._popupArtist = null; self._render(); self._bindEvents(); }
        });
        // Close button
        var closeBtn = root.querySelector("#kl-popup-close");
        if (closeBtn) closeBtn.addEventListener("click", function () {
          self._popupArtist = null; self._render(); self._bindEvents();
        });
        // Fav in popup
        var popupFav = root.querySelector("#kl-popup-fav");
        if (popupFav) popupFav.addEventListener("click", function (e) {
          e.stopPropagation();
          var id = popupFav.getAttribute("data-id");
          if (!id) return;
          if (self._favourites.has(id)) { self._favourites.delete(id); } else { self._favourites.add(id); }
          writeFavCookie(self._favourites);
          self._render(); self._bindEvents();
        });
        // Nav arrows
        var prevBtn = root.querySelector("#kl-nav-prev");
        var nextBtn = root.querySelector("#kl-nav-next");
        if (prevBtn) prevBtn.addEventListener("click", function (e) { e.stopPropagation(); self._popupNav(-1); });
        if (nextBtn) nextBtn.addEventListener("click", function (e) { e.stopPropagation(); self._popupNav(1); });
        // Keyboard nav
        this._keyHandler = function (e) {
          if (e.key === "ArrowLeft")  { e.preventDefault(); self._popupNav(-1); }
          if (e.key === "ArrowRight") { e.preventDefault(); self._popupNav(1); }
          if (e.key === "Escape")     { self._popupArtist = null; self._render(); self._bindEvents(); }
        };
        document.addEventListener("keydown", this._keyHandler);
        // Touch swipe
        var card = root.querySelector("#kl-popup-card");
        if (card) {
          card.addEventListener("touchstart", function (e) {
            self._touchStartX = e.touches[0].clientX;
            self._touchStartY = e.touches[0].clientY;
          }, { passive: true });
          card.addEventListener("touchend", function (e) {
            var dx = e.changedTouches[0].clientX - self._touchStartX;
            var dy = e.changedTouches[0].clientY - self._touchStartY;
            if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
            if (dx < 0) self._popupNav(1);
            else        self._popupNav(-1);
          }, { passive: true });
        }
      } else {
        // Remove keyboard handler when popup is closed
        if (this._keyHandler) {
          document.removeEventListener("keydown", this._keyHandler);
          this._keyHandler = null;
        }
      }

      // ── Sticky header shadow on scroll ──
      var header = root.querySelector("#kl-header");
      var klRoot = root.querySelector("#kl-root");
      if (header && klRoot) {
        klRoot.addEventListener("scroll", function () {
          if (klRoot.scrollTop > 4) header.classList.add("scrolled");
          else header.classList.remove("scrolled");
        }, { passive: true });
      }

      // Page switcher removed
    }

    disconnectedCallback() {
      if (this._keyHandler) {
        document.removeEventListener("keydown", this._keyHandler);
        this._keyHandler = null;
      }
    }
  }

  if (!customElements.get("kolorado-lineup")) {
    customElements.define("kolorado-lineup", KoloradoLineup);
  }
})();
