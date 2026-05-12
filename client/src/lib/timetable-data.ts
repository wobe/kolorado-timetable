// ============================================================
// Kolorádó Festival Timetable — Data Types & Mock Data
// Design: Neon Grid on dark teal (#062322) with lime glow (#dcea75)
// Font: Quicksand (display) + DM Sans (body)
// ============================================================

export interface Artist {
  id: string;
  name: string;
  stage: string;
  startTime: Date;
  endTime: Date;
  genre?: string;
  /** Relative URL slug from CMS "Lineup (Item)" field, e.g. "/lineup/analog-balaton" */
  url?: string;
}

export interface Stage {
  id: string;
  name: string;
  color: string;
}

export interface FestivalDay {
  id: string;
  label: string;
  shortLabel: string;
  /** The calendar date this festival day starts on (10:00 AM) */
  date: string; // YYYY-MM-DD
}

// Festival days: Wednesday July 15 – Saturday July 18
// Each "day" runs from 10:00 AM to ~07:00 AM the next calendar day
export const FESTIVAL_DAYS: FestivalDay[] = [
  { id: "wed", label: "Szerda", shortLabel: "Sze", date: "2026-07-15" },
  { id: "thu", label: "Csütörtök", shortLabel: "Csüt", date: "2026-07-16" },
  { id: "fri", label: "Péntek", shortLabel: "Pén", date: "2026-07-17" },
  { id: "sat", label: "Szombat", shortLabel: "Szo", date: "2026-07-18" },
];

// Real stage names and colors — 8-9 stages expected
// Colors chosen for maximum contrast on dark teal background
export const STAGES: Stage[] = [
  { id: "nagyszinpad", name: "Nagyszínpad", color: "#dcea75" },
  { id: "balterem", name: "Bálterem", color: "#5ab8e8" },
  { id: "toszinpad", name: "Tószínpad", color: "#e8a838" },
  { id: "hangar", name: "Hangár", color: "#a87be8" },
  { id: "platanos", name: "Platános", color: "#e86b5a" },
  { id: "listeningbar", name: "Listening Bar", color: "#5ae8a8" },
  { id: "healing", name: "Healing", color: "#e8c85a" },
  { id: "ring", name: "Ring", color: "#e85aab" },
];

/** Base URL for artist pages on the Kolorádó website */
export const KOLORADO_BASE_URL = "https://www.kolorado.hu";

// Time grid constants
export const DAY_START_HOUR = 10; // 10:00 AM
export const DAY_END_HOUR = 31; // 7:00 AM next day = 24 + 7 = 31
export const HOUR_HEIGHT_PX = 80; // pixels per hour in the grid
export const MOBILE_HOUR_HEIGHT_PX = 60;

/**
 * Convert a Date to "festival hours" (0-based from DAY_START_HOUR).
 * Hours after midnight are counted as 24+.
 */
export function toFestivalHour(date: Date): number {
  const h = date.getHours();
  const m = date.getMinutes();
  const decimal = h + m / 60;
  // If before DAY_START_HOUR, it's the "next day" part of the festival day
  if (h < DAY_START_HOUR) {
    return 24 + decimal;
  }
  return decimal;
}

/**
 * Format a time for display (HH:MM)
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString("hu-HU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Get the festival day ID for a given Date.
 * A set that starts at 2:00 AM on July 17 belongs to the "thu" (July 16) festival day.
 */
export function getFestivalDayId(date: Date): string | null {
  const h = date.getHours();
  // If before 10 AM, this belongs to the previous calendar day's festival day
  const calendarDate = new Date(date);
  if (h < DAY_START_HOUR) {
    calendarDate.setDate(calendarDate.getDate() - 1);
  }
  const dateStr = calendarDate.toISOString().split("T")[0];
  const day = FESTIVAL_DAYS.find((d) => d.date === dateStr);
  return day?.id ?? null;
}

/**
 * Generate time labels for the grid (10:00, 11:00, ... 06:00)
 */
export function getTimeLabels(): { hour: number; label: string }[] {
  const labels: { hour: number; label: string }[] = [];
  for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
    const displayHour = h >= 24 ? h - 24 : h;
    labels.push({
      hour: h,
      label: `${String(displayHour).padStart(2, "0")}:00`,
    });
  }
  return labels;
}

/**
 * Generate ICS calendar content for an artist
 */
export function generateICS(artist: Artist): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatICSDate = (d: Date) => {
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  };

  const now = new Date();
  const uid = `${artist.id}-${artist.startTime.getTime()}@kolorado.hu`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kolorádó Fesztivál//Timetable//HU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART:${formatICSDate(artist.startTime)}`,
    `DTEND:${formatICSDate(artist.endTime)}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `UID:${uid}`,
    `SUMMARY:${artist.name}`,
    `DESCRIPTION:${artist.name} @ ${artist.stage} - Kolorádó Fesztivál 2026`,
    `LOCATION:${artist.stage}\\, Kolorádó Fesztivál\\, Káloz`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Trigger download of an ICS file
 */
export function downloadICS(artist: Artist): void {
  const ics = generateICS(artist);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${artist.name.replace(/[^a-zA-Z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰ ]/g, "").replace(/\s+/g, "_")}_kolorado.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Build the full artist page URL from the CMS slug.
 * e.g. "/lineup/analog-balaton" → "https://www.kolorado.hu/lineup/analog-balaton"
 */
export function getArtistPageUrl(artist: Artist): string {
  if (artist.url) {
    return `${KOLORADO_BASE_URL}${artist.url}`;
  }
  // Fallback: generate slug from name
  const slug = artist.name
    .toLowerCase()
    .replace(/[áà]/g, "a")
    .replace(/[éè]/g, "e")
    .replace(/[íì]/g, "i")
    .replace(/[óòö]/g, "o")
    .replace(/[őô]/g, "o")
    .replace(/[úùü]/g, "u")
    .replace(/[űû]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${KOLORADO_BASE_URL}/lineup/${slug}`;
}

// ============================================================
// MOCK DATA — This will be replaced by Wix CMS data in production
// Uses real artist names from the Kolorádó lineup CSV
// ============================================================

function makeDate(dayDate: string, hour: number, minute: number = 0): Date {
  const d = new Date(`${dayDate}T00:00:00`);
  if (hour >= 24) {
    d.setDate(d.getDate() + 1);
    d.setHours(hour - 24, minute, 0, 0);
  } else {
    d.setHours(hour, minute, 0, 0);
  }
  return d;
}

export const MOCK_ARTISTS: Artist[] = [
  // === WEDNESDAY (July 15) ===
  { id: "w1", name: "Analog Balaton", stage: "Nagyszínpad", startTime: makeDate("2026-07-15", 19, 15), endTime: makeDate("2026-07-15", 20, 15), genre: "elektronikus", url: "/lineup/analog-balaton" },
  { id: "w2", name: "Elefánt", stage: "Nagyszínpad", startTime: makeDate("2026-07-15", 21, 0), endTime: makeDate("2026-07-15", 22, 30), genre: "rock", url: "/lineup/elef%C3%A1nt" },
  { id: "w3", name: "Swim Swim Naked", stage: "Nagyszínpad", startTime: makeDate("2026-07-15", 23, 0), endTime: makeDate("2026-07-16", 0, 30), genre: "elektronikus-pop", url: "/lineup/swim-swim-naked" },
  { id: "w4", name: "Decolonize Your Mind Society", stage: "Bálterem", startTime: makeDate("2026-07-15", 17, 0), endTime: makeDate("2026-07-15", 18, 30), genre: "pszichedelikus jazz-rock", url: "/lineup/decolonize-your-mind-society" },
  { id: "w5", name: "L.A. Suzi", stage: "Bálterem", startTime: makeDate("2026-07-15", 20, 0), endTime: makeDate("2026-07-15", 21, 30), genre: "dallamos punk-pop sanzon", url: "/lineup/l.a.-suzi" },
  { id: "w6", name: "Csinszka", stage: "Bálterem", startTime: makeDate("2026-07-15", 22, 30), endTime: makeDate("2026-07-16", 0, 0), genre: "indie pop", url: "/lineup/csinszka" },
  { id: "w7", name: "Gilbert Pomelo", stage: "Tószínpad", startTime: makeDate("2026-07-15", 22, 0), endTime: makeDate("2026-07-16", 0, 0), genre: "dub", url: "/lineup/gilbert-pomelo" },
  { id: "w8", name: "Monofade", stage: "Tószínpad", startTime: makeDate("2026-07-16", 0, 0), endTime: makeDate("2026-07-16", 2, 0), genre: "house", url: "/lineup/monofade" },
  { id: "w9", name: "Loophia", stage: "Hangár", startTime: makeDate("2026-07-15", 20, 0), endTime: makeDate("2026-07-15", 21, 30), genre: "experimentális pop", url: "/lineup/loophia" },
  { id: "w10", name: "Cicciolina.jpeg", stage: "Hangár", startTime: makeDate("2026-07-15", 22, 0), endTime: makeDate("2026-07-15", 23, 30), genre: "tánczene", url: "/lineup/cicciolina.jpeg" },
  { id: "w11", name: "Kolibri", stage: "Platános", startTime: makeDate("2026-07-15", 14, 0), endTime: makeDate("2026-07-15", 15, 30), genre: "folk", url: "/lineup/kolibri" },
  { id: "w12", name: "Telehold", stage: "Platános", startTime: makeDate("2026-07-15", 16, 0), endTime: makeDate("2026-07-15", 17, 30), genre: "ambient", url: "/lineup/telehold" },
  { id: "w13", name: "Szoliver", stage: "Listening Bar", startTime: makeDate("2026-07-15", 18, 0), endTime: makeDate("2026-07-15", 20, 0), genre: "DJ set", url: "/lineup/szoliver" },
  { id: "w14", name: "Tolo", stage: "Listening Bar", startTime: makeDate("2026-07-16", 0, 0), endTime: makeDate("2026-07-16", 3, 0), genre: "techno", url: "/lineup/tolo" },

  // === THURSDAY (July 16) ===
  { id: "t1", name: "Aga2l & Indirect Movement", stage: "Tószínpad", startTime: makeDate("2026-07-16", 19, 15), endTime: makeDate("2026-07-16", 19, 30), genre: "techno", url: "/lineup/aga2l-%26-indirect-movement" },
  { id: "t2", name: "Adis Is Ok", stage: "Bálterem", startTime: makeDate("2026-07-16", 19, 15), endTime: makeDate("2026-07-16", 21, 15), genre: "house", url: "/lineup/adis-is-ok" },
  { id: "t3", name: "Sisi", stage: "Nagyszínpad", startTime: makeDate("2026-07-16", 21, 0), endTime: makeDate("2026-07-16", 22, 30), genre: "rap", url: "/lineup/sisi" },
  { id: "t4", name: "Pumped Gabó", stage: "Hangár", startTime: makeDate("2026-07-16", 23, 0), endTime: makeDate("2026-07-17", 0, 30), genre: "hardstyle", url: "/lineup/pumped-gab%C3%B3" },
  { id: "t5", name: "Budapest Afro Ska Orchestra", stage: "Platános", startTime: makeDate("2026-07-16", 17, 0), endTime: makeDate("2026-07-16", 18, 30), genre: "ska", url: "/lineup/budapest-afro-ska-orchestra" },
  { id: "t6", name: "Gege x Bizmuth", stage: "Tószínpad", startTime: makeDate("2026-07-16", 22, 0), endTime: makeDate("2026-07-17", 0, 0), genre: "experimental", url: "/lineup/gege-x-bizmuth" },
  { id: "t7", name: "Hocuspony", stage: "Listening Bar", startTime: makeDate("2026-07-16", 20, 0), endTime: makeDate("2026-07-16", 22, 0), genre: "electronic", url: "/lineup/hocuspony" },
  { id: "t8", name: "Lil 404", stage: "Hangár", startTime: makeDate("2026-07-16", 20, 0), endTime: makeDate("2026-07-16", 21, 30), genre: "rap", url: "/lineup/lil-404" },
  { id: "t9", name: "Bagocs", stage: "Bálterem", startTime: makeDate("2026-07-16", 22, 0), endTime: makeDate("2026-07-16", 23, 30), genre: "electronic", url: "/lineup/bagocs" },

  // === FRIDAY (July 17) ===
  { id: "f1", name: "Indigo", stage: "Nagyszínpad", startTime: makeDate("2026-07-17", 19, 0), endTime: makeDate("2026-07-17", 20, 30), genre: "indie pop", url: "/lineup/indigo" },
  { id: "f2", name: "Bongor", stage: "Nagyszínpad", startTime: makeDate("2026-07-17", 22, 0), endTime: makeDate("2026-07-17", 23, 30), genre: "electronic", url: "/lineup/bongor" },
  { id: "f3", name: "Paralich", stage: "Bálterem", startTime: makeDate("2026-07-17", 20, 0), endTime: makeDate("2026-07-17", 21, 30), genre: "punk", url: "/lineup/paralich" },
  { id: "f4", name: "Toro Lomo", stage: "Tószínpad", startTime: makeDate("2026-07-17", 21, 0), endTime: makeDate("2026-07-17", 23, 0), genre: "electronic", url: "/lineup/toro-lomo" },
  { id: "f5", name: "Shoes", stage: "Hangár", startTime: makeDate("2026-07-17", 18, 0), endTime: makeDate("2026-07-17", 19, 30), genre: "indie", url: "/lineup/shoes" },
  { id: "f6", name: "Vedat Akdag", stage: "Hangár", startTime: makeDate("2026-07-17", 22, 0), endTime: makeDate("2026-07-18", 0, 0), genre: "electronic", url: "/lineup/vedat-akdag" },
  { id: "f7", name: "Palo Canto", stage: "Platános", startTime: makeDate("2026-07-17", 16, 0), endTime: makeDate("2026-07-17", 17, 30), genre: "world", url: "/lineup/palo-canto-live" },
  { id: "f8", name: "Rozi Mákó / Tsering", stage: "Healing", startTime: makeDate("2026-07-17", 11, 0), endTime: makeDate("2026-07-17", 12, 30), genre: "healing", url: "/lineup/rozi-m%C3%A1k%C3%B3-%2F-tsering" },
  { id: "f9", name: "Slym", stage: "Listening Bar", startTime: makeDate("2026-07-17", 23, 0), endTime: makeDate("2026-07-18", 2, 0), genre: "electronic", url: "/lineup/slym" },

  // === SATURDAY (July 18) ===
  { id: "s1", name: "Crime", stage: "Nagyszínpad", startTime: makeDate("2026-07-18", 21, 0), endTime: makeDate("2026-07-18", 22, 30), genre: "electronic", url: "/lineup/crime" },
  { id: "s2", name: "Siketfajd", stage: "Nagyszínpad", startTime: makeDate("2026-07-18", 18, 0), endTime: makeDate("2026-07-18", 19, 30), genre: "rock", url: "/lineup/siketfajd" },
  { id: "s3", name: "Mőb", stage: "Bálterem", startTime: makeDate("2026-07-18", 20, 0), endTime: makeDate("2026-07-18", 21, 30), genre: "electronic", url: "/lineup/m%C3%B6b" },
  { id: "s4", name: "Blue Advance", stage: "Tószínpad", startTime: makeDate("2026-07-18", 22, 0), endTime: makeDate("2026-07-19", 0, 0), genre: "electronic", url: "/lineup/blue-advance" },
  { id: "s5", name: "Zakhorov", stage: "Hangár", startTime: makeDate("2026-07-18", 20, 0), endTime: makeDate("2026-07-18", 22, 0), genre: "techno", url: "/lineup/zakhorov" },
  { id: "s6", name: "Hanussen & Kozmo D", stage: "Listening Bar", startTime: makeDate("2026-07-18", 22, 0), endTime: makeDate("2026-07-19", 1, 0), genre: "electronic", url: "/lineup/hanussen-%26-kozmo-d" },
  { id: "s7", name: "Lőrinczi Áron", stage: "Platános", startTime: makeDate("2026-07-18", 15, 0), endTime: makeDate("2026-07-18", 16, 30), genre: "folk", url: "/lineup/l%C5%91rinczi-%C3%A1ron" },
  { id: "s8", name: "Gandharva & Von Yodi", stage: "Healing", startTime: makeDate("2026-07-18", 12, 0), endTime: makeDate("2026-07-18", 14, 0), genre: "healing", url: "/lineup/gandharva-%26-von-yodi" },
  { id: "s9", name: "Kale Lulugyi", stage: "Ring", startTime: makeDate("2026-07-18", 19, 0), endTime: makeDate("2026-07-18", 20, 30), genre: "world", url: "/lineup/kale-lulugyi" },
  { id: "s10", name: "Kiuz & Arash Ete", stage: "Ring", startTime: makeDate("2026-07-18", 21, 0), endTime: makeDate("2026-07-18", 23, 0), genre: "electronic", url: "/lineup/kiuz-%26-arash-ete" },
  { id: "s11", name: "Falcao", stage: "Bálterem", startTime: makeDate("2026-07-18", 23, 0), endTime: makeDate("2026-07-19", 1, 0), genre: "electronic", url: "/lineup/falcao" },
  { id: "s12", name: "Freakin' Disco", stage: "Hangár", startTime: makeDate("2026-07-18", 23, 30), endTime: makeDate("2026-07-19", 2, 0), genre: "disco", url: "/lineup/freakin'-disco" },
  { id: "s13", name: "Moonbase Patel Disco", stage: "Tószínpad", startTime: makeDate("2026-07-18", 16, 0), endTime: makeDate("2026-07-18", 18, 0), genre: "disco", url: "/lineup/moonbase-patel-disco" },
  { id: "s14", name: "Lenkke_", stage: "Listening Bar", startTime: makeDate("2026-07-18", 18, 0), endTime: makeDate("2026-07-18", 20, 0), genre: "electronic", url: "/lineup/lenkke_" },
  { id: "s15", name: "BRSZ", stage: "Platános", startTime: makeDate("2026-07-18", 18, 0), endTime: makeDate("2026-07-18", 19, 30), genre: "electronic", url: "/lineup/brsz" },
  { id: "s16", name: "Klpflrtrpr & Vava", stage: "Ring", startTime: makeDate("2026-07-18", 23, 0), endTime: makeDate("2026-07-19", 1, 30), genre: "electronic", url: "/lineup/klpflrtpr-%26-vava" },
];
