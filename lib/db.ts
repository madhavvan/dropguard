import { Pool, type PoolClient } from "pg"
import { DsqlSigner } from "@aws-sdk/dsql-signer"
import { attachDatabasePool } from "@vercel/functions"
import type { Region } from "./types"

// Dual-region Aurora DSQL. Two peered clusters (us-east-1 + us-east-2) form ONE
// logical, strongly-consistent database. We keep a connection pool per regional
// endpoint and route each buyer to a region — proving that concurrent writes across
// regions still can't oversell.
//
// Auth: short-lived IAM tokens minted by DsqlSigner. Credentials come from the
// standard AWS chain — on Vercel that's AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
// for the dropguard-app IAM user (dsql:DbConnectAdmin on both clusters).

const ALL_REGIONS: Region[] = ["us-east-1", "us-east-2"]

const HOSTS: Record<Region, string | undefined> = {
  "us-east-1": process.env.PGHOST_EAST1,
  "us-east-2": process.env.PGHOST_EAST2,
}

declare global {
  // eslint-disable-next-line no-var
  var __dgPools: Partial<Record<Region, Pool>> | undefined
}
const pools: Partial<Record<Region, Pool>> = globalThis.__dgPools ?? {}
if (process.env.NODE_ENV !== "production") globalThis.__dgPools = pools

function makePool(region: Region): Pool {
  const host = HOSTS[region]
  if (!host) {
    throw new Error(`No DSQL host configured for ${region} — set PGHOST_EAST1 / PGHOST_EAST2`)
  }
  const signer = new DsqlSigner({ region, hostname: host, expiresIn: 900 })
  const pool = new Pool({
    host,
    user: process.env.PGUSER || "admin",
    database: process.env.PGDATABASE || "postgres",
    password: () => signer.getDbConnectAdminAuthToken(),
    port: Number(process.env.PGPORT || 5432),
    ssl: true,
    max: 20,
  })
  attachDatabasePool(pool)
  return pool
}

export function poolFor(region: Region): Pool {
  if (!pools[region]) pools[region] = makePool(region)
  return pools[region]!
}

/** Regions that actually have an endpoint configured. */
export function configuredRegions(): Region[] {
  return ALL_REGIONS.filter((r) => !!HOSTS[r])
}

function primaryRegion(): Region {
  return configuredRegions()[0] ?? "us-east-1"
}

/** Region-specific query — the purchase path uses this so a buyer's write hits that
 *  region's endpoint. Both endpoints are the same logical, strongly-consistent DB. */
export async function queryIn<T = any>(region: Region, text: string, params?: unknown[]) {
  return poolFor(region).query<T>(text, params)
}

/** Region-agnostic query (setup, metrics, reads). Runs against the primary region. */
export async function query<T = any>(text: string, params?: unknown[]) {
  return poolFor(primaryRegion()).query<T>(text, params)
}

export async function withConnection<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await poolFor(primaryRegion()).connect()
  try {
    return await fn(client)
  } finally {
    client.release()
  }
}
