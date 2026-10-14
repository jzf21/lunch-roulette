import { createClient } from "@clickhouse/client";

export function getClickHouseClient() {
  return createClient({
    url: process.env.CLICKHOUSE_URL!,
    username: process.env.CLICKHOUSE_USER ?? "default",
    password: process.env.CLICKHOUSE_PASSWORD ?? "",
    database: process.env.CLICKHOUSE_DATABASE ?? "default",
  });
}

const SCHEMA = [
  // One row per (day, spot, voter); the latest `updated_at` wins, so
  // toggling a vote is just inserting a new row with `active` flipped.
  `CREATE TABLE IF NOT EXISTS spot_votes (
    vote_date   Date,
    spot_id     String,
    voter_id    String,
    voter_name  String,
    active      UInt8,
    updated_at  DateTime64(3)
  ) ENGINE = ReplacingMergeTree(updated_at)
  ORDER BY (vote_date, spot_id, voter_id)`,

  // Append-only log of "we went here", with an optional 1-5 rating
  `CREATE TABLE IF NOT EXISTS spot_visits (
    visit_id    UUID,
    spot_id     String,
    visited_on  Date,
    by_id       String,
    by_name     String,
    rating      UInt8,
    note        String,
    created_at  DateTime64(3)
  ) ENGINE = MergeTree
  ORDER BY (spot_id, visited_on)`,
];

let schemaReady: Promise<void> | null = null;

/** Create the votes/visits tables once per server process. */
export function ensureSchema(client: ReturnType<typeof getClickHouseClient>): Promise<void> {
  schemaReady ??= (async () => {
    for (const query of SCHEMA) await client.command({ query });
  })().catch((err) => {
    schemaReady = null;
    throw err;
  });
  return schemaReady;
}
