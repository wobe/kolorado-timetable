import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MOCK_ARTISTS, STAGES, FESTIVAL_DAYS, KOLORADO_BASE_URL,
  type Artist, type Stage,
  formatTime, getFestivalDayId,
} from "@/lib/timetable-data";
import { useLocation } from "wouter";
import ArtistPopup from "@/components/ArtistPopup";
import { toast } from "sonner";

const FAV_TOAST_KEY = "kolorado_fav_toast_seen";
function showFirstFavToast() {
  if (localStorage.getItem(FAV_TOAST_KEY)) return;
  localStorage.setItem(FAV_TOAST_KEY, "1");
  toast(
    "A kedvenceid a böngésződben tárolódnak. Itt megtalálod később is, azonban más eszközeidre nem szinkronizálódnak.",
    {
      duration: 6000,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#e53e3e" stroke="#e53e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ),
    }
  );
}

// ── Shared cookie helpers ──────────────────────────────────────────────────
const FAV_COOKIE = "kolorado_favourites";

function getFavourites(): Set<string> {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${FAV_COOKIE}=([^;]*)`));
    if (match) return new Set(JSON.parse(decodeURIComponent(match[1])));
  } catch {}
  return new Set();
}

function saveFavourites(favs: Set<string>) {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${FAV_COOKIE}=${encodeURIComponent(JSON.stringify(Array.from(favs)))}; expires=${expires}; path=/; SameSite=Lax`;
}

// ── Heart icon ─────────────────────────────────────────────────────────────
function HeartIcon({ filled, color }: { filled: boolean; color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

/*
// ── CheckboxDropdown (kept for reference, not currently used) ──
function CheckboxDropdown_UNUSED({
  label,
  options,
  selected,
  onToggle,
  onClear,
  isOpen,
  onToggleOpen,
  dropdownRef,
}: {
  label: string;
  options: Array<{ id: string; name: string }>;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}) {
  const hasSelection = selected.size > 0;
  const buttonLabel = hasSelection
    ? selected.size === 1
      ? options.find((o) => selected.has(o.id))?.name ?? label
      : `${selected.size} kiválasztva`
    : label;

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={onToggleOpen}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 9999, fontSize: 13, cursor: "pointer",
          fontFamily: "'Pacaembu', sans-serif", border: "none", transition: "all 0.15s",
          background: hasSelection ? "#642CFF" : "rgba(100,44,255,0.12)",
          color: hasSelection ? "#FEFFC0" : "#642CFF",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: 10 }}>▼</span>
        {buttonLabel}
        {hasSelection && (
          <span
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            style={{
              marginLeft: 2, width: 16, height: 16, borderRadius: "50%",
              background: "rgba(255,255,255,0.3)", display: "inline-flex",
              alignItems: "center", justifyContent: "center", fontSize: 11, lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0,
          background: "#FEFFC0", border: "2px solid rgba(100,44,255,0.2)",
          minWidth: 200, zIndex: 100, overflow: "hidden",
          boxShadow: "0 8px 24px rgba(100,44,255,0.15)",
        }}>
          {options.map((opt) => {
            const checked = selected.has(opt.id);
            return (
              <label
                key={opt.id}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 14px", cursor: "pointer",
                  background: checked ? "rgba(100,44,255,0.08)" : "transparent",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { if (!checked) (e.currentTarget as HTMLElement).style.background = "rgba(100,44,255,0.04)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = checked ? "rgba(100,44,255,0.08)" : "transparent"; }}
              >
                <span style={{
                  width: 16, height: 16, border: `2px solid #642CFF`,
                  borderRadius: 3, display: "inline-flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                  background: checked ? "#642CFF" : "transparent",
                  transition: "all 0.1s",
                }}>
                  {checked && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <polyline points="1.5,5 4,7.5 8.5,2" stroke="#FEFFC0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <input type="checkbox" checked={checked} onChange={() => onToggle(opt.id)} style={{ display: "none" }} />
                <span style={{
                  fontFamily: "'Pacaembu', sans-serif", fontSize: 13,
                  color: "#642CFF", fontWeight: checked ? 700 : 400,
                }}>
                  {opt.name}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
*/

// ── Artist card (memoised to prevent image reload on fav toggle) ─────────
const ArtistCard = React.memo(function ArtistCard({
  artist,
  fav,
  onOpen,
  onToggleFav,
}: {
  artist: Artist;
  fav: boolean;
  onOpen: () => void;
  onToggleFav: () => void;
}) {
  return (
    <div
      onClick={onOpen}
      style={{ position: "relative", paddingBottom: "100%", cursor: "pointer", overflow: "hidden", background: "#e8e9a0" }}
    >
      {artist.photo ? (
        <img
          src={artist.photo} alt={artist.name}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.35s ease" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLImageElement).style.transform = "scale(1.04)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLImageElement).style.transform = "scale(1)")}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, fontFamily: "'SerialBlur', sans-serif", color: "rgba(100,44,255,0.2)", textTransform: "uppercase" }}>
          {artist.name.slice(0, 2)}
        </div>
      )}
      <div style={{ position: "absolute", top: 0, left: 0, padding: "6px 8px 4px" }}>
        <span style={{
          fontFamily: "'SerialBlur', sans-serif",
          fontSize: 13.65, color: "#642CFF",
          textTransform: "uppercase", letterSpacing: "0.02em",
          lineHeight: 1.3, background: "#FEFFC0",
          display: "inline", boxDecorationBreak: "clone",
          WebkitBoxDecorationBreak: "clone", padding: "2px 6px",
        } as React.CSSProperties}>
          {artist.name}
        </span>
        {artist.title1 && (
          <>
            <br />
            <span style={{
              fontFamily: "'SerialBlur', sans-serif",
              fontSize: 11, color: "#642CFF",
              textTransform: "uppercase", letterSpacing: "0.02em",
              lineHeight: 1.3, background: "#FEFFC0",
              display: "inline", boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone", padding: "2px 6px",
            } as React.CSSProperties}>
              {artist.title1}
            </span>
          </>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
        style={{
          position: "absolute", bottom: 10, right: 10,
          width: 36, height: 36, borderRadius: "50%",
          background: fav ? "#e53e3e" : "rgba(254,255,192,0.95)",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 10px rgba(0,0,0,0.25)", transition: "all 0.15s", zIndex: 2,
        }}
      >
        <HeartIcon filled={fav} color={fav ? "white" : "#642CFF"} />
      </button>
    </div>
  );
});

// ── URL helpers ───────────────────────────────────────────────────────────
type MusicType = "zene" | "nemzene" | null; // null = all

function readUrlParams(): { stage: string; day: string; tipus: MusicType; artist: string } {
  const p = new URLSearchParams(window.location.search);
  const t = p.get("tipus");
  return {
    stage: p.get("szinhely") ?? "",
    day: p.get("nap") ?? "",
    tipus: t === "nemzene" ? "nemzene" : t === "all" ? null : "zene",
    artist: p.get("artist") ?? "",
  };
}

function pushUrlParams(stage: string, day: string, tipus: MusicType, artist?: string) {
  const p = new URLSearchParams();
  if (stage) p.set("szinhely", stage);
  if (day) p.set("nap", day);
  if (tipus === "nemzene") p.set("tipus", "nemzene");
  else if (tipus === null) p.set("tipus", "all");
  // zene is default — no param needed
  if (artist) p.set("artist", artist);
  const qs = p.toString();
  const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, "", newUrl);
}

// ── Main LineupGrid page ───────────────────────────────────────────────────
export default function LineupGrid() {
  const [, setLocation] = useLocation();
  const [favourites, setFavourites] = useState<Set<string>>(getFavourites);

  // Read initial state from URL
  const initialParams = useState(() => readUrlParams())[0];

  // Single-select filters (dropdown pills)
  const [selectedStage, setSelectedStage] = useState<string>(initialParams.stage);
  const [selectedDay, setSelectedDay] = useState<string>(initialParams.day);
  // ZENE / NEMZENE split pill — null means "all"
  const [musicType, setMusicType] = useState<MusicType>(initialParams.tipus);

  const [showFavOnly, setShowFavOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [dayOpen, setDayOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [activeArtist, setActiveArtistRaw] = useState<Artist | null>(() => {
    const slug = readUrlParams().artist;
    if (!slug) return null;
    return MOCK_ARTISTS.find((a) => a.id === slug || a.name.toLowerCase().replace(/\s+/g, "-") === slug) ?? null;
  });

  // Wrapper that also updates the URL
  function setActiveArtist(artist: Artist | null) {
    setActiveArtistRaw(artist);
    pushUrlParams(selectedStage, selectedDay, musicType, artist?.id ?? undefined);
  }

  const stageRef = useRef<HTMLDivElement | null>(null);
  const dayRef = useRef<HTMLDivElement | null>(null);
  const mobileFilterRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { saveFavourites(favourites); }, [favourites]);

  // Sync URL when filters change (preserve active artist in URL)
  useEffect(() => {
    pushUrlParams(selectedStage, selectedDay, musicType, activeArtist?.id ?? undefined);
  }, [selectedStage, selectedDay, musicType, activeArtist]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [searchOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (stageRef.current && !stageRef.current.contains(e.target as Node)) setStageOpen(false);
      if (dayRef.current && !dayRef.current.contains(e.target as Node)) setDayOpen(false);
      if (mobileFilterRef.current && !mobileFilterRef.current.contains(e.target as Node)) setMobileFiltersOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggleFav(id: string) {
    setFavourites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); showFirstFavToast(); }
      return next;
    });
  }

  // Toggle ZENE / NEMZENE — clicking the active side deactivates (shows all)
  function handleMusicType(clicked: "zene" | "nemzene") {
    setMusicType((prev) => (prev === clicked ? null : clicked));
  }

  // Sort alphabetically
  const artists = [...MOCK_ARTISTS].sort((a, b) =>
    a.name.localeCompare(b.name, "hu", { sensitivity: "base" })
  );

  const filtered = artists.filter((a) => {
    if (showFavOnly && !favourites.has(a.id)) return false;
    // Stage filter (single-select by name)
    if (selectedStage && a.stage && a.stage !== selectedStage) return false;
    // Day filter (single-select by day id)
    if (selectedDay && a.startTime) {
      const dayId = getFestivalDayId(a.startTime);
      if (dayId && dayId !== selectedDay) return false;
    }
    // Music type filter
    if (musicType === "zene") {
      // Show Élőzene, Elektronikus zene, and artists with no programtipus
      if (a.programtipus === "Nemzene") return false;
    } else if (musicType === "nemzene") {
      if (a.programtipus !== "Nemzene") return false;
    }
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!a.name.toLowerCase().includes(q) && !(a.genre ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Options for dropdowns
  const stageOptions = STAGES.map((s: Stage) => ({ id: s.name, name: s.name }));
  const dayOptions = FESTIVAL_DAYS.map((d) => ({ id: d.id, name: d.label }));

  const hasActiveFilters = !!selectedStage || !!selectedDay || showFavOnly || musicType !== "zene";

  const pillBase: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 14px", borderRadius: 9999, fontSize: 13, cursor: "pointer",
    fontFamily: "'Pacaembu', sans-serif", border: "none", transition: "all 0.15s",
  };

  return (
    <div ref={pageRef} style={{ height: "100vh", overflowY: "auto", background: "#FEFFC0" }}>
      {/* ── Filter header ── */}
      <div
        style={{
          background: "#FEFFC0",
          padding: "10px 16px",
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
          position: "sticky", top: 0, zIndex: 10,
          borderBottom: "1.5px solid rgba(100,44,255,0.1)",
        }}
      >
        {/* ── Stage dropdown — hidden until schedule is announced ── */}
        <div ref={stageRef} style={{ position: "relative", display: "none" }}>
          <button
            onClick={() => { setStageOpen((o) => !o); setDayOpen(false); }}
            style={{
              ...pillBase,
              background: selectedStage ? "#642CFF" : "rgba(100,44,255,0.12)",
              color: selectedStage ? "#FEFFC0" : "#642CFF",
            }}
          >
            <span style={{ fontSize: 10 }}>▼</span>
            {selectedStage || "Színpad"}
            {selectedStage && (
              <span
                onClick={(e) => { e.stopPropagation(); setSelectedStage(""); }}
                style={{ marginLeft: 2, width: 16, height: 16, borderRadius: "50%", background: "rgba(254,255,192,0.3)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, cursor: "pointer" }}
              >×</span>
            )}
          </button>
          {stageOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0,
              background: "#FEFFC0", border: "2px solid rgba(100,44,255,0.2)",
              minWidth: 180, zIndex: 200, boxShadow: "0 8px 24px rgba(100,44,255,0.15)",
              borderRadius: 12, overflow: "hidden",
            }}>
              {stageOptions.map((o) => (
                <button
                  key={o.id}
                  onClick={() => { setSelectedStage(selectedStage === o.id ? "" : o.id); setStageOpen(false); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "8px 14px", border: "none", cursor: "pointer",
                    fontFamily: "'Pacaembu', sans-serif", fontSize: 13,
                    background: selectedStage === o.id ? "#642CFF" : "transparent",
                    color: selectedStage === o.id ? "#FEFFC0" : "#642CFF",
                  }}
                >{o.name}</button>
              ))}
            </div>
          )}
        </div>

        {/* ── Day dropdown — hidden until schedule is announced ── */}
        <div ref={dayRef} style={{ position: "relative", display: "none" }}>
          <button
            onClick={() => { setDayOpen((o) => !o); setStageOpen(false); }}
            style={{
              ...pillBase,
              background: selectedDay ? "#642CFF" : "rgba(100,44,255,0.12)",
              color: selectedDay ? "#FEFFC0" : "#642CFF",
            }}
          >
            <span style={{ fontSize: 10 }}>▼</span>
            {selectedDay ? FESTIVAL_DAYS.find((d) => d.id === selectedDay)?.label ?? selectedDay : "Nap"}
            {selectedDay && (
              <span
                onClick={(e) => { e.stopPropagation(); setSelectedDay(""); }}
                style={{ marginLeft: 2, width: 16, height: 16, borderRadius: "50%", background: "rgba(254,255,192,0.3)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, cursor: "pointer" }}
              >×</span>
            )}
          </button>
          {dayOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0,
              background: "#FEFFC0", border: "2px solid rgba(100,44,255,0.2)",
              minWidth: 160, zIndex: 200, boxShadow: "0 8px 24px rgba(100,44,255,0.15)",
              borderRadius: 12, overflow: "hidden",
            }}>
              {dayOptions.map((o) => (
                <button
                  key={o.id}
                  onClick={() => { setSelectedDay(selectedDay === o.id ? "" : o.id); setDayOpen(false); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "8px 14px", border: "none", cursor: "pointer",
                    fontFamily: "'Pacaembu', sans-serif", fontSize: 13,
                    background: selectedDay === o.id ? "#642CFF" : "transparent",
                    color: selectedDay === o.id ? "#FEFFC0" : "#642CFF",
                  }}
                >{o.name}</button>
              ))}
            </div>
          )}
        </div>

        {/* ── ZENE / NEMZENE split pill ── */}
        <div style={{
          display: "inline-flex", borderRadius: 9999, overflow: "hidden",
          border: "1.5px solid rgba(100,44,255,0.25)",
        }}>
          <button
            onClick={() => handleMusicType("zene")}
            style={{
              padding: "6px 14px", border: "none", cursor: "pointer",
              fontFamily: "'Pacaembu', sans-serif", fontSize: 13, transition: "all 0.15s",
              background: musicType === "zene" ? "#642CFF" : "transparent",
              color: musicType === "zene" ? "#FEFFC0" : "#642CFF",
              borderRight: "1px solid rgba(100,44,255,0.2)",
            }}
          >ZENE</button>
          <button
            onClick={() => handleMusicType("nemzene")}
            style={{
              padding: "6px 14px", border: "none", cursor: "pointer",
              fontFamily: "'Pacaembu', sans-serif", fontSize: 13, transition: "all 0.15s",
              background: musicType === "nemzene" ? "#642CFF" : "transparent",
              color: musicType === "nemzene" ? "#FEFFC0" : "#642CFF",
            }}
          >NEMZENE</button>
        </div>

        {/* ── Kedvencek pill ── */}
        <button
          onClick={() => setShowFavOnly((v) => !v)}
          className="lineup-fav-btn"
          style={{
            ...pillBase,
            background: showFavOnly ? "#e53e3e" : "rgba(100,44,255,0.12)",
            color: showFavOnly ? "white" : "#642CFF",
          }}
        >
          <HeartIcon filled={showFavOnly} color={showFavOnly ? "white" : "#642CFF"} />
          <span className="lineup-fav-label">Kedvencek</span>
          {favourites.size > 0 && (
            <span className="lineup-fav-count" style={{ background: showFavOnly ? "rgba(255,255,255,0.3)" : "#642CFF", color: "#FEFFC0", borderRadius: 9999, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>
              {favourites.size}
            </span>
          )}
        </button>

        {/* ── Search (right side) — pill expands via CSS transition, input stays mounted to avoid reversed-typing bug ── */}
        <div style={{ display: "flex", alignItems: "center", marginLeft: "auto" }}>
          <div
            style={{
              display: "flex", alignItems: "center", gap: 6,
              height: 36, borderRadius: 9999,
              border: searchOpen ? "1.5px solid rgba(100,44,255,0.35)" : "1.5px solid rgba(100,44,255,0.25)",
              background: searchOpen ? "rgba(100,44,255,0.07)" : (searchQuery ? "#642CFF" : "transparent"),
              overflow: "hidden",
              width: searchOpen ? 200 : 36,
              transition: "width 0.2s ease, background 0.15s ease, border-color 0.15s ease",
              cursor: searchOpen ? "default" : "pointer",
              padding: searchOpen ? "0 10px" : "0",
              justifyContent: searchOpen ? "flex-start" : "center",
              flexShrink: 0,
            }}
            onClick={() => { if (!searchOpen) setSearchOpen(true); }}
          >
            {/* Search icon — always visible when closed, hidden when open */}
            {!searchOpen && (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke={searchQuery ? "#FEFFC0" : "#642CFF"}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            )}
            {searchOpen && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#642CFF"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            )}
            {/* Input — always mounted to prevent cursor/reversed-typing bug */}
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); } }}
              placeholder="Keresés..."
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "#642CFF", fontFamily: "'Pacaembu', sans-serif", fontSize: 13, minWidth: 0,
                display: searchOpen ? "block" : "none",
                width: searchOpen ? "100%" : 0,
              }}
            />
            {searchOpen && (
              <button
                onClick={(e) => { e.stopPropagation(); setSearchOpen(false); setSearchQuery(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(100,44,255,0.5)", display: "flex", alignItems: "center", padding: 0, flexShrink: 0 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, padding: 16 }}
        className="lineup-grid"
      >
        {filtered.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "64px 24px", fontFamily: "'Pacaembu', sans-serif", color: "rgba(100,44,255,0.4)", fontSize: 14 }}>
            <div style={{ fontFamily: "'SerialBlur', sans-serif", fontSize: 20, textTransform: "uppercase", marginBottom: 8, color: "rgba(100,44,255,0.3)" }}>Nincs találat</div>
            Próbálj más szűrőt!
          </div>
        ) : filtered.map((artist) => (
          <ArtistCard
            key={artist.id}
            artist={artist}
            fav={favourites.has(artist.id)}
            onOpen={() => setActiveArtist(artist)}
            onToggleFav={() => toggleFav(artist.id)}
          />
        ))}
      </div>

      {/* ── Popup ── */}
      {activeArtist && (() => {
        const navIdx = filtered.findIndex((a) => a.id === activeArtist.id);
        return (
          <ArtistPopup
            artist={activeArtist}
            isFav={favourites.has(activeArtist.id)}
            onToggleFav={() => toggleFav(activeArtist.id)}
            onClose={() => setActiveArtist(null)}
            onPrev={navIdx > 0 ? () => setActiveArtist(filtered[navIdx - 1]) : undefined}
            onNext={navIdx < filtered.length - 1 ? () => setActiveArtist(filtered[navIdx + 1]) : undefined}
          />
        );
      })()}

      {/* ── Page switcher ── */}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 999 }}>
        <button
          onClick={() => setLocation("/")}
          style={{ padding: "8px 16px", borderRadius: 9999, border: "none", cursor: "pointer", background: "#642CFF", color: "#FEFFC0", fontFamily: "'Pacaembu', sans-serif", fontSize: 13, boxShadow: "0 2px 12px rgba(100,44,255,0.4)" }}
        >
          → Menetrend
        </button>
      </div>

      {/* ── Responsive CSS ── */}
      <style>{`
        @media (min-width: 640px) { .lineup-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (min-width: 900px) { .lineup-grid { grid-template-columns: repeat(4, 1fr) !important; } }
        @media (min-width: 1280px) { .lineup-grid { grid-template-columns: repeat(5, 1fr) !important; } }

        /* Mobile: Kedvencek — icon only, no label or count badge */
        @media (max-width: 639px) {
          .lineup-fav-label { display: none !important; }
          .lineup-fav-count { display: none !important; }
          .lineup-fav-btn { padding: 6px 10px !important; }
        }
      `}</style>
    </div>
  );
}
