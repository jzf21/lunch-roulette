import { getClickHouseClient, ensureSchema } from "@/lib/clickhouse";
import { officeToday } from "@/lib/hours";

/** Recent visits for one spot: GET /api/visits?spotId=osm-123 */
export async function GET(request: Request) {
  const spotId = new URL(request.url).searchParams.get("spotId") ?? "";
  if (!spotId) return Response.json({ error: "spotId is required" }, { status: 400 });

  const client = getClickHouseClient();
  try {
    await ensureSchema(client);
    const result = await client.query({
      query: `
        SELECT toString(visited_on) AS visited_on, by_name, rating, note
        FROM spot_visits
        WHERE spot_id = {spotId:String}
        ORDER BY visited_on DESC, created_at DESC
        LIMIT 20
      `,
      query_params: { spotId },
      format: "JSONEachRow",
    });
    return Response.json({ visits: await result.json() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Visits query error:", message);
    return Response.json({ error: message }, { status: 500 });
  } finally {
    await client.close();
  }
}

/**
 * Log that the team went somewhere.
 * Body: { spotId, byId, byName?, rating? (1-5), note?, visitedOn? (YYYY-MM-DD) }
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const spotId = typeof body?.spotId === "string" ? body.spotId : "";
  const byId = typeof body?.byId === "string" ? body.byId : "";
  if (!spotId || !byId) {
    return Response.json({ error: "spotId and byId are required" }, { status: 400 });
  }
  const rating = Math.round(Number(body.rating ?? 0));
  const today = officeToday();
  const visitedOn =
    typeof body.visitedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.visitedOn) && body.visitedOn <= today
      ? body.visitedOn
      : today;

  const client = getClickHouseClient();
  try {
    await ensureSchema(client);
    await client.insert({
      table: "spot_visits",
      values: [
        {
          visit_id: crypto.randomUUID(),
          spot_id: spotId,
          visited_on: visitedOn,
          by_id: byId,
          by_name: String(body.byName ?? "").slice(0, 60),
          rating: rating >= 1 && rating <= 5 ? rating : 0,
          note: String(body.note ?? "").trim().slice(0, 280),
          created_at: Date.now(),
        },
      ],
      format: "JSONEachRow",
    });
    return Response.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Visit insert error:", message);
    return Response.json({ error: message }, { status: 500 });
  } finally {
    await client.close();
  }
}
