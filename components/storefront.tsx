"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Check, Loader2, ShieldCheck, X } from "lucide-react"
import type { DropWithBrand } from "@/lib/types"
import { compact, money, pct } from "@/lib/format"

interface ApiResponse {
  drop: DropWithBrand
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type BuyResult = {
  outcome: "sold" | "sold_out" | "error"
  position?: number
  total?: number
  region?: string
}

export function Storefront({ dropId, initialDrop }: { dropId: string; initialDrop: DropWithBrand }) {
  const [buying, setBuying] = useState(false)
  const [result, setResult] = useState<BuyResult | null>(null)

  const { data, mutate } = useSWR<ApiResponse>(`/api/drops/${dropId}`, fetcher, {
    refreshInterval: 2500,
    keepPreviousData: true,
    fallbackData: { drop: initialDrop },
  })

  const drop = data?.drop ?? initialDrop
  const sold = Math.min(drop.sold_count, drop.total_inventory)
  const remaining = Math.max(0, drop.total_inventory - drop.sold_count)
  const fill = pct(sold, drop.total_inventory)
  const soldOut = remaining <= 0

  async function buy() {
    setBuying(true)
    setResult(null)
    try {
      const res = await fetch("/api/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dropId, region: "us-east-1" }),
      })
      const json: BuyResult = await res.json()
      setResult(json)
    } catch {
      setResult({ outcome: "error" })
    } finally {
      setBuying(false)
      mutate()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link
            href={`/drops/${dropId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Control room
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Protected by DropGuard
          </span>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          {/* Product image */}
          <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-card">
            <Image
              src="/products/sneaker.png"
              alt={drop.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          </div>

          {/* Product detail */}
          <div className="flex flex-col">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{drop.brand_name}</p>
            <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight">{drop.name}</h1>
            <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">{drop.description}</p>

            <p className="mt-6 font-mono text-3xl tabular">{money(drop.price_cents)}</p>

            {/* Stock bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {soldOut ? "Sold out" : `${compact(remaining)} of ${compact(drop.total_inventory)} left`}
                </span>
                <span className="font-mono tabular text-muted-foreground">{Math.round(fill)}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${soldOut ? "bg-muted-foreground" : "bg-primary"}`}
                  style={{ width: `${fill}%` }}
                />
              </div>
            </div>

            {/* Buy button */}
            <button
              onClick={buy}
              disabled={buying || soldOut}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {buying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Securing your unit...
                </>
              ) : soldOut ? (
                "Sold out"
              ) : (
                "Buy now"
              )}
            </button>

            {/* Result */}
            {result && (
              <div
                className={`row-in mt-4 flex items-start gap-2.5 rounded-lg border p-4 text-sm ${
                  result.outcome === "sold"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : result.outcome === "sold_out"
                      ? "border-border bg-secondary text-muted-foreground"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}
              >
                {result.outcome === "sold" ? (
                  <>
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Order confirmed</p>
                      <p className="mt-0.5 font-mono text-xs">
                        You secured unit #{compact(result.position ?? 0)} · served from {result.region}
                      </p>
                    </div>
                  </>
                ) : result.outcome === "sold_out" ? (
                  <>
                    <X className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Just missed it</p>
                      <p className="mt-0.5 text-xs">
                        This drop sold out. No payment was taken and inventory stayed exact.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <X className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>Something went wrong. Please try again.</p>
                  </>
                )}
              </div>
            )}

            <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
              Every checkout runs through a guarded, strongly consistent transaction on Amazon Aurora
              DSQL. Inventory is never oversold, even when thousands of buyers check out simultaneously.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
