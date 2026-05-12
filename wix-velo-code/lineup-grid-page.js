// ============================================================
// wix-velo-code/lineup-grid-page.js
// Kolorádó Festival — Lineup Grid Page Code
//
// Place this in the Page Code tab of the lineup/artists page
// in the Wix Editor (Velo Dev Mode must be enabled).
//
// Prerequisites:
//   - Custom Element with tag "kolorado-lineup" added to the page
//   - Element ID set to "koloradoLineup"
//   - lineupApi.jsw in Backend (same file used by the timetable)
// ============================================================

import { getLineup } from "backend/lineupApi";

$w.onReady(async function () {
  const lineupEl = $w("#koloradoLineup");

  try {
    const artists = await getLineup();
    // Pass the full artist array as a JSON attribute to the custom element
    lineupEl.setAttribute("lineup-data", JSON.stringify(artists));
  } catch (err) {
    console.error("Lineup grid: failed to load CMS data", err);
    // Element will fall back to mock data automatically
  }
});
