import { NearbyRestaurant, Spot } from "./types";

const TYPE_LABEL: Record<string, string> = {
  restaurant: "Restaurant",
  cafe: "Cafe",
  fast_food: "Fast food",
  food_court: "Food court",
  bakery: "Bakery",
  ice_cream: "Ice cream",
  bar: "Bar",
  pub: "Pub",
};

export function typeLabel(t: string): string {
  return TYPE_LABEL[t] ?? t.replace(/_/g, " ");
}

/** "today" / "yesterday" / "5 days ago" for a YYYY-MM-DD date. */
function ago(dateStr: string, days: number): string {
  if (days <= 0) return "went today";
  if (days === 1) return "went yesterday";
  if (days < 14) return `went ${days} days ago`;
  if (days < 60) return `went ${Math.round(days / 7)} weeks ago`;
  return `went ${new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

function daysSince(dateStr: string): number {
  const then = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((now.getTime() - then.getTime()) / 86_400_000);
}

const pretty = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** Map a /api/restaurants row to the card model used across the app. */
export function restaurantToSpot(r: NearbyRestaurant): Spot {
  const walkMin = Math.max(1, Math.round(r.distance_m / 80)); // ~80m per minute walk
  const lastVisited = r.last_visited || "";
  const cooldown = lastVisited ? daysSince(lastVisited) : 999;

  return {
    id: `osm-${r.osm_id}`,
    name: r.name,
    cuisine: r.cuisine.length > 0 ? r.cuisine.map(pretty) : [typeLabel(r.amenity_type)],
    area: r.addr_street || `${(r.distance_m / 1000).toFixed(1)} km away`,
    walk: walkMin,
    price: 0, // OSM has no price data
    votes: r.votes ?? 0,
    lastVisited: lastVisited ? ago(lastVisited, cooldown) : "never",
    cooldown,
    by: "OSM",
    byName: "OpenStreetMap",
    notes:
      r.last_note ||
      [
        r.outdoor_seating && "Outdoor seating",
        r.air_conditioning && "AC",
        r.delivery && "Delivers",
        r.takeaway && "Takeaway",
      ]
        .filter(Boolean)
        .join(" · ") ||
      "Nobody from the team has been yet.",
    tags: [
      r.amenity_type,
      ...(r.outdoor_seating ? ["outdoor"] : []),
      ...(r.delivery ? ["delivery"] : []),
    ],
    veg: r.is_veg_only === 1,
    distanceM: r.distance_m,
    fromDb: true,
    lat: r.lat,
    lng: r.lng,
    amenityType: r.amenity_type,
    phone: r.phone || undefined,
    website: r.website || undefined,
    openingHours: r.opening_hours || undefined,
    openStatus: r.open_status,
    openLabel: r.open_label,
    myVote: r.my_vote === 1,
    visitCount: r.visit_count ?? 0,
    rating: r.avg_rating ?? 0,
    ratingCount: r.rating_count ?? 0,
    lastVisitedOn: lastVisited || undefined,
    flags: {
      veg: r.diet_vegetarian === 1,
      delivery: r.delivery === 1,
      takeaway: r.takeaway === 1,
      outdoor: r.outdoor_seating === 1,
      ac: r.air_conditioning === 1,
    },
  };
}

export function directionsUrl(s: Spot): string | null {
  if (s.lat == null || s.lng == null) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=walking`;
}

export function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}
