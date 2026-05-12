import { useState, useEffect, useRef } from "react";
import { MOCK_ARTISTS, STAGES, FESTIVAL_DAYS, KOLORADO_BASE_URL, formatTime } from "@/lib/timetable-data";
import type { Artist, Stage } from "@/lib/timetable-data";
import { useLocation } from "wouter";

// ── Shared cookie helpers (same key as Timetable) ──────────────────────────
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

// Extended artist type for CMS data fields
// CMS field mapping: title→name, photo→photo, genre1→genre, id→startTime, id1→endTime, sznpad→stage, website→url, longDescription→description, jobTitle→nationality, youtubeLink2→youtubeLink, newField→soundcloudLink
type ArtistExtended = Artist & {
  photo?: string;
  day?: string;
  description?: string;
  nationality?: string;
  youtubeLink?: string;
  soundcloudLink?: string;
};

// ── Heart icon SVG ─────────────────────────────────────────────────────────
function HeartIcon({ filled, color }: { filled: boolean; color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

// ── Artist popup ───────────────────────────────────────────────────────────
function ArtistPopup({
  artist,
  isFav,
  onToggleFav,
  onClose,
}: {
  artist: ArtistExtended;
  isFav: boolean;
  onToggleFav: () => void;
  onClose: () => void;
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
        {/* Photo — 1:1 */}
        <div style={{ position: "relative", width: "100%", paddingBottom: "100%" }}>
          {artist.photo ? (
            <img
              src={artist.photo}
              alt={artist.name}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#e8e9a0", fontSize: 48, fontFamily: "'SerialBlur', sans-serif", color: "#642CFF", textTransform: "uppercase" }}>
              {artist.name.slice(0, 2)}
            </div>
          )}
          {/* Close */}
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: 12, right: 12,
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(254,255,192,0.9)", border: "none", cursor: "pointer",
              fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
              color: "#642CFF", fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>

        {/* Info */}
        <div style={{ padding: "20px 24px 24px" }}>
          {/* Name */}
          <h2 style={{ fontFamily: "'SerialBlur', sans-serif", fontSize: 24, textTransform: "uppercase", color: "#642CFF", marginBottom: 8, lineHeight: 1.1 }}>
            {artist.name}
          </h2>

          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {artist.stage && (
              <span style={{ padding: "3px 10px", background: "#642CFF", color: "#FEFFC0", fontFamily: "'Pacaembu', sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {artist.stage}
              </span>
            )}
            {artist.genre && (
              <span style={{ padding: "3px 10px", background: "rgba(100,44,255,0.12)", color: "#642CFF", fontFamily: "'Pacaembu', sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {artist.genre}
              </span>
            )}
            {artist.nationality && (
              <span style={{ padding: "3px 10px", background: "rgba(100,44,255,0.08)", color: "#642CFF", fontFamily: "'Pacaembu', sans-serif", fontSize: 11 }}>
                {artist.nationality}
              </span>
            )}
          </div>

          {/* Time */}
          {artist.startTime && artist.endTime && (
            <p style={{ fontFamily: "'Pacaembu', sans-serif", fontSize: 13, color: "#0E4B4D", marginBottom: 10 }}>
              {formatTime(artist.startTime)} – {formatTime(artist.endTime)}
            </p>
          )}

          {/* Description */}
          {artist.description ? (
            <p style={{ fontFamily: "'Pacaembu', sans-serif", fontSize: 13, color: "#333", lineHeight: 1.6, marginBottom: 16 }}>
              {artist.description}
            </p>
          ) : (
            <p style={{ fontFamily: "'Pacaembu', sans-serif", fontSize: 13, color: "rgba(0,0,0,0.35)", marginBottom: 16 }}>
              Részletek hamarosan...
            </p>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={onToggleFav}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "8px 18px", borderRadius: 9999, border: "none", cursor: "pointer",
                background: isFav ? "#e53e3e" : "#642CFF",
                color: "white",
                fontFamily: "'Pacaembu', sans-serif", fontSize: 13,
                transition: "all 0.15s",
              }}
            >
              <HeartIcon filled={isFav} color="white" />
              {isFav ? "Kedvenc" : "Kedvencnek"}
            </button>
            {artist.url && (
              <a
                href={`${KOLORADO_BASE_URL}${artist.url}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 18px", borderRadius: 9999,
                  background: "rgba(100,44,255,0.1)", color: "#642CFF",
                  fontFamily: "'Pacaembu', sans-serif", fontSize: 13,
                  textDecoration: "none",
                }}
              >
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
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [dayOpen, setDayOpen] = useState(false);
  const [activeArtist, setActiveArtist] = useState<ArtistExtended | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dayRef = useRef<HTMLDivElement>(null);

  useEffect(() => { saveFavourites(favourites); }, [favourites]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (stageRef.current && !stageRef.current.contains(e.target as Node)) setStageOpen(false);
      if (dayRef.current && !dayRef.current.contains(e.target as Node)) setDayOpen(false);
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

  const artists = MOCK_ARTISTS as ArtistExtended[];

  const filtered = artists.filter((a) => {
    if (showFavOnly && !favourites.has(a.id)) return false;
    if (selectedStage !== "all" && a.stage !== selectedStage) return false;
    if (selectedDay !== "all" && a.day !== selectedDay) return false;
    return true;
  });

  const pillBase: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 14px", borderRadius: 9999, fontSize: 13, cursor: "pointer",
    fontFamily: "'Pacaembu', sans-serif", border: "none", transition: "all 0.15s",
  };

  const stageOptions: Array<{ id: string; name: string }> = [
    { id: "all", name: "Minden színpad" },
    ...STAGES.map((s: Stage) => ({ id: s.id, name: s.name })),
  ];

  const dayOptions = [
    { id: "all", name: "Minden nap" },
    ...FESTIVAL_DAYS.map((d) => ({ id: d.id, name: d.label })),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#FEFFC0" }}>
      {/* ── Header ── */}
      <div
        style={{
          position: "sticky", top: 0, zIndex: 30,
          background: "#FEFFC0",
          borderBottom: "2px solid rgba(100,44,255,0.15)",
          padding: "10px 16px",
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        }}
      >
        {/* Stage filter */}
        <div ref={stageRef} style={{ position: "relative" }}>
          <button
            onClick={() => { setStageOpen((o) => !o); setDayOpen(false); }}
            style={{
              ...pillBase,
              background: selectedStage !== "all" ? "#642CFF" : "rgba(100,44,255,0.12)",
              color: selectedStage !== "all" ? "#FEFFC0" : "#642CFF",
            }}
          >
            <span style={{ fontSize: 10 }}>▼</span>
            {selectedStage === "all" ? "Színpad" : selectedStage}
          </button>
          {stageOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "#FEFFC0", border: "2px solid rgba(100,44,255,0.2)", minWidth: 180, zIndex: 100, overflow: "hidden" }}>
              {stageOptions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedStage(s.id === "all" ? "all" : s.name); setStageOpen(false); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", background: selectedStage === (s.id === "all" ? "all" : s.name) ? "rgba(100,44,255,0.1)" : "transparent", color: "#642CFF", fontFamily: "'Pacaembu', sans-serif", fontSize: 13, border: "none", cursor: "pointer", fontWeight: selectedStage === (s.id === "all" ? "all" : s.name) ? 700 : 400 }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Day filter */}
        <div ref={dayRef} style={{ position: "relative" }}>
          <button
            onClick={() => { setDayOpen((o) => !o); setStageOpen(false); }}
            style={{
              ...pillBase,
              background: selectedDay !== "all" ? "#642CFF" : "rgba(100,44,255,0.12)",
              color: selectedDay !== "all" ? "#FEFFC0" : "#642CFF",
            }}
          >
            <span style={{ fontSize: 10 }}>▼</span>
            {selectedDay === "all" ? "Nap" : selectedDay}
          </button>
          {dayOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "#FEFFC0", border: "2px solid rgba(100,44,255,0.2)", minWidth: 160, zIndex: 100, overflow: "hidden" }}>
              {dayOptions.map((d) => (
                <button
                  key={d.id}
                  onClick={() => { setSelectedDay(d.id === "all" ? "all" : d.name); setDayOpen(false); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", background: selectedDay === (d.id === "all" ? "all" : d.name) ? "rgba(100,44,255,0.1)" : "transparent", color: "#642CFF", fontFamily: "'Pacaembu', sans-serif", fontSize: 13, border: "none", cursor: "pointer", fontWeight: selectedDay === (d.id === "all" ? "all" : d.name) ? 700 : 400 }}
                >
                  {d.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Kedvencek toggle */}
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

        {/* Count */}
        <span style={{ marginLeft: "auto", fontFamily: "'Pacaembu', sans-serif", fontSize: 12, color: "rgba(100,44,255,0.5)" }}>
          {filtered.length} előadó
        </span>
      </div>

      {/* ── Grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          padding: 16,
        }}
        className="lineup-grid"
      >
        {filtered.map((artist) => {
          const fav = favourites.has(artist.id);
          return (
            <div
              key={artist.id}
              onClick={() => setActiveArtist(artist)}
              style={{
                position: "relative", paddingBottom: "100%",
                cursor: "pointer", overflow: "hidden",
                background: "#e8e9a0",
              }}
            >
              {/* Photo */}
              {artist.photo ? (
                <img
                  src={artist.photo}
                  alt={artist.name}
                  style={{
                    position: "absolute", inset: 0, width: "100%", height: "100%",
                    objectFit: "cover", transition: "transform 0.35s ease",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLImageElement).style.transform = "scale(1.04)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLImageElement).style.transform = "scale(1)")}
                />
              ) : (
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 40, fontFamily: "'SerialBlur', sans-serif",
                  color: "rgba(100,44,255,0.2)", textTransform: "uppercase",
                }}>
                  {artist.name.slice(0, 2)}
                </div>
              )}

              {/* Name overlay top-left — yellow bg, purple text */}
              <div style={{
                position: "absolute", top: 0, left: 0,
                padding: "6px 10px",
                background: "#FEFFC0",
                maxWidth: "85%",
              }}>
                <span style={{
                  fontFamily: "'SerialBlur', sans-serif",
                  fontSize: 13, color: "#642CFF",
                  textTransform: "uppercase", letterSpacing: "0.02em",
                  lineHeight: 1.2, display: "block",
                }}>
                  {artist.name}
                </span>
              </div>

              {/* Heart fav button bottom-right */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleFav(artist.id); }}
                style={{
                  position: "absolute", bottom: 10, right: 10,
                  width: 36, height: 36, borderRadius: "50%",
                  background: fav ? "#e53e3e" : "rgba(254,255,192,0.95)",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
                  transition: "all 0.15s",
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
          style={{
            padding: "8px 16px", borderRadius: 9999, border: "none", cursor: "pointer",
            background: "#642CFF", color: "#FEFFC0",
            fontFamily: "'Pacaembu', sans-serif", fontSize: 13,
            boxShadow: "0 2px 12px rgba(100,44,255,0.4)",
          }}
        >
          → Menetrend
        </button>
      </div>

      {/* ── Responsive grid CSS ── */}
      <style>{`
        @media (min-width: 640px) { .lineup-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (min-width: 900px) { .lineup-grid { grid-template-columns: repeat(4, 1fr) !important; } }
        @media (min-width: 1280px) { .lineup-grid { grid-template-columns: repeat(5, 1fr) !important; } }
      `}</style>
    </div>
  );
}
