import { getClickHouseClient } from "@/lib/clickhouse";

// MG Road, Kochi office coordinates
const DEFAULT_LAT = 9.9816;
const DEFAULT_LNG = 76.2999;
const DEFAULT_RADIUS_KM = 5;
const MAX_RESULTS = 50;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? String(DEFAULT_LAT));
  const lng = parseFloat(searchParams.get("lng") ?? String(DEFAULT_LNG));
  const radiusKm = parseFloat(searchParams.get("radius") ?? String(DEFAULT_RADIUS_KM));
  const limit = Math.min(parseInt(searchParams.get("limit") ?? String(MAX_RESULTS), 10), 200);
  const cuisine = searchParams.get("cuisine") ?? "";
  const vegOnly = searchParams.get("veg") === "1";

  const client = getClickHouseClient();

  try {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {
      lat,
      lng,
      radius_m: radiusKm * 1000,
      lim: limit,
    };

    if (cuisine && cuisine !== "all") {
      conditions.push("hasAny(cuisine, {cuisine:Array(String)})");
      params.cuisine = [cuisine];
    }
    if (vegOnly) {
      conditions.push("diet_vegetarian = 1");
    }

    const whereClause = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT
        osm_id,
        name,
        amenity_type,
        cuisine,
        lat,
        lng,
        addr_street,
        phone,
        website,
        opening_hours,
        outdoor_seating,
        delivery,
        takeaway,
        diet_vegetarian,
        is_veg_only,
        round(geoDistance({lat:Float64}, {lng:Float64}, lat, lng)) AS distance_m
      FROM restaurants
      WHERE geoDistance({lat:Float64}, {lng:Float64}, lat, lng) < {radius_m:Float64}
        ${whereClause}
      ORDER BY distance_m ASC
      LIMIT {lim:UInt32}
    `;

    const result = await client.query({ query, query_params: params, format: "JSONEachRow" });
    const rows = await result.json();

    return Response.json({ restaurants: rows, count: rows.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("ClickHouse query error:", message);
    return Response.json({ error: message }, { status: 500 });
  } finally {
    await client.close();
  }
}
