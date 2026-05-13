export const INK = "#1A1410";
export const ACCENT = "#FF4D2E";
export const CREAM = "#FFF1C6";
export const SURFACE = "#FFFAEC";

export const CARD_BG = [
  "#FFFAEC", // cream
  "#FFD6CC", // peach
  "#C8E7C0", // mint
  "#FFE89B", // yolk
  "#D6CCFF", // lavender
  "#B7E4FF", // sky
  "#FFCDE0", // pink
  "#FFC994", // apricot
];

export function tiltFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const range = 3.5;
  return ((h % 1000) / 1000 - 0.5) * 2 * range;
}

export function bgFor(id: string, idx: number): string {
  let h = idx;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) >>> 0;
  return CARD_BG[h % CARD_BG.length];
}

export const ALL_CUISINES = [
  "South Indian", "North Indian", "Kerala", "Cafe",
  "Continental", "Bakery", "Seafood", "Breakfast", "Multi",
];

export const TEAM = [
  { initials: "AR", name: "Aravind" },
  { initials: "SP", name: "Sneha" },
  { initials: "NK", name: "Nikhil" },
  { initials: "MV", name: "Meera" },
  { initials: "RJ", name: "Rohit" },
  { initials: "DK", name: "Divya" },
];

export const FONT_DISPLAY = "var(--font-caprasimo), var(--font-dm-serif), serif";
export const FONT_MONO = "var(--font-jetbrains-mono), ui-monospace, monospace";
export const FONT_BODY = "var(--font-space-grotesk), ui-sans-serif, system-ui, sans-serif";
