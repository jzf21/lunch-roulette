"use client";

import React from "react";
import { INK, ACCENT, CREAM, SURFACE, FONT_DISPLAY, tiltFor, bgFor } from "@/lib/constants";
import { Spot } from "@/lib/types";
import { glyphFor, FOOT, SPARKLE } from "./Glyphs";
import { Pill, Initials, CooldownPill, VoteButton } from "./ui";

export function SpotCard({
  spot,
  rank,
  primary,
  onVote,
  voted,
  idx,
  layout,
}: {
  spot: Spot;
  rank: number;
  primary: boolean;
  onVote: (id: string) => void;
  voted: boolean;
  idx: number;
  layout: string;
}) {
  const tilt = layout === "list" ? 0 : tiltFor(spot.id);
  const bg = bgFor(spot.id, idx);

  return (
    <article
      style={{
        position: "relative",
        background: bg,
        border: `2.5px solid ${INK}`,
        boxShadow: primary ? `8px 8px 0 ${INK}` : `5px 5px 0 ${INK}`,
        padding: "20px 22px 18px",
        transform: `rotate(${tilt}deg)`,
        transition: "transform 0.18s cubic-bezier(.3,1.4,.5,1), box-shadow 0.18s",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        minHeight: 290,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = `rotate(${tilt}deg) translate(-2px, -2px)`;
        e.currentTarget.style.boxShadow = `${primary ? 11 : 8}px ${primary ? 11 : 8}px 0 ${INK}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = `rotate(${tilt}deg)`;
        e.currentTarget.style.boxShadow = `${primary ? 8 : 5}px ${primary ? 8 : 5}px 0 ${INK}`;
      }}
    >
      {/* Rank sticker */}
      <div
        style={{
          position: "absolute",
          top: -16,
          left: -14,
          width: 52,
          height: 52,
          background: primary ? ACCENT : INK,
          color: primary ? INK : CREAM,
          border: `2.5px solid ${INK}`,
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_DISPLAY,
          fontSize: 24,
          fontWeight: 400,
          transform: `rotate(${-tilt * 1.5 - 6}deg)`,
          boxShadow: `3px 3px 0 ${INK}`,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {String(rank).padStart(2, "0")}
      </div>

      {/* "Today's pick" ribbon for top-5 */}
      {primary && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: -10,
            background: INK,
            color: CREAM,
            padding: "4px 12px",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            transform: "rotate(4deg)",
            boxShadow: `2px 2px 0 rgba(0,0,0,0.2)`,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span style={{ width: 10, height: 10, display: "inline-block", color: ACCENT }}>{SPARKLE}</span>
          Pick
        </div>
      )}

      {/* Header: glyph + name */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", paddingTop: 18 }}>
        <div
          style={{
            width: 64,
            height: 64,
            flexShrink: 0,
            background: SURFACE,
            border: `2.5px solid ${INK}`,
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: INK,
            boxShadow: `2px 2px 0 ${INK}`,
            transform: `rotate(${-tilt * 0.8}deg)`,
          }}
        >
          <span style={{ width: 38, height: 38, display: "block" }}>{glyphFor(spot.cuisine)}</span>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3
            style={{
              margin: 0,
              fontFamily: FONT_DISPLAY,
              fontWeight: 400,
              fontSize: 28,
              lineHeight: 1.0,
              letterSpacing: "-0.005em",
              color: INK,
              wordBreak: "break-word",
            }}
          >
            {spot.name}
          </h3>
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              fontWeight: 600,
              color: INK,
              opacity: 0.7,
              letterSpacing: "0.02em",
            }}
          >
            {spot.area}
          </div>
        </div>
      </div>

      {/* Cuisine tags */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {spot.cuisine.map((c) => <Pill key={c} sm>{c}</Pill>)}
      </div>

      {/* Notes */}
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.5,
          color: INK,
          opacity: 0.82,
          flex: 1,
        }}
      >
        &ldquo;{spot.notes}&rdquo;
      </p>

      {/* Stats row: walk + price + last-visit */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          paddingTop: 10,
          borderTop: `2px dashed ${INK}`,
          marginTop: 2,
        }}
      >
        <Pill sm color={SURFACE}>
          <span style={{ width: 11, height: 11, display: "inline-block", color: INK }}>{FOOT}</span>
          {spot.walk} min
          {spot.distanceM != null && (
            <span style={{ opacity: 0.6, marginLeft: 2 }}>
              ({spot.distanceM >= 1000
                ? `${(spot.distanceM / 1000).toFixed(1)} km`
                : `${Math.round(spot.distanceM)} m`})
            </span>
          )}
        </Pill>
        <Pill sm color={SURFACE}>
          {"\u20B9".repeat(spot.price)}
          <span style={{ opacity: 0.25 }}>{"\u20B9".repeat(3 - spot.price)}</span>
        </Pill>
        <CooldownPill days={spot.cooldown} lastVisited={spot.lastVisited} />
      </div>

      {/* Footer: voter avatar + vote button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Initials size={28}>{spot.by}</Initials>
          <span style={{ fontSize: 11, color: INK, opacity: 0.65, fontWeight: 500 }}>
            by {spot.byName}
          </span>
        </div>
        <VoteButton voted={voted} count={spot.votes} onClick={() => onVote(spot.id)} />
      </div>
    </article>
  );
}
