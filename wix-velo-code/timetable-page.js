// ============================================================
// Page Code — Timetable Page
// Kolorádó Festival Timetable — Wix Velo Page Code
// Place this in the page code editor for the page containing
// the Custom Element.
// ============================================================

import { getLineup } from 'backend/lineupApi';
import wixLocation from 'wix-location';

$w.onReady(async function () {
  const timetableElement = $w("#koloradoTimetable");

  // ── 1. postMessage URL bridge ──────────────────────────────
  // When the timetable iframe asks for the parent page URL
  // (so share links use kolorado.hu instead of the Manus URL),
  // respond with the current Wix page URL.
  $w("#koloradoTimetable").on("message", (event) => {
    if (event.data && event.data.type === "kolorado-timetable-request-url") {
      const pageUrl = wixLocation.url;
      timetableElement.postMessage({ type: "kolorado-timetable-parent-url", url: pageUrl });
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
