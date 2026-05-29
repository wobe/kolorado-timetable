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
import wixLocation from "wix-location";
import wixWindow from "wix-window";

$w.onReady(async function () {
  const lineupEl = $w("#koloradoLineup");

  // Pass the current page URL so the element can read ?tipus= and ?eloado= params
  lineupEl.setAttribute("page-url", wixLocation.url);

  // Analytics — fav add/remove events forwarded to GA4 via Wix trackEvent
  $w("#koloradoLineup").on("message", (event) => {
    const d = event.data;
    if (!d || d.type !== "kolorado-fav-event") return;
    try {
      wixWindow.trackEvent("CustomEvent", {
        label:    d.action === "add" ? "Favourite Added" : "Favourite Removed",
        category: "Favourites",
        value:    d.artistName || d.artistId,
      });
    } catch (e) { console.warn("trackEvent failed", e); }
  });

  // Pass the timetable page URL so the popup "show in timetable" button works.
  // Update this path to match your actual Wix timetable page URL.
  lineupEl.setAttribute("timetable-url", wixLocation.baseUrl + "/menetrend");

  try {
    const artists = await getLineup();
    // Pass the full artist array as a JSON attribute to the custom element
    lineupEl.setAttribute("lineup-data", JSON.stringify(artists));
  } catch (err) {
    console.error("Lineup grid: failed to load CMS data", err);
    // Element will fall back to mock data automatically
  }
});
