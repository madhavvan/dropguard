import { query } from "./db"
import type { DropWithBrand, DropMetrics, PurchaseAttempt, Region } from "./types"

// Sales truth lives in the `orders` table. drops.sold_count is the SAFE-mode
// gate; for display we always count real orders so naive oversells are visible.
const DROP_SELECT = `
  SELECT d.id, d.brand_id, d.name, d.description, d.price_cents,
         d.total_inventory, d.status, d.created_at,
         (SELECT count(*) FROM orders o WHERE o.drop_id = d.id)::int AS sold_count,
         b.name AS brand_name
    FROM drops d
    JOIN brands b ON b.id = d.brand_id
`

export async function getDrops(): Promise<DropWithBrand[]> {
  const res = await query<DropWithBrand>(`${DROP_SELECT} ORDER BY d.created_at`)
  return res.rows
}

export async function getDrop(id: string): Promise<DropWithBrand | null> {
  const res = await query<DropWithBrand>(`${DROP_SELECT} WHERE d.id = $1`, [id])
  return res.rows[0] ?? null
}

export async function getRecentAttempts(dropId: string, limit = 40): Promise<PurchaseAttempt[]> {
  const res = await query<PurchaseAttempt>(
    `SELECT * FROM purchase_attempts WHERE drop_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [dropId, limit],
  )
  return res.rows
}

export async function getMetrics(dropId: string): Promise<DropMetrics> {
  const metrics: DropMetrics = {
    sold: 0,
    oversold: 0,
    sold_out_rejections: 0,
    errors: 0,
    occ_retries: 0,
    total_attempts: 0,
    p50_latency: 0,
    p99_latency: 0,
    regions: {
      "us-east-1": { sold: 0, attempts: 0 },
      "us-east-2": { sold: 0, attempts: 0 },
    },
  }

  // Real sales (truth) + inventory, to detect oversell.
  const sales = await query<{ sold: number; total_inventory: number }>(
    `SELECT (SELECT count(*) FROM orders WHERE drop_id = $1)::int AS sold, total_inventory
       FROM drops WHERE id = $1`,
    [dropId],
  )
  if (sales.rowCount) {
    metrics.sold = sales.rows[0].sold
    metrics.oversold = Math.max(0, sales.rows[0].sold - sales.rows[0].total_inventory)
  }

  // Sales per region from the orders table.
  const byRegion = await query<{ region: Region; c: number }>(
    `SELECT region, count(*)::int AS c FROM orders WHERE drop_id = $1 GROUP BY region`,
    [dropId],
  )
  for (const row of byRegion.rows) {
    if (metrics.regions[row.region]) metrics.regions[row.region].sold = row.c
  }

  // Attempt-level aggregates from purchase_attempts.
  const grouped = await query<{ outcome: string; region: Region; c: number; r: number }>(
    `SELECT outcome, region, count(*)::int AS c, COALESCE(sum(retries), 0)::int AS r
       FROM purchase_attempts
      WHERE drop_id = $1
      GROUP BY outcome, region`,
    [dropId],
  )
  for (const row of grouped.rows) {
    metrics.total_attempts += row.c
    metrics.occ_retries += row.r
    if (metrics.regions[row.region]) metrics.regions[row.region].attempts += row.c
    if (row.outcome === "sold_out") metrics.sold_out_rejections += row.c
    if (row.outcome === "error") metrics.errors += row.c
  }

  // Latency percentiles from a recent sample (computed in app — DSQL has no
  // ordered-set aggregates).
  const lat = await query<{ latency_ms: number }>(
    `SELECT latency_ms FROM purchase_attempts WHERE drop_id = $1 ORDER BY created_at DESC LIMIT 2000`,
    [dropId],
  )
  const vals = lat.rows.map((r) => r.latency_ms).sort((a, b) => a - b)
  metrics.p50_latency = percentile(vals, 0.5)
  metrics.p99_latency = percentile(vals, 0.99)

  return metrics
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length))
  return sorted[idx]
}

export async function resetDrop(id: string): Promise<void> {
  await query(`UPDATE drops SET sold_count = 0, status = 'live' WHERE id = $1`, [id])
  await query(`DELETE FROM purchase_attempts WHERE drop_id = $1`, [id])
  await query(`DELETE FROM orders WHERE drop_id = $1`, [id])
}
