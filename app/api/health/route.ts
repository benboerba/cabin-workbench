import { sql } from "drizzle-orm";
import { getDb } from "../../../db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getDb().run(sql`select 1`);
    return Response.json(
      { status: "ok" },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
