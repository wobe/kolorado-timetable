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

// Extended artist type for CMS data that may include photo/day fields
type ArtistExtended = Artist & {
  photo?: string;
  day?: string;
};

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(6,35,34,0.85)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden"
        style={{ background: "#0E4B4D", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo */}
        <div className="relative w-full" style={{ paddingBottom: "60%" }}>
          {artist.photo ? (
            <img
              src={artist.photo}
              alt={artist.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center text-4xl font-bold"
              style={{ background: "#062322", color: "rgba(255,255,255,0.15)", fontFamily: "'SerialBlur', sans-serif" }}
            >
              {artist.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          {/* Name overlay */}
          <div className="absolute top-0 left-0 px-3 py-2" style={{ background: "rgba(6,35,34,0.75)" }}>
            <span className="text-lg uppercase tracking-wide" style={{ fontFamily: "'SerialBlur', sans-serif", color: "#E8FF6B" }}>
              {artist.name}
            </span>
          </div>
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-white"
            style={{ background: "rgba(0,0,0,0.5)", borderRadius: "50%", fontSize: 18, border: "none", cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        {/* Info */}
        <div className="p-5 space-y-3">
          {/* Stage + day + genre */}
          <div className="flex flex-wrap gap-2">
            {artist.stage && (
              <span className="px-3 py-1 text-xs uppercase tracking-wider" style={{ background: "rgba(255,255,255,0.1)", color: "#E8FF6B", fontFamily: "'Pacaembu', sans-serif" }}>
                {artist.stage}
              </span>
            )}
            {artist.day && (
              <span className="px-3 py-1 text-xs uppercase tracking-wider" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontFamily: "'Pacaembu', sans-serif" }}>
                {artist.day}
              </span>
            )}
            {artist.genre && (
              <span className="px-3 py-1 text-xs uppercase tracking-wider" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", fontFamily: "'Pacaembu', sans-serif" }}>
                {artist.genre}
              </span>
            )}
          </div>

          {/* Time */}
          {artist.startTime && artist.endTime && (
            <p style={{ fontFamily: "'Pacaembu', sans-serif", color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
              {formatTime(artist.startTime)} – {formatTime(artist.endTime)}
            </p>
          )}

          {/* Description placeholder */}
          <p style={{ fontFamily: "'Pacaembu', sans-serif", color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
            Részletek hamarosan...
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onToggleFav}
              className="flex items-center gap-2 px-4 py-2 text-sm transition-all"
              style={{
                background: isFav ? "#e53e3e" : "white",
                color: isFav ? "white" : "#0E4B4D",
                fontFamily: "'Pacaembu', sans-serif",
                borderRadius: 9999, border: "none", cursor: "pointer",
              }}
            >
              {isFav ? "❤ Kedvenc" : "♡ Kedvencnek"}
            </button>
            {artist.url && (
              <a
                href={`${KOLORADO_BASE_URL}${artist.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-sm"
                style={{ background: "rgba(255,255,255,0.1)", color: "white", fontFamily: "'Pacaembu', sans-serif", borderRadius: 9999, textDecoration: "none" }}
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

  // Sync favourites to cookie whenever they change
  useEffect(() => { saveFavourites(favourites); }, [favourites]);

  // Close dropdowns on outside click
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
    <div style={{ minHeight: "100vh", background: "#0E4B4D", color: "white" }}>
      {/* ── Header ── */}
      <div
        style={{
          position: "sticky", top: 0, zIndex: 30,
          background: "#062322",
          padding: "10px 16px",
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        }}
      >
        {/* Stage filter */}
        <div ref={stageRef} style={{ position: "relative" }}>
          <button
            onClick={() => { setStageOpen((o) => !o); setDayOpen(false); }}
            style={{ ...pillBase, background: selectedStage !== "all" ? "#E8FF6B" : "rgba(255,255,255,0.1)", color: selectedStage !== "all" ? "#062322" : "white" }}
          >
            <span>▼</span> {selectedStage === "all" ? "Színpad" : selectedStage}
          </button>
          {stageOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "#062322", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, minWidth: 180, zIndex: 100, overflow: "hidden" }}>
              {stageOptions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedStage(s.id === "all" ? "all" : s.name); setStageOpen(false); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", background: selectedStage === (s.id === "all" ? "all" : s.name) ? "rgba(232,255,107,0.15)" : "transparent", color: selectedStage === (s.id === "all" ? "all" : s.name) ? "#E8FF6B" : "white", fontFamily: "'Pacaembu', sans-serif", fontSize: 13, border: "none", cursor: "pointer" }}
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
            style={{ ...pillBase, background: selectedDay !== "all" ? "#E8FF6B" : "rgba(255,255,255,0.1)", color: selectedDay !== "all" ? "#062322" : "white" }}
          >
            <span>▼</span> {selectedDay === "all" ? "Nap" : selectedDay}
          </button>
          {dayOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "#062322", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, minWidth: 160, zIndex: 100, overflow: "hidden" }}>
              {dayOptions.map((d) => (
                <button
                  key={d.id}
                  onClick={() => { setSelectedDay(d.id === "all" ? "all" : d.name); setDayOpen(false); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", background: selectedDay === (d.id === "all" ? "all" : d.name) ? "rgba(232,255,107,0.15)" : "transparent", color: selectedDay === (d.id === "all" ? "all" : d.name) ? "#E8FF6B" : "white", fontFamily: "'Pacaembu', sans-serif", fontSize: 13, border: "none", cursor: "pointer" }}
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
          style={{ ...pillBase, background: showFavOnly ? "#e53e3e" : "rgba(255,255,255,0.1)", color: "white" }}
        >
          {showFavOnly ? "❤" : "♡"} Kedvencek
          {favourites.size > 0 && (
            <span style={{ background: showFavOnly ? "rgba(255,255,255,0.3)" : "rgba(232,255,107,0.8)", color: "#062322", borderRadius: 9999, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>
              {favourites.size}
            </span>
          )}
        </button>

        {/* Count */}
        <span style={{ marginLeft: "auto", fontFamily: "'Pacaembu', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          {filtered.length} előadó
        </span>
      </div>

      {/* ── Grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(180px, 50%), 1fr))",
          gap: 2,
          padding: 2,
        }}
      >
        {filtered.map((artist) => {
          const fav = favourites.has(artist.id);
          return (
            <div
              key={artist.id}
              onClick={() => setActiveArtist(artist)}
              style={{ position: "relative", paddingBottom: "100%", cursor: "pointer", background: "#062322", overflow: "hidden" }}
            >
              {/* Photo */}
              {artist.photo ? (
                <img
                  src={artist.photo}
                  alt={artist.name}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLImageElement).style.transform = "scale(1.04)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLImageElement).style.transform = "scale(1)")}
                />
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 700, color: "rgba(255,255,255,0.12)", fontFamily: "'SerialBlur', sans-serif" }}>
                  {artist.name.slice(0, 2).toUpperCase()}
                </div>
              )}

              {/* Name overlay top-left */}
              <div style={{ position: "absolute", top: 0, left: 0, padding: "6px 10px", background: "rgba(6,35,34,0.7)", maxWidth: "80%" }}>
                <span style={{ fontFamily: "'SerialBlur', sans-serif", fontSize: 13, color: "white", textTransform: "uppercase", letterSpacing: "0.03em", lineHeight: 1.2, display: "block" }}>
                  {artist.name}
                </span>
              </div>

              {/* Fav button bottom-right */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleFav(artist.id); }}
                style={{
                  position: "absolute", bottom: 10, right: 10,
                  width: 34, height: 34, borderRadius: "50%",
                  background: fav ? "#e53e3e" : "rgba(255,255,255,0.9)",
                  color: fav ? "white" : "#0E4B4D",
                  border: "none", cursor: "pointer", fontSize: 16,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                  transition: "all 0.15s",
                }}
              >
                {fav ? "❤" : "+"}
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
            background: "#E8FF6B", color: "#062322",
            fontFamily: "'Pacaembu', sans-serif", fontSize: 13,
            boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
          }}
        >
          → Menetrend
        </button>
      </div>
    </div>
  );
}
