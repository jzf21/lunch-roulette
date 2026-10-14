/**
 * Fetch a fresh snapshot of food places around the Kochi office from the
 * Overpass API and write it to scripts/kochi-restaurants.json.
 *
 * Pulls nodes AND ways/relations (many places are mapped as buildings),
 * using their center point as the location.
 *
 * Usage:
 *   npx tsx scripts/fetch-osm-restaurants.ts [radius-km]
 *
 * Then run `npx tsx scripts/seed-restaurants.ts` to load it into ClickHouse.
 */

import { writeFileSync } from "fs";
import { resolve } from "path";

// MG Road, Kochi office
const CENTER = { lat: 9.9816, lng: 76.2999 };
const RADIUS_KM = Number(process.argv[2] ?? 20);

// The main instance has the freshest data; mirrors can lag by months.
// Override with OVERPASS_URL=... to use a single specific endpoint.
const ENDPOINTS = process.env.OVERPASS_URL ? [process.env.OVERPASS_URL] : [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const AMENITIES = "restaurant|cafe|fast_food|food_court|ice_cream|bar|pub";
const SHOPS = "bakery|pastry|confectionery";

type BBox = [south: number, west: number, north: number, east: number];

/** Square around the office, split into 2x2 tiles to keep each query light. */
function tiles(radiusKm: number): BBox[] {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.cos((CENTER.lat * Math.PI) / 180));
  const out: BBox[] = [];
  for (const [la, lb] of [[CENTER.lat - dLat, CENTER.lat], [CENTER.lat, CENTER.lat + dLat]]) {
    for (const [wa, wb] of [[CENTER.lng - dLng, CENTER.lng], [CENTER.lng, CENTER.lng + dLng]]) {
      out.push([la, wa, lb, wb]);
    }
  }
  return out;
}

// A bbox filter is much cheaper for Overpass than `around`
function buildQuery(bbox: BBox) {
  return `
    [out:json][timeout:180][bbox:${bbox.map((n) => n.toFixed(4)).join(",")}];
    (
      nwr["amenity"~"^(${AMENITIES})$"]["name"];
      nwr["shop"~"^(${SHOPS})$"]["name"];
    );
    out center tags;
  `;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface OverpassResponse {
  osm3s?: { timestamp_osm_base?: string };
  elements: { type: string; id: number; tags?: Record<string, string> }[];
}

async function fetchTile(bbox: BBox): Promise<OverpassResponse> {
  const query = buildQuery(bbox);
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const endpoint of ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "lunch-question-importer/1.0",
          },
          body: new URLSearchParams({ data: query }),
        });
        if (res.ok) {
          const data: OverpassResponse = await res.json();
          console.log(`  ✓ ${data.elements.length} from ${endpoint} (OSM base ${data.osm3s?.timestamp_osm_base})`);
          return data;
        }
        console.warn(`  ✗ ${endpoint}: HTTP ${res.status}`);
      } catch (err) {
        console.warn(`  ✗ ${endpoint}: ${err instanceof Error ? err.message : err}`);
      }
      await sleep(5000);
    }
  }
  throw new Error("All Overpass endpoints failed");
}

async function main() {
  console.log(`Fetching food places within a ${RADIUS_KM} km square of the office...`);
  const seen = new Set<string>();
  const elements: OverpassResponse["elements"] = [];
  const stamps: string[] = [];

  for (const [i, bbox] of tiles(RADIUS_KM).entries()) {
    console.log(`Tile ${i + 1}/4`);
    const data = await fetchTile(bbox);
    if (data.osm3s?.timestamp_osm_base) stamps.push(data.osm3s.timestamp_osm_base);
    for (const el of data.elements) {
      const key = `${el.type}/${el.id}`; // ways can straddle tile edges
      if (!seen.has(key)) {
        seen.add(key);
        elements.push(el);
      }
    }
  }

  // Report the oldest tile's snapshot time
  const out = {
    generator: "scripts/fetch-osm-restaurants.ts (Overpass API)",
    osm3s: {
      timestamp_osm_base: stamps.sort()[0],
      copyright:
        "The data included in this document is from www.openstreetmap.org. The data is made available under ODbL.",
    },
    elements,
  };
  const outPath = resolve(__dirname, "kochi-restaurants.json");
  writeFileSync(outPath, JSON.stringify(out, null, 1));

  const byType: Record<string, number> = {};
  for (const el of elements) {
    const t = el.tags?.amenity ?? el.tags?.shop ?? "?";
    byType[t] = (byType[t] ?? 0) + 1;
  }
  console.log(`\n${elements.length} elements, OSM snapshot ${out.osm3s.timestamp_osm_base}`, byType);
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
