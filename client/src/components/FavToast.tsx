// FavToast — one-time toast shown the first time a user adds a favourite.
// Uses localStorage key "kolorado_fav_toast_seen" to track whether it has been shown.
// Usage:
//   const { showFavToast, FavToastNode } = useFavToast();
//   // call showFavToast() inside toggleFav when adding (not removing) a favourite
//   // render {FavToastNode} somewhere in the page JSX

import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

const STORAGE_KEY = "kolorado_fav_toast_seen";
const TOAST_DURATION = 5500; // ms before auto-dismiss

export function useFavToast() {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showFavToast() {
    // Only show once per browser
    if (localStorage.getItem(STORAGE_KEY)) return;
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), TOAST_DURATION);
  }

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const FavToastNode = (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="fav-toast"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            maxWidth: "calc(100vw - 32px)",
            width: 360,
            background: "#1a1a2e",
            color: "#FEFFC0",
            padding: "12px 16px",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
            fontFamily: "'Pacaembu', sans-serif",
            fontSize: 13,
            lineHeight: 1.5,
            pointerEvents: "auto",
          }}
        >
          {/* Heart icon */}
          <svg
            width="16" height="16" viewBox="0 0 24 24"
            fill="#e53e3e" stroke="#e53e3e" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0, marginTop: 2 }}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>

          <span style={{ flex: 1 }}>
            Fyi: a kedvenceid a böngésződben tárolódnak. Itt megtalálod később is, azonban más eszközeidre nem szinkronizálódnak.
          </span>

          {/* Dismiss button */}
          <button
            onClick={() => setVisible(false)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(254,255,192,0.5)", padding: 0, flexShrink: 0,
              display: "flex", alignItems: "center", marginTop: 1,
            }}
            aria-label="Bezárás"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return { showFavToast, FavToastNode };
}
