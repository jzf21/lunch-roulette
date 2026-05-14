"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { INK, ACCENT, CREAM, FONT_DISPLAY, FONT_MONO, FONT_BODY } from "@/lib/constants";
import { Spot, RoomState, RoomMember, NearbyRestaurant } from "@/lib/types";
import { pickByVote, pickBySpin, pickByFilter } from "@/lib/pickers";
import { ChunkyBtn, Pill } from "./ui";
import { SpotCard } from "./SpotCard";
import { AddModal } from "./AddModal";
import { SpinOverlay } from "./SpinOverlay";
import { RoomBar } from "./RoomBar";
import { glyphFor, FOOT } from "./Glyphs";

// ── Location hook ───────────────────────────────────────────────────────
const FALLBACK_LAT = 9.9816;
const FALLBACK_LNG = 76.2999;

function useUserLocation() {
  const [location, setLocation] = React.useState({ lat: FALLBACK_LAT, lng: FALLBACK_LNG });
  const [status, setStatus] = React.useState<"pending" | "granted" | "denied">("pending");

  React.useEffect(() => {
    if (!navigator.geolocation) { setStatus("denied"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setStatus("granted"); },
      () => { setStatus("denied"); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  }, []);

  return { location, status };
}

function nearbyToSpot(r: NearbyRestaurant): Spot {
  const walkMin = Math.max(1, Math.round(r.distance_m / 80));
  return {
    id: `osm-${r.osm_id}`,
    name: r.name,
    cuisine: r.cuisine.length > 0 ? r.cuisine : [r.amenity_type],
    area: r.addr_street || `${(r.distance_m / 1000).toFixed(1)} km away`,
    walk: walkMin,
    price: 2,
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
    ].filter(Boolean).join(" \u00b7 ") || "Discovered nearby \u2014 no notes yet.",
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

// ── SSE Hook ────────────────────────────────────────────────────────────
function useRoomSSE(code: string) {
  const [room, setRoom] = React.useState<RoomState | null>(null);
  const [connected, setConnected] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const es = new EventSource(`/api/rooms/${code}/stream`);

    es.addEventListener("connected", (e) => {
      const data: RoomState = JSON.parse(e.data);
      setRoom(data);
      setConnected(true);
      setError(null);
    });

    es.addEventListener("spot_added", (e) => {
      const data = JSON.parse(e.data);
      setRoom((prev) => prev ? { ...prev, spots: data.spots } : prev);
    });

    es.addEventListener("vote_changed", (e) => {
      const data = JSON.parse(e.data);
      setRoom((prev) => {
        if (!prev) return prev;
        const spots = prev.spots.map((s) =>
          s.id === data.spotId ? { ...s, votes: data.votes } : s
        );
        const votes = { ...prev.votes, [data.spotId]: data.voters };
        return { ...prev, spots, votes };
      });
    });

    es.addEventListener("spin_started", (e) => {
      const data = JSON.parse(e.data);
      setRoom((prev) => prev ? {
        ...prev,
        spots: data.spots || prev.spots,
        spin: {
          active: true,
          seed: data.seed,
          triggeredBy: data.triggeredBy,
          result: data.result,
        },
      } : prev);
    });

    es.addEventListener("member_joined", (e) => {
      const data = JSON.parse(e.data);
      setRoom((prev) => prev ? { ...prev, members: data.members } : prev);
    });

    es.addEventListener("member_left", (e) => {
      const data = JSON.parse(e.data);
      setRoom((prev) => {
        if (!prev) return prev;
        return { ...prev, members: prev.members.filter((m) => m.id !== data.memberId) };
      });
    });

    es.onerror = () => {
      setConnected(false);
      setError("Connection lost. Reconnecting...");
    };

    return () => es.close();
  }, [code]);

  return { room, connected, error };
}

// ── Section heading ─────────────────────────────────────────────────────
function SectionHead({ count }: { count: number }) {
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
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
        }}>
          <em style={{ color: ACCENT, fontStyle: "normal" }}>{count}</em>{" "}
          in the bucket
        </h2>
      </div>
    </div>
  );
}

// ── Nearby Side Panel ───────────────────────────────────────────────────
function NearbySidePanel({
  open,
  onClose,
  onAddSpot,
  addedIds,
}: {
  open: boolean;
  onClose: () => void;
  onAddSpot: (spot: Spot) => void;
  addedIds: Set<string>;
}) {
  const { location, status: geoStatus } = useUserLocation();
  const [nearby, setNearby] = React.useState<Spot[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [radius, setRadius] = React.useState(5);
  const [cuisine, setCuisine] = React.useState("");
  const [debouncedCuisine, setDebouncedCuisine] = React.useState("");

  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedCuisine(cuisine), 350);
    return () => clearTimeout(id);
  }, [cuisine]);

  React.useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);

    const params = new URLSearchParams({
      lat: String(location.lat),
      lng: String(location.lng),
      radius: String(radius),
      limit: "50",
    });
    if (debouncedCuisine) params.set("cuisine", debouncedCuisine);

    fetch(`/api/restaurants?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.restaurants) setNearby(data.restaurants.map(nearbyToSpot));
      })
      .catch((err) => { if (err.name !== "AbortError") console.error(err); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [open, location.lat, location.lng, radius, debouncedCuisine]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(26,20,16,0.35)",
            zIndex: 80,
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(420px, 92vw)",
          background: CREAM,
          borderLeft: `3px solid ${INK}`,
          boxShadow: open ? `-12px 0 0 ${INK}` : "none",
          zIndex: 85,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s cubic-bezier(.3,.9,.3,1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Panel header */}
        <div style={{
          padding: "20px 22px 16px",
          borderBottom: `2.5px dashed ${INK}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              opacity: 0.6,
            }}>
              {geoStatus === "granted" ? "\u25C9 Your location" : "\u25C9 Kochi office"}
            </div>
            <div style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 26,
              lineHeight: 1,
              marginTop: 4,
            }}>
              Nearby spots
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              appearance: "none",
              width: 36, height: 36,
              border: `2.5px solid ${INK}`,
              background: CREAM,
              borderRadius: 999,
              fontSize: 16,
              cursor: "pointer",
              boxShadow: `3px 3px 0 ${INK}`,
              lineHeight: 1,
            }}
          >
            &#10005;
          </button>
        </div>

        {/* Filters */}
        <div style={{
          padding: "14px 22px",
          borderBottom: `2px solid rgba(26,20,16,0.1)`,
          display: "flex",
          gap: 14,
          alignItems: "flex-end",
          flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", color: INK, opacity: 0.6,
            }}>Radius</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <input
                type="range" min={1} max={15} value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                style={{ flex: 1, accentColor: ACCENT }}
              />
              <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, minWidth: 40 }}>
                {radius} km
              </span>
            </div>
          </div>
          <div style={{ width: 110 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", color: INK, opacity: 0.6,
            }}>Cuisine</span>
            <input
              type="text" value={cuisine} onChange={(e) => setCuisine(e.target.value)}
              placeholder="any"
              style={{
                marginTop: 4, width: "100%", padding: "6px 8px",
                border: `2px solid ${INK}`, background: CREAM,
                fontSize: 11, fontWeight: 600, fontFamily: "inherit", color: INK,
              }}
            />
          </div>
        </div>

        {/* Results */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 0",
        }}>
          {loading && (
            <div style={{
              padding: 24, textAlign: "center",
              fontFamily: FONT_MONO, fontSize: 12,
              letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.5,
            }}>
              Loading...
            </div>
          )}

          {!loading && nearby.length === 0 && (
            <div style={{
              padding: 24, textAlign: "center",
              fontFamily: FONT_DISPLAY, fontSize: 20, opacity: 0.4,
            }}>
              No restaurants found nearby
            </div>
          )}

          {nearby.map((spot) => {
            const alreadyAdded = addedIds.has(spot.id);
            return (
              <div
                key={spot.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 22px",
                  borderBottom: `1.5px solid rgba(26,20,16,0.08)`,
                  opacity: alreadyAdded ? 0.45 : 1,
                }}
              >
                {/* Cuisine glyph */}
                <div style={{
                  width: 38, height: 38, flexShrink: 0,
                  background: "#FFFAEC",
                  border: `2px solid ${INK}`,
                  borderRadius: 999,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ width: 22, height: 22, display: "block" }}>{glyphFor(spot.cuisine)}</span>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 700, fontSize: 14, color: INK,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {spot.name}
                  </div>
                  <div style={{
                    display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap",
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: INK, opacity: 0.55,
                      display: "inline-flex", alignItems: "center", gap: 3,
                    }}>
                      <span style={{ width: 10, height: 10, display: "inline-block" }}>{FOOT}</span>
                      {spot.walk} min
                    </span>
                    {spot.distanceM != null && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: INK, opacity: 0.55 }}>
                        {spot.distanceM >= 1000
                          ? `${(spot.distanceM / 1000).toFixed(1)} km`
                          : `${Math.round(spot.distanceM)} m`}
                      </span>
                    )}
                    {spot.cuisine.slice(0, 2).map((c) => (
                      <Pill key={c} sm>{c}</Pill>
                    ))}
                  </div>
                </div>

                {/* Add button */}
                <button
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() => onAddSpot(spot)}
                  style={{
                    appearance: "none",
                    width: 36, height: 36,
                    border: `2.5px solid ${INK}`,
                    background: alreadyAdded ? "rgba(26,20,16,0.08)" : ACCENT,
                    color: alreadyAdded ? "rgba(26,20,16,0.3)" : CREAM,
                    borderRadius: 999,
                    fontSize: 20,
                    fontWeight: 700,
                    lineHeight: 1,
                    cursor: alreadyAdded ? "default" : "pointer",
                    boxShadow: alreadyAdded ? "none" : `3px 3px 0 ${INK}`,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {alreadyAdded ? "\u2713" : "+"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Panel footer */}
        <div style={{
          padding: "12px 22px",
          borderTop: `2.5px dashed ${INK}`,
          fontFamily: FONT_MONO,
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          opacity: 0.5,
          textAlign: "center",
          flexShrink: 0,
        }}>
          {nearby.length} restaurants &middot; tap + to add to room
        </div>
      </div>
    </>
  );
}

// ── Main Room App ───────────────────────────────────────────────────────
export default function RoomApp({ code }: { code: string }) {
  const router = useRouter();
  const { room, connected, error } = useRoomSSE(code);

  // Identity from sessionStorage
  const [identity, setIdentity] = React.useState<{ memberId: string; name: string } | null>(null);
  const [joinName, setJoinName] = React.useState("");
  const [joiningRoom, setJoiningRoom] = React.useState(false);

  React.useEffect(() => {
    const stored = sessionStorage.getItem(`room-${code}`);
    if (stored) {
      try {
        setIdentity(JSON.parse(stored));
      } catch { /* ignore */ }
    }
  }, [code]);

  // Auto-rejoin on reconnect if we have stored identity
  React.useEffect(() => {
    if (identity && connected && room) {
      const isMember = room.members.some((m) => m.id === identity.memberId);
      if (!isMember) {
        fetch(`/api/rooms/${code}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: identity.name, memberId: identity.memberId }),
        });
      }
    }
  }, [identity, connected, room, code]);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [nearbyOpen, setNearbyOpen] = React.useState(false);
  const [isSpinning, setIsSpinning] = React.useState(false);
  const [spinKey, setSpinKey] = React.useState(0);

  // Track spin state from SSE
  React.useEffect(() => {
    if (room?.spin?.active) {
      setIsSpinning(true);
      setSpinKey((k) => k + 1);
    }
  }, [room?.spin?.active, room?.spin?.seed]);

  // Voted set based on room votes and my memberId
  const myVotes = React.useMemo(() => {
    if (!room || !identity) return new Set<string>();
    const s = new Set<string>();
    for (const [spotId, voters] of Object.entries(room.votes)) {
      if (voters.includes(identity.memberId)) s.add(spotId);
    }
    return s;
  }, [room, identity]);

  const onVote = async (spotId: string) => {
    if (!identity) return;
    await fetch(`/api/rooms/${code}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spotId, memberId: identity.memberId }),
    });
  };

  const onAdd = async (spot: Spot) => {
    await fetch(`/api/rooms/${code}/spots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spot }),
    });
  };

  const onSpin = async () => {
    if (!identity) return;
    await fetch(`/api/rooms/${code}/spin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: identity.memberId }),
    });
  };

  const handleJoin = async () => {
    if (!joinName.trim()) return;
    setJoiningRoom(true);
    try {
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: joinName.trim() }),
      });
      const data = await res.json();
      if (data.memberId) {
        const id = { memberId: data.memberId, name: joinName.trim() };
        sessionStorage.setItem(`room-${code}`, JSON.stringify(id));
        setIdentity(id);
      }
    } catch { /* ignore */ }
    setJoiningRoom(false);
  };

  // Show join prompt if no identity
  if (!identity) {
    return (
      <div style={{
        minHeight: "100vh",
        color: INK,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 24,
      }}>
        <div style={{
          background: "#D6CCFF",
          border: `3px solid ${INK}`,
          boxShadow: `8px 8px 0 ${INK}`,
          padding: 32,
          maxWidth: 380,
          width: "100%",
          transform: "rotate(-1deg)",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}>
          <div style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: 0.65,
          }}>
            Room {code}
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, lineHeight: 1 }}>
            Join the table
          </div>
          <input
            type="text"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            placeholder="Your name"
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            style={{
              appearance: "none",
              width: "100%",
              border: `2.5px solid ${INK}`,
              background: CREAM,
              padding: "12px 16px",
              fontSize: 16,
              fontFamily: "inherit",
              color: INK,
              fontWeight: 600,
              boxSizing: "border-box",
            }}
          />
          <ChunkyBtn
            onClick={handleJoin}
            size="lg"
            color={joinName.trim() ? ACCENT : "rgba(26,20,16,0.15)"}
            fg={joinName.trim() ? CREAM : "rgba(26,20,16,0.4)"}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {joiningRoom ? "Joining..." : "Join room"}
          </ChunkyBtn>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{
        minHeight: "100vh",
        color: INK,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT_MONO,
        fontSize: 14,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        opacity: 0.6,
      }}>
        {error || "Connecting to room..."}
      </div>
    );
  }

  const spots = room.spots;
  const sorted = pickByVote(spots);

  return (
    <div style={{ minHeight: "100vh", color: INK }}>
      <RoomBar code={code} members={room.members} myId={identity.memberId} />

      {/* Header */}
      <header style={{
        padding: "32px 32px 20px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 20,
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontFamily: FONT_DISPLAY,
            fontSize: "clamp(40px, 7vw, 72px)",
            lineHeight: 0.92,
            letterSpacing: "-0.025em",
          }}>
            Lunch <span style={{ color: ACCENT }}>room</span>
          </h1>
          {!connected && (
            <div style={{
              marginTop: 8,
              fontFamily: FONT_MONO,
              fontSize: 11,
              color: ACCENT,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}>
              reconnecting...
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <ChunkyBtn onClick={() => setModalOpen(true)} size="lg" color={ACCENT} fg={CREAM}>
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
            Add a spot
          </ChunkyBtn>
          <ChunkyBtn
            onClick={() => setNearbyOpen(true)}
            size="lg"
            color="#B7E4FF"
            fg={INK}
          >
            <span style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 20,
              lineHeight: 1,
              marginRight: 4,
            }}>&#9673;</span>
            Nearby
          </ChunkyBtn>
          <ChunkyBtn
            onClick={onSpin}
            size="lg"
            color="#FFCDE0"
            fg={INK}
            style={{ cursor: spots.length >= 2 ? "pointer" : "not-allowed" }}
          >
            <span style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 22,
              lineHeight: 1,
              marginRight: 4,
            }}>&#8635;</span>
            Spin!
          </ChunkyBtn>
        </div>
      </header>

      {/* Info bar */}
      <div style={{
        padding: "0 32px 20px",
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
      }}>
        <div style={{
          background: "#FFE89B",
          border: `2.5px solid ${INK}`,
          boxShadow: `4px 4px 0 ${INK}`,
          padding: "10px 18px 8px",
          transform: "rotate(-1deg)",
          textAlign: "center",
        }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, lineHeight: 0.9, color: INK }}>
            {spots.length}
          </div>
          <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: INK, opacity: 0.7, marginTop: 4, fontWeight: 700 }}>
            spots
          </div>
        </div>
        <div style={{
          background: "#D6CCFF",
          border: `2.5px solid ${INK}`,
          boxShadow: `4px 4px 0 ${INK}`,
          padding: "10px 18px 8px",
          transform: "rotate(1deg)",
          textAlign: "center",
        }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, lineHeight: 0.9, color: INK }}>
            {myVotes.size}
          </div>
          <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: INK, opacity: 0.7, marginTop: 4, fontWeight: 700 }}>
            your votes
          </div>
        </div>
      </div>

      <SectionHead count={spots.length} />

      {/* Empty state */}
      {spots.length === 0 && (
        <div style={{
          padding: "40px 32px",
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 28,
            color: INK,
            opacity: 0.4,
            transform: "rotate(-2deg)",
          }}>
            No spots yet &mdash; add the first one!
          </div>
        </div>
      )}

      {/* Cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 28,
          padding: "0 40px 40px",
          alignItems: "start",
        }}
      >
        {sorted.map((s, i) => (
          <SpotCard
            key={s.id}
            spot={s}
            rank={i + 1}
            primary={i < 5}
            onVote={onVote}
            voted={myVotes.has(s.id)}
            idx={i}
            layout="grid"
          />
        ))}
      </div>

      {/* Footer */}
      <footer style={{
        padding: "40px 32px 56px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
      }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: INK, opacity: 0.4, transform: "rotate(-2deg)" }}>
          ~ end of the bucket ~
        </div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: INK, opacity: 0.5 }}>
          eat well &middot; be back by 2
        </div>
      </footer>

      <AddModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={onAdd}
        memberName={identity.name}
      />

      <NearbySidePanel
        open={nearbyOpen}
        onClose={() => setNearbyOpen(false)}
        onAddSpot={onAdd}
        addedIds={new Set(spots.map((s) => s.id))}
      />

      {isSpinning && room.spin?.result && (
        <SpinOverlay
          key={spinKey}
          spots={spots}
          finalists={room.spin.result.slice(0, 5)}
          onDone={() => setIsSpinning(false)}
          onSpinAgain={onSpin}
        />
      )}
    </div>
  );
}
