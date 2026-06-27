export type DropStatus = "live" | "sold_out" | "paused"
export type PurchaseMode = "safe" | "naive"
export type Region = "us-east-1" | "us-east-2"
export type Outcome = "sold" | "sold_out" | "error"

export interface Brand {
  id: string
  name: string
  created_at: string
}

export interface Drop {
  id: string
  brand_id: string
  name: string
  description: string | null
  price_cents: number
  total_inventory: number
  sold_count: number
  status: DropStatus
  created_at: string
}

export interface DropWithBrand extends Drop {
  brand_name: string
}

export interface PurchaseAttempt {
  id: string
  drop_id: string
  region: Region
  mode: PurchaseMode
  outcome: Outcome
  retries: number
  latency_ms: number
  created_at: string
}

export interface DropMetrics {
  sold: number
  oversold: number
  sold_out_rejections: number
  errors: number
  occ_retries: number
  total_attempts: number
  p50_latency: number
  p99_latency: number
  regions: Record<Region, { sold: number; attempts: number }>
}
