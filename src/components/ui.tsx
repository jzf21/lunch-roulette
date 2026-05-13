"use client";

import React from "react";
import { INK, ACCENT, CREAM, SURFACE, FONT_DISPLAY, FONT_MONO } from "@/lib/constants";
import { STAR } from "./Glyphs";

export function Initials({ children, size = 28, accent }: { children: React.ReactNode; size?: number; accent?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: 999,
        border: `2px solid ${INK}`,
        background: accent ? ACCENT : SURFACE,
        color: accent ? CREAM : INK,
        fontFamily: FONT_MONO,
        fontSize: Math.round(size * 0.36),
        fontWeight: 700,
        letterSpacing: "0.02em",
        boxShadow: `2px 2px 0 ${INK}`,
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

export function Pill({ children, color = SURFACE, ink = INK, sm }: { children: React.ReactNode; color?: string; ink?: string; sm?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: sm ? "2px 8px" : "4px 10px",
        border: `2px solid ${ink}`,
        borderRadius: 999,
        background: color,
        color: ink,
        fontSize: sm ? 10.5 : 12,
        fontWeight: 600,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function ChunkyBtn({
  children,
  onClick,
  color = ACCENT,
  fg = CREAM,
  size = "md",
  style,
  ...rest
}: {
  children: React.ReactNode;
  onClick?: () => void;
  color?: string;
  fg?: string;
  size?: "sm" | "md" | "lg";
  style?: React.CSSProperties;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'>) {
  const pad = size === "lg" ? "16px 28px" : size === "sm" ? "8px 14px" : "12px 20px";
  const fz = size === "lg" ? 18 : size === "sm" ? 12 : 14;
  const sh = size === "lg" ? 6 : size === "sm" ? 3 : 4;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: "none",
        border: `2.5px solid ${INK}`,
        background: color,
        color: fg,
        padding: pad,
        fontSize: fz,
        fontWeight: 700,
        letterSpacing: "0.01em",
        boxShadow: `${sh}px ${sh}px 0 ${INK}`,
        transition: "transform 0.1s, box-shadow 0.1s",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        ...style,
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = `translate(${sh - 1}px, ${sh - 1}px)`;
        e.currentTarget.style.boxShadow = `1px 1px 0 ${INK}`;
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = `${sh}px ${sh}px 0 ${INK}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = `${sh}px ${sh}px 0 ${INK}`;
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function CooldownPill({ days, lastVisited }: { days: number; lastVisited: string }) {
  const fresh = days >= 21;
  const stale = days < 7;
  const color = stale ? "#FFCDE0" : fresh ? "#C8E7C0" : SURFACE;
  const label = days >= 999 ? "never been" : lastVisited;
  return (
    <Pill sm color={color}>
      <span style={{ fontWeight: 600 }}>{label}</span>
    </Pill>
  );
}

export function VoteButton({ voted, count, onClick }: { voted: boolean; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={voted}
      style={{
        appearance: "none",
        border: `2.5px solid ${INK}`,
        background: voted ? ACCENT : SURFACE,
        color: INK,
        padding: "6px 12px 6px 8px",
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        boxShadow: voted ? `4px 4px 0 ${INK}` : `3px 3px 0 ${INK}`,
        transition: "transform 0.12s, box-shadow 0.12s",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "translate(2px, 2px)";
        e.currentTarget.style.boxShadow = `1px 1px 0 ${INK}`;
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = voted ? `4px 4px 0 ${INK}` : `3px 3px 0 ${INK}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = voted ? `4px 4px 0 ${INK}` : `3px 3px 0 ${INK}`;
      }}
    >
      <span style={{
        width: 18, height: 18, display: "inline-block",
        color: voted ? CREAM : ACCENT,
        transition: "transform 0.2s",
        transform: voted ? "rotate(72deg) scale(1.05)" : "rotate(0)",
      }}>{STAR}</span>
      <span style={{
        fontFamily: FONT_DISPLAY,
        fontSize: 20,
        lineHeight: 1,
        fontWeight: 400,
      }}>
        {count}
      </span>
    </button>
  );
}

export function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.04em",
        color: INK,
      }}>
        <span>
          {label}
          {required && <span style={{ color: ACCENT, marginLeft: 4 }}>*</span>}
        </span>
        {hint && (
          <span style={{ fontWeight: 500, fontSize: 11, opacity: 0.55 }}>
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

export const stickyInput: React.CSSProperties = {
  appearance: "none",
  width: "100%",
  border: `2.5px solid ${INK}`,
  background: CREAM,
  padding: "10px 14px",
  fontSize: 14,
  fontFamily: "inherit",
  color: INK,
  outline: "none",
  borderRadius: 0,
  boxSizing: "border-box",
  fontWeight: 500,
};
