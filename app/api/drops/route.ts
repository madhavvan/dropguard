import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { getDrops } from "@/lib/queries"

export async function GET() {
  try {
    const drops = await getDrops()
    return NextResponse.json({ drops })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { brand, name, description, price_cents, total_inventory } = body

    if (!name || !brand || !total_inventory) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Find or create the brand (no FKs in DSQL — handle relations in app code).
    let brandId: string
    const found = await query<{ id: string }>(`SELECT id FROM brands WHERE name = $1 LIMIT 1`, [brand])
    if (found.rowCount && found.rowCount > 0) {
      brandId = found.rows[0].id
    } else {
      const created = await query<{ id: string }>(`INSERT INTO brands (name) VALUES ($1) RETURNING id`, [brand])
      brandId = created.rows[0].id
    }

    const res = await query<{ id: string }>(
      `INSERT INTO drops (brand_id, name, description, price_cents, total_inventory)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [brandId, name, description ?? null, Math.round(Number(price_cents) || 0), Math.round(Number(total_inventory))],
    )

    return NextResponse.json({ id: res.rows[0].id })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
