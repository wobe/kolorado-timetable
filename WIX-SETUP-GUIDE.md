# Kolorádó Timetable — Wix Integration Guide

This document explains how to connect the interactive festival timetable to your Wix site's CMS (Content Manager) using Velo by Wix and the Custom Element feature. The timetable is a self-contained web component that reads lineup data from your CMS and renders an interactive, filterable schedule grid.

---

## 1. CMS Collection Setup

Your Wix CMS collection should be named **Lineup** (the collection ID will be `Lineup`). Each row represents one artist performance. Your existing CMS fields map to the timetable as follows:

| CMS Column Name      | Wix Field Key (auto-generated) | Type       | Description                                                                    |
|-----------------------|-------------------------------|------------|--------------------------------------------------------------------------------|
| **Name** (Title)      | `title`                       | Text       | Artist or act name (e.g., "Analog Balaton")                                    |
| **Lineup (Item)**     | `link-lineup-all-title`       | URL/Slug   | URL slug for the artist page (e.g., `/lineup/analog-balaton`)                  |
| **Genre**             | `genre`                       | Text       | Music genre (e.g., "elektronikus", "rock")                                     |
| **Kezdő idő**        | `kezdIdő`                     | Date/Time  | Full date and time when the set begins                                         |
| **Vége idő**          | `végeIdő`                     | Date/Time  | Full date and time when the set ends                                           |
| **Színpad**           | `színpad`                     | Tags/JSON  | Stage name, stored as a JSON array (e.g., `["Nagyszínpad"]`)                   |

**Important notes about the Date/Time fields:**

For sets that run past midnight, the **Vége idő** (End Time) must use the next calendar day's date. For example, if an artist plays on Wednesday July 15 from 23:00 to 01:30, the Kezdő idő should be `2026-07-15 23:00` and the Vége idő should be `2026-07-16 01:30`. The timetable's "festival day" logic automatically groups this under Wednesday (anything before 10:00 AM counts as the previous day).

**Note about field keys:** Wix auto-generates camelCase field keys from your column names. The keys listed above (`kezdIdő`, `végeIdő`, `színpad`) are based on the Hungarian column names in your CMS. If your actual field keys differ, check them in the CMS editor under **Fields > Field Key**. You can also use the Wix Data API's `listDataItems()` to inspect the actual field keys returned.

---

## 2. Stage Configuration

The timetable comes pre-configured with eight stages matching the Kolorádó 2026 lineup. To change the stage names or colors, edit the `STAGES` array in the Custom Element source code. The current configuration is:

| Stage Name      | Color Code | Visual Appearance   |
|-----------------|------------|---------------------|
| Nagyszínpad     | `#dcea75`  | Lime/chartreuse     |
| Bálterem        | `#5ab8e8`  | Sky blue            |
| Tószínpad       | `#e8a838`  | Amber/orange        |
| Hangár          | `#a87be8`  | Violet/purple       |
| Platános        | `#e86b5a`  | Coral/red           |
| Listening Bar   | `#5ae8a8`  | Mint green          |
| Healing         | `#e8c85a`  | Warm gold           |
| Ring            | `#e85aab`  | Pink/magenta        |

The **Színpad** field value in your CMS must match these names exactly (case-sensitive). The CMS stores stage names as a JSON array (e.g., `["Nagyszínpad"]`), and the backend code extracts the first element. If you add or rename stages, update both the CMS data and the `STAGES` array in the Custom Element code.

---

## 3. Interaction Model

The timetable uses a **hover + click** interaction pattern:

**Hover** over an artist block to see a glowing overlay with the artist name and a **"Naptárba"** (Add to Calendar) button. Clicking the Naptárba button downloads an `.ics` file that the user can import into Google Calendar, Apple Calendar, or Outlook.

**Click** on an artist block (anywhere except the Naptárba button) to navigate to the artist's page on kolorado.hu. The URL is constructed from the **Lineup (Item)** slug field in your CMS (e.g., `https://www.kolorado.hu/lineup/analog-balaton`).

---

## 4. Velo Backend Code

Create a new file in your Wix Velo editor at **Backend > lineupApi.jsw** (the `.jsw` extension makes it a web module callable from the frontend). This code queries your CMS and returns the lineup data in a format the Custom Element can consume.

```javascript
// Backend/lineupApi.jsw
import wixData from 'wix-data';

export async function getLineup() {
  const results = await wixData.query("Lineup")
    .ascending("kezdIdő")
    .limit(1000)
    .find();

  return results.items
    .filter(item => item["kezdIdő"] && item["színpad"])
    .map((item, index) => {
      // Parse stage from JSON array: '["Nagyszínpad"]' → "Nagyszínpad"
      let stage = "";
      const rawStage = item["színpad"];
      if (Array.isArray(rawStage)) {
        stage = rawStage[0] || "";
      } else if (typeof rawStage === "string") {
        try {
          const parsed = JSON.parse(rawStage);
          stage = Array.isArray(parsed) ? parsed[0] || "" : rawStage;
        } catch { stage = rawStage; }
      }

      // Parse the URL slug from the reference field
      let url = "";
      const rawLink = item["link-lineup-all-title"] || item["linkLineupAllTitle"];
      if (typeof rawLink === "string") {
        url = rawLink;
      } else if (rawLink && typeof rawLink === "object" && rawLink.url) {
        url = rawLink.url;
      }

      const startTime = item["kezdIdő"];
      const endTime = item["végeIdő"];

      return {
        id: item._id || `artist-${index}`,
        name: item.title || "",
        stage,
        startTime: startTime instanceof Date ? startTime.toISOString() : startTime,
        endTime: endTime instanceof Date ? endTime.toISOString() : endTime,
        genre: item.genre || "",
        url,
      };
    });
}
```

---

## 5. Page Code (Velo)

On the page where you place the Custom Element, add the following code in the Velo page editor. This code fetches the lineup from the backend and passes it to the Custom Element via its `setAttribute` method.

```javascript
// Page code (e.g., Timetable page)
import { getLineup } from 'backend/lineupApi';

$w.onReady(async function () {
  try {
    const lineup = await getLineup();
    const timetableElement = $w("#koloradoTimetable");
    timetableElement.setAttribute("lineup-data", JSON.stringify(lineup));
  } catch (error) {
    console.error("Failed to load lineup:", error);
  }
});
```

---

## 6. Custom Element Registration on Wix

Follow these steps to add the timetable as a Custom Element on your Wix page:

**Step 1:** In the Wix Editor, click **Add (+)** → **Embed Code** → **Custom Element**.

**Step 2:** A Custom Element placeholder will appear on your page. Click it, then click **Choose Source**.

**Step 3:** You have two options for hosting the Custom Element code:

**Option A — Velo Public file (Recommended):** Copy the Custom Element JavaScript code (from `wix-custom-element/kolorado-timetable.js`) into a new Velo file at **Public > kolorado-timetable.js**, then reference it as `/kolorado-timetable.js` in the Custom Element source. Set the **Tag Name** to `kolorado-timetable`.

**Option B — External URL:** Host the `kolorado-timetable.js` file on any CDN or server and use that URL as the script source. Set the **Tag Name** to `kolorado-timetable`.

**Step 4:** Set the element's ID to `koloradoTimetable` in the Properties panel (this must match the `$w("#koloradoTimetable")` selector in the page code).

**Step 5:** Resize the Custom Element to fill the page width. A minimum height of 600px is recommended. The timetable will handle its own scrolling internally.

---

## 7. Troubleshooting

**Artists not appearing on the timetable:** Verify that the `Színpad` field value in your CMS matches one of the stage names in the `STAGES` array exactly (case-sensitive). Also confirm that `Kezdő idő` and `Vége idő` are properly filled in — rows without dates are automatically filtered out.

**Field key mismatch:** If the Velo backend returns empty data, the auto-generated field keys may differ from what's listed here. Open the Wix CMS editor, click on a field, and check the **Field Key** shown in the field settings. Update the keys in `lineupApi.jsw` accordingly.

**Stage colors not matching:** If you add new stages, update the `STAGES` array in the Custom Element code with the new stage name and a hex color code.

**Artist page links not working:** The click-to-navigate feature constructs URLs as `https://www.kolorado.hu` + the slug from the `Lineup (Item)` field. Verify that the slugs in your CMS match the actual page URLs on your site.

---

## 8. File Summary

| File                                          | Purpose                                                    |
|-----------------------------------------------|-----------------------------------------------------------|
| `wix-velo-code/lineupApi.jsw`                 | Backend module — copy to Backend > lineupApi.jsw           |
| `wix-velo-code/timetable-page.js`             | Page code — paste into the Timetable page's Velo editor    |
| `wix-custom-element/kolorado-timetable.js`    | Custom Element — copy to Public > kolorado-timetable.js    |
