/**
 * Kolorádó Festival — Favourites Analytics Worker
 *
 * KV keys used:
 *   artist:{id}:total              → total fav count (combined)
 *   artist:{id}:timetable          → fav count from timetable widget
 *   artist:{id}:lineup             → fav count from lineup widget
 *   artist:{id}:name               → display name (stored on first ping)
 *   artist:{id}:day:{day}          → fav count for a specific festival day
 *   session:{sessionId}:favs       → JSON array of artistIds favourited in this session (TTL 24h)
 *   cofav:{idA}:{idB}              → co-fav count (idA < idB alphabetically)
 *   meta:artistIds                 → JSON array of all known artist IDs
 *   meta:days                      → JSON array of all known festival days
 */

const ALLOWED_ORIGINS = [
  "https://kolorado.hu",
  "https://www.kolorado.hu",
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith(".manus.computer")) return true;
  if (origin.endsWith(".manus.space")) return true;
  return false;
}

function corsHeaders(origin) {
  const allowed = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const path = url.pathname;

    // ── POST /fav ────────────────────────────────────────────────────────────
    if (request.method === "POST" && path === "/fav") {
      let body;
      try { body = await request.json(); } catch { return jsonResponse({ error: "bad json" }, 400, origin); }

      const { artistId, artistName, source, action, sessionId, day } = body;
      if (!artistId || !source || !action) return jsonResponse({ error: "missing fields" }, 400, origin);
      if (!["timetable", "lineup"].includes(source)) return jsonResponse({ error: "invalid source" }, 400, origin);
      if (!["add", "remove"].includes(action)) return jsonResponse({ error: "invalid action" }, 400, origin);

      const delta = action === "add" ? 1 : -1;

      // Update counts (total + per-source)
      const countUpdates = [
        increment(env.FAVS_KV, `artist:${artistId}:total`, delta),
        increment(env.FAVS_KV, `artist:${artistId}:${source}`, delta),
      ];

      // Per-day count (if day provided)
      if (day) {
        countUpdates.push(increment(env.FAVS_KV, `artist:${artistId}:day:${day}`, delta));
        countUpdates.push(addToIndex(env.FAVS_KV, "meta:days", day));
      }

      await Promise.all(countUpdates);

      // Store artist name on first ping
      if (artistName) {
        const existing = await env.FAVS_KV.get(`artist:${artistId}:name`);
        if (!existing) await env.FAVS_KV.put(`artist:${artistId}:name`, artistName);
      }

      // Track artist ID in the global index
      await addToIndex(env.FAVS_KV, "meta:artistIds", artistId);

      // Co-fav tracking (session-based)
      if (sessionId) {
        const sessionKey = `session:${sessionId}:favs`;
        const raw = await env.FAVS_KV.get(sessionKey);
        let sessionFavs = raw ? JSON.parse(raw) : [];

        // Count unique sessions (only on first fav from this session)
        if (action === "add" && sessionFavs.length === 0) {
          await increment(env.FAVS_KV, "meta:sessionCount", 1);
        }

        if (action === "add") {
          const coFavPromises = sessionFavs.map(otherId => {
            const [a, b] = [artistId, otherId].sort();
            return increment(env.FAVS_KV, `cofav:${a}:${b}`, 1);
          });
          await Promise.all(coFavPromises);
          if (!sessionFavs.includes(artistId)) sessionFavs.push(artistId);
        } else {
          sessionFavs = sessionFavs.filter(id => id !== artistId);
        }

        await env.FAVS_KV.put(sessionKey, JSON.stringify(sessionFavs), { expirationTtl: 86400 });
      }

      return jsonResponse({ ok: true }, 200, origin);
    }

    // ── GET /counts ──────────────────────────────────────────────────────────
    if (request.method === "GET" && path === "/counts") {
      const [rawIds, rawDays, rawSessionCount] = await Promise.all([
        env.FAVS_KV.get("meta:artistIds"),
        env.FAVS_KV.get("meta:days"),
        env.FAVS_KV.get("meta:sessionCount"),
      ]);
      const artistIds = rawIds ? JSON.parse(rawIds) : [];
      const days = rawDays ? JSON.parse(rawDays) : [];
      const sessionCount = parseInt(rawSessionCount || "0");

      // Fetch all counts in parallel
      const artists = await Promise.all(artistIds.map(async id => {
        const keys = [
          `artist:${id}:total`,
          `artist:${id}:timetable`,
          `artist:${id}:lineup`,
          `artist:${id}:name`,
          ...days.map(d => `artist:${id}:day:${d}`),
        ];
        const values = await Promise.all(keys.map(k => env.FAVS_KV.get(k)));
        const result = {
          id,
          name: values[3] || id,
          total: parseInt(values[0] || "0"),
          timetable: parseInt(values[1] || "0"),
          lineup: parseInt(values[2] || "0"),
          byDay: {},
        };
        days.forEach((d, i) => {
          result.byDay[d] = parseInt(values[4 + i] || "0");
        });
        return result;
      }));

      artists.sort((a, b) => b.total - a.total);

      // Fetch top co-fav pairs
      const coFavList = await env.FAVS_KV.list({ prefix: "cofav:" });
      const coFavPairs = await Promise.all(coFavList.keys.map(async k => {
        const parts = k.name.split(":");
        const [, idA, idB] = parts;
        const count = parseInt(await env.FAVS_KV.get(k.name) || "0");
        const nameA = await env.FAVS_KV.get(`artist:${idA}:name`) || idA;
        const nameB = await env.FAVS_KV.get(`artist:${idB}:name`) || idB;
        return { idA, idB, nameA, nameB, count };
      }));
      coFavPairs.sort((a, b) => b.count - a.count);

      return jsonResponse({ artists, coFavPairs: coFavPairs.slice(0, 50), days, sessionCount }, 200, origin);
    }

    return new Response("Not found", { status: 404 });
  }
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function increment(kv, key, delta) {
  const current = parseInt(await kv.get(key) || "0");
  const next = Math.max(0, current + delta);
  await kv.put(key, String(next));
}

async function addToIndex(kv, key, value) {
  const raw = await kv.get(key);
  const arr = raw ? JSON.parse(raw) : [];
  if (!arr.includes(value)) {
    arr.push(value);
    await kv.put(key, JSON.stringify(arr));
  }
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}
