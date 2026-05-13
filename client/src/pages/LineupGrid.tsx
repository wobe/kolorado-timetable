import { useState, useEffect, useRef } from "react";
import {
  MOCK_ARTISTS, STAGES, FESTIVAL_DAYS, KOLORADO_BASE_URL,
  formatTime, getFestivalDayId,
} from "@/lib/timetable-data";
import type { Artist, Stage } from "@/lib/timetable-data";
import { useLocation } from "wouter";

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

// Extended artist type
type ArtistExtended = Artist & {
  photo?: string;
  description?: string;
  nationality?: string;
  youtubeLink?: string;
  soundcloudLink?: string;
};

// ── Heart icon ─────────────────────────────────────────────────────────────
function HeartIcon({ filled, color }: { filled: boolean; color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

// ── Checkbox multi-select dropdown ────────────────────────────────────────
function CheckboxDropdown({
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

// ── Artist popup ───────────────────────────────────────────────────────────
function ArtistPopup({
  artist, isFav, onToggleFav, onClose,
}: {
  artist: ArtistExtended; isFav: boolean; onToggleFav: () => void; onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        background: "rgba(14,75,77,0.88)", backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative", width: "100%", maxWidth: 520,
          background: "#FEFFC0", overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ position: "relative", width: "100%", paddingBottom: "100%" }}>
          {artist.photo ? (
            <img src={artist.photo} alt={artist.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#e8e9a0", fontSize: 48, fontFamily: "'SerialBlur', sans-serif", color: "#642CFF", textTransform: "uppercase" }}>
              {artist.name.slice(0, 2)}
            </div>
          )}
          <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", background: "rgba(254,255,192,0.9)", border: "none", cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", color: "#642CFF", fontWeight: 700 }}>×</button>
        </div>
        <div style={{ padding: "20px 24px 24px" }}>
          <h2 style={{ fontFamily: "'SerialBlur', sans-serif", fontSize: 24, textTransform: "uppercase", color: "#642CFF", marginBottom: 8, lineHeight: 1.1 }}>{artist.name}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {artist.stage && <span style={{ padding: "3px 10px", background: "#642CFF", color: "#FEFFC0", fontFamily: "'Pacaembu', sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{artist.stage}</span>}
            {artist.genre && <span style={{ padding: "3px 10px", background: "rgba(100,44,255,0.12)", color: "#642CFF", fontFamily: "'Pacaembu', sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{artist.genre}</span>}
            {artist.nationality && <span style={{ padding: "3px 10px", background: "rgba(100,44,255,0.08)", color: "#642CFF", fontFamily: "'Pacaembu', sans-serif", fontSize: 11 }}>{artist.nationality}</span>}
          </div>
          {artist.startTime && artist.endTime && (
            <p style={{ fontFamily: "'Pacaembu', sans-serif", fontSize: 13, color: "#0E4B4D", marginBottom: 10 }}>{formatTime(artist.startTime)} – {formatTime(artist.endTime)}</p>
          )}
          {artist.description ? (
            <p style={{ fontFamily: "'Pacaembu', sans-serif", fontSize: 13, color: "#333", lineHeight: 1.6, marginBottom: 16 }}>{artist.description}</p>
          ) : (
            <p style={{ fontFamily: "'Pacaembu', sans-serif", fontSize: 13, color: "rgba(0,0,0,0.35)", marginBottom: 16 }}>Részletek hamarosan...</p>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={onToggleFav} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: 9999, border: "none", cursor: "pointer", background: isFav ? "#e53e3e" : "#642CFF", color: "white", fontFamily: "'Pacaembu', sans-serif", fontSize: 13, transition: "all 0.15s" }}>
              <HeartIcon filled={isFav} color="white" />
              {isFav ? "Kedvenc" : "Kedvencnek"}
            </button>
            {artist.url && (
              <a href={`${KOLORADO_BASE_URL}${artist.url}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 9999, background: "rgba(100,44,255,0.1)", color: "#642CFF", fontFamily: "'Pacaembu', sans-serif", fontSize: 13, textDecoration: "none" }}>
                ↗ Kolorádó oldal
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main LineupGrid page ───────────────────────────────────────────────────
export default function LineupGrid() {
  const [, setLocation] = useLocation();
  const [favourites, setFavourites] = useState<Set<string>>(getFavourites);
  // Multi-select filters — store stage NAMES (not slugs) and day IDs
  const [selectedStages, setSelectedStages] = useState<Set<string>>(new Set());
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [dayOpen, setDayOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [activeArtist, setActiveArtist] = useState<ArtistExtended | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const dayRef = useRef<HTMLDivElement | null>(null);
  const mobileFilterRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { saveFavourites(favourites); }, [favourites]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
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
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleStage(name: string) {
    setSelectedStages((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  function toggleDay(id: string) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Sort alphabetically
  const artists = [...(MOCK_ARTISTS as ArtistExtended[])].sort((a, b) =>
    a.name.localeCompare(b.name, "hu", { sensitivity: "base" })
  );

  const filtered = artists.filter((a) => {
    // Favourites filter
    if (showFavOnly && !favourites.has(a.id)) return false;
    // Stage filter — compare stage NAME directly
    if (selectedStages.size > 0 && !selectedStages.has(a.stage)) return false;
    // Day filter — derive festival day from startTime
    if (selectedDays.size > 0) {
      const dayId = getFestivalDayId(a.startTime);
      if (!dayId || !selectedDays.has(dayId)) return false;
    }
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!a.name.toLowerCase().includes(q) && !(a.genre ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Options for dropdowns — use stage NAMES as IDs for direct comparison
  const stageOptions = STAGES.map((s: Stage) => ({ id: s.name, name: s.name }));
  const dayOptions = FESTIVAL_DAYS.map((d) => ({ id: d.id, name: d.label }));

  const hasActiveFilters = selectedStages.size > 0 || selectedDays.size > 0 || showFavOnly;

  const pillBase: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 14px", borderRadius: 9999, fontSize: 13, cursor: "pointer",
    fontFamily: "'Pacaembu', sans-serif", border: "none", transition: "all 0.15s",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FEFFC0" }}>
      {/* ── Header ── */}
      <div
        style={{
          position: "sticky", top: 0, zIndex: 30,
          background: "#FEFFC0",
          borderBottom: "2px solid rgba(100,44,255,0.15)",
          padding: "10px 16px",
          display: "flex", alignItems: "center", gap: 10,
        }}
      >
        {/* ── Desktop filters (hidden on mobile) ── */}
        <div className="lineup-desktop-filters" style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, flexWrap: "wrap" }}>
          <CheckboxDropdown
            label="Színpad"
            options={stageOptions}
            selected={selectedStages}
            onToggle={toggleStage}
            onClear={() => setSelectedStages(new Set())}
            isOpen={stageOpen}
            onToggleOpen={() => { setStageOpen((o) => !o); setDayOpen(false); }}
            dropdownRef={stageRef}
          />
          <CheckboxDropdown
            label="Nap"
            options={dayOptions}
            selected={selectedDays}
            onToggle={toggleDay}
            onClear={() => setSelectedDays(new Set())}
            isOpen={dayOpen}
            onToggleOpen={() => { setDayOpen((o) => !o); setStageOpen(false); }}
            dropdownRef={dayRef}
          />
          <button
            onClick={() => setShowFavOnly((v) => !v)}
            style={{
              ...pillBase,
              background: showFavOnly ? "#e53e3e" : "rgba(100,44,255,0.12)",
              color: showFavOnly ? "white" : "#642CFF",
            }}
          >
            <HeartIcon filled={showFavOnly} color={showFavOnly ? "white" : "#642CFF"} />
            Kedvencek
            {favourites.size > 0 && (
              <span style={{ background: showFavOnly ? "rgba(255,255,255,0.3)" : "#642CFF", color: "#FEFFC0", borderRadius: 9999, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>
                {favourites.size}
              </span>
            )}
          </button>
        </div>

        {/* ── Mobile filter icon (hidden on desktop) ── */}
        <div className="lineup-mobile-filters" ref={mobileFilterRef} style={{ position: "relative", flex: 1 }}>
          <button
            onClick={() => setMobileFiltersOpen((o) => !o)}
            style={{
              width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: hasActiveFilters ? "#642CFF" : "rgba(100,44,255,0.12)",
              color: hasActiveFilters ? "#FEFFC0" : "#642CFF",
              position: "relative",
            }}
            title="Szűrők"
          >
            {/* Filter icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            {hasActiveFilters && (
              <span style={{
                position: "absolute", top: -3, right: -3,
                width: 14, height: 14, borderRadius: "50%",
                background: "#e53e3e", color: "white",
                fontSize: 9, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {selectedStages.size + selectedDays.size + (showFavOnly ? 1 : 0)}
              </span>
            )}
          </button>

          {/* Mobile filter panel */}
          {mobileFiltersOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", left: 0,
              background: "#FEFFC0", border: "2px solid rgba(100,44,255,0.2)",
              minWidth: 240, zIndex: 100,
              boxShadow: "0 8px 24px rgba(100,44,255,0.15)",
              padding: "12px",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              {/* Stage section */}
              <div style={{ fontFamily: "'Pacaembu', sans-serif", fontSize: 11, color: "rgba(100,44,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Színpad</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                {stageOptions.map((s) => {
                  const active = selectedStages.has(s.id);
                  return (
                    <button key={s.id} onClick={() => toggleStage(s.id)} style={{ ...pillBase, padding: "4px 10px", fontSize: 12, background: active ? "#642CFF" : "rgba(100,44,255,0.1)", color: active ? "#FEFFC0" : "#642CFF" }}>
                      {s.name}
                    </button>
                  );
                })}
              </div>
              {/* Day section */}
              <div style={{ fontFamily: "'Pacaembu', sans-serif", fontSize: 11, color: "rgba(100,44,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Nap</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                {dayOptions.map((d) => {
                  const active = selectedDays.has(d.id);
                  return (
                    <button key={d.id} onClick={() => toggleDay(d.id)} style={{ ...pillBase, padding: "4px 10px", fontSize: 12, background: active ? "#642CFF" : "rgba(100,44,255,0.1)", color: active ? "#FEFFC0" : "#642CFF" }}>
                      {d.name}
                    </button>
                  );
                })}
              </div>
              {/* Kedvencek */}
              <button onClick={() => setShowFavOnly((v) => !v)} style={{ ...pillBase, padding: "6px 12px", fontSize: 12, background: showFavOnly ? "#e53e3e" : "rgba(100,44,255,0.1)", color: showFavOnly ? "white" : "#642CFF", justifyContent: "flex-start" }}>
                <HeartIcon filled={showFavOnly} color={showFavOnly ? "white" : "#642CFF"} />
                Kedvencek
                {favourites.size > 0 && <span style={{ background: showFavOnly ? "rgba(255,255,255,0.3)" : "#642CFF", color: "#FEFFC0", borderRadius: 9999, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{favourites.size}</span>}
              </button>
              {/* Clear all */}
              {hasActiveFilters && (
                <button onClick={() => { setSelectedStages(new Set()); setSelectedDays(new Set()); setShowFavOnly(false); }} style={{ ...pillBase, padding: "4px 10px", fontSize: 12, background: "rgba(100,44,255,0.06)", color: "#642CFF", justifyContent: "center" }}>
                  × Szűrők törlése
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Search (right side, always visible) ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          {searchOpen && (
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); } }}
              placeholder="Keresés..."
              style={{
                height: 36, padding: "0 12px",
                border: "2px solid rgba(100,44,255,0.3)",
                background: "rgba(100,44,255,0.06)",
                color: "#642CFF", fontFamily: "'Pacaembu', sans-serif", fontSize: 13,
                outline: "none", width: 160,
              }}
            />
          )}
          <button
            onClick={() => { setSearchOpen((o) => !o); if (searchOpen) setSearchQuery(""); }}
            style={{
              width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: searchOpen || searchQuery ? "#642CFF" : "rgba(100,44,255,0.12)",
              color: searchOpen || searchQuery ? "#FEFFC0" : "#642CFF",
              flexShrink: 0,
            }}
            title="Keresés"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
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
        ) : filtered.map((artist) => {
          const fav = favourites.has(artist.id);
          return (
            <div
              key={artist.id}
              onClick={() => setActiveArtist(artist)}
              style={{ position: "relative", paddingBottom: "100%", cursor: "pointer", overflow: "hidden", background: "#e8e9a0" }}
            >
              {/* Photo */}
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

              {/* Name overlay — top-left, yellow bg, purple text (restored style) */}
              <div style={{ position: "absolute", top: 0, left: 0, padding: "6px 10px", background: "#FEFFC0", maxWidth: "85%" }}>
                <span style={{ fontFamily: "'SerialBlur', sans-serif", fontSize: 13, color: "#642CFF", textTransform: "uppercase", letterSpacing: "0.02em", lineHeight: 1.2, display: "block" }}>
                  {artist.name}
                </span>
              </div>

              {/* Heart fav button — bottom-right */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleFav(artist.id); }}
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
        })}
      </div>

      {/* ── Popup ── */}
      {activeArtist && (
        <ArtistPopup
          artist={activeArtist}
          isFav={favourites.has(activeArtist.id)}
          onToggleFav={() => toggleFav(activeArtist.id)}
          onClose={() => setActiveArtist(null)}
        />
      )}

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

        /* Desktop: show full filters, hide mobile icon */
        .lineup-desktop-filters { display: flex !important; }
        .lineup-mobile-filters { display: none !important; }

        /* Mobile: hide full filters, show icon */
        @media (max-width: 639px) {
          .lineup-desktop-filters { display: none !important; }
          .lineup-mobile-filters { display: block !important; }
        }
      `}</style>
    </div>
  );
}
