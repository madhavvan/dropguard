import { type NextRequest, NextResponse } from "next/server"
import { getDrop, getMetrics, getRecentAttempts } from "@/lib/queries"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const [drop, metrics, attempts] = await Promise.all([getDrop(id), getMetrics(id), getRecentAttempts(id, 40)])
    if (!drop) {
      return NextResponse.json({ error: "Drop not found" }, { status: 404 })
    }
    return NextResponse.json({ drop, metrics, attempts })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
