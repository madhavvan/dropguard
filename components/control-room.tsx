"use client"

import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import {
  ArrowLeft,
  Gauge,
  Globe,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Store,
  Users,
  Zap,
} from "lucide-react"
import type { DropMetrics, DropWithBrand, PurchaseAttempt, PurchaseMode, Region } from "@/lib/types"
import { compact, money, pct } from "@/lib/format"
import { StatusPill } from "@/components/status-pill"
import { MetricTile } from "@/components/metric-tile"
import { AttemptFeed } from "@/components/attempt-feed"

interface ApiResponse {
  drop: DropWithBrand
  metrics: DropMetrics
  attempts: PurchaseAttempt[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function ControlRoom({ dropId, initialDrop }: { dropId: string; initialDrop: DropWithBrand }) {
  const [mode, setMode] = useState<PurchaseMode>("safe")
  const [count, setCount] = useState(1000)
  const [down, setDown] = useState<Region[]>([])
  const [running, setRunning] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [lastRun, setLastRun] = useState<{ mode: PurchaseMode; sold: number; elapsed: number; count: number } | null>(
    null,
  )

  const { data, mutate } = useSWR<ApiResponse>(`/api/drops/${dropId}`, fetcher, {
    refreshInterval: running ? 700 : 4000,
    keepPreviousData: true,
  })

  const drop = data?.drop ?? initialDrop
  const metrics = data?.metrics
  const attempts = data?.attempts ?? []

  const sold = drop.sold_count
  const total = drop.total_inventory
  const oversold = Math.max(0, sold - total)
  const fill = pct(sold, total)

  async function runStampede() {
    setRunning(true)
    setLastRun(null)
    try {
      const res = await fetch("/api/stampede", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dropId, mode, count, splitRegions: true, downRegions: down }),
      })
      const json = await res.json()
      if (json.ok) {
        setLastRun({ mode: json.mode, sold: json.sold, elapsed: json.elapsed_ms, count: json.count })
      }
    } finally {
      setRunning(false)
      mutate()
    }
  }

  async function reset() {
    setResetting(true)
    try {
      await fetch(`/api/drops/${dropId}/reset`, { method: "POST" })
      setLastRun(null)
    } finally {
      setResetting(false)
      mutate()
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All drops
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{drop.brand_name}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{drop.name}</h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">{drop.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={oversold > 0 ? "oversold" : drop.status} />
          <Link
            href={`/shop/${drop.id}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Store className="h-3.5 w-3.5" />
            Storefront
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left: inventory + simulator */}
        <div className="space-y-6 lg:col-span-1">
          {/* Inventory gauge */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Inventory</h2>
              <span className="font-mono text-xs text-muted-foreground">{money(drop.price_cents)} each</span>
            </div>
            <div className="mt-4 flex items-end gap-2">
              <span
                key={sold}
                className={`tick-pop font-mono text-4xl tabular ${oversold > 0 ? "text-destructive" : "text-foreground"}`}
              >
                {compact(sold)}
              </span>
              <span className="mb-1 font-mono text-lg text-muted-foreground">/ {compact(total)}</span>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all duration-300 ${oversold > 0 ? "bg-destructive" : "bg-primary"}`}
                style={{ width: `${fill}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{Math.round(fill)}% claimed</span>
              {oversold > 0 ? (
                <span className="flex items-center gap-1 font-mono text-destructive">
                  <ShieldAlert className="h-3.5 w-3.5" />+{oversold} oversold
                </span>
              ) : (
                <span className="flex items-center gap-1 font-mono text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />0 oversold
                </span>
              )}
            </div>
          </div>

          {/* Simulator */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Users className="h-4 w-4" />
              Stampede simulator
            </h2>

            {/* Mode toggle */}
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-secondary p-1">
              <button
                onClick={() => setMode("safe")}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  mode === "safe" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Guarded (safe)
              </button>
              <button
                onClick={() => setMode("naive")}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  mode === "naive"
                    ? "bg-destructive text-destructive-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Naive (unsafe)
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {mode === "safe"
                ? "Conditional decrement + OCC retries. DSQL aborts conflicting writes; we retry until inventory is exact."
                : "Stale read-then-write with no guard. Concurrent buyers read the same count and oversell."}
            </p>

            {/* Concurrency slider */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="count" className="text-muted-foreground">
                  Concurrent buyers
                </label>
                <span className="font-mono tabular text-foreground">{compact(count)}</span>
              </div>
              <input
                id="count"
                type="range"
                min={100}
                max={5000}
                step={100}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="mt-2 w-full accent-primary"
              />
              <div className="mt-1 flex justify-between font-mono text-[11px] text-muted-foreground">
                <span>100</span>
                <span>5,000</span>
              </div>
            </div>

            {/* Region chaos — click a region to simulate a regional outage */}
            <div className="mt-4">
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Globe className="h-4 w-4" />
                Regions <span className="text-xs">(click to take one offline)</span>
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["us-east-1", "us-east-2"] as Region[]).map((r) => {
                  const isDown = down.includes(r)
                  return (
                    <button
                      key={r}
                      onClick={() =>
                        setDown((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]))
                      }
                      className={`flex items-center justify-between rounded-md border px-3 py-2 font-mono text-xs transition-colors ${
                        isDown
                          ? "border-destructive/50 bg-destructive/10 text-destructive"
                          : "border-border bg-background hover:bg-accent"
                      }`}
                    >
                      <span>{r}</span>
                      <span className="flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${isDown ? "bg-destructive" : "bg-primary"}`} />
                        {isDown ? "OFFLINE" : "LIVE"}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={runStampede}
                disabled={running || resetting}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Zap className="h-4 w-4" />
                {running ? "Running stampede..." : "Launch stampede"}
              </button>
              <button
                onClick={reset}
                disabled={running || resetting}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                title="Reset drop"
              >
                <RotateCcw className={`h-4 w-4 ${resetting ? "animate-spin" : ""}`} />
              </button>
            </div>

            {lastRun && (
              <div className="row-in mt-4 rounded-md border border-border bg-background p-3 text-xs">
                <p className="text-muted-foreground">
                  Last run:{" "}
                  <span className={`font-medium ${lastRun.mode === "safe" ? "text-primary" : "text-destructive"}`}>
                    {lastRun.mode === "safe" ? "Guarded" : "Naive"}
                  </span>{" "}
                  · {compact(lastRun.count)} buyers
                </p>
                <p className="mt-1 font-mono tabular text-foreground">
                  {compact(lastRun.sold)} confirmed in {lastRun.elapsed}ms
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: metrics + feed */}
        <div className="space-y-6 lg:col-span-2">
          {/* Self-auditing correctness seal — DropGuard verifies its own invariant
              after every run: orders sold must never exceed inventory. */}
          {metrics && metrics.total_attempts > 0 && (
            <div
              className={`row-in rounded-lg border p-4 ${
                metrics.oversold === 0
                  ? "border-primary/40 bg-primary/5"
                  : "border-destructive/40 bg-destructive/5"
              }`}
            >
              <div className="flex items-center gap-2">
                {metrics.oversold === 0 ? (
                  <ShieldCheck className="h-5 w-5 text-primary" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                )}
                <span
                  className={`font-mono text-sm font-semibold uppercase tracking-wider ${
                    metrics.oversold === 0 ? "text-primary" : "text-destructive"
                  }`}
                >
                  {metrics.oversold === 0 ? "Invariant verified" : "Invariant violated"}
                </span>
              </div>
              <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
                sold {compact(sold)} ≤ inventory {compact(total)} · oversold{" "}
                <span className={metrics.oversold === 0 ? "text-primary" : "text-destructive"}>
                  {metrics.oversold}
                </span>{" "}
                · checked against {compact(metrics.total_attempts)} attempts
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricTile
              label="Confirmed"
              value={compact(metrics?.sold ?? 0)}
              tone="primary"
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <MetricTile
              label="Oversold"
              value={compact(metrics?.oversold ?? 0)}
              tone={metrics && metrics.oversold > 0 ? "destructive" : "muted"}
              icon={<ShieldAlert className="h-4 w-4" />}
            />
            <MetricTile
              label="Rejected (sold out)"
              value={compact(metrics?.sold_out_rejections ?? 0)}
              tone="muted"
              icon={<Users className="h-4 w-4" />}
            />
            <MetricTile
              label="OCC retries"
              value={compact(metrics?.occ_retries ?? 0)}
              tone="muted"
              icon={<RotateCcw className="h-4 w-4" />}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricTile label="p50 latency" value={`${metrics?.p50_latency ?? 0}ms`} tone="muted" icon={<Gauge className="h-4 w-4" />} />
            <MetricTile label="p99 latency" value={`${metrics?.p99_latency ?? 0}ms`} tone="muted" icon={<Gauge className="h-4 w-4" />} />
            <RegionTile region="us-east-1" metrics={metrics} offline={down.includes("us-east-1")} />
            <RegionTile region="us-east-2" metrics={metrics} offline={down.includes("us-east-2")} />
          </div>

          <AttemptFeed attempts={attempts} />
        </div>
      </div>
    </main>
  )
}

function RegionTile({
  region,
  metrics,
  offline,
}: {
  region: "us-east-1" | "us-east-2"
  metrics?: DropMetrics
  offline?: boolean
}) {
  const r = metrics?.regions[region]
  return (
    <div className={`rounded-lg border bg-card p-4 ${offline ? "border-destructive/50" : "border-border"}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className={`h-1.5 w-1.5 rounded-full ${offline ? "bg-destructive" : "bg-chart-2"}`} />
        <span className="font-mono text-[11px]">
          {region}
          {offline ? " · OFFLINE" : ""}
        </span>
      </div>
      <p className="mt-2 font-mono text-lg tabular text-foreground">{compact(r?.sold ?? 0)}</p>
      <p className="text-[11px] text-muted-foreground">sold · {compact(r?.attempts ?? 0)} attempts</p>
    </div>
  )
}
