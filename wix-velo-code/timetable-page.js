// ============================================================
// Page Code — Timetable Page
// Kolorádó Festival Timetable — Wix Velo Page Code
// Place this in the page code editor for the page containing
// the Custom Element.
// ============================================================

import { getLineup } from 'backend/lineupApi';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';

$w.onReady(async function () {
  const timetableElement = $w("#koloradoTimetable");

  // ── 1. postMessage URL bridge ──────────────────────────────
  // When the timetable iframe asks for the parent page URL
  // (so share links use kolorado.hu instead of the Manus URL),
  // respond with the current Wix page URL.
  $w("#koloradoTimetable").on("message", (event) => {
    const d = event.data;
    if (!d) return;

    // URL bridge — lets the element build correct share links
    if (d.type === "kolorado-timetable-request-url") {
      const pageUrl = wixLocation.url;
      timetableElement.postMessage({ type: "kolorado-timetable-parent-url", url: pageUrl });
    }

    // Analytics — fav add/remove events forwarded to GA4 via Wix trackEvent
    if (d.type === "kolorado-fav-event") {
      try {
        wixWindow.trackEvent("CustomEvent", {
          label:    d.action === "add" ? "Favourite Added" : "Favourite Removed",
          category: "Favourites",
          value:    d.artistName || d.artistId,
        });
      } catch (e) { console.warn("trackEvent failed", e); }
    }
  });

  // ── 2. Load CMS lineup data ────────────────────────────────
  try {
    const lineup = await getLineup();
    timetableElement.setAttribute("lineup-data", JSON.stringify(lineup));
  } catch (error) {
    console.error("Failed to load lineup:", error);
  }
});
