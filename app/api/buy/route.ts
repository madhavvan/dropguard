import { type NextRequest, NextResponse } from "next/server"
import { purchase, recordAttempt, REGIONS } from "@/lib/purchase"
import { getDrop } from "@/lib/queries"
import type { Region } from "@/lib/types"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const dropId: string = body.dropId
    const region: Region = REGIONS.includes(body.region) ? body.region : "us-east-1"

    const drop = await getDrop(dropId)
    if (!drop) {
      return NextResponse.json({ error: "Drop not found" }, { status: 404 })
    }

    // Storefront always uses the safe, guarded path.
    const result = await purchase(dropId, "safe", region)
    await recordAttempt(result, "safe")

    return NextResponse.json({
      outcome: result.outcome,
      position: result.position,
      total: drop.total_inventory,
      region: result.region,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
