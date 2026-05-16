// ============================================================
// wix-custom-element/kolorado-artist-popup.js
// Kolorádó Festival — Shared Artist Popup Module v1
//
// This file is a standalone IIFE that registers itself as
// window.KoloradoArtistPopup so both kolorado-timetable.js
// and kolorado-lineup.js can use the same popup without
// duplicating code.
//
// Usage (inside a Shadow DOM web component):
//
//   // 1. Inject CSS into your shadow root once:
//   styleEl.textContent += KoloradoArtistPopup.CSS;
//
//   // 2. Render popup HTML string:
//   var html = KoloradoArtistPopup.render(artist, isFav);
//   // Append it to your shadow root HTML.
//
//   // 3. Wire events after inserting HTML into shadow:
//   KoloradoArtistPopup.wire(shadow, artist, isFav, {
//     onClose:     function() { ... },
//     onToggleFav: function(id) { ... },
//   });
//
// Artist object shape:
//   { id, name, photo, stage, startTime, endTime,
//     genre, longDescription, soundcloudLink, youtubeLink }
//
// FESTIVAL_DAYS must be passed in via KoloradoArtistPopup.setConfig()
// before first use, or defaults to the 2026 dates.
// ============================================================

(function (global) {
  "use strict";

  // ── Language detection ──────────────────────────────────────────────────────
  function detectLang() {
    try {
      var u = (window.location.pathname + window.location.search).toLowerCase();
      if (/\/en(\/|$|\?)|[?&]lang=en/.test(u)) return "en";
      var htmlLang = (document.documentElement.lang || "").toLowerCase();
      if (htmlLang.startsWith("en")) return "en";
    } catch(e) {}
    return "hu";
  }
  var LANG = detectLang();
  var _i18n = {
    hu: {
      detailsSoon: "Részletek hamarosan...",
      days: { wed: "Szerda", thu: "Csütörtök", fri: "Péntek", sat: "Szombat" },
    },
    en: {
      detailsSoon: "Details coming soon...",
      days: { wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday" },
    },
  };
  var i18n = _i18n[LANG];

  // ── Defaults (override via setConfig) ─────────────────────
  var _festivalDays = [
    { id: "wed", label: i18n.days.wed, date: "2026-07-15" },
    { id: "thu", label: i18n.days.thu, date: "2026-07-16" },
    { id: "fri", label: i18n.days.fri, date: "2026-07-17" },
    { id: "sat", label: i18n.days.sat, date: "2026-07-18" },
  ];
  var _dayStartHour = 10;

  // ── Helpers ────────────────────────────────────────────────
  function esc(s) {
    var str = Array.isArray(s) ? s.join(', ') : (s == null ? '' : String(s));
    return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function fmt(d) {
    if (!d) return "";
    var t = d instanceof Date ? d : new Date(d);
    if (isNaN(t)) return "";
    var h = t.getHours(), m = t.getMinutes();
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }
  function getDayLabel(startTime) {
    if (!startTime) return "";
    var d = startTime instanceof Date ? startTime : new Date(startTime);
    if (isNaN(d)) return "";
    var h = d.getHours();
    var check = new Date(d);
    if (h < _dayStartHour) check.setDate(check.getDate() - 1);
    var iso = check.toISOString().slice(0, 10);
    for (var i = 0; i < _festivalDays.length; i++) {
      if (_festivalDays[i].date === iso) return _festivalDays[i].label;
    }
    return "";
  }
  function heartSvg(filled, size, color) {
    size = size || 18;
    var fill   = filled ? (color || "white") : "none";
    var stroke = filled ? (color || "white") : "#642CFF";
    return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="'+fill+'" stroke="'+stroke+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  }

  // ── CSS (inject into shadow root) ─────────────────────────
  var CSS = [
    // Overlay — flex row so arrows sit in the gap between card and screen edge
    ".kap-overlay{position:fixed;inset:0;z-index:200;background:rgba(14,75,77,0.88);backdrop-filter:blur(8px);display:flex;flex-direction:row;align-items:center;justify-content:center;padding:16px;gap:0;}",

    // Card — mobile default (portrait, full width)
    ".kap-card{background:#FEFFC0;width:100%;max-width:100%;max-height:90vh;overflow:hidden;position:relative;box-shadow:0 24px 64px rgba(0,0,0,0.4);}",

    // Mobile stack
    ".kap-mobile{display:flex;flex-direction:column;max-height:90vh;overflow-y:auto;}",
    ".kap-img-wrap{position:relative;width:100%;padding-bottom:75%;flex-shrink:0;}",  // 4:3
    ".kap-img-inner{position:absolute;inset:0;}",
    ".kap-photo{width:100%;height:100%;object-fit:cover;display:block;}",
    ".kap-photo-ph{width:100%;height:100%;background:#e8e9a0;display:flex;align-items:center;justify-content:center;}",
    ".kap-photo-ph span{font-family:'SerialBlur',sans-serif;font-size:48px;text-transform:uppercase;color:#642CFF;}",

    // Desktop landscape
    ".kap-desktop{display:none;height:80vh;max-height:640px;}",
    ".kap-left{width:42%;flex-shrink:0;position:relative;}",
    ".kap-left-inner{position:absolute;inset:0;}",
    ".kap-right{flex:1;overflow-y:auto;display:flex;flex-direction:column;}",

    // Responsive switch
    "@media(min-width:640px){",
      ".kap-card{max-width:720px!important;}",
      ".kap-mobile{display:none!important;}",
      ".kap-desktop{display:flex!important;}",
    "}",

    // Name overlay — top-left, per-line background
    ".kap-name-wrap{position:absolute;top:0;left:0;padding:8px 10px 4px;z-index:5;}",
    ".kap-name{font-family:'SerialBlur',sans-serif;font-size:18px;text-transform:uppercase;letter-spacing:0.02em;color:#642CFF;line-height:1.3;background:#FEFFC0;display:inline;-webkit-box-decoration-break:clone;box-decoration-break:clone;padding:2px 8px;}",

    // Fav button — bottom-right of image
    ".kap-fav{position:absolute;bottom:10px;right:10px;width:40px;height:40px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.25);transition:all 0.15s;z-index:5;}",
    ".kap-fav.off{background:rgba(254,255,192,0.95);}",
    ".kap-fav.on{background:#e53e3e;}",

    // Close — top-right of card
    ".kap-close{position:absolute;top:10px;right:10px;width:30px;height:30px;border-radius:50%;background:rgba(254,255,192,0.9);border:none;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;color:#642CFF;font-weight:700;z-index:10;line-height:1;}",

    // Nav arrows — flex siblings of the card, sit in the gap outside the card (desktop only)
    ".kap-nav{flex-shrink:0;align-self:center;z-index:20;width:40px;height:40px;border-radius:50%;background:rgba(254,255,192,0.92);border:none;cursor:pointer;display:none;align-items:center;justify-content:center;color:#642CFF;font-size:24px;font-weight:700;box-shadow:0 2px 10px rgba(0,0,0,0.2);transition:opacity 0.15s;opacity:0.85;margin:0 8px;}",
    ".kap-nav:hover{opacity:1;}",
    ".kap-nav[disabled]{opacity:0.2;cursor:default;pointer-events:none;}",
    "@media(min-width:640px){.kap-nav{display:flex!important;}}",
    // Mobile: full width card, no arrows
    "@media(max-width:639px){.kap-card{max-width:100%!important;}.kap-nav{display:none!important;}}",

    // Slide animation for card navigation
    "@keyframes kap-slide-in-right{from{transform:translateX(60px);opacity:0}to{transform:translateX(0);opacity:1}}",
    "@keyframes kap-slide-in-left{from{transform:translateX(-60px);opacity:0}to{transform:translateX(0);opacity:1}}",
    ".kap-card.slide-in-right{animation:kap-slide-in-right 0.18s ease-in-out;}",
    ".kap-card.slide-in-left{animation:kap-slide-in-left 0.18s ease-in-out;}",

    // Info body
    ".kap-body{padding:20px 22px 24px;display:flex;flex-direction:column;gap:12px;flex:1;}",
    ".kap-meta{font-family:'Pacaembu',sans-serif;font-size:15px;color:#0E4B4D;line-height:1.4;}",
    ".kap-genre{font-family:'Pacaembu',sans-serif;font-size:13px;color:rgba(100,44,255,0.6);text-transform:lowercase;}",
    ".kap-desc{font-family:'Pacaembu',sans-serif;font-size:13px;color:#333;line-height:1.65;}",
    ".kap-placeholder{font-family:'Pacaembu',sans-serif;font-size:13px;color:rgba(0,0,0,0.3);}",
    ".kap-player{margin-top:4px;}",
    ".kap-player iframe{display:block;width:100%;}",
    "svg{display:inline-block;vertical-align:middle;}",
  ].join("\n");

  // ── Build image panel HTML ─────────────────────────────────
  function _imagePanel(a, isFav) {
    var photoHtml = a.photo
      ? '<img class="kap-photo" src="'+esc(a.photo)+'" alt="'+esc(a.name)+'" loading="lazy">'
      : '<div class="kap-photo-ph"><span>'+esc((a.name||"").slice(0,2))+'</span></div>';
    return photoHtml +
      '<div class="kap-name-wrap"><span class="kap-name">'+esc(a.name)+'</span></div>' +
      '<button class="kap-fav '+(isFav?"on":"off")+'" id="kap-fav" data-id="'+esc(a.id)+'">' +
        heartSvg(isFav, 18) +
      '</button>';
  }

  // ── Build info panel HTML ──────────────────────────────────
  function _infoPanel(a) {
    var dayLabel = getDayLabel(a.startTime);
    var timeStr  = a.startTime ? fmt(a.startTime) + (a.endTime ? " – " + fmt(a.endTime) : "") : "";
    var metaParts = [dayLabel, timeStr, a.stage].filter(Boolean);
    var metaLine  = metaParts.join(", ");

    var playerHtml = "";
    if (a.soundcloudLink) {
      playerHtml = '<div class="kap-player">' +
        '<iframe height="120" scrolling="no" frameborder="no" allow="autoplay" ' +
        'src="https://w.soundcloud.com/player/?url='+encodeURIComponent(a.soundcloudLink)+'&color=%23642CFF&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false">' +
        '</iframe></div>';
    } else if (a.youtubeLink) {
      // Robustly extract the YouTube video ID from any URL format:
      // watch?v=ID, youtu.be/ID, /embed/ID — ignoring extra params like ?si=, &feature=youtu.be
      var ytId = null;
      try {
        var ytUrl = a.youtubeLink;
        var mEmbed = ytUrl.match(/\/embed\/([A-Za-z0-9_-]{11})/);
        var mWatch = ytUrl.match(/[?&]v=([A-Za-z0-9_-]{11})/);
        var mShort = ytUrl.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
        ytId = (mEmbed && mEmbed[1]) || (mWatch && mWatch[1]) || (mShort && mShort[1]) || null;
      } catch(e) {}
      var ytSrc = ytId ? 'https://www.youtube.com/embed/' + ytId : a.youtubeLink;
      playerHtml = '<div class="kap-player">' +
        '<iframe height="120" src="'+esc(ytSrc)+'" frameborder="0" ' +
        'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen>' +
        '</iframe></div>';
    }

    return '<div class="kap-body">' +
      (metaLine ? '<div class="kap-meta" style="display:none">'+esc(metaLine)+'</div>' : '') + /* hidden until schedule data is ready */
      (a.genre ? '<div class="kap-genre">'+esc(a.genre)+'</div>' : '') +
      (a.longDescription
        ? '<div class="kap-desc">'+esc(a.longDescription)+'</div>'
        : '<div class="kap-placeholder">'+i18n.detailsSoon+'</div>') +
      playerHtml +
    '</div>';
  }

  // ── Public: render HTML string ─────────────────────────────
  function render(a, isFav) {
    var imgPanel  = _imagePanel(a, isFav);
    var infoPanel = _infoPanel(a);
    return '<div class="kap-overlay" id="kap-overlay">' +
      '<button class="kap-nav" id="kap-nav-prev" aria-label="Previous artist">&#8249;</button>' +
      '<div class="kap-card" id="kap-card">' +
        '<button class="kap-close" id="kap-close">×</button>' +
        // Mobile portrait
        '<div class="kap-mobile">' +
          '<div class="kap-img-wrap"><div class="kap-img-inner">' + imgPanel + '</div></div>' +
          infoPanel +
        '</div>' +
        // Desktop landscape
        '<div class="kap-desktop">' +
          '<div class="kap-left"><div class="kap-left-inner">' + imgPanel + '</div></div>' +
          '<div class="kap-right">' + infoPanel + '</div>' +
        '</div>' +
      '</div>' +
      '<button class="kap-nav" id="kap-nav-next" aria-label="Next artist">&#8250;</button>' +
    '</div>';
  }

  // ── Public: wire events after HTML is in shadow DOM ────────
  function wire(shadow, a, isFav, callbacks) {
    // callbacks: { onClose, onToggleFav, onPrev, onNext }
    var overlay  = shadow.getElementById("kap-overlay");
    var closeBtn = shadow.getElementById("kap-close");
    var favBtn   = shadow.getElementById("kap-fav");
    var prevBtn  = shadow.getElementById("kap-nav-prev");
    var nextBtn  = shadow.getElementById("kap-nav-next");
    var card     = overlay ? overlay.querySelector(".kap-card") : null;

    if (closeBtn) closeBtn.addEventListener("click", function() {
      if (callbacks.onClose) callbacks.onClose();
    });
    if (overlay) overlay.addEventListener("click", function(e) {
      if (e.target === overlay && callbacks.onClose) callbacks.onClose();
    });
    if (favBtn) favBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      var id = favBtn.getAttribute("data-id");
      if (callbacks.onToggleFav) callbacks.onToggleFav(id);
    });

    // ── Nav arrow buttons ────────────────────────────────────────────
    var kapCard = shadow.getElementById("kap-card");
    function triggerSlide(dir) {
      if (!kapCard) return;
      kapCard.classList.remove("slide-in-right", "slide-in-left");
      // Force reflow to restart animation
      void kapCard.offsetWidth;
      kapCard.classList.add(dir > 0 ? "slide-in-right" : "slide-in-left");
    }
    if (prevBtn) {
      if (!callbacks.onPrev) { prevBtn.setAttribute("disabled", ""); }
      else { prevBtn.addEventListener("click", function(e) { e.stopPropagation(); triggerSlide(-1); callbacks.onPrev(); }); }
    }
    if (nextBtn) {
      if (!callbacks.onNext) { nextBtn.setAttribute("disabled", ""); }
      else { nextBtn.addEventListener("click", function(e) { e.stopPropagation(); triggerSlide(1); callbacks.onNext(); }); }
    }

    // ── Touch swipe on the card ────────────────────────────────────────────
    if (card && (callbacks.onPrev || callbacks.onNext)) {
      var _tx = 0, _ty = 0;
      card.addEventListener("touchstart", function(e) {
        _tx = e.touches[0].clientX;
        _ty = e.touches[0].clientY;
      }, { passive: true });
      card.addEventListener("touchend", function(e) {
        var dx = e.changedTouches[0].clientX - _tx;
        var dy = e.changedTouches[0].clientY - _ty;
        // Only trigger if horizontal swipe is dominant and > 40px
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        if (dx < 0 && callbacks.onNext) callbacks.onNext();  // swipe left  → next
        if (dx > 0 && callbacks.onPrev) callbacks.onPrev();  // swipe right → prev
      }, { passive: true });
    }

    // ── Keyboard arrow navigation ────────────────────────────────────────────
    function _onKey(e) {
      if (e.key === "ArrowLeft"  && callbacks.onPrev) { e.preventDefault(); callbacks.onPrev(); }
      if (e.key === "ArrowRight" && callbacks.onNext) { e.preventDefault(); callbacks.onNext(); }
      if (e.key === "Escape"     && callbacks.onClose) { callbacks.onClose(); }
    }
    document.addEventListener("keydown", _onKey);
    // Clean up keyboard listener when popup closes
    if (closeBtn) closeBtn.addEventListener("click", function() { document.removeEventListener("keydown", _onKey); }, { once: true });
    if (overlay)  overlay.addEventListener("click",  function(e) { if (e.target === overlay) document.removeEventListener("keydown", _onKey); }, { once: true });
  }

  // ── Public: configure festival days ───────────────────────
  function setConfig(opts) {
    if (opts.festivalDays) _festivalDays = opts.festivalDays;
    if (opts.dayStartHour !== undefined) _dayStartHour = opts.dayStartHour;
  }

  // ── Export ─────────────────────────────────────────────────
  global.KoloradoArtistPopup = { CSS: CSS, render: render, wire: wire, setConfig: setConfig };

})(typeof window !== "undefined" ? window : this);
