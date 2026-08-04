import { destroySession } from "../lib/auth";
import { withBasePath } from "../lib/base-path";

export async function GET() {
  await destroySession();
  return new Response(null, { status: 303, headers: { location: withBasePath("/") } });
}
