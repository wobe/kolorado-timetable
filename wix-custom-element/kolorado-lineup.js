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

  // ── Font URLs ──────────────────────────────────────────────
  var SERIAL_BLUR_URL = "https://koloradotim-bqt3vb73.manus.space/manus-storage/SerialBlurTRIAL-Bleed_177bb821.ttf";
  var PACAEMBU_URL    = "https://koloradotim-bqt3vb73.manus.space/manus-storage/Pacaembu-Medium_86abdf90.ttf";

  // ── Constants ──────────────────────────────────────────────
  var FAV_COOKIE_NAME    = "kolorado_favourites";
  var FAV_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
  var DAY_START_HOUR     = 10; // festival day boundary

  var FESTIVAL_DAYS = [
    { id: "wed", label: "Szerda",    date: "2026-07-15" },
    { id: "thu", label: "Csütörtök", date: "2026-07-16" },
    { id: "fri", label: "Péntek",    date: "2026-07-17" },
    { id: "sat", label: "Szombat",   date: "2026-07-18" },
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

  // ── Escape HTML ────────────────────────────────────────────
  function esc(s) {
    return (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
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
    ".kl-header{position:sticky;top:0;z-index:40;background:#FEFFC0;border-bottom:2px solid rgba(100,44,255,0.15);padding:10px 16px;display:flex;align-items:center;gap:10px;}",

    // Desktop filters (hidden on mobile)
    ".kl-desktop-filters{display:flex;align-items:center;gap:10px;flex:1;flex-wrap:wrap;}",
    "@media(max-width:639px){.kl-desktop-filters{display:none!important;}}",

    // Mobile filter icon (hidden on desktop)
    ".kl-mobile-filter-wrap{position:relative;flex:1;}",
    "@media(min-width:640px){.kl-mobile-filter-wrap{display:none!important;}}",

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

    // Fav toggle
    ".kl-fav-toggle{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:9999px;border:none;background:rgba(100,44,255,0.12);color:#642CFF;font-family:'Pacaembu',sans-serif;font-size:13px;cursor:pointer;transition:all 0.15s;}",
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
    ".kl-search-row{display:flex;align-items:center;gap:8px;margin-left:auto;}",
    ".kl-search-input{height:36px;padding:0 12px;border:2px solid rgba(100,44,255,0.3);background:rgba(100,44,255,0.06);color:#642CFF;font-family:'Pacaembu',sans-serif;font-size:13px;outline:none;width:160px;}",

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
      this._showMobileFilters = false;
      this._searchOpen = false;
      this._searchQuery = "";
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
              name:            item.name || item.title || "Ismeretlen",
              // photo is already a full https:// URL (converted by lineupApi.jsw)
              photo:           item.photo || "",
              stage:           item.stage || "",
              startTime:       item.startTime ? new Date(item.startTime) : null,
              endTime:         item.endTime   ? new Date(item.endTime)   : null,
              genre:           item.genre || "",
              longDescription: item.longDescription || item.bio || item.description || "",
              soundcloudLink:  item.soundcloudLink || item.soundcloud || "",
              youtubeLink:     item.youtubeLink || item.youtube || "",
            };
          }).filter(function(a){ return a.startTime && !isNaN(a.startTime); });
          this._loading = false;
          this._render();
        } catch(e) {
          console.error("kolorado-lineup: failed to parse lineup-data", e);
        }
      }
    }

    // ── Helpers ──────────────────────────────────────────────
    _toggleFav(id) {
      if (this._favourites.has(id)) this._favourites.delete(id);
      else this._favourites.add(id);
      writeFavCookie(this._favourites);
      this._render();
    }

    _openPopup(artist) { this._popupArtist = artist; this._render(); }
    _closePopup()      { this._popupArtist = null;   this._render(); }

    _filteredArtists() {
      var self = this;
      var sorted = this._artists.slice().sort(function(a, b) {
        return a.name.localeCompare(b.name, "hu", { sensitivity: "base" });
      });
      return sorted.filter(function(a) {
        if (self._selectedStages.size > 0 && !self._selectedStages.has(a.stage)) return false;
        if (self._selectedDays.size > 0) {
          var dayId = getFestivalDayId(a.startTime);
          if (!dayId || !self._selectedDays.has(dayId)) return false;
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
      var stageLabel = "Színpad";
      if (this._selectedStages.size === 1) stageLabel = Array.from(this._selectedStages)[0];
      else if (this._selectedStages.size > 1) stageLabel = this._selectedStages.size + " kiválasztva";

      // ── Day pill label ──
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
        var clearBtn = hasActiveFilters ? '<button class="kl-mobile-clear" id="kl-mobile-clear">× Szűrők törlése</button>' : '';
        mobilePanelHtml = '<div class="kl-mobile-panel" id="kl-mobile-panel">' +
          '<div class="kl-mobile-section-label">Színpad</div>' +
          '<div class="kl-mobile-pills">' + stagePills + '</div>' +
          '<div class="kl-mobile-section-label">Nap</div>' +
          '<div class="kl-mobile-pills">' + dayPills + '</div>' +
          '<button class="kl-fav-toggle'+(this._filterFavourites?" active":"")+'" id="kl-mobile-fav-toggle">' +
            ICONS.heart(this._filterFavourites, 14) + ' Kedvencek' +
            (favCount > 0 ? '<span class="kl-badge">'+favCount+'</span>' : '') +
          '</button>' +
          clearBtn +
        '</div>';
      }

      // Mobile filter icon badge count
      var mobileFilterCount = this._selectedStages.size + this._selectedDays.size + (this._filterFavourites ? 1 : 0);
      var mobileBadge = mobileFilterCount > 0
        ? '<span class="kl-icon-badge">'+mobileFilterCount+'</span>' : '';

      // ── Header HTML ──
      var headerHtml = '<div class="kl-header">' +
        // Desktop filters
        '<div class="kl-desktop-filters">' +
          '<div class="kl-filter-wrap">' +
            '<button class="kl-filter-btn'+(stageActive?" active":"")+'" id="kl-stage-btn">' +
              '<span style="font-size:10px">▼</span> '+esc(stageLabel)+stageClear +
            '</button>' + stageDropdown +
          '</div>' +
          '<div class="kl-filter-wrap">' +
            '<button class="kl-filter-btn'+(dayActive?" active":"")+'" id="kl-day-btn">' +
              '<span style="font-size:10px">▼</span> '+esc(dayLabel)+dayClear +
            '</button>' + dayDropdown +
          '</div>' +
          '<button class="kl-fav-toggle'+(this._filterFavourites?" active":"")+'" id="kl-fav-toggle">' +
            ICONS.heart(this._filterFavourites, 14) + ' Kedvencek' +
            (favCount > 0 ? '<span class="kl-badge">'+favCount+'</span>' : '') +
          '</button>' +
        '</div>' +

        // Mobile filter icon
        '<div class="kl-mobile-filter-wrap" style="position:relative">' +
          '<button class="kl-icon-btn'+(hasActiveFilters?" active":"  inactive")+'" id="kl-mobile-filter-btn" style="position:relative">' +
            ICONS.filter(16) + mobileBadge +
          '</button>' +
          mobilePanelHtml +
        '</div>' +

        // Search (always visible)
        '<div class="kl-search-row">' +
          (this._searchOpen ? '<input class="kl-search-input" id="kl-search-input" type="text" placeholder="Keresés..." value="'+esc(this._searchQuery)+'">' : '') +
          '<button class="kl-icon-btn'+(this._searchOpen||this._searchQuery?" active":" inactive")+'" id="kl-search-btn">' +
            ICONS.search(16) +
          '</button>' +
        '</div>' +
      '</div>';

      // ── Grid HTML ──
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
            ? '<img class="kl-photo" src="'+esc(a.photo)+'" alt="'+esc(a.name)+'" loading="lazy">'
            : '<div class="kl-photo-placeholder"><span>'+esc(initials)+'</span></div>';

          gridHtml +=
            '<div class="kl-card" data-id="'+esc(a.id)+'">' +
              '<div class="kl-card-inner">' +
                photoHtml +
                '<div class="kl-hover-overlay"></div>' +
                '<button class="kl-fav-circle'+(isFav?" on":"")+'" data-fav="'+esc(a.id)+'">' +
                  ICONS.heart(isFav, 16) +
                '</button>' +
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
        '<div class="kl-root">' + headerHtml + gridHtml + popupHtml + '</div>';

      // ── Event listeners ──

      // Stage filter pill
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

      // Search input
      var searchInput = shadow.getElementById("kl-search-input");
      if (searchInput) {
        searchInput.addEventListener("input", function() {
          self._searchQuery = searchInput.value; self._render();
          var inp2 = shadow.getElementById("kl-search-input");
          if (inp2) { inp2.focus(); inp2.value = self._searchQuery; }
        });
        searchInput.addEventListener("keydown", function(e) {
          if (e.key === "Escape") { self._searchOpen = false; self._searchQuery = ""; self._render(); }
        });
      }

      // Card clicks → popup
      shadow.querySelectorAll(".kl-card").forEach(function(card) {
        card.addEventListener("click", function(e) {
          if (e.target.closest("[data-fav]")) return;
          var id = card.getAttribute("data-id");
          var artist = self._artists.find(function(a){ return a.id === id; });
          if (artist) self._openPopup(artist);
        });
      });

      // Card fav buttons
      shadow.querySelectorAll("[data-fav]").forEach(function(btn) {
        btn.addEventListener("click", function(e) {
          e.stopPropagation(); self._toggleFav(btn.getAttribute("data-fav"));
        });
      });

      // Popup events — wired via shared KoloradoArtistPopup module
      if (self._popupArtist && typeof KoloradoArtistPopup !== "undefined") {
        var isFavPopup = self._favourites.has(self._popupArtist.id);
        KoloradoArtistPopup.wire(shadow, self._popupArtist, isFavPopup, {
          onClose: function() { self._closePopup(); },
          onToggleFav: function(id) {
            self._toggleFav(id);
            self._popupArtist = self._artists.find(function(a){ return a.id === id; }) || self._popupArtist;
            self._render();
          },
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
  }

  if (!customElements.get("kolorado-lineup")) {
    customElements.define("kolorado-lineup", KoloradoLineup);
  }

})();
