import { Spot, Filters } from "./types";

export function pickByVote(spots: Spot[]): Spot[] {
  return [...spots].sort((a, b) => b.votes - a.votes);
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickBySpin(spots: Spot[], seed: number): Spot[] {
  const rng = mulberry32(seed);
  const scored = spots.map((s) => {
    const cooldownBoost = Math.min(2, s.cooldown / 14);
    return { spot: s, score: rng() * (1 + cooldownBoost) };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((x) => x.spot);
}

export function pickByFilter(spots: Spot[], { cuisine, maxWalk, maxPrice }: Filters): Spot[] {
  return spots
    .filter((s) => {
      if (cuisine && cuisine !== "all" && !s.cuisine.includes(cuisine)) return false;
      if (s.walk > maxWalk) return false;
      if (s.price > maxPrice) return false;
      return true;
    })
    .sort((a, b) => b.votes - a.votes);
}
