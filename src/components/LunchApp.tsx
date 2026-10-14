"use client";

import React from "react";
import dynamic from "next/dynamic";
import { INK, ACCENT, CREAM, SURFACE, FONT_DISPLAY, FONT_MONO } from "@/lib/constants";
import { Spot, NearbyRestaurant, ExploreFilters, SortKey, OpenFilter } from "@/lib/types";
import { pickBySpin } from "@/lib/pickers";
import { restaurantToSpot } from "@/lib/spots";
import { useIdentity } from "@/lib/identity";

const SpotMap = dynamic(() => import("./SpotMap"), { ssr: false });

// MG Road, Kochi office — used as fallback if geolocation is unavailable
const FALLBACK_LAT = 9.9816;
const FALLBACK_LNG = 76.2999;
const PAGE_SIZE = 30;

function useUserLocation() {
  const [location, setLocation] = React.useState<{ lat: number; lng: number }>({
    lat: FALLBACK_LAT,
    lng: FALLBACK_LNG,
  });
  const [status, setStatus] = React.useState<"pending" | "granted" | "denied">("pending");

  React.useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("granted");
      },
      () => {
        setStatus("denied");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  }, []);

  return { location, status };
}

import Link from "next/link";
import { ChunkyBtn } from "./ui";
import { SpotCard } from "./SpotCard";
import { SpinOverlay } from "./SpinOverlay";
import { VisitModal } from "./VisitModal";
import { COMPASS } from "./Glyphs";

// ── Masthead ──────────────────────────────────────────────────────────────
function UnderlineWiggle() {
  return (
    <svg
      style={{ position: "absolute", left: 0, right: 0, bottom: -10, width: "100%", height: 14 }}
      viewBox="0 0 200 14"
      preserveAspectRatio="none"
      fill="none"
    >
      <path
        d="M2 8 Q 25 2, 50 8 T 100 8 T 150 8 T 198 8"
        stroke={INK}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BigStat({ value, label, color, rot }: { value: number; label: string; color: string; rot: number }) {
  return (
    <div
      style={{
        background: color,
        border: `2.5px solid ${INK}`,
        boxShadow: `4px 4px 0 ${INK}`,
        padding: "10px 18px 8px",
        transform: `rotate(${rot}deg)`,
        textAlign: "center",
        minWidth: 100,
      }}
    >
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 40,
          lineHeight: 0.9,
          letterSpacing: "-0.02em",
          color: INK,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: INK,
          opacity: 0.7,
          marginTop: 4,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Masthead({ votesToday, myVotes, geoStatus }: { votesToday: number; myVotes: number; geoStatus: "pending" | "granted" | "denied" }) {
  return (
    <header
      style={{
        position: "relative",
        padding: "38px 32px 28px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 24,
      }}
    >
      <div style={{ position: "relative", zIndex: 2, maxWidth: "62%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: FONT_MONO,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: INK,
            opacity: 0.65,
            marginBottom: 8,
            padding: "0.1rem 0rem 0rem",
          }}
        >
          <span style={{ width: 10, height: 10, background: geoStatus === "granted" ? "#4CAF50" : ACCENT, borderRadius: 999, border: `2px solid ${INK}` }} />
          {geoStatus === "granted" ? "Your location" : geoStatus === "pending" ? "Locating\u2026" : "Kochi office \u00b7 MG Road"}
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: FONT_DISPLAY,
            fontWeight: 400,
            fontSize: "clamp(56px, 9vw, 108px)",
            lineHeight: 0.92,
            letterSpacing: "-0.025em",
            color: INK,
            transformOrigin: "left bottom",
            display: "inline-block",
            padding: "0.25em 0em",
          }}
        >
          What&apos;s for
          <br />
          <span style={{ color: ACCENT, position: "relative" }}>
            lunch
            <UnderlineWiggle />
          </span>
          <span style={{
            display: "inline-block",
            transform: "rotate(8deg)",
            color: INK,
            marginLeft: 6,
          }}>?!</span>
        </h1>
        <p
          style={{
            margin: "28px 0 0",
            fontSize: 15,
            color: INK,
            opacity: 0.72,
            maxWidth: "44ch",
            fontWeight: 500,
          }}
        >
          Every food spot around the office, fresh from OpenStreetMap. Vote, spin, log where you went, and let&apos;s actually decide before noon.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 14,
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", gap: 12 }}>
          <BigStat value={votesToday} label="votes today" color="#FFE89B" rot={-3} />
          <BigStat value={myVotes} label="you voted" color="#D6CCFF" rot={3} />
        </div>
        <Link href="/room" style={{ textDecoration: "none" }}>
          <ChunkyBtn size="lg" color={ACCENT} fg={CREAM}>
            <span style={{
              display: "inline-flex",
              width: 26, height: 26,
              background: CREAM,
              color: ACCENT,
              border: `2.5px solid ${INK}`,
              borderRadius: 999,
              alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 700, lineHeight: 1,
              marginRight: 4,
            }}>&#x21C4;</span>
            Create a room
          </ChunkyBtn>
        </Link>
      </div>
    </header>
  );
}

// ── Picker Tabs ─────────────────────────────────────────────────────────
function PickerTabs({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const tabs = [
    { id: "vote", label: "Vote", emoji: "\u2605", color: "#FFE89B" },
    { id: "spin", label: "Spin", emoji: "\u21BB", color: "#FFCDE0" },
    { id: "explore", label: "Explore", emoji: "\u25C9", color: "#B7E4FF" },
  ];
  return (
    <div style={{ display: "flex", gap: 10, padding: "0 32px", marginBottom: 18, flexWrap: "wrap" }}>
      {tabs.map((t) => {
        const on = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            style={{
              appearance: "none",
              padding: "10px 22px 9px",
              border: `2.5px solid ${INK}`,
              background: on ? t.color : CREAM,
              color: INK,
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              boxShadow: on ? `5px 5px 0 ${INK}` : `3px 3px 0 ${INK}`,
              transform: on ? "translate(-1px, -1px)" : "none",
              cursor: "pointer",
              transition: "transform 0.1s, box-shadow 0.1s",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 18,
              lineHeight: 1,
              color: on ? ACCENT : INK,
            }}>{t.emoji}</span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Control Panels ──────────────────────────────────────────────────────
function ControlPanel({ color, tilt, children }: { color: string; tilt: number; children: React.ReactNode }) {
  return (
    <div style={{ padding: "0 32px 28px" }}>
      <div
        style={{
          background: color,
          border: `2.5px solid ${INK}`,
          boxShadow: `6px 6px 0 ${INK}`,
          padding: "18px 22px",
          transform: `rotate(${tilt}deg)`,
          display: "flex",
          gap: 24,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ModeHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: FONT_DISPLAY,
      fontSize: 32,
      lineHeight: 0.95,
      letterSpacing: "-0.015em",
      color: INK,
      margin: 0,
    }}>{children}</h2>
  );
}

const controlsCopy: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 500,
  color: INK,
  opacity: 0.8,
  maxWidth: "44ch",
  flex: 1,
  minWidth: 240,
};

function VoteControls() {
  return (
    <ControlPanel color="#FFE89B" tilt={-0.6}>
      <ModeHeading>The ballot</ModeHeading>
      <p style={controlsCopy}>
        Today&apos;s votes from the whole team, live. Star places in Explore to put them on the ballot &mdash; votes reset every morning.
      </p>
    </ControlPanel>
  );
}

function SpinControls({ onRespin, spinCount, poolSize }: { onRespin: () => void; spinCount: number; poolSize: number }) {
  return (
    <ControlPanel color="#FFCDE0" tilt={0.6}>
      <ModeHeading>The roulette</ModeHeading>
      <p style={controlsCopy}>
        5 random picks from {poolSize} places that aren&apos;t closed right now, weighted toward ones the team hasn&apos;t been to lately.
      </p>
      <ChunkyBtn onClick={onRespin} size="lg" color={ACCENT} fg={CREAM}
        style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
        <span style={{
          display: "inline-block",
          fontFamily: FONT_DISPLAY,
          fontSize: 22,
          lineHeight: 1,
          transform: `rotate(${spinCount * 360}deg)`,
          transition: "transform 0.8s cubic-bezier(.2,.7,.3,1)",
          marginRight: 4,
        }}>&#8635;</span>
        Re-spin!
      </ChunkyBtn>
    </ControlPanel>
  );
}

function LabelEl({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: INK,
      opacity: 0.65,
    }}>{children}</span>
  );
}

function SliderField({ label, value, min, max, v, onChange }: { label: string; value: string; min: number; max: number; v: number; onChange: (v: number) => void }) {
  return (
    <div style={{ minWidth: 140 }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}>
        <LabelEl>{label}</LabelEl>
        <span style={{
          fontFamily: FONT_MONO,
          fontSize: 13,
          fontWeight: 700,
          color: INK,
        }}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={v}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: ACCENT, marginTop: 4 }}
      />
    </div>
  );
}

const TYPE_CHIPS: { label: string; types: string[] }[] = [
  { label: "Restaurant", types: ["restaurant"] },
  { label: "Cafe", types: ["cafe"] },
  { label: "Fast food", types: ["fast_food"] },
  { label: "Bakery", types: ["bakery"] },
  { label: "Food court", types: ["food_court"] },
  { label: "Ice cream", types: ["ice_cream"] },
  { label: "Bar / pub", types: ["bar", "pub"] },
];

const FLAG_CHIPS: { key: "veg" | "delivery" | "takeaway" | "outdoor" | "ac"; label: string }[] = [
  { key: "veg", label: "Veg" },
  { key: "delivery", label: "Delivery" },
  { key: "takeaway", label: "Takeaway" },
  { key: "outdoor", label: "Outdoor" },
  { key: "ac", label: "AC" },
];

const OPEN_OPTIONS: { value: OpenFilter; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "now", label: "Open now" },
  { value: "lunch", label: "Open at 1 pm" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "distance", label: "Nearest" },
  { value: "votes", label: "Most votes today" },
  { value: "rating", label: "Team rating" },
  { value: "due", label: "Not been in a while" },
  { value: "name", label: "A\u2013Z" },
];

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={{
        appearance: "none",
        padding: "5px 12px",
        border: `2px solid ${INK}`,
        background: on ? INK : "transparent",
        color: on ? CREAM : INK,
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        cursor: "pointer",
        boxShadow: on ? `2px 2px 0 ${INK}` : "none",
      }}
    >
      {children}
    </button>
  );
}

const fieldInput: React.CSSProperties = {
  marginTop: 4,
  width: "100%",
  padding: "7px 10px",
  border: `2px solid ${INK}`,
  background: CREAM,
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "inherit",
  color: INK,
  borderRadius: 0,
};

function ExploreControls({
  filters,
  setFilters,
  radiusKm,
  setRadiusKm,
  total,
  loading,
  geoStatus,
}: {
  filters: ExploreFilters;
  setFilters: React.Dispatch<React.SetStateAction<ExploreFilters>>;
  radiusKm: number;
  setRadiusKm: (v: number) => void;
  total: number;
  loading: boolean;
  geoStatus: "pending" | "granted" | "denied";
}) {
  const toggleTypes = (types: string[]) =>
    setFilters((f) => {
      const on = types.every((t) => f.types.includes(t));
      return { ...f, types: on ? f.types.filter((t) => !types.includes(t)) : [...f.types, ...types] };
    });

  return (
    <ControlPanel color="#B7E4FF" tilt={0.3}>
      <div style={{ flex: "1 1 100%", display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <ModeHeading>Discover nearby</ModeHeading>
          <p style={{ ...controlsCopy, marginTop: 6 }}>
            {total} food spots from OpenStreetMap within {radiusKm} km of{" "}
            {geoStatus === "granted" ? "you" : "the office"}.
            {loading && <span style={{ marginLeft: 8, opacity: 0.6 }}>Loading&hellip;</span>}
          </p>
        </div>
        <label style={{ minWidth: 200, flex: "0 1 260px" }}>
          <LabelEl>Search</LabelEl>
          <input
            type="search"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder={"name or cuisine \u2014 biryani, Kayees\u2026"}
            style={fieldInput}
          />
        </label>
        <label style={{ minWidth: 170 }}>
          <LabelEl>Sort</LabelEl>
          <select
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as SortKey }))}
            style={fieldInput}
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <SliderField label="Radius" value={`${radiusKm} km`} min={1} max={15} v={radiusKm} onChange={setRadiusKm} />
      </div>

      <div style={{ flex: "1 1 100%", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <LabelEl>Type</LabelEl>
          {TYPE_CHIPS.map((c) => (
            <Chip key={c.label} on={c.types.every((t) => filters.types.includes(t))} onClick={() => toggleTypes(c.types)}>
              {c.label}
            </Chip>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <LabelEl>Hours</LabelEl>
          {OPEN_OPTIONS.map((o) => (
            <Chip key={o.value} on={filters.open === o.value} onClick={() => setFilters((f) => ({ ...f, open: o.value }))}>
              {o.label}
            </Chip>
          ))}
          <span style={{ width: 12 }} />
          <LabelEl>Has</LabelEl>
          {FLAG_CHIPS.map((c) => (
            <Chip key={c.key} on={filters[c.key]} onClick={() => setFilters((f) => ({ ...f, [c.key]: !f[c.key] }))}>
              {c.label}
            </Chip>
          ))}
        </div>
        {filters.open !== "any" && (
          <p style={{ margin: 0, fontSize: 12, fontWeight: 500, opacity: 0.7 }}>
            Only places with opening hours on OpenStreetMap can be checked, so this shows fewer spots.
          </p>
        )}
      </div>
    </ControlPanel>
  );
}

// ── Section heading ─────────────────────────────────────────────────────
function SectionHead({ picker, count, onShowMap }: { picker: string; count: number; onShowMap?: () => void }) {
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const titles: Record<string, React.ReactNode> = {
    vote: <>Today&apos;s <em style={{ color: ACCENT, fontStyle: "normal" }}>shortlist</em></>,
    spin: <>The wheel said <em style={{ color: ACCENT, fontStyle: "normal" }}>these five</em></>,
    explore: <><em style={{ color: ACCENT, fontStyle: "normal" }}>{count}</em> spots nearby</>,
  };
  return (
    <div style={{
      padding: "8px 32px 28px",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap",
    }}>
      <div>
        <div style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: INK,
          opacity: 0.55,
          fontWeight: 600,
        }}>
          &#9733; {today}
        </div>
        <h2 style={{
          fontFamily: FONT_DISPLAY,
          fontSize: "clamp(36px, 5vw, 56px)",
          lineHeight: 0.95,
          letterSpacing: "-0.02em",
          color: INK,
          marginTop: 6,
        }}>{titles[picker]}</h2>
      </div>
      {onShowMap && (
        <ChunkyBtn onClick={onShowMap} color="#B7E4FF" fg={INK} size="sm">
          <span style={{ width: 16, height: 16, display: "inline-block" }}>{COMPASS}</span>
          Show on map
        </ChunkyBtn>
      )}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "0 40px 40px" }}>
      <div style={{
        border: `2.5px dashed ${INK}`,
        background: SURFACE,
        padding: "28px 24px",
        textAlign: "center",
        fontSize: 15,
        fontWeight: 500,
        color: INK,
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Footer ──────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      padding: "40px 32px 56px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 14,
    }}>
      <div style={{
        fontFamily: FONT_DISPLAY,
        fontSize: 32,
        color: INK,
        opacity: 0.4,
        transform: "rotate(-2deg)",
      }}>
        ~ end of the list ~
      </div>
      <div style={{
        fontFamily: FONT_MONO,
        fontSize: 11,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: INK,
        opacity: 0.5,
      }}>
        eat well &middot; be back by 2
      </div>
    </footer>
  );
}

// ── Data ────────────────────────────────────────────────────────────────
interface RestaurantsQuery {
  lat: number;
  lng: number;
  radius: number;
  limit: number;
  voter?: string;
  extra: Record<string, string>;
}

/** Fetches /api/restaurants; `refreshKey` forces a refetch with the same query. */
function useRestaurants(query: RestaurantsQuery | null, refreshKey: number) {
  const [spots, setSpots] = React.useState<Spot[]>([]);
  const [total, setTotal] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  // Query key of the last successful load, and of the last finished request
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null);
  const [settledKey, setSettledKey] = React.useState<string | null>(null);

  const key = query ? JSON.stringify(query) : null;
  React.useEffect(() => {
    if (!key) return;
    const q: RestaurantsQuery = JSON.parse(key);
    const controller = new AbortController();
    const params = new URLSearchParams({
      lat: String(q.lat),
      lng: String(q.lng),
      radius: String(q.radius),
      limit: String(q.limit),
      ...(q.voter ? { voter: q.voter } : {}),
      ...q.extra,
    });
    fetch(`/api/restaurants?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSpots((data.restaurants as NearbyRestaurant[]).map(restaurantToSpot));
        setTotal(data.total ?? data.count ?? 0);
        setError(null);
        setLoadedKey(key);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Restaurants fetch error:", err);
        setError(err.message ?? "Could not load places");
      })
      .finally(() => {
        if (!controller.signal.aborted) setSettledKey(key);
      });
    return () => controller.abort();
  }, [key, refreshKey]);

  // `fresh`: the current spots belong to the current query (not the previous tab's)
  const loading = key !== null && settledKey !== key;
  return { spots, setSpots, total, loading, error, fresh: key !== null && loadedKey === key };
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

const DEFAULT_FILTERS: ExploreFilters = {
  q: "",
  types: [],
  veg: false,
  delivery: false,
  takeaway: false,
  outdoor: false,
  ac: false,
  open: "any",
  sort: "distance",
};

function exploreParams(f: ExploreFilters): Record<string, string> {
  const p: Record<string, string> = { sort: f.sort, open: f.open };
  if (f.q.trim()) p.q = f.q.trim();
  if (f.types.length) p.types = f.types.join(",");
  for (const k of ["veg", "delivery", "takeaway", "outdoor", "ac"] as const) if (f[k]) p[k] = "1";
  return p;
}

// ── Main App ────────────────────────────────────────────────────────────
type Picker = "vote" | "spin" | "explore";

export default function LunchApp() {
  const [picker, setPicker] = React.useState<Picker>("explore");
  const { identity, setName } = useIdentity();
  const { location: userLocation, status: geoStatus } = useUserLocation();

  const [radiusKm, setRadiusKmRaw] = React.useState(3);
  const debouncedRadius = useDebounced(radiusKm, 300);
  const [filters, setFiltersRaw] = React.useState<ExploreFilters>(DEFAULT_FILTERS);
  const debouncedFilters = useDebounced(filters, 300);
  const [pages, setPages] = React.useState(1);

  // New filters or radius → back to the first page
  const setRadiusKm = (v: number) => {
    setRadiusKmRaw(v);
    setPages(1);
  };
  const setFilters: React.Dispatch<React.SetStateAction<ExploreFilters>> = (action) => {
    setFiltersRaw(action);
    setPages(1);
  };
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Spin state
  const [spinSeed, setSpinSeed] = React.useState(7);
  const [spinCount, setSpinCount] = React.useState(0);
  const [isSpinning, setIsSpinning] = React.useState(false);

  // Overlays
  const [mapSpots, setMapSpots] = React.useState<Spot[] | null>(null);
  const [visitSpot, setVisitSpot] = React.useState<Spot | null>(null);

  // Vote summary for the masthead
  const [summary, setSummary] = React.useState({ votes: 0, mine: 0 });

  const voter = identity?.id;
  const query = React.useMemo<RestaurantsQuery | null>(() => {
    // Start from the office location; refetches once geolocation resolves
    if (!voter) return null;
    const base = { lat: userLocation.lat, lng: userLocation.lng, radius: debouncedRadius, voter };
    if (picker === "vote") return { ...base, limit: 100, extra: { sort: "votes", voted: "1" } };
    if (picker === "spin") return { ...base, limit: 500, extra: { open: "hide_closed" } };
    return { ...base, limit: PAGE_SIZE * pages, extra: exploreParams(debouncedFilters) };
  }, [voter, userLocation.lat, userLocation.lng, debouncedRadius, picker, pages, debouncedFilters]);

  const { spots, setSpots, total, loading, error, fresh } = useRestaurants(query, refreshKey);

  const refreshSummary = React.useCallback(() => {
    if (!voter) return;
    fetch(`/api/votes?voter=${encodeURIComponent(voter)}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setSummary({ votes: d.votes, mine: d.mine }); })
      .catch(() => {});
  }, [voter]);
  React.useEffect(refreshSummary, [refreshSummary]);

  // Keep the ballot live while it's on screen
  React.useEffect(() => {
    if (picker !== "vote") return;
    const id = setInterval(() => {
      setRefreshKey((k) => k + 1);
      refreshSummary();
    }, 20_000);
    return () => clearInterval(id);
  }, [picker, refreshSummary]);

  const onVote = async (id: string) => {
    if (!identity) return;
    const spot = spots.find((s) => s.id === id);
    if (!spot) return;
    const active = !spot.myVote;
    const patch = (votes: number) =>
      setSpots((sp) => sp.map((x) => (x.id === id ? { ...x, myVote: active, votes } : x)));
    patch(Math.max(0, spot.votes + (active ? 1 : -1)));
    setSummary((s) => ({ votes: s.votes + (active ? 1 : -1), mine: s.mine + (active ? 1 : -1) }));
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotId: id, voterId: identity.id, voterName: identity.name, active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      patch(data.votes);
    } catch (err) {
      console.error("Vote failed:", err);
      setSpots((sp) => sp.map((x) => (x.id === id ? spot : x)));
    }
    refreshSummary();
  };

  const triggerSpin = React.useCallback(() => {
    setSpinSeed((s) => s + 1 + Math.floor(Math.random() * 1000));
    setSpinCount((c) => c + 1);
    setIsSpinning(true);
  }, []);

  const display = React.useMemo(() => {
    if (picker === "spin") return pickBySpin(spots, spinSeed).slice(0, 5);
    return spots;
  }, [picker, spots, spinSeed]);

  // Don't start the reel until the spin pool has loaded
  const spinReady = picker === "spin" && fresh && spots.length > 0;

  const emptyMessage =
    error ? <>Couldn&apos;t load places: {error}</> :
    loading || !fresh ? <>Loading&hellip;</> :
    picker === "vote" ? <>No votes yet today. Head to <strong>Explore</strong> and &#9733; a few places.</> :
    picker === "spin" ? <>Nothing open within {radiusKm} km to spin. Try a bigger radius.</> :
    <>Nothing matches. Loosen a filter or widen the radius.</>;

  return (
    <div style={{ minHeight: "100vh", color: INK }}>
      <Masthead votesToday={summary.votes} myVotes={summary.mine} geoStatus={geoStatus} />

      <PickerTabs
        value={picker}
        onChange={(v) => {
          setPicker(v as Picker);
          if (v === "spin") triggerSpin();
        }}
      />

      {picker === "vote" && <VoteControls />}
      {picker === "spin" && (
        <SpinControls onRespin={triggerSpin} spinCount={spinCount} poolSize={spots.length} />
      )}
      {picker === "explore" && (
        <ExploreControls
          filters={filters}
          setFilters={setFilters}
          radiusKm={radiusKm}
          setRadiusKm={setRadiusKm}
          total={total}
          loading={loading}
          geoStatus={geoStatus}
        />
      )}

      <SectionHead
        picker={picker}
        count={picker === "explore" ? total : display.length}
        onShowMap={display.length > 0 ? () => setMapSpots(display) : undefined}
      />

      {display.length === 0 || (!fresh && picker !== "explore") ? (
        <EmptyState>{emptyMessage}</EmptyState>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))",
            gap: 28,
            padding: "0 40px 40px",
            alignItems: "start",
          }}
          key={picker + "-" + spinSeed}
        >
          {display.map((s, i) => (
            <SpotCard
              key={s.id}
              spot={s}
              rank={i + 1}
              primary={picker === "spin" || (picker === "vote" && i < 5 && s.votes > 0)}
              onVote={onVote}
              voted={!!s.myVote}
              idx={i}
              layout="grid"
              onShowMap={(spot) => setMapSpots([spot])}
              onLogVisit={setVisitSpot}
            />
          ))}
        </div>
      )}

      {picker === "explore" && spots.length < total && (
        <div style={{ display: "flex", justifyContent: "center", padding: "0 32px 24px" }}>
          <ChunkyBtn onClick={() => setPages((p) => p + 1)} color={CREAM} fg={INK} disabled={loading}>
            {loading ? "Loading\u2026" : `Show more (${total - spots.length} left)`}
          </ChunkyBtn>
        </div>
      )}

      <Footer />

      {mapSpots && (
        <SpotMap spots={mapSpots} center={userLocation} onClose={() => setMapSpots(null)} />
      )}

      {identity && visitSpot && (
        <VisitModal
          key={visitSpot.id}
          spot={visitSpot}
          identityId={identity.id}
          name={identity.name}
          onNameChange={setName}
          onClose={() => setVisitSpot(null)}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {isSpinning && spinReady && (
        <SpinOverlay
          key={spinCount}
          spots={spots}
          finalists={display}
          onDone={() => setIsSpinning(false)}
          onSpinAgain={triggerSpin}
        />
      )}
    </div>
  );
}
