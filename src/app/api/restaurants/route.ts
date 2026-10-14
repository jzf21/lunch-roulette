import { getClickHouseClient, ensureSchema } from "@/lib/clickhouse";
import { officeClock, officeToday, openState } from "@/lib/hours";
import { NearbyRestaurant, SortKey } from "@/lib/types";

// MG Road, Kochi office coordinates
const DEFAULT_LAT = 9.9816;
const DEFAULT_LNG = 76.2999;
const DEFAULT_RADIUS_KM = 5;
const MAX_RADIUS_KM = 25;
const MAX_RESULTS = 50;
const LUNCH = { hour: 13, minute: 0 };

const FLAG_COLUMNS: Record<string, string> = {
  veg: "diet_vegetarian",
  delivery: "delivery",
  takeaway: "takeaway",
  outdoor: "outdoor_seating",
  ac: "air_conditioning",
};

const SORTS: Record<SortKey, (a: NearbyRestaurant, b: NearbyRestaurant) => number> = {
  distance: (a, b) => a.distance_m - b.distance_m,
  votes: (a, b) => (b.votes ?? 0) - (a.votes ?? 0) || a.distance_m - b.distance_m,
  rating: (a, b) =>
    (b.avg_rating ?? 0) - (a.avg_rating ?? 0) ||
    (b.rating_count ?? 0) - (a.rating_count ?? 0) ||
    a.distance_m - b.distance_m,
  // Longest since the team last went (never-visited first), nearest first
  due: (a, b) => (a.last_visited || "").localeCompare(b.last_visited || "") || a.distance_m - b.distance_m,
  name: (a, b) => a.name.localeCompare(b.name),
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const num = (key: string, fallback: number) => {
    const n = parseFloat(searchParams.get(key) ?? "");
    return Number.isFinite(n) ? n : fallback;
  };
  const lat = num("lat", DEFAULT_LAT);
  const lng = num("lng", DEFAULT_LNG);
  const radiusKm = Math.min(Math.max(num("radius", DEFAULT_RADIUS_KM), 0.1), MAX_RADIUS_KM);
  const limit = Math.min(Math.max(Math.floor(num("limit", MAX_RESULTS)), 1), 500);
  const offset = Math.max(Math.floor(num("offset", 0)), 0);
  const cuisine = searchParams.get("cuisine") ?? "";
  const q = (searchParams.get("q") ?? "").trim();
  const types = (searchParams.get("types") ?? "").split(",").filter(Boolean);
  const vegOnly = searchParams.get("veg") === "1";
  const open = searchParams.get("open") ?? "any"; // any | now | lunch | hide_closed
  const openAt = searchParams.get("at") === "lunch" || open === "lunch" ? "lunch" : "now";
  const sortParam = searchParams.get("sort") as SortKey | null;
  const sort: SortKey = sortParam && sortParam in SORTS ? sortParam : "distance";
  const votedOnly = searchParams.get("voted") === "1";
  const voterId = searchParams.get("voter") ?? "";

  const client = getClickHouseClient();

  try {
    await ensureSchema(client);

    const conditions: string[] = [];
    const params: Record<string, unknown> = {
      lat,
      lng,
      radius_m: radiusKm * 1000,
      today: officeToday(),
      voter: voterId,
    };

    if (cuisine && cuisine !== "all") {
      conditions.push(
        "arrayExists(c -> positionCaseInsensitive(c, {cuisine:String}) > 0, r.cuisine)"
      );
      params.cuisine = cuisine;
    }
    if (q) {
      conditions.push(
        "(positionCaseInsensitive(r.name, {q:String}) > 0 OR arrayExists(c -> positionCaseInsensitive(c, {q:String}) > 0, r.cuisine))"
      );
      params.q = q;
    }
    if (types.length > 0) {
      conditions.push("r.amenity_type IN {types:Array(String)}");
      params.types = types;
    }
    if (vegOnly) conditions.push("r.diet_vegetarian = 1");
    for (const [flag, column] of Object.entries(FLAG_COLUMNS)) {
      if (flag !== "veg" && searchParams.get(flag) === "1") conditions.push(`r.${column} = 1`);
    }
    if (votedOnly) conditions.push("v.votes > 0");

    const whereClause = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

    // geoDistance takes (lon1, lat1, lon2, lat2)
    const query = `
      WITH
        v AS (
          SELECT
            spot_id,
            countIf(active = 1) AS votes,
            maxIf(active, voter_id = {voter:String}) AS my_vote
          FROM spot_votes FINAL
          WHERE vote_date = {today:Date}
          GROUP BY spot_id
        ),
        vis AS (
          SELECT
            spot_id,
            count() AS visit_count,
            toString(max(visited_on)) AS last_visited,
            if(countIf(rating > 0) = 0, 0, round(avgIf(rating, rating > 0), 1)) AS avg_rating,
            countIf(rating > 0) AS rating_count,
            argMaxIf(note, created_at, note != '') AS last_note
          FROM spot_visits
          GROUP BY spot_id
        )
      SELECT
        r.osm_id AS osm_id,
        r.name AS name,
        r.amenity_type AS amenity_type,
        r.cuisine AS cuisine,
        r.lat AS lat,
        r.lng AS lng,
        r.addr_street AS addr_street,
        r.phone AS phone,
        r.website AS website,
        r.opening_hours AS opening_hours,
        r.outdoor_seating AS outdoor_seating,
        r.delivery AS delivery,
        r.takeaway AS takeaway,
        r.diet_vegetarian AS diet_vegetarian,
        r.is_veg_only AS is_veg_only,
        r.air_conditioning AS air_conditioning,
        round(geoDistance({lng:Float64}, {lat:Float64}, r.lng, r.lat)) AS distance_m,
        v.votes AS votes,
        v.my_vote AS my_vote,
        vis.visit_count AS visit_count,
        vis.last_visited AS last_visited,
        vis.avg_rating AS avg_rating,
        vis.rating_count AS rating_count,
        vis.last_note AS last_note
      FROM restaurants AS r FINAL
      LEFT JOIN v ON v.spot_id = concat('osm-', toString(r.osm_id))
      LEFT JOIN vis ON vis.spot_id = concat('osm-', toString(r.osm_id))
      WHERE geoDistance({lng:Float64}, {lat:Float64}, r.lng, r.lat) < {radius_m:Float64}
        ${whereClause}
    `;

    const result = await client.query({
      query,
      query_params: params,
      format: "JSONEachRow",
      clickhouse_settings: { output_format_json_quote_64bit_integers: 0 },
    });
    let rows = await result.json<NearbyRestaurant>();

    // Opening hours are evaluated here rather than in SQL (OSM syntax is rich)
    const clock = openAt === "lunch" ? officeClock(new Date(), LUNCH) : officeClock();
    for (const row of rows) {
      const state = openState(row.opening_hours, clock);
      row.open_status = state.status;
      row.open_label = state.label;
      if (row.last_visited === "1970-01-01") row.last_visited = "";
    }

    if (open === "now" || open === "lunch") rows = rows.filter((r) => r.open_status === "open");
    else if (open === "hide_closed") rows = rows.filter((r) => r.open_status !== "closed");

    rows.sort(SORTS[sort]);
    const total = rows.length;
    const page = rows.slice(offset, offset + limit);

    return Response.json({ restaurants: page, count: page.length, total, openAt });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("ClickHouse query error:", message);
    return Response.json({ error: message }, { status: 500 });
  } finally {
    await client.close();
  }
}
