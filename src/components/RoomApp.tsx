"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { INK, ACCENT, CREAM, FONT_DISPLAY, FONT_MONO, FONT_BODY } from "@/lib/constants";
import { Spot, RoomState, RoomMember } from "@/lib/types";
import { pickByVote, pickBySpin, pickByFilter } from "@/lib/pickers";
import { ChunkyBtn } from "./ui";
import { SpotCard } from "./SpotCard";
import { AddModal } from "./AddModal";
import { SpinOverlay } from "./SpinOverlay";
import { RoomBar } from "./RoomBar";

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
