"use client";

import React from "react";
import { INK, ACCENT, CREAM, FONT_DISPLAY, FONT_MONO } from "@/lib/constants";
import { RoomMember } from "@/lib/types";
import { Initials, ChunkyBtn } from "./ui";

export function RoomBar({
  code,
  members,
  myId,
}: {
  code: string;
  members: RoomMember[];
  myId: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const copyLink = () => {
    const url = `${window.location.origin}/room/${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "14px 32px",
      flexWrap: "wrap",
      borderBottom: `2.5px dashed ${INK}`,
    }}>
      {/* Room code badge */}
      <div style={{
        background: "#FFE89B",
        border: `2.5px solid ${INK}`,
        boxShadow: `4px 4px 0 ${INK}`,
        padding: "6px 16px",
        fontFamily: FONT_MONO,
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: "0.18em",
        transform: "rotate(-1.5deg)",
      }}>
        {code}
      </div>

      {/* Copy link */}
      <ChunkyBtn
        onClick={copyLink}
        size="sm"
        color={copied ? "#C8E7C0" : CREAM}
        fg={INK}
      >
        {copied ? "Copied!" : "Copy link"}
      </ChunkyBtn>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Members */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}>
        <span style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          opacity: 0.6,
          marginRight: 4,
        }}>
          {members.length} in room
        </span>
        {members.map((m) => (
          <div
            key={m.id}
            title={m.name}
            style={{ position: "relative" }}
          >
            <Initials size={30} accent={m.id === myId}>
              {m.name.slice(0, 2).toUpperCase()}
            </Initials>
          </div>
        ))}
      </div>

      {/* Back to solo */}
      <a
        href="/"
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: INK,
          opacity: 0.5,
          textDecoration: "none",
        }}
      >
        leave
      </a>
    </div>
  );
}
