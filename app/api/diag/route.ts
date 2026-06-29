// TEMPORARY diagnostic — verifies whether the two regional pools point at one
// peered (shared) database. Remove after checking.
import { NextResponse } from "next/server"
import { poolFor } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  const tag = "diag-" + Date.now()
  const out: Record<string, any> = {}
  try {
    out.host_e1 = (poolFor("us-east-1") as any).options?.host
  } catch (e: any) {
    out.host_e1_err = e.message
  }
  try {
    out.host_e2 = (poolFor("us-east-2") as any).options?.host
  } catch (e: any) {
    out.host_e2_err = e.message
  }
  // Write a unique marker through the us-east-1 endpoint...
  try {
    await poolFor("us-east-1").query("INSERT INTO brands (name) VALUES ($1)", [tag])
    out.wrote_marker_via = "us-east-1"
  } catch (e: any) {
    out.write_err = e.message
  }
  // ...and try to read it back through the us-east-2 endpoint.
  try {
    const r = await poolFor("us-east-2").query<{ n: number }>(
      "SELECT count(*)::int AS n FROM brands WHERE name = $1",
      [tag],
    )
    out.marker_visible_via_e2 = r.rows[0].n // 1 = shared/peered DB ; 0 = separate clusters
  } catch (e: any) {
    out.read_err = e.message
  }
  // Clean up the marker.
  try {
    await poolFor("us-east-1").query("DELETE FROM brands WHERE name = $1", [tag])
  } catch {}
  return NextResponse.json(out)
}
