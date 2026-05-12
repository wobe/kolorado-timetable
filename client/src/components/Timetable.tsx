// ============================================================
// Kolorádó Festival Timetable — Main Grid Component
// Design: Neon Grid on dark teal (#062322) with lime glow (#dcea75)
// Typography:
//   - SerialBlur: headlines, artist names → ALL CAPS
//   - Pacaembu: everything else → regular caps
// Changes:
//   - No header title (website already has one)
//   - No left-side colour border on event blocks
//   - Sharp corners on event blocks
//   - Pill-shaped day selector buttons
//   - Favourites prominent; calendar button de-emphasised
//   - "Listám" panel: click jumps to slot + artist page link
//   - Empty stage columns hidden when filtering/searching
// ============================================================

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { CalendarPlus, ChevronDown, Filter, ExternalLink, Search, Heart, X, Star, LayoutGrid, List, Share2 } from "lucide-react";
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
  downloadICS,
  downloadAllICS,
  getArtistPageUrl,
  getTimeLabels,
} from "@/lib/timetable-data";

// ---- Cookie helpers for favourites ----

const FAV_COOKIE_NAME = "kolorado_favourites";
const FAV_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function readFavouritesFromCookie(): Set<string> {
  try {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${FAV_COOKIE_NAME}=`));
    if (!match) return new Set();
    const value = decodeURIComponent(match.split("=")[1]);
    const ids = JSON.parse(value);
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

function writeFavouritesToCookie(ids: Set<string>) {
  const value = encodeURIComponent(JSON.stringify(Array.from(ids)));
  document.cookie = `${FAV_COOKIE_NAME}=${value}; path=/; max-age=${FAV_COOKIE_MAX_AGE}; SameSite=Lax`;
}

// ---- Artist Block ----

interface ArtistBlockProps {
  artist: Artist;
  stage: Stage;
  hourHeight: number;
  isFavourite: boolean;
  onToggleFavourite: (id: string) => void;
  blockRef?: React.RefObject<HTMLDivElement | null>;
}

function ArtistBlock({ artist, stage, hourHeight, isFavourite, onToggleFavourite, blockRef }: ArtistBlockProps) {
  const startHour = toFestivalHour(artist.startTime);
  const endHour = toFestivalHour(artist.endTime);
  const top = (startHour - DAY_START_HOUR) * hourHeight;
  const height = Math.max((endHour - startHour) * hourHeight - 2, 24);
  const isShort = height < 52;
  const isTiny = height < 36;
  const [favAnimating, setFavAnimating] = useState(false);

  const handleCalendarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    downloadICS(artist);
  };

  const handleFavClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavourite(artist.id);
    setFavAnimating(true);
    setTimeout(() => setFavAnimating(false), 400);
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
      ref={blockRef as React.RefObject<HTMLDivElement>}
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
            <p
              className="text-[10px] text-foreground/50 truncate mt-0.5"
              style={{ fontFamily: "'Pacaembu', sans-serif" }}
            >
              {artist.genre}
            </p>
          )}
        </div>
        {!isTiny && (
          <p
            className="text-[10px] whitespace-nowrap shrink-0"
            style={{ color: `${stage.color}99`, fontFamily: "'Pacaembu', sans-serif" }}
          >
            {formatTime(artist.startTime)}–{formatTime(artist.endTime)}
          </p>
        )}
      </div>

      {/* Hover overlay — favourite prominent, calendar subtle */}
      <div
        className="absolute inset-0 z-20 flex flex-col justify-center items-center gap-1.5 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ backgroundColor: `${stage.color}dd` }}
      >
        <p
          className="font-bold text-sm text-center leading-tight uppercase"
          style={{ color: "#062322", fontFamily: "'SerialBlur', sans-serif", letterSpacing: "0.04em" }}
        >
          {artist.name}
        </p>
        {!isTiny && (
          <p
            className="text-xs text-center"
            style={{ color: "#062322cc", fontFamily: "'Pacaembu', sans-serif" }}
          >
            {formatTime(artist.startTime)} – {formatTime(artist.endTime)}
          </p>
        )}
        <div className="flex gap-1.5 mt-0.5 items-center">
          {/* Favourite — only action on hover */}
          <button
            onClick={handleFavClick}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${favAnimating ? "fav-pulse" : ""}`}
            style={{
              backgroundColor: isFavourite ? "#e86b5a" : "#062322",
              color: isFavourite ? "#fff" : "#e86b5a",
              fontFamily: "'Pacaembu', sans-serif",
              borderRadius: 0,
              border: isFavourite ? "none" : "1px solid #e86b5a66",
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
          className="absolute left-4 -top-[9px] text-[10px] font-bold px-1.5 py-0.5 bg-kolo-lime text-kolo-bg"
          style={{ fontFamily: "'Pacaembu', sans-serif" }}
        >
          MOST
        </span>
      </div>
    </div>
  );
}

// ---- Search overlay panel ----

function SearchPanel({
  query,
  onQueryChange,
  results,
  stages,
  favourites,
  onToggleFavourite,
  onClose,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  results: Artist[];
  stages: Stage[];
  favourites: Set<string>;
  onToggleFavourite: (id: string) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full left-0 right-0 z-50 border-b border-kolo-teal/20 bg-kolo-bg/98 backdrop-blur-md"
    >
      <div className="container py-3">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="flex items-center gap-2 flex-1 px-3 py-2 border border-kolo-teal/30 bg-kolo-bg-light"
            style={{ borderRadius: 0 }}
          >
            <Search size={15} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Keress előadót, műfajt vagy színpadot…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              style={{ fontFamily: "'Pacaembu', sans-serif" }}
            />
            {query && (
              <button onClick={() => onQueryChange("")} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={13} />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Bezár"
          >
            <X size={16} />
          </button>
        </div>

        {query.length > 0 && (
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center" style={{ fontFamily: "'Pacaembu', sans-serif" }}>
                Nincs találat: „{query}"
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
                    onClick={() => window.open(getArtistPageUrl(artist), "_blank", "noopener,noreferrer")}
                  >
                    <div className="w-1 h-8 shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold uppercase truncate"
                        style={{ color, fontFamily: "'SerialBlur', sans-serif", letterSpacing: "0.03em" }}
                      >
                        {artist.name}
                      </p>
                      <p
                        className="text-[11px] text-muted-foreground"
                        style={{ fontFamily: "'Pacaembu', sans-serif" }}
                      >
                        {formatTime(artist.startTime)}–{formatTime(artist.endTime)} · {artist.stage}
                        {artist.genre && ` · ${artist.genre}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadICS(artist); }}
                        className="p-1.5 hover:text-kolo-lime text-muted-foreground transition-colors"
                        title="Naptárba"
                      >
                        <CalendarPlus size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleFavourite(artist.id); }}
                        className="p-1.5 transition-colors"
                        style={{ color: isFav ? "#e86b5a" : undefined }}
                        title={isFav ? "Eltávolítás a kedvencekből" : "Kedvencekhez"}
                      >
                        <Heart size={13} fill={isFav ? "#e86b5a" : "none"} className={isFav ? "" : "text-muted-foreground"} />
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

// ---- Listám panel ----

function ListamPanel({
  favourites,
  allArtists,
  stages,
  onToggleFavourite,
  onClose,
  onJumpTo,
  onExportAll,
  onShare,
}: {
  favourites: Set<string>;
  allArtists: Artist[];
  stages: Stage[];
  onToggleFavourite: (id: string) => void;
  onClose: () => void;
  onJumpTo: (artist: Artist) => void;
  onExportAll: () => void;
  onShare: () => void;
}) {
  const favArtists = useMemo(
    () => allArtists.filter((a) => favourites.has(a.id)).sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
    [favourites, allArtists]
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Artist[]>();
    for (const day of FESTIVAL_DAYS) {
      const dayArtists = favArtists.filter((a) => getFestivalDayId(a.startTime) === day.id);
      if (dayArtists.length > 0) map.set(day.id, dayArtists);
    }
    return map;
  }, [favArtists]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full left-0 right-0 z-50 border-b border-kolo-teal/20 bg-kolo-bg/98 backdrop-blur-md"
    >
      <div className="container py-4">
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-sm font-bold uppercase tracking-wider text-kolo-lime"
            style={{ fontFamily: "'SerialBlur', sans-serif" }}
          >
            Listám
          </h2>
          <div className="flex items-center gap-1">
            {favourites.size > 0 && (
              <button
                onClick={onShare}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-kolo-teal/30 hover:border-kolo-lime/40 hover:text-kolo-lime text-muted-foreground transition-all"
                style={{ borderRadius: 0, fontFamily: "'Pacaembu', sans-serif" }}
                title="Megosztás"
              >
                <Share2 size={12} />
                Megosztás
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors ml-1"
              title="Bezár"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {favArtists.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center" style={{ fontFamily: "'Pacaembu', sans-serif" }}>
            Még nincs kedvenc. Kattints a ♥ gombra egy előadónál.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="max-h-72 overflow-y-auto space-y-4">
              {FESTIVAL_DAYS.filter((d) => byDay.has(d.id)).map((day) => (
                <div key={day.id}>
                  <p
                    className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5"
                    style={{ fontFamily: "'Pacaembu', sans-serif" }}
                  >
                    {day.label}
                  </p>
                  <div className="space-y-0.5">
                    {byDay.get(day.id)!.map((artist) => {
                      const stage = stages.find((s) => s.name === artist.stage);
                      const color = stage?.color || "#dcea75";
                      return (
                        <div
                          key={artist.id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-kolo-bg-light transition-colors group/row"
                        >
                          <div className="w-1 h-8 shrink-0" style={{ backgroundColor: color }} />
                          <button
                            className="flex-1 min-w-0 text-left"
                            onClick={() => { onJumpTo(artist); onClose(); }}
                          >
                            <p
                              className="text-sm font-semibold uppercase truncate hover:underline underline-offset-2"
                              style={{ color, fontFamily: "'SerialBlur', sans-serif", letterSpacing: "0.03em" }}
                            >
                              {artist.name}
                            </p>
                            <p
                              className="text-[11px] text-muted-foreground"
                              style={{ fontFamily: "'Pacaembu', sans-serif" }}
                            >
                              {formatTime(artist.startTime)}–{formatTime(artist.endTime)} · {artist.stage}
                            </p>
                          </button>
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={getArtistPageUrl(artist)}
                              target="_blank"
                              rel="noopener noreferrer"
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
            <div className="pt-3 border-t border-kolo-teal/20">
              <button
                onClick={onExportAll}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border border-kolo-teal/30 hover:border-kolo-lime/40 hover:text-kolo-lime transition-all"
                style={{
                  borderRadius: 0,
                  color: "#7a9e9b",
                  fontFamily: "'Pacaembu', sans-serif",
                }}
              >
                <CalendarPlus size={15} />
                Mentés naptárba
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
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
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showListam, setShowListam] = useState(false);
  const [filterFavourites, setFilterFavourites] = useState(false);
  const [favourites, setFavourites] = useState<Set<string>>(() => readFavouritesFromCookie());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const gridRef = useRef<HTMLDivElement>(null);
  // Map of artistId → block DOM ref for scroll-to
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const hourHeight = isMobile ? MOBILE_HOUR_HEIGHT_PX : HOUR_HEIGHT_PX;
  const timeLabels = useMemo(() => getTimeLabels(), []);
  const totalHeight = (DAY_END_HOUR - DAY_START_HOUR) * hourHeight;

  const toggleFavourite = useCallback((id: string) => {
    setFavourites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeFavouritesToCookie(next);
      return next;
    });
  }, []);

  // Search results across all days
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return MOCK_ARTISTS.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.genre && a.genre.toLowerCase().includes(q)) ||
        a.stage.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [searchQuery]);

  // IDs of artists that match the active search query (for column visibility)
  const searchMatchIds = useMemo(() => {
    if (!searchQuery.trim()) return null; // null = no active search filter
    return new Set(searchResults.map((a) => a.id));
  }, [searchQuery, searchResults]);

  // Filter artists for the active day and visible stages
  const visibleArtists = useMemo(() => {
    return MOCK_ARTISTS.filter((a) => {
      const dayId = getFestivalDayId(a.startTime);
      if (dayId !== activeDay) return false;
      const stageObj = STAGES.find((s) => s.name === a.stage);
      if (!stageObj || !activeStages.has(stageObj.id)) return false;
      if (filterFavourites && !favourites.has(a.id)) return false;
      if (searchMatchIds && !searchMatchIds.has(a.id)) return false;
      return true;
    });
  }, [activeDay, activeStages, filterFavourites, favourites, searchMatchIds]);

  // Visible stages: only those with at least one visible artist when filtering/searching
  const isFiltering = filterFavourites || (searchMatchIds !== null && searchMatchIds.size > 0);

  const visibleStages = useMemo(() => {
    const allActive = STAGES.filter((s) => activeStages.has(s.id));
    if (!isFiltering) return allActive;
    // Only show stages that have at least one visible artist
    const stagesWithArtists = new Set(visibleArtists.map((a) => a.stage));
    return allActive.filter((s) => stagesWithArtists.has(s.name));
  }, [activeStages, isFiltering, visibleArtists]);

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

  // ---- URL hash helpers for shareable favourites ----
  const encodeFavouritesToHash = useCallback((ids: Set<string>): string => {
    if (ids.size === 0) return "";
    const raw = Array.from(ids).join(",");
    return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }, []);

  const decodeFavouritesFromHash = useCallback((hash: string): string[] => {
    try {
      const padded = hash + "=".repeat((4 - (hash.length % 4)) % 4);
      const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
      return raw.split(",").filter(Boolean);
    } catch {
      return [];
    }
  }, []);

  // On mount: check if URL hash contains shared favourites
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash.startsWith("fav:")) return;
    const encoded = hash.slice(4);
    const ids = decodeFavouritesFromHash(encoded);
    if (ids.length === 0) return;
    const validIds = new Set(ids.filter((id) => MOCK_ARTISTS.some((a) => a.id === id)));
    if (validIds.size === 0) return;
    setFavourites((prev) => {
      const merged = new Set([...Array.from(prev), ...Array.from(validIds)]);
      writeFavouritesToCookie(merged);
      return merged;
    });
    history.replaceState(null, "", window.location.pathname + window.location.search);
    toast.success(`${validIds.size} kedvenc betöltve a megosztott listából!`, {
      style: { fontFamily: "'Pacaembu', sans-serif" },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Share: copy URL with encoded favourites to clipboard
  const shareFavourites = useCallback(() => {
    const encoded = encodeFavouritesToHash(favourites);
    if (!encoded) return;
    const url = `${window.location.origin}${window.location.pathname}#fav:${encoded}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Link másolva a vágólapra!", {
          style: { fontFamily: "'Pacaembu', sans-serif" },
        });
      }).catch(() => {
        toast.error("Nem sikerült másolni a linket.", {
          style: { fontFamily: "'Pacaembu', sans-serif" },
        });
      });
    } else {
      window.prompt("Másold ki ezt a linket:", url);
    }
  }, [favourites, encodeFavouritesToHash]);

  // Export all favourites as a single ICS file
  const exportAllFavourites = useCallback(() => {
    const favArtists = MOCK_ARTISTS.filter((a) => favourites.has(a.id))
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    if (favArtists.length > 0) downloadAllICS(favArtists);
  }, [favourites]);

  // Jump to an artist's slot: switch to their day, then scroll the grid to their time position
  const jumpToArtist = useCallback((artist: Artist) => {
    const dayId = getFestivalDayId(artist.startTime);
    if (dayId) setActiveDay(dayId);
    // Wait for React to re-render the correct day before scrolling
    setTimeout(() => {
      const el = blockRefs.current.get(artist.id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Brief highlight flash
        el.style.outline = "2px solid #dcea75";
        setTimeout(() => { el.style.outline = ""; }, 1200);
      } else if (gridRef.current) {
        // Fallback: scroll by time position
        const startHour = toFestivalHour(artist.startTime);
        const scrollTop = (startHour - DAY_START_HOUR) * hourHeight - 80;
        gridRef.current.scrollTo({ top: Math.max(0, scrollTop), behavior: "smooth" });
      }
    }, 80);
  }, [hourHeight]);

  const handleSearchOpen = () => {
    if (showSearch) {
      setShowSearch(false);
      setSearchQuery("");
    } else {
      setShowListam(false);
      setShowSearch(true);
    }
  };

  const handleListamOpen = () => {
    if (showListam) {
      setShowListam(false);
    } else {
      setShowSearch(false);
      setSearchQuery("");
      setShowListam(true);
    }
  };

  // Sorted visible artists for list view
  const sortedVisibleArtists = useMemo(
    () => [...visibleArtists].sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
    [visibleArtists]
  );

  return (
    <div className="w-full min-h-screen bg-kolo-bg">
      {/* Header — no title, just controls */}
      <header className="sticky top-0 z-40 bg-kolo-bg/95 backdrop-blur-md border-b border-kolo-teal/20">
        <div className="container pt-3 pb-2">

          {/* ── ROW 1 (all screens): Day tabs ── */}
          <div className="flex gap-1.5 mb-2">
            {FESTIVAL_DAYS.map((day) => (
              <button
                key={day.id}
                onClick={() => setActiveDay(day.id)}
                className={`relative flex-1 md:flex-none px-3 md:px-6 py-2 text-sm font-bold transition-all duration-200 text-center uppercase`}
                style={{
                  borderRadius: "9999px",
                  fontFamily: "'SerialBlur', sans-serif",
                  letterSpacing: "0.04em",
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

          {/* ── ROW 2 (mobile only): Kedvencek + Listám ── */}
          <div className="flex gap-2 mb-2 md:hidden">
            {/* Favourite filter toggle */}
            <button
              onClick={() => setFilterFavourites((v) => !v)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border transition-all"
              style={{
                borderRadius: "9999px",
                borderColor: filterFavourites ? "#e86b5a88" : "#1a6b6660",
                color: filterFavourites ? "#e86b5a" : "#7a9e9b",
                backgroundColor: filterFavourites ? "#e86b5a18" : "transparent",
                fontFamily: "'Pacaembu', sans-serif",
              }}
            >
              <Heart size={15} fill={filterFavourites ? "#e86b5a" : "none"} />
              Kedvencek
            </button>
            {/* Listám button */}
            <button
              onClick={handleListamOpen}
              className="relative flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border transition-all"
              style={{
                borderRadius: "9999px",
                borderColor: showListam ? "#dcea7566" : "#1a6b6660",
                color: showListam ? "#dcea75" : "#7a9e9b",
                backgroundColor: showListam ? "#dcea7518" : "transparent",
                fontFamily: "'Pacaembu', sans-serif",
              }}
            >
              <Star size={15} fill={showListam ? "#dcea75" : "none"} />
              Listám
              {favourites.size > 0 && (
                <span
                  className="w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-kolo-coral text-white"
                  style={{ borderRadius: "9999px" }}
                >
                  {favourites.size}
                </span>
              )}
            </button>
          </div>

          {/* ── ROW 3 (mobile only): Search + Stage filter + View toggle ── */}
          <div className="flex gap-2 mb-2 md:hidden">
            {/* Search */}
            <button
              onClick={handleSearchOpen}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border transition-all"
              style={{
                borderRadius: "9999px",
                borderColor: showSearch ? "#dcea7566" : "#1a6b6660",
                color: showSearch ? "#dcea75" : "#7a9e9b",
                backgroundColor: showSearch ? "#dcea7518" : "transparent",
                fontFamily: "'Pacaembu', sans-serif",
              }}
            >
              <Search size={15} />
              Keresés
            </button>
            {/* Stage filter toggle */}
            <button
              onClick={() => setShowStageFilter(!showStageFilter)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border transition-all"
              style={{
                borderRadius: "9999px",
                borderColor: showStageFilter ? "#dcea7566" : "#1a6b6660",
                color: showStageFilter ? "#dcea75" : "#7a9e9b",
                backgroundColor: showStageFilter ? "#dcea7518" : "transparent",
                fontFamily: "'Pacaembu', sans-serif",
              }}
            >
              <Filter size={15} />
              Színpadok
              <ChevronDown size={13} className={`transition-transform ${showStageFilter ? "rotate-180" : ""}`} />
            </button>
            {/* Grid / List view toggle */}
            <div
              className="flex border overflow-hidden shrink-0"
              style={{ borderRadius: "9999px", borderColor: "#1a6b6660" }}
            >
              <button
                onClick={() => setViewMode("grid")}
                className="flex items-center justify-center w-10 h-10 transition-all"
                style={{
                  backgroundColor: viewMode === "grid" ? "#dcea7522" : "transparent",
                  color: viewMode === "grid" ? "#dcea75" : "#7a9e9b",
                }}
                title="Naptár nézet"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className="flex items-center justify-center w-10 h-10 transition-all"
                style={{
                  backgroundColor: viewMode === "list" ? "#dcea7522" : "transparent",
                  color: viewMode === "list" ? "#dcea75" : "#7a9e9b",
                }}
                title="Lista nézet"
              >
                <List size={15} />
              </button>
            </div>
          </div>

          {/* ── DESKTOP row: all controls in one line ── */}
          <div className="hidden md:flex items-center justify-between mb-2">
            <div className="flex gap-1.5">
              {/* Favourite filter toggle */}
              <button
                onClick={() => setFilterFavourites((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-all"
                style={{
                  borderRadius: "9999px",
                  borderColor: filterFavourites ? "#e86b5a88" : "#1a6b6660",
                  color: filterFavourites ? "#e86b5a" : "#7a9e9b",
                  backgroundColor: filterFavourites ? "#e86b5a18" : "transparent",
                  fontFamily: "'Pacaembu', sans-serif",
                }}
              >
                <Heart size={13} fill={filterFavourites ? "#e86b5a" : "none"} />
                Kedvencek
              </button>
              <button
                onClick={handleListamOpen}
                className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-all"
                style={{
                  borderRadius: "9999px",
                  borderColor: showListam ? "#dcea7566" : "#1a6b6660",
                  color: showListam ? "#dcea75" : "#7a9e9b",
                  backgroundColor: showListam ? "#dcea7518" : "transparent",
                  fontFamily: "'Pacaembu', sans-serif",
                }}
              >
                <Star size={13} fill={showListam ? "#dcea75" : "none"} />
                Listám
                {favourites.size > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[9px] font-bold bg-kolo-coral text-white"
                    style={{ borderRadius: "9999px" }}
                  >
                    {favourites.size}
                  </span>
                )}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSearchOpen}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-all"
                style={{
                  borderRadius: "9999px",
                  borderColor: showSearch ? "#dcea7566" : "#1a6b6660",
                  color: showSearch ? "#dcea75" : "#7a9e9b",
                  backgroundColor: showSearch ? "#dcea7518" : "transparent",
                  fontFamily: "'Pacaembu', sans-serif",
                }}
              >
                <Search size={13} />
                Keresés
              </button>
            </div>
          </div>

          {/* Stage filters */}
          <div className={`flex flex-wrap gap-1.5 ${isMobile && !showStageFilter ? "hidden" : ""}`}>
            {STAGES.map((stage) => {
              const isActive = activeStages.has(stage.id);
              return (
                <button
                  key={stage.id}
                  onClick={() => toggleStage(stage.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-all"
                  style={{
                    borderRadius: "9999px",
                    backgroundColor: isActive ? `${stage.color}22` : "transparent",
                    borderWidth: "1px",
                    borderColor: isActive ? `${stage.color}66` : "#1a6b6630",
                    color: isActive ? stage.color : "#7a9e9b",
                    fontFamily: "'Pacaembu', sans-serif",
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: isActive ? stage.color : "#7a9e9b44" }}
                  />
                  {stage.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search panel */}
        <AnimatePresence>
          {showSearch && (
            <SearchPanel
              query={searchQuery}
              onQueryChange={setSearchQuery}
              results={searchResults}
              stages={STAGES}
              favourites={favourites}
              onToggleFavourite={toggleFavourite}
              onClose={() => { setShowSearch(false); setSearchQuery(""); }}
            />
          )}
        </AnimatePresence>

        {/* Listám panel */}
        <AnimatePresence>
          {showListam && (
            <ListamPanel
              favourites={favourites}
              allArtists={MOCK_ARTISTS}
              stages={STAGES}
              onToggleFavourite={toggleFavourite}
              onClose={() => setShowListam(false)}
              onJumpTo={jumpToArtist}
              onExportAll={exportAllFavourites}
              onShare={shareFavourites}
            />
          )}
        </AnimatePresence>
      </header>

      {/* ── Mobile List View (when viewMode=list) ── */}
      {isMobile && viewMode === "list" && (
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
                      <p
                        className="font-semibold text-base truncate uppercase"
                        style={{ color, fontFamily: "'SerialBlur', sans-serif", letterSpacing: "0.03em" }}
                      >
                        {artist.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "'Pacaembu', sans-serif" }}>
                        {formatTime(artist.startTime)}–{formatTime(artist.endTime)}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: `${color}88`, fontFamily: "'Pacaembu', sans-serif" }}>
                        {artist.stage}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavourite(artist.id); }}
                        className="p-2.5 transition-colors"
                        style={{ color: isFav ? "#e86b5a" : "#7a9e9b" }}
                      >
                        <Heart size={18} fill={isFav ? "#e86b5a" : "none"} />
                      </button>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Grid (hidden on mobile when list view is active) */}
      <div className={`container pb-8 ${isMobile && viewMode === "list" ? "hidden" : ""}`}>
        <div
          ref={gridRef}
          className="timetable-scroll overflow-x-auto overflow-y-auto mt-4 border border-kolo-teal/15"
          style={{ maxHeight: "calc(100vh - 160px)" }}
        >
          <div className="flex" style={{ minWidth: isMobile ? `${visibleStages.length * 160 + 56}px` : "auto" }}>
            {/* Time axis */}
            <div
              className="sticky left-0 z-20 shrink-0 bg-kolo-bg border-r border-kolo-teal/15"
              style={{ width: isMobile ? "48px" : "64px" }}
            >
              <div
                className="sticky top-0 z-30 bg-kolo-bg border-b border-kolo-teal/15"
                style={{ height: "40px" }}
              />
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
                        style={{ fontFamily: "'Pacaembu', sans-serif" }}
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
              <NowLineOverlay hourHeight={hourHeight} />
              {visibleStages.map((stage, idx) => {
                const stageArtists = artistsByStage.get(stage.id) || [];
                return (
                  <div
                    key={stage.id}
                    className="flex-1 min-w-[140px] md:min-w-[160px]"
                    style={{
                      borderRight: idx < visibleStages.length - 1 ? "1px solid #1a6b6620" : "none",
                    }}
                  >
                    {/* Stage header */}
                    <div
                      className="sticky top-0 z-20 px-2 py-2 text-center border-b bg-kolo-bg/95 backdrop-blur-sm"
                      style={{ height: "40px", borderColor: "#1a6b6620" }}
                    >
                      <span
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: stage.color, fontFamily: "'SerialBlur', sans-serif" }}
                      >
                        {stage.name}
                      </span>
                    </div>

                    {/* Events area */}
                    <div className="relative" style={{ height: `${totalHeight}px` }}>
                      {timeLabels.map((t) => {
                        const lineTop = (t.hour - DAY_START_HOUR) * hourHeight;
                        return (
                          <div
                            key={t.hour}
                            className="absolute left-0 right-0 border-t"
                            style={{ top: `${lineTop}px`, borderColor: "#1a6b6612" }}
                          />
                        );
                      })}

                      <AnimatePresence mode="popLayout">
                        {stageArtists.map((artist) => {
                          const refCallback = (el: HTMLDivElement | null) => {
                            if (el) blockRefs.current.set(artist.id, el);
                            else blockRefs.current.delete(artist.id);
                          };
                          return (
                            <ArtistBlock
                              key={artist.id}
                              artist={artist}
                              stage={stage}
                              hourHeight={hourHeight}
                              isFavourite={favourites.has(artist.id)}
                              onToggleFavourite={toggleFavourite}
                              blockRef={{ current: blockRefs.current.get(artist.id) ?? null } as React.RefObject<HTMLDivElement | null>}
                            />
                          );
                        })}
                      </AnimatePresence>
                      {/* Attach refs via a hidden div per artist */}
                      {stageArtists.map((artist) => (
                        <div
                          key={`ref-${artist.id}`}
                          ref={(el) => {
                            if (el) blockRefs.current.set(artist.id, el);
                          }}
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
            <p
              className="text-muted-foreground text-sm"
              style={{ fontFamily: "'Pacaembu', sans-serif" }}
            >
              {filterFavourites
                ? "Ezen a napon nincs kedvenc előadód."
                : "Ezen a napon nincs program a kiválasztott színpadokon."}
            </p>
            <button
              onClick={() => {
                setActiveStages(new Set(STAGES.map((s) => s.id)));
                setFilterFavourites(false);
              }}
              className="mt-3 text-xs text-kolo-lime underline underline-offset-2 hover:text-kolo-lime/80 transition-colors"
              style={{ fontFamily: "'Pacaembu', sans-serif" }}
            >
              Összes program mutatása
            </button>
          </div>
        )}
      </div>

    </div>
  );
}


