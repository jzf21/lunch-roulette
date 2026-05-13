"use client";

import React from "react";

export const GLYPH: Record<string, React.ReactNode> = {
  cafe: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 22h28v18a10 10 0 0 1-10 10h-8a10 10 0 0 1-10-10V22z" />
      <path d="M42 26h6a5 5 0 0 1 5 5v3a5 5 0 0 1-5 5h-6" />
      <path d="M22 10c-2 2-2 4 0 6s2 4 0 6" />
      <path d="M32 10c-2 2-2 4 0 6s2 4 0 6" />
    </svg>
  ),
  southIndian: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 46 L32 14 L56 46 Z" />
      <circle cx="20" cy="38" r="2" fill="currentColor" stroke="none" />
      <circle cx="32" cy="34" r="2" fill="currentColor" stroke="none" />
      <circle cx="44" cy="38" r="2" fill="currentColor" stroke="none" />
      <circle cx="32" cy="42" r="2" fill="currentColor" stroke="none" />
      <ellipse cx="50" cy="48" rx="4" ry="2.5" />
    </svg>
  ),
  northIndian: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 38c0-12 8-20 20-20s20 8 20 18c0 6-4 10-10 10-3 0-5-1-7-2-2 2-5 4-9 4-9 0-14-4-14-10z" />
      <circle cx="24" cy="32" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="32" cy="28" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="40" cy="32" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="36" cy="36" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  kerala: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="38" r="14" />
      <path d="M32 24c-2-6-8-12-14-12" />
      <path d="M32 24c2-6 8-12 14-12" />
      <path d="M32 24c-6-3-14-2-18 2" />
      <path d="M32 24c6-3 14-2 18 2" />
      <path d="M32 24v-12" />
      <circle cx="28" cy="36" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="36" cy="40" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  continental: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 8v18c0 3 2 6 4 7v23" />
      <path d="M16 8v14" />
      <path d="M24 8v14" />
      <path d="M44 8c4 0 6 6 6 12s-2 10-4 11v25" />
    </svg>
  ),
  bakery: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 42c0-14 12-26 26-26 8 0 14 4 16 8-4-1-9 0-13 4-4 4-5 9-4 13 1 4 5 8 9 9-4 4-10 4-16 4-12 0-18-4-18-12z" />
      <path d="M18 38c2-6 6-10 12-12" />
      <path d="M26 44c2-6 6-10 12-12" />
    </svg>
  ),
  seafood: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 32c4-8 14-14 24-14 8 0 16 4 20 10-4 6-12 10-20 10-10 0-20-6-24-6z" />
      <path d="M52 28l8-6v20l-8-6" />
      <circle cx="42" cy="26" r="2" fill="currentColor" stroke="none" />
      <path d="M28 24c2 2 2 6 0 8" />
      <path d="M22 26c2 2 2 4 0 6" />
    </svg>
  ),
  breakfast: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 30c-2-8 2-16 10-18s14 4 14 12c0 3 2 4 5 4 6 0 10 4 10 10s-6 12-14 12c-6 0-10-2-14-4-4 2-8 2-12-2s-4-10 1-14z" />
      <circle cx="30" cy="32" r="8" fill="currentColor" stroke="none" />
    </svg>
  ),
  multi: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 30h48v4c0 10-10 18-24 18S8 44 8 34v-4z" />
      <circle cx="22" cy="22" r="4" fill="currentColor" stroke="none" />
      <circle cx="32" cy="18" r="3" fill="currentColor" stroke="none" />
      <circle cx="42" cy="22" r="4" />
      <circle cx="14" cy="44" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="50" cy="44" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  plate: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="32" r="22" />
      <circle cx="32" cy="32" r="14" />
      <path d="M26 28c2-2 8-2 12 0" />
    </svg>
  ),
};

const CUISINE_MAP: Record<string, string> = {
  cafe: "cafe",
  southindian: "southIndian",
  northindian: "northIndian",
  kerala: "kerala",
  continental: "continental",
  bakery: "bakery",
  seafood: "seafood",
  breakfast: "breakfast",
  multi: "multi",
};

export function glyphFor(cuisines: string[]): React.ReactNode {
  const first = (cuisines && cuisines[0]) || "";
  const key = first.toLowerCase().replace(/[^a-z]/g, "");
  return GLYPH[CUISINE_MAP[key] || "plate"];
}

export const FOOT = (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <ellipse cx="6" cy="10" rx="3.5" ry="4.5" />
    <circle cx="11" cy="4" r="1.5" />
    <circle cx="13" cy="6.5" r="1.2" />
    <circle cx="12" cy="9" r="1.1" />
  </svg>
);

export const SPARKLE = (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0l1.5 6.5L16 8l-6.5 1.5L8 16l-1.5-6.5L0 8l6.5-1.5z" />
  </svg>
);

export const STAR = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l2.9 7H22l-6 4.4 2.3 7L12 16l-6.3 4.4 2.3-7L2 9h7.1z" />
  </svg>
);
