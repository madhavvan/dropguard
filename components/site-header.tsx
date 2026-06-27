import Link from "next/link"
import { ShieldCheck } from "lucide-react"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            DropGuard
          </span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Powered by</span>
          <span className="rounded-md border border-border bg-card px-2 py-1 font-mono text-[11px] text-foreground">
            Amazon Aurora DSQL
          </span>
        </div>
      </div>
    </header>
  )
}
