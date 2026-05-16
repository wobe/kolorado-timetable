// ============================================================
// wix-custom-element/kolorado-lineup.js
// Kolorádó Festival — Artist Lineup Grid Custom Element v3
//
// Changes in v3 (synced from LineupGrid.tsx):
//   - Per-line name label background (box-decoration-break: clone)
//   - Name label moved to TOP-LEFT of card
//   - Search bar: magnifier icon top-right, expands on click
//   - Mobile: filters collapse into a single funnel icon
//   - Popup redesigned:
//       Mobile: 4:3 image top, name top-left, fav bottom-right,
//               meta line (day/time/stage) 15px, genre, longDescription,
//               SoundCloud/YouTube audio player
//       Desktop (≥640px): landscape — image left 42%, info right scrollable
//   - Kolorádó oldal link removed from popup
//   - Stage filter compares stage NAME directly (not slug)
//   - Day filter uses getFestivalDayId logic (threshold 10:00 AM)
//   - CMS field mapping: photo (converted), name, stage, startTime,
//     endTime, genre, longDescription, soundcloudLink, youtubeLink
//
// Usage in Wix:
//   1. Upload this file to Wix Public files
//   2. Add Custom Element with tag: kolorado-lineup
//   3. Set ID to: koloradoLineup
//   4. Add Velo page code from wix-velo-code/lineup-grid-page.js
// ============================================================

(function () {
  "use strict";

  // ── Shared popup module (inlined) ──────────────────────────
  var _kapFestivalDays = [
    { id: "wed", label: "Szerda",    date: "2026-07-15" },
    { id: "thu", label: "Csütörtök", date: "2026-07-16" },
    { id: "fri", label: "Péntek",    date: "2026-07-17" },
    { id: "sat", label: "Szombat",   date: "2026-07-18" },
  ];
  var _kapDayStartHour = 10;
  function _kapEsc(s) { var _s=Array.isArray(s)?s.join(', '):(s==null?'':(s===undefined?'':(typeof s==='string'?s:String(s)))); return _s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function _kapFmt(d) { if(!d)return""; var t=d instanceof Date?d:new Date(d); if(isNaN(t))return""; var h=t.getHours(),m=t.getMinutes(); return(h<10?"0":"")+h+":"+(m<10?"0":"")+m; }
  function _kapDayLabel(startTime) {
    if(!startTime)return"";
    var d=startTime instanceof Date?startTime:new Date(startTime);
    if(isNaN(d))return"";
    var h=d.getHours();
    var checkDate=new Date(d); if(h<_kapDayStartHour) checkDate.setDate(checkDate.getDate()-1);
    var ds=checkDate.toISOString().slice(0,10);
    for(var i=0;i<_kapFestivalDays.length;i++){ if(_kapFestivalDays[i].date===ds) return _kapFestivalDays[i].label; }
    return "";
  }
  function _kapHeartSvg(filled, size) {
    var s=size||18;
    var c = filled ? '#ffffff' : '#642CFF';
    return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="'+(filled?c:'none')+'" stroke="'+c+'" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  }
  var KAP_CSS = [
    "@keyframes kapFadeIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}",
    ".kap-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;}",
    ".kap-card{position:relative;background:#FEFFC0;border-radius:0;overflow:hidden;animation:kapFadeIn 0.2s ease;max-height:90vh;width:100%;max-width:420px;display:flex;flex-direction:column;-webkit-overflow-scrolling:touch;}",
    ".kap-mobile{display:flex;flex-direction:column;overflow-y:auto;max-height:90vh;-webkit-overflow-scrolling:touch;}",
    ".kap-desktop{display:none;}",
    /* Desktop: popup height = content, image fills full height, right scrolls */
    "@media(min-width:640px){",
    "  .kap-mobile{display:none;}",
    "  .kap-desktop{display:flex;flex-direction:row;align-items:stretch;}",
    "  .kap-card{max-width:860px;max-height:90vh;}",
    "  .kap-left{flex-shrink:0;width:clamp(240px,38%,420px);position:relative;align-self:stretch;}",
    "  .kap-left-inner{position:absolute;inset:0;}",
    "  .kap-right{flex:1;overflow-y:auto;max-height:90vh;display:flex;flex-direction:column;}",
    "}",
    /* Mobile */
    ".kap-img-wrap{position:relative;width:100%;padding-top:75%;overflow:hidden;flex-shrink:0;}",
    ".kap-img-inner{position:absolute;inset:0;}",
    ".kap-photo{width:100%;height:100%;object-fit:cover;display:block;}",
    ".kap-photo-ph{width:100%;height:100%;background:#642CFF22;display:flex;align-items:center;justify-content:center;font-size:48px;font-weight:700;color:#642CFF;}",
    ".kap-name-wrap{position:absolute;top:0;left:0;padding:8px 10px 4px;right:52px;}",
    ".kap-name{font-family:'SerialBlur',sans-serif;font-size:22px;color:#642CFF;background:#FEFFC0;display:inline;padding:2px 8px;box-decoration-break:clone;-webkit-box-decoration-break:clone;line-height:1.3;text-transform:uppercase;letter-spacing:0.02em;}",
    ".kap-fav{position:absolute;bottom:10px;right:10px;width:36px;height:36px;border-radius:50%;background:rgba(254,255,192,0.9);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;}",
    ".kap-fav.on{background:#e53e3e;}",
    ".kap-left-inner .kap-photo{width:100%;height:100%;object-fit:cover;}",
    ".kap-left-inner .kap-photo-ph{width:100%;height:100%;}",
    ".kap-left-inner .kap-name-wrap{position:absolute;top:0;left:0;padding:8px 10px 4px;right:52px;}",
    ".kap-left-inner .kap-fav{position:absolute;bottom:10px;right:10px;}",
    ".kap-close{position:absolute;top:10px;right:10px;width:30px;height:30px;border-radius:50%;background:rgba(254,255,192,0.9);border:none;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;color:#642CFF;font-weight:700;z-index:10;line-height:1;}",
    ".kap-body{padding:20px 22px 24px;display:flex;flex-direction:column;gap:12px;flex:1;}",
    ".kap-meta{font-family:'Pacaembu',sans-serif;font-size:15px;color:#0E4B4D;line-height:1.4;}",
    ".kap-genre{font-family:'Pacaembu',sans-serif;font-size:13px;color:rgba(100,44,255,0.6);text-transform:lowercase;}",
    ".kap-desc{font-family:'Pacaembu',sans-serif;font-size:13px;color:#333;line-height:1.65;}",
    ".kap-placeholder{font-family:'Pacaembu',sans-serif;font-size:13px;color:rgba(0,0,0,0.3);}",
    ".kap-player{margin-top:4px;}",
    ".kap-player iframe{display:block;width:100%;}",
    ".kap-player>div{overflow:hidden;}",
  ].join("\n");
  function _kapImagePanel(a, isFav) {
    var photoHtml = a.photo
      ? '<img class="kap-photo" src="'+_kapEsc(a.photo)+'" alt="'+_kapEsc(a.name)+'" loading="lazy">'
      : '<div class="kap-photo-ph"><span>'+_kapEsc((a.name||"").slice(0,2))+'</span></div>';
    return photoHtml +
      '<div class="kap-name-wrap"><span class="kap-name">'+_kapEsc(a.name)+'</span></div>' +
      '<button class="kap-fav '+(isFav?"on":"off")+'" id="kap-fav" data-id="'+_kapEsc(a.id)+'">' +
        _kapHeartSvg(isFav, 18) +
      '</button>';
  }
  function _kapInfoPanel(a) {
    var dayLabel = _kapDayLabel(a.startTime);
    var timeStr  = a.startTime ? _kapFmt(a.startTime) + (a.endTime ? " – " + _kapFmt(a.endTime) : "") : "";
    var metaParts = [dayLabel, timeStr, a.stage].filter(Boolean);
    var metaLine  = metaParts.join(", ");
    var playerHtml = "";
    if (a.soundcloudLink) {
      playerHtml = '<div class="kap-player"><iframe height="125" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url='+encodeURIComponent(a.soundcloudLink)+'&color=%23642CFF&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false"></iframe></div>';
    } else if (a.youtubeLink) {
      var ytSrc = a.youtubeLink.replace("watch?v=", "embed/");
      // YouTube: 16:9 aspect ratio wrapper
      playerHtml = '<div class="kap-player"><div style="position:relative;width:100%;padding-bottom:56.25%;"><iframe style="position:absolute;inset:0;width:100%;height:100%;display:block;" src="'+_kapEsc(ytSrc)+'" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div>';
    }
    return '<div class="kap-body">' +
      (metaLine ? '<div class="kap-meta">'+_kapEsc(metaLine)+'</div>' : '') +
      (a.genre ? '<div class="kap-genre">'+_kapEsc(a.genre)+'</div>' : '') +
      (a.longDescription ? '<div class="kap-desc">'+_kapEsc(a.longDescription)+'</div>' : '<div class="kap-placeholder">Részletek hamarosan...</div>') +
      playerHtml +
    '</div>';
  }
  function _kapRender(a, isFav) {
    var imgPanel  = _kapImagePanel(a, isFav);
    var infoPanel = _kapInfoPanel(a);
    return '<div class="kap-overlay" id="kap-overlay">' +
      '<div class="kap-card">' +
        '<button class="kap-close" id="kap-close">×</button>' +
        '<div class="kap-mobile"><div class="kap-img-wrap"><div class="kap-img-inner">' + imgPanel + '</div></div>' + infoPanel + '</div>' +
        '<div class="kap-desktop"><div class="kap-left"><div class="kap-left-inner">' + imgPanel + '</div></div><div class="kap-right">' + infoPanel + '</div></div>' +
      '</div></div>';
  }
  function _kapWire(shadow, a, isFav, callbacks) {
    var overlay  = shadow.getElementById("kap-overlay");
    var closeBtn = shadow.getElementById("kap-close");
    // Use querySelectorAll because the popup renders twice (mobile + desktop panels)
    var favBtns  = shadow.querySelectorAll("[id='kap-fav'], .kap-fav");
    if (closeBtn) closeBtn.addEventListener("click", function() { if (callbacks.onClose) callbacks.onClose(); });
    if (overlay) overlay.addEventListener("click", function(e) { if (e.target === overlay && callbacks.onClose) callbacks.onClose(); });
    favBtns.forEach(function(btn) {
      btn.addEventListener("click", function(e) { e.stopPropagation(); var id=btn.getAttribute("data-id"); if(callbacks.onToggleFav) callbacks.onToggleFav(id); });
    });
  }
  // Compatibility shim — existing code calls KoloradoArtistPopup.render/wire/CSS
  var KoloradoArtistPopup = { CSS: KAP_CSS, render: _kapRender, wire: _kapWire,
    setConfig: function(o){ if(o.festivalDays)_kapFestivalDays=o.festivalDays; if(o.dayStartHour!==undefined)_kapDayStartHour=o.dayStartHour; }
  };


  // ── Font URLs ──────────────────────────────────────────────
  var SERIAL_BLUR_URL = "https://cdn.jsdelivr.net/gh/wobe/kolorado-timetable@main/wix-custom-element/SerialBlurTRIAL-Bleed.ttf";
  var PACAEMBU_URL    = "https://cdn.jsdelivr.net/gh/wobe/kolorado-timetable@main/wix-custom-element/Pacaembu-Medium.ttf";

  // ── Constants ──────────────────────────────────────────────
  // ── Language detection ──────────────────────────────────
  // Checks URL path/query for /en/ or ?lang=en, then html[lang], defaults HU.
  function detectLang() {
    try {
      var url = (window.location.pathname + window.location.search).toLowerCase();
      if (/\/en(\/|$|\?)|[?&]lang=en/.test(url)) return "en";
      var htmlLang = (document.documentElement.lang || "").toLowerCase();
      if (htmlLang.startsWith("en")) return "en";
    } catch(e) {}
    return "hu";
  }
  var LANG = detectLang();

  // ── Translations ──────────────────────────────────────────
  var T = {
    hu: {
      favToast:        "A kedvenceid a böngésződben tárolódnak. Itt megtalálod később is, azonban más eszközeidre nem szinkronizálódnak.",
      close:           "Bezárás",
      favourites:      "Kedvencek",
      search:          "Keresés...",
      stage:           "Színpad",
      day:             "Nap",
      selected:        " kiválasztva",
      clearFilters:    "× Szűrők törlése",
      noResults:       "Nincs találat",
      tryOtherFilter:  "Próbálj más szűrőt!",
      unknown:         "Ismeretlen",
      days: { wed: "Szerda", thu: "Csütörtök", fri: "Péntek", sat: "Szombat" },
      zene:            "ZENE",
      nemzene:         "NEMZENE",
    },
    en: {
      favToast:        "Your favourites are stored in your browser. You can find them here later, but they won't sync across your devices.",
      close:           "Close",
      favourites:      "Favourites",
      search:          "Search...",
      stage:           "Stage",
      day:             "Day",
      selected:        " selected",
      clearFilters:    "× Clear filters",
      noResults:       "No results",
      tryOtherFilter:  "Try a different filter!",
      unknown:         "Unknown",
      days: { wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday" },
      zene:            "ZENE",
      nemzene:         "NEMZENE",
    },
  };
  var i18n = T[LANG];

  var FAV_COOKIE_NAME    = "kolorado_favourites";
  var FAV_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
  var DAY_START_HOUR     = 10; // festival day boundary

  var FESTIVAL_DAYS = [
    { id: "wed", label: i18n.days.wed, date: "2026-07-15" },
    { id: "thu", label: i18n.days.thu, date: "2026-07-16" },
    { id: "fri", label: i18n.days.fri, date: "2026-07-17" },
    { id: "sat", label: i18n.days.sat, date: "2026-07-18" },
  ];

  var STAGES = [
    "Nagyszínpad", "Bálterem", "Tószínpad", "Hangár",
    "Platános", "Listening Bar", "Healing", "Ring",
  ];

  // ── Cookie helpers ─────────────────────────────────────────
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

  // ── Day helper (matches getFestivalDayId in timetable-data.ts) ─
  function getFestivalDayId(startTime) {
    if (!startTime) return null;
    var d = startTime instanceof Date ? startTime : new Date(startTime);
    if (isNaN(d)) return null;
    var h = d.getHours();
    var checkDate = new Date(d);
    if (h < DAY_START_HOUR) checkDate.setDate(checkDate.getDate() - 1);
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

  // ── First-favourite toast ────────────────────────────────────────────────
  var FAV_TOAST_KEY = "kolorado_fav_toast_seen";
  function showFirstFavToast() {
    try { if (localStorage.getItem(FAV_TOAST_KEY)) return; } catch(e) { return; }
    try { localStorage.setItem(FAV_TOAST_KEY, "1"); } catch(e) {}
    var toast = document.createElement("div");
    toast.style.cssText = [
      "position:fixed","bottom:24px","left:50%","transform:translateX(-50%)",
      "z-index:9999","max-width:calc(100vw - 32px)","width:360px",
      "background:#1a1a2e","color:#FEFFC0","padding:12px 16px",
      "display:flex","align-items:flex-start","gap:10px",
      "box-shadow:0 4px 24px rgba(0,0,0,0.35)",
      "font-family:'Pacaembu',sans-serif","font-size:13px","line-height:1.5",
      "pointer-events:auto","cursor:default",
    ].join(";");
    toast.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="#e53e3e" stroke="#e53e3e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px">'+
        '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>'+
      '</svg>'+
      '<span style="flex:1">'+i18n.favToast+'</span>'+
      '<button onclick="this.parentNode.remove()" style="background:none;border:none;cursor:pointer;color:rgba(254,255,192,0.5);padding:0;flex-shrink:0;display:flex;align-items:center;margin-top:1px" aria-label="'+i18n.close+'">'+
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'+
      '</button>';
    document.body.appendChild(toast);
    setTimeout(function(){ if (toast.parentNode) toast.remove(); }, 6000);
  }

  // ── Escape HTML ────────────────────────────────────────────────────────
  function esc(s) {
    var str = Array.isArray(s) ? s.join(', ') : (s == null ? '' : String(s));
    return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  // ── SVG icons ──────────────────────────────────────────────
  var ICONS = {
    heart: function(filled, size) {
      size = size || 18;
      var fill = filled ? "#e53e3e" : "none";
      var stroke = filled ? "#e53e3e" : "#642CFF";
      return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="'+fill+'" stroke="'+stroke+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
    },
    heartWhite: function(filled, size) {
      size = size || 18;
      var fill = filled ? "white" : "none";
      return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="'+fill+'" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
    },
    search: function(size) {
      size = size || 16;
      return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    },
    filter: function(size) {
      size = size || 16;
      return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>';
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
    "svg{display:inline-block;vertical-align:middle;}",

    // Root
    ".kl-root{background:#FEFFC0;min-height:100vh;color:#642CFF;}",

    // ── Header ──
    ".kl-header{position:sticky;top:0;z-index:40;background:#FEFFC0;border-bottom:1px solid transparent;padding:10px 16px;display:flex;align-items:center;gap:10px;transition:border-color 0.2s;}",
    ".kl-header.scrolled{border-bottom:1px solid rgba(100,44,255,0.2);}",

    // Desktop filters (hidden on mobile)
    ".kl-desktop-filters{display:flex;align-items:center;gap:8px;flex:1;flex-wrap:nowrap;}",

    // Mobile filter wrap — hidden entirely (funnel button removed)
    ".kl-mobile-filter-wrap{display:none!important;}",

    // Icon circle button (search + mobile filter)
    ".kl-icon-btn{width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;flex-shrink:0;}",
    ".kl-icon-btn.inactive{background:rgba(100,44,255,0.12);color:#642CFF;}",
    ".kl-icon-btn.active{background:#642CFF;color:#FEFFC0;}",
    ".kl-icon-btn.active-red{background:#e53e3e;color:#fff;}",

    // Badge on icon button
    ".kl-icon-badge{position:absolute;top:-3px;right:-3px;width:14px;height:14px;border-radius:50%;background:#e53e3e;color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;}",

    // Filter pill
    ".kl-filter-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:9999px;border:none;background:rgba(100,44,255,0.12);color:#642CFF;font-family:'Pacaembu',sans-serif;font-size:13px;cursor:pointer;transition:all 0.15s;white-space:nowrap;}",
    ".kl-filter-btn.active{background:#642CFF;color:#FEFFC0;}",
    ".kl-filter-clear{margin-left:2px;width:16px;height:16px;border-radius:50%;background:rgba(255,255,255,0.3);display:inline-flex;align-items:center;justify-content:center;font-size:11px;line-height:1;cursor:pointer;}",

    // ZENE/NEMZENE split pill
    ".kl-split-pill{display:inline-flex;border-radius:9999px;overflow:hidden;border:2px solid rgba(100,44,255,0.25);}",
    ".kl-split-half{padding:5px 16px;border:none;background:transparent;color:#642CFF;font-family:'Pacaembu',sans-serif;font-size:13px;cursor:pointer;transition:all 0.15s;white-space:nowrap;}",
    ".kl-split-half:first-child{border-right:1px solid rgba(100,44,255,0.2);}",
    ".kl-split-half.active{background:#642CFF;color:#FEFFC0;}",
    ".kl-split-half:hover:not(.active){background:rgba(100,44,255,0.08);}",

    // Fav toggle
    ".kl-fav-toggle{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:9999px;border:none;background:rgba(100,44,255,0.12);color:#642CFF;font-family:'Pacaembu',sans-serif;font-size:13px;cursor:pointer;transition:all 0.15s;}",
    "@media(max-width:639px){.kl-fav-label{display:none;}.kl-badge{display:none;}.kl-fav-toggle{padding:6px 10px;}.kl-split-half{padding:5px 10px;}}",
    ".kl-fav-toggle.active{background:#e53e3e;color:#fff;}",
    ".kl-badge{background:#642CFF;color:#FEFFC0;border-radius:9999px;padding:1px 7px;font-size:11px;font-weight:700;margin-left:2px;}",
    ".kl-fav-toggle.active .kl-badge{background:rgba(255,255,255,0.3);color:#fff;}",

    // Dropdown wrapper
    ".kl-filter-wrap{position:relative;}",
    ".kl-filter-dropdown{position:absolute;left:0;top:calc(100% + 6px);z-index:60;min-width:210px;background:#FEFFC0;border:2px solid rgba(100,44,255,0.2);box-shadow:0 8px 24px rgba(100,44,255,0.15);}",
    ".kl-filter-item{display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;border:none;background:transparent;width:100%;text-align:left;font-family:'Pacaembu',sans-serif;font-size:13px;color:#642CFF;transition:background 0.1s;}",
    ".kl-filter-item:hover{background:rgba(100,44,255,0.06);}",
    ".kl-filter-item.checked{background:rgba(100,44,255,0.08);}",
    ".kl-checkbox{width:16px;height:16px;border:2px solid #642CFF;border-radius:3px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:transparent;transition:all 0.1s;}",
    ".kl-filter-item.checked .kl-checkbox{background:#642CFF;border-color:#642CFF;}",
    ".kl-item-label{font-weight:400;}",
    ".kl-filter-item.checked .kl-item-label{font-weight:700;}",

    // Mobile filter panel
    ".kl-mobile-panel{position:absolute;top:calc(100% + 8px);left:0;z-index:60;min-width:240px;background:#FEFFC0;border:2px solid rgba(100,44,255,0.2);box-shadow:0 8px 24px rgba(100,44,255,0.15);padding:12px;display:flex;flex-direction:column;gap:8px;}",
    ".kl-mobile-section-label{font-family:'Pacaembu',sans-serif;font-size:11px;color:rgba(100,44,255,0.5);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;}",
    ".kl-mobile-pills{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px;}",
    ".kl-mobile-pill{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:9999px;border:none;font-family:'Pacaembu',sans-serif;font-size:12px;cursor:pointer;transition:all 0.15s;background:rgba(100,44,255,0.1);color:#642CFF;}",
    ".kl-mobile-pill.active{background:#642CFF;color:#FEFFC0;}",
    ".kl-mobile-clear{display:inline-flex;align-items:center;justify-content:center;padding:4px 10px;border-radius:9999px;border:none;font-family:'Pacaembu',sans-serif;font-size:12px;cursor:pointer;background:rgba(100,44,255,0.06);color:#642CFF;width:100%;}",

    // Search input
    ".kl-search-row{display:flex;align-items:center;gap:0;margin-left:auto;}",
    /* Search pill — always in DOM, expands via CSS transition */
    ".kl-search-pill{display:flex;align-items:center;gap:6px;height:36px;border-radius:9999px;border:1.5px solid rgba(100,44,255,0.25);background:transparent;overflow:hidden;width:36px;transition:width 0.2s ease,background 0.15s ease,border-color 0.15s ease,padding 0.2s ease;cursor:pointer;padding:0;justify-content:center;flex-shrink:0;}",
    ".kl-search-pill.open{width:200px;background:rgba(100,44,255,0.07);border-color:rgba(100,44,255,0.35);padding:0 10px;justify-content:flex-start;cursor:default;}",
    ".kl-search-icon{display:flex;align-items:center;flex-shrink:0;}",
    ".kl-search-pill:not(.open) .kl-search-icon svg{width:15px;height:15px;}",
    ".kl-search-input{flex:1;background:transparent;border:none;outline:none;color:#642CFF;font-family:'Pacaembu',sans-serif;font-size:13px;min-width:0;display:none;width:0;}",
    ".kl-search-pill.open .kl-search-input{display:block;width:100%;}",
    ".kl-search-clear{background:none;border:none;cursor:pointer;color:rgba(100,44,255,0.5);display:none;align-items:center;padding:0;flex-shrink:0;}",
    ".kl-search-pill.open .kl-search-clear{display:flex;}",
    ".kl-search-toggle{display:none !important;}",

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
    ".kl-photo-placeholder span{font-family:'SerialBlur',sans-serif;font-size:28px;text-transform:uppercase;color:rgba(100,44,255,0.2);letter-spacing:0.05em;}",

    // Name label — top-left, per-line background via inline style
    ".kl-name-wrap{position:absolute;top:0;left:0;padding:6px 8px 4px;z-index:3;}",
    ".kl-name{font-family:'SerialBlur',sans-serif;font-size:13px;text-transform:uppercase;letter-spacing:0.02em;color:#642CFF;line-height:1.3;background:#FEFFC0;display:inline;-webkit-box-decoration-break:clone;box-decoration-break:clone;padding:2px 6px;}",
    "@media(min-width:768px){.kl-name{font-size:14px;}}",

    // Fav circle button — bottom right
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

    // ── Popup CSS is provided by kolorado-artist-popup.js (KoloradoArtistPopup.CSS) ──
  ].join("\n");

  // ── Web Component ──────────────────────────────────────────
  class KoloradoLineup extends HTMLElement {
    constructor() {
      super();
      this._artists = [];
      this._favourites = readFavCookie();
      this._filterFavourites = false;
      this._selectedStages = new Set();  // stage NAMES
      this._selectedDays = new Set();    // day IDs
      this._showStageFilter = false;
      this._showDayFilter = false;
      // Music type: 'zene' (default), 'nemzene', or '' (all)
      try {
        var initParams = new URLSearchParams(window.location.search);
        var initTipus = (initParams.get('tipus') || '').toLowerCase();
        this._musicType = (initTipus === 'nemzene') ? 'nemzene' : (initTipus === 'all' ? '' : 'zene');
      } catch(e) { this._musicType = 'zene'; }
      this._showMobileFilters = false;
      this._searchOpen = false;
      this._searchQuery = "";
      this._popupArtist = null;
      this._loading = true;
    }

    connectedCallback() {
      var self = this;
      // Inject @font-face into document <head> — shadow DOM @font-face is not
      // reliably supported across browsers; fonts must live in the main document.
      if (!document.getElementById('kl-fonts')) {
        var fontStyle = document.createElement('style');
        fontStyle.id = 'kl-fonts';
        fontStyle.textContent =
          "@font-face{font-family:'SerialBlur';src:url('" + SERIAL_BLUR_URL + "') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}" +
          "@font-face{font-family:'Pacaembu';src:url('" + PACAEMBU_URL + "') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}";
        document.head.appendChild(fontStyle);
      }
      this._shadow = this.attachShadow({ mode: "open" });
      this._render();
      // Close dropdowns on outside click
      document.addEventListener("click", function(e) {
        if (!self._shadow.contains(e.target)) {
          var changed = false;
          if (self._showStageFilter) { self._showStageFilter = false; changed = true; }
          if (self._showDayFilter) { self._showDayFilter = false; changed = true; }
          if (self._showMobileFilters) { self._showMobileFilters = false; changed = true; }
          if (changed) self._render();
        }
      });
      // Show mock skeleton briefly, then show empty state until data arrives
      setTimeout(function(){ self._loading = false; self._render(); }, 300);
    }

    static get observedAttributes() { return ["lineup-data"]; }

    attributeChangedCallback(name, _old, val) {
      if (name === "lineup-data" && val) {
        try {
          var raw = JSON.parse(val);
          this._artists = raw.map(function(item) {
            return {
              id:              item.id || String(Math.random()),
              name:            item.name || item.title || i18n.unknown,
              // photo is already a full https:// URL (converted by lineupApi.jsw)
              photo:           item.photo || "",
              stage:           item.stage || "",
              startTime:       item.startTime ? new Date(item.startTime) : null,
              endTime:         item.endTime   ? new Date(item.endTime)   : null,
              genre:           item.genre || "",
              longDescription: item.longDescription || item.bio || item.description || "",
              soundcloudLink:  item.soundcloudLink || item.soundcloud || "",
              youtubeLink:     item.youtubeLink || item.youtube || "",
              programtipus:    item.programtipus || "",
            };
          }); // show all artists regardless of whether stage/date is set
          this._loading = false;
          // Auto-open popup if ?artist= is in the URL
          if (!this._popupArtist) {
            try {
              var urlArtistId = new URLSearchParams(window.location.search).get('artist');
              if (urlArtistId) {
                var found = this._artists.find(function(a) { return a.id === urlArtistId; });
                if (found) this._popupArtist = found;
              }
            } catch(e2) {}
          }
          this._render();
        } catch(e) {
          console.error("kolorado-lineup: failed to parse lineup-data", e);
        }
      }
    }

    // ── Helpers ──────────────────────────────────────────────
    _toggleFav(id) {
      if (this._favourites.has(id)) {
        this._favourites.delete(id);
      } else {
        this._favourites.add(id);
        showFirstFavToast();
      }
      writeFavCookie(this._favourites);
      this._render();
    }

    _openPopup(artist) {
      this._popupArtist = artist;
      this._pushArtistUrl(artist ? artist.id : null);
      this._render();
    }
    _closePopup() {
      this._popupArtist = null;
      this._pushArtistUrl(null);
      this._render();
    }
    _pushArtistUrl(artistId) {
      try {
        var p = new URLSearchParams(window.location.search);
        if (artistId) { p.set('artist', artistId); } else { p.delete('artist'); }
        var qs = p.toString();
        var newUrl = qs ? window.location.pathname + '?' + qs : window.location.pathname;
        window.history.replaceState(null, '', newUrl);
      } catch(e) {}
    }
    _pushTypeUrl(musicType) {
      try {
        var p = new URLSearchParams(window.location.search);
        if (musicType === 'nemzene') { p.set('tipus', 'nemzene'); }
        else if (musicType === '') { p.set('tipus', 'all'); }
        else { p.delete('tipus'); } // 'zene' is default, no param needed
        var qs = p.toString();
        var newUrl = qs ? window.location.pathname + '?' + qs : window.location.pathname;
        window.history.replaceState(null, '', newUrl);
      } catch(e) {}
    }

    _filteredArtists() {
      var self = this;
      var sorted = this._artists.slice().sort(function(a, b) {
        return a.name.localeCompare(b.name, "hu", { sensitivity: "base" });
      });
      return sorted.filter(function(a) {
        // Stage filter: only apply if artist has a stage set
        if (self._selectedStages.size > 0 && a.stage && !self._selectedStages.has(a.stage)) return false;
        // Day filter: only apply if artist has a startTime set
        if (self._selectedDays.size > 0 && a.startTime) {
          var dayId = getFestivalDayId(a.startTime);
          if (dayId && !self._selectedDays.has(dayId)) return false;
        }
        // Music type filter (ZENE/NEMZENE split pill)
        // programtipus may be a string or array (Wix CMS Tags field returns array)
        var rawPt = a.programtipus || '';
        var ptStr = Array.isArray(rawPt) ? rawPt.join(',') : String(rawPt);
        var pt = ptStr.toLowerCase();
        if (self._musicType === 'zene') {
          if (pt.indexOf('nemzene') !== -1) return false; // exclude Nemzene from ZENE view
        } else if (self._musicType === 'nemzene') {
          if (pt.indexOf('nemzene') === -1) return false; // only Nemzene
        }
        if (self._filterFavourites && !self._favourites.has(a.id)) return false;
        if (self._searchQuery.trim()) {
          var q = self._searchQuery.toLowerCase();
          if (a.name.toLowerCase().indexOf(q) === -1 && (a.genre || "").toLowerCase().indexOf(q) === -1) return false;
        }
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
          '<div class="kl-skel-pill"></div>' +
          '<div class="kl-skel-pill" style="width:80px"></div>' +
        '</div>' +
        '<div class="kl-skel-grid">' + cards + '</div>' +
      '</div>';
    }

    // ── Render checkbox dropdown ──────────────────────────────
    _renderCheckboxDropdown(dropdownId, options, selectedSet) {
      return '<div class="kl-filter-dropdown" id="'+dropdownId+'">' +
        options.map(function(opt) {
          var id   = typeof opt === "string" ? opt : opt.id;
          var name = typeof opt === "string" ? opt : opt.name || opt.label;
          var checked = selectedSet.has(id);
          return '<button class="kl-filter-item'+(checked?" checked":"")+'" data-opt-id="'+esc(id)+'" data-dropdown="'+dropdownId+'">' +
            '<span class="kl-checkbox">'+(checked ? ICONS.check() : '')+'</span>' +
            '<span class="kl-item-label">'+esc(name)+'</span>' +
          '</button>';
        }).join('') +
      '</div>';
    }

    // ── Render image panel (shared mobile/desktop) ────────────
    // ── Popup is rendered via shared KoloradoArtistPopup module ──
    _renderPopup(a) {
      if (typeof KoloradoArtistPopup === "undefined") return "";
      var isFav = this._favourites.has(a.id);
      return KoloradoArtistPopup.render(a, isFav);
    }

    // ── Partial grid-only re-render (used by search input to avoid focus loss) ──
    _renderGridOnly() {
      var self = this;
      var shadow = this._shadow;
      var artists = this._filteredArtists();
      var gridContainer = shadow.getElementById('kl-grid-container');
      if (!gridContainer) { this._render(); return; } // fallback
      var gridHtml = '';
      if (artists.length === 0) {
        gridHtml = '<div class="kl-empty"><div class="kl-empty-title">'+i18n.noResults+'</div><div>'+i18n.tryOtherFilter+'</div></div>';
      } else {
        gridHtml = '<div class="kl-grid">';
        artists.forEach(function(a) {
          var isFav = self._favourites.has(a.id);
          var initials = a.name.split(" ").slice(0,2).map(function(w){return w[0]||'';}).join('').toUpperCase();
          var photoHtml = a.photo
            ? '<img class="kl-photo" src="'+esc(a.photo)+'" alt="'+esc(a.name)+'" loading="lazy">'
            : '<div class="kl-photo-placeholder"><span>'+esc(initials)+'</span></div>';
          gridHtml +=
            '<div class="kl-card" data-id="'+esc(a.id)+'">' +
              '<div class="kl-card-inner">' +
                photoHtml +
                '<div class="kl-hover-overlay"></div>' +
                '<button class="kl-fav-circle'+(isFav?' on':'')+' " data-fav="'+esc(a.id)+'">' +
                  (isFav ? ICONS.heartWhite(true, 16) : ICONS.heart(false, 16)) +
                '</button>' +
                '<div class="kl-name-wrap"><span class="kl-name">'+esc(a.name)+'</span></div>' +
              '</div>' +
            '</div>';
        });
        gridHtml += '</div>';
      }
      gridContainer.innerHTML = gridHtml;
      // Re-wire card clicks and fav buttons
      this._wireGridEvents(shadow);
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
      var hasActiveFilters = this._selectedStages.size > 0 || this._selectedDays.size > 0 || this._filterFavourites;

      // ── Stage pill label ──
      var stageLabel = i18n.stage;
      if (this._selectedStages.size === 1) stageLabel = Array.from(this._selectedStages)[0];
      else if (this._selectedStages.size > 1) stageLabel = this._selectedStages.size + i18n.selected;

      // ── Day pill label ──
      var dayLabel = i18n.day;
      if (this._selectedDays.size === 1) {
        var did = Array.from(this._selectedDays)[0];
        for (var j = 0; j < FESTIVAL_DAYS.length; j++) {
          if (FESTIVAL_DAYS[j].id === did) { dayLabel = FESTIVAL_DAYS[j].label; break; }
        }
      } else if (this._selectedDays.size > 1) {
        dayLabel = this._selectedDays.size + i18n.selected;
      }

      var stageActive = this._selectedStages.size > 0;
      var dayActive   = this._selectedDays.size > 0;
      var stageClear  = stageActive ? '<span class="kl-filter-clear" id="kl-stage-clear">×</span>' : '';
      var dayClear    = dayActive   ? '<span class="kl-filter-clear" id="kl-day-clear">×</span>' : '';

      var stageDropdown = this._showStageFilter
        ? this._renderCheckboxDropdown("kl-stage-dropdown", STAGES, this._selectedStages) : '';
      var dayDropdown = this._showDayFilter
        ? this._renderCheckboxDropdown("kl-day-dropdown", FESTIVAL_DAYS, this._selectedDays) : '';

      // Mobile filter panel
      var mobilePanelHtml = "";
      if (this._showMobileFilters) {
        var stagePills = STAGES.map(function(s) {
          var active = self._selectedStages.has(s);
          return '<button class="kl-mobile-pill'+(active?" active":"")+'" data-mobile-stage="'+esc(s)+'">'+esc(s)+'</button>';
        }).join("");
        var dayPills = FESTIVAL_DAYS.map(function(d) {
          var active = self._selectedDays.has(d.id);
          return '<button class="kl-mobile-pill'+(active?" active":"")+'" data-mobile-day="'+d.id+'">'+esc(d.label)+'</button>';
        }).join("");
        var clearBtn = hasActiveFilters ? '<button class="kl-mobile-clear" id="kl-mobile-clear">'+i18n.clearFilters+'</button>' : '';
        mobilePanelHtml = '<div class="kl-mobile-panel" id="kl-mobile-panel">' +
          // Stage+Day sections hidden until schedule announced
          // '<div class="kl-mobile-section-label">Sz\u00ednpad</div><div class="kl-mobile-pills">' + stagePills + '</div>' +
          // '<div class="kl-mobile-section-label">Nap</div><div class="kl-mobile-pills">' + dayPills + '</div>' +
          '<button class="kl-fav-toggle'+(this._filterFavourites?" active":"")+'" id="kl-mobile-fav-toggle">' +
            ICONS.heart(this._filterFavourites, 14) + ' ' + i18n.favourites +
            (favCount > 0 ? '<span class="kl-badge">'+favCount+'</span>' : '') +
          '</button>' +
          clearBtn +
        '</div>';
      }

      // Mobile filter icon badge count
      var mobileFilterCount = this._selectedStages.size + this._selectedDays.size + (this._filterFavourites ? 1 : 0);
      var mobileBadge = mobileFilterCount > 0
        ? '<span class="kl-icon-badge">'+mobileFilterCount+'</span>' : '';

      // ── Header with ZENE/NEMZENE split pill ──
      var zeActive  = this._musicType === 'zene';
      var nzActive  = this._musicType === 'nemzene';
      var headerHtml = '<div class="kl-header">' +
        // Desktop filters row
        '<div class="kl-desktop-filters">' +
          // Stage+Day filter buttons hidden until schedule is ready:
          // '<div class="kl-filter-wrap" style="display:none"><button class="kl-filter-btn" id="kl-stage-btn">▼ '+i18n.stage+'</button>'+stageClear+stageDropdown+'</div>' +
          // '<div class="kl-filter-wrap" style="display:none"><button class="kl-filter-btn" id="kl-day-btn">▼ '+i18n.day+'</button>'+dayClear+dayDropdown+'</div>' +

          // ZENE / NEMZENE split pill
          '<div class="kl-split-pill" id="kl-split-pill">' +
            '<button class="kl-split-half'+(zeActive?' active':'')+' " id="kl-zene-btn">'+i18n.zene+'</button>' +
            '<button class="kl-split-half'+(nzActive?' active':'')+' " id="kl-nemzene-btn">'+i18n.nemzene+'</button>' +
          '</div>' +

          // Favourites toggle
          '<button class="kl-fav-toggle'+(this._filterFavourites?' active':'')+' " id="kl-fav-toggle">' +
            ICONS.heart(this._filterFavourites, 14) +
            '<span class="kl-fav-label"> '+i18n.favourites+'</span>' +
            (favCount > 0 ? '<span class="kl-badge">'+favCount+'</span>' : '') +
          '</button>' +
        '</div>' +

        // Mobile filter icon
        '<div class="kl-mobile-filter-wrap" style="position:relative">' +
          '<button class="kl-icon-btn'+(hasActiveFilters?' active':'  inactive')+' " id="kl-mobile-filter-btn" style="position:relative">' +
            ICONS.filter(16) + mobileBadge +
          '</button>' +
          mobilePanelHtml +
        '</div>' +

        // Search — pill expands via CSS, input always in DOM to avoid reversed-typing bug
        '<div class="kl-search-row">' +
          '<div class="kl-search-pill'+(this._searchOpen?' open':'')+'" id="kl-search-pill">' +
            '<span class="kl-search-icon">'+ICONS.search(13)+'</span>' +
            '<input class="kl-search-input" id="kl-search-input" type="text" placeholder="'+i18n.search+'" value="'+esc(this._searchQuery)+'">' +
            '<button class="kl-search-clear" id="kl-search-clear">'+ICONS.close(12)+'</button>' +
          '</div>' +
          '<button class="kl-icon-btn'+(this._searchOpen||this._searchQuery?' active':' inactive')+' kl-search-toggle" id="kl-search-btn">' +
            ICONS.search(16) +
          '</button>' +
        '</div>' +
      '</div>';

      // ── Grid HTML ──
      var gridHtml = '';
      if (artists.length === 0) {
        gridHtml = '<div class="kl-empty">' +
          '<div class="kl-empty-title">'+i18n.noResults+'</div>' +
          '<div>'+i18n.tryOtherFilter+'</div>' +
        '</div>';
      } else {
        gridHtml = '<div class="kl-grid">';
        artists.forEach(function(a) {
          var isFav = self._favourites.has(a.id);
          var initials = a.name.split(" ").slice(0,2).map(function(w){return w[0]||"";}).join("").toUpperCase();
          var photoHtml = a.photo
            ? '<img class="kl-photo" src="'+esc(a.photo)+'" alt="'+esc(a.name)+'" loading="lazy">'
            : '<div class="kl-photo-placeholder"><span>'+esc(initials)+'</span></div>';

          gridHtml +=
            '<div class="kl-card" data-id="'+esc(a.id)+'">' +
              '<div class="kl-card-inner">' +
                photoHtml +
                '<div class="kl-hover-overlay"></div>' +
                '<button class="kl-fav-circle'+(isFav?" on":"")+' " data-fav="'+esc(a.id)+'">' +
                  (isFav ? ICONS.heartWhite(true, 16) : ICONS.heart(false, 16)) +                '</button>' +
                '<div class="kl-name-wrap"><span class="kl-name">'+esc(a.name)+'</span></div>' +
              '</div>' +
            '</div>';
        });
        gridHtml += '</div>';
      }

      // ── Popup ──
      var popupHtml = this._popupArtist ? this._renderPopup(this._popupArtist) : '';

      // ── Assemble ──
      // Inject shared popup CSS if available
      var extraCss = (typeof KoloradoArtistPopup !== "undefined") ? KoloradoArtistPopup.CSS : "";
      shadow.innerHTML = '<style>' + CSS + extraCss + '</style>' +
        '<div class="kl-root">' + headerHtml + '<div id="kl-grid-container">' + gridHtml + '</div>' + popupHtml + '</div>';

      // ── Scroll-triggered header border ──
      var klHeader = shadow.querySelector('.kl-header');
      if (klHeader) {
        // Remove any previous listener to avoid stacking on re-renders
        if (self._scrollHandler) window.removeEventListener('scroll', self._scrollHandler);
        self._scrollHandler = function() {
          var scrollY = window.scrollY || window.pageYOffset || 0;
          if (scrollY > 4) { klHeader.classList.add('scrolled'); }
          else { klHeader.classList.remove('scrolled'); }
        };
        window.addEventListener('scroll', self._scrollHandler, { passive: true });
        // Apply immediately in case page is already scrolled
        self._scrollHandler();
      }
      // ── Event listeners ──
      // Stage filter pilll
      var stageBtn = shadow.getElementById("kl-stage-btn");
      if (stageBtn) stageBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        if (e.target.id === "kl-stage-clear") {
          self._selectedStages = new Set(); self._showStageFilter = false; self._render(); return;
        }
        self._showStageFilter = !self._showStageFilter; self._showDayFilter = false; self._render();
      });

      // Day filter pill
      var dayBtn = shadow.getElementById("kl-day-btn");
      if (dayBtn) dayBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        if (e.target.id === "kl-day-clear") {
          self._selectedDays = new Set(); self._showDayFilter = false; self._render(); return;
        }
        self._showDayFilter = !self._showDayFilter; self._showStageFilter = false; self._render();
      });

      // Desktop checkbox items — stage
      shadow.querySelectorAll('[data-dropdown="kl-stage-dropdown"]').forEach(function(btn) {
        btn.addEventListener("click", function(e) {
          e.stopPropagation();
          var id = btn.getAttribute("data-opt-id");
          if (self._selectedStages.has(id)) self._selectedStages.delete(id);
          else self._selectedStages.add(id);
          self._showStageFilter = true; self._render();
        });
      });

      // Desktop checkbox items — day
      shadow.querySelectorAll('[data-dropdown="kl-day-dropdown"]').forEach(function(btn) {
        btn.addEventListener("click", function(e) {
          e.stopPropagation();
          var id = btn.getAttribute("data-opt-id");
          if (self._selectedDays.has(id)) self._selectedDays.delete(id);
          else self._selectedDays.add(id);
          self._showDayFilter = true; self._render();
        });
      });

      // ZENE / NEMZENE split pill
      var zeneBtn = shadow.getElementById('kl-zene-btn');
      if (zeneBtn) zeneBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        self._musicType = (self._musicType === 'zene') ? '' : 'zene';
        self._pushTypeUrl(self._musicType);
        self._render();
      });
      var nezeneBtn = shadow.getElementById('kl-nemzene-btn');
      if (nezeneBtn) nezeneBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        self._musicType = (self._musicType === 'nemzene') ? '' : 'nemzene';
        self._pushTypeUrl(self._musicType);
        self._render();
      });

      // Desktop fav toggle
      var favToggle = shadow.getElementById("kl-fav-toggle");
      if (favToggle) favToggle.addEventListener("click", function() {
        self._filterFavourites = !self._filterFavourites; self._render();
      });

      // Mobile filter icon
      var mobileFilterBtn = shadow.getElementById("kl-mobile-filter-btn");
      if (mobileFilterBtn) mobileFilterBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        self._showMobileFilters = !self._showMobileFilters; self._render();
      });

      // Mobile stage pills
      shadow.querySelectorAll("[data-mobile-stage]").forEach(function(btn) {
        btn.addEventListener("click", function(e) {
          e.stopPropagation();
          var s = btn.getAttribute("data-mobile-stage");
          if (self._selectedStages.has(s)) self._selectedStages.delete(s);
          else self._selectedStages.add(s);
          self._showMobileFilters = true; self._render();
        });
      });

      // Mobile day pills
      shadow.querySelectorAll("[data-mobile-day]").forEach(function(btn) {
        btn.addEventListener("click", function(e) {
          e.stopPropagation();
          var d = btn.getAttribute("data-mobile-day");
          if (self._selectedDays.has(d)) self._selectedDays.delete(d);
          else self._selectedDays.add(d);
          self._showMobileFilters = true; self._render();
        });
      });

      // Mobile fav toggle
      var mobileFavToggle = shadow.getElementById("kl-mobile-fav-toggle");
      if (mobileFavToggle) mobileFavToggle.addEventListener("click", function(e) {
        e.stopPropagation();
        self._filterFavourites = !self._filterFavourites; self._showMobileFilters = true; self._render();
      });

      // Mobile clear all
      var mobileClear = shadow.getElementById("kl-mobile-clear");
      if (mobileClear) mobileClear.addEventListener("click", function(e) {
        e.stopPropagation();
        self._selectedStages = new Set(); self._selectedDays = new Set();
        self._filterFavourites = false; self._showMobileFilters = false; self._render();
      });

      // Search button
      var searchBtn = shadow.getElementById("kl-search-btn");
      if (searchBtn) searchBtn.addEventListener("click", function() {
        self._searchOpen = !self._searchOpen;
        if (!self._searchOpen) self._searchQuery = "";
        self._render();
        if (self._searchOpen) {
          var inp = shadow.getElementById("kl-search-input");
          if (inp) inp.focus();
        }
      });

      // Search pill — click on closed pill to open
      var searchPill = shadow.getElementById("kl-search-pill");
      if (searchPill) searchPill.addEventListener("click", function() {
        if (!self._searchOpen) {
          self._searchOpen = true;
          searchPill.classList.add('open');
          var inp = shadow.getElementById("kl-search-input");
          if (inp) { inp.style.display = 'block'; inp.focus(); }
        }
      });

      // Search clear button
      var searchClear = shadow.getElementById("kl-search-clear");
      if (searchClear) searchClear.addEventListener("click", function(e) {
        e.stopPropagation();
        self._searchOpen = false;
        self._searchQuery = "";
        if (searchPill) searchPill.classList.remove('open');
        self._renderGridOnly();
      });

      // Search input — use _renderGridOnly to avoid rebuilding shadow DOM and losing focus
      var searchInput = shadow.getElementById("kl-search-input");
      if (searchInput) {
        searchInput.addEventListener("input", function(e) {
          self._searchQuery = searchInput.value;
          self._renderGridOnly();
          // Re-focus the input (it stays in DOM so cursor position is preserved)
          var inp = shadow.getElementById("kl-search-input");
          if (inp) inp.focus();
        });
        searchInput.addEventListener("keydown", function(e) {
          if (e.key === "Escape") {
            self._searchOpen = false;
            self._searchQuery = "";
            if (searchPill) searchPill.classList.remove('open');
            self._renderGridOnly();
          }
        });
      }

      // Card clicks + fav buttons — extracted to _wireGridEvents for reuse
      this._wireGridEvents(shadow);

      // Popup events — wired via shared KoloradoArtistPopup module
      if (self._popupArtist && typeof KoloradoArtistPopup !== "undefined") {
        var isFavPopup = self._favourites.has(self._popupArtist.id);
        // Build the navigation list from the current filtered+sorted artist list
        var navList = self._filteredArtists();
        var navIdx  = navList.findIndex(function(a){ return a.id === self._popupArtist.id; });
        KoloradoArtistPopup.wire(shadow, self._popupArtist, isFavPopup, {
          onClose: function() { self._closePopup(); },
          onToggleFav: function(id) {
            self._toggleFav(id);
            self._popupArtist = self._artists.find(function(a){ return a.id === id; }) || self._popupArtist;
            self._render();
          },
          onPrev: navIdx > 0 ? function() {
            self._popupArtist = navList[navIdx - 1]; self._render();
          } : null,
          onNext: navIdx < navList.length - 1 ? function() {
            self._popupArtist = navList[navIdx + 1]; self._render();
          } : null,
        });
      }

      // Close dropdowns on shadow click outside
      shadow.addEventListener("click", function(e) {
        var inStage = e.target.closest && (e.target.closest("#kl-stage-btn") || e.target.closest("#kl-stage-dropdown"));
        var inDay   = e.target.closest && (e.target.closest("#kl-day-btn")   || e.target.closest("#kl-day-dropdown"));
        var inMob   = e.target.closest && e.target.closest("#kl-mobile-filter-btn, #kl-mobile-panel");
        if (!inStage && self._showStageFilter) { self._showStageFilter = false; self._render(); }
        if (!inDay   && self._showDayFilter)   { self._showDayFilter   = false; self._render(); }
        if (!inMob   && self._showMobileFilters) { self._showMobileFilters = false; self._render(); }
      });
    }

    // ── Wire card click and fav events (called after full render and after _renderGridOnly) ──
    _wireGridEvents(shadow) {
      var self = this;
      shadow.querySelectorAll(".kl-card").forEach(function(card) {
        card.addEventListener("click", function(e) {
          if (e.target.closest("[data-fav]")) return;
          var id = card.getAttribute("data-id");
          var artist = self._artists.find(function(a){ return a.id === id; });
          if (artist) self._openPopup(artist);
        });
      });
      shadow.querySelectorAll("[data-fav]").forEach(function(btn) {
        btn.addEventListener("click", function(e) {
          e.stopPropagation(); self._toggleFav(btn.getAttribute("data-fav"));
        });
      });
    }
  }

  if (!customElements.get("kolorado-lineup")) {
    customElements.define("kolorado-lineup", KoloradoLineup);
  }

})();
