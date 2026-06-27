import Link from "next/link"
import { ArrowUpRight, Store } from "lucide-react"
import type { DropWithBrand } from "@/lib/types"
import { money, compact, pct } from "@/lib/format"
import { StatusPill } from "@/components/status-pill"

export function DropCard({ drop }: { drop: DropWithBrand }) {
  const sold = drop.sold_count
  const total = drop.total_inventory
  const oversold = Math.max(0, sold - total)
  const fill = pct(sold, total)

  return (
    <div className="group relative flex flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {drop.brand_name}
          </p>
          <h3 className="mt-1 truncate text-base font-semibold tracking-tight text-foreground">
            {drop.name}
          </h3>
        </div>
        <StatusPill status={oversold > 0 ? "oversold" : drop.status} />
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="font-mono text-2xl tabular text-foreground">
            {compact(sold)}
            <span className="text-sm text-muted-foreground">/{compact(total)}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">units sold</p>
        </div>
        <p className="font-mono text-sm text-foreground">{money(drop.price_cents)}</p>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full ${oversold > 0 ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${fill}%` }}
        />
      </div>
      {oversold > 0 && (
        <p className="mt-2 font-mono text-xs text-destructive">
          +{oversold} oversold
        </p>
      )}

      <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
        <Link
          href={`/drops/${drop.id}`}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Control room
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href={`/shop/${drop.id}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Store className="h-3.5 w-3.5" />
          Shop
        </Link>
      </div>
    </div>
  )
}
