/**
 * Import Google-scraped restaurants JSON into ClickHouse.
 *
 * 1. Geocodes each restaurant address via Nominatim (free, 1 req/sec rate limit)
 *    Uses multiple fallback strategies for Indian addresses
 * 2. Inserts into the existing `restaurants` table (appends, does NOT truncate)
 *
 * Usage:
 *   npx tsx scripts/import-google-restaurants.ts [path-to-json]
 *
 * Defaults to ~/Downloads/restaurants_near_me (1).json if no arg given.
 */

import { createClient } from "@clickhouse/client";
import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";

config({ path: resolve(__dirname, "../.env.local") });

interface ScrapedRestaurant {
  name: string;
  location: string;
  cuisine: string;
  rating: number | null;
  reviews: string;
  price_range: string | null;
  services: string[];
  source: string;
}

interface ScrapedJSON {
  restaurants: ScrapedRestaurant[];
}

// Nominatim geocoding with retries
async function geocode(
  query: string
): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    countrycodes: "in",
  })}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "lunch-question-importer/1.0" },
      });

      if (res.status === 503) {
        await sleep(2000);
        continue;
      }
      if (!res.ok) return null;

      const data = await res.json();
      if (data.length === 0) return null;

      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch {
      await sleep(2000);
    }
  }
  return null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Extract a cleaner road/area name from messy Indian addresses.
 * e.g. "43/3075, 43/3075, NH 66, near Hotel Rock Rose, Kochi, Kerala"
 *   -> try "NH 66, Kochi, Kerala"
 */
function extractRoadName(location: string): string | null {
  // Remove building numbers, "near X", "opposite X", "inside X" clauses
  const cleaned = location
    .replace(/\d+\/\d+[A-Z]*\s*/g, "") // building numbers like 32/1180 D
    .replace(/,?\s*near\s+[^,]+/gi, "") // near ...
    .replace(/,?\s*opposite\s+[^,]+/gi, "") // opposite ...
    .replace(/,?\s*inside\s+[^,]+/gi, "") // inside ...
    .replace(/,?\s*opp\.\s+[^,]+/gi, "") // opp. ...
    .replace(/Metro Pillar No\.\s*\d+,?\s*/gi, "") // Metro Pillar No.XYZ
    .replace(/\s+/g, " ")
    .replace(/^[,\s]+|[,\s]+$/g, "")
    .trim();

  // Get the first meaningful part (road name) + city
  const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    // Take the road name + "Kochi Kerala"
    return `${parts[0]}, Kochi, Kerala, India`;
  }
  return null;
}

function parseCuisine(cuisine: string): string[] {
  if (!cuisine || cuisine === "Restaurant") return [];
  return cuisine
    .split(/[/,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseServices(services: string[]): {
  delivery: boolean;
  takeaway: boolean;
} {
  const joined = services.join(" ").toLowerCase();
  return {
    delivery: joined.includes("delivery"),
    takeaway:
      joined.includes("takeaway") ||
      joined.includes("kerbside") ||
      joined.includes("drive-through"),
  };
}

// Synthetic osm_id range (well above real OSM node IDs)
let syntheticIdCounter = 90_000_000_000;

// Kochi center fallback coordinates for restaurants we can't geocode precisely
const KOCHI_CENTER = { lat: 9.9816, lng: 76.2999 };

async function geocodeRestaurant(
  name: string,
  location: string
): Promise<{ lat: number; lng: number; method: string } | null> {
  // Strategy 1: Full "name, address"
  let result = await geocode(`${name}, ${location}`);
  if (result) return { ...result, method: "name+address" };
  await sleep(1200);

  // Strategy 2: Just the full address
  result = await geocode(location);
  if (result) return { ...result, method: "address" };
  await sleep(1200);

  // Strategy 3: Cleaned road name + Kochi
  const roadQuery = extractRoadName(location);
  if (roadQuery) {
    result = await geocode(roadQuery);
    if (result) return { ...result, method: "road" };
    await sleep(1200);
  }

  // Strategy 4: "name, Kochi, Kerala, India"
  result = await geocode(`${name}, Kochi, Kerala, India`);
  if (result) return { ...result, method: "name+city" };
  await sleep(1200);

  // Strategy 5: Extract area keywords from address
  const areaMatch = location.match(
    /(Palarivattom|Edappally|Edapally|Vyttila|Kaloor|Ernakulam|MG Road|Mahatma Gandhi|Fort Kochi|Panampilly|Kadavanthra)/i
  );
  if (areaMatch) {
    result = await geocode(`${name}, ${areaMatch[1]}, Kochi, Kerala, India`);
    if (result) return { ...result, method: "name+area" };
    await sleep(1200);

    // Try just the area
    result = await geocode(`${areaMatch[1]}, Kochi, Kerala, India`);
    if (result) return { ...result, method: "area" };
    await sleep(1200);
  }

  return null;
}

async function main() {
  const jsonPath =
    process.argv[2] ??
    resolve(process.env.HOME!, "Downloads", "restaurants_near_me (1).json");

  console.log(`Reading ${jsonPath}...`);
  const raw: ScrapedJSON = JSON.parse(readFileSync(jsonPath, "utf-8"));
  console.log(`Loaded ${raw.restaurants.length} restaurants`);

  // First, check which ones are already in the DB to avoid duplicates
  const client = createClient({
    url: process.env.CLICKHOUSE_URL!,
    username: process.env.CLICKHOUSE_USER ?? "default",
    password: process.env.CLICKHOUSE_PASSWORD ?? "",
    database: process.env.CLICKHOUSE_DATABASE ?? "default",
  });

  // Delete previously imported synthetic entries (if re-running)
  console.log("Cleaning up previous synthetic entries...");
  await client.command({
    query: `DELETE FROM restaurants WHERE osm_id >= 90000000000`,
  });

  // Geocode all addresses
  console.log("\nGeocoding addresses via Nominatim...\n");

  const rows: Record<string, unknown>[] = [];
  let geocoded = 0;
  let failed = 0;

  for (let i = 0; i < raw.restaurants.length; i++) {
    const r = raw.restaurants[i];
    console.log(`[${i + 1}/${raw.restaurants.length}] ${r.name}`);

    const result = await geocodeRestaurant(r.name, r.location);
    await sleep(1200);

    if (!result) {
      console.warn(`  ✗ SKIP (no coords found after all strategies)`);
      failed++;
      continue;
    }

    // Sanity check: coordinates should be roughly in Kochi area (9.8-10.1 lat, 76.1-76.5 lng)
    if (
      result.lat < 9.5 ||
      result.lat > 10.5 ||
      result.lng < 75.5 ||
      result.lng > 77.0
    ) {
      console.warn(
        `  ✗ SKIP (coords ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)} outside Kochi area via ${result.method})`
      );
      failed++;
      continue;
    }

    const { delivery, takeaway } = parseServices(r.services);
    rows.push({
      osm_id: syntheticIdCounter++,
      name: r.name,
      amenity_type: "restaurant",
      cuisine: parseCuisine(r.cuisine),
      lat: result.lat,
      lng: result.lng,
      addr_street: r.location,
      addr_city: "Kochi",
      addr_postcode: "",
      phone: "",
      website: "",
      opening_hours: "",
      wheelchair: "",
      outdoor_seating: 0,
      delivery: delivery ? 1 : 0,
      takeaway: takeaway ? 1 : 0,
      diet_vegetarian: r.cuisine.toLowerCase().includes("vegetarian") ? 1 : 0,
      is_veg_only: r.cuisine.toLowerCase().includes("vegetarian") ? 1 : 0,
    });
    geocoded++;
    console.log(
      `  ✓ ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)} (via ${result.method})`
    );
  }

  console.log(`\nGeocoded: ${geocoded}, Failed: ${failed}\n`);

  if (rows.length === 0) {
    console.log("No rows to insert.");
    await client.close();
    return;
  }

  // Insert into ClickHouse
  console.log(`Inserting ${rows.length} restaurants into ClickHouse...`);
  await client.insert({
    table: "restaurants",
    values: rows,
    format: "JSONEachRow",
  });

  // Verify
  const countResult = await client.query({
    query: "SELECT count() as cnt FROM restaurants WHERE osm_id >= 90000000000",
    format: "JSONEachRow",
  });
  const countData = await countResult.json<{ cnt: string }>();
  console.log(
    `\nVerified: ${countData[0]?.cnt} Google-scraped restaurants now in DB.`
  );
  console.log("Done!");
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
