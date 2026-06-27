import { query } from "./db"
import type { PurchaseMode, Region, Outcome } from "./types"

export const REGIONS: Region[] = ["us-east-1", "us-east-2"]

export interface PurchaseResult {
  drop_id: string
  outcome: Outcome
  position: number | null
  retries: number
  latency_ms: number
  region: Region
}

/**
 * Execute a single purchase against a drop.
 *
 * SAFE: an atomic guarded UPDATE on drops.sold_count gates every sale, with
 *   OCC retry on serialization failure (Postgres 40001). Aurora DSQL's strong
 *   consistency means concurrent writers to the same row are serialized — the
 *   guard can NEVER let sold_count exceed total_inventory. On success we insert
 *   the order. orders count stays exactly in lock-step with sold_count.
 *
 * NAIVE: the classic anti-pattern — read the current count, check it against
 *   inventory, then write. The write is an INSERT into orders (a fresh row, so
 *   it never contends and never gets a guard). Many concurrent requests read
 *   the same stale count, all pass the check, and all insert -> oversell.
 */
export async function purchase(dropId: string, mode: PurchaseMode, region: Region): Promise<PurchaseResult> {
  const start = Date.now()
  let retries = 0
  let outcome: Outcome = "error"
  let position: number | null = null

  if (mode === "safe") {
    const MAX_RETRIES = 15
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const res = await query<{ sold_count: number }>(
          `UPDATE drops
             SET sold_count = sold_count + 1
           WHERE id = $1 AND sold_count < total_inventory
           RETURNING sold_count`,
          [dropId],
        )
        if (res.rowCount && res.rowCount > 0) {
          position = res.rows[0].sold_count
          await query(`INSERT INTO orders (drop_id, region, mode, position) VALUES ($1, $2, $3, $4)`, [
            dropId,
            region,
            mode,
            position,
          ])
          outcome = "sold"
        } else {
          outcome = "sold_out"
        }
        break
      } catch (err: any) {
        // 40001 = serialization_failure (OCC conflict). Back off and retry.
        if (err?.code === "40001" && retries < MAX_RETRIES) {
          retries++
          await sleep(Math.min(80, 2 ** retries + Math.random() * 12))
          continue
        }
        outcome = "error"
        break
      }
    }
  } else {
    // NAIVE: read-check-write, no atomic guard on the counter.
    try {
      const read = await query<{ sold: number; total_inventory: number }>(
        `SELECT (SELECT count(*) FROM orders WHERE drop_id = $1)::int AS sold,
                total_inventory
           FROM drops WHERE id = $1`,
        [dropId],
      )
      if (read.rowCount === 0) {
        outcome = "error"
      } else {
        const { sold, total_inventory } = read.rows[0]
        if (sold < total_inventory) {
          // No WHERE guard, fresh row -> no contention -> the oversell slips through.
          await query(`INSERT INTO orders (drop_id, region, mode, position) VALUES ($1, $2, $3, $4)`, [
            dropId,
            region,
            mode,
            sold + 1,
          ])
          position = sold + 1
          outcome = "sold"
        } else {
          outcome = "sold_out"
        }
      }
    } catch (err: any) {
      outcome = "error"
    }
  }

  return {
    drop_id: dropId,
    outcome,
    position,
    retries,
    latency_ms: Date.now() - start,
    region,
  }
}

/** Persist a single attempt log row (used by the storefront single-buy flow). */
export async function recordAttempt(r: PurchaseResult, mode: PurchaseMode) {
  await query(
    `INSERT INTO purchase_attempts (drop_id, region, mode, outcome, retries, latency_ms)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [r.drop_id, r.region, mode, r.outcome, r.retries, r.latency_ms],
  )
}

/** Bulk persist attempt logs in chunks (respects the 3000-row / transaction limit). */
export async function recordAttemptsBulk(results: PurchaseResult[], mode: PurchaseMode) {
  const CHUNK = 500
  for (let i = 0; i < results.length; i += CHUNK) {
    const chunk = results.slice(i, i + CHUNK)
    const values: string[] = []
    const params: unknown[] = []
    chunk.forEach((r, idx) => {
      const b = idx * 6
      values.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6})`)
      params.push(r.drop_id, r.region, mode, r.outcome, r.retries, r.latency_ms)
    })
    await query(
      `INSERT INTO purchase_attempts (drop_id, region, mode, outcome, retries, latency_ms)
       VALUES ${values.join(", ")}`,
      params,
    )
  }
}

/** Run an array of async task factories with bounded concurrency. */
export async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let cursor = 0
  async function worker() {
    while (cursor < tasks.length) {
      const idx = cursor++
      results[idx] = await tasks[idx]()
    }
  }
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker())
  await Promise.all(workers)
  return results
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
