/**
 * Admin Dashboard — Kolorádó Festival Favourites Analytics
 *
 * Design: dark teal brand palette, SerialBlur + Pacaembu typography,
 * minimal chrome, data-forward layout.
 *
 * Sections:
 *   1. Password gate
 *   2. Combined leaderboard (total favs)
 *   3. Two columns: Timetable leaders | Lineup leaders
 *   4. Co-favouriting pairs ("fans of X also liked Y")
 */

import { useEffect, useState } from "react";

// ── Config ────────────────────────────────────────────────────────────────────
// This is read from the same FAVS_WORKER_URL the widgets use.
// We expose it via a meta tag injected by the widget, or fall back to a
// hardcoded URL that you fill in after deploying the Worker.
const WORKER_URL_STORAGE_KEY = "kolorado_worker_url";
const ADMIN_PASSWORD = "HouseATonal67";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ArtistStat {
  id: string;
  name: string;
  total: number;
  timetable: number;
  lineup: number;
}

interface CoFavPair {
  idA: string;
  idB: string;
  nameA: string;
  nameB: string;
  count: number;
}

interface CountsData {
  artists: ArtistStat[];
  coFavPairs: CoFavPair[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getWorkerUrl(): string {
  try {
    return localStorage.getItem(WORKER_URL_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function setWorkerUrl(url: string) {
  try {
    localStorage.setItem(WORKER_URL_STORAGE_KEY, url);
  } catch {}
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="relative h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

function LeaderboardRow({
  rank,
  artist,
  max,
  showSource,
}: {
  rank: number;
  artist: ArtistStat;
  max: number;
  showSource?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <span
        className="text-xs font-mono w-6 text-right shrink-0"
        style={{ color: rank <= 3 ? "#dcea75" : "rgba(122,158,155,0.5)" }}
      >
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <div
          className="text-sm font-bold truncate uppercase tracking-wide"
          style={{ fontFamily: "'SerialBlur', sans-serif", color: "#c8dedd" }}
        >
          {artist.name}
        </div>
        <Bar value={artist.total} max={max} color="#dcea75" />
        {showSource && (
          <div className="flex gap-3 mt-1">
            <span className="text-[10px]" style={{ color: "rgba(122,158,155,0.6)" }}>
              TT: {artist.timetable}
            </span>
            <span className="text-[10px]" style={{ color: "rgba(122,158,155,0.6)" }}>
              Lineup: {artist.lineup}
            </span>
          </div>
        )}
      </div>
      <span
        className="text-lg font-bold shrink-0 tabular-nums"
        style={{ fontFamily: "'Pacaembu', sans-serif", color: "#dcea75" }}
      >
        {artist.total}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xs uppercase tracking-widest mb-4 mt-8 first:mt-0"
      style={{ color: "rgba(122,158,155,0.6)", fontFamily: "'Pacaembu', sans-serif" }}
    >
      {children}
    </h2>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{ background: "rgba(14,47,46,0.7)", border: "1px solid rgba(26,107,102,0.25)" }}
    >
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);

  const [workerUrl, setWorkerUrlState] = useState(getWorkerUrl);
  const [workerInput, setWorkerInput] = useState(getWorkerUrl);

  const [data, setData] = useState<CountsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (pwInput === ADMIN_PASSWORD) {
      setAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  }

  function handleWorkerSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = workerInput.trim().replace(/\/$/, "");
    setWorkerUrl(trimmed);
    setWorkerUrlState(trimmed);
    setWorkerUrl(trimmed);
  }

  async function fetchData() {
    if (!workerUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(workerUrl + "/counts");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authed && workerUrl) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, workerUrl]);

  // ── Password gate ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#062322" }}
      >
        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-4 w-80"
        >
          <div
            className="text-center text-2xl font-bold uppercase tracking-widest mb-2"
            style={{ fontFamily: "'SerialBlur', sans-serif", color: "#dcea75" }}
          >
            Kolorádó Admin
          </div>
          <input
            type="password"
            placeholder="Jelszó"
            value={pwInput}
            onChange={e => setPwInput(e.target.value)}
            className="rounded-xl px-4 py-3 text-sm outline-none"
            style={{
              background: "rgba(14,47,46,0.9)",
              border: `1px solid ${pwError ? "#e86b5a" : "rgba(26,107,102,0.4)"}`,
              color: "#c8dedd",
              fontFamily: "'Pacaembu', sans-serif",
            }}
            autoFocus
          />
          {pwError && (
            <p className="text-xs text-center" style={{ color: "#e86b5a", fontFamily: "'Pacaembu', sans-serif" }}>
              Helytelen jelszó
            </p>
          )}
          <button
            type="submit"
            className="rounded-xl py-3 text-sm font-bold uppercase tracking-wider transition-opacity hover:opacity-80"
            style={{ background: "#dcea75", color: "#062322", fontFamily: "'SerialBlur', sans-serif" }}
          >
            Belépés
          </button>
        </form>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  const artists = data?.artists ?? [];
  const coFavPairs = data?.coFavPairs ?? [];
  const maxTotal = artists[0]?.total ?? 1;

  const ttLeaders = [...artists].sort((a, b) => b.timetable - a.timetable).slice(0, 15);
  const lineupLeaders = [...artists].sort((a, b) => b.lineup - a.lineup).slice(0, 15);
  const maxTT = ttLeaders[0]?.timetable ?? 1;
  const maxLineup = lineupLeaders[0]?.lineup ?? 1;

  return (
    <div
      className="min-h-screen"
      style={{ background: "#062322", color: "#c8dedd", fontFamily: "'Pacaembu', sans-serif" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
        style={{ background: "rgba(6,35,34,0.95)", borderBottom: "1px solid rgba(26,107,102,0.2)", backdropFilter: "blur(8px)" }}
      >
        <span
          className="text-lg font-bold uppercase tracking-widest"
          style={{ fontFamily: "'SerialBlur', sans-serif", color: "#dcea75" }}
        >
          Kolorádó · Kedvencek
        </span>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs" style={{ color: "rgba(122,158,155,0.5)" }}>
              {lastRefresh.toLocaleTimeString("hu-HU")}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading || !workerUrl}
            className="rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: "rgba(220,234,117,0.15)", color: "#dcea75", border: "1px solid rgba(220,234,117,0.3)" }}
          >
            {loading ? "…" : "Frissítés"}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Worker URL config */}
        {!workerUrl && (
          <Card className="mb-8">
            <p className="text-sm mb-3" style={{ color: "rgba(122,158,155,0.8)" }}>
              Írd be a Cloudflare Worker URL-jét a statisztikák betöltéséhez:
            </p>
            <form onSubmit={handleWorkerSave} className="flex gap-2">
              <input
                type="url"
                placeholder="https://kolorado-favs.xxx.workers.dev"
                value={workerInput}
                onChange={e => setWorkerInput(e.target.value)}
                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                style={{
                  background: "rgba(26,107,102,0.15)",
                  border: "1px solid rgba(26,107,102,0.3)",
                  color: "#c8dedd",
                }}
              />
              <button
                type="submit"
                className="rounded-lg px-4 py-2 text-sm font-bold"
                style={{ background: "#dcea75", color: "#062322" }}
              >
                Mentés
              </button>
            </form>
          </Card>
        )}

        {workerUrl && !data && !loading && !error && (
          <p className="text-center text-sm py-12" style={{ color: "rgba(122,158,155,0.5)" }}>
            Betöltés…
          </p>
        )}

        {error && (
          <Card className="mb-6">
            <p className="text-sm" style={{ color: "#e86b5a" }}>
              Hiba: {error}
            </p>
            <p className="text-xs mt-1" style={{ color: "rgba(122,158,155,0.5)" }}>
              Worker URL: {workerUrl}
            </p>
            <button
              onClick={() => { setWorkerUrlState(""); setWorkerInput(""); setWorkerUrl(""); }}
              className="mt-3 text-xs underline"
              style={{ color: "rgba(122,158,155,0.6)" }}
            >
              URL módosítása
            </button>
          </Card>
        )}

        {data && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "Összes kedvenc", value: artists.reduce((s, a) => s + a.total, 0) },
                { label: "Előadók", value: artists.filter(a => a.total > 0).length },
                { label: "Párok", value: coFavPairs.length },
              ].map(stat => (
                <Card key={stat.label} className="text-center">
                  <div
                    className="text-3xl font-bold tabular-nums"
                    style={{ fontFamily: "'SerialBlur', sans-serif", color: "#dcea75" }}
                  >
                    {stat.value.toLocaleString("hu-HU")}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "rgba(122,158,155,0.6)" }}>
                    {stat.label}
                  </div>
                </Card>
              ))}
            </div>

            {/* Combined leaderboard */}
            <SectionTitle>Összesített toplista</SectionTitle>
            <Card className="mb-8">
              {artists.slice(0, 20).map((a, i) => (
                <LeaderboardRow key={a.id} rank={i + 1} artist={a} max={maxTotal} showSource />
              ))}
              {artists.length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: "rgba(122,158,155,0.4)" }}>
                  Még nincs adat
                </p>
              )}
            </Card>

            {/* Per-widget columns */}
            <SectionTitle>Widget szerinti bontás</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <Card>
                <div
                  className="text-xs uppercase tracking-widest mb-4"
                  style={{ color: "rgba(122,158,155,0.5)", fontFamily: "'Pacaembu', sans-serif" }}
                >
                  Timetable
                </div>
                {ttLeaders.filter(a => a.timetable > 0).map((a, i) => (
                  <div key={a.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                    <span className="text-xs font-mono w-5 text-right shrink-0" style={{ color: i < 3 ? "#dcea75" : "rgba(122,158,155,0.4)" }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate uppercase" style={{ fontFamily: "'SerialBlur', sans-serif", color: "#c8dedd" }}>
                        {a.name}
                      </div>
                      <Bar value={a.timetable} max={maxTT} color="#dcea75" />
                    </div>
                    <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: "#dcea75" }}>{a.timetable}</span>
                  </div>
                ))}
                {ttLeaders.filter(a => a.timetable > 0).length === 0 && (
                  <p className="text-xs text-center py-4" style={{ color: "rgba(122,158,155,0.3)" }}>Még nincs adat</p>
                )}
              </Card>

              <Card>
                <div
                  className="text-xs uppercase tracking-widest mb-4"
                  style={{ color: "rgba(122,158,155,0.5)", fontFamily: "'Pacaembu', sans-serif" }}
                >
                  Lineup
                </div>
                {lineupLeaders.filter(a => a.lineup > 0).map((a, i) => (
                  <div key={a.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                    <span className="text-xs font-mono w-5 text-right shrink-0" style={{ color: i < 3 ? "#dcea75" : "rgba(122,158,155,0.4)" }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate uppercase" style={{ fontFamily: "'SerialBlur', sans-serif", color: "#c8dedd" }}>
                        {a.name}
                      </div>
                      <Bar value={a.lineup} max={maxLineup} color="#dcea75" />
                    </div>
                    <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: "#dcea75" }}>{a.lineup}</span>
                  </div>
                ))}
                {lineupLeaders.filter(a => a.lineup > 0).length === 0 && (
                  <p className="text-xs text-center py-4" style={{ color: "rgba(122,158,155,0.3)" }}>Még nincs adat</p>
                )}
              </Card>
            </div>

            {/* Co-favouriting */}
            <SectionTitle>Aki szereti ezt, szereti azt is</SectionTitle>
            <Card>
              {coFavPairs.slice(0, 30).map((pair, i) => (
                <div
                  key={`${pair.idA}-${pair.idB}`}
                  className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0"
                >
                  <span
                    className="text-xs font-mono w-5 text-right shrink-0"
                    style={{ color: i < 3 ? "#dcea75" : "rgba(122,158,155,0.4)" }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span
                      className="text-sm font-bold uppercase truncate"
                      style={{ fontFamily: "'SerialBlur', sans-serif", color: "#c8dedd" }}
                    >
                      {pair.nameA}
                    </span>
                    <span className="text-xs" style={{ color: "rgba(122,158,155,0.4)" }}>+</span>
                    <span
                      className="text-sm font-bold uppercase truncate"
                      style={{ fontFamily: "'SerialBlur', sans-serif", color: "#c8dedd" }}
                    >
                      {pair.nameB}
                    </span>
                  </div>
                  <span
                    className="text-sm font-bold tabular-nums shrink-0"
                    style={{ color: "#e86b5a" }}
                  >
                    {pair.count}×
                  </span>
                </div>
              ))}
              {coFavPairs.length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: "rgba(122,158,155,0.4)" }}>
                  Még nincs elég adat a párok kiszámításához
                </p>
              )}
            </Card>

            {/* Worker URL edit */}
            <div className="mt-8 text-center">
              <button
                onClick={() => { setWorkerUrlState(""); setWorkerInput(""); setWorkerUrl(""); }}
                className="text-xs underline"
                style={{ color: "rgba(122,158,155,0.3)" }}
              >
                Worker URL módosítása
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
