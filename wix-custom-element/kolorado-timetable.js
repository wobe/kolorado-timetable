// ============================================================
// Kolorádó Festival Timetable — Wix Custom Element v2
// Self-contained Web Component (no external dependencies)
//
// Features:
//   - Day tabs (Szerda–Szombat), pill-shaped, SerialBlur font
//   - Grid view (calendar) + List view toggle
//   - Search panel (navigation only, does not filter calendar)
//   - Favourites with cookie persistence (1 year)
//   - Kedvencek panel with ICS export + share link
//   - Shareable URL hash (#fav:...) — uses Wix parent page URL
//     via postMessage bridge so share links point to kolorado.hu
//   - Filter dropdown (stage toggles + "Csak a kedvenceim")
//   - Hidden empty stage columns when filtering
//   - MOST (now) line overlay
//   - Tap-to-reveal overlay on calendar events (mobile)
//   - Loading skeleton
//   - CMS data via lineup-data attribute (JSON string)
//
// Fonts (loaded from Manus CDN):
//   SerialBlur — headlines, artist names (ALL CAPS)
//   Pacaembu  — everything else
//
// Usage in Wix:
//   1. Upload this file to Wix Public files
//   2. Add Custom Element with tag: kolorado-timetable
//   3. Set ID to: koloradoTimetable
//   4. Add Velo page code from wix-velo-code/timetable-page.js
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
  function _kapEsc(s) { var _s=Array.isArray(s)?s.join(', '):(s==null?'':(typeof s==='string'?s:String(s))); return _s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
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
    var fillColor  = filled ? "#DCEA75" : "none";
    var strokeColor = filled ? "#DCEA75" : "#0E4B4D";
    return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="'+fillColor+'" stroke="'+strokeColor+'" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  }
  var KAP_PLACEHOLDER_IMG = "https://cdn.jsdelivr.net/gh/wobe/kolorado-timetable@main/wix-custom-element/artist-placeholder.jpg";
  var KAP_CSS = [
    "@keyframes kapFadeIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}",
    ".kap-overlay{position:fixed;inset:0;background:rgba(6,35,34,0.70);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;}",
    ".kap-card{position:relative;width:100%;max-width:480px;min-height:350px;background:#FEFFC0;box-shadow:0 24px 60px rgba(0,0,0,0.3);animation:kapFadeIn 0.18s ease;}",
    ".kap-close{position:absolute;top:10px;right:10px;width:30px;height:30px;border-radius:50%;background:rgba(254,255,192,0.9);border:none;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;color:#642CFF;font-weight:700;z-index:10;line-height:1;}",
    ".kap-mobile{display:flex;flex-direction:column;max-height:90vh;overflow-y:auto;-webkit-overflow-scrolling:touch;}",
    ".kap-img-wrap{position:relative;width:100%;padding-top:75%;flex-shrink:0;overflow:hidden;}",
    ".kap-img-inner{position:absolute;inset:0;}",
    ".kap-desktop{display:none;}",
    "@media(min-width:640px){",
    "  .kap-card{max-width:720px;min-height:350px;}",
    "  .kap-mobile{display:none;}",
    "  .kap-desktop{display:flex;align-items:stretch;min-height:350px;}",
    "  .kap-left{flex-shrink:0;width:clamp(240px,38%,420px);position:relative;}",
    "  .kap-left-inner{position:absolute;inset:0;display:flex;flex-direction:column;}",
    "  .kap-right{flex:1;overflow-y:auto;max-height:90vh;display:flex;flex-direction:column;min-height:350px;}",
    "}",
    ".kap-photo{width:100%;height:100%;object-fit:cover;display:block;}",
    ".kap-photo-ph{width:100%;height:100%;overflow:hidden;}",
    ".kap-photo-ph img{width:100%;height:100%;object-fit:cover;display:block;}",
    ".kap-name-wrap{position:absolute;top:0;left:0;padding:8px 10px 4px;right:52px;}",
    ".kap-name{font-family:'SerialBlur',sans-serif;font-size:22px;color:#642CFF;background:#FEFFC0;display:inline;padding:2px 8px;-webkit-box-decoration-break:clone;box-decoration-break:clone;line-height:1.3;text-transform:uppercase;letter-spacing:0.02em;}",
    ".kap-subtitle{font-family:'SerialBlur',sans-serif;font-size:14px;color:#642CFF;background:#FEFFC0;display:inline;padding:2px 8px;-webkit-box-decoration-break:clone;box-decoration-break:clone;line-height:1.4;text-transform:uppercase;letter-spacing:0.03em;opacity:0.8;}",
    ".kap-fav-popup{position:absolute;bottom:10px;right:10px;width:40px;height:40px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.25);transition:all 0.15s;z-index:5;}",
    ".kap-fav-popup.off{background:#DCEA75;}",
    ".kap-fav-popup.on{background:#e86b5a;}",
    ".kap-fav-popup.on svg{fill:#DCEA75 !important;color:#DCEA75 !important;}",
    ".kap-body{padding:20px 22px 24px;display:flex;flex-direction:column;gap:12px;flex:1;}",
    ".kap-meta{font-family:'Pacaembu',sans-serif;font-size:15px;font-weight:700;color:#0E4B4D;line-height:1.4;letter-spacing:0.01em;}",
    ".kap-genre{font-family:'Pacaembu',sans-serif;font-size:13px;color:rgba(100,44,255,0.6);text-transform:lowercase;margin:0;}",
    ".kap-desc{font-family:'Pacaembu',sans-serif;font-size:13px;color:#333;line-height:1.65;margin:0;}",
    ".kap-placeholder{font-family:'Pacaembu',sans-serif;font-size:13px;color:rgba(0,0,0,0.3);margin:0;}",
    ".kap-player{margin-top:4px;}",
    ".kap-player iframe{display:block;width:100%;}",
    ".kap-yt-wrap{position:relative;width:100%;padding-bottom:56.25%;}",
    ".kap-yt-wrap iframe{position:absolute;inset:0;width:100%;height:100%;display:block;}",
    ".kap-nav-btn{flex-shrink:0;align-self:center;z-index:20;width:40px;height:40px;border-radius:50%;background:transparent;border:none;cursor:pointer;display:none;align-items:center;justify-content:center;color:#DCEA75;font-size:22px;line-height:1;margin:0 4px;transition:opacity 0.15s;padding:0;}",
    ".kap-nav-btn.disabled{opacity:0.2;pointer-events:none;cursor:default;}",
    "@media(min-width:640px){.kap-nav-btn{display:flex;}}",
  ].join("\n");
  function _kapImagePanel(a, isFav) {
    var photoHtml = a.photo
      ? '<img class="kap-photo" src="'+_kapEsc(a.photo)+'" alt="'+_kapEsc(a.name)+'" loading="lazy">'
      : '<div class="kap-photo-ph"><img src="'+KAP_PLACEHOLDER_IMG+'" alt="" loading="lazy"></div>';
    var subtitle = _kapEsc(a.title1 || "");
    return photoHtml +
      '<div class="kap-name-wrap">' +
        '<span class="kap-name">'+_kapEsc(a.name)+'</span>' +
        (subtitle ? '<br><span class="kap-subtitle">'+subtitle+'</span>' : '') +
      '</div>' +
      '<button class="kap-fav-popup '+(isFav?"on":"off")+'" data-id="'+_kapEsc(a.id)+'">' +
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
      playerHtml = '<div class="kap-player"><iframe width="100%" height="125" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url='+encodeURIComponent(a.soundcloudLink)+'&color=%23642CFF&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false"></iframe></div>';
    } else if (a.youtubeLink) {
      var ytUrl = a.youtubeLink;
      var mEmbed = ytUrl.match(/\/embed\/([A-Za-z0-9_-]{11})/);
      var mWatch = ytUrl.match(/[?&]v=([A-Za-z0-9_-]{11})/);
      var mShort = ytUrl.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
      var ytId = (mEmbed && mEmbed[1]) || (mWatch && mWatch[1]) || (mShort && mShort[1]);
      var ytSrc = ytId ? "https://www.youtube.com/embed/" + ytId : ytUrl;
      playerHtml = '<div class="kap-player"><div class="kap-yt-wrap"><iframe src="'+_kapEsc(ytSrc)+'" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div>';
    }
    return '<div class="kap-body">' +
      (metaLine ? '<div class="kap-meta">'+_kapEsc(metaLine)+'</div>' : '') +
      (a.genre ? '<p class="kap-genre">'+_kapEsc(a.genre)+'</p>' : '') +
      (a.longDescription ? '<p class="kap-desc">'+_kapEsc(a.longDescription)+'</p>' : '<p class="kap-placeholder">Részletek hamarosan…</p>') +
      playerHtml +
    '</div>';
  }
  function _kapRender(a, isFav, hasPrev, hasNext) {
    var imgPanel  = _kapImagePanel(a, isFav);
    var infoPanel = _kapInfoPanel(a);
    return '<div class="kap-overlay" id="kap-overlay">' +
      '<button class="kap-nav-btn' + (!hasPrev ? " disabled" : "") + '" id="kap-nav-prev">&#9664;</button>' +
      '<div class="kap-card">' +
        '<button class="kap-close" id="kap-close">&#215;</button>' +
        '<div class="kap-mobile"><div class="kap-img-wrap"><div class="kap-img-inner">' + imgPanel + '</div></div>' + infoPanel + '</div>' +
        '<div class="kap-desktop"><div class="kap-left"><div class="kap-left-inner">' + imgPanel + '</div></div><div class="kap-right">' + infoPanel + '</div></div>' +
      '</div>' +
      '<button class="kap-nav-btn' + (!hasNext ? " disabled" : "") + '" id="kap-nav-next">&#9654;</button>' +
    '</div>';
  }
  function _kapWire(shadow, a, isFav, callbacks) {
    var overlay  = shadow.querySelector("#kap-overlay");
    var closeBtn = shadow.querySelector("#kap-close");
    var favBtns  = shadow.querySelectorAll(".kap-fav-popup");
    var prevBtn  = shadow.querySelector("#kap-nav-prev");
    var nextBtn  = shadow.querySelector("#kap-nav-next");
    if (closeBtn) closeBtn.addEventListener("click", function() { if (callbacks.onClose) callbacks.onClose(); });
    if (overlay)  overlay.addEventListener("click", function(e) { if (e.target === overlay && callbacks.onClose) callbacks.onClose(); });
    favBtns.forEach(function(btn) {
      btn.addEventListener("click", function(e) { e.stopPropagation(); var id=btn.getAttribute("data-id"); if(callbacks.onToggleFav) callbacks.onToggleFav(id); });
    });
    if (prevBtn)  prevBtn.addEventListener("click", function(e) { e.stopPropagation(); if (callbacks.onPrev) callbacks.onPrev(); });
    if (nextBtn)  nextBtn.addEventListener("click", function(e) { e.stopPropagation(); if (callbacks.onNext) callbacks.onNext(); });
    // Keyboard navigation
    function _kapKeyHandler(e) {
      if (e.key === "ArrowLeft")  { e.preventDefault(); if (callbacks.onPrev) callbacks.onPrev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); if (callbacks.onNext) callbacks.onNext(); }
      if (e.key === "Escape")     { if (callbacks.onClose) callbacks.onClose(); }
    }
    document.addEventListener("keydown", _kapKeyHandler);
    // Store cleanup fn so caller can remove listener when popup closes
    callbacks._removeKeyHandler = function() { document.removeEventListener("keydown", _kapKeyHandler); };
  }
  // Compatibility shim — existing code calls KoloradoArtistPopup.render/wire/CSS
  var KoloradoArtistPopup = { CSS: KAP_CSS, render: _kapRender, wire: _kapWire,
    setConfig: function(o){ if(o.festivalDays)_kapFestivalDays=o.festivalDays; if(o.dayStartHour!==undefined)_kapDayStartHour=o.dayStartHour; }
  };

  // ── Language detection ──────────────────────────────────────────────────────
  // Checks URL path/query for /en/ or ?lang=en, then html[lang], defaults HU.
  // Also reacts to the postMessage parent URL forwarded by timetable-page.js.
  function detectLang(url) {
    try {
      var u = (url || window.location.pathname + window.location.search).toLowerCase();
      if (/\/en(\/|$|\?)|[?&]lang=en/.test(u)) return "en";
      var htmlLang = (document.documentElement.lang || "").toLowerCase();
      if (htmlLang.startsWith("en")) return "en";
    } catch(e) {}
    return "hu";
  }
  var LANG = detectLang();

  // ── Translations ──────────────────────────────────────────────────────────
  var T = {
    hu: {
      favToast:        "A kedvenceidet a b\u00f6ng\u00e9sz\u0151d t\u00e1rolja.",
      close:           "Bez\u00e1r\u00e1s",
      favourites:      "Kedvencek",
      noFavourites:    "M\u00e9g nincs kedvenc. Kattints a \u2665 gombra egy el\u0151ad\u00f3n\u00e1l.",
      favDisclaimer:   "A kedvenceidet a b\u00f6ng\u00e9sz\u0151d t\u00e1rolja.",
      addToCalendar:   "Napt\u00e1rba",
      iosCalError:     "A naptárba mentés iOS-en csak Safariban működik. A megosztás gombbal át tudod vinni oda is a kedvenceidet.",
      share:           "Megoszt\u00e1s",
      search:          "Keres\u00e9s\u2026",
      searchTitle:     "Keres\u00e9s",
      filtersTitle:    "Sz\u0171r\u0151k",
      onlyFavourites:  "Csak a kedvenceim",
      musicElo:        "\u00c9l\u0151 zene",
      musicElektro:    "Elektronikus",
      musicNemzene:    "Nemzene",
      stages:          "Helysz\u00ednek",
      calendar:        "Napt\u00e1r",
      list:            "Lista",
      noResults:       "Nincs tal\u00e1lat: \u201e",
      noResultsClose:  "\u201d",
      noProgram:       "Ezen a napon nincs program.",
      noFavProgram:    "Ezen a napon nincs kedvenc el\u0151ad\u00f3d.",
      showAll:         "\u00d6sszes program mutat\u00e1sa",
      favPillOn:       "Kedvenc",
      favPillOff:      "Kedvencnek",
      nowLabel:        "MOST",
      linkCopied:      "Link másolva a vágólapra. Ha megnyitod egy másik böngészőben, bekerülnek oda is a kedvenceid.",
      copyLink:        "M\u00e1sold ki ezt a linket:",
      unknown:         "Ismeretlen",
      days: { wed: "Szerda", thu: "Cs\u00fct\u00f6rt\u00f6k", fri: "P\u00e9ntek", sat: "Szombat" },
      shortDays: { wed: "Sze", thu: "Cs\u00fct", fri: "P\u00e9n", sat: "Szo" },
    },
    en: {
      favToast:        "Your favourites are stored in your browser.",
      close:           "Close",
      favourites:      "Favourites",
      noFavourites:    "No favourites yet. Tap the \u2665 button on an artist.",
      favDisclaimer:   "Your favourites are stored in your browser.",
      addToCalendar:   "Add to calendar",
      iosCalError:     "Calendar export only works in Safari on iOS. You can transfer your favourites there using the Share button.",
      share:           "Share",
      search:          "Search\u2026",
      searchTitle:     "Search",
      filtersTitle:    "Filters",
      onlyFavourites:  "Only my favourites",
      musicElo:        "Live",
      musicElektro:    "Electronic",
      musicNemzene:    "World",
      stages:          "Venues",
      calendar:        "Calendar",
      list:            "List",
      noResults:       "No results: \u201c",
      noResultsClose:  "\u201d",
      noProgram:       "No programme on this day.",
      noFavProgram:    "No favourite artists on this day.",
      showAll:         "Show all programme",
      favPillOn:       "Favourite",
      favPillOff:      "Add fav",
      nowLabel:        "NOW",
      linkCopied:      "Link copied to clipboard. Open it in another browser and your favourites will be there too.",
      copyLink:        "Copy this link:",
      unknown:         "Unknown",
      days: { wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday" },
      shortDays: { wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat" },
    },
  };
  var i18n = T[LANG];

  // ── Font URLs (served from the hosted Manus site) ──────────
  const SERIAL_BLUR_URL = "https://cdn.jsdelivr.net/gh/wobe/kolorado-timetable@main/wix-custom-element/SerialBlurTRIAL-Bleed.ttf";
  const PACAEMBU_URL    = "https://cdn.jsdelivr.net/gh/wobe/kolorado-timetable@main/wix-custom-element/Pacaembu-Medium.ttf";

  // ── Constants ──────────────────────────────────────────────
  const KOLORADO_BASE_URL = "https://www.kolorado.hu";
  const FAV_COOKIE_NAME   = "kolorado_favourites";
  const FAV_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
  const DAY_START_HOUR    = 10;
  const DAY_END_HOUR      = 31;
  const HOUR_HEIGHT_PX    = 80;
  const MOBILE_HOUR_HEIGHT_PX = 60;

  const FESTIVAL_DAYS = [
    { id: "wed", label: i18n.days.wed, shortLabel: i18n.shortDays.wed, date: "2026-07-15" },
    { id: "thu", label: i18n.days.thu, shortLabel: i18n.shortDays.thu, date: "2026-07-16" },
    { id: "fri", label: i18n.days.fri, shortLabel: i18n.shortDays.fri, date: "2026-07-17" },
    { id: "sat", label: i18n.days.sat, shortLabel: i18n.shortDays.sat, date: "2026-07-18" },
  ];

  // Stage color palette — cycles for any number of stages
  const STAGE_COLORS = [
    "#dcea75", "#5ab8e8", "#e8a838", "#a87be8",
    "#e86b5a", "#5ae8a8", "#e8c85a", "#e85aab",
    "#7be8d4", "#e87b5a", "#b8e85a", "#5a7be8",
  ];
  function slugId(name) {
    return name.toLowerCase()
      .replace(/[áàä]/g,'a').replace(/[éè]/g,'e').replace(/[íì]/g,'i')
      .replace(/[óöő]/g,'o').replace(/[úüű]/g,'u')
      .replace(/[^a-z0-9]+/g,'');
  }
  function buildStages(artists) {
    // Collect unique stage names from artist data
    var seen = {};
    var names = [];
    artists.forEach(function(a) {
      var stageName = Array.isArray(a.stage) ? a.stage[0] : (a.stage || "");
      if (stageName && !seen[stageName]) { seen[stageName] = true; names.push(stageName); }
    });
    // Sort: priority stages first (case-insensitive match), then rest alphabetically
    var STAGE_PRIORITY = [
      "nagyszínpad", "platános", "hangár", "tószínpad", "bálterem", "nyugi listening bar", "ring"
    ];
    names.sort(function(a, b) {
      var ai = STAGE_PRIORITY.indexOf(a.toLowerCase());
      var bi = STAGE_PRIORITY.indexOf(b.toLowerCase());
      if (ai !== -1 && bi !== -1) return ai - bi;          // both priority: use defined order
      if (ai !== -1) return -1;                             // only a is priority: a first
      if (bi !== -1) return 1;                              // only b is priority: b first
      return a.localeCompare(b, 'hu');                      // neither: alphabetical
    });
    return names.map(function(name, i) {
      return { id: slugId(name), name: name, color: STAGE_COLORS[i % STAGE_COLORS.length] };
    });
  }
  // Returns today's festival day id if we're in the festival window, otherwise the fallback
  function getDefaultDay(fallbackId) {
    var todayId = getFestivalDayId(new Date());
    return todayId || fallbackId;
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
    { id:"w1",  name:"Analog Balaton",              stage:"Nagyszínpad",  startTime:makeDate("2026-07-15",19,15), endTime:makeDate("2026-07-15",20,15), genre:"elektronikus",            url:"/lineup/analog-balaton" },
    { id:"w2",  name:"Elefánt",                     stage:"Nagyszínpad",  startTime:makeDate("2026-07-15",21, 0), endTime:makeDate("2026-07-15",22,30), genre:"rock",                    url:"/lineup/elef%C3%A1nt" },
    { id:"w3",  name:"Swim Swim Naked",              stage:"Nagyszínpad",  startTime:makeDate("2026-07-15",23, 0), endTime:makeDate("2026-07-16", 0,30), genre:"elektronikus-pop",        url:"/lineup/swim-swim-naked" },
    { id:"w4",  name:"Decolonize Your Mind Society", stage:"Bálterem",    startTime:makeDate("2026-07-15",17, 0), endTime:makeDate("2026-07-15",18,30), genre:"pszichedelikus jazz-rock", url:"/lineup/decolonize-your-mind-society" },
    { id:"w5",  name:"L.A. Suzi",                   stage:"Bálterem",    startTime:makeDate("2026-07-15",20, 0), endTime:makeDate("2026-07-15",21,30), genre:"dallamos punk-pop sanzon", url:"/lineup/l.a.-suzi" },
    { id:"w6",  name:"Csinszka",                    stage:"Bálterem",    startTime:makeDate("2026-07-15",22,30), endTime:makeDate("2026-07-16", 0, 0), genre:"indie pop",               url:"/lineup/csinszka" },
    { id:"w7",  name:"Gilbert Pomelo",              stage:"Tószínpad",   startTime:makeDate("2026-07-15",22, 0), endTime:makeDate("2026-07-16", 0, 0), genre:"dub",                     url:"/lineup/gilbert-pomelo" },
    { id:"w8",  name:"Monofade",                    stage:"Tószínpad",   startTime:makeDate("2026-07-16", 0, 0), endTime:makeDate("2026-07-16", 2, 0), genre:"house",                   url:"/lineup/monofade" },
    { id:"w9",  name:"Loophia",                     stage:"Hangár",      startTime:makeDate("2026-07-15",20, 0), endTime:makeDate("2026-07-15",21,30), genre:"experimentális pop",       url:"/lineup/loophia" },
    { id:"w10", name:"Cicciolina.jpeg",             stage:"Hangár",      startTime:makeDate("2026-07-15",22, 0), endTime:makeDate("2026-07-15",23,30), genre:"tánczene",                url:"/lineup/cicciolina.jpeg" },
    { id:"w11", name:"Kolibri",                     stage:"Platános",    startTime:makeDate("2026-07-15",14, 0), endTime:makeDate("2026-07-15",15,30), genre:"folk",                    url:"/lineup/kolibri" },
    { id:"w12", name:"Telehold",                    stage:"Platános",    startTime:makeDate("2026-07-15",16, 0), endTime:makeDate("2026-07-15",17,30), genre:"ambient",                 url:"/lineup/telehold" },
    { id:"w13", name:"Szoliver",                    stage:"Listening Bar",startTime:makeDate("2026-07-15",18, 0), endTime:makeDate("2026-07-15",20, 0), genre:"DJ set",                  url:"/lineup/szoliver" },
    { id:"w14", name:"Tolo",                        stage:"Listening Bar",startTime:makeDate("2026-07-16", 0, 0), endTime:makeDate("2026-07-16", 3, 0), genre:"techno",                  url:"/lineup/tolo" },
    { id:"t1",  name:"Aga2l & Indirect Movement",  stage:"Tószínpad",   startTime:makeDate("2026-07-16",19,15), endTime:makeDate("2026-07-16",19,30), genre:"techno",                  url:"/lineup/aga2l-%26-indirect-movement" },
    { id:"t2",  name:"Adis Is Ok",                 stage:"Bálterem",    startTime:makeDate("2026-07-16",19,15), endTime:makeDate("2026-07-16",21,15), genre:"house",                   url:"/lineup/adis-is-ok" },
    { id:"t3",  name:"Sisi",                       stage:"Nagyszínpad",  startTime:makeDate("2026-07-16",21, 0), endTime:makeDate("2026-07-16",22,30), genre:"rap",                     url:"/lineup/sisi" },
    { id:"t4",  name:"Pumped Gabó",                stage:"Hangár",      startTime:makeDate("2026-07-16",23, 0), endTime:makeDate("2026-07-17", 0,30), genre:"hardstyle",               url:"/lineup/pumped-gab%C3%B3" },
    { id:"t5",  name:"Budapest Afro Ska Orchestra",stage:"Platános",    startTime:makeDate("2026-07-16",17, 0), endTime:makeDate("2026-07-16",18,30), genre:"ska",                     url:"/lineup/budapest-afro-ska-orchestra" },
    { id:"t6",  name:"Gege x Bizmuth",             stage:"Tószínpad",   startTime:makeDate("2026-07-16",22, 0), endTime:makeDate("2026-07-17", 0, 0), genre:"experimental",            url:"/lineup/gege-x-bizmuth" },
    { id:"t7",  name:"Hocuspony",                  stage:"Listening Bar",startTime:makeDate("2026-07-16",20, 0), endTime:makeDate("2026-07-16",22, 0), genre:"electronic",              url:"/lineup/hocuspony" },
    { id:"t8",  name:"Lil 404",                    stage:"Hangár",      startTime:makeDate("2026-07-16",20, 0), endTime:makeDate("2026-07-16",21,30), genre:"rap",                     url:"/lineup/lil-404" },
    { id:"t9",  name:"Bagocs",                     stage:"Bálterem",    startTime:makeDate("2026-07-16",22, 0), endTime:makeDate("2026-07-16",23,30), genre:"electronic",              url:"/lineup/bagocs" },
    { id:"f1",  name:"Indigo",                     stage:"Nagyszínpad",  startTime:makeDate("2026-07-17",19, 0), endTime:makeDate("2026-07-17",20,30), genre:"indie pop",               url:"/lineup/indigo" },
    { id:"f2",  name:"Bongor",                     stage:"Nagyszínpad",  startTime:makeDate("2026-07-17",22, 0), endTime:makeDate("2026-07-17",23,30), genre:"electronic",              url:"/lineup/bongor" },
    { id:"f3",  name:"Paralich",                   stage:"Bálterem",    startTime:makeDate("2026-07-17",20, 0), endTime:makeDate("2026-07-17",21,30), genre:"punk",                    url:"/lineup/paralich" },
    { id:"f4",  name:"Toro Lomo",                  stage:"Tószínpad",   startTime:makeDate("2026-07-17",21, 0), endTime:makeDate("2026-07-17",23, 0), genre:"electronic",              url:"/lineup/toro-lomo" },
    { id:"f5",  name:"Shoes",                      stage:"Hangár",      startTime:makeDate("2026-07-17",18, 0), endTime:makeDate("2026-07-17",19,30), genre:"indie",                   url:"/lineup/shoes" },
    { id:"f6",  name:"Vedat Akdag",                stage:"Hangár",      startTime:makeDate("2026-07-17",22, 0), endTime:makeDate("2026-07-18", 0, 0), genre:"electronic",              url:"/lineup/vedat-akdag" },
    { id:"f7",  name:"Palo Canto",                 stage:"Platános",    startTime:makeDate("2026-07-17",16, 0), endTime:makeDate("2026-07-17",17,30), genre:"world",                   url:"/lineup/palo-canto-live" },
    { id:"f8",  name:"Rozi Mákó / Tsering",        stage:"Healing",     startTime:makeDate("2026-07-17",11, 0), endTime:makeDate("2026-07-17",12,30), genre:"healing",                 url:"/lineup/rozi-m%C3%A1k%C3%B3-%2F-tsering" },
    { id:"f9",  name:"Slym",                       stage:"Listening Bar",startTime:makeDate("2026-07-17",23, 0), endTime:makeDate("2026-07-18", 2, 0), genre:"electronic",              url:"/lineup/slym" },
    { id:"s1",  name:"Crime",                      stage:"Nagyszínpad",  startTime:makeDate("2026-07-18",21, 0), endTime:makeDate("2026-07-18",22,30), genre:"electronic",              url:"/lineup/crime" },
    { id:"s2",  name:"Siketfajd",                  stage:"Nagyszínpad",  startTime:makeDate("2026-07-18",18, 0), endTime:makeDate("2026-07-18",19,30), genre:"rock",                    url:"/lineup/siketfajd" },
    { id:"s3",  name:"Mőb",                        stage:"Bálterem",    startTime:makeDate("2026-07-18",20, 0), endTime:makeDate("2026-07-18",21,30), genre:"electronic",              url:"/lineup/m%C3%B6b" },
    { id:"s4",  name:"Blue Advance",               stage:"Tószínpad",   startTime:makeDate("2026-07-18",22, 0), endTime:makeDate("2026-07-19", 0, 0), genre:"electronic",              url:"/lineup/blue-advance" },
    { id:"s5",  name:"Zakhorov",                   stage:"Hangár",      startTime:makeDate("2026-07-18",20, 0), endTime:makeDate("2026-07-18",22, 0), genre:"techno",                  url:"/lineup/zakhorov" },
    { id:"s6",  name:"Hanussen & Kozmo D",         stage:"Listening Bar",startTime:makeDate("2026-07-18",22, 0), endTime:makeDate("2026-07-19", 1, 0), genre:"electronic",              url:"/lineup/hanussen-%26-kozmo-d" },
    { id:"s7",  name:"Lőrinczi Áron",              stage:"Platános",    startTime:makeDate("2026-07-18",15, 0), endTime:makeDate("2026-07-18",16,30), genre:"folk",                    url:"/lineup/l%C5%91rinczi-%C3%A1ron" },
    { id:"s8",  name:"Gandharva & Von Yodi",       stage:"Healing",     startTime:makeDate("2026-07-18",12, 0), endTime:makeDate("2026-07-18",14, 0), genre:"healing",                 url:"/lineup/gandharva-%26-von-yodi" },
    { id:"s9",  name:"Kale Lulugyi",               stage:"Ring",        startTime:makeDate("2026-07-18",19, 0), endTime:makeDate("2026-07-18",20,30), genre:"world",                   url:"/lineup/kale-lulugyi" },
    { id:"s10", name:"Kiuz & Arash Ete",           stage:"Ring",        startTime:makeDate("2026-07-18",21, 0), endTime:makeDate("2026-07-18",23, 0), genre:"electronic",              url:"/lineup/kiuz-%26-arash-ete" },
    { id:"s11", name:"Falcao",                     stage:"Bálterem",    startTime:makeDate("2026-07-18",23, 0), endTime:makeDate("2026-07-19", 1, 0), genre:"electronic",              url:"/lineup/falcao" },
    { id:"s12", name:"Freakin' Disco",             stage:"Hangár",      startTime:makeDate("2026-07-18",23,30), endTime:makeDate("2026-07-19", 2, 0), genre:"disco",                   url:"/lineup/freakin'-disco" },
    { id:"s13", name:"Moonbase Patel Disco",       stage:"Tószínpad",   startTime:makeDate("2026-07-18",16, 0), endTime:makeDate("2026-07-18",18, 0), genre:"disco",                   url:"/lineup/moonbase-patel-disco" },
    { id:"s14", name:"Lenkke_",                    stage:"Listening Bar",startTime:makeDate("2026-07-18",18, 0), endTime:makeDate("2026-07-18",20, 0), genre:"electronic",              url:"/lineup/lenkke_" },
    { id:"s15", name:"BRSZ",                       stage:"Platános",    startTime:makeDate("2026-07-18",18, 0), endTime:makeDate("2026-07-18",19,30), genre:"electronic",              url:"/lineup/brsz" },
    { id:"s16", name:"Klpflrtrpr & Vava",          stage:"Ring",        startTime:makeDate("2026-07-18",23, 0), endTime:makeDate("2026-07-19", 1,30), genre:"electronic",              url:"/lineup/klpflrtpr-%26-vava" },
  ];

  // ── Helpers ────────────────────────────────────────────────
  function toFestivalHour(date) {
    var h = date.getHours(), m = date.getMinutes();
    return h < DAY_START_HOUR ? 24 + h + m / 60 : h + m / 60;
  }
  function formatTime(date) {
    return date.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  function getFestivalDayId(date) {
    var h = date.getHours();
    var d = new Date(date);
    if (h < DAY_START_HOUR) d.setDate(d.getDate() - 1);
    // Use LOCAL date parts to avoid UTC offset shifting the date (e.g. UTC+2 01:00 local
    // becomes previous day in toISOString(), causing post-midnight slots to appear on wrong day)
    var y = d.getFullYear();
    var mo = String(d.getMonth() + 1).padStart(2, "0");
    var dy = String(d.getDate()).padStart(2, "0");
    var str = y + "-" + mo + "-" + dy;
    var day = FESTIVAL_DAYS.find(function(fd) { return fd.date === str; });
    return day ? day.id : null;
  }
  function getArtistPageUrl(artist) {
    if (artist.url) return KOLORADO_BASE_URL + artist.url;
    var slug = artist.name.toLowerCase()
      .replace(/[áà]/g,"a").replace(/[éè]/g,"e").replace(/[íì]/g,"i")
      .replace(/[óòö]/g,"o").replace(/[őô]/g,"o").replace(/[úùü]/g,"u")
      .replace(/[űû]/g,"u").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    return KOLORADO_BASE_URL + "/lineup/" + slug;
  }
  function readFavCookie() {
    try {
      var m = document.cookie.split("; ").find(function(r) { return r.startsWith(FAV_COOKIE_NAME + "="); });
      if (!m) return new Set();
      var ids = JSON.parse(decodeURIComponent(m.split("=")[1]));
      return new Set(Array.isArray(ids) ? ids : []);
    } catch(e) { return new Set(); }
  }
  function writeFavCookie(ids) {
    document.cookie = FAV_COOKIE_NAME + "=" + encodeURIComponent(JSON.stringify(Array.from(ids))) + "; path=/; max-age=" + FAV_COOKIE_MAX_AGE + "; SameSite=Lax";
  }

  // ── Shared localStorage fav sync (works across tabs of same origin) ──────
  var FAV_LS_KEY = "kolorado_favourites";
  // BroadcastChannel for same-tab cross-iframe sync (modern browsers)
  var _favBC = null;
  try { _favBC = new BroadcastChannel("kolorado_fav_sync"); } catch(e) {}
  function readFavLocalStorage() {
    try {
      var raw = localStorage.getItem(FAV_LS_KEY);
      if (!raw) return null;
      var ids = JSON.parse(raw);
      return Array.isArray(ids) ? new Set(ids) : null;
    } catch(e) { return null; }
  }
  function writeFavLocalStorage(favSet) {
    var arr = Array.from(favSet);
    try { localStorage.setItem(FAV_LS_KEY, JSON.stringify(arr)); } catch(e) {}
    try { if (_favBC) _favBC.postMessage({ type: "kolorado-fav-update", ids: arr }); } catch(e) {}
  }

  // ── First-favourite toast ────────────────────────────────────────────────
  var FAV_TOAST_KEY = "kolorado_fav_toast_seen";
  function showFirstFavToast() {
    try { if (localStorage.getItem(FAV_TOAST_KEY)) return; } catch(e) { return; }
    try { localStorage.setItem(FAV_TOAST_KEY, "1"); } catch(e) {}
    var t = document.createElement("div");
    t.style.cssText = [
      "position:fixed","bottom:16px","left:12px","right:12px",
      "z-index:9999",
      "background:#dcea75","color:#062322","padding:10px 14px",
      "display:flex","align-items:flex-start","gap:10px",
      "box-shadow:0 4px 24px rgba(0,0,0,0.35)",
      "font-family:'Pacaembu',sans-serif","font-size:13px","line-height:1.5",
      "pointer-events:auto","cursor:default","border-radius:14px",
    ].join(";");
    t.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="#062322" stroke="#062322" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px">'+
        '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>'+
      '</svg>'+
      '<span style="flex:1">'+i18n.favToast+'</span>'+
      '<button onclick="this.parentNode.remove()" style="background:none;border:none;cursor:pointer;color:rgba(6,35,34,0.5);padding:0;flex-shrink:0;display:flex;align-items:center;margin-top:1px" aria-label="'+i18n.close+'">'+
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'+
      '</button>';
    document.body.appendChild(t);
    setTimeout(function(){ if (t.parentNode) t.remove(); }, 5000);
  }

  function encodeFavs(ids) {
    if (!ids.size) return "";
    return btoa(Array.from(ids).join(",")).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");
  }
  function decodeFavs(hash) {
    try {
      var padded = hash + "=".repeat((4 - hash.length % 4) % 4);
      return atob(padded.replace(/-/g,"+").replace(/_/g,"/")).split(",").filter(Boolean);
    } catch(e) { return []; }
  }
  function generateAllICS(artists) {
    var pad = function(n) { return String(n).padStart(2,"0"); };
    var fmt = function(d) { return d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate()) + "T" + pad(d.getHours()) + pad(d.getMinutes()) + "00"; };
    var now = new Date();
    var events = artists.map(function(a) {
      return ["BEGIN:VEVENT","DTSTART:"+fmt(a.startTime),"DTEND:"+fmt(a.endTime),"DTSTAMP:"+fmt(now),"UID:"+a.id+"@kolorado.hu","SUMMARY:"+a.name,"DESCRIPTION:"+a.name+" @ "+a.stage+" - Kolorádó Fesztivál 2026","LOCATION:"+a.stage+"\\, Kolorádó Fesztivál\\, Káloz","STATUS:CONFIRMED","END:VEVENT"].join("\r\n");
    }).join("\r\n");
    return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Kolorádó Fesztivál//Timetable//HU","CALSCALE:GREGORIAN","METHOD:PUBLISH",events,"END:VCALENDAR"].join("\r\n");
  }
  function downloadAllICS(artists) {
    var blob = new Blob([generateAllICS(artists)], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "kolorado_kedvencek.ics";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }
  function getTimeLabels() {
    var labels = [];
    for (var h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
      var dh = h >= 24 ? h - 24 : h;
      labels.push({ hour: h, label: String(dh).padStart(2,"0") + ":00" });
    }
    return labels;
  }

  // ── SVG icons ──────────────────────────────────────────────
  var ICONS = {
    heart: function(fill, size) { fill=fill||"none"; size=size||16; return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="'+fill+'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'; },
    x: function(size) { size=size||16; return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'; },
    search: function(size) { size=size||16; return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'; },
    filter: function(size) { size=size||16; return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>'; },
    grid: function(size) { size=size||16; return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>'; },
    list: function(size) { size=size||16; return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>'; },
    share: function(size) { size=size||14; return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>'; },
    calendar: function(size) { size=size||14; return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'; },
    external: function(size) { size=size||13; return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="8" r="0.5" fill="currentColor"/><line x1="12" y1="11" x2="12" y2="16"/></svg>'; },
  };

  // ── CSS ────────────────────────────────────────────────────
  var CSS = [
    "@font-face { font-family:'SerialBlur'; src:url('"+SERIAL_BLUR_URL+"') format('truetype'); font-weight:normal; font-style:normal; font-display:swap; }",
    "@font-face { font-family:'Pacaembu'; src:url('"+PACAEMBU_URL+"') format('truetype'); font-weight:normal; font-style:normal; font-display:swap; }",
    "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}",
    ":host{display:block;width:100%;font-family:'Pacaembu',sans-serif;}",
    ".kt-root{background:#062423;min-height:100vh;color:#c8dedd;}",
    ".kt-header{position:sticky;top:0;z-index:40;background:rgba(6,35,34,0.97);border-bottom:1px solid rgba(26,107,102,0.2);backdrop-filter:blur(8px);padding:12px 16px 8px;}",
    ".kt-header-inner{position:relative;padding:0;}",
    "@keyframes kt-panel-drop{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}",
    ".kt-panel-float{position:absolute;top:calc(100% + 6px);left:-16px;right:-16px;z-index:50;background:rgba(14,47,46,0.99);border-radius:18px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 16px 48px rgba(0,0,0,0.6);overflow:hidden;animation:kt-panel-drop 0.18s ease;}",
    ".kt-panel-backdrop{position:fixed;inset:0;z-index:49;}",
    "@media(min-width:701px){.kt-panel-float{max-width:500px;}}",
    ".kt-days{display:flex;gap:6px;justify-content:center;}",
    ".kt-day-btn{flex:1;max-width:180px;padding:10px 24px;border-radius:9999px;border:none;cursor:pointer;font-family:'SerialBlur',sans-serif;font-size:15px;letter-spacing:0.05em;text-transform:uppercase;transition:all 0.2s;background:transparent;color:rgba(220,234,117,0.8);}",
    ".kt-day-btn.active{background:#dcea75;color:#062322;}",
    ".kt-day-btn .full{display:inline;}.kt-day-btn .short{display:none;}",
    "@media(max-width:600px){.kt-day-btn{font-size:13px;padding:8px 8px;}.kt-day-btn .full{display:none;}.kt-day-btn .short{display:inline;}}",
    ".kt-header-row{display:flex;align-items:center;gap:8px;padding:0;}",
    ".kt-header-left{display:flex;align-items:center;gap:8px;flex-shrink:0;}",
    ".kt-header-center{flex:1;display:flex;justify-content:center;}",
    ".kt-header-right{display:flex;align-items:center;gap:8px;flex-shrink:0;}",
    ".kt-toolbar{display:flex;align-items:center;gap:5px;}",
    "@media(min-width:701px){.kt-desktop-row{display:flex;}.kt-mobile-days-row{display:none!important;}.kt-mobile-toolbar{display:none!important;}}",
    "@media(max-width:700px){.kt-desktop-row{display:none!important;}.kt-mobile-days-row{display:block;margin-bottom:8px;}.kt-mobile-toolbar{display:flex;}.kt-view-toggle{display:none!important;}}",
    ".kt-list-mode .kt-stage-row{display:none!important;}",
    ".kt-fav-btn{display:flex;align-items:center;gap:5px;padding:5px 11px;border-radius:9999px;border:1px solid rgba(26,107,102,0.4);background:transparent;color:#7a9e9b;font-family:'Pacaembu',sans-serif;font-size:11px;cursor:pointer;position:relative;transition:all 0.2s;}",
    "@media(min-width:701px){.kt-fav-btn{gap:6px;padding:7px 14px;font-size:12px;}}",
    ".kt-fav-btn.active{border-color:rgba(232,107,90,0.4);color:#e86b5a;background:rgba(232,107,90,0.1);}",
    ".kt-badge{position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:#e86b5a;color:#fff;font-size:9px;font-weight:bold;display:flex;align-items:center;justify-content:center;}",
    ".kt-spacer{flex:1;}",
    ".kt-icon-btn{width:26px;height:26px;border-radius:9999px;border:1px solid rgba(26,107,102,0.4);background:transparent;color:#7a9e9b;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0;}",
    "@media(min-width:701px){.kt-icon-btn{width:30px;height:30px;}}",
    ".kt-icon-btn.active{border-color:rgba(220,234,117,0.4);color:#dcea75;background:rgba(220,234,117,0.06);}",
    ".kt-search-expanded{display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:9999px;border:1px solid rgba(26,107,102,0.4);background:rgba(26,107,102,0.15);}",
    ".kt-search-expanded input{background:transparent;border:none;outline:none;color:#c8dedd;font-family:'Pacaembu',sans-serif;font-size:16px;width:140px;}",
    ".kt-search-expanded.full-width{flex:1;margin:0 1px;}",
    "@media(max-width:700px){.kt-search-expanded.full-width{width:100%;margin:0;}.kt-search-expanded.full-width input{flex:1;width:auto;min-width:0;}}",
    ".kt-search-expanded input::placeholder{color:rgba(122,158,155,0.7);}",
    ".kt-view-toggle{display:flex;border:1px solid rgba(26,107,102,0.4);border-radius:9999px;overflow:hidden;flex-shrink:0;}",
    ".kt-view-btn{width:36px;height:36px;border:none;background:transparent;color:#7a9e9b;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;}",
    ".kt-view-btn.active{background:rgba(220,234,117,0.13);color:#dcea75;}",
    ".kt-panel{background:rgba(14,47,46,0.99);padding:8px 10px;}",
    ".kt-panel-list{max-height:260px;overflow-y:auto;margin-bottom:8px;}",
    ".kt-panel-float.kt-fav-panel-float{left:0;right:auto;min-width:280px;border:1.5px solid rgba(232,107,90,0.55);}",
    ".kt-panel-float.kt-search-panel-float{left:auto;right:0;min-width:280px;border:1.5px solid rgba(220,234,117,0.5);}",
    "@media(max-width:700px){.kt-panel-float.kt-fav-panel-float{left:1px;right:1px;min-width:0;}.kt-panel-float.kt-search-panel-float{left:1px;right:1px;min-width:0;}}",
    ".kt-panel-row{display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;transition:background 0.15s;}",
    ".kt-panel-row:hover{background:rgba(26,107,102,0.15);}",
    ".kt-panel-row .bar{width:3px;height:32px;flex-shrink:0;border-radius:2px;}",
    ".kt-panel-row .info{flex:1;min-width:0;}",
    ".kt-panel-row .name{font-family:'SerialBlur',sans-serif;font-size:13px;text-transform:uppercase;letter-spacing:0.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
    ".kt-fav-panel-float .kt-panel-row .bar{background:#e86b5a!important;}",
    ".kt-fav-panel-float .kt-panel-row .name{color:#e86b5a!important;}",
    ".kt-fav-panel-float .kt-panel-row .actions button{color:#e86b5a!important;}",
    ".kt-fav-panel-float .kt-panel-row .actions a{color:#e86b5a!important;}",
    ".kt-panel-row .meta{font-size:11px;color:rgba(122,158,155,0.8);margin-top:1px;}",
    ".kt-panel-row .actions{display:flex;align-items:center;gap:2px;flex-shrink:0;}",
    ".kt-panel-row .actions button{background:none;border:none;cursor:pointer;padding:6px;color:#7a9e9b;transition:color 0.15s;display:flex;align-items:center;}",
    ".kt-panel-row .actions button:hover{color:#dcea75;}",
    ".kt-panel-row .actions button.fav-on{color:#e86b5a;}",
    ".kt-panel-row .actions a{color:#7a9e9b;padding:6px;display:flex;align-items:center;text-decoration:none;transition:color 0.15s;}",
    ".kt-panel-row .actions a:hover{color:#dcea75;}",
    ".kt-panel-footer{display:flex;flex-direction:column;align-items:center;gap:8px;border-top:1px solid rgba(26,107,102,0.15);padding-top:8px;}",
    ".kt-panel-disclaimer{font-size:10px;color:rgba(122,158,155,0.55);line-height:1.5;text-align:center;}",
    ".kt-panel-actions{display:flex;gap:8px;justify-content:center;}",
    ".kt-action-btn{display:flex;align-items:center;gap:5px;padding:5px 14px;border:1px solid rgba(26,107,102,0.3);background:transparent;color:rgba(122,158,155,0.8);font-family:'Pacaembu',sans-serif;font-size:11px;cursor:pointer;border-radius:9999px;transition:all 0.15s;}",
    ".kt-action-btn:hover{border-color:rgba(220,234,117,0.4);color:#dcea75;}",
    ".kt-empty{text-align:center;padding:32px 16px;color:rgba(122,158,155,0.7);font-size:13px;}",
    ".kt-empty button{margin-top:10px;background:none;border:none;color:#dcea75;font-size:12px;text-decoration:underline;cursor:pointer;font-family:'Pacaembu',sans-serif;}",
    ".kt-filter-wrap{position:relative;}",
    ".kt-filter-panel-float{left:auto;right:0;min-width:260px;border:1.5px solid rgba(26,107,102,0.45);}",
    "@media(max-width:700px){.kt-filter-panel-float{left:1px;right:1px;min-width:0;}}",
    ".kt-filter-panel-inner{padding:12px 12px 14px;display:flex;flex-direction:column;gap:12px;}",
    ".kt-music-pill{display:flex;border-radius:9999px;overflow:hidden;border:1px solid rgba(26,107,102,0.4);background:rgba(6,35,34,0.6);flex-shrink:0;}",
    ".kt-music-pill-btn{flex:1;padding:6px 10px;border:none;background:transparent;color:rgba(122,158,155,0.7);font-family:'Pacaembu',sans-serif;font-size:10px;cursor:pointer;transition:all 0.18s;white-space:nowrap;text-align:center;}",
    ".kt-music-pill-btn.on{background:#dcea75;color:#062322;font-weight:700;}",
    ".kt-stage-chips{display:flex;flex-wrap:wrap;gap:6px;}",
    ".kt-stage-chip{padding:4px 10px;border-radius:9999px;border:1.5px solid;font-family:'Pacaembu',sans-serif;font-size:10px;cursor:pointer;transition:all 0.18s;background:transparent;}",
    ".kt-stage-chip.on{color:#062322;}",
    ".kt-stage-chip.off{background:transparent!important;color:rgba(122,158,155,0.6);}",
    ".kt-filter-sep{border:none;border-top:1px solid rgba(26,107,102,0.15);margin:2px 0;}",
    ".kt-day-label{font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:rgba(122,158,155,0.6);padding:4px 10px 2px;font-family:'Pacaembu',sans-serif;}",
    ".kt-list{padding:8px 8px 48px;}",
    ".kt-list-row{display:flex;align-items:center;gap:12px;padding:10px 12px;cursor:pointer;transition:background 0.15s;}",
    ".kt-list-row:hover{background:rgba(26,107,102,0.12);}",
    ".kt-list-row .bar{width:4px;height:44px;flex-shrink:0;}",
    ".kt-list-row .info{flex:1;min-width:0;}",
    ".kt-list-row .name{font-family:'SerialBlur',sans-serif;font-size:15px;text-transform:uppercase;letter-spacing:0.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
    ".kt-list-row .time{font-size:11px;color:rgba(122,158,155,0.8);margin-top:2px;}",
    ".kt-list-row .stage-label-inline{font-size:11px;}",
    ".kt-list-row .genre-label{font-size:10px;color:rgba(122,158,155,0.6);margin-top:2px;font-family:'Pacaembu',sans-serif;}",
    ".kt-list-row .fav-btn{background:none;border:none;cursor:pointer;padding:8px;color:#7a9e9b;transition:color 0.15s;flex-shrink:0;}",
    ".kt-list-row .fav-btn.on{color:#e86b5a;}",
    ".kt-grid-wrap{padding:0 8px 32px;}",
    ".kt-grid-scroll{overflow-x:auto;overflow-y:visible;border:1px solid rgba(26,107,102,0.15);}",
    ".kt-grid-inner{display:flex;}",
    ".kt-time-axis{position:sticky;left:0;z-index:20;background:#062423;border-right:1px solid rgba(26,107,102,0.15);flex-shrink:0;}",

    ".kt-time-axis-body{position:relative;}",
    ".kt-time-label{position:absolute;left:0;right:0;display:flex;align-items:flex-start;justify-content:flex-end;padding-right:4px;}",
    ".kt-time-label span{font-size:9px;color:rgba(122,158,155,0.6);transform:translateY(-50%);font-family:'Pacaembu',sans-serif;}",
    ".kt-stage-cols{display:flex;flex:1;position:relative;}",
    ".kt-stage-col{flex:1;min-width:140px;}",
    ".kt-stage-row{display:flex;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none;border-top:1px solid rgba(26,107,102,0.15);margin-top:8px;background:#0E2E2E;}",
    "@media(max-width:900px){.kt-stage-row{display:none!important;}}",
    ".kt-stage-row::-webkit-scrollbar{display:none;}",
    ".kt-stage-row-spacer{flex-shrink:0;background:#0E2E2E;border-right:1px solid rgba(26,107,102,0.15);}",
    ".kt-stage-row-cell{flex:1;min-width:140px;height:36px;display:flex;align-items:center;justify-content:center;padding:0 8px;border-right:1px solid rgba(26,107,102,0.08);background:#0E2E2E;}",
    ".kt-stage-row-cell:last-child{border-right:none;}",
    ".kt-stage-row-cell span{font-family:'SerialBlur',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;text-align:center;}",
    ".kt-stage-header{display:none;}",
    ".kt-time-axis-header{display:none;}",
    ".kt-stage-body{position:relative;}",
    ".kt-hour-line{position:absolute;left:0;right:0;border-top:1px solid rgba(26,107,102,0.07);}",
    ".kt-block{position:absolute;left:2px;right:2px;overflow:visible;cursor:pointer;border-radius:2px;transition:box-shadow 0.18s,outline 0.18s;}",
    ".kt-block-content{height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:5px 7px;position:relative;overflow:hidden;}",
    ".kt-block-content.row{flex-direction:row;align-items:flex-start;gap:6px;}",
    ".kt-block-name{font-family:'SerialBlur',sans-serif;font-size:13px;text-transform:uppercase;letter-spacing:0.03em;line-height:1.25;word-break:break-word;overflow-wrap:break-word;white-space:normal;}",
    ".kt-block-genre{font-size:10px;color:rgba(200,222,221,0.55);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'Pacaembu',sans-serif;margin-top:2px;}",
    ".kt-block-time{font-size:10px;white-space:nowrap;flex-shrink:0;font-family:'Pacaembu',sans-serif;margin-top:auto;}",
    ".kt-block:hover{box-shadow:0 0 0 1px currentColor,0 0 10px 1px currentColor;z-index:5;}",
    ".kt-block-fav-btn{position:absolute;top:4px;right:4px;width:24px;height:24px;border-radius:50%;border:1px solid rgba(255,255,255,0.25);background:rgba(6,35,34,0.55);color:inherit;cursor:pointer;display:none;align-items:center;justify-content:center;padding:0;transition:all 0.15s;flex-shrink:0;}",
    ".kt-block-fav-btn.on{background:#e86b5a;border-color:#e86b5a;color:#DCEA75;}",
    ".kt-block:hover .kt-block-fav-btn,.kt-block.tapped .kt-block-fav-btn{display:flex;}",
    ".kt-block-fav-btn:hover{background:rgba(232,107,90,0.8);}",
    ".kt-fav-pill{display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:9999px;border:none;cursor:pointer;font-family:'Pacaembu',sans-serif;font-size:11px;font-weight:600;transition:all 0.15s;}",
    ".kt-fav-pill.off{background:#fff;color:#062322;}",
    ".kt-fav-pill.on{background:#e86b5a;color:#fff;}",
    ".kt-now-line{position:absolute;left:0;right:0;z-index:30;pointer-events:none;}",
    ".kt-now-bar{position:relative;}",
    ".kt-now-bar::after{content:'';position:absolute;left:0;right:0;top:0;height:2px;background:#dcea75;}",
    ".kt-now-dot{position:absolute;left:-4px;top:-5px;width:10px;height:10px;border-radius:50%;background:#dcea75;box-shadow:0 0 8px #dcea75;}",
    ".kt-now-label{position:absolute;left:12px;top:-9px;font-size:9px;font-weight:bold;padding:1px 5px;background:#dcea75;color:#062322;font-family:'Pacaembu',sans-serif;}",
    ".kt-skeleton{background:#062423;min-height:100vh;}",
    ".kt-skel-header{padding:12px 16px 8px;background:rgba(6,35,34,0.96);}",
    ".kt-skel-row{display:flex;gap:6px;margin-bottom:8px;}",
    ".kt-skel-pill{height:36px;flex:1;border-radius:9999px;background:rgba(26,107,102,0.3);animation:kt-pulse 1.5s ease-in-out infinite;}",
    ".kt-skel-body{padding:12px 16px;}",
    ".kt-skel-item{display:flex;gap:10px;padding:10px 0;}",
    ".kt-skel-bar{width:4px;height:44px;background:rgba(26,107,102,0.3);animation:kt-pulse 1.5s ease-in-out infinite;}",
    ".kt-skel-lines{flex:1;}",
    ".kt-skel-line{height:12px;border-radius:4px;background:rgba(26,107,102,0.3);animation:kt-pulse 1.5s ease-in-out infinite;margin-bottom:6px;}",
    "@keyframes kt-pulse{0%,100%{opacity:0.5}50%{opacity:1}}",
    "svg{display:inline-block;vertical-align:middle;}"
  ].join("\n");

  // ── Web Component ──────────────────────────────────────────
  class KoloradoTimetable extends HTMLElement {
    constructor() {
      super();
      this._artists = MOCK_ARTISTS;
      this._stages = buildStages(MOCK_ARTISTS);
      this._activeDay = getDefaultDay("thu"); // Default: Thursday; during festival: today
      this._activeStages = new Set(this._stages.map(function(s){return s.id;}));
      this._favourites = readFavLocalStorage() || readFavCookie();
      this._viewMode = window.innerWidth < 768 ? "list" : "grid";
      this._showKedvencek = false;
      this._showSearch = false;
      this._showFilter = false;
      this._filterMusicTypes = new Set(["elo", "elektro", "nemzene"]);
      this._filterFavourites = false;
      this._searchQuery = "";
      this._tappedBlockId = null;
      this._parentUrl = null;
      this._loading = true;
      this._nowInterval = null;
      this._popupArtist = null;
      this._lastActiveDay = null; // tracks last day for which auto-scroll ran
    }

    connectedCallback() {
      var self = this;
      // Inject @font-face into document <head> — shadow DOM @font-face is not
      // reliably supported across browsers; fonts must live in the main document.
      if (!document.getElementById('kt-fonts')) {
        var fontStyle = document.createElement('style');
        fontStyle.id = 'kt-fonts';
        fontStyle.textContent =
          "@font-face{font-family:'SerialBlur';src:url('" + SERIAL_BLUR_URL + "') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}" +
          "@font-face{font-family:'Pacaembu';src:url('" + PACAEMBU_URL + "') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}";
        document.head.appendChild(fontStyle);
      }
      this._shadow = this.attachShadow({ mode: "open" });
      this._render();
      // postMessage bridge for parent URL
      try { window.parent.postMessage({ type: "kolorado-timetable-request-url" }, "*"); } catch(e) {}
      window.addEventListener("message", function(e) {
        if (e.data && e.data.type === "kolorado-timetable-parent-url" && typeof e.data.url === "string") {
          self._parentUrl = e.data.url;
        }
      });
      // Load shared favourites from URL hash
      var hash = window.location.hash.slice(1);
      if (hash.startsWith("fav:")) {
        var ids = decodeFavs(hash.slice(4));
        var allIds = self._artists.map(function(a){return a.id;});
        var valid = new Set(ids.filter(function(id){return allIds.indexOf(id) !== -1;}));
        if (valid.size) {
          valid.forEach(function(id){self._favourites.add(id);});
          writeFavCookie(self._favourites);
          history.replaceState(null, "", window.location.pathname + window.location.search);
          self._showToast(valid.size + " kedvenc betöltve a megosztott listából!");
        }
      }
      this._nowInterval = setInterval(function(){self._updateNowLine();}, 60000);
      window.addEventListener("resize", function() {
        var mobile = window.innerWidth < 768;
        if (mobile && self._viewMode === "grid") { self._viewMode = "list"; self._render(); }
      });
      // Cross-tab fav sync via localStorage storage event
      window.addEventListener("storage", function(e) {
        if (e.key === FAV_LS_KEY && e.newValue) {
          try {
            var ids = JSON.parse(e.newValue);
            if (Array.isArray(ids)) {
              self._favourites = new Set(ids);
              self._render();
            }
          } catch(err) {}
        }
      });
      // Same-tab BroadcastChannel sync (for when both elements are on the same page)
      if (_favBC) {
        _favBC.onmessage = function(e) {
          if (e.data && e.data.type === "kolorado-fav-update" && Array.isArray(e.data.ids)) {
            self._favourites = new Set(e.data.ids);
            self._render();
          }
        };
      }
      setTimeout(function(){ self._loading = false; self._render(); }, 400);
    };

    disconnectedCallback() {
      if (this._nowInterval) clearInterval(this._nowInterval);
    };

    static get observedAttributes() { return ["lineup-data"]; }
    attributeChangedCallback(name, _old, val) {
      if (name === "lineup-data" && val) {
        try {
          var raw = JSON.parse(val);
          // Expand each CMS item into up to 3 timetable blocks (main + second + third slot)
          var expanded = [];
          raw.forEach(function(item) {
            var rawStage = item.stage || item.sznpad || "Nagyszínpad";
            var stageName = Array.isArray(rawStage) ? rawStage[0] : rawStage;
            var baseId   = item._id || item.id || String(Math.random());
            var baseName = item.name || item.title || i18n.unknown;
            var shared = {
              name:            baseName,
              stage:           stageName,
              genre:           item.genre || item.genre1 || "",
              url:             item.website || item.url || null,
              photo:           item.photo || "",
              longDescription: item.longDescription || item.bio || "",
              soundcloudLink:  item.soundcloudLink || item.soundcloud || "",
              youtubeLink:     item.youtubeLink || item.youtube || "",
              timetableonly:   item.timetableonly || false,
            };
            // Slot definitions: [start, end, idSuffix]
            var slots = [
              [item.mainStart,   item.mainEnd,    ""],
              [item.secondStart, item.secondEnd,  "-s2"],
              [item.thirdStart,  item.thirdEnd,   "-s3"],
            ];
            slots.forEach(function(slot) {
              var s = new Date(slot[0]), e = new Date(slot[1]);
              if (!slot[0] || isNaN(s) || !slot[1] || isNaN(e)) return;
              expanded.push(Object.assign({}, shared, {
                id:        baseId + slot[2],
                startTime: s,
                endTime:   e,
              }));
            });
          });
          this._artists = expanded;
          // Rebuild stages dynamically from CMS data
          this._stages = buildStages(this._artists);
          this._activeStages = new Set(this._stages.map(function(s){return s.id;}));
          this._loading = false;
          this._render();
        } catch(e) { console.error("kolorado-timetable: invalid lineup-data", e); }
      }
    };

    _openArtistPopup(artist) {
      this._popupArtist = artist;
      this._render();
    };
    _closeArtistPopup() {
      if (this._kapKeyCleanup) { this._kapKeyCleanup(); this._kapKeyCleanup = null; }
      this._popupArtist = null;
      this._render();
    };
    _render() {
      var root = this._shadow;
      if (!root) return;
      root.innerHTML = "";
      var style = document.createElement("style");
      style.textContent = CSS;
      // Inject shared popup CSS if available
      if (typeof KoloradoArtistPopup !== "undefined") {
        style.textContent += KoloradoArtistPopup.CSS;
      }
      root.appendChild(style);
      if (this._loading) { root.appendChild(this._renderSkeleton()); return; }
      var wrap = document.createElement("div");
      wrap.className = "kt-root" + (this._viewMode === "list" ? " kt-list-mode" : "");
      wrap.appendChild(this._renderHeader());
      if (this._viewMode === "list") wrap.appendChild(this._renderListView());
      else wrap.appendChild(this._renderGridView());
      root.appendChild(wrap);
      // Sync stage-row scroll with grid-scroll, and match spacer width to time axis
      var self = this;
      requestAnimationFrame(function() {
        var stageRow  = root.querySelector("#kt-stage-row");
        var gridScroll = root.querySelector(".kt-grid-scroll");
        var spacer    = root.querySelector("#kt-stage-row-spacer");
        var timeAxis  = root.querySelector(".kt-time-axis");
        if (spacer && timeAxis) {
          spacer.style.width = timeAxis.getBoundingClientRect().width + "px";
        }
        if (stageRow && gridScroll) {
          // Sync grid → stage-row
          gridScroll.addEventListener("scroll", function() {
            stageRow.scrollLeft = gridScroll.scrollLeft;
          });
          // Sync stage-row → grid (in case user tries to drag it)
          stageRow.addEventListener("scroll", function() {
            gridScroll.scrollLeft = stageRow.scrollLeft;
          });
        }
      });
      // Render artist popup if open
      if (this._popupArtist && typeof KoloradoArtistPopup !== "undefined") {
        var self = this;
        var isFav = this._favourites.has(this._popupArtist.id);
        // Build same-day nav list: artists on the active day, sorted by startTime
        var dayNavList = this._artists.filter(function(a) {
          return getFestivalDayId(a.startTime) === self._activeDay;
        }).sort(function(a, b) {
          return (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0);
        });
        var navIdx = dayNavList.findIndex(function(a) { return a.id === self._popupArtist.id; });
        var hasPrev = navIdx > 0;
        var hasNext = navIdx >= 0 && navIdx < dayNavList.length - 1;
        var popupDiv = document.createElement("div");
        popupDiv.innerHTML = KoloradoArtistPopup.render(this._popupArtist, isFav, hasPrev, hasNext);
        root.appendChild(popupDiv.firstChild);
        // Remove any stale keyboard handler before wiring new one
        if (this._kapKeyCleanup) { this._kapKeyCleanup(); this._kapKeyCleanup = null; }
        var _kapCbs = {
          onClose: function() { self._closeArtistPopup(); },
          onToggleFav: function(id) {
            self._toggleFav(id);
            self._popupArtist = self._artists.find(function(a){ return a.id === id; }) || self._popupArtist;
            self._render();
          },
          onPrev: function() {
            if (navIdx > 0) { self._popupArtist = dayNavList[navIdx - 1]; self._render(); }
          },
          onNext: function() {
            if (navIdx >= 0 && navIdx < dayNavList.length - 1) { self._popupArtist = dayNavList[navIdx + 1]; self._render(); }
          },
        };
        KoloradoArtistPopup.wire(root, this._popupArtist, isFav, _kapCbs);
        if (_kapCbs._removeKeyHandler) this._kapKeyCleanup = _kapCbs._removeKeyHandler;
      }
      // Close filter on outside click
      if (this._showFilter) {
        var self = this;
        setTimeout(function() {
          var handler = function(e) {
            var fw = root.querySelector(".kt-filter-wrap");
            if (fw && !fw.contains(e.target)) { self._showFilter = false; self._render(); root.removeEventListener("click", handler); }
          };
          root.addEventListener("click", handler);
        }, 0);
      }
      // Auto-scroll grid — only when the active day changes (not on every re-render)
      if (this._viewMode === "grid" && this._activeDay !== this._lastActiveDay) {
        this._lastActiveDay = this._activeDay;
        var self = this;
        setTimeout(function() {
          var gridWrap = root.querySelector(".kt-grid-wrap");
          if (!gridWrap) return;
          var dayArtists = self._artists.filter(function(a){ return getFestivalDayId(a.startTime) === self._activeDay; });
          if (!dayArtists.length) return;
          var first = dayArtists.reduce(function(a,b){ return a.startTime < b.startTime ? a : b; });
          var hh = window.innerWidth < 768 ? MOBILE_HOUR_HEIGHT_PX : HOUR_HEIGHT_PX;
          var offsetInGrid = Math.max(0, (toFestivalHour(first.startTime) - DAY_START_HOUR) * hh - 24);
          var gridTop = gridWrap.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: gridTop + offsetInGrid, behavior: "smooth" });
        }, 50);
      }
    };

    _buildFilterPanel() {
      var self = this;
      var panel = document.createElement("div"); panel.classList.add("kt-panel-float","kt-filter-panel-float");
      var filterInner = document.createElement("div"); filterInner.className = "kt-filter-panel-inner";
      // 3-way music type pill
      var pill = document.createElement("div"); pill.className = "kt-music-pill";
      [["elo",i18n.musicElo],["elektro",i18n.musicElektro],["nemzene",i18n.musicNemzene]].forEach(function(pair){
        var key=pair[0], label=pair[1];
        var btn = document.createElement("button"); btn.className = "kt-music-pill-btn" + (self._filterMusicTypes.has(key)?" on":""); btn.textContent = label;
        btn.addEventListener("click", function(e){
          e.stopPropagation();
          if(self._filterMusicTypes.has(key)){ if(self._filterMusicTypes.size>1) self._filterMusicTypes.delete(key); }
          else self._filterMusicTypes.add(key);
          self._activeStages = new Set(self._stages.map(function(s){return s.id;}));
          self._render();
        });
        pill.appendChild(btn);
      });
      filterInner.appendChild(pill);
      // Stage chips — only stages with events on this day matching current music type filter
      var allMT = self._filterMusicTypes.size === 3;
      var stagesWithEvents = new Set();
      self._artists.forEach(function(a){
        if (getFestivalDayId(a.startTime) !== self._activeDay) return;
        if (!allMT && !self._filterMusicTypes.has(self._classifyGenre(a.genre))) return;
        stagesWithEvents.add(a.stage);
      });
      var visibleStageList = self._stages.filter(function(s){ return stagesWithEvents.has(s.name); });
      if (visibleStageList.length) {
        var chipsWrap = document.createElement("div"); chipsWrap.className = "kt-stage-chips";
        visibleStageList.forEach(function(stage){
          var isOn = self._activeStages.has(stage.id);
          var chip = document.createElement("button"); chip.className = "kt-stage-chip " + (isOn?"on":"off");
          chip.textContent = stage.name;
          chip.style.borderColor = stage.color;
          if (isOn) chip.style.background = stage.color;
          chip.addEventListener("click", function(e){
            e.stopPropagation();
            if(self._activeStages.has(stage.id)){ if(self._activeStages.size>1) self._activeStages.delete(stage.id); }
            else self._activeStages.add(stage.id);
            self._render();
          });
          chipsWrap.appendChild(chip);
        });
        filterInner.appendChild(chipsWrap);
      }
      panel.appendChild(filterInner);
      return panel;
    };

    _renderSkeleton() {
      var el = document.createElement("div");
      el.className = "kt-skeleton";
      el.innerHTML = '<div class="kt-skel-header"><div class="kt-skel-row"><div class="kt-skel-pill"></div><div class="kt-skel-pill"></div><div class="kt-skel-pill"></div><div class="kt-skel-pill"></div></div><div class="kt-skel-row"><div class="kt-skel-pill" style="max-width:80px"></div><div class="kt-skel-pill" style="max-width:80px"></div></div></div><div class="kt-skel-body"><div class="kt-skel-item"><div class="kt-skel-bar"></div><div class="kt-skel-lines"><div class="kt-skel-line" style="width:60%"></div><div class="kt-skel-line" style="width:35%"></div></div></div><div class="kt-skel-item"><div class="kt-skel-bar"></div><div class="kt-skel-lines"><div class="kt-skel-line" style="width:70%"></div><div class="kt-skel-line" style="width:40%"></div></div></div><div class="kt-skel-item"><div class="kt-skel-bar"></div><div class="kt-skel-lines"><div class="kt-skel-line" style="width:50%"></div><div class="kt-skel-line" style="width:30%"></div></div></div></div>';
      return el;
    };

    _renderHeader() {
      var self = this;
      var header = document.createElement("header");
      header.className = "kt-header";
      // Inner wrapper provides position:relative context for the floating Kedvencek panel
      var inner = document.createElement("div");
      inner.className = "kt-header-inner";

      // ── Desktop single-row: [Kedvencek] [days] [search|filter|view] ──
      // ── Mobile stacked: days row + toolbar row (CSS handles switching) ──

      // Build day tabs (shared between both layouts)
      var daysRow = document.createElement("div");
      daysRow.className = "kt-days";
      FESTIVAL_DAYS.forEach(function(day) {
        var btn = document.createElement("button");
        btn.className = "kt-day-btn" + (self._activeDay === day.id ? " active" : "");
        btn.innerHTML = '<span class="full">'+day.label+'</span><span class="short">'+day.shortLabel+'</span>';
        btn.addEventListener("click", function(){ self._activeDay = day.id; self._render(); });
        daysRow.appendChild(btn);
      });

      // Kedvencek button (shared)
      var favCount = this._favourites.size;
      var favBtn = document.createElement("button");
      favBtn.className = "kt-fav-btn" + (this._showKedvencek ? " active" : "");
      favBtn.innerHTML = (this._showKedvencek ? ICONS.x(13) : ICONS.heart("none",13)) + " " + i18n.favourites + (favCount > 0 ? '<span class="kt-badge">'+favCount+'</span>' : "");
      favBtn.addEventListener("click", function(){ self._showKedvencek = !self._showKedvencek; if(self._showKedvencek) self._showSearch=false; self._render(); });

      // Search widget (desktop) — icon button always in toolbar, popup floats below
      var searchWidget = document.createElement("button"); searchWidget.className = "kt-icon-btn" + (this._showSearch ? " active" : ""); searchWidget.innerHTML = ICONS.search(15); searchWidget.title = i18n.searchTitle;
      searchWidget.addEventListener("click", function(){ self._showSearch=!self._showSearch; self._showKedvencek=false; self._render(); });

      // Filter widget (shared)
      var hasFilters = this._filterFavourites || this._activeStages.size < this._stages.length || this._filterMusicTypes.size < 3;
      var fw = document.createElement("div"); fw.className = "kt-filter-wrap";
      var fb = document.createElement("button"); fb.className = "kt-icon-btn" + (hasFilters ? " active" : ""); fb.innerHTML = ICONS.filter(15); fb.title = i18n.filtersTitle;
      fb.addEventListener("click", function(e){ e.stopPropagation(); self._showFilter = !self._showFilter; self._render(); });
      fw.appendChild(fb);
      if (this._showFilter) { fw.appendChild(self._buildFilterPanel()); }

      // View toggle (shared)
      var vt = document.createElement("div"); vt.className = "kt-view-toggle";
      var gb = document.createElement("button"); gb.className = "kt-view-btn"+(this._viewMode==="grid"?" active":""); gb.innerHTML = ICONS.grid(14); gb.title = i18n.calendar;
      gb.addEventListener("click", function(){ self._viewMode="grid"; self._render(); });
      var lb = document.createElement("button"); lb.className = "kt-view-btn"+(this._viewMode==="list"?" active":""); lb.innerHTML = ICONS.list(14); lb.title = i18n.list;
      lb.addEventListener("click", function(){ self._viewMode="list"; self._render(); });
      vt.appendChild(gb); vt.appendChild(lb);

      // ── Desktop row (hidden on mobile via CSS) ──────────────────────
      var desktopRow = document.createElement("div");
      desktopRow.className = "kt-header-row kt-desktop-row";
      var leftCol = document.createElement("div"); leftCol.className = "kt-header-left";
      leftCol.appendChild(favBtn.cloneNode(true));
      leftCol.querySelector(".kt-fav-btn").addEventListener("click", function(){ self._showKedvencek = !self._showKedvencek; if(self._showKedvencek) self._showSearch=false; self._render(); });
      var centerCol = document.createElement("div"); centerCol.className = "kt-header-center";
      centerCol.appendChild(daysRow.cloneNode(true));
      centerCol.querySelectorAll(".kt-day-btn").forEach(function(btn, i){
        btn.addEventListener("click", function(){ self._activeDay = FESTIVAL_DAYS[i].id; self._render(); });
      });
      var rightCol = document.createElement("div"); rightCol.className = "kt-header-right";
      rightCol.appendChild(searchWidget);
      rightCol.appendChild(fw);
      rightCol.appendChild(vt);
      desktopRow.appendChild(leftCol);
      desktopRow.appendChild(centerCol);
      desktopRow.appendChild(rightCol);
      inner.appendChild(desktopRow);

      // ── Mobile rows (hidden on desktop via CSS) ─────────────────
      var mobileDaysRow = document.createElement("div");
      mobileDaysRow.className = "kt-mobile-days-row";
      mobileDaysRow.appendChild(daysRow);
      inner.appendChild(mobileDaysRow);

      var mobileToolbar = document.createElement("div");
      mobileToolbar.className = "kt-toolbar kt-mobile-toolbar";
      mobileToolbar.appendChild(favBtn);
      var spacer = document.createElement("div"); spacer.className = "kt-spacer";
      mobileToolbar.appendChild(spacer);
      // Clone search and filter for mobile toolbar
      var mobileSearchWidget;
      // Search icon button — always in toolbar (active state when search open)
      mobileSearchWidget = document.createElement("button"); mobileSearchWidget.className = "kt-icon-btn" + (this._showSearch ? " active" : ""); mobileSearchWidget.innerHTML = ICONS.search(13);
      mobileSearchWidget.addEventListener("click", function(){ self._showSearch=!self._showSearch; self._showKedvencek=false; self._render(); });
      mobileToolbar.appendChild(mobileSearchWidget);
      var mfw = document.createElement("div"); mfw.className = "kt-filter-wrap";
      var mfb = document.createElement("button"); mfb.className = "kt-icon-btn" + (hasFilters ? " active" : ""); mfb.innerHTML = ICONS.filter(13);
      mfb.addEventListener("click", function(e){ e.stopPropagation(); self._showFilter = !self._showFilter; self._render(); });
      mfw.appendChild(mfb);
      if (self._showFilter) { mfw.appendChild(self._buildFilterPanel()); }
      mobileToolbar.appendChild(mfw);
      // View toggle hidden on mobile — list-only on small screens
      inner.appendChild(mobileToolbar);
      // Stage names row — built from visible stages for the active day
      // Scroll is synced to .kt-grid-scroll after render
      var stageRow = document.createElement("div");
      stageRow.className = "kt-stage-row";
      stageRow.id = "kt-stage-row";
      // Time-axis spacer (matches the time axis width in the grid)
      var spacerCell = document.createElement("div");
      spacerCell.className = "kt-stage-row-spacer";
      spacerCell.id = "kt-stage-row-spacer";
      stageRow.appendChild(spacerCell);
      // Stage cells (built from this._stages; filtered to visible ones after data loads)
      var visibleStagesForHeader = this._getVisibleStages(this._getVisibleArtists());
      visibleStagesForHeader.forEach(function(stage) {
        var cell = document.createElement("div");
        cell.className = "kt-stage-row-cell";
        var span = document.createElement("span");
        span.style.color = stage.color;
        span.textContent = stage.name;
        cell.appendChild(span);
        stageRow.appendChild(cell);
      });
      // Tap-outside backdrop — closes whichever panel is open
      if (self._showKedvencek || self._showSearch || self._showFilter) {
        var backdrop = document.createElement("div");
        backdrop.className = "kt-panel-backdrop";
        backdrop.addEventListener("click", function() {
          self._showKedvencek = false;
          self._showSearch = false;
          self._showFilter = false;
          self._searchQuery = "";
          self._render();
        });
        inner.appendChild(backdrop);
      }
      // Kedvencek floating panel — floats from the inner wrapper, above stage row + timetable
      if (self._showKedvencek) {
        var kedvPanel = self._renderKedvencekPanel();
        kedvPanel.classList.add("kt-panel-float","kt-fav-panel-float");
        inner.appendChild(kedvPanel);
      }
      // Search floating popup — contains search bar at top + results below
      if (self._showSearch) {
        var searchPopup = document.createElement("div");
        searchPopup.classList.add("kt-panel-float","kt-search-panel-float");
        // Search bar row inside popup
        var searchBarRow = document.createElement("div");
        searchBarRow.style.cssText = "display:flex;align-items:center;gap:8px;padding:10px 14px 8px;border-bottom:1px solid rgba(26,107,102,0.15);";
        var searchIcon = document.createElement("span"); searchIcon.innerHTML = ICONS.search(13); searchIcon.style.cssText = "color:#7a9e9b;flex-shrink:0;display:flex;";
        var sinp = document.createElement("input"); sinp.placeholder = i18n.search; sinp.value = self._searchQuery;
        sinp.setAttribute("autocomplete","off"); sinp.setAttribute("autocorrect","off"); sinp.setAttribute("autocapitalize","off");
        sinp.style.cssText = "flex:1;background:transparent;border:none;outline:none;color:#c8dedd;font-family:'Pacaembu',sans-serif;font-size:16px;min-width:0;";
        sinp.addEventListener("input", function(e){
          self._searchQuery = e.target.value;
          // Patch only the results area inside the popup
          var existingResults = searchPopup.querySelector(".kt-search-results-inner");
          if (existingResults) existingResults.remove();
          if (self._searchQuery) {
            var sp = self._renderSearchPanel();
            sp.classList.add("kt-search-results-inner");
            searchPopup.appendChild(sp);
          }
        });
        sinp.addEventListener("keydown", function(e){ if(e.key==="Escape"){ self._showSearch=false; self._searchQuery=""; self._render(); }});
        var scloseX = document.createElement("button");
        scloseX.style.cssText = "background:none;border:none;cursor:pointer;color:#7a9e9b;padding:4px;display:flex;align-items:center;flex-shrink:0;";
        scloseX.innerHTML = ICONS.x(12);
        scloseX.addEventListener("click", function(){ self._showSearch=false; self._searchQuery=""; self._render(); });
        searchBarRow.appendChild(searchIcon);
        searchBarRow.appendChild(sinp);
        searchBarRow.appendChild(scloseX);
        searchPopup.appendChild(searchBarRow);
        // Results area
        if (self._searchQuery) {
          var sp2 = self._renderSearchPanel();
          sp2.classList.add("kt-search-results-inner");
          searchPopup.appendChild(sp2);
        }
        inner.appendChild(searchPopup);
        // Auto-focus the input — double rAF needed on mobile (iOS/Android) to trigger keyboard
        requestAnimationFrame(function(){
          requestAnimationFrame(function(){
            var inp = searchPopup.querySelector("input");
            if(inp){ inp.focus(); inp.click(); }
          });
        });
      }
      header.appendChild(inner);
      header.appendChild(stageRow);
      return header;
    };

    _renderKedvencekPanel() {
      var self = this;
      var panel = document.createElement("div"); panel.className = "kt-panel";
      var favArtists = this._artists.filter(function(a){ return !a.timetableonly && self._favourites.has(a.id); }).sort(function(a,b){ return a.startTime-b.startTime; });
      if (!favArtists.length) {
        panel.innerHTML = '<div class="kt-empty">'+i18n.noFavourites+'</div>';
      } else {
        var list = document.createElement("div"); list.className = "kt-panel-list";
        var byDay = {};
        FESTIVAL_DAYS.forEach(function(day){
          var da = favArtists.filter(function(a){ return getFestivalDayId(a.startTime)===day.id; });
          if(da.length) byDay[day.id] = { label: day.label, artists: da };
        });
        FESTIVAL_DAYS.forEach(function(day){
          if(!byDay[day.id]) return;
          var dl = document.createElement("div"); dl.className = "kt-day-label"; dl.textContent = byDay[day.id].label;
          list.appendChild(dl);
          byDay[day.id].artists.forEach(function(artist){
            var stage = self._stages.find(function(s){return s.name===artist.stage;});
            var color = stage ? stage.color : "#dcea75";
            var row = document.createElement("div"); row.className = "kt-panel-row";
            row.innerHTML = '<div class="bar" style="background:'+color+'"></div><div class="info"><div class="name" style="color:'+color+'">'+artist.name+'</div><div class="meta">'+formatTime(artist.startTime)+'–'+formatTime(artist.endTime)+' · '+artist.stage+'</div></div><div class="actions"><button class="kt-popup-btn" data-popup-id="'+artist.id+'" title="Előadó részletei" style="color:'+color+'">'+ICONS.external(13)+'</button><button class="fav-on" data-id="'+artist.id+'" style="color:#e86b5a">'+ICONS.heart("#e86b5a",13)+'</button></div>';
            row.querySelector("button.fav-on").addEventListener("click", function(e){ e.stopPropagation(); self._toggleFav(artist.id); });
            row.querySelector(".kt-popup-btn").addEventListener("click", function(e){ e.stopPropagation(); self._openArtistPopup(artist); });
            row.querySelector(".info").addEventListener("click", function(){ self._jumpToArtist(artist); self._showKedvencek=false; self._render(); });
            list.appendChild(row);
          });
        });
        panel.appendChild(list);
      }
      var footer = document.createElement("div"); footer.className = "kt-panel-footer";
      var disc = document.createElement("p"); disc.className = "kt-panel-disclaimer";
      disc.textContent = i18n.favDisclaimer;
      footer.appendChild(disc);
      if (favArtists.length) {
        var actions = document.createElement("div"); actions.className = "kt-panel-actions";
        var isIosChrome = /CriOS/.test(navigator.userAgent);
        var calBtn = document.createElement("button"); calBtn.className = "kt-action-btn" + (isIosChrome ? " disabled" : "");
        calBtn.innerHTML = ICONS.calendar(12) + " " + i18n.addToCalendar;
        if (isIosChrome) {
          calBtn.style.cssText = "opacity:0.35;cursor:not-allowed;pointer-events:auto;";
          calBtn.addEventListener("click", function(e){ e.preventDefault(); self._showToast(i18n.iosCalError); });
        } else {
          calBtn.addEventListener("click", function(){ downloadAllICS(favArtists); });
        }
        var shareBtn = document.createElement("button"); shareBtn.className = "kt-action-btn";
        shareBtn.innerHTML = ICONS.share(12) + " " + i18n.share;
        shareBtn.addEventListener("click", function(){ self._shareFavourites(); });
        actions.appendChild(calBtn); actions.appendChild(shareBtn);
        footer.appendChild(actions);
      }
      panel.appendChild(footer);
      return panel;
    };

    _renderSearchPanel() {
      var self = this;
      var panel = document.createElement("div"); panel.className = "kt-panel";
      var q = this._searchQuery.toLowerCase();
      var results = this._artists.filter(function(a){
        return a.name.toLowerCase().indexOf(q)!==-1 || (a.genre && a.genre.toLowerCase().indexOf(q)!==-1) || a.stage.toLowerCase().indexOf(q)!==-1;
      }).slice(0,20);
      if (!results.length) { panel.innerHTML = '<div class="kt-empty">'+i18n.noResults+this._searchQuery+i18n.noResultsClose+'</div>'; return panel; }
      var list = document.createElement("div"); list.className = "kt-panel-list";
      results.forEach(function(artist){
        var stage = self._stages.find(function(s){return s.name===artist.stage;});
        var color = stage ? stage.color : "#dcea75";
        var isFav = self._favourites.has(artist.id);
        var dayId = getFestivalDayId(artist.startTime);
        var dayObj = dayId ? FESTIVAL_DAYS.find(function(d){ return d.id === dayId; }) : null;
        var dayShort = dayObj ? dayObj.shortLabel : "";
        var metaStr = [dayShort, formatTime(artist.startTime)+'–'+formatTime(artist.endTime), artist.stage].filter(Boolean).join(' · ');
        var row = document.createElement("div"); row.className = "kt-panel-row";        row.innerHTML = '<div class="bar" style="background:'+color+'"></div><div class="info"><div class="name" style="color:'+color+'">'+artist.name+'</div><div class="meta">'+metaStr+'</div></div><div class="actions"><button class="'+(isFav?"fav-on":"")+' " data-id="'+artist.id+'" style="color:'+(isFav?"#e86b5a":"#7a9e9b")+'">'+ICONS.heart(isFav?"#e86b5a":"none",13)+'</button><button class="kt-popup-btn" data-popup-id="'+artist.id+'" title="Előadó részletei" style="color:#7a9e9b">'+ICONS.external(13)+'</button></div>';
        row.querySelector("button[data-id]").addEventListener("click", function(e){ e.stopPropagation(); self._toggleFav(artist.id); });
        row.querySelector(".kt-popup-btn").addEventListener("click", function(e){ e.stopPropagation(); self._openArtistPopup(artist); });
        row.querySelector(".info").addEventListener("click", function(){ self._jumpToArtist(artist); self._showSearch=false; self._searchQuery=""; self._render(); });
        list.appendChild(row);
      });
      panel.appendChild(list);
      return panel;
    };

    _renderListView() {
      var self = this;
      var wrap = document.createElement("div"); wrap.className = "kt-list";
      var visible = this._getVisibleArtists().sort(function(a,b){return a.startTime-b.startTime;});
      if (!visible.length) {
        var empty = document.createElement("div"); empty.className = "kt-empty";
        empty.innerHTML = (this._filterFavourites?i18n.noFavProgram:i18n.noProgram)+'<br><button>'+i18n.showAll+'</button>';
        empty.querySelector("button").addEventListener("click", function(){ self._activeStages=new Set(self._stages.map(function(s){return s.id;})); self._filterFavourites=false; self._render(); });
        wrap.appendChild(empty); return wrap;
      }
      visible.forEach(function(artist){
        var stage = self._stages.find(function(s){return s.name===artist.stage;});
        var color = stage ? stage.color : "#dcea75";
        var isFav = self._favourites.has(artist.id);
        var isTO = !!artist.timetableonly;
         var row = document.createElement("div"); row.className = "kt-list-row";
        row.innerHTML = '<div class="bar" style="background:'+color+'"></div><div class="info"><div class="name" style="color:'+color+'">'+artist.name+'</div><div class="time">'+formatTime(artist.startTime)+'\u2013'+formatTime(artist.endTime)+', <span class="stage-label-inline" style="color:'+color+'99">'+artist.stage+'</span></div>'+(artist.genre ? '<div class="genre-label">'+artist.genre+'</div>' : '')+'</div>'+(isTO ? '' : '<button class="fav-btn'+(isFav?' on':'')+' " data-id="'+artist.id+'">'+ICONS.heart(isFav?'#e86b5a':'none',18)+'</button>');
        if (!isTO) row.querySelector(".fav-btn").addEventListener("click", function(e){ e.stopPropagation(); self._toggleFav(artist.id); });
        if (!isTO) row.addEventListener("click", function(){ self._openArtistPopup(artist); });
        wrap.appendChild(row);
      });
      return wrap;
    };

    _renderGridView() {
      var self = this;
      var isMobile = window.innerWidth < 768;
      var hh = isMobile ? MOBILE_HOUR_HEIGHT_PX : HOUR_HEIGHT_PX;
      var totalH = (DAY_END_HOUR - DAY_START_HOUR) * hh;
      var timeLabels = getTimeLabels();
      var visibleArtists = this._getVisibleArtists();
      var visibleStages = this._getVisibleStages(visibleArtists);
      var wrap = document.createElement("div"); wrap.className = "kt-grid-wrap";
      if (!visibleArtists.length) {
        var empty = document.createElement("div"); empty.className = "kt-empty";
        empty.innerHTML = (this._filterFavourites?i18n.noFavProgram:i18n.noProgram)+'<br><button>'+i18n.showAll+'</button>';
        empty.querySelector("button").addEventListener("click", function(){ self._activeStages=new Set(self._stages.map(function(s){return s.id;})); self._filterFavourites=false; self._render(); });
        wrap.appendChild(empty); return wrap;
      }
      var scroll = document.createElement("div"); scroll.className = "kt-grid-scroll";
      scroll.addEventListener("click", function(){ if(self._tappedBlockId){ self._tappedBlockId=null; self._render(); }});
      var inner = document.createElement("div"); inner.className = "kt-grid-inner";
      inner.style.minWidth = isMobile ? (visibleStages.length*140+48)+"px" : "auto";
      // Time axis
      var ta = document.createElement("div"); ta.className = "kt-time-axis"; ta.style.width = isMobile?"36px":"48px";
      var tah = document.createElement("div"); tah.className = "kt-time-axis-header"; ta.appendChild(tah);
      var tab = document.createElement("div"); tab.className = "kt-time-axis-body"; tab.style.height = totalH+"px";
      timeLabels.forEach(function(t){
        var lbl = document.createElement("div"); lbl.className = "kt-time-label"; lbl.style.top = ((t.hour-DAY_START_HOUR)*hh)+"px";
        lbl.innerHTML = "<span>"+t.label+"</span>"; tab.appendChild(lbl);
      });
      ta.appendChild(tab); inner.appendChild(ta);
      // Stage cols
      var sc = document.createElement("div"); sc.className = "kt-stage-cols";
      var nl = this._createNowLine(hh); if(nl) sc.appendChild(nl);
      visibleStages.forEach(function(stage, idx){
        var artists = visibleArtists.filter(function(a){return a.stage===stage.name;});
        var col = document.createElement("div"); col.className = "kt-stage-col";
        col.style.minWidth = isMobile?"140px":"160px";
        if(idx < visibleStages.length-1) col.style.borderRight = "1px solid rgba(26,107,102,0.08)";
        var ch = document.createElement("div"); ch.className = "kt-stage-header";
        ch.innerHTML = '<span style="color:'+stage.color+'">'+stage.name+'</span>'; col.appendChild(ch);
        var cb = document.createElement("div"); cb.className = "kt-stage-body"; cb.style.height = totalH+"px";
        timeLabels.forEach(function(t){ var hl=document.createElement("div"); hl.className="kt-hour-line"; hl.style.top=((t.hour-DAY_START_HOUR)*hh)+"px"; cb.appendChild(hl); });
        artists.forEach(function(artist){ cb.appendChild(self._createArtistBlock(artist, stage, hh)); });
        col.appendChild(cb); sc.appendChild(col);
      });
      inner.appendChild(sc); scroll.appendChild(inner); wrap.appendChild(scroll);
      return wrap;
    };

    _createArtistBlock(artist, stage, hh) {
      var self = this;
      var startH = toFestivalHour(artist.startTime);
      var endH   = toFestivalHour(artist.endTime);
      var durationH = endH - startH;
      var top    = (startH - DAY_START_HOUR) * hh;
      var height = Math.max(durationH * hh - 2, 24);
      // 45 min threshold (in hours = 0.75). Below that: name only.
      var isShort = durationH < 0.75;
      var isFav   = this._favourites.has(artist.id);
      var isTO    = !!artist.timetableonly;
      var isTapped = this._tappedBlockId === artist.id;

      var block = document.createElement("div");
      block.className = "kt-block" + (isTapped ? " tapped" : "");
      // Background: 26 hex (~15% opacity)
      block.style.cssText = (
        "top:"+top+"px;"+
        "height:"+height+"px;"+
        "background:"+stage.color+"26;"+
        "color:"+stage.color+";"+
        "outline:"+(isFav?"2px solid #e86b5a":"none")+";"
      );
      block.setAttribute("data-id", artist.id);

      // Content — always column layout; name wraps instead of truncating
      var content = document.createElement("div"); content.className = "kt-block-content";
      var nameEl  = document.createElement("div"); nameEl.className = "kt-block-name";
      nameEl.style.color = stage.color;
      nameEl.textContent = artist.name;
      content.appendChild(nameEl);
      if (!isShort && artist.genre) {
        var ge = document.createElement("div"); ge.className = "kt-block-genre";
        ge.textContent = artist.genre; content.appendChild(ge);
      }
      if (!isShort) {
        var te = document.createElement("div"); te.className = "kt-block-time";
        te.style.color = stage.color+"99";
        te.textContent = formatTime(artist.startTime)+"–"+formatTime(artist.endTime);
        content.appendChild(te);
      }
      block.appendChild(content);

      // Round fav button (shown on hover / tapped, top-right corner)
      if (!isTO) {
        var fb = document.createElement("button");
        fb.className = "kt-block-fav-btn" + (isFav ? " on" : "");
        fb.innerHTML = ICONS.heart(isFav ? "#DCEA75" : "none", 11);
        fb.addEventListener("click", function(e){ e.stopPropagation(); self._toggleFav(artist.id); });
        content.appendChild(fb);
      }

      // Click: open popup (or tap-to-reveal on touch)
      if (!isTO) block.addEventListener("click", function(e){
        e.stopPropagation();
        self._openArtistPopup(artist);
      });
      return block;
    };

    _getTodayFestivalDayId() {
      // Returns the festival day id for the current real-world date/time, or null if outside festival.
      var now = new Date();
      return getFestivalDayId(now);
    };

    _createNowLine(hh) {
      // Only show the now-line when the active tab is today's festival day
      var todayId = this._getTodayFestivalDayId();
      if (!todayId || todayId !== this._activeDay) return null;
      var now = new Date();
      var fh = toFestivalHour(now);
      if (fh < DAY_START_HOUR || fh >= DAY_END_HOUR) return null;
      var top = (fh - DAY_START_HOUR) * hh + 40;
      var line = document.createElement("div"); line.className = "kt-now-line"; line.style.top = top+"px";
      line.innerHTML = '<div class="kt-now-bar"><div class="kt-now-dot"></div><div class="kt-now-label">'+i18n.nowLabel+'</div></div>';
      return line;
    };

    _updateNowLine() {
      var root = this._shadow;
      if (!root) return;
      var isMobile = window.innerWidth < 768;
      var hh = isMobile ? MOBILE_HOUR_HEIGHT_PX : HOUR_HEIGHT_PX;
      var old = root.querySelector(".kt-now-line"); if(old) old.remove();
      var sc = root.querySelector(".kt-stage-cols");
      if (sc) { var nl = this._createNowLine(hh); if(nl) sc.insertBefore(nl, sc.firstChild); }
    };

    _classifyGenre(genre) {
      if (!genre) return "elo"; // default: live
      var g = genre.toLowerCase();
      // Nemzene: world, folk, ska, reggae, afro, latin, balkán, cigány, klezmer, jazz, blues, country, soul, funk, gospel, r&b, rnb
      if (/folk|world|ska|reggae|afro|latin|balk|cig|klezmer|jazz|blues|country|soul|funk|gospel|r&b|rnb|dzsessz|népi|nép/.test(g)) return "nemzene";
      // Elektronikus: electronic, techno, house, trance, drum, dnb, bass, ambient, dub, edm, electro, synth, dance, rave, minimal, psytrance, hardstyle, gabber, industrial, noise, glitch, idm
      if (/electron|techno|house|trance|drum|dnb|bass|ambient|dub|edm|electro|synth|dance|rave|minimal|psytrance|hardstyle|gabber|industrial|noise|glitch|idm|tánczene|dj set|dj-set/.test(g)) return "elektro";
      // Default: live (rock, pop, indie, rap, hip-hop, punk, metal, alternative, experimental, etc.)
      return "elo";
    };

    _getVisibleArtists() {
      var self = this;
      var allMusicTypes = self._filterMusicTypes.size === 3; // all on = no filter
      return this._artists.filter(function(a){
        if (getFestivalDayId(a.startTime) !== self._activeDay) return false;
        var stage = self._stages.find(function(s){return s.name===a.stage;});
        if (!stage || !self._activeStages.has(stage.id)) return false;
        if (self._filterFavourites && !self._favourites.has(a.id)) return false;
        if (!allMusicTypes && !self._filterMusicTypes.has(self._classifyGenre(a.genre))) return false;
        return true;
      });
    };

    _getVisibleStages(visibleArtists) {
      var self = this;
      var allActive = this._stages.filter(function(s){return self._activeStages.has(s.id);});
      if (!this._filterFavourites) return allActive;
      var stagesWithArtists = new Set(visibleArtists.map(function(a){return a.stage;}));
      return allActive.filter(function(s){return stagesWithArtists.has(s.name);});
    };

    _toggleFav(id) {
      // Determine base ID (strip -s2 / -s3 slot suffixes)
      var baseId = id.replace(/-s[23]$/, "");
      // Collect all slot IDs for this artist (base + any -s2/-s3 variants)
      var allSlotIds = this._artists
        .filter(function(a){ return a.id === baseId || a.id === baseId+"-s2" || a.id === baseId+"-s3"; })
        .map(function(a){ return a.id; });
      if (!allSlotIds.length) allSlotIds = [id]; // fallback: just the clicked id
      // Toggle: if base id is currently faved, remove all; otherwise add all
      var adding = !this._favourites.has(baseId) && !this._favourites.has(id);
      if (adding) {
        allSlotIds.forEach(function(sid){ this._favourites.add(sid); }, this);
        // Also add the bare base ID so lineup-v2 (which uses bare IDs) sees it
        this._favourites.add(baseId);
        showFirstFavToast();
      } else {
        allSlotIds.forEach(function(sid){ this._favourites.delete(sid); }, this);
        this._favourites.delete(baseId);
      }
      writeFavCookie(this._favourites);
      writeFavLocalStorage(this._favourites);
      this._render();
    };

    _jumpToArtist(artist) {
      var self = this;
      var dayId = getFestivalDayId(artist.startTime);
      if (dayId) this._activeDay = dayId;
      // On mobile stay in list mode; on desktop switch to grid
      if (window.innerWidth >= 701) this._viewMode = "grid";
      this._render();
      setTimeout(function(){
        var block = self._shadow.querySelector('[data-id="'+artist.id+'"]');
        if (block) {
          var rect = block.getBoundingClientRect();
          // Offset 160px to clear sticky header (day tabs + toolbar + stage row)
          window.scrollTo({ top: rect.top + window.scrollY - 160, behavior: "smooth" });
          // Highlight for 5s then fade out over 0.6s
          block.style.transition = "outline 0s";
          block.style.outline = "2px solid #dcea75";
          block.style.boxShadow = "0 0 0 3px #dcea7588";
          setTimeout(function(){
            block.style.transition = "outline 0.6s ease, box-shadow 0.6s ease";
            block.style.outline = "";
            block.style.boxShadow = "";
          }, 5000);
        }
      }, 80);
    };

    _shareFavourites() {
      var encoded = encodeFavs(this._favourites);
      if (!encoded) return;
      var base = this._parentUrl ? this._parentUrl.split("#")[0] : (window.location.origin + window.location.pathname);
      var url = base + "#fav:" + encoded;
      var self = this;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function(){ self._showToast(i18n.linkCopied); }).catch(function(){ window.prompt(i18n.copyLink, url); });
      } else { window.prompt(i18n.copyLink, url); }
    };

    _showToast(msg) {
      var toast = document.createElement("div");
      toast.style.cssText = "position:fixed;bottom:16px;left:12px;right:12px;background:#dcea75;color:#062322;padding:10px 14px;font-family:'Pacaembu',sans-serif;font-size:13px;line-height:1.5;z-index:9999;pointer-events:auto;border-radius:14px;display:flex;align-items:flex-start;gap:10px;box-shadow:0 4px 24px rgba(0,0,0,0.35);";
      var msgSpan = document.createElement("span"); msgSpan.style.cssText = "flex:1"; msgSpan.textContent = msg;
      var closeBtn = document.createElement("button"); closeBtn.style.cssText = "background:none;border:none;cursor:pointer;color:rgba(6,35,34,0.5);padding:0;flex-shrink:0;display:flex;align-items:center;margin-top:1px";
      closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      closeBtn.addEventListener("click", function(){ toast.remove(); });
      toast.appendChild(msgSpan); toast.appendChild(closeBtn);
      document.body.appendChild(toast);
      var tid = setTimeout(function(){ if(toast.parentNode) toast.remove(); }, 5000);
      closeBtn.addEventListener("click", function(){ clearTimeout(tid); });
    };

  }

  if (!customElements.get("kolorado-timetable")) {
    customElements.define("kolorado-timetable", KoloradoTimetable);
  }
})();
