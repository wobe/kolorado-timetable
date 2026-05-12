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

  // ── Font URLs (served from the hosted Manus site) ──────────
  const SERIAL_BLUR_URL = "https://koloradotim-bqt3vb73.manus.space/manus-storage/SerialBlurTRIAL-Bleed_177bb821.ttf";
  const PACAEMBU_URL    = "https://koloradotim-bqt3vb73.manus.space/manus-storage/Pacaembu-Medium_86abdf90.ttf";

  // ── Constants ──────────────────────────────────────────────
  const KOLORADO_BASE_URL = "https://www.kolorado.hu";
  const FAV_COOKIE_NAME   = "kolorado_favourites";
  const FAV_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
  const DAY_START_HOUR    = 10;
  const DAY_END_HOUR      = 31;
  const HOUR_HEIGHT_PX    = 80;
  const MOBILE_HOUR_HEIGHT_PX = 60;

  const FESTIVAL_DAYS = [
    { id: "wed", label: "Szerda",    shortLabel: "Sze",  date: "2026-07-15" },
    { id: "thu", label: "Csütörtök", shortLabel: "Csüt", date: "2026-07-16" },
    { id: "fri", label: "Péntek",    shortLabel: "Pén",  date: "2026-07-17" },
    { id: "sat", label: "Szombat",   shortLabel: "Szo",  date: "2026-07-18" },
  ];

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
    var str = d.toISOString().split("T")[0];
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
    external: function(size) { size=size||13; return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>'; },
  };

  // ── CSS ────────────────────────────────────────────────────
  var CSS = [
    "@font-face { font-family:'SerialBlur'; src:url('"+SERIAL_BLUR_URL+"') format('truetype'); font-weight:normal; font-style:normal; font-display:swap; }",
    "@font-face { font-family:'Pacaembu'; src:url('"+PACAEMBU_URL+"') format('truetype'); font-weight:normal; font-style:normal; font-display:swap; }",
    "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}",
    ":host{display:block;width:100%;font-family:'Pacaembu',sans-serif;}",
    ".kt-root{background:#0E4B4D;min-height:100vh;color:#c8dedd;}",
    ".kt-header{position:sticky;top:0;z-index:40;background:rgba(6,35,34,0.97);border-bottom:1px solid rgba(26,107,102,0.2);backdrop-filter:blur(8px);padding:12px 16px 8px;}",
    ".kt-days{display:flex;gap:6px;margin-bottom:8px;justify-content:center;}",
    ".kt-day-btn{flex:1;max-width:180px;padding:10px 24px;border-radius:9999px;border:none;cursor:pointer;font-family:'SerialBlur',sans-serif;font-size:15px;letter-spacing:0.05em;text-transform:uppercase;transition:all 0.2s;background:transparent;color:rgba(220,234,117,0.8);}",
    ".kt-day-btn.active{background:#dcea75;color:#062322;}",
    ".kt-day-btn .full{display:inline;}.kt-day-btn .short{display:none;}",
    "@media(max-width:600px){.kt-day-btn{font-size:13px;padding:8px 8px;}.kt-day-btn .full{display:none;}.kt-day-btn .short{display:inline;}}",
    ".kt-toolbar{display:flex;align-items:center;gap:8px;}",
    ".kt-fav-btn{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:9999px;border:1px solid rgba(26,107,102,0.4);background:transparent;color:#7a9e9b;font-family:'Pacaembu',sans-serif;font-size:12px;cursor:pointer;position:relative;transition:all 0.2s;}",
    ".kt-fav-btn.active{border-color:rgba(232,107,90,0.4);color:#e86b5a;background:rgba(232,107,90,0.1);}",
    ".kt-badge{position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:#e86b5a;color:#fff;font-size:9px;font-weight:bold;display:flex;align-items:center;justify-content:center;}",
    ".kt-spacer{flex:1;}",
    ".kt-icon-btn{width:36px;height:36px;border-radius:9999px;border:1px solid rgba(26,107,102,0.4);background:transparent;color:#7a9e9b;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0;}",
    ".kt-icon-btn.active{border-color:rgba(220,234,117,0.4);color:#dcea75;background:rgba(220,234,117,0.06);}",
    ".kt-search-expanded{display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:9999px;border:1px solid rgba(26,107,102,0.4);background:rgba(26,107,102,0.15);}",
    ".kt-search-expanded input{background:transparent;border:none;outline:none;color:#c8dedd;font-family:'Pacaembu',sans-serif;font-size:12px;width:140px;}",
    ".kt-search-expanded input::placeholder{color:rgba(122,158,155,0.7);}",
    ".kt-view-toggle{display:flex;border:1px solid rgba(26,107,102,0.4);border-radius:9999px;overflow:hidden;flex-shrink:0;}",
    ".kt-view-btn{width:36px;height:36px;border:none;background:transparent;color:#7a9e9b;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;}",
    ".kt-view-btn.active{background:rgba(220,234,117,0.13);color:#dcea75;}",
    ".kt-panel{background:rgba(6,35,34,0.97);border-bottom:1px solid rgba(26,107,102,0.2);padding:12px 16px;}",
    ".kt-panel-list{max-height:260px;overflow-y:auto;margin-bottom:8px;}",
    ".kt-panel-row{display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;transition:background 0.15s;}",
    ".kt-panel-row:hover{background:rgba(26,107,102,0.15);}",
    ".kt-panel-row .bar{width:4px;height:32px;flex-shrink:0;}",
    ".kt-panel-row .info{flex:1;min-width:0;}",
    ".kt-panel-row .name{font-family:'SerialBlur',sans-serif;font-size:13px;text-transform:uppercase;letter-spacing:0.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
    ".kt-panel-row .meta{font-size:11px;color:rgba(122,158,155,0.8);margin-top:1px;}",
    ".kt-panel-row .actions{display:flex;align-items:center;gap:2px;flex-shrink:0;}",
    ".kt-panel-row .actions button{background:none;border:none;cursor:pointer;padding:6px;color:#7a9e9b;transition:color 0.15s;display:flex;align-items:center;}",
    ".kt-panel-row .actions button:hover{color:#dcea75;}",
    ".kt-panel-row .actions button.fav-on{color:#e86b5a;}",
    ".kt-panel-row .actions a{color:#7a9e9b;padding:6px;display:flex;align-items:center;text-decoration:none;transition:color 0.15s;}",
    ".kt-panel-row .actions a:hover{color:#dcea75;}",
    ".kt-panel-footer{display:flex;align-items:flex-end;gap:10px;border-top:1px solid rgba(26,107,102,0.15);padding-top:8px;}",
    ".kt-panel-disclaimer{flex:1;font-size:10px;color:rgba(122,158,155,0.55);line-height:1.5;}",
    ".kt-panel-actions{display:flex;gap:6px;flex-shrink:0;}",
    ".kt-action-btn{display:flex;align-items:center;gap:5px;padding:5px 10px;border:1px solid rgba(26,107,102,0.3);background:transparent;color:rgba(122,158,155,0.8);font-family:'Pacaembu',sans-serif;font-size:11px;cursor:pointer;border-radius:0;transition:all 0.15s;}",
    ".kt-action-btn:hover{border-color:rgba(220,234,117,0.4);color:#dcea75;}",
    ".kt-empty{text-align:center;padding:32px 16px;color:rgba(122,158,155,0.7);font-size:13px;}",
    ".kt-empty button{margin-top:10px;background:none;border:none;color:#dcea75;font-size:12px;text-decoration:underline;cursor:pointer;font-family:'Pacaembu',sans-serif;}",
    ".kt-filter-wrap{position:relative;}",
    ".kt-filter-dropdown{position:absolute;right:0;top:calc(100% + 4px);z-index:60;min-width:200px;background:#062322;border:1px solid rgba(26,107,102,0.3);box-shadow:0 8px 24px rgba(0,0,0,0.4);}",
    ".kt-filter-item{display:flex;align-items:center;gap:10px;padding:9px 12px;font-size:12px;cursor:pointer;border:none;background:transparent;width:100%;text-align:left;font-family:'Pacaembu',sans-serif;color:#7a9e9b;transition:background 0.15s;}",
    ".kt-filter-item:hover{background:rgba(26,107,102,0.15);}",
    ".kt-filter-item.active{color:#e86b5a;background:rgba(232,107,90,0.06);}",
    ".kt-filter-item .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}",
    ".kt-filter-sep{border:none;border-top:1px solid rgba(26,107,102,0.15);margin:2px 0;}",
    ".kt-day-label{font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:rgba(122,158,155,0.6);padding:4px 10px 2px;font-family:'Pacaembu',sans-serif;}",
    ".kt-list{padding:8px 16px 48px;}",
    ".kt-list-row{display:flex;align-items:center;gap:12px;padding:10px 12px;cursor:pointer;transition:background 0.15s;}",
    ".kt-list-row:hover{background:rgba(26,107,102,0.12);}",
    ".kt-list-row .bar{width:4px;height:44px;flex-shrink:0;}",
    ".kt-list-row .info{flex:1;min-width:0;}",
    ".kt-list-row .name{font-family:'SerialBlur',sans-serif;font-size:15px;text-transform:uppercase;letter-spacing:0.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
    ".kt-list-row .time{font-size:11px;color:rgba(122,158,155,0.8);margin-top:2px;}",
    ".kt-list-row .stage-label{font-size:10px;margin-top:2px;}",
    ".kt-list-row .fav-btn{background:none;border:none;cursor:pointer;padding:8px;color:#7a9e9b;transition:color 0.15s;flex-shrink:0;}",
    ".kt-list-row .fav-btn.on{color:#e86b5a;}",
    ".kt-grid-wrap{padding:0 16px 32px;}",
    ".kt-grid-scroll{overflow-x:auto;overflow-y:auto;border:1px solid rgba(26,107,102,0.15);height:calc(100vh - 140px);}",
    ".kt-grid-inner{display:flex;}",
    ".kt-time-axis{position:sticky;left:0;z-index:20;background:#0E4B4D;border-right:1px solid rgba(26,107,102,0.15);flex-shrink:0;}",
    ".kt-time-axis-header{position:sticky;top:0;z-index:30;background:#0E4B4D;border-bottom:1px solid rgba(26,107,102,0.15);height:40px;}",
    ".kt-time-axis-body{position:relative;}",
    ".kt-time-label{position:absolute;left:0;right:0;display:flex;align-items:flex-start;justify-content:flex-end;padding-right:4px;}",
    ".kt-time-label span{font-size:9px;color:rgba(122,158,155,0.6);transform:translateY(-50%);font-family:'Pacaembu',sans-serif;}",
    ".kt-stage-cols{display:flex;flex:1;position:relative;}",
    ".kt-stage-col{flex:1;min-width:140px;}",
    ".kt-stage-header{position:sticky;top:0;z-index:20;padding:0 8px;height:40px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid rgba(26,107,102,0.15);background:rgba(14,75,77,0.95);backdrop-filter:blur(4px);}",
    ".kt-stage-header span{font-family:'SerialBlur',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;text-align:center;}",
    ".kt-stage-body{position:relative;}",
    ".kt-hour-line{position:absolute;left:0;right:0;border-top:1px solid rgba(26,107,102,0.07);}",
    ".kt-block{position:absolute;left:2px;right:2px;overflow:hidden;cursor:pointer;border-radius:0;transition:outline 0.2s;}",
    ".kt-block-content{height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:4px 6px;}",
    ".kt-block-content.row{flex-direction:row;align-items:center;gap:6px;}",
    ".kt-block-name{font-family:'SerialBlur',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2;}",
    ".kt-block-genre{font-size:10px;color:rgba(200,222,221,0.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'Pacaembu',sans-serif;}",
    ".kt-block-time{font-size:10px;white-space:nowrap;flex-shrink:0;font-family:'Pacaembu',sans-serif;}",
    ".kt-block-overlay{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:8px;opacity:0;transition:opacity 0.15s;pointer-events:none;}",
    ".kt-block:hover .kt-block-overlay,.kt-block.tapped .kt-block-overlay{opacity:1;pointer-events:auto;}",
    ".kt-block-overlay-name{font-family:'SerialBlur',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#062322;font-weight:bold;text-align:center;cursor:pointer;background:none;border:none;line-height:1.2;}",
    ".kt-block-overlay-name:hover{text-decoration:underline;}",
    ".kt-block-overlay-time{font-size:11px;color:rgba(6,35,34,0.8);font-family:'Pacaembu',sans-serif;text-align:center;}",
    ".kt-fav-pill{display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:9999px;border:none;cursor:pointer;font-family:'Pacaembu',sans-serif;font-size:11px;font-weight:600;transition:all 0.15s;}",
    ".kt-fav-pill.off{background:#fff;color:#062322;}",
    ".kt-fav-pill.on{background:#e86b5a;color:#fff;}",
    ".kt-now-line{position:absolute;left:0;right:0;z-index:30;pointer-events:none;}",
    ".kt-now-bar{position:relative;}",
    ".kt-now-bar::after{content:'';position:absolute;left:0;right:0;top:0;height:2px;background:#dcea75;}",
    ".kt-now-dot{position:absolute;left:-4px;top:-5px;width:10px;height:10px;border-radius:50%;background:#dcea75;box-shadow:0 0 8px #dcea75;}",
    ".kt-now-label{position:absolute;left:12px;top:-9px;font-size:9px;font-weight:bold;padding:1px 5px;background:#dcea75;color:#062322;font-family:'Pacaembu',sans-serif;}",
    ".kt-skeleton{background:#0E4B4D;min-height:100vh;}",
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
      this._activeDay = FESTIVAL_DAYS[0].id;
      this._activeStages = new Set(STAGES.map(function(s){return s.id;}));
      this._favourites = readFavCookie();
      this._viewMode = window.innerWidth < 768 ? "list" : "grid";
      this._showKedvencek = false;
      this._showSearch = false;
      this._showFilter = false;
      this._filterFavourites = false;
      this._searchQuery = "";
      this._tappedBlockId = null;
      this._parentUrl = null;
      this._loading = true;
      this._nowInterval = null;
    }

    connectedCallback() {
      var self = this;
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
          this._artists = raw.map(function(item) {
            return {
              id: item.id || item._id || String(Math.random()),
              name: item.title || item.name || "Ismeretlen",
              stage: item.sznpad || item.stage || "Nagyszínpad",
              startTime: new Date(item.id || item.startTime),
              endTime: new Date(item.id1 || item.endTime),
              genre: item.genre1 || item.genre || "",
              url: item.website || item.url || null,
            };
          }).filter(function(a){ return !isNaN(a.startTime) && !isNaN(a.endTime); });
          this._loading = false;
          this._render();
        } catch(e) { console.error("kolorado-timetable: invalid lineup-data", e); }
      }
    };

    _render() {
      var root = this._shadow;
      if (!root) return;
      root.innerHTML = "";
      var style = document.createElement("style");
      style.textContent = CSS;
      root.appendChild(style);
      if (this._loading) { root.appendChild(this._renderSkeleton()); return; }
      var wrap = document.createElement("div");
      wrap.className = "kt-root";
      wrap.appendChild(this._renderHeader());
      if (this._showKedvencek) wrap.appendChild(this._renderKedvencekPanel());
      if (this._showSearch && this._searchQuery) wrap.appendChild(this._renderSearchPanel());
      if (this._viewMode === "list") wrap.appendChild(this._renderListView());
      else wrap.appendChild(this._renderGridView());
      root.appendChild(wrap);
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
      // Auto-scroll grid
      if (this._viewMode === "grid") {
        var self = this;
        setTimeout(function() {
          var scroll = root.querySelector(".kt-grid-scroll");
          if (!scroll) return;
          var dayArtists = self._artists.filter(function(a){ return getFestivalDayId(a.startTime) === self._activeDay; });
          if (!dayArtists.length) return;
          var first = dayArtists.reduce(function(a,b){ return a.startTime < b.startTime ? a : b; });
          var hh = window.innerWidth < 768 ? MOBILE_HOUR_HEIGHT_PX : HOUR_HEIGHT_PX;
          scroll.scrollTop = Math.max(0, (toFestivalHour(first.startTime) - DAY_START_HOUR) * hh - 24);
        }, 50);
      }
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
      // Days row
      var daysRow = document.createElement("div");
      daysRow.className = "kt-days";
      FESTIVAL_DAYS.forEach(function(day) {
        var btn = document.createElement("button");
        btn.className = "kt-day-btn" + (self._activeDay === day.id ? " active" : "");
        btn.innerHTML = '<span class="full">'+day.label+'</span><span class="short">'+day.shortLabel+'</span>';
        btn.addEventListener("click", function(){ self._activeDay = day.id; self._render(); });
        daysRow.appendChild(btn);
      });
      header.appendChild(daysRow);
      // Toolbar
      var toolbar = document.createElement("div");
      toolbar.className = "kt-toolbar";
      // Kedvencek btn
      var favCount = this._favourites.size;
      var favBtn = document.createElement("button");
      favBtn.className = "kt-fav-btn" + (this._showKedvencek ? " active" : "");
      favBtn.innerHTML = (this._showKedvencek ? ICONS.x(13) : ICONS.heart("none",13)) + " Kedvencek" + (favCount > 0 ? '<span class="kt-badge">'+favCount+'</span>' : "");
      favBtn.addEventListener("click", function(){ self._showKedvencek = !self._showKedvencek; if(self._showKedvencek) self._showSearch=false; self._render(); });
      toolbar.appendChild(favBtn);
      var spacer = document.createElement("div"); spacer.className = "kt-spacer";
      toolbar.appendChild(spacer);
      // Search
      if (this._showSearch) {
        var sw = document.createElement("div"); sw.className = "kt-search-expanded";
        sw.innerHTML = ICONS.search(13);
        var inp = document.createElement("input"); inp.placeholder = "Keresés…"; inp.value = this._searchQuery;
        inp.addEventListener("input", function(e){ self._searchQuery = e.target.value; self._render(); });
        inp.addEventListener("keydown", function(e){ if(e.key==="Escape"){ self._showSearch=false; self._searchQuery=""; self._render(); }});
        sw.appendChild(inp);
        var closeX = document.createElement("button");
        closeX.style.cssText = "background:none;border:none;cursor:pointer;color:#7a9e9b;padding:4px;display:flex;align-items:center;flex-shrink:0;";
        closeX.innerHTML = ICONS.x(12);
        closeX.addEventListener("click", function(){ self._showSearch=false; self._searchQuery=""; self._render(); });
        sw.appendChild(closeX);
        toolbar.appendChild(sw);
        setTimeout(function(){ var i = self._shadow.querySelector(".kt-search-expanded input"); if(i) i.focus(); }, 30);
      } else {
        var sb = document.createElement("button"); sb.className = "kt-icon-btn"; sb.innerHTML = ICONS.search(15); sb.title = "Keresés";
        sb.addEventListener("click", function(){ self._showSearch=true; self._showKedvencek=false; self._render(); });
        toolbar.appendChild(sb);
      }
      // Filter
      var hasFilters = this._filterFavourites || this._activeStages.size < STAGES.length;
      var fw = document.createElement("div"); fw.className = "kt-filter-wrap";
      var fb = document.createElement("button"); fb.className = "kt-icon-btn" + (hasFilters ? " active" : ""); fb.innerHTML = ICONS.filter(15); fb.title = "Szűrők";
      fb.addEventListener("click", function(e){ e.stopPropagation(); self._showFilter = !self._showFilter; self._render(); });
      fw.appendChild(fb);
      if (this._showFilter) {
        var dd = document.createElement("div"); dd.className = "kt-filter-dropdown";
        var favItem = document.createElement("button");
        favItem.className = "kt-filter-item" + (this._filterFavourites ? " active" : "");
        favItem.innerHTML = ICONS.heart(this._filterFavourites ? "#e86b5a" : "none", 13) + " Csak a kedvenceim";
        favItem.addEventListener("click", function(){ self._filterFavourites = !self._filterFavourites; self._showFilter=false; self._render(); });
        dd.appendChild(favItem);
        var sep = document.createElement("hr"); sep.className = "kt-filter-sep"; dd.appendChild(sep);
        STAGES.forEach(function(stage) {
          var isActive = self._activeStages.has(stage.id);
          var item = document.createElement("button"); item.className = "kt-filter-item";
          item.innerHTML = '<span class="dot" style="background:'+(isActive?stage.color:"rgba(122,158,155,0.3)")+'"></span><span style="color:'+(isActive?stage.color:"#7a9e9b")+'">'+stage.name+'</span>'+(isActive?'<span style="margin-left:auto;font-size:10px;opacity:0.6">✓</span>':"");
          item.addEventListener("click", function(){
            if(self._activeStages.has(stage.id)){ if(self._activeStages.size>1) self._activeStages.delete(stage.id); }
            else self._activeStages.add(stage.id);
            self._render();
          });
          dd.appendChild(item);
        });
        fw.appendChild(dd);
      }
      toolbar.appendChild(fw);
      // View toggle
      var vt = document.createElement("div"); vt.className = "kt-view-toggle";
      var gb = document.createElement("button"); gb.className = "kt-view-btn"+(this._viewMode==="grid"?" active":""); gb.innerHTML = ICONS.grid(14); gb.title = "Naptár";
      gb.addEventListener("click", function(){ self._viewMode="grid"; self._render(); });
      var lb = document.createElement("button"); lb.className = "kt-view-btn"+(this._viewMode==="list"?" active":""); lb.innerHTML = ICONS.list(14); lb.title = "Lista";
      lb.addEventListener("click", function(){ self._viewMode="list"; self._render(); });
      vt.appendChild(gb); vt.appendChild(lb);
      toolbar.appendChild(vt);
      header.appendChild(toolbar);
      return header;
    };

    _renderKedvencekPanel() {
      var self = this;
      var panel = document.createElement("div"); panel.className = "kt-panel";
      var favArtists = this._artists.filter(function(a){ return self._favourites.has(a.id); }).sort(function(a,b){ return a.startTime-b.startTime; });
      if (!favArtists.length) {
        panel.innerHTML = '<div class="kt-empty">Még nincs kedvenc. Kattints a ♥ gombra egy előadónál.</div>';
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
            var stage = STAGES.find(function(s){return s.name===artist.stage;});
            var color = stage ? stage.color : "#dcea75";
            var row = document.createElement("div"); row.className = "kt-panel-row";
            row.innerHTML = '<div class="bar" style="background:'+color+'"></div><div class="info"><div class="name" style="color:'+color+'">'+artist.name+'</div><div class="meta">'+formatTime(artist.startTime)+'–'+formatTime(artist.endTime)+' · '+artist.stage+'</div></div><div class="actions"><a href="'+getArtistPageUrl(artist)+'" target="_blank" rel="noopener noreferrer" title="Előadó oldala">'+ICONS.external(13)+'</a><button class="fav-on" data-id="'+artist.id+'" style="color:#e86b5a">'+ICONS.heart("#e86b5a",13)+'</button></div>';
            row.querySelector("button").addEventListener("click", function(e){ e.stopPropagation(); self._toggleFav(artist.id); });
            row.querySelector(".info").addEventListener("click", function(){ self._jumpToArtist(artist); self._showKedvencek=false; self._render(); });
            list.appendChild(row);
          });
        });
        panel.appendChild(list);
      }
      var footer = document.createElement("div"); footer.className = "kt-panel-footer";
      var disc = document.createElement("p"); disc.className = "kt-panel-disclaimer";
      disc.textContent = "A kedvenceid a böngésződben tárolódnak és nem szinkronizálódnak az eszközeid között. A Megosztás linkkel be tudod másolni a kedvenceidet más böngészőbe.";
      footer.appendChild(disc);
      if (favArtists.length) {
        var actions = document.createElement("div"); actions.className = "kt-panel-actions";
        var calBtn = document.createElement("button"); calBtn.className = "kt-action-btn";
        calBtn.innerHTML = ICONS.calendar(12) + " Naptárba";
        calBtn.addEventListener("click", function(){ downloadAllICS(favArtists); });
        var shareBtn = document.createElement("button"); shareBtn.className = "kt-action-btn";
        shareBtn.innerHTML = ICONS.share(12) + " Megosztás";
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
      if (!results.length) { panel.innerHTML = '<div class="kt-empty">Nincs találat: „'+this._searchQuery+'"</div>'; return panel; }
      var list = document.createElement("div"); list.className = "kt-panel-list";
      results.forEach(function(artist){
        var stage = STAGES.find(function(s){return s.name===artist.stage;});
        var color = stage ? stage.color : "#dcea75";
        var isFav = self._favourites.has(artist.id);
        var row = document.createElement("div"); row.className = "kt-panel-row";
        row.innerHTML = '<div class="bar" style="background:'+color+'"></div><div class="info"><div class="name" style="color:'+color+'">'+artist.name+'</div><div class="meta">'+formatTime(artist.startTime)+'–'+formatTime(artist.endTime)+' · '+artist.stage+(artist.genre?' · '+artist.genre:'')+'</div></div><div class="actions"><button class="'+(isFav?"fav-on":"")+'" data-id="'+artist.id+'" style="color:'+(isFav?"#e86b5a":"#7a9e9b")+'">'+ICONS.heart(isFav?"#e86b5a":"none",13)+'</button><a href="'+getArtistPageUrl(artist)+'" target="_blank" rel="noopener noreferrer" title="Előadó oldala">'+ICONS.external(13)+'</a></div>';
        row.querySelector("button").addEventListener("click", function(e){ e.stopPropagation(); self._toggleFav(artist.id); });
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
        empty.innerHTML = (this._filterFavourites?"Ezen a napon nincs kedvenc előadód.":"Ezen a napon nincs program.")+'<br><button>Összes program mutatása</button>';
        empty.querySelector("button").addEventListener("click", function(){ self._activeStages=new Set(STAGES.map(function(s){return s.id;})); self._filterFavourites=false; self._render(); });
        wrap.appendChild(empty); return wrap;
      }
      visible.forEach(function(artist){
        var stage = STAGES.find(function(s){return s.name===artist.stage;});
        var color = stage ? stage.color : "#dcea75";
        var isFav = self._favourites.has(artist.id);
        var row = document.createElement("div"); row.className = "kt-list-row";
        row.innerHTML = '<div class="bar" style="background:'+color+'"></div><div class="info"><div class="name" style="color:'+color+'">'+artist.name+'</div><div class="time">'+formatTime(artist.startTime)+'–'+formatTime(artist.endTime)+'</div><div class="stage-label" style="color:'+color+'55">'+artist.stage+'</div></div><button class="fav-btn'+(isFav?" on":"")+'" data-id="'+artist.id+'">'+ICONS.heart(isFav?"#e86b5a":"none",18)+'</button>';
        row.querySelector(".fav-btn").addEventListener("click", function(e){ e.stopPropagation(); self._toggleFav(artist.id); });
        row.addEventListener("click", function(){ window.open(getArtistPageUrl(artist),"_blank","noopener,noreferrer"); });
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
        empty.innerHTML = (this._filterFavourites?"Ezen a napon nincs kedvenc előadód.":"Ezen a napon nincs program.")+'<br><button>Összes program mutatása</button>';
        empty.querySelector("button").addEventListener("click", function(){ self._activeStages=new Set(STAGES.map(function(s){return s.id;})); self._filterFavourites=false; self._render(); });
        wrap.appendChild(empty); return wrap;
      }
      var scroll = document.createElement("div"); scroll.className = "kt-grid-scroll";
      scroll.addEventListener("click", function(){ if(self._tappedBlockId){ self._tappedBlockId=null; self._render(); }});
      var inner = document.createElement("div"); inner.className = "kt-grid-inner";
      inner.style.minWidth = isMobile ? (visibleStages.length*140+48)+"px" : "auto";
      // Time axis
      var ta = document.createElement("div"); ta.className = "kt-time-axis"; ta.style.width = isMobile?"44px":"64px";
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
      var endH = toFestivalHour(artist.endTime);
      var top = (startH - DAY_START_HOUR) * hh;
      var height = Math.max((endH - startH) * hh - 2, 24);
      var isShort = height < 52, isTiny = height < 36;
      var isFav = this._favourites.has(artist.id);
      var isTapped = this._tappedBlockId === artist.id;
      var block = document.createElement("div");
      block.className = "kt-block" + (isTapped ? " tapped" : "");
      block.style.cssText = "top:"+top+"px;height:"+height+"px;background:"+stage.color+"18;outline:"+(isFav?"1px solid "+stage.color+"88":"none")+";";
      block.setAttribute("data-id", artist.id);
      // Content
      var content = document.createElement("div"); content.className = "kt-block-content"+(isShort?" row":"");
      var nameEl = document.createElement("div"); nameEl.className = "kt-block-name"; nameEl.style.cssText = "color:"+stage.color+";font-size:"+(isShort?"11px":"12px"); nameEl.textContent = artist.name;
      var inner = document.createElement("div"); inner.style.cssText = "min-width:0;flex:1;"; inner.appendChild(nameEl);
      if (!isShort && artist.genre) { var ge=document.createElement("div"); ge.className="kt-block-genre"; ge.textContent=artist.genre; inner.appendChild(ge); }
      content.appendChild(inner);
      if (!isTiny) { var te=document.createElement("div"); te.className="kt-block-time"; te.style.color=stage.color+"99"; te.textContent=formatTime(artist.startTime)+"–"+formatTime(artist.endTime); content.appendChild(te); }
      block.appendChild(content);
      // Overlay
      var ov = document.createElement("div"); ov.className = "kt-block-overlay"; ov.style.background = stage.color+"dd";
      var nb = document.createElement("button"); nb.className = "kt-block-overlay-name"; nb.textContent = artist.name;
      nb.addEventListener("click", function(e){ e.stopPropagation(); window.open(getArtistPageUrl(artist),"_blank","noopener,noreferrer"); });
      ov.appendChild(nb);
      if (!isTiny) { var ot=document.createElement("div"); ot.className="kt-block-overlay-time"; ot.textContent=formatTime(artist.startTime)+" – "+formatTime(artist.endTime); ov.appendChild(ot); }
      var fp = document.createElement("button"); fp.className = "kt-fav-pill "+(isFav?"on":"off");
      fp.innerHTML = ICONS.heart(isFav?"#fff":"none",12)+" "+(isFav?"Kedvenc":"Kedvencnek");
      fp.addEventListener("click", function(e){ e.stopPropagation(); self._toggleFav(artist.id); });
      ov.appendChild(fp); block.appendChild(ov);
      block.addEventListener("click", function(e){ e.stopPropagation(); self._tappedBlockId=(self._tappedBlockId===artist.id)?null:artist.id; self._render(); });
      return block;
    };

    _createNowLine(hh) {
      var now = new Date();
      var fh = toFestivalHour(now);
      if (fh < DAY_START_HOUR || fh >= DAY_END_HOUR) return null;
      var top = (fh - DAY_START_HOUR) * hh + 40;
      var line = document.createElement("div"); line.className = "kt-now-line"; line.style.top = top+"px";
      line.innerHTML = '<div class="kt-now-bar"><div class="kt-now-dot"></div><div class="kt-now-label">MOST</div></div>';
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

    _getVisibleArtists() {
      var self = this;
      return this._artists.filter(function(a){
        if (getFestivalDayId(a.startTime) !== self._activeDay) return false;
        var stage = STAGES.find(function(s){return s.name===a.stage;});
        if (!stage || !self._activeStages.has(stage.id)) return false;
        if (self._filterFavourites && !self._favourites.has(a.id)) return false;
        return true;
      });
    };

    _getVisibleStages(visibleArtists) {
      var self = this;
      var allActive = STAGES.filter(function(s){return self._activeStages.has(s.id);});
      if (!this._filterFavourites) return allActive;
      var stagesWithArtists = new Set(visibleArtists.map(function(a){return a.stage;}));
      return allActive.filter(function(s){return stagesWithArtists.has(s.name);});
    };

    _toggleFav(id) {
      if (this._favourites.has(id)) this._favourites.delete(id);
      else this._favourites.add(id);
      writeFavCookie(this._favourites);
      this._render();
    };

    _jumpToArtist(artist) {
      var self = this;
      var dayId = getFestivalDayId(artist.startTime);
      if (dayId) this._activeDay = dayId;
      this._viewMode = "grid";
      this._render();
      setTimeout(function(){
        var scroll = self._shadow.querySelector(".kt-grid-scroll");
        if (!scroll) return;
        var hh = window.innerWidth < 768 ? MOBILE_HOUR_HEIGHT_PX : HOUR_HEIGHT_PX;
        scroll.scrollTo({ top: Math.max(0, (toFestivalHour(artist.startTime)-DAY_START_HOUR)*hh-80), behavior:"smooth" });
        var block = self._shadow.querySelector('[data-id="'+artist.id+'"]');
        if (block) { block.style.outline="2px solid #dcea75"; setTimeout(function(){block.style.outline="";},1200); }
      }, 80);
    };

    _shareFavourites() {
      var encoded = encodeFavs(this._favourites);
      if (!encoded) return;
      var base = this._parentUrl ? this._parentUrl.split("#")[0] : (window.location.origin + window.location.pathname);
      var url = base + "#fav:" + encoded;
      var self = this;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function(){ self._showToast("Link másolva a vágólapra!"); }).catch(function(){ window.prompt("Másold ki ezt a linket:", url); });
      } else { window.prompt("Másold ki ezt a linket:", url); }
    };

    _showToast(msg) {
      var toast = document.createElement("div");
      toast.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#dcea75;color:#062322;padding:8px 18px;font-family:'Pacaembu',sans-serif;font-size:13px;z-index:9999;pointer-events:none;";
      toast.textContent = msg;
      document.body.appendChild(toast);
      setTimeout(function(){ toast.remove(); }, 3000);
    };

  }

  if (!customElements.get("kolorado-timetable")) {
    customElements.define("kolorado-timetable", KoloradoTimetable);
  }
})();
