/**
 * Import Google-scraped restaurants JSON into ClickHouse.
 *
 * 1. Geocodes each restaurant address via Nominatim (free, 1 req/sec rate limit)
 * 2. Inserts into the existing `restaurants` table (appends, does NOT truncate)
 *
 * Usage:
 *   npx tsx scripts/import-google-restaurants.ts [path-to-json]
 *
 * Defaults to ../Downloads/restaurants_near_me\ (1).json if no arg given.
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

// Nominatim geocoding with 1 req/sec rate limit
async function geocode(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: address,
    format: "json",
    limit: "1",
  })}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "lunch-question-importer/1.0" },
  });

  if (!res.ok) {
    console.warn(`  Nominatim error ${res.status} for "${address}"`);
    return null;
  }

  const data = await res.json();
  if (data.length === 0) return null;

  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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

// Generate synthetic osm_id in a range that won't collide with real OSM node IDs
// Real OSM node IDs are currently up to ~12 billion. We use 90_000_000_000+ range.
let syntheticIdCounter = 90_000_000_000;

async function main() {
  const jsonPath =
    process.argv[2] ??
    resolve(
      process.env.HOME!,
      "Downloads",
      "restaurants_near_me (1).json"
    );

  console.log(`Reading ${jsonPath}...`);
  const raw: ScrapedJSON = JSON.parse(readFileSync(jsonPath, "utf-8"));
  console.log(`Loaded ${raw.restaurants.length} restaurants`);

  // Geocode all addresses
  console.log("\nGeocoding addresses via Nominatim (1 req/sec)...\n");

  const rows: Record<string, unknown>[] = [];
  let geocoded = 0;
  let failed = 0;

  for (const r of raw.restaurants) {
    const searchAddr = `${r.name}, ${r.location}`;
    let result = await geocode(searchAddr);
    await sleep(1100); // respect Nominatim rate limit

    if (!result) {
      // Retry with just the address (without restaurant name)
      result = await geocode(r.location);
      await sleep(1100);
    }

    if (!result) {
      // Last resort: try "name, Kochi, Kerala"
      result = await geocode(`${r.name}, Kochi, Kerala`);
      await sleep(1100);
    }

    if (!result) {
      console.warn(`  ✗ SKIP (no coords): ${r.name}`);
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
      `  ✓ ${r.name} → ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`
    );
  }

  console.log(`\nGeocoded: ${geocoded}, Failed: ${failed}\n`);

  if (rows.length === 0) {
    console.log("No rows to insert.");
    return;
  }

  // Insert into ClickHouse (append, don't truncate)
  const client = createClient({
    url: process.env.CLICKHOUSE_URL!,
    username: process.env.CLICKHOUSE_USER ?? "default",
    password: process.env.CLICKHOUSE_PASSWORD ?? "",
    database: process.env.CLICKHOUSE_DATABASE ?? "default",
  });

  console.log(`Inserting ${rows.length} restaurants into ClickHouse...`);
  await client.insert({
    table: "restaurants",
    values: rows,
    format: "JSONEachRow",
  });

  console.log("Done! Inserted Google-scraped restaurants.");
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
