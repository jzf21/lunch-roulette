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
  type: string;
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

function normalizeElement(el: OverpassElement) {
  const tags = el.tags ?? {};
  return {
    osm_id: el.id,
    name: tags.name ?? tags["name:en"] ?? "Unnamed",
    amenity_type: tags.amenity ?? "restaurant",
    cuisine: tags.cuisine?.split(";").map((s: string) => s.trim()).filter(Boolean) ?? [],
    lat: el.lat,
    lng: el.lon,
    addr_street: tags["addr:street"] ?? "",
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
  };
}

async function main() {
  // Read pre-fetched data
  const jsonPath = resolve(__dirname, "kochi-restaurants.json");
  console.log(`Reading ${jsonPath}...`);
  const raw = JSON.parse(readFileSync(jsonPath, "utf-8"));
  const elements: OverpassElement[] = raw.elements;
  console.log(`Loaded ${elements.length} elements from JSON`);

  // Filter out elements without a name
  const named = elements.filter((el) => el.tags?.name || el.tags?.["name:en"]);
  console.log(`${named.length} elements have a name`);

  const rows = named.map(normalizeElement);

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
        is_veg_only   UInt8
      ) ENGINE = ReplacingMergeTree()
      ORDER BY osm_id
    `,
  });

  // Truncate before re-seeding
  await client.command({ query: "TRUNCATE TABLE IF EXISTS restaurants" });

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
