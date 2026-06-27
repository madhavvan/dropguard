import { Pool, type PoolClient } from "pg"
import { DsqlSigner } from "@aws-sdk/dsql-signer"
import { awsCredentialsProvider } from "@vercel/functions/oidc"
import { attachDatabasePool } from "@vercel/functions"

const signer = new DsqlSigner({
  credentials: awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN,
    clientConfig: { region: process.env.AWS_REGION },
  }),
  region: process.env.AWS_REGION,
  hostname: process.env.PGHOST,
  expiresIn: 900,
})

declare global {
  // eslint-disable-next-line no-var
  var __dropguardPool: Pool | undefined
}

function createPool() {
  const pool = new Pool({
    host: process.env.PGHOST,
    user: process.env.PGUSER || "admin",
    database: process.env.PGDATABASE || "postgres",
    password: () => signer.getDbConnectAdminAuthToken(),
    port: 5432,
    ssl: true,
    max: 30,
  })
  attachDatabasePool(pool)
  return pool
}

const pool = globalThis.__dropguardPool ?? createPool()
if (process.env.NODE_ENV !== "production") globalThis.__dropguardPool = pool

export async function query<T = any>(text: string, params?: unknown[]) {
  return pool.query<T>(text, params)
}

export async function withConnection<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    return await fn(client)
  } finally {
    client.release()
  }
}

export { pool }
