import { readFileSync } from "node:fs"
import pg from "pg"
import { DsqlSigner } from "@aws-sdk/dsql-signer"
import { awsCredentialsProvider } from "@vercel/functions/oidc"

const { Client } = pg

const signer = new DsqlSigner({
  credentials: awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN,
    clientConfig: { region: process.env.AWS_REGION },
  }),
  region: process.env.AWS_REGION,
  hostname: process.env.PGHOST,
  expiresIn: 900,
})

const file = process.argv[2]
if (!file) {
  console.error("Usage: node run-sql.mjs <file.sql>")
  process.exit(1)
}

const sql = readFileSync(file, "utf8")
// Split into statements on COMMIT; so each DDL runs in its own transaction.
const statements = sql
  .split(/;\s*COMMIT;/i)
  .map((s) => s.replace(/COMMIT;?\s*$/i, "").trim())
  .filter((s) => s.length > 0 && !/^--/.test(s.replace(/\n/g, " ").trim()))

const token = await signer.getDbConnectAdminAuthToken()

const client = new Client({
  host: process.env.PGHOST,
  user: process.env.PGUSER || "admin",
  database: process.env.PGDATABASE || "postgres",
  password: token,
  port: 5432,
  ssl: { rejectUnauthorized: false },
})

await client.connect()
console.log(`[run-sql] connected, running ${statements.length} statement(s) from ${file}`)

for (const stmt of statements) {
  const preview = stmt.replace(/\s+/g, " ").slice(0, 70)
  try {
    await client.query(stmt + ";")
    console.log(`[run-sql] OK: ${preview}`)
  } catch (err) {
    console.error(`[run-sql] ERROR on: ${preview}\n  -> ${err.message}`)
  }
}

await client.end()
console.log("[run-sql] done")
