// ============================================================
// Page Code — Timetable Page
// Kolorádó Festival Timetable — Wix Velo Page Code
// Place this in the page code editor for the page containing
// the Custom Element.
// ============================================================

import { getLineup } from 'backend/lineupApi';

$w.onReady(async function () {
  try {
    const lineup = await getLineup();

    // Get the Custom Element by its ID
    // Make sure the Custom Element's ID in the Wix editor is "koloradoTimetable"
    const timetableElement = $w("#koloradoTimetable");

    // Pass the lineup data as a JSON string attribute
    timetableElement.setAttribute("lineup-data", JSON.stringify(lineup));

  } catch (error) {
    console.error("Failed to load lineup:", error);
  }
});
