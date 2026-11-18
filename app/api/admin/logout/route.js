import { cookies } from "next/headers";
import { ADMIN_COOKIE, revokeSession } from "@/lib/auth";

export async function POST() {
  const jar = await cookies();
  await revokeSession(jar.get(ADMIN_COOKIE)?.value);
  jar.delete(ADMIN_COOKIE);
  return Response.json({ ok: true });
}
