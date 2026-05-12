// ============================================================
// Kolorádó Festival Timetable — Main Grid Component
// Design: Neon Grid on dark teal (#062322) with lime glow (#dcea75)
// Typography:
//   - SerialBlur: headlines, artist names → ALL CAPS
//   - Pacaembu: everything else → regular caps
// Mobile UX:
//   - Default list view on mobile
//   - No bottom overflow in grid (single scroll container)
//   - Icon-only search (expands inline) and filter (dropdown)
//   - "Kedvencek" panel (was Listám) with disclaimer
//   - Tap-to-reveal overlay on calendar events
// ============================================================

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { CalendarPlus, Filter, ExternalLink, Search, Heart, X, LayoutGrid, List, Share2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
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
  downloadAllICS,
  downloadICS,
  getArtistPageUrl,
  getTimeLabels,
} from "@/lib/timetable-data";

// ---- Cookie helpers ----

const FAV_COOKIE_NAME = "kolorado_favourites";
const FAV_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function readFavouritesFromCookie(): Set<string> {
  try {
    const match = document.cookie.split("; ").find((r) => r.startsWith(`${FAV_COOKIE_NAME}=`));
    if (!match) return new Set();
    const ids = JSON.parse(decodeURIComponent(match.split("=")[1]));
    return new Set(Array.isArray(ids) ? ids : []);
  } catch { return new Set(); }
}

function writeFavouritesToCookie(ids: Set<string>) {
  document.cookie = `${FAV_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(Array.from(ids)))}; path=/; max-age=${FAV_COOKIE_MAX_AGE}; SameSite=Lax`;
}

// ---- Loading skeleton ----

function TimetableSkeleton() {
  return (
    <div className="w-full min-h-screen bg-kolo-bg animate-pulse">
      {/* Header skeleton */}
      <div className="sticky top-0 z-40 bg-kolo-bg/95 border-b border-kolo-teal/20 px-4 py-3 space-y-2">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 flex-1 rounded-full bg-kolo-bg-light opacity-60" />
          ))}
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-32 rounded-full bg-kolo-bg-light opacity-40" />
          <div className="h-9 w-9 rounded-full bg-kolo-bg-light opacity-40 ml-auto" />
          <div className="h-9 w-9 rounded-full bg-kolo-bg-light opacity-40" />
          <div className="h-9 w-9 rounded-full bg-kolo-bg-light opacity-40" />
        </div>
      </div>
      {/* List skeleton rows */}
      <div className="px-4 pt-4 space-y-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <div className="w-1 h-12 bg-kolo-bg-light opacity-50 rounded" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-2/3 bg-kolo-bg-light opacity-50 rounded" />
              <div className="h-3 w-1/3 bg-kolo-bg-light opacity-30 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Artist Block (desktop / grid) ----

interface ArtistBlockProps {
  artist: Artist;
  stage: Stage;
  hourHeight: number;
  isFavourite: boolean;
  onToggleFavourite: (id: string) => void;
  isTapped: boolean;
  onTap: (id: string) => void;
}

function ArtistBlock({ artist, stage, hourHeight, isFavourite, onToggleFavourite, isTapped, onTap }: ArtistBlockProps) {
  const startHour = toFestivalHour(artist.startTime);
  const endHour = toFestivalHour(artist.endTime);
  const top = (startHour - DAY_START_HOUR) * hourHeight;
  const height = Math.max((endHour - startHour) * hourHeight - 2, 24);
  const isShort = height < 52;
  const isTiny = height < 36;

  const handleFavClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavourite(artist.id);
  };

  const handleBlockClick = (e: React.MouseEvent) => {
    // On touch/mobile: first tap reveals overlay; second tap on name opens page
    onTap(artist.id);
    e.stopPropagation();
  };

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(getArtistPageUrl(artist), "_blank", "noopener,noreferrer");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="artist-block group absolute left-1 right-1 overflow-hidden cursor-pointer select-none"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: `${stage.color}18`,
        borderRadius: 0,
        outline: isFavourite ? `1px solid ${stage.color}88` : "none",
      }}
      onClick={handleBlockClick}
    >
      {/* Default content */}
      <div className={`h-full flex ${isShort ? "flex-row items-center gap-2" : "flex-col justify-between"} px-2 py-1`}>
        <div className="min-w-0 flex-1">
          <p
            className="font-semibold truncate leading-tight uppercase"
            style={{
              fontFamily: "'SerialBlur', sans-serif",
              fontSize: isShort ? "11px" : "12px",
              color: stage.color,
              letterSpacing: "0.03em",
            }}
          >
            {artist.name}
          </p>
          {!isShort && artist.genre && (
            <p className="text-[10px] text-foreground/50 truncate mt-0.5" style={{ fontFamily: "'Pacaembu', sans-serif" }}>
              {artist.genre}
            </p>
          )}
        </div>
        {!isTiny && (
          <p className="text-[10px] whitespace-nowrap shrink-0" style={{ color: `${stage.color}99`, fontFamily: "'Pacaembu', sans-serif" }}>
            {formatTime(artist.startTime)}–{formatTime(artist.endTime)}
          </p>
        )}
      </div>

      {/* Hover overlay (desktop: group-hover; mobile: isTapped) */}
      <div
        className={`absolute inset-0 z-20 flex flex-col justify-center items-center gap-1.5 px-3 transition-opacity duration-200 ${isTapped ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        style={{ backgroundColor: `${stage.color}dd` }}
      >
        <button
          className="font-bold text-xs text-center leading-tight uppercase hover:underline underline-offset-2"
          style={{ color: "#062322", fontFamily: "'SerialBlur', sans-serif", letterSpacing: "0.04em", background: "none", border: "none", cursor: "pointer" }}
          onClick={handleNameClick}
        >
          {artist.name}
        </button>
        {!isTiny && (
          <p className="text-xs text-center" style={{ color: "#062322cc", fontFamily: "'Pacaembu', sans-serif" }}>
            {formatTime(artist.startTime)} – {formatTime(artist.endTime)}
          </p>
        )}
        <div className="flex gap-1.5 mt-0.5 items-center">
          <button
            onClick={handleFavClick}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold transition-all hover:scale-105 active:scale-95"
            style={{
              backgroundColor: isFavourite ? "#e86b5a" : "#ffffff",
              color: isFavourite ? "#fff" : "#062322",
              fontFamily: "'Pacaembu', sans-serif",
              borderRadius: "9999px",
              border: "none",
            }}
          >
            <Heart size={12} fill={isFavourite ? "#fff" : "none"} />
            {isFavourite ? "Kedvenc" : "Kedvencnek"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ---- NOW line overlay ----

function NowLineOverlay({ hourHeight }: { hourHeight: number }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);
  const festivalHour = toFestivalHour(now);
  if (festivalHour < DAY_START_HOUR || festivalHour >= DAY_END_HOUR) return null;
  const top = (festivalHour - DAY_START_HOUR) * hourHeight + 40;
  return (
    <div className="now-line absolute left-0 right-0 z-30 pointer-events-none" style={{ top: `${top}px` }}>
      <div className="relative">
        <div className="absolute left-0 right-0 h-[2px] bg-kolo-lime" />
        <div className="absolute -left-1 -top-[5px] w-3 h-3 rounded-full bg-kolo-lime" style={{ boxShadow: "0 0 8px #dcea75" }} />
        <span className="absolute left-4 -top-[9px] text-[10px] font-bold px-1.5 py-0.5 bg-kolo-lime text-kolo-bg" style={{ fontFamily: "'Pacaembu', sans-serif" }}>
          MOST
        </span>
      </div>
    </div>
  );
}

// ---- Search panel ----

function SearchPanel({
  query, onQueryChange, results, stages, favourites, onToggleFavourite, onClose, onJumpTo,
}: {
  query: string; onQueryChange: (q: string) => void; results: Artist[];
  stages: Stage[]; favourites: Set<string>; onToggleFavourite: (id: string) => void;
  onClose: () => void; onJumpTo: (artist: Artist) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full left-0 right-0 z-50 border-b border-kolo-teal/20 backdrop-blur-md"
      style={{ backgroundColor: "#062322f8" }}
    >
      <div className="container py-3">
        {query.length > 0 && (
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center" style={{ fontFamily: "'Pacaembu', sans-serif" }}>
                Nincs találat: „{query}”
              </p>
            ) : (
              results.map((artist) => {
                const stage = stages.find((s) => s.name === artist.stage);
                const color = stage?.color || "#dcea75";
                const isFav = favourites.has(artist.id);
                return (
                  <div
                    key={artist.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-kolo-bg-light transition-colors cursor-pointer group/row"
                    onClick={() => { onJumpTo(artist); onClose(); }}
                  >
                    <div className="w-1 h-8 shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold uppercase truncate" style={{ color, fontFamily: "'SerialBlur', sans-serif", letterSpacing: "0.03em" }}>
                        {artist.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground" style={{ fontFamily: "'Pacaembu', sans-serif" }}>
                        {formatTime(artist.startTime)}–{formatTime(artist.endTime)} · {artist.stage}
                        {artist.genre && ` · ${artist.genre}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleFavourite(artist.id); }}
                        className="p-1.5 transition-colors"
                        style={{ color: isFav ? "#e86b5a" : "#7a9e9b" }}
                        title={isFav ? "Eltávolítás" : "Kedvencekhez"}
                      >
                        <Heart size={13} fill={isFav ? "#e86b5a" : "none"} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); window.open(getArtistPageUrl(artist), "_blank", "noopener,noreferrer"); }}
                        className="p-1.5 transition-colors text-muted-foreground hover:text-kolo-lime"
                        title="Előadó oldala"
                      >
                        <ExternalLink size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ---- Kedvencek panel (was Listám) ----

function KedvencekPanel({
  favourites, allArtists, stages, onToggleFavourite, onClose, onJumpTo, onExportAll, onShare,
}: {
  favourites: Set<string>; allArtists: Artist[]; stages: Stage[];
  onToggleFavourite: (id: string) => void; onClose: () => void;
  onJumpTo: (artist: Artist) => void; onExportAll: () => void; onShare: () => void;
}) {
  const favArtists = useMemo(
    () => allArtists.filter((a) => favourites.has(a.id)).sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
    [favourites, allArtists]
  );
  const byDay = useMemo(() => {
    const map = new Map<string, Artist[]>();
    for (const day of FESTIVAL_DAYS) {
      const da = favArtists.filter((a) => getFestivalDayId(a.startTime) === day.id);
      if (da.length > 0) map.set(day.id, da);
    }
    return map;
  }, [favArtists]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
          className="absolute top-full left-0 right-0 z-50 border-b border-kolo-teal/20 backdrop-blur-md"
          style={{ backgroundColor: "#062322f8" }}
    >
      <div className="container py-4">

        {favArtists.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center" style={{ fontFamily: "'Pacaembu', sans-serif" }}>
            Még nincs kedvenc. Kattints a ♥ gombra egy előadónál.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-4 mb-3">
            {FESTIVAL_DAYS.filter((d) => byDay.has(d.id)).map((day) => (
              <div key={day.id}>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5" style={{ fontFamily: "'Pacaembu', sans-serif" }}>
                  {day.label}
                </p>
                <div className="space-y-0.5">
                  {byDay.get(day.id)!.map((artist) => {
                    const stage = stages.find((s) => s.name === artist.stage);
                    const color = stage?.color || "#dcea75";
                    return (
                      <div key={artist.id} className="flex items-center gap-3 px-3 py-2 hover:bg-kolo-bg-light transition-colors group/row">
                        <div className="w-1 h-8 shrink-0" style={{ backgroundColor: color }} />
                        <button className="flex-1 min-w-0 text-left" onClick={() => { onJumpTo(artist); onClose(); }}>
                          <p className="text-sm font-semibold uppercase truncate hover:underline underline-offset-2" style={{ color, fontFamily: "'SerialBlur', sans-serif", letterSpacing: "0.03em" }}>
                            {artist.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground" style={{ fontFamily: "'Pacaembu', sans-serif" }}>
                            {formatTime(artist.startTime)}–{formatTime(artist.endTime)} · {artist.stage}
                          </p>
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={getArtistPageUrl(artist)} target="_blank" rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-muted-foreground hover:text-kolo-lime transition-colors"
                            title="Előadó oldala"
                          >
                            <ExternalLink size={13} />
                          </a>
                          <button
                            onClick={(e) => { e.stopPropagation(); onToggleFavourite(artist.id); }}
                            className="p-1.5 text-kolo-coral transition-colors"
                            title="Eltávolítás"
                          >
                            <Heart size={13} fill="#e86b5a" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer: disclaimer + action buttons */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-2 border-t border-kolo-teal/15 pt-2">
          <p className="flex-1 text-[10px] text-muted-foreground/60 leading-relaxed" style={{ fontFamily: "'Pacaembu', sans-serif" }}>
            A kedvenceid a böngésződben tárolódnak és nem szinkronizálódnak az eszközeid között. A Megosztás linkkel be tudod másolni a kedvenceidet más böngészőbe.
          </p>
          {favArtists.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={onExportAll}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-kolo-teal/30 hover:border-kolo-lime/40 hover:text-kolo-lime text-muted-foreground transition-all"
                style={{ borderRadius: 0, fontFamily: "'Pacaembu', sans-serif" }}
                title="Mentés naptárba"
              >
                <CalendarPlus size={12} />
                <span className="hidden sm:inline">Naptárba</span>
              </button>
              <button
                onClick={onShare}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-kolo-teal/30 hover:border-kolo-lime/40 hover:text-kolo-lime text-muted-foreground transition-all"
                style={{ borderRadius: 0, fontFamily: "'Pacaembu', sans-serif" }}
                title="Megosztás"
              >
                <Share2 size={12} />
                <span className="hidden sm:inline">Megosztás</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ---- Filter dropdown ----

function FilterDropdown({
  stages, activeStages, onToggleStage, filterFavourites, onToggleFavourites, onClose,
}: {
  stages: Stage[]; activeStages: Set<string>; onToggleStage: (id: string) => void;
  filterFavourites: boolean; onToggleFavourites: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.12 }}
          className="absolute right-0 top-full mt-1 z-50 min-w-[200px] border border-kolo-teal/30 shadow-xl"
          style={{ backgroundColor: "#062322", borderRadius: 0 }}
    >
      {/* Csak a kedvenceim */}
      <button
        onClick={onToggleFavourites}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors hover:bg-kolo-bg-light border-b border-kolo-teal/15"
        style={{
          fontFamily: "'Pacaembu', sans-serif",
          color: filterFavourites ? "#e86b5a" : "#7a9e9b",
          backgroundColor: filterFavourites ? "#e86b5a10" : "transparent",
        }}
      >
        <Heart size={13} fill={filterFavourites ? "#e86b5a" : "none"} style={{ color: filterFavourites ? "#e86b5a" : "#7a9e9b" }} />
        Csak a kedvenceim
      </button>
      {/* Stage toggles */}
      <div className="py-1">
        {stages.map((stage) => {
          const isActive = activeStages.has(stage.id);
          return (
            <button
              key={stage.id}
              onClick={() => onToggleStage(stage.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-kolo-bg-light"
              style={{ fontFamily: "'Pacaembu', sans-serif", color: isActive ? stage.color : "#7a9e9b" }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isActive ? stage.color : "#7a9e9b44" }} />
              {stage.name}
              {isActive && <span className="ml-auto text-[10px] opacity-60">✓</span>}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ---- Main Timetable ----

export default function Timetable() {
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(FESTIVAL_DAYS[0].id);
  const [activeStages, setActiveStages] = useState<Set<string>>(new Set(STAGES.map((s) => s.id)));
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showKedvencek, setShowKedvencek] = useState(false);
  const [filterFavourites, setFilterFavourites] = useState(false);
  const [favourites, setFavourites] = useState<Set<string>>(() => readFavouritesFromCookie());
  const [viewMode, setViewMode] = useState<"grid" | "list">("list"); // default list on mobile
  const [tappedBlockId, setTappedBlockId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const filterBtnRef = useRef<HTMLDivElement>(null);

  // Simulate brief loading (for CMS integration; in standalone mode, data is immediate)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Default to list on mobile, grid on desktop
      setViewMode(mobile ? "list" : "grid");
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const hourHeight = isMobile ? MOBILE_HOUR_HEIGHT_PX : HOUR_HEIGHT_PX;
  const timeLabels = useMemo(() => getTimeLabels(), []);
  const totalHeight = (DAY_END_HOUR - DAY_START_HOUR) * hourHeight;

  // Auto-scroll grid to first event of the active day
  useEffect(() => {
    if (viewMode !== "grid") return;
    const firstArtist = MOCK_ARTISTS
      .filter((a) => getFestivalDayId(a.startTime) === activeDay)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];
    if (!firstArtist || !gridRef.current) return;
    const startHour = toFestivalHour(firstArtist.startTime);
    const scrollTop = Math.max(0, (startHour - DAY_START_HOUR) * hourHeight - 24);
    // Use instant scroll on day change, smooth only on initial mount
    gridRef.current.scrollTo({ top: scrollTop, behavior: "instant" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDay, viewMode, hourHeight]);

  const toggleFavourite = useCallback((id: string) => {
    setFavourites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeFavouritesToCookie(next);
      return next;
    });
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return MOCK_ARTISTS.filter(
      (a) => a.name.toLowerCase().includes(q) || (a.genre && a.genre.toLowerCase().includes(q)) || a.stage.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [searchQuery]);

  const searchMatchIds = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return new Set(searchResults.map((a) => a.id));
  }, [searchQuery, searchResults]);

  const visibleArtists = useMemo(() => {
    return MOCK_ARTISTS.filter((a) => {
      if (getFestivalDayId(a.startTime) !== activeDay) return false;
      // Note: search does NOT filter the calendar — it only populates the search panel
      const stageObj = STAGES.find((s) => s.name === a.stage);
      if (!stageObj || !activeStages.has(stageObj.id)) return false;
      if (filterFavourites && !favourites.has(a.id)) return false;
      return true;
    });
  }, [activeDay, activeStages, filterFavourites, favourites]);

  const isFiltering = filterFavourites;

  const visibleStages = useMemo(() => {
    const allActive = STAGES.filter((s) => activeStages.has(s.id));
    if (!isFiltering) return allActive;
    const stagesWithArtists = new Set(visibleArtists.map((a) => a.stage));
    return allActive.filter((s) => stagesWithArtists.has(s.name));
  }, [activeStages, isFiltering, visibleArtists]);

  const artistsByStage = useMemo(() => {
    const map = new Map<string, Artist[]>();
    for (const stage of visibleStages) {
      map.set(stage.id, visibleArtists.filter((a) => a.stage === stage.name));
    }
    return map;
  }, [visibleArtists, visibleStages]);

  const toggleStage = useCallback((stageId: string) => {
    setActiveStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) { if (next.size > 1) next.delete(stageId); }
      else next.add(stageId);
      return next;
    });
  }, []);

  // URL hash helpers
  const encodeFavouritesToHash = useCallback((ids: Set<string>) => {
    if (ids.size === 0) return "";
    return btoa(Array.from(ids).join(",")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }, []);

  const decodeFavouritesFromHash = useCallback((hash: string): string[] => {
    try {
      const padded = hash + "=".repeat((4 - (hash.length % 4)) % 4);
      return atob(padded.replace(/-/g, "+").replace(/_/g, "/")).split(",").filter(Boolean);
    } catch { return []; }
  }, []);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash.startsWith("fav:")) return;
    const ids = decodeFavouritesFromHash(hash.slice(4));
    if (!ids.length) return;
    const validIds = new Set(ids.filter((id) => MOCK_ARTISTS.some((a) => a.id === id)));
    if (!validIds.size) return;
    setFavourites((prev) => {
      const merged = new Set([...Array.from(prev), ...Array.from(validIds)]);
      writeFavouritesToCookie(merged);
      return merged;
    });
    history.replaceState(null, "", window.location.pathname + window.location.search);
    toast.success(`${validIds.size} kedvenc betöltve a megosztott listából!`, { style: { fontFamily: "'Pacaembu', sans-serif" } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shareFavourites = useCallback(() => {
    const encoded = encodeFavouritesToHash(favourites);
    if (!encoded) return;
    const url = `${window.location.origin}${window.location.pathname}#fav:${encoded}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
        .then(() => toast.success("Link másolva a vágólapra!", { style: { fontFamily: "'Pacaembu', sans-serif" } }))
        .catch(() => window.prompt("Másold ki ezt a linket:", url));
    } else {
      window.prompt("Másold ki ezt a linket:", url);
    }
  }, [favourites, encodeFavouritesToHash]);

  const exportAllFavourites = useCallback(() => {
    const favArtists = MOCK_ARTISTS.filter((a) => favourites.has(a.id)).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    if (favArtists.length > 0) downloadAllICS(favArtists);
  }, [favourites]);

  const jumpToArtist = useCallback((artist: Artist) => {
    const dayId = getFestivalDayId(artist.startTime);
    if (dayId) setActiveDay(dayId);
    setViewMode("grid");
    setTimeout(() => {
      const el = blockRefs.current.get(artist.id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.style.outline = "2px solid #dcea75";
        setTimeout(() => { el.style.outline = ""; }, 1200);
      } else if (gridRef.current) {
        const startHour = toFestivalHour(artist.startTime);
        gridRef.current.scrollTo({ top: Math.max(0, (startHour - DAY_START_HOUR) * hourHeight - 80), behavior: "smooth" });
      }
    }, 80);
  }, [hourHeight]);

  const handleSearchToggle = () => {
    if (showSearch) { setShowSearch(false); setSearchQuery(""); }
    else { setShowKedvencek(false); setShowSearch(true); }
  };

  const handleKedvencekToggle = () => {
    if (showKedvencek) setShowKedvencek(false);
    else { setShowSearch(false); setSearchQuery(""); setShowKedvencek(true); }
  };

  // Tap-to-reveal: clicking anywhere outside a block closes the overlay
  const handleGridClick = useCallback(() => {
    setTappedBlockId(null);
  }, []);

  const handleBlockTap = useCallback((id: string) => {
    setTappedBlockId((prev) => (prev === id ? null : id));
  }, []);

  const sortedVisibleArtists = useMemo(
    () => [...visibleArtists].sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
    [visibleArtists]
  );

  if (loading) return <TimetableSkeleton />;

  const hasActiveFilters = filterFavourites || activeStages.size < STAGES.length;

  return (
    <div className="w-full min-h-screen" style={{ backgroundColor: "#0E4B4D" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b border-kolo-teal/20" style={{ backgroundColor: "#062322f5" }}>
        <div className="container pt-3 pb-2">

          {/* ── ROW 1: Day tabs ── */}
          <div className="flex gap-1.5 mb-2 md:justify-center">
            {FESTIVAL_DAYS.map((day) => (
              <button
                key={day.id}
                onClick={() => setActiveDay(day.id)}
                className="relative flex-1 md:flex-none px-3 md:px-10 py-2 md:py-3 font-bold transition-all duration-200 text-center uppercase"
                style={{
                  borderRadius: "9999px",
                  fontFamily: "'SerialBlur', sans-serif",
                  letterSpacing: "0.05em",
                  fontSize: isMobile ? "13px" : "17px",
                  backgroundColor: activeDay === day.id ? "#dcea75" : "transparent",
                  color: activeDay === day.id ? "#062322" : "#dcea75cc",
                }}
              >
                <span className="hidden md:inline">{day.label}</span>
                <span className="md:hidden">{day.shortLabel}</span>
                {activeDay === day.id && (
                  <motion.div
                    layoutId="dayIndicator"
                    className="absolute inset-0 bg-kolo-lime -z-10"
                    style={{ borderRadius: "9999px" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* ── ROW 2: Kedvencek + search icon + filter icon + view toggle ── */}
          <div className="flex items-center gap-2 mb-1">
            {/* Kedvencek pill */}
            <button
              onClick={handleKedvencekToggle}
              className="relative flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border transition-all"
              style={{
                borderRadius: "9999px",
                borderColor: showKedvencek ? "#e86b5a66" : "#1a6b6660",
                color: showKedvencek ? "#e86b5a" : "#7a9e9b",
                backgroundColor: showKedvencek ? "#e86b5a18" : "transparent",
                fontFamily: "'Pacaembu', sans-serif",
              }}
            >
              {showKedvencek ? (
                <X size={13} style={{ color: "#e86b5a" }} />
              ) : (
                <Heart size={13} fill="none" style={{ color: "#7a9e9b" }} />
              )}
              <span>Kedvencek</span>
              {favourites.size > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[9px] font-bold bg-kolo-coral text-white"
                  style={{ borderRadius: "9999px" }}
                >
                  {favourites.size}
                </span>
              )}
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Search icon — expands inline */}
            <AnimatePresence mode="wait">
              {showSearch ? (
                <motion.div
                  key="search-expanded"
                  initial={{ width: 36, opacity: 0 }}
                  animate={{ width: isMobile ? 160 : 220, opacity: 1 }}
                  exit={{ width: 36, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 border border-kolo-teal/40 bg-kolo-bg-light overflow-hidden"
                  style={{ borderRadius: "9999px" }}
                >
                  <Search size={13} className="text-kolo-lime shrink-0" />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Keresés…"
                    className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none min-w-0"
                    style={{ fontFamily: "'Pacaembu', sans-serif" }}
                  />
                  <button onClick={handleSearchToggle} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    <X size={12} />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="search-icon"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handleSearchToggle}
                  className="flex items-center justify-center w-9 h-9 border transition-all"
                  style={{
                    borderRadius: "9999px",
                    borderColor: "#1a6b6660",
                    color: "#7a9e9b",
                    backgroundColor: "transparent",
                  }}
                  title="Keresés"
                >
                  <Search size={15} />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Filter icon button + dropdown */}
            <div className="relative" ref={filterBtnRef}>
              <button
                onClick={() => setShowFilterDropdown((v) => !v)}
                className="flex items-center justify-center w-9 h-9 border transition-all"
                style={{
                  borderRadius: "9999px",
                  borderColor: hasActiveFilters ? "#dcea7566" : "#1a6b6660",
                  color: hasActiveFilters ? "#dcea75" : "#7a9e9b",
                  backgroundColor: hasActiveFilters ? "#dcea7510" : "transparent",
                }}
                title="Szűrők"
              >
                <Filter size={15} />
              </button>
              <AnimatePresence>
                {showFilterDropdown && (
                  <FilterDropdown
                    stages={STAGES}
                    activeStages={activeStages}
                    onToggleStage={toggleStage}
                    filterFavourites={filterFavourites}
                    onToggleFavourites={() => setFilterFavourites((v) => !v)}
                    onClose={() => setShowFilterDropdown(false)}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Grid / List view toggle */}
            <div className="flex border overflow-hidden shrink-0" style={{ borderRadius: "9999px", borderColor: "#1a6b6660" }}>
              <button
                onClick={() => setViewMode("grid")}
                className="flex items-center justify-center w-9 h-9 transition-all"
                style={{
                  backgroundColor: viewMode === "grid" ? "#dcea7522" : "transparent",
                  color: viewMode === "grid" ? "#dcea75" : "#7a9e9b",
                }}
                title="Naptár nézet"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className="flex items-center justify-center w-9 h-9 transition-all"
                style={{
                  backgroundColor: viewMode === "list" ? "#dcea7522" : "transparent",
                  color: viewMode === "list" ? "#dcea75" : "#7a9e9b",
                }}
                title="Lista nézet"
              >
                <List size={14} />
              </button>
            </div>
          </div>

          {/* Desktop stage pills removed — use filter dropdown instead */}
        </div>

        {/* Search results panel (desktop) */}
        <AnimatePresence>
          {showSearch && searchQuery.length > 0 && (
            <SearchPanel
              query={searchQuery}
              onQueryChange={setSearchQuery}
              results={searchResults}
              stages={STAGES}
              favourites={favourites}
              onToggleFavourite={toggleFavourite}
              onClose={() => { setShowSearch(false); setSearchQuery(""); }}
              onJumpTo={jumpToArtist}
            />
          )}
        </AnimatePresence>

        {/* Kedvencek panel */}
        <AnimatePresence>
          {showKedvencek && (
            <KedvencekPanel
              favourites={favourites}
              allArtists={MOCK_ARTISTS}
              stages={STAGES}
              onToggleFavourite={toggleFavourite}
              onClose={() => setShowKedvencek(false)}
              onJumpTo={jumpToArtist}
              onExportAll={exportAllFavourites}
              onShare={shareFavourites}
            />
          )}
        </AnimatePresence>
      </header>

      {/* ── List View ── */}
      {viewMode === "list" && (
        <div className="container pb-12">
          {visibleArtists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-muted-foreground text-sm" style={{ fontFamily: "'Pacaembu', sans-serif" }}>
                {filterFavourites ? "Ezen a napon nincs kedvenc előadód." : "Ezen a napon nincs program."}
              </p>
              <button
                onClick={() => { setActiveStages(new Set(STAGES.map((s) => s.id))); setFilterFavourites(false); }}
                className="mt-3 text-xs text-kolo-lime underline underline-offset-2"
                style={{ fontFamily: "'Pacaembu', sans-serif" }}
              >
                Összes program mutatása
              </button>
            </div>
          ) : (
            <div className="space-y-0.5 pt-3">
              {sortedVisibleArtists.map((artist) => {
                const stage = STAGES.find((s) => s.name === artist.stage);
                const color = stage?.color || "#dcea75";
                const isFav = favourites.has(artist.id);
                return (
                  <div
                    key={artist.id}
                    className="flex items-center gap-3 p-3 cursor-pointer transition-all hover:bg-kolo-bg-light active:bg-kolo-bg-lighter"
                    style={{ borderRadius: 0 }}
                    onClick={() => window.open(getArtistPageUrl(artist), "_blank", "noopener,noreferrer")}
                  >
                    <div className="w-1 h-12 shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base truncate uppercase" style={{ color, fontFamily: "'SerialBlur', sans-serif", letterSpacing: "0.03em" }}>
                        {artist.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "'Pacaembu', sans-serif" }}>
                        {formatTime(artist.startTime)}–{formatTime(artist.endTime)}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: `${color}88`, fontFamily: "'Pacaembu', sans-serif" }}>
                        {artist.stage}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavourite(artist.id); }}
                      className="p-2.5 transition-colors shrink-0"
                      style={{ color: isFav ? "#e86b5a" : "#7a9e9b" }}
                    >
                      <Heart size={18} fill={isFav ? "#e86b5a" : "none"} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Grid View ── */}
      {viewMode === "grid" && (
        <div className="container pb-8">
          {/* Single scroll container — no double scrolling on mobile */}
          <div
            ref={gridRef}
            className="timetable-scroll overflow-x-auto overflow-y-auto mt-4 border border-kolo-teal/15"
            style={{ height: "calc(100vh - var(--header-h, 130px))" }}
            onClick={handleGridClick}
          >
            <div className="flex" style={{ minWidth: isMobile ? `${visibleStages.length * 140 + 48}px` : "auto" }}>
              {/* Time axis */}
              <div
                className="sticky left-0 z-20 shrink-0 bg-kolo-bg border-r border-kolo-teal/15"
                style={{ width: isMobile ? "44px" : "64px" }}
              >
                <div className="sticky top-0 z-30 bg-kolo-bg border-b border-kolo-teal/15" style={{ height: "40px" }} />
                <div className="relative" style={{ height: `${totalHeight}px` }}>
                  {timeLabels.map((t) => (
                    <div
                      key={t.hour}
                      className="absolute left-0 right-0 flex items-start justify-end pr-1.5"
                      style={{ top: `${(t.hour - DAY_START_HOUR) * hourHeight}px` }}
                    >
                      <span className="text-[9px] md:text-[10px] text-muted-foreground -translate-y-1/2" style={{ fontFamily: "'Pacaembu', sans-serif" }}>
                        {t.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage columns */}
              <div className="flex flex-1 relative">
                <NowLineOverlay hourHeight={hourHeight} />
                {visibleStages.map((stage, idx) => {
                  const stageArtists = artistsByStage.get(stage.id) || [];
                  return (
                    <div
                      key={stage.id}
                      className="flex-1"
                      style={{
                        minWidth: isMobile ? "140px" : "160px",
                        borderRight: idx < visibleStages.length - 1 ? "1px solid #1a6b6620" : "none",
                      }}
                    >
                      <div
                        className="sticky top-0 z-20 px-2 py-2 text-center border-b bg-kolo-bg/95 backdrop-blur-sm"
                        style={{ height: "40px", borderColor: "#1a6b6620" }}
                      >
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: stage.color, fontFamily: "'SerialBlur', sans-serif" }}>
                          {stage.name}
                        </span>
                      </div>
                      <div className="relative" style={{ height: `${totalHeight}px` }}>
                        {timeLabels.map((t) => (
                          <div
                            key={t.hour}
                            className="absolute left-0 right-0 border-t"
                            style={{ top: `${(t.hour - DAY_START_HOUR) * hourHeight}px`, borderColor: "#1a6b6612" }}
                          />
                        ))}
                        <AnimatePresence mode="popLayout">
                          {stageArtists.map((artist) => (
                            <ArtistBlock
                              key={artist.id}
                              artist={artist}
                              stage={stage}
                              hourHeight={hourHeight}
                              isFavourite={favourites.has(artist.id)}
                              onToggleFavourite={toggleFavourite}
                              isTapped={tappedBlockId === artist.id}
                              onTap={handleBlockTap}
                            />
                          ))}
                        </AnimatePresence>
                        {stageArtists.map((artist) => (
                          <div
                            key={`ref-${artist.id}`}
                            ref={(el) => { if (el) blockRefs.current.set(artist.id, el); }}
                            style={{ position: "absolute", top: `${(toFestivalHour(artist.startTime) - DAY_START_HOUR) * hourHeight}px`, height: 0, width: 0 }}
                          />
                        ))}
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
              <p className="text-muted-foreground text-sm" style={{ fontFamily: "'Pacaembu', sans-serif" }}>
                {filterFavourites ? "Ezen a napon nincs kedvenc előadód." : "Ezen a napon nincs program a kiválasztott színpadokon."}
              </p>
              <button
                onClick={() => { setActiveStages(new Set(STAGES.map((s) => s.id))); setFilterFavourites(false); }}
                className="mt-3 text-xs text-kolo-lime underline underline-offset-2 hover:text-kolo-lime/80 transition-colors"
                style={{ fontFamily: "'Pacaembu', sans-serif" }}
              >
                Összes program mutatása
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
