import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export const maxDuration = 60

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS drops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL DEFAULT 0,
    total_inventory INTEGER NOT NULL DEFAULT 0,
    sold_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'live',
    created_at TIMESTAMP DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drop_id UUID NOT NULL,
    region VARCHAR(32) NOT NULL,
    mode VARCHAR(16) NOT NULL DEFAULT 'safe',
    position INTEGER,
    created_at TIMESTAMP DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS purchase_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drop_id UUID NOT NULL,
    region VARCHAR(32) NOT NULL,
    mode VARCHAR(16) NOT NULL DEFAULT 'safe',
    outcome VARCHAR(32) NOT NULL,
    retries INTEGER NOT NULL DEFAULT 0,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    oversold BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT now()
  )`,
  `CREATE INDEX ASYNC IF NOT EXISTS idx_drops_brand ON drops(brand_id)`,
  `CREATE INDEX ASYNC IF NOT EXISTS idx_attempts_drop ON purchase_attempts(drop_id)`,
  `CREATE INDEX ASYNC IF NOT EXISTS idx_orders_drop ON orders(drop_id)`,
]

const SEED = [
  {
    brand: "Apex Athletic",
    drops: [
      {
        name: "Phantom Runner — Carbon",
        description:
          "Limited carbon-plated racing silhouette. Hand-numbered, single global release. When it's gone, it's gone.",
        price_cents: 22000,
        total_inventory: 250,
      },
      {
        name: "Halo Hoodie — Midnight",
        description: "Heavyweight loopback fleece in a one-time midnight colorway. 500 units worldwide.",
        price_cents: 13500,
        total_inventory: 500,
      },
    ],
  },
  {
    brand: "Northwind Tickets",
    drops: [
      {
        name: "Aurora Festival — GA Wave 1",
        description: "First general-admission wave for the sold-out Aurora Festival main stage.",
        price_cents: 18900,
        total_inventory: 1000,
      },
    ],
  },
]

export async function POST() {
  try {
    for (const stmt of DDL) {
      await query(stmt)
    }

    // Seed only if empty.
    const existing = await query<{ c: number }>(`SELECT count(*)::int AS c FROM drops`)
    if (existing.rows[0].c === 0) {
      for (const b of SEED) {
        const brandRes = await query<{ id: string }>(`INSERT INTO brands (name) VALUES ($1) RETURNING id`, [b.brand])
        const brandId = brandRes.rows[0].id
        for (const d of b.drops) {
          await query(
            `INSERT INTO drops (brand_id, name, description, price_cents, total_inventory)
             VALUES ($1, $2, $3, $4, $5)`,
            [brandId, d.name, d.description, d.price_cents, d.total_inventory],
          )
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.log("[v0] setup error:", err?.message)
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 })
  }
}

export async function GET() {
  return POST()
}
