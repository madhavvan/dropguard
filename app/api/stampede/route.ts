import { type NextRequest, NextResponse } from "next/server"
import { purchase, recordAttemptsBulk, runWithConcurrency, REGIONS } from "@/lib/purchase"
import type { PurchaseMode, Region } from "@/lib/types"
import { getDrop } from "@/lib/queries"

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const dropId: string = body.dropId
    const mode: PurchaseMode = body.mode === "naive" ? "naive" : "safe"
    const splitRegions: boolean = body.splitRegions !== false
    const count = Math.max(1, Math.min(5000, Math.floor(Number(body.count) || 1000)))

    // Validate the parent drop exists (app-layer referential integrity).
    const drop = await getDrop(dropId)
    if (!drop) {
      return NextResponse.json({ error: "Drop not found" }, { status: 404 })
    }

    const tasks = Array.from({ length: count }, (_, i) => {
      const region: Region = splitRegions ? REGIONS[i % REGIONS.length] : "us-east-1"
      return () => purchase(dropId, mode, region)
    })

    const started = Date.now()
    // Bounded concurrency to create real contention without exhausting the pool.
    const results = await runWithConcurrency(tasks, 40)
    const elapsed = Date.now() - started

    // Persist attempt logs in bulk (chunked under the 3000-row transaction limit).
    await recordAttemptsBulk(results, mode)

    const sold = results.filter((r) => r.outcome === "sold").length

    return NextResponse.json({
      ok: true,
      count,
      mode,
      elapsed_ms: elapsed,
      sold,
    })
  } catch (err: any) {
    console.log("[v0] stampede error:", err?.message)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
