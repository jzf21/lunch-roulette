/**
 * Seed script: Read the pre-fetched Kochi restaurants JSON (from Overpass/OSM)
 * and insert them into ClickHouse.
 *
 * Usage:
 *   npx tsx scripts/seed-restaurants.ts
 *
 * Requires .env.local with CLICKHOUSE_URL, CLICKHOUSE_USER, CLICKHOUSE_PASSWORD, CLICKHOUSE_DATABASE
 */

import { createClient } from "@clickhouse/client";
import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";

config({ path: resolve(__dirname, "../.env.local") });

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  /** Present for ways/relations when queried with `out center` */
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

// Node, way and relation ids are separate namespaces in OSM, so offset
// ways/relations to keep osm_id unique. Stays below the synthetic range
// (90_000_000_000) used by import-google-restaurants.ts.
const WAY_OFFSET = 50_000_000_000;
const RELATION_OFFSET = 60_000_000_000;
const SYNTHETIC_ID_START = 90_000_000_000;

function osmId(el: OverpassElement): number {
  if (el.type === "way") return WAY_OFFSET + el.id;
  if (el.type === "relation") return RELATION_OFFSET + el.id;
  return el.id;
}

function amenityType(tags: Record<string, string>): string {
  if (tags.amenity) return tags.amenity;
  if (tags.shop) return "bakery"; // bakery / pastry / confectionery
  return "restaurant";
}

function street(tags: Record<string, string>): string {
  const parts = [
    [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "),
    tags["addr:suburb"] ?? tags["addr:place"],
  ].filter(Boolean);
  return parts.join(", ");
}

function normalizeElement(el: OverpassElement, fetchedAt: string) {
  const tags = el.tags ?? {};
  const lat = el.lat ?? el.center!.lat;
  const lng = el.lon ?? el.center!.lon;
  return {
    osm_id: osmId(el),
    name: tags.name ?? tags["name:en"] ?? "Unnamed",
    amenity_type: amenityType(tags),
    cuisine: tags.cuisine?.split(";").map((s: string) => s.trim()).filter(Boolean) ?? [],
    lat,
    lng,
    addr_street: street(tags),
    addr_city: tags["addr:city"] ?? "",
    addr_postcode: tags["addr:postcode"] ?? "",
    phone: tags.phone ?? tags["contact:phone"] ?? "",
    website: tags.website ?? tags["contact:website"] ?? "",
    opening_hours: tags.opening_hours ?? "",
    wheelchair: tags.wheelchair ?? "",
    outdoor_seating: tags.outdoor_seating === "yes",
    delivery: tags.delivery === "yes",
    takeaway: tags.takeaway === "yes",
    diet_vegetarian: tags["diet:vegetarian"] === "yes" || tags["diet:vegetarian"] === "only",
    is_veg_only: tags["diet:vegetarian"] === "only",
    air_conditioning: tags.air_conditioning === "yes",
    fetched_at: fetchedAt,
  };
}

async function main() {
  // Read pre-fetched data
  const jsonPath = resolve(__dirname, "kochi-restaurants.json");
  console.log(`Reading ${jsonPath}...`);
  const raw = JSON.parse(readFileSync(jsonPath, "utf-8"));
  const elements: OverpassElement[] = raw.elements;
  console.log(`Loaded ${elements.length} elements from JSON`);

  // Filter out elements without a name or a location
  const named = elements.filter(
    (el) => (el.tags?.name || el.tags?.["name:en"]) && (el.lat != null || el.center)
  );
  console.log(`${named.length} elements have a name and location`);

  // ClickHouse DateTime format, from the OSM snapshot time
  const fetchedAt = (raw.osm3s?.timestamp_osm_base ?? new Date().toISOString())
    .replace("T", " ")
    .replace(/(\.\d+)?Z$/, "");
  const rows = named.map((el) => normalizeElement(el, fetchedAt));

  const db = process.env.CLICKHOUSE_DATABASE ?? "default";

  // Connect without database to create it first
  const bootstrapClient = createClient({
    url: process.env.CLICKHOUSE_URL!,
    username: process.env.CLICKHOUSE_USER ?? "default",
    password: process.env.CLICKHOUSE_PASSWORD ?? "",
  });

  console.log(`Creating database "${db}" if not exists...`);
  await bootstrapClient.command({ query: `CREATE DATABASE IF NOT EXISTS ${db}` });
  await bootstrapClient.close();

  const client = createClient({
    url: process.env.CLICKHOUSE_URL!,
    username: process.env.CLICKHOUSE_USER ?? "default",
    password: process.env.CLICKHOUSE_PASSWORD ?? "",
    database: db,
  });

  console.log("Creating table if not exists...");
  await client.command({
    query: `
      CREATE TABLE IF NOT EXISTS restaurants (
        osm_id        UInt64,
        name          String,
        amenity_type  String,
        cuisine       Array(String),
        lat           Float64,
        lng           Float64,
        addr_street   String,
        addr_city     String,
        addr_postcode String,
        phone         String,
        website       String,
        opening_hours String,
        wheelchair    String,
        outdoor_seating UInt8,
        delivery      UInt8,
        takeaway      UInt8,
        diet_vegetarian UInt8,
        is_veg_only   UInt8,
        air_conditioning UInt8,
        fetched_at    DateTime
      ) ENGINE = ReplacingMergeTree()
      ORDER BY osm_id
    `,
  });

  // Columns added after the table was first created
  for (const col of ["air_conditioning UInt8", "fetched_at DateTime"]) {
    await client.command({ query: `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS ${col}` });
  }

  // Replace the previous OSM snapshot, keeping Google-imported rows
  console.log("Removing previous OSM rows...");
  await client.command({
    query: `DELETE FROM restaurants WHERE osm_id < ${SYNTHETIC_ID_START}`,
  });

  // Insert in batches
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await client.insert({
      table: "restaurants",
      values: batch,
      format: "JSONEachRow",
    });
    console.log(`Inserted ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
  }

  console.log("Done! Seeded restaurants table.");
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
