"use client";

import React from "react";
import { INK, ACCENT, CREAM, FONT_DISPLAY, FONT_MONO, FONT_BODY, ALL_CUISINES } from "@/lib/constants";
import { Spot, Filters, NearbyRestaurant } from "@/lib/types";
import { SEED_SPOTS } from "@/lib/data";
import { pickByVote, pickBySpin, pickByFilter } from "@/lib/pickers";

// MG Road, Kochi office — used as fallback if geolocation is unavailable
const FALLBACK_LAT = 9.9816;
const FALLBACK_LNG = 76.2999;

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

function nearbyToSpot(r: NearbyRestaurant): Spot {
  const walkMin = Math.max(1, Math.round(r.distance_m / 80)); // ~80m per minute walk
  return {
    id: `osm-${r.osm_id}`,
    name: r.name,
    cuisine: r.cuisine.length > 0 ? r.cuisine : [r.amenity_type],
    area: r.addr_street || `${(r.distance_m / 1000).toFixed(1)} km away`,
    walk: walkMin,
    price: 2, // default mid-range
    votes: 0,
    lastVisited: "never",
    cooldown: 999,
    by: "OSM",
    byName: "OpenStreetMap",
    notes: [
      r.opening_hours && `Hours: ${r.opening_hours}`,
      r.phone && `Phone: ${r.phone}`,
      r.outdoor_seating && "Has outdoor seating",
      r.delivery && "Offers delivery",
      r.takeaway && "Takeaway available",
    ].filter(Boolean).join(" · ") || "Discovered nearby — no notes yet.",
    tags: [
      r.amenity_type,
      ...(r.outdoor_seating ? ["outdoor"] : []),
      ...(r.delivery ? ["delivery"] : []),
    ],
    veg: r.is_veg_only === 1,
    distanceM: r.distance_m,
    fromDb: true,
  };
}
import { ChunkyBtn } from "./ui";
import { SpotCard } from "./SpotCard";
import { AddModal } from "./AddModal";
import { SpinOverlay } from "./SpinOverlay";
import { SPARKLE } from "./Glyphs";

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

function Masthead({ onAdd, spotCount, votedCount, wobble, geoStatus }: { onAdd: () => void; spotCount: number; votedCount: number; wobble: boolean; geoStatus: "pending" | "granted" | "denied" }) {
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
            animation: wobble ? "none" : "none",
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
          A living wishlist of every place the team has put up on the wall. Add yours, vote on the rest, and let&apos;s actually decide before noon.
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
          <BigStat value={spotCount} label="on the wall" color="#FFE89B" rot={-3} />
          <BigStat value={votedCount} label="you voted" color="#D6CCFF" rot={3} />
        </div>
        <ChunkyBtn onClick={onAdd} size="lg" color={ACCENT} fg={CREAM}>
          <span style={{
            display: "inline-flex",
            width: 26, height: 26,
            background: CREAM,
            color: ACCENT,
            border: `2.5px solid ${INK}`,
            borderRadius: 999,
            alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 700, lineHeight: 1,
            marginRight: 4,
          }}>+</span>
          Suggest a spot
        </ChunkyBtn>
      </div>
    </header>
  );
}

// ── Picker Tabs ─────────────────────────────────────────────────────────
function PickerTabs({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const tabs = [
    { id: "vote", label: "Vote", emoji: "\u2605", color: "#FFE89B" },
    { id: "spin", label: "Spin", emoji: "\u21BB", color: "#FFCDE0" },
    { id: "filter", label: "Filter", emoji: "\u25BD", color: "#C8E7C0" },
    { id: "nearby", label: "Nearby", emoji: "\u25C9", color: "#B7E4FF" },
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
        Top 5 by team votes win the day. Click &#9733; on any card to add your support.
      </p>
    </ControlPanel>
  );
}

function SpinControls({ onRespin, spinCount }: { onRespin: () => void; spinCount: number }) {
  return (
    <ControlPanel color="#FFCDE0" tilt={0.6}>
      <ModeHeading>The roulette</ModeHeading>
      <p style={controlsCopy}>
        5 random picks, weighted toward places we haven&apos;t hit in a while. Spin until you&apos;re hungry.
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

function FilterControls({ filters, setFilters, matchCount }: { filters: Filters; setFilters: React.Dispatch<React.SetStateAction<Filters>>; matchCount: number }) {
  return (
    <ControlPanel color="#C8E7C0" tilt={-0.4}>
      <div style={{ flex: 1, minWidth: 280 }}>
        <ModeHeading>The sieve</ModeHeading>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {["all", ...ALL_CUISINES].map((c) => {
            const on = filters.cuisine === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, cuisine: c }))}
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
                {c === "all" ? "any" : c}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
        <SliderField
          label="Walk \u2264"
          value={`${filters.maxWalk}m`}
          min={5}
          max={30}
          v={filters.maxWalk}
          onChange={(v) => setFilters((f) => ({ ...f, maxWalk: v }))}
        />
        <div>
          <LabelEl>Price \u2264</LabelEl>
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            {[1, 2, 3].map((p) => {
              const on = filters.maxPrice >= p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, maxPrice: p }))}
                  style={{
                    padding: "6px 12px",
                    border: `2px solid ${INK}`,
                    background: on ? INK : CREAM,
                    color: on ? CREAM : INK,
                    fontFamily: FONT_MONO,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: on ? `2px 2px 0 ${INK}` : "none",
                  }}
                >
                  &#8377;
                </button>
              );
            })}
          </div>
        </div>
        <div style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 28,
          color: INK,
          lineHeight: 1,
          alignSelf: "flex-end",
          paddingBottom: 4,
        }}>
          <span style={{ color: ACCENT }}>{matchCount}</span>{" "}
          <span style={{ fontSize: 13, fontFamily: FONT_BODY, fontWeight: 600, opacity: 0.7 }}>
            match{matchCount === 1 ? "" : "es"}
          </span>
        </div>
      </div>
    </ControlPanel>
  );
}

// ── Nearby Controls ────────────────────────────────────────────────────
function NearbyControls({
  radiusKm,
  setRadiusKm,
  nearbyCount,
  loading,
  cuisineFilter,
  setCuisineFilter,
  vegOnly,
  setVegOnly,
  geoStatus,
}: {
  radiusKm: number;
  setRadiusKm: (v: number) => void;
  nearbyCount: number;
  loading: boolean;
  cuisineFilter: string;
  setCuisineFilter: (v: string) => void;
  vegOnly: boolean;
  setVegOnly: (v: boolean) => void;
  geoStatus: "pending" | "granted" | "denied";
}) {
  return (
    <ControlPanel color="#B7E4FF" tilt={0.3}>
      <div style={{ flex: 1, minWidth: 280 }}>
        <ModeHeading>Discover nearby</ModeHeading>
        <p style={controlsCopy}>
          Real restaurants from OpenStreetMap, sorted by distance from{" "}
          {geoStatus === "granted" ? "your location" : "the office"}.
          {loading && <span style={{ marginLeft: 8, opacity: 0.6 }}>Loading...</span>}
        </p>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
        <SliderField
          label="Radius"
          value={`${radiusKm} km`}
          min={1}
          max={15}
          v={radiusKm}
          onChange={setRadiusKm}
        />
        <div style={{ minWidth: 100 }}>
          <LabelEl>Cuisine</LabelEl>
          <input
            type="text"
            value={cuisineFilter}
            onChange={(e) => setCuisineFilter(e.target.value)}
            placeholder="any"
            style={{
              marginTop: 4,
              width: "100%",
              padding: "6px 10px",
              border: `2px solid ${INK}`,
              background: CREAM,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
              color: INK,
            }}
          />
        </div>
        <div>
          <button
            type="button"
            onClick={() => setVegOnly(!vegOnly)}
            style={{
              padding: "6px 14px",
              border: `2px solid ${INK}`,
              background: vegOnly ? INK : CREAM,
              color: vegOnly ? CREAM : INK,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              cursor: "pointer",
              borderRadius: 999,
              boxShadow: vegOnly ? `2px 2px 0 ${INK}` : "none",
            }}
          >
            Veg only
          </button>
        </div>
        <div style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 28,
          color: INK,
          lineHeight: 1,
          alignSelf: "flex-end",
          paddingBottom: 4,
        }}>
          <span style={{ color: ACCENT }}>{nearbyCount}</span>{" "}
          <span style={{ fontSize: 13, fontFamily: FONT_BODY, fontWeight: 600, opacity: 0.7 }}>
            found
          </span>
        </div>
      </div>
    </ControlPanel>
  );
}

// ── Section heading ─────────────────────────────────────────────────────
function SectionHead({ picker, count }: { picker: string; count: number }) {
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const titles: Record<string, React.ReactNode> = {
    vote: <>Today&apos;s <em style={{ color: ACCENT, fontStyle: "normal" }}>shortlist</em></>,
    spin: <>The wheel said <em style={{ color: ACCENT, fontStyle: "normal" }}>these five</em></>,
    filter: <><em style={{ color: ACCENT, fontStyle: "normal" }}>{count}</em> places that fit</>,
    nearby: <><em style={{ color: ACCENT, fontStyle: "normal" }}>{count}</em> spots nearby</>,
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

// ── Main App ────────────────────────────────────────────────────────────
export default function LunchApp() {
  const [picker, setPicker] = React.useState("vote");
  const [layout, setLayout] = React.useState("grid");
  const [highlightTop5, setHighlightTop5] = React.useState(true);
  const [wobble, setWobble] = React.useState(true);

  const [spots, setSpots] = React.useState<Spot[]>(SEED_SPOTS);
  const [voted, setVoted] = React.useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = React.useState(false);
  const [spinSeed, setSpinSeed] = React.useState(7);
  const [spinCount, setSpinCount] = React.useState(0);
  const [isSpinning, setIsSpinning] = React.useState(false);

  const triggerSpin = React.useCallback(() => {
    setSpinSeed((s) => s + 1 + Math.floor(Math.random() * 1000));
    setSpinCount((c) => c + 1);
    setIsSpinning(true);
  }, []);

  const [filters, setFilters] = React.useState<Filters>({
    cuisine: "all",
    maxWalk: 20,
    maxPrice: 3,
  });

  // ── Location + Nearby state ──
  const { location: userLocation, status: geoStatus } = useUserLocation();
  const [nearbySpots, setNearbySpots] = React.useState<Spot[]>([]);
  const [nearbyLoading, setNearbyLoading] = React.useState(false);
  const [nearbyRadius, setNearbyRadius] = React.useState(5);
  const [nearbyCuisine, setNearbyCuisine] = React.useState("");
  const [nearbyVeg, setNearbyVeg] = React.useState(false);

  // Debounce cuisine filter to avoid firing on every keystroke
  const [debouncedCuisine, setDebouncedCuisine] = React.useState(nearbyCuisine);
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedCuisine(nearbyCuisine), 350);
    return () => clearTimeout(id);
  }, [nearbyCuisine]);

  // Fetch nearby restaurants when location resolves or filters change
  // Always fetch so nearby spots are available across all tabs (vote, spin, filter use allSpots).
  // Cuisine/veg filters only apply when the Nearby tab is active.
  const applyCuisine = picker === "nearby" ? debouncedCuisine : "";
  const applyVeg = picker === "nearby" ? nearbyVeg : false;

  React.useEffect(() => {
    const controller = new AbortController();
    setNearbyLoading(true);

    const params = new URLSearchParams({
      lat: String(userLocation.lat),
      lng: String(userLocation.lng),
      radius: String(nearbyRadius),
      limit: "50",
    });
    if (applyCuisine) params.set("cuisine", applyCuisine);
    if (applyVeg) params.set("veg", "1");

    fetch(`/api/restaurants?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.restaurants) {
          setNearbySpots(data.restaurants.map(nearbyToSpot));
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Nearby fetch error:", err);
      })
      .finally(() => setNearbyLoading(false));

    return () => controller.abort();
  }, [userLocation.lat, userLocation.lng, nearbyRadius, applyCuisine, applyVeg]);

  const onVote = (id: string) => {
    setVoted((s) => {
      const next = new Set(s);
      const isVoted = next.has(id);
      if (isVoted) next.delete(id);
      else next.add(id);
      setSpots((sp) =>
        sp.map((x) =>
          x.id === id ? { ...x, votes: x.votes + (isVoted ? -1 : 1) } : x,
        ),
      );
      return next;
    });
  };

  const onAdd = (newSpot: Spot) => {
    setSpots((sp) => [newSpot, ...sp]);
    setVoted((s) => new Set([...s, newSpot.id]));
  };

  const allSpots = React.useMemo(() => [...spots, ...nearbySpots], [spots, nearbySpots]);

  const ranked = React.useMemo(() => {
    if (picker === "nearby") return nearbySpots;
    if (picker === "vote") return pickByVote(allSpots);
    if (picker === "spin") return pickBySpin(allSpots, spinSeed);
    return pickByFilter(allSpots, filters);
  }, [picker, allSpots, spinSeed, filters, nearbySpots]);

  const display = React.useMemo(() => {
    if (picker === "nearby") return ranked;
    if (picker === "spin") return ranked.slice(0, 5);
    if (ranked.length >= 5) return ranked;
    const haveIds = new Set(ranked.map((s) => s.id));
    const fill = pickByVote(allSpots).filter((s) => !haveIds.has(s.id)).slice(0, 5 - ranked.length);
    return [...ranked, ...fill];
  }, [ranked, allSpots, picker]);

  return (
    <div style={{ minHeight: "100vh", color: INK }}>
      <Masthead
        onAdd={() => setModalOpen(true)}
        spotCount={spots.length}
        votedCount={voted.size}
        wobble={wobble}
        geoStatus={geoStatus}
      />

      <PickerTabs
        value={picker}
        onChange={(v) => {
          setPicker(v);
          if (v === "spin") triggerSpin();
        }}
      />

      {picker === "vote" && <VoteControls />}
      {picker === "spin" && (
        <SpinControls
          onRespin={triggerSpin}
          spinCount={spinCount}
        />
      )}
      {picker === "filter" && (
        <FilterControls
          filters={filters}
          setFilters={setFilters}
          matchCount={ranked.length}
        />
      )}
      {picker === "nearby" && (
        <NearbyControls
          radiusKm={nearbyRadius}
          setRadiusKm={setNearbyRadius}
          nearbyCount={nearbySpots.length}
          loading={nearbyLoading}
          cuisineFilter={nearbyCuisine}
          setCuisineFilter={setNearbyCuisine}
          vegOnly={nearbyVeg}
          setVegOnly={setNearbyVeg}
          geoStatus={geoStatus}
        />
      )}

      <SectionHead
        picker={picker}
        count={display.length}
      />

      {/* Cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            layout === "list" ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))",
          gap: layout === "list" ? 24 : 28,
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
            primary={highlightTop5 && i < 5}
            onVote={onVote}
            voted={voted.has(s.id)}
            idx={i}
            layout={layout}
          />
        ))}
      </div>

      <Footer />

      <AddModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={onAdd} />

      {isSpinning && picker === "spin" && (
        <SpinOverlay
          key={spinCount}
          spots={[...spots, ...nearbySpots]}
          finalists={display}
          onDone={() => setIsSpinning(false)}
          onSpinAgain={triggerSpin}
        />
      )}
    </div>
  );
}
