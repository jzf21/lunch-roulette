export interface Spot {
  id: string;
  name: string;
  cuisine: string[];
  area: string;
  walk: number;
  price: number;
  votes: number;
  lastVisited: string;
  cooldown: number;
  by: string;
  byName: string;
  notes: string;
  tags: string[];
  veg?: boolean;
  /** Distance in meters from reference point — set for ClickHouse results */
  distanceM?: number;
  /** Whether this spot came from the live DB */
  fromDb?: boolean;
  /** Latitude for map display */
  lat?: number;
  /** Longitude for map display */
  lng?: number;
  /** restaurant / cafe / fast_food / bakery ... */
  amenityType?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  /** Open state at the time the list was requested for */
  openStatus?: "open" | "closed" | "unknown";
  /** e.g. "until 15:30" / "opens Mon 11:00" */
  openLabel?: string;
  /** Whether the current viewer voted for this spot today */
  myVote?: boolean;
  visitCount?: number;
  /** Team average rating (1-5); 0 when nobody rated it yet */
  rating?: number;
  ratingCount?: number;
  /** YYYY-MM-DD of the most recent team visit */
  lastVisitedOn?: string;
  flags?: { veg: boolean; delivery: boolean; takeaway: boolean; outdoor: boolean; ac: boolean };
}

export interface RoomMember {
  id: string;
  name: string;
  joinedAt: number;
}

export interface RoomSpin {
  active: boolean;
  seed: number;
  triggeredBy: string;
  result: Spot[] | null;
}

export interface RoomState {
  code: string;
  createdAt: number;
  hostId: string;
  members: RoomMember[];
  spots: Spot[];
  /** spotId -> array of memberIds who voted */
  votes: Record<string, string[]>;
  spin: RoomSpin | null;
}

export interface Filters {
  cuisine: string;
  maxWalk: number;
  maxPrice: number;
}

export interface NearbyRestaurant {
  osm_id: number;
  name: string;
  amenity_type: string;
  cuisine: string[];
  lat: number;
  lng: number;
  addr_street: string;
  phone: string;
  website: string;
  opening_hours: string;
  outdoor_seating: number;
  delivery: number;
  takeaway: number;
  diet_vegetarian: number;
  is_veg_only: number;
  distance_m: number;
  air_conditioning?: number;
  // Computed by /api/restaurants
  open_status?: "open" | "closed" | "unknown";
  open_label?: string;
  votes?: number;
  my_vote?: number;
  visit_count?: number;
  avg_rating?: number;
  rating_count?: number;
  /** YYYY-MM-DD, or "" when never visited */
  last_visited?: string;
  last_note?: string;
}

export type SortKey = "distance" | "votes" | "rating" | "due" | "name";
export type OpenFilter = "any" | "now" | "lunch";

export interface ExploreFilters {
  q: string;
  types: string[];
  veg: boolean;
  delivery: boolean;
  takeaway: boolean;
  outdoor: boolean;
  ac: boolean;
  open: OpenFilter;
  sort: SortKey;
}
