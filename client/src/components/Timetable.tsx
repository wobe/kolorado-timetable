// ============================================================
// Kolorádó Festival Timetable — Main Grid Component
// Design: Neon Grid on dark teal (#062322) with lime glow (#dcea75)
// Font: Quicksand (display) + DM Sans (body)
// Interaction: hover → glow + calendar, click → navigate to artist page
// ============================================================

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { CalendarPlus, ChevronDown, Filter, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  type Artist,
  type Stage,
  FESTIVAL_DAYS,
  STAGES,
  MOCK_ARTISTS,
  DAY_START_HOUR,
  DAY_END_HOUR,
  HOUR_HEIGHT_PX,
  MOBILE_HOUR_HEIGHT_PX,
  toFestivalHour,
  formatTime,
  getFestivalDayId,
  downloadICS,
  getTimeLabels,
  getArtistPageUrl,
} from "@/lib/timetable-data";

// ---- Artist Block (single event cell) ----

interface ArtistBlockProps {
  artist: Artist;
  stage: Stage;
  hourHeight: number;
}

function ArtistBlock({ artist, stage, hourHeight }: ArtistBlockProps) {
  const startHour = toFestivalHour(artist.startTime);
  const endHour = toFestivalHour(artist.endTime);
  const top = (startHour - DAY_START_HOUR) * hourHeight;
  const height = Math.max((endHour - startHour) * hourHeight - 2, 24);
  const isShort = height < 52;
  const isTiny = height < 36;

  const handleCalendarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    downloadICS(artist);
  };

  const handleBlockClick = () => {
    const url = getArtistPageUrl(artist);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="artist-block group absolute left-1 right-1 rounded-md overflow-hidden cursor-pointer select-none"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: `${stage.color}18`,
        borderLeft: `3px solid ${stage.color}`,
      }}
      onClick={handleBlockClick}
    >
      {/* Default content */}
      <div className={`h-full flex ${isShort ? "flex-row items-center gap-2" : "flex-col justify-between"} px-2 py-1`}>
        <div className="min-w-0">
          <p
            className="font-semibold truncate leading-tight"
            style={{
              fontFamily: "'Quicksand', sans-serif",
              fontSize: isShort ? "12px" : "13px",
              color: stage.color,
            }}
          >
            {artist.name}
          </p>
          {!isShort && artist.genre && (
            <p className="text-[10px] text-foreground/50 truncate mt-0.5">
              {artist.genre}
            </p>
          )}
        </div>
        {!isTiny && (
          <p
            className="text-[10px] whitespace-nowrap shrink-0"
            style={{ color: `${stage.color}99` }}
          >
            {formatTime(artist.startTime)}–{formatTime(artist.endTime)}
          </p>
        )}
      </div>

      {/* Hover overlay with glow + calendar button */}
      <div
        className="absolute inset-0 z-20 rounded-md flex flex-col justify-center items-center gap-1.5 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ backgroundColor: `${stage.color}dd` }}
      >
        <p
          className="font-bold text-sm text-center leading-tight"
          style={{ color: "#062322", fontFamily: "'Quicksand', sans-serif" }}
        >
          {artist.name}
        </p>
        {!isTiny && (
          <p className="text-xs text-center" style={{ color: "#062322cc" }}>
            {formatTime(artist.startTime)} – {formatTime(artist.endTime)}
          </p>
        )}
        <div className="flex gap-2 mt-0.5">
          <button
            onClick={handleCalendarClick}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all hover:scale-105 active:scale-95"
            style={{
              backgroundColor: "#062322",
              color: stage.color,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <CalendarPlus size={12} />
            Naptárba
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ---- NOW line overlay (single instance spanning all stage columns) ----

function NowLineOverlay({ hourHeight }: { hourHeight: number }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const festivalHour = toFestivalHour(now);
  if (festivalHour < DAY_START_HOUR || festivalHour >= DAY_END_HOUR) return null;

  // +40px for the sticky stage header height
  const top = (festivalHour - DAY_START_HOUR) * hourHeight + 40;

  return (
    <div
      className="now-line absolute left-0 right-0 z-30 pointer-events-none"
      style={{ top: `${top}px` }}
    >
      <div className="relative">
        <div className="absolute left-0 right-0 h-[2px] bg-kolo-lime" />
        <div
          className="absolute -left-1 -top-[5px] w-3 h-3 rounded-full bg-kolo-lime"
          style={{ boxShadow: "0 0 8px #dcea75" }}
        />
        <span
          className="absolute left-4 -top-[9px] text-[10px] font-bold px-1.5 py-0.5 rounded bg-kolo-lime text-kolo-bg"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          MOST
        </span>
      </div>
    </div>
  );
}

// ---- Main Timetable ----

export default function Timetable() {
  const [activeDay, setActiveDay] = useState(FESTIVAL_DAYS[0].id);
  const [activeStages, setActiveStages] = useState<Set<string>>(
    new Set(STAGES.map((s) => s.id))
  );
  const [showStageFilter, setShowStageFilter] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const hourHeight = isMobile ? MOBILE_HOUR_HEIGHT_PX : HOUR_HEIGHT_PX;
  const timeLabels = useMemo(() => getTimeLabels(), []);
  const totalHeight = (DAY_END_HOUR - DAY_START_HOUR) * hourHeight;

  // Filter artists for the active day and visible stages
  const visibleArtists = useMemo(() => {
    return MOCK_ARTISTS.filter((a) => {
      const dayId = getFestivalDayId(a.startTime);
      if (dayId !== activeDay) return false;
      const stageObj = STAGES.find((s) => s.name === a.stage);
      if (!stageObj || !activeStages.has(stageObj.id)) return false;
      return true;
    });
  }, [activeDay, activeStages]);

  // Group by stage
  const visibleStages = useMemo(() => {
    return STAGES.filter((s) => activeStages.has(s.id));
  }, [activeStages]);

  const artistsByStage = useMemo(() => {
    const map = new Map<string, Artist[]>();
    for (const stage of visibleStages) {
      map.set(
        stage.id,
        visibleArtists.filter((a) => a.stage === stage.name)
      );
    }
    return map;
  }, [visibleArtists, visibleStages]);

  const toggleStage = useCallback((stageId: string) => {
    setActiveStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        if (next.size > 1) next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  }, []);

  return (
    <div className="w-full min-h-screen bg-kolo-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-kolo-bg/95 backdrop-blur-md border-b border-kolo-teal/20">
        <div className="container py-3">
          {/* Title row */}
          <div className="flex items-center justify-between mb-3">
            <h1
              className="text-xl md:text-2xl font-bold tracking-tight text-kolo-lime"
              style={{ fontFamily: "'Quicksand', sans-serif" }}
            >
              KOLORÁDÓ
              <span className="text-foreground/60 font-normal text-sm md:text-base ml-2">
                menetrend
              </span>
            </h1>
            <button
              onClick={() => setShowStageFilter(!showStageFilter)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all md:hidden"
              style={{
                borderColor: "#1a6b6660",
                color: "#dcea75",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <Filter size={14} />
              Színpadok
              <ChevronDown size={12} className={`transition-transform ${showStageFilter ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Day tabs */}
          <div className="flex gap-1 mb-2">
            {FESTIVAL_DAYS.map((day) => (
              <button
                key={day.id}
                onClick={() => {
                  setActiveDay(day.id);
                }}
                className={`relative px-3 md:px-5 py-2 rounded-lg text-sm font-semibold
                  transition-all duration-200
                  ${
                    activeDay === day.id
                      ? "text-kolo-bg"
                      : "text-foreground/50 hover:text-foreground/80 hover:bg-kolo-bg-light"
                  }`}
                style={{
                  fontFamily: "'Quicksand', sans-serif",
                  backgroundColor: activeDay === day.id ? "#dcea75" : "transparent",
                }}
              >
                <span className="hidden md:inline">{day.label}</span>
                <span className="md:hidden">{day.shortLabel}</span>
                {activeDay === day.id && (
                  <motion.div
                    layoutId="dayIndicator"
                    className="absolute inset-0 rounded-lg bg-kolo-lime -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Stage filters — desktop always visible, mobile toggleable */}
          <div className={`flex flex-wrap gap-1.5 ${isMobile && !showStageFilter ? "hidden" : ""}`}>
            {STAGES.map((stage) => {
              const isActive = activeStages.has(stage.id);
              return (
                <button
                  key={stage.id}
                  onClick={() => toggleStage(stage.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    backgroundColor: isActive ? `${stage.color}22` : "transparent",
                    borderWidth: "1px",
                    borderColor: isActive ? `${stage.color}66` : "#1a6b6630",
                    color: isActive ? stage.color : "#7a9e9b",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: isActive ? stage.color : "#7a9e9b44",
                    }}
                  />
                  {stage.name}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Grid */}
      <div className="container pb-8">
        <div
          ref={gridRef}
          className="timetable-scroll overflow-x-auto overflow-y-auto mt-4 rounded-xl border border-kolo-teal/15"
          style={{ maxHeight: "calc(100vh - 200px)" }}
        >
          <div className="flex" style={{ minWidth: isMobile ? `${visibleStages.length * 160 + 56}px` : "auto" }}>
            {/* Time axis */}
            <div
              className="sticky left-0 z-20 shrink-0 bg-kolo-bg border-r border-kolo-teal/15"
              style={{ width: isMobile ? "48px" : "64px" }}
            >
              {/* Corner spacer */}
              <div
                className="sticky top-0 z-30 bg-kolo-bg border-b border-kolo-teal/15"
                style={{ height: "40px" }}
              />
              {/* Time labels */}
              <div className="relative" style={{ height: `${totalHeight}px` }}>
                {timeLabels.map((t) => {
                  const labelTop = (t.hour - DAY_START_HOUR) * hourHeight;
                  return (
                    <div
                      key={t.hour}
                      className="absolute left-0 right-0 flex items-start justify-end pr-2"
                      style={{ top: `${labelTop}px` }}
                    >
                      <span
                        className="text-[10px] md:text-xs text-muted-foreground -translate-y-1/2"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {t.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stage columns */}
            <div className="flex flex-1 relative">
              {/* Single NOW line spanning all columns */}
              <NowLineOverlay hourHeight={hourHeight} />
              {visibleStages.map((stage, idx) => {
                const stageArtists = artistsByStage.get(stage.id) || [];
                return (
                  <div
                    key={stage.id}
                    className="flex-1 min-w-[140px] md:min-w-[160px]"
                    style={{
                      borderRight:
                        idx < visibleStages.length - 1
                          ? "1px solid #1a6b6620"
                          : "none",
                    }}
                  >
                    {/* Stage header */}
                    <div
                      className="sticky top-0 z-20 px-2 py-2 text-center border-b bg-kolo-bg/95 backdrop-blur-sm"
                      style={{ height: "40px", borderColor: "#1a6b6620" }}
                    >
                      <span
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{
                          color: stage.color,
                          fontFamily: "'Quicksand', sans-serif",
                        }}
                      >
                        {stage.name}
                      </span>
                    </div>

                    {/* Events area */}
                    <div className="relative" style={{ height: `${totalHeight}px` }}>
                      {/* Hour grid lines */}
                      {timeLabels.map((t) => {
                        const lineTop = (t.hour - DAY_START_HOUR) * hourHeight;
                        return (
                          <div
                            key={t.hour}
                            className="absolute left-0 right-0 border-t"
                            style={{
                              top: `${lineTop}px`,
                              borderColor: "#1a6b6612",
                            }}
                          />
                        );
                      })}

                      {/* Artist blocks */}
                      <AnimatePresence mode="popLayout">
                        {stageArtists.map((artist) => (
                          <ArtistBlock
                            key={artist.id}
                            artist={artist}
                            stage={stage}
                            hourHeight={hourHeight}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Empty state */}
        {visibleArtists.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground text-sm" style={{ fontFamily: "'Quicksand', sans-serif" }}>
              Ezen a napon nincs program a kiválasztott színpadokon.
            </p>
            <button
              onClick={() => setActiveStages(new Set(STAGES.map((s) => s.id)))}
              className="mt-3 text-xs text-kolo-lime underline underline-offset-2 hover:text-kolo-lime/80 transition-colors"
            >
              Összes színpad mutatása
            </button>
          </div>
        )}
      </div>

      {/* Mobile: List view for accessibility */}
      {isMobile && visibleArtists.length > 0 && (
        <MobileListView
          artists={visibleArtists}
          stages={STAGES}
        />
      )}
    </div>
  );
}

// ---- Mobile List View (below the grid) ----

function MobileListView({
  artists,
  stages,
}: {
  artists: Artist[];
  stages: Stage[];
}) {
  const sorted = useMemo(
    () => [...artists].sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
    [artists]
  );

  return (
    <div className="container pb-12 md:hidden">
      <div className="border-t border-kolo-teal/15 pt-6">
        <h2
          className="text-sm font-bold text-foreground/60 uppercase tracking-wider mb-4"
          style={{ fontFamily: "'Quicksand', sans-serif" }}
        >
          Lista nézet
        </h2>
        <div className="space-y-2">
          {sorted.map((artist) => {
            const stage = stages.find((s) => s.name === artist.stage);
            const color = stage?.color || "#dcea75";
            return (
              <div
                key={artist.id}
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:scale-[1.01]"
                style={{
                  backgroundColor: `${color}0a`,
                  borderLeft: `3px solid ${color}`,
                }}
                onClick={() => {
                  const url = getArtistPageUrl(artist);
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-sm truncate"
                    style={{ color, fontFamily: "'Quicksand', sans-serif" }}
                  >
                    {artist.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatTime(artist.startTime)}–{formatTime(artist.endTime)} · {artist.stage}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadICS(artist);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold transition-all hover:scale-105"
                    style={{
                      backgroundColor: `${color}22`,
                      color,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <CalendarPlus size={10} />
                    <span className="hidden xs:inline">Naptár</span>
                  </button>
                  <ExternalLink size={12} style={{ color: `${color}66` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
