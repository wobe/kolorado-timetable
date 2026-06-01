/**
 * Kolorádó Festival — Favourites Analytics Worker
 * v3 — snapshot pattern (minimal KV reads)
 *
 * KV keys:
 *   meta:snapshot      → JSON: { artists: {[id]: {name,total,timetable,lineup,byDay:{}}}, sessionCount, days[] }
 *   meta:cofavs        → JSON: { [pairKey]: { idA, idB, nameA, nameB, count } }
 *   session:{id}:favs  → JSON array of artistIds (TTL 24h)
 *
 * /counts  = 2 KV reads (snapshot + cofavs)
 * /fav     = 2 KV reads + 2 KV writes (snapshot read/write + session read/write)
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

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

// Read snapshot, defaulting to empty structure
async function readSnapshot(kv) {
  const raw = await kv.get("meta:snapshot");
  if (!raw) return { artists: {}, sessionCount: 0, days: [] };
  try { return JSON.parse(raw); } catch { return { artists: {}, sessionCount: 0, days: [] }; }
}

// Read co-favs blob
async function readCofavs(kv) {
  const raw = await kv.get("meta:cofavs");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

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

      // Read snapshot + session in parallel (2 reads)
      const sessionKey = sessionId ? `session:${sessionId}:favs` : null;
      const [snap, rawSession] = await Promise.all([
        readSnapshot(env.FAVS_KV),
        sessionKey ? env.FAVS_KV.get(sessionKey) : Promise.resolve(null),
      ]);

      // Update artist entry in snapshot
      if (!snap.artists[artistId]) {
        snap.artists[artistId] = { name: artistName || artistId, total: 0, timetable: 0, lineup: 0, byDay: {} };
      }
      const a = snap.artists[artistId];
      if (artistName && !a.name) a.name = artistName;
      a.total = Math.max(0, (a.total || 0) + delta);
      a[source] = Math.max(0, (a[source] || 0) + delta);
      if (day) {
        a.byDay = a.byDay || {};
        a.byDay[day] = Math.max(0, (a.byDay[day] || 0) + delta);
        if (!snap.days.includes(day)) snap.days.push(day);
      }

      // Session tracking + co-fav pairs
      let sessionFavs = rawSession ? JSON.parse(rawSession) : [];
      let cofavs = null; // only load if needed

      if (sessionId) {
        if (action === "add" && sessionFavs.length === 0) {
          snap.sessionCount = (snap.sessionCount || 0) + 1;
        }

        if (action === "add" && sessionFavs.length > 0) {
          // Need to update co-favs — load the blob
          cofavs = await readCofavs(env.FAVS_KV);
          for (const otherId of sessionFavs) {
            const [x, y] = [artistId, otherId].sort();
            const pairKey = `${x}:${y}`;
            if (!cofavs[pairKey]) {
              cofavs[pairKey] = {
                idA: x, idB: y,
                nameA: snap.artists[x]?.name || x,
                nameB: snap.artists[y]?.name || y,
                count: 0,
              };
            }
            cofavs[pairKey].count += 1;
          }
        }

        if (action === "add") {
          if (!sessionFavs.includes(artistId)) sessionFavs.push(artistId);
        } else {
          sessionFavs = sessionFavs.filter(id => id !== artistId);
        }
      }

      // Write snapshot + session (+ cofavs if updated) in parallel
      const writes = [
        env.FAVS_KV.put("meta:snapshot", JSON.stringify(snap)),
        sessionKey ? env.FAVS_KV.put(sessionKey, JSON.stringify(sessionFavs), { expirationTtl: 86400 }) : Promise.resolve(),
      ];
      if (cofavs !== null) {
        writes.push(env.FAVS_KV.put("meta:cofavs", JSON.stringify(cofavs)));
      }
      await Promise.all(writes);

      return jsonResponse({ ok: true }, 200, origin);
    }

    // ── GET /counts ──────────────────────────────────────────────────────────
    if (request.method === "GET" && path === "/counts") {
      // Only 2 KV reads total
      const [snap, cofavs] = await Promise.all([
        readSnapshot(env.FAVS_KV),
        readCofavs(env.FAVS_KV),
      ]);

      const artists = Object.entries(snap.artists)
        .map(([id, a]) => ({ id, name: a.name || id, total: a.total || 0, timetable: a.timetable || 0, lineup: a.lineup || 0, byDay: a.byDay || {} }))
        .sort((a, b) => b.total - a.total);

      const coFavPairs = Object.values(cofavs)
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);

      return jsonResponse({
        artists,
        coFavPairs,
        days: snap.days || [],
        sessionCount: snap.sessionCount || 0,
      }, 200, origin);
    }

    return new Response("Not found", { status: 404 });
  }
};
