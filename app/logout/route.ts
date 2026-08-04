import { destroySession } from "../lib/auth";

export async function GET() {
  await destroySession();
  return new Response(null, { status: 303, headers: { location: "/" } });
}
