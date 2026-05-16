// ============================================================
// Shared ArtistPopup component — used by both LineupGrid and Timetable
// Design: Kolorádó yellow (#FEFFC0) card, purple (#642CFF) accents
// Mobile: portrait stack (4:3 image top, info below, scrollable)
// Desktop (≥640px): landscape — image fills full height at 1:1–3:4 ratio,
//   name top-left on image, heart bottom-right on image,
//   right panel scrolls when content exceeds screen height,
//   popup height = content height (not fixed).
// Navigation: optional onPrev/onNext props enable swipe (touch),
//   arrow buttons (desktop), and keyboard ← → navigation.
// ============================================================
import { useMemo, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  type Artist,
  FESTIVAL_DAYS,
  formatTime,
  getFestivalDayId,
} from "@/lib/timetable-data";

export interface ArtistPopupProps {
  artist: Artist;
  isFav: boolean;
  onToggleFav: () => void;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export default function ArtistPopup({ artist, isFav, onToggleFav, onClose, onPrev, onNext }: ArtistPopupProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  // Track swipe/nav direction: 1 = forward (next), -1 = backward (prev)
  const navDirection = useRef<1 | -1>(1);

  const dayLabel = useMemo(() => {
    if (!artist.startTime) return null;
    const dayId = getFestivalDayId(artist.startTime);
    return FESTIVAL_DAYS.find((d) => d.id === dayId)?.label ?? null;
  }, [artist.startTime]);

  const timeStr =
    artist.startTime && artist.endTime
      ? `${formatTime(artist.startTime)} – ${formatTime(artist.endTime)}`
      : null;

  const metaLine = [dayLabel, timeStr, artist.stage].filter(Boolean).join(", ");

  // Detect player type
  const hasSoundcloud = !!artist.soundcloudLink;
  const hasYoutube = !hasSoundcloud && !!artist.youtubeLink;

  // ── Keyboard navigation ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft"  && onPrev) { e.preventDefault(); onPrev(); }
      if (e.key === "ArrowRight" && onNext) { e.preventDefault(); onNext(); }
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onPrev, onNext, onClose]);

  // ── Touch swipe ──────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && onNext) { navDirection.current = 1;  onNext(); } // swipe left  → next
    if (dx > 0 && onPrev) { navDirection.current = -1; onPrev(); } // swipe right → prev
  };

  // ── Nav arrow button style ────────────────────────────────────────────
  // Arrows are flex siblings of the card in the overlay row,
  // so they naturally sit in the gap between the card and the screen edge.
  const navBtnStyle = (disabled: boolean): React.CSSProperties => ({
    flexShrink: 0,
    alignSelf: "center",
    zIndex: 20, width: 40, height: 40, borderRadius: "50%",
    background: "rgba(254,255,192,0.92)", border: "none",
    cursor: disabled ? "default" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#642CFF", fontSize: 24, fontWeight: 700,
    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
    opacity: disabled ? 0.2 : 0.85,
    pointerEvents: disabled ? "none" : "auto",
    transition: "opacity 0.15s",
    margin: "0 8px",
  });

  // ── Image panel ────────────────────────────────────────────
  const imagePanel = (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {artist.photo ? (
        <img
          src={artist.photo}
          alt={artist.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "#e8e9a0", fontSize: 48,
            fontFamily: "'SerialBlur', sans-serif",
            color: "#642CFF", textTransform: "uppercase",
          }}
        >
          {artist.name.slice(0, 2)}
        </div>
      )}
      {/* Name + title1 subtitle — top-left, per-line yellow bg */}
      <div style={{ position: "absolute", top: 0, left: 0, padding: "8px 10px 4px" }}>
        <span
          style={{
            fontFamily: "'SerialBlur', sans-serif",
            fontSize: 23.1, color: "#642CFF",
            textTransform: "uppercase", letterSpacing: "0.02em",
            lineHeight: 1.3,
            background: "#FEFFC0",
            display: "inline",
            boxDecorationBreak: "clone",
            WebkitBoxDecorationBreak: "clone",
            padding: "2px 8px",
          } as React.CSSProperties}
        >
          {artist.name}
        </span>
        {artist.title1 && (
          <>
            <br />
            <span
              style={{
                fontFamily: "'SerialBlur', sans-serif",
                fontSize: 16, color: "#642CFF",
                textTransform: "uppercase", letterSpacing: "0.02em",
                lineHeight: 1.3,
                background: "#FEFFC0",
                display: "inline",
                boxDecorationBreak: "clone",
                WebkitBoxDecorationBreak: "clone",
                padding: "2px 8px",
              } as React.CSSProperties}
            >
              {artist.title1}
            </span>
          </>
        )}
      </div>
      {/* Fav button — always bottom-right */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
        style={{
          position: "absolute", bottom: 10, right: 10,
          width: 40, height: 40, borderRadius: "50%",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
          background: isFav ? "#e53e3e" : "rgba(254,255,192,0.95)",
          transition: "all 0.15s",
          zIndex: 5,
        }}
        aria-label={isFav ? "Eltávolítás a kedvencekből" : "Kedvencekhez adás"}
      >
        <svg
          width="18" height="18" viewBox="0 0 24 24"
          fill={isFav ? "white" : "none"}
          stroke={isFav ? "white" : "#642CFF"}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
    </div>
  );

  // ── Info panel ───────────────────────────────────────────────
  const infoPanel = (
    <div
      style={{
        padding: "20px 22px 24px",
        display: "flex", flexDirection: "column", gap: 12,
      }}
    >
      {metaLine && (
        <p style={{ fontFamily: "'Pacaembu', sans-serif", fontSize: 15, color: "#0E4B4D", margin: 0, lineHeight: 1.4, display: 'none' }}>
          {metaLine}
        </p>
      )}
      {artist.genre && (
        <p style={{ fontFamily: "'Pacaembu', sans-serif", fontSize: 13, color: "rgba(100,44,255,0.6)", margin: 0, textTransform: "lowercase" }}>
          {artist.genre}
        </p>
      )}
      {(artist.longDescription || artist.description) ? (
        <p style={{ fontFamily: "'Pacaembu', sans-serif", fontSize: 13, color: "#333", lineHeight: 1.65, margin: 0 }}>
          {artist.longDescription ?? artist.description}
        </p>
      ) : (
        <p style={{ fontFamily: "'Pacaembu', sans-serif", fontSize: 13, color: "rgba(0,0,0,0.3)", margin: 0 }}>
          Részletek hamarosan...
        </p>
      )}
      {/* Audio player */}
      {(hasSoundcloud || hasYoutube) && (
        <div style={{ marginTop: 4 }}>
          {hasSoundcloud ? (
            <iframe
              width="100%"
              height="125"
              scrolling="no"
              frameBorder="no"
              allow="autoplay"
              src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(artist.soundcloudLink!)}&color=%23642CFF&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`}
              style={{ display: "block" }}
            />
          ) : (
            // YouTube: 16:9 aspect ratio container
            <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%" }}>
              <iframe
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
                src={(() => {
                  const url = artist.youtubeLink!;
                  const mEmbed = url.match(/\/embed\/([A-Za-z0-9_-]{11})/);
                  const mWatch = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
                  const mShort = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
                  const id = (mEmbed?.[1]) || (mWatch?.[1]) || (mShort?.[1]);
                  return id ? `https://www.youtube.com/embed/${id}` : url;
                })()}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      )}
    </div>
  );

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
      {/* Prev arrow — sits in the gap to the left of the card */}
      {(onPrev !== undefined || onNext !== undefined) && (
        <button
          onClick={(e) => { e.stopPropagation(); navDirection.current = -1; onPrev?.(); }}
          style={navBtnStyle(!onPrev)}
          aria-label="Previous artist"
          className="popup-nav-btn"
        >
          ‹
        </button>
      )}

      <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={artist.id}
        ref={cardRef}
        initial={{ x: navDirection.current * 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: navDirection.current * -60, opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeInOut" }}
        style={{
          position: "relative", width: "100%",
          background: "#FEFFC0",
          boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
        }}
        className="artist-popup-card"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Close × */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 10, right: 10,
            width: 30, height: 30, borderRadius: "50%",
            background: "rgba(254,255,192,0.9)", border: "none", cursor: "pointer",
            fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
            color: "#642CFF", fontWeight: 700, zIndex: 10,
          }}
        >
          ×
        </button>

        {/* ── Mobile: portrait stack ── */}
        <div
          className="popup-mobile-layout"
          style={{ display: "flex", flexDirection: "column", maxHeight: "90vh", overflowY: "auto" }}
        >
          <div style={{ position: "relative", width: "100%", paddingBottom: "75%", flexShrink: 0 }}>
            <div style={{ position: "absolute", inset: 0 }}>{imagePanel}</div>
          </div>
          {infoPanel}
        </div>

        {/* ── Desktop: landscape ── */}
        <div
          className="popup-desktop-layout"
          style={{ display: "none" }}
        >
          {/* Image column — fills full height, width clamped for 1:1–3:4 ratio */}
          <div className="popup-image-col" style={{ flexShrink: 0, position: "relative", alignSelf: "stretch" }}>
            {imagePanel}
          </div>
          {/* Info column — scrollable, max 90vh */}
          <div style={{ flex: 1, overflowY: "auto", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            {infoPanel}
          </div>
        </div>
      </motion.div>
      </AnimatePresence>

      {/* Next arrow — sits in the gap to the right of the card */}
      {(onPrev !== undefined || onNext !== undefined) && (
        <button
          onClick={(e) => { e.stopPropagation(); navDirection.current = 1; onNext?.(); }}
          style={navBtnStyle(!onNext)}
          aria-label="Next artist"
          className="popup-nav-btn"
        >
          ›
        </button>
      )}

      <style>{`
        .artist-popup-card { max-width: 480px; }
        .popup-nav-btn { display: none; }

        /* Desktop */
        @media (min-width: 640px) {
          .artist-popup-card { max-width: 720px !important; }
          .popup-mobile-layout { display: none !important; }
          .popup-desktop-layout { display: flex !important; align-items: stretch; }
          .popup-nav-btn { display: flex !important; }

          .popup-image-col {
            width: clamp(240px, 38%, 420px);
            aspect-ratio: unset !important;
          }
          .popup-image-col > div {
            width: 100%;
            height: 100%;
          }
        }

        /* Mobile */
        @media (max-width: 639px) {
          .artist-popup-card { max-width: 100% !important; }
          .popup-mobile-layout { display: flex !important; }
          .popup-desktop-layout { display: none !important; }
          .popup-nav-btn { display: none !important; }
        }
      `}</style>
    </div>
  );
}
