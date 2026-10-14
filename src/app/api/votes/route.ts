import { getClickHouseClient, ensureSchema } from "@/lib/clickhouse";
import { officeToday } from "@/lib/hours";

/** Today's vote totals: GET /api/votes?voter=<id> */
export async function GET(request: Request) {
  const voter = new URL(request.url).searchParams.get("voter") ?? "";
  const client = getClickHouseClient();
  try {
    await ensureSchema(client);
    const result = await client.query({
      query: `
        SELECT
          countIf(active = 1) AS votes,
          uniqExactIf(voter_id, active = 1) AS voters,
          countIf(active = 1 AND voter_id = {voter:String}) AS mine
        FROM spot_votes FINAL
        WHERE vote_date = {today:Date}
      `,
      query_params: { today: officeToday(), voter },
      format: "JSONEachRow",
    });
    const [row] = await result.json<Record<string, string | number>>();
    return Response.json({
      votes: Number(row?.votes ?? 0),
      voters: Number(row?.voters ?? 0),
      mine: Number(row?.mine ?? 0),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Vote summary error:", message);
    return Response.json({ error: message }, { status: 500 });
  } finally {
    await client.close();
  }
}

/**
 * Set (not toggle) today's vote for a spot, so retries are idempotent.
 * Body: { spotId, voterId, voterName?, active }
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const spotId = typeof body?.spotId === "string" ? body.spotId : "";
  const voterId = typeof body?.voterId === "string" ? body.voterId : "";
  if (!spotId || !voterId || typeof body?.active !== "boolean") {
    return Response.json({ error: "spotId, voterId and active are required" }, { status: 400 });
  }

  const client = getClickHouseClient();
  try {
    await ensureSchema(client);
    const today = officeToday();
    await client.insert({
      table: "spot_votes",
      values: [
        {
          vote_date: today,
          spot_id: spotId,
          voter_id: voterId,
          voter_name: String(body.voterName ?? "").slice(0, 60),
          active: body.active ? 1 : 0,
          updated_at: Date.now(),
        },
      ],
      format: "JSONEachRow",
    });

    const result = await client.query({
      query: `
        SELECT countIf(active = 1) AS votes
        FROM spot_votes FINAL
        WHERE vote_date = {today:Date} AND spot_id = {spotId:String}
      `,
      query_params: { today, spotId },
      format: "JSONEachRow",
    });
    const [row] = await result.json<{ votes: string | number }>();
    return Response.json({ ok: true, votes: Number(row?.votes ?? 0) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Vote error:", message);
    return Response.json({ error: message }, { status: 500 });
  } finally {
    await client.close();
  }
}
