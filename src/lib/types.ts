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
}
