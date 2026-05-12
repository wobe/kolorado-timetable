// ============================================================
// Kolorádó Festival Timetable — Wix Custom Element
// A self-contained Web Component for embedding in Wix sites.
// Receives lineup data via the "lineup-data" attribute (JSON).
//
// Interaction:
//   - HOVER an artist block → glow effect + "Naptárba" (Add to Calendar) button
//   - CLICK an artist block → navigate to their page on kolorado.hu
// ============================================================

const KOLORADO_BASE_URL = "https://www.kolorado.hu";

const STAGES = [
  { id: "nagyszinpad", name: "Nagyszínpad", color: "#dcea75" },
  { id: "balterem", name: "Bálterem", color: "#5ab8e8" },
  { id: "toszinpad", name: "Tószínpad", color: "#e8a838" },
  { id: "hangar", name: "Hangár", color: "#a87be8" },
  { id: "platanos", name: "Platános", color: "#e86b5a" },
  { id: "listeningbar", name: "Listening Bar", color: "#5ae8a8" },
  { id: "healing", name: "Healing", color: "#e8c85a" },
  { id: "ring", name: "Ring", color: "#e85aab" },
];

const FESTIVAL_DAYS = [
  { id: "wed", label: "Szerda", shortLabel: "Sze", date: "2026-07-15" },
  { id: "thu", label: "Csütörtök", shortLabel: "Csüt", date: "2026-07-16" },
  { id: "fri", label: "Péntek", shortLabel: "Pén", date: "2026-07-17" },
  { id: "sat", label: "Szombat", shortLabel: "Szo", date: "2026-07-18" },
];

const DAY_START_HOUR = 10;
const DAY_END_HOUR = 31;
const HOUR_HEIGHT = 80;
const MOBILE_HOUR_HEIGHT = 60;

class KoloradoTimetable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._artists = [];
    this._activeDay = "wed";
    this._activeStages = new Set(STAGES.map((s) => s.id));
    this._isMobile = window.innerWidth < 768;
    this._resizeHandler = () => {
      const wasMobile = this._isMobile;
      this._isMobile = window.innerWidth < 768;
      if (wasMobile !== this._isMobile) this.render();
    };
  }

  static get observedAttributes() {
    return ["lineup-data"];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === "lineup-data" && newVal) {
      try {
        const raw = JSON.parse(newVal);
        this._artists = raw.map((a) => ({
          ...a,
          startTime: new Date(a.startTime),
          endTime: new Date(a.endTime),
        }));
        this.render();
      } catch (e) {
        console.error("Kolorádó Timetable: Failed to parse lineup data:", e);
      }
    }
  }

  connectedCallback() {
    window.addEventListener("resize", this._resizeHandler);
    this.render();
  }

  disconnectedCallback() {
    window.removeEventListener("resize", this._resizeHandler);
  }

  // --- Utility functions ---

  toFestivalHour(date) {
    const h = date.getHours();
    const m = date.getMinutes();
    const decimal = h + m / 60;
    return h < DAY_START_HOUR ? 24 + decimal : decimal;
  }

  formatTime(date) {
    return date.toLocaleTimeString("hu-HU", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  getFestivalDayId(date) {
    const h = date.getHours();
    const d = new Date(date);
    if (h < DAY_START_HOUR) d.setDate(d.getDate() - 1);
    const dateStr = d.toISOString().split("T")[0];
    const day = FESTIVAL_DAYS.find((fd) => fd.date === dateStr);
    return day ? day.id : null;
  }

  getArtistPageUrl(artist) {
    if (artist.url) {
      return `${KOLORADO_BASE_URL}${artist.url}`;
    }
    // Fallback: generate slug from name
    const slug = artist.name
      .toLowerCase()
      .replace(/[áà]/g, "a")
      .replace(/[éè]/g, "e")
      .replace(/[íì]/g, "i")
      .replace(/[óòö]/g, "o")
      .replace(/[őô]/g, "o")
      .replace(/[úùü]/g, "u")
      .replace(/[űû]/g, "u")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return `${KOLORADO_BASE_URL}/lineup/${slug}`;
  }

  generateICS(artist) {
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (d) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    const now = new Date();
    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Kolorádó Fesztivál//Timetable//HU",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `DTSTART:${fmt(artist.startTime)}`,
      `DTEND:${fmt(artist.endTime)}`,
      `DTSTAMP:${fmt(now)}`,
      `UID:${artist.id}@kolorado.hu`,
      `SUMMARY:${artist.name}`,
      `DESCRIPTION:${artist.name} @ ${artist.stage} - Kolorádó Fesztivál 2026`,
      `LOCATION:${artist.stage}\\, Kolorádó Fesztivál\\, Káloz`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
  }

  downloadICS(artist) {
    const ics = this.generateICS(artist);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artist.name
      .replace(/[^a-zA-Z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰ ]/g, "")
      .replace(/\s+/g, "_")}_kolorado.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- Render ---

  render() {
    const hourHeight = this._isMobile ? MOBILE_HOUR_HEIGHT : HOUR_HEIGHT;
    const totalHeight = (DAY_END_HOUR - DAY_START_HOUR) * hourHeight;
    const visibleStages = STAGES.filter((s) => this._activeStages.has(s.id));

    const filteredArtists = this._artists.filter((a) => {
      const dayId = this.getFestivalDayId(a.startTime);
      if (dayId !== this._activeDay) return false;
      const stage = STAGES.find((s) => s.name === a.stage);
      return stage && this._activeStages.has(stage.id);
    });

    const timeLabels = [];
    for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
      const dh = h >= 24 ? h - 24 : h;
      timeLabels.push({
        hour: h,
        label: `${String(dh).padStart(2, "0")}:00`,
      });
    }

    // NOW line position
    const now = new Date();
    const nowFestivalHour = this.toFestivalHour(now);
    const showNow =
      nowFestivalHour >= DAY_START_HOUR && nowFestivalHour < DAY_END_HOUR;
    const nowTop = showNow
      ? (nowFestivalHour - DAY_START_HOUR) * hourHeight + 40
      : -100;

    this.shadowRoot.innerHTML = `
      <style>${this.getStyles()}</style>
      <div class="timetable-root">
        <header class="header">
          <div class="header-inner">
            <div class="title-row">
              <h1 class="title">KOLORÁDÓ <span class="subtitle">menetrend</span></h1>
            </div>
            <div class="day-tabs">
              ${FESTIVAL_DAYS.map(
                (d) => `
                <button class="day-tab ${this._activeDay === d.id ? "active" : ""}" data-day="${d.id}">
                  <span class="day-full">${d.label}</span>
                  <span class="day-short">${d.shortLabel}</span>
                </button>
              `
              ).join("")}
            </div>
            <div class="stage-filters">
              ${STAGES.map(
                (s) => `
                <button class="stage-filter ${this._activeStages.has(s.id) ? "active" : ""}" 
                        data-stage="${s.id}" 
                        style="--stage-color: ${s.color}">
                  <span class="stage-dot"></span>
                  ${s.name}
                </button>
              `
              ).join("")}
            </div>
          </div>
        </header>
        <div class="grid-wrapper">
          <div class="grid-scroll">
            <div class="grid-flex">
              <div class="time-axis">
                <div class="corner-spacer"></div>
                <div class="time-labels" style="height:${totalHeight}px">
                  ${timeLabels
                    .map(
                      (t) => `
                    <div class="time-label" style="top:${(t.hour - DAY_START_HOUR) * hourHeight}px">
                      <span>${t.label}</span>
                    </div>
                  `
                    )
                    .join("")}
                </div>
              </div>
              <div class="stages-area">
                ${showNow ? `<div class="now-line" style="top:${nowTop}px"><div class="now-dot"></div><span class="now-label">MOST</span><div class="now-bar"></div></div>` : ""}
                ${visibleStages
                  .map((stage, idx) => {
                    const stageArtists = filteredArtists.filter(
                      (a) => a.stage === stage.name
                    );
                    return `
                    <div class="stage-column" style="${idx < visibleStages.length - 1 ? "border-right: 1px solid #1a6b6620;" : ""}">
                      <div class="stage-header">
                        <span style="color:${stage.color}">${stage.name}</span>
                      </div>
                      <div class="events-area" style="height:${totalHeight}px">
                        ${timeLabels
                          .map(
                            (t) =>
                              `<div class="grid-line" style="top:${(t.hour - DAY_START_HOUR) * hourHeight}px"></div>`
                          )
                          .join("")}
                        ${stageArtists
                          .map((artist) => {
                            const startH = this.toFestivalHour(artist.startTime);
                            const endH = this.toFestivalHour(artist.endTime);
                            const top = (startH - DAY_START_HOUR) * hourHeight;
                            const height = Math.max((endH - startH) * hourHeight - 2, 24);
                            const isShort = height < 52;
                            const isTiny = height < 36;
                            return `
                            <div class="artist-block" 
                                 data-artist-id="${artist.id}"
                                 style="top:${top}px;height:${height}px;background:${stage.color}18;border-left:3px solid ${stage.color}">
                              <div class="artist-content ${isShort ? "short" : ""}">
                                <div class="artist-info">
                                  <p class="artist-name" style="color:${stage.color}">${artist.name}</p>
                                  ${!isShort && artist.genre ? `<p class="artist-genre">${artist.genre}</p>` : ""}
                                </div>
                                ${!isTiny ? `<p class="artist-time" style="color:${stage.color}99">${this.formatTime(artist.startTime)}–${this.formatTime(artist.endTime)}</p>` : ""}
                              </div>
                              <div class="artist-hover-overlay" style="background:${stage.color}dd">
                                <p class="overlay-name">${artist.name}</p>
                                ${!isTiny ? `<p class="overlay-time">${this.formatTime(artist.startTime)} – ${this.formatTime(artist.endTime)}</p>` : ""}
                                <div class="overlay-actions">
                                  <button class="ics-btn" data-ics-id="${artist.id}">📅 Naptárba</button>
                                </div>
                              </div>
                            </div>
                          `;
                          })
                          .join("")}
                      </div>
                    </div>
                  `;
                  })
                  .join("")}
              </div>
            </div>
          </div>
        </div>
        ${filteredArtists.length === 0 ? `<div class="empty-state"><p>Ezen a napon nincs program a kiválasztott színpadokon.</p></div>` : ""}
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    this.shadowRoot.querySelectorAll(".day-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        this._activeDay = btn.dataset.day;
        this.render();
      });
    });

    this.shadowRoot.querySelectorAll(".stage-filter").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.stage;
        if (this._activeStages.has(id)) {
          if (this._activeStages.size > 1) this._activeStages.delete(id);
        } else {
          this._activeStages.add(id);
        }
        this.render();
      });
    });

    // Click on artist block → navigate to artist page
    this.shadowRoot.querySelectorAll(".artist-block").forEach((el) => {
      el.addEventListener("click", (e) => {
        // Don't navigate if clicking the calendar button
        if (e.target.closest(".ics-btn")) return;
        const artist = this._artists.find((a) => a.id === el.dataset.artistId);
        if (artist) {
          const url = this.getArtistPageUrl(artist);
          window.open(url, "_blank", "noopener,noreferrer");
        }
      });
    });

    // Calendar button → download ICS
    this.shadowRoot.querySelectorAll(".ics-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const artist = this._artists.find((a) => a.id === btn.dataset.icsId);
        if (artist) this.downloadICS(artist);
      });
    });
  }

  getStyles() {
    return `
      @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
      
      * { margin: 0; padding: 0; box-sizing: border-box; }
      :host { display: block; width: 100%; font-family: 'DM Sans', sans-serif; }
      
      .timetable-root { background: #062322; min-height: 100%; color: #e8e6d8; }
      
      .header { position: sticky; top: 0; z-index: 40; background: #062322ee; backdrop-filter: blur(12px); border-bottom: 1px solid #1a6b6630; }
      .header-inner { max-width: 1440px; margin: 0 auto; padding: 12px 16px; }
      
      .title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
      .title { font-family: 'Quicksand', sans-serif; font-size: 22px; font-weight: 700; color: #dcea75; letter-spacing: -0.02em; }
      .subtitle { color: #e8e6d880; font-weight: 400; font-size: 14px; margin-left: 8px; }
      
      .day-tabs { display: flex; gap: 4px; margin-bottom: 8px; }
      .day-tab { padding: 8px 16px; border-radius: 8px; border: none; background: transparent; color: #e8e6d866; font-family: 'Quicksand', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
      .day-tab:hover { color: #e8e6d8cc; background: #0a3533; }
      .day-tab.active { background: #dcea75; color: #062322; }
      .day-short { display: none; }
      
      .stage-filters { display: flex; flex-wrap: wrap; gap: 6px; }
      .stage-filter { display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; border: 1px solid #1a6b6630; background: transparent; color: #7a9e9b; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
      .stage-filter.active { background: color-mix(in srgb, var(--stage-color) 12%, transparent); border-color: color-mix(in srgb, var(--stage-color) 40%, transparent); color: var(--stage-color); }
      .stage-dot { width: 8px; height: 8px; border-radius: 50%; background: #7a9e9b44; flex-shrink: 0; }
      .stage-filter.active .stage-dot { background: var(--stage-color); }
      
      .grid-wrapper { max-width: 1440px; margin: 0 auto; padding: 16px 16px 32px; }
      .grid-scroll { overflow: auto; border-radius: 12px; border: 1px solid #1a6b6625; max-height: calc(100vh - 200px); }
      .grid-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
      .grid-scroll::-webkit-scrollbar-track { background: #0a3533; }
      .grid-scroll::-webkit-scrollbar-thumb { background: #1a6b66; border-radius: 3px; }
      
      .grid-flex { display: flex; }
      
      .time-axis { position: sticky; left: 0; z-index: 20; flex-shrink: 0; width: 64px; background: #062322; border-right: 1px solid #1a6b6625; }
      .corner-spacer { position: sticky; top: 0; z-index: 30; height: 40px; background: #062322; border-bottom: 1px solid #1a6b6625; }
      .time-labels { position: relative; }
      .time-label { position: absolute; left: 0; right: 0; display: flex; align-items: flex-start; justify-content: flex-end; padding-right: 8px; }
      .time-label span { font-size: 11px; color: #7a9e9b; transform: translateY(-50%); font-family: 'DM Sans', sans-serif; }
      
      .stages-area { display: flex; flex: 1; position: relative; }
      .stage-column { flex: 1; min-width: 160px; }
      .stage-header { position: sticky; top: 0; z-index: 20; height: 40px; display: flex; align-items: center; justify-content: center; background: #062322ee; backdrop-filter: blur(8px); border-bottom: 1px solid #1a6b6620; }
      .stage-header span { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; font-family: 'Quicksand', sans-serif; }
      
      .events-area { position: relative; }
      .grid-line { position: absolute; left: 0; right: 0; border-top: 1px solid #1a6b6612; }
      
      .artist-block { position: absolute; left: 4px; right: 4px; border-radius: 6px; overflow: hidden; cursor: pointer; transition: all 0.2s ease-out; }
      .artist-block:hover { box-shadow: 0 0 12px #dcea7544, 0 0 24px #dcea7522; transform: scale(1.01); z-index: 10; }
      
      .artist-content { height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 4px 8px; }
      .artist-content.short { flex-direction: row; align-items: center; gap: 8px; }
      .artist-info { min-width: 0; }
      .artist-name { font-family: 'Quicksand', sans-serif; font-weight: 600; font-size: 13px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .artist-content.short .artist-name { font-size: 12px; }
      .artist-genre { font-size: 10px; color: #e8e6d880; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .artist-time { font-size: 10px; white-space: nowrap; flex-shrink: 0; }
      
      /* Hover overlay — shown on hover, hidden by default */
      .artist-hover-overlay {
        position: absolute;
        inset: 0;
        z-index: 20;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 8px;
        border-radius: 6px;
        opacity: 0;
        transition: opacity 0.2s ease-out;
      }
      .artist-block:hover .artist-hover-overlay {
        opacity: 1;
      }
      
      .overlay-name { font-family: 'Quicksand', sans-serif; font-weight: 700; font-size: 14px; color: #062322; text-align: center; line-height: 1.2; }
      .overlay-time { font-size: 12px; color: #062322cc; text-align: center; }
      .overlay-actions { display: flex; gap: 8px; margin-top: 2px; }
      .ics-btn { padding: 4px 10px; border-radius: 999px; border: none; background: #062322; color: #dcea75; font-size: 11px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: transform 0.15s; }
      .ics-btn:hover { transform: scale(1.05); }
      
      .now-line { position: absolute; left: 0; right: 0; z-index: 30; pointer-events: none; animation: nowPulse 2s ease-in-out infinite; }
      .now-bar { position: absolute; left: 0; right: 0; top: 0; height: 2px; background: #dcea75; }
      .now-dot { position: absolute; left: -4px; top: -5px; width: 12px; height: 12px; border-radius: 50%; background: #dcea75; box-shadow: 0 0 8px #dcea75; }
      .now-label { position: absolute; left: 14px; top: -9px; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: #dcea75; color: #062322; font-family: 'DM Sans', sans-serif; }
      
      @keyframes nowPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      .empty-state { text-align: center; padding: 80px 16px; color: #7a9e9b; font-family: 'Quicksand', sans-serif; font-size: 14px; }
      
      @media (max-width: 767px) {
        .time-axis { width: 48px; }
        .stage-column { min-width: 140px; }
        .day-full { display: none; }
        .day-short { display: inline; }
        .day-tab { padding: 6px 12px; font-size: 13px; }
        .title { font-size: 18px; }
        .artist-name { font-size: 11px; }
      }
    `;
  }
}

customElements.define("kolorado-timetable", KoloradoTimetable);
