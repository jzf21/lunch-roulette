"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { INK, ACCENT, CREAM, FONT_DISPLAY, FONT_MONO, FONT_BODY } from "@/lib/constants";
import { ChunkyBtn, Field, stickyInput } from "./ui";

export default function RoomLobby() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [joinCode, setJoinCode] = React.useState("");
  const [joinName, setJoinName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [joining, setJoining] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: name.trim() }),
      });
      const data = await res.json();
      if (data.code) {
        sessionStorage.setItem(`room-${data.code}`, JSON.stringify({
          memberId: data.memberId,
          name: name.trim(),
        }));
        router.push(`/room/${data.code}`);
      } else {
        setError(data.error || "Failed to create room");
      }
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || !joinName.trim()) return;
    setJoining(true);
    setError("");
    try {
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: joinName.trim() }),
      });
      const data = await res.json();
      if (data.memberId) {
        sessionStorage.setItem(`room-${code}`, JSON.stringify({
          memberId: data.memberId,
          name: joinName.trim(),
        }));
        router.push(`/room/${code}`);
      } else {
        setError(data.error || "Room not found");
      }
    } catch {
      setError("Network error");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      color: INK,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 40,
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", maxWidth: 500 }}>
        <div style={{
          fontFamily: FONT_MONO,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          opacity: 0.6,
          marginBottom: 10,
        }}>
          &#9733; lunch together
        </div>
        <h1 style={{
          fontFamily: FONT_DISPLAY,
          fontSize: "clamp(48px, 8vw, 80px)",
          lineHeight: 0.92,
          letterSpacing: "-0.025em",
          margin: 0,
        }}>
          Start a <span style={{ color: ACCENT }}>room</span>
        </h1>
        <p style={{
          fontSize: 15,
          opacity: 0.72,
          fontWeight: 500,
          marginTop: 16,
          maxWidth: "38ch",
          marginInline: "auto",
        }}>
          Create a room, share the code with your crew, add restaurants to a shared bucket, and spin the wheel together.
        </p>
      </div>

      {/* Cards */}
      <div style={{
        display: "flex",
        gap: 28,
        flexWrap: "wrap",
        justifyContent: "center",
        width: "100%",
        maxWidth: 740,
      }}>
        {/* Create card */}
        <div style={{
          background: "#FFE89B",
          border: `3px solid ${INK}`,
          boxShadow: `8px 8px 0 ${INK}`,
          padding: 28,
          flex: 1,
          minWidth: 280,
          maxWidth: 340,
          transform: "rotate(-1.5deg)",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}>
          <div style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 28,
            lineHeight: 1,
          }}>
            New room
          </div>
          <Field label="Your name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alice"
              style={stickyInput}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </Field>
          <ChunkyBtn
            onClick={handleCreate}
            size="lg"
            color={name.trim() ? ACCENT : "rgba(26,20,16,0.15)"}
            fg={name.trim() ? CREAM : "rgba(26,20,16,0.4)"}
            style={{ cursor: name.trim() ? "pointer" : "not-allowed", width: "100%", justifyContent: "center" }}
          >
            {creating ? "Creating..." : "Create room"}
          </ChunkyBtn>
        </div>

        {/* Join card */}
        <div style={{
          background: "#D6CCFF",
          border: `3px solid ${INK}`,
          boxShadow: `8px 8px 0 ${INK}`,
          padding: 28,
          flex: 1,
          minWidth: 280,
          maxWidth: 340,
          transform: "rotate(1.2deg)",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}>
          <div style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 28,
            lineHeight: 1,
          }}>
            Join a room
          </div>
          <Field label="Room code" required>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
              placeholder="e.g. X7K2"
              maxLength={4}
              style={{
                ...stickyInput,
                fontFamily: FONT_MONO,
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: "0.2em",
                textAlign: "center",
                textTransform: "uppercase",
              }}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
          </Field>
          <Field label="Your name" required>
            <input
              type="text"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="e.g. Bob"
              style={stickyInput}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
          </Field>
          <ChunkyBtn
            onClick={handleJoin}
            size="lg"
            color={joinCode.length === 4 && joinName.trim() ? ACCENT : "rgba(26,20,16,0.15)"}
            fg={joinCode.length === 4 && joinName.trim() ? CREAM : "rgba(26,20,16,0.4)"}
            style={{
              cursor: joinCode.length === 4 && joinName.trim() ? "pointer" : "not-allowed",
              width: "100%",
              justifyContent: "center",
            }}
          >
            {joining ? "Joining..." : "Join room"}
          </ChunkyBtn>
        </div>
      </div>

      {error && (
        <div style={{
          background: "#FFCDE0",
          border: `2.5px solid ${INK}`,
          boxShadow: `4px 4px 0 ${INK}`,
          padding: "10px 20px",
          fontWeight: 700,
          fontSize: 14,
          transform: "rotate(-0.5deg)",
        }}>
          {error}
        </div>
      )}

      {/* Back link */}
      <a
        href="/"
        style={{
          fontFamily: FONT_MONO,
          fontSize: 12,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: INK,
          opacity: 0.5,
          textDecoration: "none",
        }}
      >
        &larr; solo mode
      </a>
    </div>
  );
}
