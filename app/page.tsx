import { Boxes, ShieldCheck, Zap } from "lucide-react"
import { getDrops } from "@/lib/queries"
import { SiteHeader } from "@/components/site-header"
import { DropCard } from "@/components/drop-card"
import { compact, money } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const drops = await getDrops()

  const totalSold = drops.reduce((s, d) => s + Math.min(d.sold_count, d.total_inventory), 0)
  const totalInventory = drops.reduce((s, d) => s + d.total_inventory, 0)
  const grossCents = drops.reduce((s, d) => s + Math.min(d.sold_count, d.total_inventory) * d.price_cents, 0)
  const liveCount = drops.filter((d) => d.status === "live").length

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="grid-bg">
        <section className="mx-auto max-w-7xl px-4 pt-12 pb-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <ShieldCheck className="h-4 w-4" />
            Inventory integrity at any scale
          </div>
          <h1 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Sell exactly your inventory. Never one unit more.
          </h1>
          <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
            DropGuard runs limited product drops and ticket sales on Amazon Aurora DSQL&apos;s
            strongly consistent, multi-region engine. When thousands of buyers hit the same SKU at
            once, optimistic concurrency control guarantees you never oversell.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={<Boxes className="h-4 w-4" />} label="Units sold" value={compact(totalSold)} />
            <StatCard icon={<Boxes className="h-4 w-4" />} label="Total inventory" value={compact(totalInventory)} />
            <StatCard icon={<Zap className="h-4 w-4" />} label="Gross sales" value={money(grossCents)} />
            <StatCard icon={<ShieldCheck className="h-4 w-4" />} label="Live drops" value={`${liveCount}`} />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Active drops
          </h2>
          {drops.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              No drops found. Visit{" "}
              <code className="font-mono text-foreground">/api/setup</code> to seed demo data.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {drops.map((drop) => (
                <DropCard key={drop.id} drop={drop} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 font-mono text-xl tabular text-foreground">{value}</p>
    </div>
  )
}
